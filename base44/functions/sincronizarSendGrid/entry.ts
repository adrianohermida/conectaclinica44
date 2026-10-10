import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * SINCRONIZAR SENDGRID - Buscar domínios e senders REAIS da API
 * Atualiza ConfiguracaoEmail com dados verificados
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.role === 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
    if (!SENDGRID_API_KEY) {
      return Response.json({ error: 'API key não configurada' }, { status: 500 });
    }

    const resultados = {
      dominios_sincronizados: 0,
      senders_sincronizados: 0,
      erros: []
    };

    // BUSCAR DOMÍNIOS REAIS
    const domainsRes = await fetch('https://api.sendgrid.com/v3/whitelabel/domains', {
      headers: { Authorization: `Bearer ${SENDGRID_API_KEY}` }
    });

    if (domainsRes.ok) {
      const domains = await domainsRes.json();
      
      for (const domain of domains) {
        try {
          // Buscar config existente
          const configs = await base44.asServiceRole.entities.ConfiguracaoEmail.filter({
            domain_sendgrid: domain.domain
          });

          if (configs.length > 0) {
            // Atualizar
            await base44.asServiceRole.entities.ConfiguracaoEmail.update(configs[0].id, {
              dominio_verificado: domain.valid,
              sendgrid_domain_id: domain.id
            });
          }
          resultados.dominios_sincronizados++;
        } catch (error) {
          resultados.erros.push(`Domínio ${domain.domain}: ${error.message}`);
        }
      }
    }

    // BUSCAR SENDERS REAIS
    const sendersRes = await fetch('https://api.sendgrid.com/v3/verified_senders', {
      headers: { Authorization: `Bearer ${SENDGRID_API_KEY}` }
    });

    if (sendersRes.ok) {
      const data = await sendersRes.json();
      const senders = data.results || [];

      for (const sender of senders) {
        try {
          const configs = await base44.asServiceRole.entities.ConfiguracaoEmail.filter({
            email_remetente: sender.from_email
          });

          if (configs.length > 0) {
            await base44.asServiceRole.entities.ConfiguracaoEmail.update(configs[0].id, {
              sender_verificado: sender.verified,
              sendgrid_sender_id: sender.id
            });
          }
          resultados.senders_sincronizados++;
        } catch (error) {
          resultados.erros.push(`Sender ${sender.from_email}: ${error.message}`);
        }
      }
    }

    return Response.json(resultados);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});