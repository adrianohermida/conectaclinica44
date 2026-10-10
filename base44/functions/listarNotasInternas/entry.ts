import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * LISTAR NOTAS INTERNAS - MULTI-TENANT BRUTAL
 * SEMPRE filtra por clinica_id + valida owner
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ticket_id } = await req.json();

    if (!ticket_id) {
      return Response.json({ error: 'ticket_id obrigatório' }, { status: 400 });
    }

    // VALIDAR ACESSO AO TICKET (owner check)
    const tickets = await base44.entities.Ticket.filter({ 
      id: ticket_id,
      clinica_id: user.clinica_id 
    });

    if (!tickets || tickets.length === 0) {
      return Response.json({ 
        error: 'Ticket não encontrado ou sem permissão' 
      }, { status: 403 });
    }

    // BUSCAR NOTAS (WHERE clinica_id OBRIGATÓRIO)
    const notas = await base44.entities.NotaInterna.filter({
      clinica_id: user.clinica_id,
      ticket_id
    }, '-created_date');

    return Response.json({ 
      success: true,
      notas,
      total: notas.length
    });

  } catch (error) {
    console.error('[listarNotasInternas] Erro:', error);
    return Response.json({ 
      error: 'Erro ao listar notas',
      details: error.message 
    }, { status: 500 });
  }
});