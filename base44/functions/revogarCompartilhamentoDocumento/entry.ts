import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documento_id } = await req.json();

    if (!documento_id) {
      return Response.json({ error: 'documento_id obrigatório' }, { status: 400 });
    }

    await base44.asServiceRole.entities.DocumentoCompliance.update(documento_id, {
      compartilhamento_publico: false,
      token_compartilhamento: null,
      link_compartilhamento: null
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Erro ao revogar compartilhamento:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});