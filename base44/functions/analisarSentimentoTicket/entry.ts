import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Analisa sentimento e urgência de um ticket
 * Prioriza atendimento automaticamente baseado em emoção detectada
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ticket_id } = await req.json();

    if (!ticket_id) {
      return Response.json({ error: 'ticket_id obrigatório' }, { status: 400 });
    }

    // Buscar ticket
    const tickets = await base44.entities.Ticket.filter({ id: ticket_id });
    if (!tickets.length) {
      return Response.json({ error: 'Ticket não encontrado' }, { status: 404 });
    }

    const ticket = tickets[0];

    // Multi-tenant validation
    if (user.role !== 'admin' && ticket.clinica_id !== user.clinica_id) {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Buscar mensagens do ticket
    const mensagens = await base44.entities.MensagemTicket.filter(
      { ticket_id: ticket.id },
      'created_date'
    );

    if (!mensagens.length) {
      return Response.json({ 
        sentimento: 'neutro',
        confianca: 0.5,
        urgencia_score: 50,
        motivo: 'Sem mensagens para análise'
      });
    }

    // Concatenar mensagens do cliente (não da equipe)
    const mensagensCliente = mensagens
      .filter(m => m.remetente_tipo !== 'equipe')
      .map(m => m.conteudo)
      .join('\n\n');

    if (!mensagensCliente.trim()) {
      return Response.json({ 
        sentimento: 'neutro',
        confianca: 0.5,
        urgencia_score: 50,
        motivo: 'Apenas mensagens internas'
      });
    }

    const prompt = `Analise o sentimento e urgência desta conversa de suporte:

TICKET: ${ticket.assunto}
Categoria: ${ticket.categoria}
Prioridade atual: ${ticket.prioridade}

MENSAGENS DO CLIENTE:
${mensagensCliente}

TAREFA: Classifique sentimento, urgência e risco de churn.

REGRAS:
- Sentimento: positivo, neutro, negativo, frustrado, urgente
- Urgência (0-100): 0=pode esperar, 100=crítico imediato
- Detectar: palavras de raiva, desespero, ameaça legal, cancelamento
- Se categoria=reclamacao → elevar urgência automaticamente
- Se mencionar "processo", "advogado", "cancelar" → crítico

Responda APENAS JSON:
{
  "sentimento": "string",
  "confianca": 0.0-1.0,
  "urgencia_score": 0-100,
  "palavras_chave": ["array"],
  "risco_churn": "baixo|medio|alto|critico",
  "recomendacao_prioridade": "baixa|media|alta|urgente",
  "motivo": "explicação breve"
}`;

    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false,
      response_json_schema: {
        type: "object",
        properties: {
          sentimento: { type: "string" },
          confianca: { type: "number" },
          urgencia_score: { type: "number" },
          palavras_chave: { type: "array", items: { type: "string" } },
          risco_churn: { type: "string" },
          recomendacao_prioridade: { type: "string" },
          motivo: { type: "string" }
        }
      }
    });

    const analise = llmResponse.response || {};

    // Auto-ajustar prioridade se crítico
    if (analise.urgencia_score >= 80 && ticket.prioridade !== 'urgente') {
      await base44.asServiceRole.entities.Ticket.update(ticket.id, {
        prioridade: 'urgente',
        tags: [...(ticket.tags || []), 'auto_escalado_ia']
      });

      // Nota de escalação automática
      await base44.asServiceRole.entities.NotaInterna.create({
        clinica_id: ticket.clinica_id,
        ticket_id: ticket.id,
        autor_id: 'system',
        autor_nome: 'Sistema IA',
        tipo: 'alerta',
        conteudo: `⚠️ ESCALAÇÃO AUTOMÁTICA: Sentimento ${analise.sentimento} detectado (urgência ${analise.urgencia_score}/100). Risco churn: ${analise.risco_churn}. Motivo: ${analise.motivo}`,
        visivel_apenas_equipe: true
      });
    }

    // Tracking analytics
    await base44.asServiceRole.entities.MetricasIA.create({
      clinica_id: ticket.clinica_id,
      tipo_operacao: 'analise_sentimento',
      ticket_id: ticket.id,
      resultado: analise.sentimento,
      confianca: analise.confianca,
      metadata: {
        urgencia_score: analise.urgencia_score,
        risco_churn: analise.risco_churn,
        palavras_chave: analise.palavras_chave
      }
    }).catch(() => {});

    return Response.json({
      success: true,
      ...analise,
      auto_escalado: analise.urgencia_score >= 80
    });

  } catch (error) {
    console.error('Erro analisarSentimentoTicket:', error);
    return Response.json({ 
      success: false,
      error: error.message,
      sentimento: 'neutro',
      confianca: 0,
      urgencia_score: 50
    }, { status: 200 });
  }
});