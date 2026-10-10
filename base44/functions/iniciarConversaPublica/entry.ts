import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * PÚBLICO: Cria conversa com agendamento_consultas sem autenticação
 * Retorna conversation_id + primeira mensagem
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    console.log('[iniciarConversaPublica] Criando conversa via service role...');

    // Criar conversa como SERVICE ROLE (sem auth)
    const conversation = await base44.asServiceRole.agents.createConversation({
      agent_name: 'agendamento_consultas',
      metadata: {
        tipo: 'publico',
        origem: 'widget_site',
        url: req.headers.get('referer') || 'unknown',
        user_agent: req.headers.get('user-agent'),
        timestamp: new Date().toISOString()
      }
    });

    console.log('[iniciarConversaPublica] Conversa criada:', conversation.id);

    // BUG SDK: createConversation NÃO retorna messages[] mas addMessage EXIGE
    // WORKAROUND: Injetar manualmente antes de chamar addMessage
    if (!conversation.messages) {
      conversation.messages = [];
    }

    // Enviar primeira mensagem
    await base44.asServiceRole.agents.addMessage(
      conversation,
      {
        role: 'user',
        content: 'Olá'
      }
    );

    console.log('[iniciarConversaPublica] Primeira mensagem enviada. Agente vai responder.');

    return Response.json({ 
      success: true,
      conversation_id: conversation.id
    });

  } catch (error) {
    console.error('[iniciarConversaPublica] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});