import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { ticketId, mensagem, notificarCliente = true } = await req.json();

    // Buscar ticket
    const tickets = await base44.asServiceRole.entities.TicketSuporte.filter({ id: ticketId });
    if (tickets.length === 0) {
      return Response.json({ success: false, error: 'Ticket não encontrado' });
    }

    const ticket = tickets[0];

    // Adicionar resposta
    const novaResposta = {
      autor: user.full_name,
      mensagem,
      data: new Date().toISOString(),
      interno: false
    };

    const respostasAtualizadas = [...(ticket.respostas || []), novaResposta];

    // Atualizar ticket
    await base44.asServiceRole.entities.TicketSuporte.update(ticketId, {
      respostas: respostasAtualizadas,
      status: ticket.status === 'novo' ? 'em_atendimento' : ticket.status,
      responsavel_id: user.id,
      responsavel_nome: user.full_name
    });

    // Notificar cliente por email
    if (notificarCliente) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: "PrevenClin",
        to: ticket.email_solicitante,
        subject: `📬 Resposta ao Ticket #${ticket.numero_ticket}`,
        body: `
Olá, ${ticket.nome_solicitante}!

Recebemos uma nova resposta ao seu ticket:

📋 Ticket: #${ticket.numero_ticket}
✉️ Assunto: ${ticket.assunto}

---
💬 Resposta de ${user.full_name}:

${mensagem}

---

Se precisar de mais ajuda, basta responder a este email.

Atenciosamente,
Equipe PrevenClin
        `
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});