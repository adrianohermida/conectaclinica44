import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Verifica domínio no SendGrid (força check DNS)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { domain_id } = await req.json();
    
    if (!domain_id) {
      return Response.json({ error: 'domain_id é obrigatório' }, { status: 400 });
    }

    const apiKey = Deno.env.get('SENDGRID_API_KEY');
    
    if (!apiKey) {
      return Response.json({ error: 'SendGrid API Key não configurada' }, { status: 400 });
    }

    // Validate domain
    const response = await fetch(`https://api.sendgrid.com/v3/whitelabel/domains/${domain_id}/validate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
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
      validation: result
    });

  } catch (error) {
    console.error('verifySendGridDomain error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});