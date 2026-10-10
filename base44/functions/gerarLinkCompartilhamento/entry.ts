import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      console.error('[gerarLinkCompartilhamento] Unauthorized');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pasta_id } = await req.json();
    console.log('[gerarLinkCompartilhamento] Request:', { pasta_id, user: user.email });

    if (!pasta_id) {
      return Response.json({ error: 'pasta_id obrigatório' }, { status: 400 });
    }

    const pasta = await base44.entities.PastaCompliance.get(pasta_id);
    console.log('[gerarLinkCompartilhamento] Pasta:', pasta ? 'encontrada' : 'não encontrada');

    if (!pasta) {
      return Response.json({ error: 'Pasta não encontrada' }, { status: 404 });
    }

    const shareToken = crypto.randomUUID();
    const APP_BASE_URL = 'https://conectaclinica.com.br';
    const linkCompartilhamento = `${APP_BASE_URL}/CompartilhamentoPublico?tipo=pasta&token=${shareToken}`;
    
    console.log('[gerarLinkCompartilhamento] Gerando:', { token: shareToken, link: linkCompartilhamento });

    await base44.asServiceRole.entities.PastaCompliance.update(pasta_id, {
      compartilhamento_publico: true,
      token_compartilhamento: shareToken,
      link_compartilhamento: linkCompartilhamento,
      compartilhado_por: user.email,
      compartilhado_em: new Date().toISOString()
    });

    console.log('[gerarLinkCompartilhamento] ✅ Success');
    
    return Response.json({
      success: true,
      link_compartilhamento: linkCompartilhamento,
      token: shareToken
    });
  } catch (error) {
    console.error('[gerarLinkCompartilhamento] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});