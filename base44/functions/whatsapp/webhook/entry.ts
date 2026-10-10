import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { validateRequest } from 'npm:twilio@5.3.7';

/**
 * WEBHOOK TWILIO WHATSAPP - Validação de assinatura obrigatória
 * 
 * Security: HMAC SHA-1 signature validation (Twilio padrão)
 * Events: message, status updates, delivery receipts
 * 
 * CRITICAL: Configurar URL no Twilio Dashboard:
 * https://[seu-app].base44.app/api/functions/whatsapp/webhook
 */
Deno.serve(async (req) => {
  const startTime = Date.now();
  
  try {
    const base44 = createClientFromRequest(req);
    
    // SECURITY: Validar assinatura Twilio
    const twilioSignature = req.headers.get('x-twilio-signature');
    const url = `${new URL(req.url).origin}/api/functions/whatsapp/webhook`;
    const body = await req.text();

    if (!twilioSignature) {
      console.error('[WhatsApp] ❌ Assinatura ausente');
      return Response.json({ error: 'Missing signature' }, { status: 401 });
    }

    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    if (!authToken) {
      console.error('[WhatsApp] ❌ TWILIO_AUTH_TOKEN não configurado');
      return Response.json({ error: 'Server config error' }, { status: 500 });
    }

    // Parse form-data para objeto
    const params = {};
    new URLSearchParams(body).forEach((value, key) => {
      params[key] = value;
    });

    const isValid = validateRequest(authToken, twilioSignature, url, params);

    if (!isValid) {
      console.error('[WhatsApp] ❌ Assinatura inválida:', { twilioSignature, url });
      return Response.json({ error: 'Invalid signature' }, { status: 403 });
    }

    console.log('[WhatsApp] ✅ Assinatura validada:', params.From);

    // Processar mensagem
    const from = params.From; // ex: whatsapp:+5592991234567
    const body_text = params.Body;
    const messageType = params.MessageType || 'text';
    const messageSid = params.MessageSid;
    const profileName = params.ProfileName || 'Desconhecido';

    // Extrair clinica_id da mensagem (formato: +5592XXXX1234 onde 1234 = slug clínica)
    // OU usar roteamento inteligente via backend function
    const roteamento = await base44.asServiceRole.functions.invoke('roteamentoInteligente', {
      from_number: from.replace('whatsapp:', ''),
      message: body_text
    });

    const clinica_id = roteamento.data.clinica_id;

    if (!clinica_id) {
      console.warn('[WhatsApp] ⚠️ Clínica não identificada:', from);
      return Response.json({ 
        success: true,
        message: 'Mensagem recebida mas clínica não identificada' 
      });
    }

    // Buscar ou criar ticket
    const ticketsExistentes = await base44.asServiceRole.entities.Ticket.filter({
      clinica_id,
      canal_origem: 'whatsapp',
      solicitante_telefone: from.replace('whatsapp:', ''),
      status: { $in: ['aberto', 'em_atendimento'] }
    });

    let ticket = null;

    if (ticketsExistentes.length > 0) {
      // Ticket existente - adicionar mensagem
      ticket = ticketsExistentes[0];
    } else {
      // Criar novo ticket
      const numeroTicket = `WA-${Date.now().toString(36).toUpperCase()}`;
      
      ticket = await base44.asServiceRole.entities.Ticket.create({
        clinica_id,
        numero_ticket: numeroTicket,
        assunto: `WhatsApp de ${profileName}`,
        descricao: body_text.substring(0, 500),
        categoria: 'duvida',
        prioridade: 'media',
        status: 'aberto',
        canal_origem: 'whatsapp',
        solicitante_nome: profileName,
        solicitante_telefone: from.replace('whatsapp:', ''),
        solicitante_whatsapp: from.replace('whatsapp:', '')
      });

      console.log('[WhatsApp] 📋 Novo ticket criado:', ticket.numero_ticket);
    }

    // Adicionar mensagem ao ticket
    await base44.asServiceRole.entities.MensagemTicket.create({
      ticket_id: ticket.id,
      clinica_id,
      remetente_tipo: 'cliente',
      remetente_nome: profileName,
      remetente_whatsapp: from.replace('whatsapp:', ''),
      conteudo: body_text,
      tipo_mensagem: messageType,
      twilio_message_sid: messageSid
    });

    // Auto-resposta IA (se habilitado)
    try {
      await base44.asServiceRole.functions.invoke('autoRespostaIA', {
        ticket_id: ticket.id,
        canal: 'whatsapp'
      });
    } catch (iaError) {
      console.warn('[WhatsApp] ⚠️ IA falhou:', iaError.message);
    }

    const latencia = Date.now() - startTime;
    console.log('[WhatsApp] ✅ Mensagem processada:', {
      from,
      ticket_id: ticket.id,
      latencia_ms: latencia
    });

    // AUDIT: Registrar consumo
    await base44.asServiceRole.entities.ConsumoRecurso.create({
      clinica_id,
      recurso: 'whatsapp_mensagem_recebida',
      quantidade: 1,
      unidade: 'mensagem',
      custo_unitario_brl: 0.005, // Estimativa Twilio
      mes_referencia: new Date().toISOString().substring(0, 7),
      metadata: {
        from: from.replace('whatsapp:', ''),
        ticket_id: ticket.id,
        message_sid: messageSid,
        latencia_ms: latencia
      }
    });

    // Twilio espera resposta TwiML (vazia = sem auto-reply)
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' }
    });

  } catch (error) {
    console.error('[WhatsApp] ❌ Erro webhook:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});