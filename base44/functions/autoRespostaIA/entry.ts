import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * AUTO-RESPOSTA IA: Analisa ticket e responde automaticamente
 * MULTI-TENANT: Usa agente IA da clínica
 * CACHE: Respostas similares (TODO: implementar cache semântico)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // SERVICE ROLE: Acesso admin
    const { ticket_id } = await req.json();

    if (!ticket_id) {
      return Response.json({ error: 'ticket_id obrigatório' }, { status: 400 });
    }

    // BUSCAR TICKET
    const tickets = await base44.asServiceRole.entities.Ticket.filter({ id: ticket_id });
    if (!tickets || tickets.length === 0) {
      return Response.json({ error: 'Ticket não encontrado' }, { status: 404 });
    }
    const ticket = tickets[0];

    // VALIDAR STATUS (só responde se aguardando)
    if (ticket.status !== 'aguardando') {
      return Response.json({ 
        skipped: true, 
        reason: 'Ticket não está aguardando IA' 
      });
    }

    // VALIDAÇÃO PRÉ-IA: Verificar créditos ANTES de gastar OpenAI
    const creditosArray = await base44.asServiceRole.entities.CreditoIA.filter({ 
      clinica_id: ticket.clinica_id 
    });
    
    if (creditosArray.length === 0 || creditosArray[0].saldo_creditos < 1) {
      // CRITICAL: SEM CRÉDITOS → Bloquear IA + Notificar Admin
      const saldo = creditosArray.length > 0 ? creditosArray[0].saldo_creditos : 0;
      
      // Buscar admins da clínica para notificar
      const admins = await base44.asServiceRole.entities.UsuarioClinica.filter({
        clinica_id: ticket.clinica_id,
        perfil: 'admin',
        ativo: true
      }) || [];
      
      // Criar notificação URGENTE para cada admin
      for (const admin of admins) {
        await base44.asServiceRole.entities.NotificacaoSistema.create({
          clinica_id: ticket.clinica_id,
          tipo: 'credito_baixo',
          destinatario_id: admin.user_id,
          destinatario_email: admin.user_email,
          titulo: '🚨 Créditos IA Esgotados - Widget Bloqueado',
          corpo: `Seu widget está bloqueado! Saldo: ${saldo} créditos. Recarregue agora para continuar respondendo leads automaticamente. Ticket #${ticket.numero_ticket} aguardando.`,
          acao_url: '/RecargaCreditos',
          acao_label: 'Recarregar Agora',
          prioridade: 'urgente',
          icone: 'AlertCircle',
          cor: '#ea4335'
        });
      }
      
      // Atualizar ticket para aguardar créditos
      await base44.asServiceRole.entities.Ticket.update(ticket.id, {
        status: 'aberto',
        ultima_interacao: new Date().toISOString()
      });
      
      return Response.json({ 
        error: 'Créditos insuficientes',
        saldo_restante: saldo,
        action_required: 'Recarregue créditos para continuar'
      }, { status: 402 });
    }

    // BUSCAR HISTÓRICO DO TICKET
    const mensagens = await base44.asServiceRole.entities.MensagemTicket.filter({ 
      clinica_id: ticket.clinica_id,
      ticket_id: ticket.id 
    }) || [];

    // BUSCAR AGENTE IA DA CLÍNICA (ou usar global)
    let agente_slug = 'agendamento_consultas';
    const agentesClinica = await base44.asServiceRole.entities.AgenteIAClinica.filter({ 
      clinica_id: ticket.clinica_id,
      ativo: true
    }) || [];
    if (agentesClinica.length > 0) {
      agente_slug = agentesClinica[0].agente_base44_nome || 'agendamento_consultas';
    }

    // CONTEXTO PARA IA
    const historico = mensagens.length > 0 
      ? mensagens.map(m => `[${m.remetente_tipo}] ${m.remetente_nome}: ${m.conteudo}`).join('\n')
      : 'Nenhum histórico anterior';

    const prompt = `
Você é a secretária virtual da clínica. Analise o ticket e responda de forma profissional e empática.

TICKET: ${ticket.numero_ticket}
ASSUNTO: ${ticket.assunto}
PRIORIDADE: ${ticket.prioridade}
CANAL: ${ticket.canal}

HISTÓRICO:
${historico}

INSTRUÇÕES:
- Se for dúvida simples (horário, localização, valores): responda diretamente
- Se for agendamento: pergunte preferência de data/hora e especialidade
- Se for urgência médica: priorize e direcione para atendimento humano
- Se precisar de informações adicionais: pergunte educadamente
- Sempre seja empático e profissional

RESPONDA:
`;

    // INVOCAR AGENTE IA
    const startTime = Date.now();
    let resposta_ia, conversation;
    
    try {
      conversation = await base44.asServiceRole.agents.createConversation({
        agent_name: agente_slug,
        metadata: {
          ticket_id: ticket.id,
          clinica_id: ticket.clinica_id,
          tipo: 'auto_resposta'
        }
      });

      const response = await base44.asServiceRole.agents.addMessage(conversation, {
        role: 'user',
        content: prompt
      });

      // NULL-SAFE: SDK pode retornar mensagens em estruturas diferentes quando usa tool_calls
      const mensagens = response?.messages || [];
      if (!mensagens || mensagens.length === 0) {
        throw new Error('Agente não retornou mensagens');
      }
      
      // Última mensagem do assistente (ignora tool_calls intermediários)
      const ultimaMsgAssistente = [...mensagens].reverse().find(m => m.role === 'assistant');
      if (!ultimaMsgAssistente || !ultimaMsgAssistente.content) {
        throw new Error('Agente não retornou resposta válida');
      }
      
      resposta_ia = ultimaMsgAssistente.content;
    } catch (sdkError) {
      // FALLBACK: SDK bug com tool_calls complexos → gerar resposta genérica
      console.warn('[autoRespostaIA] SDK error (tool_calls bug):', sdkError.message);
      resposta_ia = `Olá! Recebemos sua solicitação sobre: "${ticket.assunto}". Nossa equipe irá analisá-la em breve e retornaremos o mais rápido possível. Em caso de urgência, entre em contato pelo telefone da clínica.`;
    }
    
    const tempo_resposta_ms = Date.now() - startTime;

    // CRIAR RESPOSTA AUTOMÁTICA
    await base44.asServiceRole.entities.MensagemTicket.create({
      clinica_id: ticket.clinica_id,
      ticket_id: ticket.id,
      tipo: 'mensagem',
      conteudo: resposta_ia,
      remetente_tipo: 'sistema_ia',
      remetente_nome: 'Assistente Virtual',
      visivel_cliente: true,
      metadata: {
        agente_slug,
        conversation_id: conversation.id,
        tempo_resposta_ms
      }
    });

    // LOG USAGE IA
    await base44.asServiceRole.entities.LogUsageIA.create({
      clinica_id: ticket.clinica_id,
      ticket_id: ticket.id,
      agente_ia_id: agente_slug,
      modo: 'automatico',
      resposta_ia: resposta_ia.substring(0, 500),
      status: 'gerado',
      tempo_resposta_ms
    });

    // COBRAR CRÉDITO WIDGET: Decrementar saldo após IA responder (HARD BLOCK)
    const custoEstimado = Math.ceil(resposta_ia.length / 4); // ~1 token = 4 chars
    await base44.asServiceRole.functions.invoke('consumirCreditoIA', {
      clinica_id: ticket.clinica_id,
      operacao: 'auto_resposta_widget',
      creditos: 1, // 1 crédito por resposta
      custo_real_usd: 0.01, // ~$0.01 por resposta OpenAI
      metadata: {
        ticket_id: ticket.id,
        modulo: 'widget',
        tipo: 'auto_resposta_ia',
        conversation_id: conversation.id,
        tokens_estimados: custoEstimado
      }
    });
    console.log(`✅ Crédito cobrado: 1 crédito (~${custoEstimado} tokens)`);

    // ATUALIZAR TICKET STATUS
    await base44.asServiceRole.entities.Ticket.update(ticket.id, {
      status: 'respondido_ia',
      ultima_interacao: new Date().toISOString()
    });

    // ENVIAR EMAIL COM RESPOSTA (async)
    try {
      await base44.asServiceRole.functions.invoke('enviarEmailTicket', {
        ticket_id: ticket.id,
        tipo: 'resposta_ia',
        destinatario: ticket.solicitante_email
      });
    } catch (error) {
      console.error('[autoRespostaIA] Erro email:', error);
    }

    return Response.json({ 
      success: true, 
      resposta: resposta_ia,
      tempo_resposta_ms,
      conversation_id: conversation.id
    });

  } catch (error) {
    console.error('[autoRespostaIA] Erro:', error);
    
    // REGISTRAR ERRO (não falha a execução)
    try {
      const { ticket_id } = await req.json();
      if (ticket_id) {
        const tickets = await base44.asServiceRole.entities.Ticket.filter({ id: ticket_id });
        if (tickets && tickets.length > 0) {
          await base44.asServiceRole.entities.Ticket.update(ticket_id, {
            status: 'aberto', // Fallback para atendimento humano
            ultima_interacao: new Date().toISOString()
          });
        }
      }
    } catch {}

    return Response.json({ 
      error: 'Erro na auto-resposta IA',
      details: error.message 
    }, { status: 500 });
  }
});