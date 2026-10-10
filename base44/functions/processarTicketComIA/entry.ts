import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ticket_id, modo, forcar_resposta } = await req.json();

    if (!ticket_id) {
      return Response.json({ error: 'ticket_id obrigatório' }, { status: 400 });
    }

    // Buscar ticket
    const ticket = await base44.entities.Ticket.filter({ id: ticket_id });
    if (!ticket.length) {
      return Response.json({ error: 'Ticket não encontrado' }, { status: 404 });
    }

    const ticketData = ticket[0];
    const clinicaId = ticketData.clinica_id;

    // Buscar agente IA da clínica
    const agentes = await base44.entities.AgenteIAClinica.filter({
      clinica_id: clinicaId,
      ativo: true
    });

    if (!agentes.length) {
      return Response.json({ 
        error: 'IA não configurada para esta clínica',
        fallback: true 
      }, { status: 404 });
    }

    const agente = agentes[0];

    // Buscar FAQs do agente
    const faqs = await base44.entities.FAQ.filter({
      clinica_id: clinicaId,
      ativo: true
    });

    // Buscar histórico de mensagens do ticket
    const mensagens = await base44.entities.MensagemTicket.filter({
      ticket_id: ticket_id
    }, '-created_date', 10);

    const historico = mensagens.map(m => 
      `${m.remetente_tipo === 'cliente' ? 'Cliente' : 'Atendente'}: ${m.conteudo}`
    ).reverse().join('\n');

    // Montar prompt
    const promptIA = `Você é ${agente.nome_agente}, assistente virtual da clínica.

TICKET #${ticket_id}
Status: ${ticketData.status}
Prioridade: ${ticketData.prioridade}
Assunto: ${ticketData.assunto || 'Não informado'}

HISTÓRICO DA CONVERSA:
${historico}

ÚLTIMA MENSAGEM DO CLIENTE:
${ticketData.ultima_mensagem || ticketData.descricao}

BASE DE CONHECIMENTO:
${faqs.map((f, i) => `${i + 1}. ${f.pergunta}\n   → ${f.resposta}`).join('\n\n')}

INSTRUÇÕES:
- Responda de forma profissional, empática e objetiva
- Use a base de conhecimento quando aplicável
- Se não souber, diga: "Vou transferir para um atendente humano"
- Nunca invente informações
- Seja direto e resolva o problema

Sua resposta:`;

    // Invocar LLM + TRACKING CONSUMO
    const inicio = Date.now();
    const respostaIA = await base44.integrations.Core.InvokeLLM({
      prompt: promptIA,
      add_context_from_internet: false
    });
    const latencia = Date.now() - inicio;

    // FASE 6: REGISTRAR CONSUMO OPENAI
    const tokens = Math.ceil((promptIA.length + respostaIA.length) / 4); // Aproximação
    try {
      await base44.asServiceRole.functions.invoke('registrarConsumoOpenAI', {
        clinica_id: clinicaId,
        tokens,
        tipo: 'ticket_ia'
      });
    } catch (errConsumo) {
      console.error('[ProcessarTicketIA] Erro ao registrar consumo:', errConsumo);
    }

    // Log de uso
    const log = await base44.entities.LogUsageIA.create({
      clinica_id: clinicaId,
      ticket_id: ticket_id,
      agente_ia_id: agente.id,
      modo: modo || 'sugestao',
      prompt_enviado: promptIA.slice(0, 500),
      resposta_ia: respostaIA,
      status: 'gerado',
      aceito: null,
      tempo_resposta_ms: Date.now()
    });

    // Modo automático: responder direto
    if (modo === 'automatico' || forcar_resposta) {
      // Criar mensagem automática
      await base44.entities.MensagemTicket.create({
        ticket_id: ticket_id,
        clinica_id: clinicaId,
        remetente_tipo: 'sistema',
        remetente_nome: agente.nome_agente,
        conteudo: respostaIA,
        tipo: 'resposta_ia'
      });

      // Atualizar ticket + SOLICITAR CSAT
      await base44.entities.Ticket.update(ticket_id, {
        status: 'respondido_ia',
        ultima_mensagem: respostaIA,
        updated_date: new Date().toISOString(),
        csat_solicitado: true // Flag para modal CSAT
      });

      // Incrementar contador
      await base44.entities.AgenteIAClinica.update(agente.id, {
        total_interacoes: (agente.total_interacoes || 0) + 1
      });

      return Response.json({
        success: true,
        modo: 'automatico',
        resposta: respostaIA,
        ticket_atualizado: true
      });
    }

    // Modo sugestão: apenas retornar para atendente decidir
    return Response.json({
      success: true,
      modo: 'sugestao',
      resposta: respostaIA,
      ticket_id: ticket_id,
      log_id: log.id
    });

  } catch (error) {
    console.error('Erro processarTicketComIA:', error);
    
    // Fallback: escalar para humano
    if (req.json?.ticket_id) {
      try {
        await base44.entities.Ticket.update(req.json.ticket_id, {
          status: 'aguardando',
          observacoes: `IA falhou: ${error.message}. Escalado para atendente humano.`
        });
      } catch {}
    }

    return Response.json({ 
      error: error.message,
      fallback: true,
      escalado_para_humano: true
    }, { status: 500 });
  }
});