import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * VERIFICAÇÃO BRUTAL: O que REALMENTE está configurado no SendGrid
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');

    // BUSCAR TODAS as configs de Inbound Parse no SendGrid
    const res = await fetch('https://api.sendgrid.com/v3/user/webhooks/parse/settings', {
      headers: { 'Authorization': `Bearer ${SENDGRID_API_KEY}` }
    });

    if (!res.ok) {
      const error = await res.text();
      return Response.json({ 
        erro: 'Falha ao buscar SendGrid',
        sendgrid_error: error
      }, { status: 500 });
    }

    const data = await res.json();
    
    // BUSCAR todas ConfiguracaoEmail do sistema
    const todasConfigs = await base44.asServiceRole.entities.ConfiguracaoEmail.list();
    
    return Response.json({
      sendgrid_inbound_parse: data.result || [],
      total_configs: data.result?.length || 0,
      configs_sistema: todasConfigs.map(c => ({
        clinica_id: c.clinica_id,
        alias: c.alias_recebimento,
        domain: c.dkim_domain,
        ativo: c.ativo,
        inbound_parse_flag: c.inbound_parse_configurado
      }))
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});