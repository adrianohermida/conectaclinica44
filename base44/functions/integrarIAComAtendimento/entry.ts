import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * INTEGRAR IA COM ATENDIMENTO - Auto-resposta em tickets
 * FASE 2: Implementação da integração crítica Atendimento ↔ IA
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !user.clinica_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ticket_id, tipo } = await req.json();

    if (!ticket_id) {
      return Response.json({ error: 'ticket_id obrigatório' }, { status: 400 });
    }

    // Buscar ticket
    const tickets = await base44.asServiceRole.entities.Ticket.filter({
      id: ticket_id,
      clinica_id: user.clinica_id
    });

    if (tickets.length === 0) {
      return Response.json({ error: 'Ticket não encontrado' }, { status: 404 });
    }

    const ticket = tickets[0];

    // Buscar agente IA da clínica
    const agentes = await base44.asServiceRole.entities.AgenteIAClinica.filter({
      clinica_id: user.clinica_id,
      ativo: true
    });

    if (agentes.length === 0) {
      return Response.json({ error: 'Secretária IA não configurada' }, { status: 404 });
    }

    const agente = agentes[0];

    // Buscar histórico do ticket
    const mensagens = await base44.asServiceRole.entities.MensagemTicket.filter({
      ticket_id: ticket.id
    }, 'created_date', 50);

    const contexto = mensagens.map(m => 
      `${m.remetente_nome}: ${m.conteudo}`
    ).join('\n');

    // Gerar resposta via IA
    const prompt = `Você é ${agente.nome_agente}, assistente virtual de clínica médica.
Personalidade: ${agente.personalidade}

${agente.instrucoes_customizadas || ''}

Base de conhecimento:
${(agente.base_conhecimento_ids || []).map(faq => `${faq.pergunta}\n${faq.resposta}`).join('\n\n')}

Histórico da conversa:
${contexto}

Última mensagem: ${ticket.ultima_mensagem}

Gere uma resposta ${tipo === 'sugestao' ? 'sugerida para o atendente' : 'automática para o paciente'}:`;

    const respostaIA = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false
    });

    // Log do consumo
    await base44.asServiceRole.entities.ConsumoWidgetIA.create({
      clinica_id: user.clinica_id,
      session_id: ticket.session_id || ticket.id,
      visitante_id: ticket.email,
      tipo_consumo: tipo === 'sugestao' ? 'sugestao_resposta' : 'auto_resposta',
      prompt_enviado: prompt,
      tokens_total: 500, // Estimado
      creditos_consumidos: 0.5,
      modelo_llm: 'gpt-4o-mini',
      sucesso: true,
      origem: 'atendimento_interno'
    });

    // Se auto-resposta, enviar mensagem
    if (tipo === 'auto_resposta' && ticket.status === 'aguardando') {
      await base44.asServiceRole.entities.MensagemTicket.create({
        ticket_id: ticket.id,
        clinica_id: user.clinica_id,
        remetente_tipo: 'ia',
        remetente_nome: agente.nome_agente,
        conteudo: respostaIA,
        timestamp: new Date().toISOString()
      });

      await base44.asServiceRole.entities.Ticket.update(ticket.id, {
        status: 'respondido_ia',
        ultima_mensagem: respostaIA,
        respondido_por_ia: true,
        updated_date: new Date().toISOString()
      });
    }

    return Response.json({
      resposta: respostaIA,
      tokens_consumidos: 500,
      creditos_debitados: 0.5
    });
  } catch (error) {
    console.error('[integrarIAComAtendimento] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});