import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { 
      conversation_id, 
      motivo, 
      lead_id 
    } = await req.json();

    if (!conversation_id) {
      return Response.json({ error: 'conversation_id obrigatório' }, { status: 400 });
    }

    // 1. Buscar histórico da conversa
    const conversationData = await base44.asServiceRole.agents.getConversation(conversation_id);
    const historicoCompleto = conversationData.messages
      .map(m => `[${m.role}]: ${m.content}`)
      .join('\n\n');

    // 2. Atualizar lead (se existe)
    if (lead_id) {
      await base44.asServiceRole.entities.LeadSite.update(lead_id, {
        status: 'escalado_vendas',
        observacoes: `Escalado via IA: ${motivo || 'Solicitação do usuário'}`
      });
    }

    // 3. Criar ticket de escalação prioritário
    const ano = new Date().getFullYear();
    const tickets = await base44.asServiceRole.entities.Ticket.list();
    const numeroSequencial = String(tickets.length + 1).padStart(4, '0');

    const ticket = await base44.asServiceRole.entities.Ticket.create({
      clinica_id: null,
      numero_ticket: `#ESC-${ano}-${numeroSequencial}`,
      assunto: `Escalação Widget IA - ${motivo || 'Atendimento Humano Solicitado'}`,
      status: 'aberto',
      prioridade: 'alta',
      canal: 'site_publico_ia',
      solicitante_nome: conversationData.metadata?.nome || 'Visitante',
      solicitante_email: conversationData.metadata?.email || 'nao-informado@temp.com',
      categoria: 'escalacao_vendas',
      tags: ['escalado', 'vendas', 'urgente', `lead_${lead_id || 'unknown'}`]
    });

    // 4. Mensagem com histórico completo
    await base44.asServiceRole.entities.MensagemTicket.create({
      ticket_id: ticket.id,
      clinica_id: null,
      remetente_tipo: 'sistema',
      remetente_nome: 'Clara (IA)',
      remetente_email: 'sistema@conectaclinica.com.br',
      conteudo: `🚨 ESCALAÇÃO MANUAL SOLICITADA\n\n**Motivo:** ${motivo || 'Usuário solicitou atendimento humano'}\n\n**Conversation ID:** ${conversation_id}\n\n---\n\n**HISTÓRICO DA CONVERSA:**\n\n${historicoCompleto}\n\n---\n\n**AÇÃO NECESSÁRIA:** Atender este lead IMEDIATAMENTE via email ou telefone (se disponível).`
    });

    // 5. Notificar vendas URGENTE
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: 'vendas@conectaclinica.com.br',
        subject: `🚨 ESCALAÇÃO URGENTE - Widget Site IA`,
        body: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 3px solid #ea4335; padding: 20px; border-radius: 8px;">
            <h2 style="color: #ea4335; margin-top: 0;">⚠️ ESCALAÇÃO MANUAL SOLICITADA</h2>
            <p><strong>Motivo:</strong> ${motivo || 'Usuário solicitou atendimento humano'}</p>
            <p><strong>Ticket:</strong> #${ticket.numero_ticket}</p>
            <p><strong>Conversation ID:</strong> ${conversation_id}</p>
            ${lead_id ? `<p><strong>Lead ID:</strong> ${lead_id}</p>` : ''}
            
            <div style="background: #ffebee; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <p style="margin: 0; font-weight: bold; color: #c62828;">AÇÃO IMEDIATA NECESSÁRIA</p>
              <p style="margin: 10px 0 0 0;">Acesse o Helpdesk e responda este ticket AGORA.</p>
            </div>

            <details style="margin-top: 20px;">
              <summary style="cursor: pointer; font-weight: bold;">Ver Histórico Completo</summary>
              <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 12px; margin-top: 10px;">${historicoCompleto}</pre>
            </details>
          </div>
        `
      });
    } catch (e) {
      console.error('Email falhou:', e);
    }

    return Response.json({ 
      success: true,
      ticket_id: ticket.id,
      numero_ticket: ticket.numero_ticket,
      mensagem: '⏳ Transferindo você para um consultor humano agora mesmo... Aguarde alguns instantes.'
    });

  } catch (error) {
    console.error('Erro escalarParaHumano:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});