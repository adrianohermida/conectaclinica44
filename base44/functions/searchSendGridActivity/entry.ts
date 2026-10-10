import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * FASE 2: Email Activity Feed
 * Buscar emails específicos por destinatário, assunto, etc
 * Essencial para debugging de entregas
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query, limit = 10 } = await req.json();
    
    if (!query) {
      return Response.json({ error: 'query é obrigatório. Ex: to_email:teste@example.com' }, { status: 400 });
    }

    const apiKey = Deno.env.get('SENDGRID_API_KEY');
    
    if (!apiKey) {
      return Response.json({ error: 'SendGrid API Key não configurada' }, { status: 400 });
    }

    // Email Activity API com timeout e retry
    let response = await fetch(
      `https://api.sendgrid.com/v3/messages?query=${encodeURIComponent(query)}&limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      }
    );

    // RETRY strategy em rate limit
    if (!response.ok && response.status === 429) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      response = await fetch(
        `https://api.sendgrid.com/v3/messages?query=${encodeURIComponent(query)}&limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(10000)
        }
      );
    }

    if (!response.ok) {
      const error = await response.text();
      return Response.json({ 
        success: false,
        error: `SendGrid API error: ${response.status} - ${error}` 
      }, { status: 200 }); // 200 para não quebrar UI
    }

    const data = await response.json();

    return Response.json({
      success: true,
      messages: data.messages || [],
      total: data.messages?.length || 0
    });

  } catch (error) {
    console.error('searchSendGridActivity error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});