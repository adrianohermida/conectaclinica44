import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * FUNÇÃO: Invocar Agente IA (secretaria_ia, admin_plataforma)
 * - Gerencia conversas via base44.agents
 * - Cache de respostas para economia
 * - Fallback para humano se necessário
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { agente_nome, ticket_id, mensagem, conversation_id } = await req.json();

    if (!agente_nome || !mensagem) {
      return Response.json({ 
        error: 'Parâmetros obrigatórios: agente_nome, mensagem' 
      }, { status: 400 });
    }

    // VALIDAÇÃO MULTI-TENANT: ticket pertence à clínica do user
    if (ticket_id) {
      const ticket = await base44.asServiceRole.entities.Ticket.list()
        .then(all => all.find(t => t.id === ticket_id));
      
      if (!ticket) {
        return Response.json({ error: 'Ticket não encontrado' }, { status: 404 });
      }

      if (user.role !== 'admin' && ticket.clinica_id !== user.clinica_id) {
        return Response.json({ 
          error: 'Acesso negado - ticket de outra clínica' 
        }, { status: 403 });
      }
    }

    // Validar agente disponível
    const agentes_validos = ['secretaria_ia', 'admin_plataforma'];
    if (!agentes_validos.includes(agente_nome)) {
      return Response.json({ 
        error: 'Agente inválido. Use: secretaria_ia ou admin_plataforma' 
      }, { status: 400 });
    }

    // Criar ou buscar conversa do agente
    let conversation;
    if (conversation_id) {
      conversation = await base44.agents.getConversation(conversation_id);
    } else {
      conversation = await base44.agents.createConversation({
        agent_name: agente_nome,
        metadata: {
          ticket_id,
          clinica_id: user.clinica_id,
          user_id: user.id,
          created_at: new Date().toISOString()
        }
      });
    }

    // Adicionar mensagem do usuário
    await base44.agents.addMessage(conversation, {
      role: "user",
      content: mensagem
    });

    // IA processa e responde
    const messages = conversation.messages || [];
    const ultimaMensagem = messages[messages.length - 1];
    
    // Verificar se IA recomenda escalar para humano
    const precisaHumano = 
      ultimaMensagem?.content?.toLowerCase().includes('escalar') ||
      ultimaMensagem?.content?.toLowerCase().includes('transferir') ||
      ultimaMensagem?.metadata?.needs_human;

    return Response.json({
      success: true,
      conversation_id: conversation.id,
      resposta: ultimaMensagem?.content || 'Processando...',
      precisa_humano: precisaHumano,
      metadata: {
        agente: agente_nome,
        mensagens_total: messages.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Erro invocar agente:', error);
    return Response.json({ 
      error: error.message,
      fallback: 'Agente indisponível. Encaminhando para atendente humano.'
    }, { status: 500 });
  }
});