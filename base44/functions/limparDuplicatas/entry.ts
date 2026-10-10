import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Service role necessário para operação em massa
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin required' }, { status: 403 });
    }

    const { dias_antigos = 90, dry_run = true } = await req.json();

    // Buscar todos documentos com hash
    const documentos = await base44.asServiceRole.entities.DocumentoCompliance.filter({
      hash_sha256: { $exists: true, $ne: '' }
    });

    console.log(`[Cleanup] Analisando ${documentos.length} documentos com hash`);

    // Agrupar por hash
    const hashGroups = {};
    for (const doc of documentos) {
      const hash = doc.hash_sha256;
      if (!hashGroups[hash]) {
        hashGroups[hash] = [];
      }
      hashGroups[hash].push(doc);
    }

    // Encontrar duplicatas (manter o mais antigo)
    const duplicatas = [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - dias_antigos);

    for (const [hash, docs] of Object.entries(hashGroups)) {
      if (docs.length > 1) {
        // Ordenar por data de criação (mais antigo primeiro)
        docs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
        
        // Manter o primeiro (mais antigo), marcar resto como duplicata
        const [original, ...dups] = docs;
        
        // Apenas deletar duplicatas antigas
        const dupsAntigas = dups.filter(d => new Date(d.created_date) < cutoffDate);
        
        if (dupsAntigas.length > 0) {
          duplicatas.push({
            hash,
            original: {
              id: original.id,
              titulo: original.titulo,
              created_date: original.created_date,
              tamanho_bytes: original.tamanho_bytes
            },
            duplicatas: dupsAntigas.map(d => ({
              id: d.id,
              titulo: d.titulo,
              created_date: d.created_date,
              tamanho_bytes: d.tamanho_bytes
            }))
          });
        }
      }
    }

    const totalDuplicatas = duplicatas.reduce((acc, g) => acc + g.duplicatas.length, 0);
    const bytesRecuperados = duplicatas.reduce((acc, g) => 
      acc + g.duplicatas.reduce((sum, d) => sum + (d.tamanho_bytes || 0), 0), 0
    );

    console.log(`[Cleanup] Encontradas ${totalDuplicatas} duplicatas (${(bytesRecuperados / 1024 / 1024).toFixed(2)} MB)`);

    // Executar limpeza (se não for dry_run)
    let deletados = [];
    if (!dry_run && totalDuplicatas > 0) {
      for (const grupo of duplicatas) {
        for (const dup of grupo.duplicatas) {
          try {
            await base44.asServiceRole.entities.DocumentoCompliance.delete(dup.id);
            deletados.push(dup.id);
          } catch (error) {
            console.error(`[Cleanup] Erro ao deletar ${dup.id}:`, error.message);
          }
        }
      }
    }

    return Response.json({
      success: true,
      dry_run,
      total_documentos: documentos.length,
      grupos_duplicados: duplicatas.length,
      total_duplicatas: totalDuplicatas,
      bytes_recuperados: bytesRecuperados,
      mb_recuperados: (bytesRecuperados / 1024 / 1024).toFixed(2),
      deletados: deletados.length,
      detalhes: duplicatas.slice(0, 20) // Primeiros 20 grupos
    });
  } catch (error) {
    console.error('[Cleanup Error]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});