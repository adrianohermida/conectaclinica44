import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * NOTIFICAR NOVO TICKET
 * - Envia email para equipe
 * - Cria notificação interna
 * - Confirmação ao solicitante
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    const { ticket_id, clinica_id } = await req.json();

    if (!ticket_id || !clinica_id) {
      return Response.json({ 
        success: false, 
        error: 'ticket_id e clinica_id obrigatórios' 
      }, { status: 400 });
    }

    // Buscar ticket (entity corrigida)
    const tickets = await base44.asServiceRole.entities.Ticket.list();
    const ticket = tickets.find(t => t.id === ticket_id);

    if (!ticket) {
      return Response.json({ 
        success: false, 
        error: 'Ticket não encontrado' 
      }, { status: 404 });
    }

    // VALIDAÇÃO MULTI-TENANT
    if (ticket.clinica_id !== clinica_id) {
      return Response.json({ 
        success: false, 
        error: 'Ticket não pertence a esta clínica' 
      }, { status: 403 });
    }

    // Buscar clínica e config email
    const clinicas = await base44.asServiceRole.entities.Clinica.list();
    const clinica = clinicas.find(c => c.id === clinica_id);

    const configsEmail = await base44.asServiceRole.entities.ConfiguracaoEmail.filter({ clinica_id });
    const configEmail = configsEmail[0] || { usar_email_builtin: true };

    // Buscar equipe da clínica
    const response = await base44.functions.invoke('listarEquipeClinica', { clinica_id });
    const equipe = response.data?.equipe || [];

    // Criar notificações internas para CADA membro da equipe
    for (const membro of equipe) {
      await base44.asServiceRole.entities.MensagemInterna.create({
        clinica_id,
        destinatario_id: membro.id,
        destinatario_nome: membro.full_name || membro.email,
        remetente_id: 'sistema',
        remetente_nome: 'Sistema',
        tipo_conversa: 'notificacao_sistema',
        assunto: `Novo Ticket: ${ticket.assunto}`,
        corpo: `Ticket #${ticket.numero_ticket} criado por ${ticket.solicitante_nome}`,
        conteudo: `📋 **Novo Ticket #${ticket.numero_ticket}**\n\n👤 Solicitante: ${ticket.solicitante_nome}\n📧 Email: ${ticket.solicitante_email}\n🏷️ Categoria: ${ticket.categoria}\n⚠️ Prioridade: ${ticket.prioridade}\n\n✉️ Assunto: ${ticket.assunto}`,
        categoria: 'sistema',
        lida: false
      });

      // Email para equipe (SEMPRE via Base44 built-in ou SMTP customizado)
      try {
        const configs = await base44.asServiceRole.entities.ConfiguracaoNotificacao.filter({ clinica_id });
        if (configs.length > 0 && configs[0].email_tickets) {
          // USAR BASE44 BUILT-IN (padrão MVP)
          if (configEmail.usar_email_builtin !== false) {
            await base44.asServiceRole.integrations.Core.SendEmail({
              from_name: clinica?.nome || "ConectaClínica",
              to: membro.email,
              subject: `🎫 Novo Ticket #${ticket.numero_ticket}`,
              body: `Olá, ${membro.full_name || membro.email}!\n\nNovo ticket recebido:\n\n📋 Ticket: #${ticket.numero_ticket}\n👤 Solicitante: ${ticket.solicitante_nome}\n📧 Email: ${ticket.solicitante_email}\n🏷️ Categoria: ${ticket.categoria}\n⚠️ Prioridade: ${ticket.prioridade}\n\n✉️ Assunto: ${ticket.assunto}\n\n---\nAcesse o sistema para responder.`
            });
          }
          // TODO: SMTP customizado (SendGrid/Mailgun) - implementar quando necessário
        }
      } catch (e) {
        console.warn('⚠️ Email notificação falhou:', e);
      }
    }

    // Email de confirmação APENAS SE CONFIGURADO
    if (ticket.solicitante_email && configEmail?.enviar_confirmacao_automatica !== false) {
      try {
        await base44.asServiceRole.functions.invoke('enviarEmailTicket', {
          ticket_id: ticket.id,
          destinatario: ticket.solicitante_email,
          assunto: `Ticket #${ticket.numero_ticket} recebido`,
          corpo: `Olá, ${ticket.solicitante_nome}!\n\nRecebemos sua solicitação.\n\n📋 Ticket: ${ticket.numero_ticket}\n📅 Aberto em: ${new Date().toLocaleString('pt-BR')}\n\nNossa equipe responderá em breve.\n\nAtenciosamente,\nEquipe ${clinica?.nome || 'PrevenClin'}`
        });
      } catch (emailError) {
        console.warn('⚠️ Email confirmação falhou:', emailError);
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});