import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * GERAR FAQs VIA IA - Aprendizado de mercado
 * Pesquisa nicho + concorrentes + tendências → gera 50-100 FAQs
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const { modulo, quantidade = 20 } = await req.json();

    // PESQUISA DE MERCADO via LLM
    const pesquisa = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Você é especialista em software médico/clínico no Brasil.

CONTEXTO:
- Produto: ConectaClínica (SaaS gestão clínicas)
- Módulo: ${modulo || 'Geral'}
- Público: Clínicas pequenas/médias, médicos, recepcionistas
- Nicho: Telemedicina, prontuários eletrônicos, agenda online

TAREFA:
Gere ${quantidade} FAQs CRÍTICOS que:
1. Antecipem dúvidas comuns de clientes brasileiros
2. Cubram casos de uso reais (onboarding, troubleshooting, compliance LGPD)
3. Incluam respostas técnicas mas acessíveis
4. Considerem regionalidades (SUS, ANS, CFM)

PESQUISE CONTEXTO:
- Dúvidas comuns em fóruns médicos
- Objeções comerciais típicas
- Gaps de concorrentes (Doctoralia, iClinic, etc)
- Regulamentações brasileiras

Para cada FAQ, retorne:
{
  "pergunta": "...",
  "resposta": "... (markdown, 100-200 palavras)",
  "resposta_curta": "... (1-2 linhas para chatbot)",
  "categoria": "...",
  "tags": ["..."],
  "gap_detectado": "... (por que essa pergunta é crítica)",
  "score_prioridade": 0-100
}`,
      add_context_from_internet: true
    });

    // Salvar aprendizado
    await base44.asServiceRole.entities.AprendizadoIA.create({
      tipo_aprendizado: 'pesquisa_mercado',
      fonte: 'Google Search + Análise Concorrentes',
      insights: pesquisa.insights_mercado,
      faqs_sugeridos: pesquisa.faqs,
      score_confianca: 85,
      aprovado: false,
      impacto_estimado: {
        taxa_resolucao_esperada: 70,
        reducao_tickets: 30,
        score_satisfacao: 85
      }
    });

    // Criar FAQs automaticamente (aprovação automática se score > 80)
    const faqsAprovados = pesquisa.faqs.filter(f => f.score_prioridade >= 80);
    
    for (const faq of faqsAprovados) {
      await base44.asServiceRole.entities.ArtigoFAQ.create({
        secao: 'produto',
        categoria: faq.categoria || 'geral',
        pergunta: faq.pergunta,
        resposta: faq.resposta,
        resposta_curta: faq.resposta_curta,
        tags: faq.tags,
        aprovado: true,
        aprovado_por: 'IA Auto-Approved (score > 80)',
        origem: 'ia_sugerida'
      });
    }

    return Response.json({ 
      success: true,
      total_gerados: pesquisa.faqs.length,
      auto_aprovados: faqsAprovados.length,
      pendentes_revisao: pesquisa.faqs.length - faqsAprovados.length,
      insights: pesquisa.insights_mercado
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});