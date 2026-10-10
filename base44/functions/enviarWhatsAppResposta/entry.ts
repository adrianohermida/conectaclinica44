import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Envia resposta via WhatsApp Twilio
 * Input: { ticket_id, conteudo, anexos }
 * Output: { success, message_sid }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { ticket_id, conteudo, anexos = [] } = await req.json();

    if (!ticket_id || !conteudo) {
      return Response.json({ error: 'ticket_id e conteudo obrigatórios' }, { status: 400 });
    }

    // 1. Buscar ticket
    const tickets = await base44.asServiceRole.entities.Ticket.filter({ id: ticket_id });
    if (tickets.length === 0) {
      return Response.json({ error: 'Ticket não encontrado' }, { status: 404 });
    }

    const ticket = tickets[0];

    if (ticket.canal !== 'whatsapp') {
      return Response.json({ error: 'Ticket não é do canal WhatsApp' }, { status: 400 });
    }

    // 2. Buscar configuração WhatsApp da clínica
    const configs = await base44.asServiceRole.entities.ConfiguracaoWhatsApp.filter({
      clinica_id: ticket.clinica_id,
      ativo: true
    });

    if (configs.length === 0) {
      return Response.json({ error: 'WhatsApp não configurado para esta clínica' }, { status: 404 });
    }

    const config = configs[0];

    // 3. Preparar credenciais Twilio
    const authHeader = 'Basic ' + btoa(`${config.twilio_account_sid}:${config.twilio_auth_token_encrypted}`);

    // 4. Preparar payload Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${config.twilio_account_sid}/Messages.json`;
    
    const formData = new URLSearchParams({
      From: `whatsapp:${config.twilio_phone_number}`,
      To: `whatsapp:${ticket.solicitante_telefone}`,
      Body: conteudo
    });

    // Anexos (se houver - máx 1 por mensagem Twilio)
    if (anexos.length > 0 && anexos[0].url) {
      formData.append('MediaUrl', anexos[0].url);
    }

    // 5. Enviar via Twilio
    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    });

    if (!twilioResponse.ok) {
      const error = await twilioResponse.text();
      throw new Error(`Twilio error: ${error}`);
    }

    const result = await twilioResponse.json();

    // 6. Registrar mensagem no ticket
    await base44.asServiceRole.entities.MensagemTicket.create({
      clinica_id: ticket.clinica_id,
      ticket_id,
      autor_id: user.id,
      autor_nome: user.full_name || user.email,
      tipo_autor: 'atendente',
      conteudo,
      anexos,
      enviada_via: 'whatsapp',
      twilio_message_sid: result.sid,
      twilio_status: result.status
    });

    // 7. Atualizar contador mensal
    await base44.asServiceRole.entities.ConfiguracaoWhatsApp.update(config.id, {
      total_mensagens_mes: (config.total_mensagens_mes || 0) + 1
    });

    // 8. Atualizar ticket status
    if (ticket.status === 'aberto') {
      await base44.asServiceRole.entities.Ticket.update(ticket.id, {
        status: 'em_andamento',
        atribuido_a: user.id,
        atribuido_nome: user.full_name || user.email
      });
    }

    console.log(`[WhatsApp] ✅ Enviado - Ticket: ${ticket_id}, SID: ${result.sid}`);

    return Response.json({ 
      success: true,
      message_sid: result.sid,
      status: result.status
    });

  } catch (error) {
    console.error('[WhatsApp] Erro enviar:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});