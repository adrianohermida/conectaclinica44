import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Analisa conversas do widget para identificar:
 * - Gargalos de atendimento
 * - Perguntas sem resposta (gaps FAQ)
 * - Objeções não resolvidas
 * - Oportunidades de melhoria
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { periodo_dias = 7, limite = 100 } = await req.json();

    // Buscar conversas não analisadas
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - periodo_dias);

    const conversas = await base44.asServiceRole.entities.ConversaWidget.filter({
      analisado_por_ia: false,
      created_date: { $gte: dataLimite.toISOString() }
    }, '-created_date', limite);

    if (conversas.length === 0) {
      return Response.json({ message: 'Nenhuma conversa pendente de análise', total: 0 });
    }

    // Análise agregada
    const analise = {
      total_conversas: conversas.length,
      taxa_conversao: calcularTaxaConversao(conversas),
      tempo_medio_conversa: calcularTempoMedio(conversas),
      gargalos: identificarGargalos(conversas),
      gaps_faq: identificarGapsFAQ(conversas),
      objecoes_nao_resolvidas: identificarObjecoesNaoResolvidas(conversas),
      sugestoes_melhoria: []
    };

    // Gerar sugestões com IA
    const prompt = `Analise os seguintes dados de conversas e sugira melhorias concretas:

**MÉTRICAS:**
- Taxa de conversão: ${analise.taxa_conversao}%
- Tempo médio: ${analise.tempo_medio_conversa}s
- Gargalos: ${JSON.stringify(analise.gargalos)}
- Gaps FAQ: ${JSON.stringify(analise.gaps_faq)}
- Objeções não resolvidas: ${JSON.stringify(analise.objecoes_nao_resolvidas)}

**TAREFA:**
1. Identifique os 3 maiores problemas
2. Sugira melhorias específicas e acionáveis
3. Priorize por impacto em conversão

Retorne JSON:
{
  "problemas_criticos": [...],
  "sugestoes": [...],
  "faqs_sugeridos": [...],
  "script_improvements": [...]
}`;

    const sugestoes = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          problemas_criticos: { type: 'array', items: { type: 'string' } },
          sugestoes: { type: 'array', items: { type: 'object' } },
          faqs_sugeridos: { type: 'array', items: { type: 'object' } },
          script_improvements: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    analise.sugestoes_melhoria = sugestoes;

    // Criar FAQs sugeridos automaticamente
    for (const faq of sugestoes.faqs_sugeridos || []) {
      await base44.asServiceRole.entities.ArtigoFAQ.create({
        secao: 'comercial',
        categoria: 'geral',
        pergunta: faq.pergunta,
        resposta: faq.resposta,
        resposta_curta: faq.resposta_curta || faq.resposta.substring(0, 150),
        tags: faq.tags || [],
        aprovado: false,
        origem: 'ia_sugerida',
        sugerido_por_ia: {
          data_analise: new Date().toISOString(),
          conversas_analisadas: conversas.length
        }
      });
    }

    // Marcar conversas como analisadas
    for (const conversa of conversas) {
      await base44.asServiceRole.entities.ConversaWidget.update(conversa.id, {
        analisado_por_ia: true,
        insights_gerados: sugestoes.problemas_criticos
      });
    }

    // Salvar insights no AprendizadoIA
    await base44.asServiceRole.entities.AprendizadoIA.create({
      tipo_aprendizado: 'gap_analysis',
      fonte: 'widget_conversas',
      insights: sugestoes.problemas_criticos,
      faqs_sugeridos: sugestoes.faqs_sugeridos || [],
      score_confianca: 85,
      aprovado: false,
      aplicado: false,
      impacto_estimado: {
        taxa_resolucao_esperada: analise.taxa_conversao + 15,
        reducao_tickets: 30,
        score_satisfacao: 4.5
      }
    });

    return Response.json({
      success: true,
      analise,
      faqs_criados: sugestoes.faqs_sugeridos?.length || 0,
      conversas_analisadas: conversas.length
    });

  } catch (error) {
    console.error('Erro ao analisar conversas:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calcularTaxaConversao(conversas) {
  const convertidas = conversas.filter(c => c.resultado === 'converteu').length;
  return ((convertidas / conversas.length) * 100).toFixed(2);
}

function calcularTempoMedio(conversas) {
  const tempos = conversas.map(c => c.tempo_total_conversa_seg || 0);
  return Math.round(tempos.reduce((a, b) => a + b, 0) / conversas.length);
}

function identificarGargalos(conversas) {
  const gargalos = [];
  
  // Abandono em etapa específica
  const abandonos = conversas.filter(c => c.resultado === 'abandonou');
  if (abandonos.length > conversas.length * 0.3) {
    gargalos.push({
      tipo: 'alto_abandono',
      percentual: ((abandonos.length / conversas.length) * 100).toFixed(2),
      descricao: 'Taxa de abandono acima de 30%'
    });
  }

  // Latência alta
  const conversasLentas = conversas.filter(c => c.tempo_resposta_media_ms > 3000);
  if (conversasLentas.length > conversas.length * 0.2) {
    gargalos.push({
      tipo: 'latencia_alta',
      percentual: ((conversasLentas.length / conversas.length) * 100).toFixed(2),
      descricao: 'Respostas lentas (>3s) em mais de 20% das conversas'
    });
  }

  return gargalos;
}

function identificarGapsFAQ(conversas) {
  const todasPerguntas = conversas.flatMap(c => c.perguntas_sem_resposta || []);
  const perguntasMap = {};
  todasPerguntas.forEach(p => {
    perguntasMap[p] = (perguntasMap[p] || 0) + 1;
  });
  
  return Object.entries(perguntasMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([pergunta, count]) => ({ pergunta, frequencia: count }));
}

function identificarObjecoesNaoResolvidas(conversas) {
  const todasObjecoes = conversas.flatMap(c => c.objecoes_registradas || []);
  const naoResolvidas = todasObjecoes.filter(obj => !obj.resolveu);
  
  const objecoesMap = {};
  naoResolvidas.forEach(obj => {
    objecoesMap[obj.objecao] = (objecoesMap[obj.objecao] || 0) + 1;
  });
  
  return Object.entries(objecoesMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([objecao, count]) => ({ objecao, frequencia: count }));
}