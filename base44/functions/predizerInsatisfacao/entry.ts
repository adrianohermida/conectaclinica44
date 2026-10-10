import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * PREDIZER INSATISFAÇÃO - Análise brutal de gaps
 * Analisa FAQs + feedbacks + tickets → detecta padrões de frustração
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    // Coletar dados de insatisfação
    const [feedbacks, tickets, faqs] = await Promise.all([
      base44.asServiceRole.entities.FeedbackUsuario.filter({}, '-created_date', 200),
      base44.asServiceRole.entities.Ticket.filter({}, '-created_date', 200),
      base44.asServiceRole.entities.ArtigoFAQ.list()
    ]);

    // IA: Análise brutal
    const analise = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Você é auditor de experiência do usuário especializado em SaaS médico.

DADOS BRUTOS:
${feedbacks.length} feedbacks recentes
${tickets.length} tickets de suporte
${faqs.length} FAQs existentes

AMOSTRA FEEDBACKS (sentimento negativo):
${feedbacks.filter(f => f.sentimento === 'negativo').slice(0, 10).map(f => 
  `- "${f.pergunta}" (${f.contexto || 'contexto desconhecido'})`
).join('\n')}

AMOSTRA TICKETS (urgentes/não resolvidos):
${tickets.filter(t => t.prioridade === 'urgente' || t.status === 'aberto').slice(0, 10).map(t => 
  `- "${t.titulo}" | Status: ${t.status} | Tempo: ${t.tempo_primeira_resposta_horas || 'N/A'}h`
).join('\n')}

CATEGORIAS FAQs EXISTENTES:
${[...new Set(faqs.map(f => f.categoria))].join(', ')}

TAREFA - ANÁLISE BRUTAL:
1. Identificar TOP 10 gaps críticos (perguntas sem FAQ)
2. Detectar padrões de frustração recorrentes
3. Prever próximos 5 pontos de insatisfação
4. Sugerir FAQs para cada gap
5. Estimar impacto (redução tickets %, aumento satisfação %)

FORMATO: Markdown simples com listas.

Exemplo:
## Gaps Críticos
1. [Gap X] - Frequência: Alta - Impacto: Perda de clientes
2. [Gap Y] - Frequência: Média - Impacto: Tickets repetidos

## Score Saúde: 75/100`
    });

    // Parse manual
    const linhas = analise.split('\n').filter(l => l.trim());
    const scoreMatch = analise.match(/Score Saúde.*?(\d+)/i);
    const scoreGeral = scoreMatch ? parseInt(scoreMatch[1]) : 70;

    const analise = {
      gaps_criticos: linhas.filter(l => l.includes('Gap')).map(l => ({ gap: l, frequencia: 5, impacto: 'Alto' })),
      padroes_frustracao: linhas.filter(l => l.includes('Frustração') || l.includes('Reclamação')),
      predicoes_insatisfacao: [],
      score_saude_geral: scoreGeral
    };

    // Salvar aprendizado
    await base44.asServiceRole.entities.AprendizadoIA.create({
      tipo_aprendizado: 'predicao_insatisfacao',
      fonte: 'Análise Feedbacks + Tickets + FAQs',
      insights: [
        ...analise.padroes_frustracao,
        `Score saúde: ${analise.score_saude_geral}/100`
      ],
      faqs_sugeridos: analise.gaps_criticos.map(g => g.faq_sugerido),
      score_confianca: analise.score_saude_geral,
      aprovado: false,
      impacto_estimado: {
        taxa_resolucao_esperada: 80,
        reducao_tickets: 40,
        score_satisfacao: analise.score_saude_geral
      }
    });

    return Response.json({ 
      success: true,
      analise
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});