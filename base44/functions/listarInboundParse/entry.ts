import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * LISTAR INBOUND PARSE - Busca webhooks cadastrados no SendGrid
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
      return Response.json({ webhooks: [] });
    }

    const res = await fetch('https://api.sendgrid.com/v3/user/webhooks/parse/settings', {
      headers: { 
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (res.ok) {
      const data = await res.json();
      // SendGrid retorna { result: [...] } ou array direto
      const webhooks = Array.isArray(data) ? data : (data.result || []);
      return Response.json({ webhooks });
    }

    const errorText = await res.text();
    return Response.json({ 
      webhooks: [], 
      error: `SendGrid API error: ${res.status} - ${errorText}` 
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});