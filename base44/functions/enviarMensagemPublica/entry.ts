import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * ENVIAR MENSAGEM - Service role (sem auth)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { conversation_id, message } = await req.json();

    if (!conversation_id || !message) {
      return Response.json({ error: 'conversation_id e message obrigatórios' }, { status: 400 });
    }

    console.log('[enviarMensagemPublica] Enviando para:', conversation_id);

    // Buscar conversa (necessário aqui pois só temos o ID)
    const conversation = await base44.asServiceRole.agents.getConversation(conversation_id);
    
    // WORKAROUND: SDK.getConversation não retorna messages[] → adicionar manualmente
    if (!conversation.messages) {
      conversation.messages = [];
    }

    // Enviar como service role
    await base44.asServiceRole.agents.addMessage(
      conversation,
      {
        role: 'user',
        content: message
      }
    );

    console.log('[enviarMensagemPublica] Mensagem enviada');

    return Response.json({ success: true });

  } catch (error) {
    console.error('[enviarMensagemPublica] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});