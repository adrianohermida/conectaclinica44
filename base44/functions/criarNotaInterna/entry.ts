import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * CRIAR NOTA INTERNA - MULTI-TENANT BRUTAL
 * DEFESA: User auth + clinica_id validation + owner check
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // AUTH: Obrigatório
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ticket_id, conteudo, tipo = 'observacao' } = await req.json();

    if (!ticket_id || !conteudo) {
      return Response.json({ 
        error: 'ticket_id e conteudo obrigatórios' 
      }, { status: 400 });
    }

    // MULTI-TENANT: Validar ticket pertence à clínica do user
    const tickets = await base44.entities.Ticket.filter({ 
      id: ticket_id,
      clinica_id: user.clinica_id 
    });

    if (!tickets || tickets.length === 0) {
      return Response.json({ 
        error: 'Ticket não encontrado ou sem permissão' 
      }, { status: 403 });
    }

    const ticket = tickets[0];

    // CRIAR NOTA (com clinica_id FORÇADO)
    const nota = await base44.entities.NotaInterna.create({
      clinica_id: user.clinica_id, // FORÇADO - nunca do payload
      ticket_id: ticket.id,
      autor_id: user.id,
      autor_nome: user.full_name,
      conteudo,
      tipo,
      visivel_apenas_equipe: true
    });

    // LOG AUDITORIA (opcional mas recomendado)
    console.log('[criarNotaInterna] Nota criada:', {
      nota_id: nota.id,
      ticket_id: ticket.id,
      clinica_id: user.clinica_id,
      autor: user.email
    });

    return Response.json({ 
      success: true,
      nota 
    });

  } catch (error) {
    console.error('[criarNotaInterna] Erro:', error);
    return Response.json({ 
      error: 'Erro ao criar nota',
      details: error.message 
    }, { status: 500 });
  }
});