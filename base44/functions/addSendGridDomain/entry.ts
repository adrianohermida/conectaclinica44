import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { domain } = await req.json();
    
    if (!domain) {
      return Response.json({ error: 'Domínio é obrigatório' }, { status: 400 });
    }

    const apiKey = Deno.env.get('SENDGRID_API_KEY');
    
    if (!apiKey) {
      return Response.json({ error: 'SendGrid API Key não configurada' }, { status: 400 });
    }

    // Add authenticated domain
    const response = await fetch('https://api.sendgrid.com/v3/whitelabel/domains', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        domain,
        subdomain: 'mail',
        automatic_security: true,
        default: false,
        custom_spf: false,
        ips: []
      })
    });

    if (!response.ok) {
      const error = await response.text();
      return Response.json({ 
        error: `SendGrid API error: ${error}` 
      }, { status: response.status });
    }

    const result = await response.json();

    return Response.json({ 
      success: true,
      domain: result
    });

  } catch (error) {
    console.error('addSendGridDomain error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});