import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

async function calcularHash(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return Response.json({ error: 'Arquivo obrigatório' }, { status: 400 });
    }

    // Calcular hash
    const hash = await calcularHash(file);

    // Buscar documentos com mesmo hash
    const duplicatas = await base44.entities.DocumentoCompliance.filter({ hash_sha256: hash });

    return Response.json({
      hash,
      duplicata: duplicatas.length > 0,
      documentos_duplicados: duplicatas.map(d => ({
        id: d.id,
        titulo: d.titulo,
        created_date: d.created_date,
        pasta_id: d.pasta_id
      }))
    });
  } catch (error) {
    console.error('Erro ao detectar duplicidade:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});