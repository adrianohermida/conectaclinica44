import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { 
      nome, 
      email, 
      telefone, 
      assunto, 
      categoria, 
      conteudo 
    } = await req.json();

    // Validação
    if (!nome || !email || !assunto || !conteudo) {
      return Response.json({ 
        error: 'Campos obrigatórios: nome, email, assunto, conteudo' 
      }, { status: 400 });
    }

    const categoriaValida = ['duvida', 'suporte_tecnico', 'comercial', 'urgente'];
    if (categoria && !categoriaValida.includes(categoria)) {
      return Response.json({ 
        error: `Categoria inválida. Use: ${categoriaValida.join(', ')}` 
      }, { status: 400 });
    }

    // 1. Criar/atualizar lead
    const leadsExistentes = await base44.asServiceRole.entities.LeadSite.filter({ email });
    let lead_id;
    
    if (leadsExistentes.length > 0) {
      await base44.asServiceRole.entities.LeadSite.update(leadsExistentes[0].id, {
        nome,
        telefone: telefone || leadsExistentes[0].telefone,
        status: 'ticket_aberto'
      });
      lead_id = leadsExistentes[0].id;
    } else {
      const novoLead = await base44.asServiceRole.entities.LeadSite.create({
        origem: 'widget_chat_ia',
        status: 'ticket_aberto',
        nome,
        email,
        telefone
      });
      lead_id = novoLead.id;
    }

    // 2. Criar ticket GLOBAL (SuperAdmin)
    const ano = new Date().getFullYear();
    const tickets = await base44.asServiceRole.entities.Ticket.list();
    const numeroSequencial = String(tickets.length + 1).padStart(4, '0');

    const ticket = await base44.asServiceRole.entities.Ticket.create({
      clinica_id: null, // NULL = ticket global SuperAdmin
      numero_ticket: `#SITE-${ano}-${numeroSequencial}`,
      assunto,
      status: 'aberto',
      prioridade: categoria === 'urgente' ? 'alta' : 'media',
      canal: 'site_publico_ia',
      solicitante_nome: nome,
      solicitante_email: email,
      categoria: categoria || 'duvida',
      tags: ['lead_site', 'ia_widget', `lead_${lead_id}`]
    });

    // 3. Primeira mensagem
    await base44.asServiceRole.entities.MensagemTicket.create({
      ticket_id: ticket.id,
      clinica_id: null,
      remetente_tipo: 'cliente',
      remetente_nome: nome,
      remetente_email: email,
      conteudo
    });

    // 4. Notificar SuperAdmin
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: 'suporte@conectaclinica.com.br',
        subject: `🎫 Novo Ticket Site (IA) - ${assunto}`,
        body: `
          <h2>Ticket #${ticket.numero_ticket}</h2>
          <p><strong>Origem:</strong> Widget IA do site</p>
          <ul>
            <li><strong>De:</strong> ${nome} (${email})</li>
            <li><strong>Telefone:</strong> ${telefone || 'Não informado'}</li>
            <li><strong>Categoria:</strong> ${categoria || 'duvida'}</li>
            <li><strong>Prioridade:</strong> ${ticket.prioridade}</li>
            <li><strong>Mensagem:</strong> ${conteudo}</li>
            <li><strong>Lead ID:</strong> ${lead_id}</li>
          </ul>
          <p><strong>Ação:</strong> Responder em até ${categoria === 'urgente' ? '4h' : '24h'}.</p>
        `
      });
    } catch (e) {
      console.error('Email falhou:', e);
    }

    return Response.json({ 
      success: true, 
      ticket_id: ticket.id,
      numero_ticket: ticket.numero_ticket,
      lead_id,
      mensagem: `✅ Ticket #${ticket.numero_ticket} criado! Nossa equipe responderá em até ${categoria === 'urgente' ? '4h' : '24h'} no email ${email}.`
    });

  } catch (error) {
    console.error('Erro criarTicketSuporte:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});