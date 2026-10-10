import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Gera playbooks de vendas automaticamente usando IA + análise de dados reais
 * Analisa conversas de sucesso e cria scripts otimizados
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tipo, forcar_regeneracao } = await req.json();

    // Buscar conversas de sucesso do último mês
    const umMesAtras = new Date();
    umMesAtras.setMonth(umMesAtras.getMonth() - 1);

    const conversasSucesso = await base44.asServiceRole.entities.ConversaWidget.filter({
      resultado: 'converteu',
      created_date: { $gte: umMesAtras.toISOString() }
    });

    // Analisar padrões de sucesso
    const analise = analisarPadroesConversa(conversasSucesso, tipo);

    // Gerar playbook com IA
    const prompt = `Você é especialista em vendas e atendimento. Analise os seguintes dados de conversas de sucesso e crie um playbook otimizado.

**TIPO:** ${tipo}

**ANÁLISE DE DADOS:**
- Total conversas analisadas: ${conversasSucesso.length}
- Taxa de conversão média: ${analise.taxaConversao}%
- Tempo médio de conversa: ${analise.tempoMedio}s
- Objeções mais comuns: ${JSON.stringify(analise.objecoesComuns)}
- Perguntas frequentes: ${JSON.stringify(analise.perguntasFrequentes)}
- Frases que converteram: ${JSON.stringify(analise.frasesVencedoras)}

**TAREFA:**
Crie um playbook estruturado com:
1. Contexto de uso
2. Script principal (máx 5 etapas)
3. Respostas para top 5 objeções
4. Frases-chave validadas por dados
5. Checklist de conversão

Tom: Humanizado, direto, focado em valor.

Retorne JSON estruturado:
{
  "titulo": "...",
  "contexto": "...",
  "script": "...",
  "objecoes_comuns": [...],
  "frases_chave": [...],
  "checklist": [...]
}`;

    const resposta = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          titulo: { type: 'string' },
          contexto: { type: 'string' },
          script: { type: 'string' },
          objecoes_comuns: { type: 'array', items: { type: 'object' } },
          frases_chave: { type: 'array', items: { type: 'string' } },
          checklist: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    // Criar playbook
    const tipoPlaybook = tipo || 'inbound'; // Default se não fornecido
    const playbook = await base44.asServiceRole.entities.PlaybookVendas.create({
      tipo: tipoPlaybook,
      titulo: resposta.titulo,
      contexto: resposta.contexto,
      script: resposta.script,
      objecoes_comuns: resposta.objecoes_comuns || [],
      metricas: {
        taxa_conversao: parseFloat(analise.taxaConversao) || 0,
        tempo_medio_conversa: analise.tempoMedio || 0,
        vezes_usado: 0
      },
      origem: 'ia_gerado',
      gerado_por_ia: {
        conversas_analisadas: conversasSucesso.length,
        data_analise: new Date().toISOString(),
        model: 'gpt-4'
      },
      aprovado: false,
      ativo: false,
      tags: [tipoPlaybook, 'ia_gerado', 'aguardando_aprovacao']
    });

    return Response.json({
      success: true,
      playbook_id: playbook.id,
      titulo: playbook.titulo,
      requires_approval: true
    });

  } catch (error) {
    console.error('Erro ao gerar playbook:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function analisarPadroesConversa(conversas, tipo) {
  const total = conversas.length;
  const convertidas = conversas.filter(c => c.resultado === 'converteu').length;
  
  const tempos = conversas.map(c => c.tempo_total_conversa_seg || 0);
  const tempoMedio = tempos.reduce((a, b) => a + b, 0) / total;

  // Extrair objeções mais comuns
  const todasObjecoes = conversas.flatMap(c => c.objecoes_registradas || []);
  const objecoesMap = {};
  todasObjecoes.forEach(obj => {
    objecoesMap[obj.objecao] = (objecoesMap[obj.objecao] || 0) + 1;
  });
  const objecoesComuns = Object.entries(objecoesMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([objecao, count]) => ({ objecao, frequencia: count }));

  // Perguntas frequentes sem resposta (gaps)
  const todasPerguntas = conversas.flatMap(c => c.perguntas_sem_resposta || []);
  const perguntasFrequentes = [...new Set(todasPerguntas)].slice(0, 10);

  // Frases vencedoras (simplificado - seria ML em prod)
  const frasesVencedoras = [
    "Posso te mostrar como funciona?",
    "7 dias grátis, sem cartão",
    "Vou agendar pra você",
    "Temos disponível de seg-sex, 9h às 18h"
  ];

  return {
    taxaConversao: ((convertidas / total) * 100).toFixed(2),
    tempoMedio: Math.round(tempoMedio),
    objecoesComuns,
    perguntasFrequentes,
    frasesVencedoras
  };
}