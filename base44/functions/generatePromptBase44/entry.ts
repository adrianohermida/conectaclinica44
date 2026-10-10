import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Gera Prompt Base44 executável para correção de rota
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { node_path, metrics, issues } = await req.json();

    // Contexto para IA
    const context = `
Rota: ${node_path}
TTI: ${metrics.tti_ms}ms (meta: <2s)
Score Perf: ${metrics.score_perf}/100
Score Erro: ${metrics.score_error}%

Problemas detectados:
${issues.map(i => `- ${i.type}: ${i.description}`).join('\n')}
`;

    const llmPrompt = `
Você é um arquiteto de software especialista em React e Base44.

CONTEXTO:
${context}

TAREFA:
Gerar um Prompt Base44 EXECUTÁVEL para corrigir os problemas dessa rota.

FORMATO OBRIGATÓRIO:
"""
# Prompt Base44: Otimizar ${node_path}

## Objetivo
[Objetivo claro em 1 linha]

## Tarefas
1. [Tarefa específica 1 - ex: "Implementar lazy load do componente X"]
2. [Tarefa específica 2 - ex: "Adicionar React.memo em Y"]
3. [Tarefa específica 3 - ex: "Otimizar query Z com prefetch"]

## Critérios de Aceite
- TTI < 2s
- Score Perf > 85
- [Outros critérios específicos]

## Impacto Esperado
- Redução de X% no TTI
- Melhoria de Y pontos no score
"""

RETORNE APENAS O PROMPT FORMATADO, SEM EXPLICAÇÕES ADICIONAIS.
`;

    const { output } = await base44.integrations.Core.InvokeLLM({
      prompt: llmPrompt
    });

    return Response.json({
      success: true,
      prompt: output
    });

  } catch (error) {
    console.error('[generatePromptBase44] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});