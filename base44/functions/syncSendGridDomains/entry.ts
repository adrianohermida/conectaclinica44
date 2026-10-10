import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Sincroniza domínios SendGrid com ConfiguracaoEmail
 * Atualiza status de verificação DKIM/SPF automaticamente
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = Deno.env.get('SENDGRID_API_KEY');
    
    if (!apiKey) {
      return Response.json({ error: 'SendGrid API Key não configurada' }, { status: 400 });
    }

    // Get authenticated domains from SendGrid
    const response = await fetch('https://api.sendgrid.com/v3/whitelabel/domains', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`SendGrid API error: ${await response.text()}`);
    }

    const domains = await response.json();
    
    // Sincronizar com ConfiguracaoEmail
    const configs = await base44.asServiceRole.entities.ConfiguracaoEmail.list();
    let synced = 0;
    let updated = 0;

    for (const domain of domains) {
      // Buscar configs que usam este domínio
      const matchingConfigs = configs.filter(c => 
        c.email_remetente?.includes(domain.domain) || 
        c.alias_recebimento?.includes(domain.domain)
      );

      for (const config of matchingConfigs) {
        await base44.asServiceRole.entities.ConfiguracaoEmail.update(config.id, {
          dkim_status: domain.dkim?.valid ? 'verificado' : 'pendente',
          spf_record: domain.spf?.data || null,
          dkim_domain: domain.domain,
          dkim_selector: domain.dkim?.host?.split('.')[0] || null
        });
        
        updated++;
      }
      
      synced++;
    }

    return Response.json({
      success: true,
      domains_synced: synced,
      configs_updated: updated,
      domains
    });

  } catch (error) {
    console.error('syncSendGridDomains error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});