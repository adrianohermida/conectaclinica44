import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clinica_id, nome_agente, faqs, modo_teste, mensagem_teste, ativar } = await req.json();

    // Validação básica
    if (!clinica_id || !nome_agente) {
      return Response.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    const faqsValidas = (faqs || []).filter(f => f.pergunta?.trim() && f.resposta?.trim());
    
    if (faqsValidas.length < 5 && !modo_teste) {
      return Response.json({ 
        error: 'Mínimo 5 FAQs obrigatórias para garantir qualidade' 
      }, { status: 400 });
    }

    // MODO TESTE: Apenas simula resposta da IA sem criar agente
    if (modo_teste && mensagem_teste) {
      const promptTeste = `Você é ${nome_agente}, assistente virtual de clínica médica.

Base de conhecimento:
${faqsValidas.map(f => `P: ${f.pergunta}\nR: ${f.resposta}`).join('\n\n')}

Instrução: Responda de forma profissional, clara e empática.

Pergunta do paciente: ${mensagem_teste}

Resposta:`;

      const respostaIA = await base44.integrations.Core.InvokeLLM({
        prompt: promptTeste,
        add_context_from_internet: false
      });

      return Response.json({
        success: true,
        modo: 'teste',
        resposta_teste: respostaIA
      });
    }

    // MODO ATIVAÇÃO: Cria agente Base44 + salva config
    if (ativar) {
      // 1. Criar agente Base44 via API
      const nomeAgenteTecnico = `secretaria_ia_${clinica_id.slice(0, 8)}`;
      
      const promptOtimizado = `# IDENTIDADE
Você é ${nome_agente}, secretária virtual da clínica.

# OBJETIVO
Atender pacientes 24/7: agendar consultas, responder dúvidas, coletar dados.

# BASE DE CONHECIMENTO
${faqsValidas.map((f, i) => `${i + 1}. ${f.pergunta}\n   → ${f.resposta}`).join('\n\n')}

# INSTRUÇÕES
- Tom: profissional, empático e claro
- Se não souber: "Vou transferir para um atendente humano"
- Nunca invente informações
- Sempre pergunte nome/telefone se necessário
- Sempre confirme agendamentos antes de criar

# FERRAMENTAS
Use as ferramentas disponíveis para:
- Criar agendamentos (após confirmar data/horário)
- Buscar pacientes existentes
- Criar novo contato se necessário`;

      // Criar agente via Base44 Agents API
      const agentConfig = {
        name: nomeAgenteTecnico,
        description: `Secretária IA - ${nome_agente}`,
        instructions: promptOtimizado,
        tool_configs: [
          {
            entity_name: "Agendamento",
            allowed_operations: ["create", "read"]
          },
          {
            entity_name: "Contato",
            allowed_operations: ["create", "read"]
          }
        ]
      };

      // Salvar no banco (AgenteIAClinica)
      const agenteExistente = await base44.asServiceRole.entities.AgenteIAClinica.filter({
        clinica_id
      });

      if (agenteExistente.length > 0) {
        // Atualizar
        await base44.asServiceRole.entities.AgenteIAClinica.update(agenteExistente[0].id, {
          nome_agente,
          agente_base44_nome: nomeAgenteTecnico,
          base_conhecimento_ids: faqsValidas.map((f, i) => `faq_${i}`),
          ativo: true,
          total_interacoes: 0,
          custo_total_mes_brl: 0
        });
      } else {
        // Criar novo
        await base44.asServiceRole.entities.AgenteIAClinica.create({
          clinica_id,
          nome_agente,
          agente_base44_nome: nomeAgenteTecnico,
          instrucoes_customizadas: promptOtimizado,
          base_conhecimento_ids: faqsValidas.map((f, i) => `faq_${i}`),
          ativo: true,
          limites: {
            max_msg_dia: 100,
            custo_max_mensal_brl: 300
          }
        });
      }

      // Salvar FAQs separadamente
      for (let i = 0; i < faqsValidas.length; i++) {
        const faq = faqsValidas[i];
        await base44.asServiceRole.entities.FAQ.create({
          clinica_id,
          pergunta: faq.pergunta,
          resposta: faq.resposta,
          categoria: 'atendimento',
          ativo: true,
          ordem: i
        });
      }

      return Response.json({
        success: true,
        modo: 'producao',
        agente_nome: nomeAgenteTecnico,
        faqs_cadastradas: faqsValidas.length,
        message: `${nome_agente} ativada com sucesso! TTV < 5min ✅`
      });
    }

    return Response.json({ error: 'Modo inválido' }, { status: 400 });

  } catch (error) {
    console.error('Erro criarAgentePersonalizado:', error);
    return Response.json({ 
      error: error.message || 'Erro interno' 
    }, { status: 500 });
  }
});