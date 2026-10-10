import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * POPULAR FAQs ESSENCIAIS V2 - 50 FAQs via IA SEM schema complexo
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    // IA: Gerar FAQs (resposta livre)
    const resposta = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Você é especialista em SaaS médico/clínico brasileiro.

GERE 50 FAQs ESSENCIAIS para ConectaClínica (gestão de clínicas).

CATEGORIAS OBRIGATÓRIAS:
- Agendamento (10 FAQs)
- Pacientes/Prontuários (10)
- Telemedicina (8)
- Financeiro/Planos (8)
- WhatsApp/Email (7)
- LGPD/Compliance (7)

FORMATO (cada FAQ):
P: [pergunta clara e direta]
R: [resposta 2-3 linhas, prática]
CURTA: [1 linha para chatbot]
TAGS: tag1, tag2, tag3
---

EXEMPLOS QUALIDADE:
P: Como agendar consulta?
R: Acesse Agenda → Novo Agendamento → Selecione paciente, médico, data/hora → Confirme. O sistema valida disponibilidade automaticamente.
CURTA: Agenda → Novo Agendamento → preencher dados
TAGS: agendamento, consulta, marcar
---

P: ConectaClínica é LGPD compliant?
R: Sim, 100%. Todos dados são criptografados, logs de acesso rastreados, consentimento obrigatório via modal bloqueante, DPO disponível.
CURTA: Sim, 100% LGPD com criptografia e auditoria total.
TAGS: lgpd, privacidade, seguranca, compliance
---

COMECE:`,
      add_context_from_internet: true
    });

    // Parse manual (FAQs separados por ---)
    const blocos = resposta.split('---').filter(b => b.trim());
    const faqs = [];

    for (const bloco of blocos) {
      const linhas = bloco.split('\n').filter(l => l.trim());
      const pergunta = linhas.find(l => l.startsWith('P:'))?.replace('P:', '').trim();
      const resposta = linhas.find(l => l.startsWith('R:'))?.replace('R:', '').trim();
      const curta = linhas.find(l => l.startsWith('CURTA:'))?.replace('CURTA:', '').trim();
      const tagsLine = linhas.find(l => l.startsWith('TAGS:'))?.replace('TAGS:', '').trim();
      const tags = tagsLine ? tagsLine.split(',').map(t => t.trim()) : [];

      if (pergunta && resposta) {
        faqs.push({
          secao: 'produto',
          categoria: 'geral',
          pergunta,
          resposta,
          resposta_curta: curta || resposta.substring(0, 100),
          tags,
          aprovado: true,
          aprovado_por: 'IA Auto-Generated',
          origem: 'ia_sugerida',
          ativo: true
        });
      }
    }

    // Criar FAQs
    if (faqs.length > 0) {
      await base44.asServiceRole.entities.ArtigoFAQ.bulkCreate(faqs);
    }

    return Response.json({ 
      success: true,
      total_gerados: faqs.length,
      preview: faqs.slice(0, 3)
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});