import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Configura Event Webhook no SendGrid
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { webhook_url, events } = await req.json();
    
    if (!webhook_url) {
      return Response.json({ error: 'webhook_url é obrigatório' }, { status: 400 });
    }

    const apiKey = Deno.env.get('SENDGRID_API_KEY');
    
    if (!apiKey) {
      return Response.json({ error: 'SendGrid API Key não configurada' }, { status: 400 });
    }

    // Configure event webhook
    const response = await fetch('https://api.sendgrid.com/v3/user/webhooks/event/settings', {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        enabled: true,
        url: webhook_url,
        group_resubscribe: true,
        delivered: events?.includes('delivered') !== false,
        group_unsubscribe: true,
        spam_report: true,
        bounce: true,
        deferred: true,
        unsubscribe: true,
        dropped: true,
        open: events?.includes('open') !== false,
        click: events?.includes('click') !== false,
        processed: true
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
      webhook: result
    });

  } catch (error) {
    console.error('configureSendGridWebhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});