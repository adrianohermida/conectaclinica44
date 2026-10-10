import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conexao_id } = await req.json();

    if (!conexao_id) {
      return Response.json({ error: 'conexao_id obrigatório' }, { status: 400 });
    }

    // Buscar conexão
    const conexao = await base44.entities.ConexaoDocumentos.get(conexao_id);
    if (!conexao) {
      return Response.json({ error: 'Conexão não encontrada' }, { status: 404 });
    }

    // Remover conexao_id dos documentos
    await Promise.all(
      conexao.documentos_ordenados.map(doc =>
        base44.asServiceRole.entities.DocumentoCompliance.update(doc.documento_id, {
          conexao_id: null,
          ordem_conexao: null
        })
      )
    );

    // Desativar conexão
    await base44.asServiceRole.entities.ConexaoDocumentos.update(conexao_id, {
      ativo: false
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Erro ao desconectar documentos:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});