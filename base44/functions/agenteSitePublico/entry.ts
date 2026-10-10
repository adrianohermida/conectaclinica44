import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { acao, conversation_id, mensagem, lead_data } = await req.json();

    // AÇÃO 1: INICIAR CONVERSA + CAPTURAR LEAD
    if (acao === 'iniciar') {
      // Criar lead site automaticamente
      const lead = await base44.asServiceRole.entities.LeadSite.create({
        origem: 'widget_chat',
        status: 'novo',
        nome: lead_data?.nome || 'Visitante',
        email: lead_data?.email || null,
        telefone: lead_data?.telefone || null,
        empresa: lead_data?.empresa || null,
        dados_navegacao: {
          user_agent: req.headers.get('user-agent'),
          ip: req.headers.get('x-forwarded-for') || 'unknown',
          timestamp: new Date().toISOString()
        }
      });

      // Criar conversa com agente IA
      const conversation = await base44.asServiceRole.agents.createConversation({
        agent_name: 'agendamento_consultas',
        metadata: {
          tipo: 'publico',
          lead_id: lead.id,
          origem: 'widget_site'
        }
      });

      // Mensagem inicial do agente
      const greeting = "Olá! 👋 Sou Clara, da ConectaClínica.\n\nPosso ajudar com:\n📅 Agendar demonstração\n💬 Tirar dúvidas sobre a plataforma\n🎫 Abrir ticket de suporte\n\nComo posso ajudar?";

      return Response.json({
        conversation_id: conversation.id,
        lead_id: lead.id,
        mensagem_inicial: greeting
      });
    }

    // AÇÃO 2: ENVIAR MENSAGEM
    if (acao === 'enviar_mensagem') {
      if (!conversation_id) {
        return Response.json({ error: 'conversation_id obrigatório' }, { status: 400 });
      }

      // Buscar conversa
      const conversation = await base44.asServiceRole.agents.getConversation(conversation_id);

      // Adicionar mensagem do usuário
      await base44.asServiceRole.agents.addMessage(conversation, {
        role: 'user',
        content: mensagem
      });

      // Resposta do agente vem via subscription no frontend
      return Response.json({ success: true });
    }

    // AÇÃO 3: AGENDAR DEMO
    if (acao === 'agendar_demo') {
      const { nome, email, telefone, empresa, data, horario, observacoes } = await req.json();

      // Atualizar lead
      const leads = await base44.asServiceRole.entities.LeadSite.filter({ email });
      if (leads.length > 0) {
        await base44.asServiceRole.entities.LeadSite.update(leads[0].id, {
          nome,
          telefone,
          empresa,
          status: 'agendamento_confirmado',
          data_agendamento: `${data}T${horario}:00`
        });
      }

      // Criar agendamento online
      const agendamento = await base44.asServiceRole.entities.AgendamentoOnline.create({
        nome_completo: nome,
        email,
        telefone,
        empresa,
        data_preferencia: data,
        horario_preferencia: horario,
        tipo_agendamento: 'demonstracao',
        observacoes,
        status: 'confirmado',
        origem: 'widget_chat'
      });

      // Enviar email confirmação
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: email,
          subject: '🎉 Demonstração Agendada - ConectaClínica',
          body: `
            <h2>Olá, ${nome}!</h2>
            <p>Sua demonstração foi agendada com sucesso:</p>
            <ul>
              <li><strong>Data:</strong> ${new Date(data).toLocaleDateString('pt-BR')}</li>
              <li><strong>Horário:</strong> ${horario}</li>
            </ul>
            <p>Nossa equipe entrará em contato nos próximos minutos para confirmar.</p>
            <p>Até breve! 🚀</p>
          `
        });
      } catch (e) {
        console.error('Email falhou:', e);
      }

      // Notificar equipe vendas
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: 'vendas@conectaclinica.com.br',
          subject: `🔥 Nova Demo Agendada - ${nome}`,
          body: `
            <h2>Nova Demonstração Agendada</h2>
            <ul>
              <li><strong>Nome:</strong> ${nome}</li>
              <li><strong>Email:</strong> ${email}</li>
              <li><strong>Telefone:</strong> ${telefone || 'Não informado'}</li>
              <li><strong>Empresa:</strong> ${empresa || 'Não informado'}</li>
              <li><strong>Data:</strong> ${new Date(data).toLocaleDateString('pt-BR')} às ${horario}</li>
              <li><strong>Observações:</strong> ${observacoes || 'Nenhuma'}</li>
            </ul>
          `
        });
      } catch (e) {
        console.error('Notificação vendas falhou:', e);
      }

      return Response.json({ 
        success: true, 
        agendamento_id: agendamento.id 
      });
    }

    // AÇÃO 4: CRIAR TICKET PÚBLICO
    if (acao === 'criar_ticket') {
      const { nome, email, telefone, assunto, categoria, conteudo } = await req.json();

      // Criar/atualizar lead
      const leadsExistentes = await base44.asServiceRole.entities.LeadSite.filter({ email });
      let lead_id;
      
      if (leadsExistentes.length > 0) {
        await base44.asServiceRole.entities.LeadSite.update(leadsExistentes[0].id, {
          nome,
          telefone,
          status: 'ticket_aberto'
        });
        lead_id = leadsExistentes[0].id;
      } else {
        const novoLead = await base44.asServiceRole.entities.LeadSite.create({
          origem: 'widget_chat',
          status: 'ticket_aberto',
          nome,
          email,
          telefone
        });
        lead_id = novoLead.id;
      }

      // Criar ticket GLOBAL (sem clinica_id = SuperAdmin)
      const ano = new Date().getFullYear();
      const tickets = await base44.asServiceRole.entities.Ticket.list();
      const numeroSequencial = String(tickets.length + 1).padStart(4, '0');

      const ticket = await base44.asServiceRole.entities.Ticket.create({
        clinica_id: null, // NULL = ticket global SuperAdmin
        numero_ticket: `#SITE-${ano}-${numeroSequencial}`,
        assunto,
        status: 'aberto',
        prioridade: categoria === 'urgente' ? 'alta' : 'media',
        canal: 'site_publico',
        solicitante_nome: nome,
        solicitante_email: email,
        categoria,
        tags: ['lead_site', 'vendas', `lead_${lead_id}`]
      });

      // Primeira mensagem
      await base44.asServiceRole.entities.MensagemTicket.create({
        ticket_id: ticket.id,
        clinica_id: null,
        remetente_tipo: 'cliente',
        remetente_nome: nome,
        remetente_email: email,
        conteudo
      });

      // Notificar SuperAdmin
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: 'suporte@conectaclinica.com.br',
          subject: `🎫 Novo Ticket Site - ${assunto}`,
          body: `
            <h2>Ticket #${ticket.numero_ticket}</h2>
            <ul>
              <li><strong>De:</strong> ${nome} (${email})</li>
              <li><strong>Categoria:</strong> ${categoria}</li>
              <li><strong>Mensagem:</strong> ${conteudo}</li>
            </ul>
          `
        });
      } catch (e) {
        console.error('Email falhou:', e);
      }

      return Response.json({ 
        success: true, 
        ticket_id: ticket.id,
        numero_ticket: ticket.numero_ticket
      });
    }

    // AÇÃO 5: ESCALAR PARA HUMANO
    if (acao === 'escalar_humano') {
      const { conversation_id, motivo, lead_id } = await req.json();

      // Atualizar lead
      if (lead_id) {
        await base44.asServiceRole.entities.LeadSite.update(lead_id, {
          status: 'escalado_vendas',
          observacoes: `Escalado: ${motivo}`
        });
      }

      // Criar ticket escalado
      const conversationData = await base44.asServiceRole.agents.getConversation(conversation_id);
      const historicoCompleto = conversationData.messages
        .map(m => `[${m.role}]: ${m.content}`)
        .join('\n\n');

      const ano = new Date().getFullYear();
      const tickets = await base44.asServiceRole.entities.Ticket.list();
      const numeroSequencial = String(tickets.length + 1).padStart(4, '0');

      const ticket = await base44.asServiceRole.entities.Ticket.create({
        clinica_id: null,
        numero_ticket: `#ESC-${ano}-${numeroSequencial}`,
        assunto: `Escalação Widget - ${motivo}`,
        status: 'aberto',
        prioridade: 'alta',
        canal: 'site_publico',
        solicitante_nome: conversationData.metadata?.nome || 'Visitante',
        solicitante_email: conversationData.metadata?.email || 'nao-informado@temp.com',
        categoria: 'escalacao_vendas',
        tags: ['escalado', 'vendas', `lead_${lead_id}`]
      });

      await base44.asServiceRole.entities.MensagemTicket.create({
        ticket_id: ticket.id,
        clinica_id: null,
        remetente_tipo: 'sistema',
        remetente_nome: 'Widget IA',
        remetente_email: 'sistema@conectaclinica.com.br',
        conteudo: `HISTÓRICO DA CONVERSA:\n\n${historicoCompleto}\n\n---\nMotivo da escalação: ${motivo}`
      });

      // Notificar vendas URGENTE
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: 'vendas@conectaclinica.com.br',
          subject: `🚨 ESCALAÇÃO URGENTE - Widget Site`,
          body: `
            <h2 style="color: #ea4335;">ESCALAÇÃO MANUAL SOLICITADA</h2>
            <p><strong>Motivo:</strong> ${motivo}</p>
            <p><strong>Ticket:</strong> #${ticket.numero_ticket}</p>
            <p>Acesse o Helpdesk imediatamente para atender.</p>
          `
        });
      } catch (e) {
        console.error('Email falhou:', e);
      }

      return Response.json({ 
        success: true,
        ticket_id: ticket.id,
        mensagem: 'Transferindo você para um consultor humano agora mesmo...'
      });
    }

    return Response.json({ error: 'Ação não reconhecida' }, { status: 400 });

  } catch (error) {
    console.error('Erro agenteSitePublico:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});