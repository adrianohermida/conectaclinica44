import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Busca mensagens de uma sessão do widget
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const origin = req.headers.get('origin') || req.headers.get('referer');
    let clinicaId = null;
    
    if (origin) {
      const subdomain = new URL(origin).hostname;
      const clinicas = await base44.asServiceRole.entities.Clinica.filter({ subdomain });
      if (clinicas.length > 0) clinicaId = clinicas[0].id;
    }

    if (!clinicaId) {
      try {
        const user = await base44.auth.me();
        if (user?.clinica_id) clinicaId = user.clinica_id;
      } catch {}
    }

    if (!clinicaId) {
      return Response.json({ mensagens: [] });
    }

    const { session_id } = await req.json();

    if (!session_id) {
      return Response.json({ error: 'session_id obrigatório' }, { status: 400 });
    }

    // Buscar ticket da sessão
    const tickets = await base44.asServiceRole.entities.Ticket.filter({ 
      tags: session_id,
      clinica_id: clinicaId 
    });

    if (tickets.length === 0) {
      return Response.json({ mensagens: [] });
    }

    // Buscar mensagens do ticket
    const mensagens = await base44.asServiceRole.entities.MensagemTicket.filter({ 
      ticket_id: tickets[0].id 
    });

    // Ordenar por data
    mensagens.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

    return Response.json({ mensagens });

  } catch (error) {
    console.error('[WIDGET] Erro ao buscar mensagens:', error);
    return Response.json({ mensagens: [] });
  }
});