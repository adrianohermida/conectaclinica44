import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

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
    const ticket = await base44.entities.Ticket.filter({ id: ticket_id });
    if (!ticket.length) {
      return Response.json({ error: 'Ticket não encontrado' }, { status: 404 });
    }

    const t = ticket[0];

    // VALIDAÇÃO MULTI-TENANT CRÍTICA
    if (user.role !== 'admin' && t.clinica_id !== user.clinica_id) {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Buscar últimas 5 mensagens do ticket
    const mensagens = await base44.entities.MensagemTicket.filter(
      { ticket_id: t.id }, 
      'created_date', 
      5
    );

    // Buscar templates ativos da clínica
    const templates = await base44.entities.TemplateResposta.filter(
      { clinica_id: t.clinica_id, ativo: true },
      '-uso_count',
      10
    );

    // Buscar dados do contato (se existir)
    let contatoContext = '';
    if (t.contato_id) {
      const contatos = await base44.entities.Contato.filter({ id: t.contato_id });
      if (contatos.length > 0) {
        const c = contatos[0];
        contatoContext = `
CONTATO: ${c.nome_completo}
Tipo: ${c.tipo_contato}
Histórico: ${c.observacoes || 'N/A'}`;
      }
    }

    // Montar contexto
    const historicoTexto = mensagens
      .map(m => `[${m.remetente_nome}]: ${m.conteudo}`)
      .join('\n');

    const templatesTexto = templates
      .map(t => `- ${t.titulo}: ${t.conteudo.substring(0, 150)}`)
      .join('\n');

    const prompt = `Você é assistente de atendimento ao cliente.

TICKET: ${t.assunto}
Status: ${t.status} | Prioridade: ${t.prioridade} | Categoria: ${t.categoria}
${contatoContext}

HISTÓRICO DA CONVERSA:
${historicoTexto}

TEMPLATES DISPONÍVEIS:
${templatesTexto || 'Nenhum template cadastrado'}

TAREFA: Gere EXATAMENTE 3 sugestões de resposta para este ticket:
1. Uma resposta empática e personalizada
2. Uma resposta objetiva e direta
3. Uma resposta usando template (se aplicável) ou alternativa criativa

REGRAS CRÍTICAS:
- Máximo 150 palavras por sugestão
- Tom profissional mas humanizado
- Não inventar dados
- Se categoria = "financeiro", incluir próximos passos
- Se categoria = "agendamento", confirmar disponibilidade

Responda APENAS com JSON válido no formato:
{
  "sugestoes": [
    {"texto": "...", "tipo": "empatica", "confianca": 0.85},
    {"texto": "...", "tipo": "objetiva", "confianca": 0.90},
    {"texto": "...", "tipo": "template", "confianca": 0.75, "template_id": "id ou null"}
  ]
}`;

    // Chamar LLM
    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false,
      response_json_schema: {
        type: "object",
        properties: {
          sugestoes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                texto: { type: "string" },
                tipo: { type: "string" },
                confianca: { type: "number" },
                template_id: { type: "string" }
              }
            }
          }
        }
      }
    });

    const sugestoes = llmResponse.response?.sugestoes || [];

    // CRITICAL: Registrar uso para analytics futuro
    await base44.asServiceRole.entities.MetricasIA.create({
      clinica_id: t.clinica_id,
      tipo_operacao: 'sugestao_resposta',
      ticket_id: t.id,
      num_sugestoes: sugestoes.length,
      confianca_media: sugestoes.reduce((acc, s) => acc + (s.confianca || 0), 0) / sugestoes.length,
      templates_usados: sugestoes.filter(s => s.template_id).length
    }).catch(() => {}); // Fail silently

    return Response.json({ 
      success: true,
      sugestoes,
      metadata: {
        ticket_numero: t.numero_ticket,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Erro gerarSugestoesResposta:', error);
    return Response.json({ 
      success: false,
      error: error.message,
      sugestoes: []
    }, { status: 200 }); // 200 para não quebrar UI
  }
});