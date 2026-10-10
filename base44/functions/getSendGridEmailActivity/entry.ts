import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * ANALYTICS MELHORADO - Detalhes completos de emails
 * Buscar atividade de emails com origem, destino, conteúdo, status
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email_address, limit = 50 } = await req.json();
    
    const apiKey = Deno.env.get('SENDGRID_API_KEY');
    
    if (!apiKey) {
      return Response.json({ error: 'SendGrid API Key não configurada' }, { status: 500 });
    }

    // Activity Feed API - últimos 7 dias
    const query = email_address ? `to_email="${email_address}"` : '';
    const url = `https://api.sendgrid.com/v3/messages?limit=${limit}${query ? `&query=${encodeURIComponent(query)}` : ''}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      return Response.json({ error: `SendGrid API error: ${error}` }, { status: response.status });
    }

    const data = await response.json();

    // Enriquecer com detalhes
    const messages = (data.messages || []).map(msg => ({
      msg_id: msg.msg_id,
      from_email: msg.from_email,
      to_email: msg.to_email,
      subject: msg.subject,
      status: msg.status, // delivered, bounce, deferred, etc
      opens_count: msg.opens_count || 0,
      clicks_count: msg.clicks_count || 0,
      last_event_time: msg.last_event_time,
      events: msg.events || [],
      // Mapear eventos detalhados
      timeline: (msg.events || []).map(evt => ({
        event: evt.event_name,
        timestamp: evt.processed,
        user_agent: evt.user_agent,
        ip: evt.ip,
        url: evt.url // Se click
      }))
    }));

    return Response.json({
      messages,
      total: messages.length
    });

  } catch (error) {
    console.error('[getSendGridEmailActivity] ERRO:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});