import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * BUSCAR MENSAGENS - Service role (sem auth)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { conversation_id } = await req.json();

    if (!conversation_id) {
      return Response.json({ error: 'conversation_id obrigatório' }, { status: 400 });
    }

    console.log('[buscarMensagensPublica] Buscando:', conversation_id);

    // Buscar como service role
    const conversation = await base44.asServiceRole.agents.getConversation(conversation_id);

    console.log('[buscarMensagensPublica] Total mensagens:', conversation.messages?.length || 0);

    return Response.json({
      success: true,
      messages: conversation.messages || []
    });

  } catch (error) {
    console.error('[buscarMensagensPublica] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});