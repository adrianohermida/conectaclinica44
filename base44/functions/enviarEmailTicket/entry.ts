import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * ENVIAR EMAIL TICKET: Wrapper simplificado usando sendgrid/send.js
 * ELIMINADO: 200+ linhas de código duplicado
 * AGORA: Auditoria automática, retry, rate limiting via wrapper
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { ticket_id, tipo, destinatario } = payload;

    if (!ticket_id || !tipo || !destinatario) {
      return Response.json({ 
        error: 'Campos obrigatórios: ticket_id, tipo, destinatario'
      }, { status: 400 });
    }

    // BUSCAR TICKET
    const tickets = await base44.asServiceRole.entities.Ticket.filter({ id: ticket_id });
    if (!tickets || tickets.length === 0) {
      return Response.json({ error: 'Ticket não encontrado' }, { status: 404 });
    }
    const ticket = tickets[0];

    // BUSCAR CLÍNICA
    const clinicas = await base44.asServiceRole.entities.Clinica.filter({ 
      id: ticket.clinica_id 
    });
    const clinica = clinicas[0];

    // BUSCAR ÚLTIMA MENSAGEM (para resposta_ia)
    let ultimaMensagem = null;
    if (tipo === 'resposta_ia') {
      const mensagens = await base44.asServiceRole.entities.MensagemTicket.filter({
        clinica_id: ticket.clinica_id,
        ticket_id: ticket.id,
        remetente_tipo: 'sistema_ia'
      });
      if (mensagens && mensagens.length > 0) {
        mensagens.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        ultimaMensagem = mensagens[0];
      }
    }

    // MONTAR EMAIL BASEADO NO TIPO
    let subject = '';
    let html = '';

    switch (tipo) {
      case 'confirmacao_criacao':
        subject = `✅ Ticket ${ticket.numero_ticket} criado - ${clinica.nome}`;
        html = `
          <h2>Olá, ${ticket.solicitante_nome}!</h2>
          <p>Seu ticket foi criado com sucesso.</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <strong>Número:</strong> ${ticket.numero_ticket}<br>
            <strong>Assunto:</strong> ${ticket.assunto}<br>
            <strong>Status:</strong> ${ticket.status}
          </div>
          <p>Nossa equipe irá analisar e responder em breve.</p>
          <p>Você pode acompanhar o status do seu ticket através do nosso portal.</p>
          <hr>
          <p style="color: #666; font-size: 12px;">
            ${clinica.nome}<br>
            ${clinica.telefone || ''}<br>
            ${clinica.email || ''}
          </p>
        `;
        break;

      case 'resposta_ia':
        subject = `💬 Resposta ao ticket ${ticket.numero_ticket} - ${clinica.nome}`;
        html = `
          <h2>Olá, ${ticket.solicitante_nome}!</h2>
          <p>Recebemos sua mensagem e nossa assistente virtual preparou uma resposta:</p>
          <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196F3;">
            ${ultimaMensagem?.conteudo || 'Resposta não disponível'}
          </div>
          <p><strong>Ticket:</strong> ${ticket.numero_ticket}</p>
          <p>Se precisar de mais informações ou quiser falar com um atendente humano, basta responder este email.</p>
          <hr>
          <p style="color: #666; font-size: 12px;">
            ${clinica.nome}<br>
            ${clinica.telefone || ''}<br>
            ${clinica.email || ''}
          </p>
        `;
        break;

      case 'atualizado':
        subject = `🔄 Atualização do ticket ${ticket.numero_ticket} - ${clinica.nome}`;
        html = `
          <h2>Olá, ${ticket.solicitante_nome}!</h2>
          <p>Houve uma atualização no seu ticket.</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <strong>Número:</strong> ${ticket.numero_ticket}<br>
            <strong>Status:</strong> ${ticket.status}<br>
            <strong>Última atualização:</strong> ${new Date().toLocaleString('pt-BR')}
          </div>
          <p>Acesse nosso portal para mais detalhes.</p>
          <hr>
          <p style="color: #666; font-size: 12px;">
            ${clinica.nome}<br>
            ${clinica.telefone || ''}<br>
            ${clinica.email || ''}
          </p>
        `;
        break;

      default:
        return Response.json({ error: 'Tipo de email inválido' }, { status: 400 });
    }

    // THREADING: Buscar primeira mensagem do CLIENTE
    const mensagens = await base44.asServiceRole.entities.MensagemTicket.filter({
      ticket_id: ticket.id,
      remetente_tipo: 'cliente'
    });
    mensagens.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

    let in_reply_to = null;
    let references = null;
    
    if (tipo !== 'confirmacao_criacao' && mensagens.length > 0 && mensagens[0].email_headers?.message_id) {
      in_reply_to = mensagens[0].email_headers.message_id;
      references = mensagens[0].email_headers.references || in_reply_to;
    }

    // SLUG para reply-to
    const slug = clinica.slug || clinica.nome?.toLowerCase().replace(/\s+/g, '-');
    const reply_to = `${slug}+${ticket.numero_ticket}@conectaclinica.com.br`;

    // DELEGAR PARA WRAPPER CENTRALIZADO
    const resultado = await base44.asServiceRole.functions.invoke('sendgrid/send', {
      clinica_id: ticket.clinica_id,
      to: destinatario,
      subject,
      html,
      tipo_email: tipo,
      ticket_id: ticket.id,
      reply_to,
      in_reply_to,
      references
    });

    // Salvar mensagem no histórico do ticket
    try {
      await base44.asServiceRole.entities.MensagemTicket.create({
        ticket_id: ticket.id,
        clinica_id: ticket.clinica_id,
        remetente_tipo: 'sistema',
        remetente_nome: clinica.nome,
        remetente_email: resultado.data.message_id,
        conteudo: html.replace(/<[^>]*>/g, '').substring(0, 500),
        conteudo_html: html,
        email_headers: {
          message_id: resultado.data.message_id,
          sg_message_id: resultado.data.sg_message_id,
          in_reply_to,
          references,
          date: new Date().toISOString()
        }
      });
    } catch (msgError) {
      console.warn('[enviarEmailTicket] ⚠️ Falha ao salvar mensagem:', msgError.message);
    }

    return Response.json(resultado.data);

  } catch (error) {
    console.error('[enviarEmailTicket] Erro:', error);
    return Response.json({ 
      error: 'Erro ao enviar email',
      details: error.message 
    }, { status: 500 });
  }
});