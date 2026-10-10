import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * GET SENDGRID DOMAINS - Busca domínios REAIS autenticados
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
    if (!SENDGRID_API_KEY) {
      return Response.json({ domains: [] });
    }

    const res = await fetch('https://api.sendgrid.com/v3/whitelabel/domains', {
      headers: { Authorization: `Bearer ${SENDGRID_API_KEY}` }
    });

    if (!res.ok) {
      return Response.json({ domains: [], error: 'Falha ao buscar domínios' });
    }

    const domains = await res.json();

    // Buscar configs locais para vincular clinica_id
    const configs = await base44.asServiceRole.entities.ConfiguracaoEmail.list();
    
    const domainsWithConfig = domains.map(domain => {
      const config = configs.find(c => c.domain_sendgrid === domain.domain || c.sendgrid_domain_id === domain.id);
      return {
        ...domain,
        config_id: config?.id,
        clinica_id: config?.clinica_id,
        clinica_nome: config?.clinica_nome
      };
    });

    return Response.json({ domains: domainsWithConfig });

  } catch (error) {
    return Response.json({ domains: [], error: error.message }, { status: 500 });
  }
});