import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * TESTE E2E: Widget → Agente → Resposta
 * Simula exatamente o que o widget faz
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    console.log('[testarAgentePublico] STEP 1: Criando conversa como SERVICE ROLE...');

    // EXATAMENTE como o widget faz
    const conversation = await base44.asServiceRole.agents.createConversation({
      agent_name: 'agendamento_consultas',
      metadata: {
        tipo: 'teste_e2e',
        origem: 'function_diagnostico',
        timestamp: new Date().toISOString()
      }
    });

    console.log('[testarAgentePublico] ✅ Conversa criada:', conversation.id);

    console.log('[testarAgentePublico] STEP 2: Enviando mensagem inicial...');

    // Enviar primeira mensagem
    await base44.asServiceRole.agents.addMessage(
      { id: conversation.id },
      {
        role: 'user',
        content: 'Olá'
      }
    );

    console.log('[testarAgentePublico] ✅ Mensagem enviada');

    // Aguardar 2s para agente processar
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('[testarAgentePublico] STEP 3: Buscando resposta do agente...');

    // Buscar conversa atualizada
    const conversaAtualizada = await base44.asServiceRole.agents.getConversation(conversation.id);

    console.log('[testarAgentePublico] ✅ Conversa atualizada:', {
      total_mensagens: conversaAtualizada.messages?.length || 0,
      mensagens: conversaAtualizada.messages
    });

    const respostaAgente = conversaAtualizada.messages?.find(m => m.role === 'assistant');

    if (!respostaAgente) {
      return Response.json({
        success: false,
        error: 'Agente não respondeu',
        conversation_id: conversation.id,
        messages: conversaAtualizada.messages
      }, { status: 500 });
    }

    return Response.json({
      success: true,
      conversation_id: conversation.id,
      resposta_agente: respostaAgente.content,
      tempo_resposta: '< 2s',
      diagnostico: 'Widget deve funcionar normalmente'
    });

  } catch (error) {
    console.error('[testarAgentePublico] ❌ ERRO:', error);
    return Response.json({ 
      success: false,
      error: error.message,
      stack: error.stack,
      diagnostico: 'Widget vai quebrar com este erro'
    }, { status: 500 });
  }
});