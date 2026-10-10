import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentos_ids, titulo, pasta_id } = await req.json();

    if (!documentos_ids || !Array.isArray(documentos_ids) || documentos_ids.length < 2) {
      return Response.json({ error: 'Mínimo 2 documentos para conexão' }, { status: 400 });
    }

    // Buscar documentos
    const documentos = await Promise.all(
      documentos_ids.map((id, idx) => 
        base44.entities.DocumentoCompliance.get(id).then(doc => ({ ...doc, ordem: idx + 1 }))
      )
    );

    // Validar se todos existem
    if (documentos.some(d => !d)) {
      return Response.json({ error: 'Documento não encontrado' }, { status: 404 });
    }

    // Criar conexão
    const conexao = await base44.entities.ConexaoDocumentos.create({
      titulo: titulo || `Conexão de ${documentos.length} documentos`,
      pasta_id: pasta_id || documentos[0].pasta_id,
      documentos_ordenados: documentos.map((doc, idx) => ({
        documento_id: doc.id,
        ordem: idx + 1,
        titulo: doc.titulo
      })),
      total_documentos: documentos.length,
      ativo: true
    });

    // Atualizar documentos com conexao_id
    await Promise.all(
      documentos.map((doc, idx) =>
        base44.asServiceRole.entities.DocumentoCompliance.update(doc.id, {
          conexao_id: conexao.id,
          ordem_conexao: idx + 1
        })
      )
    );

    // Concatenar conteúdo para indexação
    const conteudoConcatenado = documentos
      .filter(d => d.conteudo_extraido)
      .map((d, idx) => `=== PARTE ${idx + 1}: ${d.titulo} ===\n${d.conteudo_extraido}`)
      .join('\n\n');

    if (conteudoConcatenado) {
      await base44.asServiceRole.entities.ConexaoDocumentos.update(conexao.id, {
        conteudo_concatenado: conteudoConcatenado
      });
    }

    return Response.json({
      success: true,
      conexao_id: conexao.id,
      total_documentos: documentos.length
    });
  } catch (error) {
    console.error('Erro ao conectar documentos:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});