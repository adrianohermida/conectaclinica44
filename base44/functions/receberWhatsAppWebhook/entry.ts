import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * REFATORADO: Webhook Twilio WhatsApp multi-tenant
 * Twilio envia: From, To, Body, MediaUrl
 * Extrai clinica_id por lookup número, cria ticket, IA opcional
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // 1. Parse Twilio webhook (x-www-form-urlencoded)
    const formData = await req.formData();
    const From = formData.get('From')?.replace('whatsapp:', '');
    const To = formData.get('To')?.replace('whatsapp:', '');
    const Body = formData.get('Body');
    const MediaUrl = formData.get('MediaUrl0'); // Primeiro anexo
    const MessageSid = formData.get('MessageSid');

    console.log('[WhatsApp] Webhook recebido:', { From, To, Body: Body?.substring(0, 50) });

    if (!From || !To || !Body) {
      return Response.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    // 2. Lookup: qual clínica é dona desse número?
    const configs = await base44.asServiceRole.entities.ConfiguracaoWhatsApp.filter({
      twilio_phone_number: To,
      ativo: true
    });

    if (configs.length === 0) {
      console.error('[WhatsApp] Número não encontrado:', To);
      return Response.json({ error: 'Configuração não encontrada' }, { status: 404 });
    }

    const config = configs[0];
    const clinica_id = config.clinica_id;

    // 3. Verificar horário (se offline, enviar mensagem e criar ticket silencioso)
    let isOnline = true;
    const horarioConfig = config.horario_atendimento;

    if (horarioConfig?.ativo) {
      const now = new Date();
      const diaSemana = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'][now.getDay()];
      const horaAtual = now.getHours() * 60 + now.getMinutes();
      
      const diaConfig = horarioConfig.dias?.[diaSemana];
      if (!diaConfig?.ativo) {
        isOnline = false;
      } else {
        const [hInicio, mInicio] = (diaConfig.inicio || '09:00').split(':').map(Number);
        const [hFim, mFim] = (diaConfig.fim || '18:00').split(':').map(Number);
        const minInicio = hInicio * 60 + mInicio;
        const minFim = hFim * 60 + mFim;
        
        if (horaAtual < minInicio || horaAtual > minFim) {
          isOnline = false;
        }
      }
    }

    // 4. Buscar ou criar contato
    let contato = null;
    const contatosExistentes = await base44.asServiceRole.entities.Contato.filter({
      clinica_id,
      whatsapp: From
    });

    if (contatosExistentes.length > 0) {
      contato = contatosExistentes[0];
    } else {
      // Criar contato novo
      contato = await base44.asServiceRole.entities.Contato.create({
        clinica_id,
        tipo_contato: 'lead',
        nome_completo: `Lead WhatsApp ${From.substring(0, 10)}`,
        whatsapp: From,
        telefones: [{ tipo: 'celular', numero: From, principal: true }],
        origem_lead: 'whatsapp',
        status: 'prospecto'
      });
    }

    // 5. Buscar ticket aberto existente
    let ticket = null;
    const ticketsAbertos = await base44.asServiceRole.entities.Ticket.filter({
      clinica_id,
      contato_id: contato.id,
      status: { $in: ['aberto', 'em_andamento', 'aguardando_cliente'] },
      canal: 'whatsapp'
    });

    if (ticketsAbertos.length > 0) {
      ticket = ticketsAbertos[0];
    } else {
      // Criar novo ticket
      const numeroTicket = `#${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
      
      ticket = await base44.asServiceRole.entities.Ticket.create({
        clinica_id,
        contato_id: contato.id,
        numero_ticket: numeroTicket,
        assunto: Body.substring(0, 100),
        status: 'aberto',
        prioridade: 'media',
        canal: 'whatsapp',
        solicitante_nome: contato.nome_completo,
        solicitante_telefone: From
      });
    }

    // 6. Adicionar mensagem ao ticket
    await base44.asServiceRole.entities.MensagemTicket.create({
      clinica_id,
      ticket_id: ticket.id,
      autor_nome: contato.nome_completo,
      tipo_autor: 'cliente',
      conteudo: Body,
      anexos: MediaUrl ? [{ url: MediaUrl, tipo: 'imagem' }] : [],
      enviada_via: 'whatsapp',
      twilio_message_sid: MessageSid
    });

    // 7. Atualizar contador mensagens recebidas
    await base44.asServiceRole.entities.ConfiguracaoWhatsApp.update(config.id, {
      total_mensagens_recebidas_mes: (config.total_mensagens_recebidas_mes || 0) + 1
    });

    // 8. Auto-resposta IA (se habilitada e online)
    if (config.ia_habilitada && isOnline) {
      try {
        const respostaIA = await base44.asServiceRole.functions.invoke('autoRespostaIA', {
          session_id: ticket.id,
          clinica_id,
          mensagem: Body,
          visitante_id: From
        });

        if (respostaIA.data.auto_resposta && respostaIA.data.tipo !== 'saldo_insuficiente') {
          // Enviar auto-resposta via WhatsApp
          await base44.asServiceRole.functions.invoke('enviarWhatsAppResposta', {
            ticket_id: ticket.id,
            conteudo: respostaIA.data.auto_resposta
          });

          console.log('[WhatsApp] ✅ Auto-resposta IA enviada');
        }
      } catch (iaError) {
        console.error('[WhatsApp] Erro auto-resposta IA:', iaError);
      }
    } else if (!isOnline) {
      // Resposta offline automática
      await base44.asServiceRole.functions.invoke('enviarWhatsAppResposta', {
        ticket_id: ticket.id,
        conteudo: config.mensagem_offline
      });
    }

    return Response.json({ success: true, ticket_id: ticket.id });

  } catch (error) {
    console.error('[WhatsApp] Erro webhook:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});