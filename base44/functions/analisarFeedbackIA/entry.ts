import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * ANALISAR FEEDBACK COM IA
 * Detecta sentimento + gera resposta sugerida
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { feedback_id } = await req.json();

    const feedback = await base44.asServiceRole.entities.FeedbackUsuario.filter({ id: feedback_id });
    if (!feedback || feedback.length === 0) {
      return Response.json({ error: 'Feedback não encontrado' }, { status: 404 });
    }

    const f = feedback[0];

    // Buscar FAQs relacionados
    const faqs = await base44.asServiceRole.entities.ArtigoFAQ.filter({ 
      ativo: true, 
      aprovado: true 
    });

    const faqContext = faqs.slice(0, 10).map(a => 
      `P: ${a.pergunta}\nR: ${a.resposta_curta || a.resposta}`
    ).join('\n\n');

    // IA: Sentimento + Resposta
    const analise = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Você é assistente da ConectaClínica.

PERGUNTA DO USUÁRIO:
"${f.pergunta}"

CONTEXTO (${f.contexto || 'geral'}):
${faqContext}

TAREFAS:
1. Detectar sentimento: positivo/neutro/negativo/urgente
2. Gerar resposta precisa baseada nos FAQs existentes
3. Se não tiver resposta nos FAQs, sugerir criação de novo artigo

Formato JSON:
{
  "sentimento": "...",
  "resposta": "...",
  "sugerir_novo_faq": boolean,
  "categoria_sugerida": "..."
}`,
      response_json_schema: {
        type: "object",
        properties: {
          sentimento: { type: "string" },
          resposta: { type: "string" },
          sugerir_novo_faq: { type: "boolean" },
          categoria_sugerida: { type: "string" }
        }
      }
    });

    // Atualizar feedback
    await base44.asServiceRole.entities.FeedbackUsuario.update(f.id, {
      sentimento: analise.sentimento,
      resposta_ia: analise.resposta,
      status: 'pendente_aprovacao'
    });

    return Response.json({ 
      success: true,
      analise
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});