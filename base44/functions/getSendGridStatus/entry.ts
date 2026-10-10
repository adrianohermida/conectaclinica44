import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * GET SENDGRID STATUS - Busca dados REAIS da conta
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
      return Response.json({ 
        api_connected: false, 
        error: 'API key não configurada',
        emails_sent_today: 0,
        domains_verified: 0,
        senders_verified: 0,
        account_email: null
      });
    }

    // BUSCAR DADOS REAIS
    const [accountRes, domainsRes, sendersRes] = await Promise.all([
      fetch('https://api.sendgrid.com/v3/user/account', {
        headers: { Authorization: `Bearer ${SENDGRID_API_KEY}` }
      }),
      fetch('https://api.sendgrid.com/v3/whitelabel/domains', {
        headers: { Authorization: `Bearer ${SENDGRID_API_KEY}` }
      }),
      fetch('https://api.sendgrid.com/v3/verified_senders', {
        headers: { Authorization: `Bearer ${SENDGRID_API_KEY}` }
      })
    ]);

    const account = accountRes.ok ? await accountRes.json() : null;
    const domains = domainsRes.ok ? await domainsRes.json() : [];
    const sendersData = sendersRes.ok ? await sendersRes.json() : { results: [] };

    // Contar emails hoje (SendGridAuditoria)
    const hoje = new Date().toISOString().split('T')[0];
    const emailsHoje = await base44.asServiceRole.entities.SendGridAuditoria.filter({
      created_date: { $gte: `${hoje}T00:00:00Z` }
    });

    return Response.json({
      api_connected: !!account,
      account_email: account?.email || 'N/A',
      account_type: account?.type || 'free',
      emails_sent_today: emailsHoje.length,
      domains_verified: domains.filter(d => d.valid).length,
      senders_verified: sendersData.results.filter(s => s.verified).length,
      reputation: account?.reputation || 0
    });

  } catch (error) {
    return Response.json({ 
      api_connected: false, 
      error: error.message 
    }, { status: 500 });
  }
});