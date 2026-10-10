import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * SendGrid Event Webhook
 * Recebe eventos: delivered, open, click, bounce, etc
 * Atualiza StatusEntregaEmail automaticamente
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const events = await req.json();
    
    if (!Array.isArray(events)) {
      return Response.json({ error: 'Expected array of events' }, { status: 400 });
    }

    console.log(`[SENDGRID_WEBHOOK] Recebido ${events.length} eventos`);

    for (const event of events) {
      const { email, event: eventType, sg_message_id, timestamp } = event;
      
      console.log(`[SENDGRID_WEBHOOK] ${eventType} para ${email} (${sg_message_id})`);
      
      // Buscar status de email correspondente
      const statusEmails = await base44.asServiceRole.entities.StatusEntregaEmail.filter({
        sendgrid_message_id: sg_message_id
      });

      if (statusEmails.length === 0) {
        console.warn(`[SENDGRID_WEBHOOK] Nenhum registro encontrado para ${sg_message_id}`);
        continue;
      }

      const statusEmail = statusEmails[0];
      
      // Mapear evento → status
      const statusMap = {
        'delivered': 'entregue',
        'open': 'aberto',
        'click': 'aberto', // Mantém como aberto mas incrementa cliques
        'bounce': 'bounce',
        'dropped': 'falha',
        'deferred': 'enviado',
        'spam_report': 'falha',
        'unsubscribe': 'entregue' // Usuário descadastrou mas recebeu
      };

      const novoStatus = statusMap[eventType] || statusEmail.status_envio;
      
      // Atualizar status
      await base44.asServiceRole.entities.StatusEntregaEmail.update(statusEmail.id, {
        status_envio: novoStatus,
        total_aberturas: eventType === 'open' ? (statusEmail.total_aberturas || 0) + 1 : statusEmail.total_aberturas,
        total_cliques: eventType === 'click' ? (statusEmail.total_cliques || 0) + 1 : statusEmail.total_cliques,
        data_ultima_atividade: new Date(timestamp * 1000).toISOString(),
        eventos_raw: [...(statusEmail.eventos_raw || []), event]
      });

      console.log(`✅ [SENDGRID_WEBHOOK] ${sg_message_id} → ${novoStatus}`);

      // CRIAR NOTIFICAÇÃO para eventos importantes
      if (['delivered', 'open', 'bounce'].includes(eventType) && statusEmail.ticket_id) {
        const ticket = await base44.asServiceRole.entities.Ticket.filter({ id: statusEmail.ticket_id });
        if (ticket.length > 0 && ticket[0].atribuido_a) {
          const mensagemNotif = eventType === 'delivered' ? 'Email entregue com sucesso' :
                                eventType === 'open' ? 'Email foi aberto pelo destinatário' :
                                'Email retornou (bounce)';
          
          await base44.asServiceRole.entities.Notificacao.create({
            clinica_id: statusEmail.clinica_id,
            user_id: ticket[0].atribuido_a,
            tipo: 'status_email',
            titulo: `📧 ${eventType === 'bounce' ? 'Falha' : 'Atualização'} de Email`,
            mensagem: `${mensagemNotif} - ${statusEmail.assunto}`,
            ticket_id: statusEmail.ticket_id,
            link: `/Atendimento?ticket=${statusEmail.ticket_id}`,
            prioridade: eventType === 'bounce' ? 'alta' : 'baixa'
          });
        }
      }
    }

    return Response.json({ 
      success: true,
      processed: events.length
    });

  } catch (error) {
    console.error('[SENDGRID_WEBHOOK] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});