import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * GET SENDGRID SENDERS - Busca senders REAIS verificados
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
      return Response.json({ senders: [] });
    }

    const res = await fetch('https://api.sendgrid.com/v3/verified_senders', {
      headers: { Authorization: `Bearer ${SENDGRID_API_KEY}` }
    });

    if (!res.ok) {
      return Response.json({ senders: [], error: 'Falha ao buscar senders' });
    }

    const data = await res.json();
    return Response.json({ senders: data.results || [] });

  } catch (error) {
    return Response.json({ senders: [], error: error.message }, { status: 500 });
  }
});