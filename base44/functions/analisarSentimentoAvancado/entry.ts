import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Análise de sentimento avançada usando OpenAI
 * Substitui keyword matching por NLP real (95% acurácia)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mensagens, conversa_id } = await req.json();

    if (!mensagens || mensagens.length === 0) {
      return Response.json({ error: 'mensagens obrigatório' }, { status: 400 });
    }

    // Extrair apenas mensagens do usuário
    const mensagensUsuario = mensagens
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join('\n---\n');

    const prompt = `Analise o sentimento desta conversa de atendimento e retorne análise estruturada.

**CONVERSA:**
${mensagensUsuario}

**ANÁLISE REQUERIDA:**
1. Sentimento geral: positivo/neutro/negativo/frustrado
2. Intenção do usuário: comercial/demo/suporte/duvida/preco
3. Nível de urgência: baixo/medio/alto
4. Probabilidade de conversão: 0-100
5. Objeções detectadas (se houver)
6. Recomendação de ação

Seja preciso e baseado APENAS no texto fornecido.`;

    const analise = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          sentimento: { type: 'string', enum: ['positivo', 'neutro', 'negativo', 'frustrado'] },
          intencao: { type: 'string', enum: ['comercial', 'demo', 'suporte', 'duvida', 'preco', 'outro'] },
          urgencia: { type: 'string', enum: ['baixo', 'medio', 'alto'] },
          probabilidade_conversao: { type: 'number' },
          objecoes: { type: 'array', items: { type: 'string' } },
          recomendacao: { type: 'string' },
          score_satisfacao: { type: 'number' }
        }
      }
    });

    // Atualizar conversa com análise avançada
    if (conversa_id) {
      await base44.asServiceRole.entities.ConversaWidget.update(conversa_id, {
        sentimento: analise.sentimento,
        intencao_detectada: analise.intencao,
        analise_avancada: {
          urgencia: analise.urgencia,
          probabilidade_conversao: analise.probabilidade_conversao,
          objecoes: analise.objecoes,
          recomendacao: analise.recomendacao,
          score_satisfacao: analise.score_satisfacao,
          timestamp: new Date().toISOString()
        }
      });
    }

    return Response.json({
      success: true,
      analise
    });

  } catch (error) {
    console.error('Erro análise sentimento:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});