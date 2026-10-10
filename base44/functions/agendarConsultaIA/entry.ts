import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * FASE 3: IA AGENDA CONSULTAS VIA NLP
 * Input: conversationId, mensagem ("preciso consulta terça 14h")
 * Output: agendamento criado + confirmação WhatsApp
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.clinica_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mensagem, contato_id, conversation_id } = await req.json();

    if (!mensagem) {
      return Response.json({ error: 'mensagem obrigatória' }, { status: 400 });
    }

    console.log(`[AgendarIA] Processando: "${mensagem}"`);

    // STEP 1: Extrair dados via InvokeLLM
    const extraidoRes = await base44.integrations.Core.InvokeLLM({
      prompt: `Você é um assistente de agendamento. Extraia os dados da mensagem abaixo e retorne em JSON estruturado.

MENSAGEM: "${mensagem}"

DATA ATUAL: ${new Date().toISOString().split('T')[0]}

INSTRUÇÕES:
1. Se a mensagem mencionar dia da semana (ex: "terça"), calcule a próxima data correspondente
2. Se mencionar "amanhã", calcule a data
3. Se mencionar hora, converta para formato HH:mm
4. Se não especificar hora, use null
5. Extraia tipo de consulta se mencionado (retorno, primeira consulta, etc)

Retorne APENAS o JSON, nada mais.`,
      response_json_schema: {
        type: "object",
        properties: {
          data_pretendida: { type: "string", description: "YYYY-MM-DD ou null" },
          hora_pretendida: { type: "string", description: "HH:mm ou null" },
          tipo_consulta: { type: "string", description: "retorno, primeira_consulta, urgente, etc" },
          observacoes: { type: "string", description: "Observações adicionais" }
        }
      }
    });

    const dadosExtraidos = extraidoRes;
    console.log('[AgendarIA] Dados extraídos:', dadosExtraidos);

    // STEP 2: Buscar disponibilidade real
    const disponibilidadeRes = await base44.functions.invoke('getDisponibilidadeAgenda', {
      clinica_id: user.clinica_id,
      data: dadosExtraidos.data_pretendida,
      horario_preferencial: dadosExtraidos.hora_pretendida
    });

    const disponibilidade = disponibilidadeRes.data;

    if (!disponibilidade.success || !disponibilidade.horarios_disponiveis?.length) {
      return Response.json({
        success: false,
        mensagem_ia: `Não encontrei horários disponíveis para ${dadosExtraidos.data_pretendida || 'a data solicitada'}. Temos vagas em: ${disponibilidade.proximas_datas?.slice(0, 3).join(', ') || 'próximos dias'}. Qual prefere?`,
        disponibilidade: disponibilidade.proximas_datas || []
      });
    }

    // STEP 3: Selecionar melhor horário
    const horarioSelecionado = disponibilidade.horarios_disponiveis[0];

    // STEP 4: Criar agendamento
    const contato = await base44.entities.Contato.filter({ id: contato_id });
    if (!contato.length) {
      return Response.json({ error: 'Contato não encontrado' }, { status: 404 });
    }

    const agendamento = await base44.entities.Agendamento.create({
      clinica_id: user.clinica_id,
      contato_id: contato_id,
      paciente_nome: contato[0].nome_completo,
      paciente_telefone: contato[0].whatsapp || contato[0].telefones?.[0]?.numero,
      paciente_email: contato[0].emails?.[0]?.email || contato[0].email,
      data_consulta: horarioSelecionado.data,
      horario: horarioSelecionado.hora,
      tipo_consulta: dadosExtraidos.tipo_consulta || 'consulta',
      status: 'confirmado',
      origem: 'ia_conversacional',
      observacoes: `Agendado via IA: ${dadosExtraidos.observacoes || mensagem}`,
      conversation_id: conversation_id
    });

    console.log('[AgendarIA] Agendamento criado:', agendamento.id);

    // STEP 5: Enviar confirmação WhatsApp (se telefone disponível)
    const telefone = contato[0].whatsapp || contato[0].telefones?.[0]?.numero;
    if (telefone) {
      try {
        await base44.functions.invoke('enviarLembreteAgendamento', {
          agendamento_id: agendamento.id,
          tipo: 'confirmacao_imediata'
        });
        console.log('[AgendarIA] WhatsApp enviado');
      } catch (error) {
        console.error('[AgendarIA] Erro WhatsApp:', error);
      }
    }

    // STEP 6: Registrar conversão (FASE 3 - Métrica conversão chat→agendamento)
    await base44.entities.ConversaoAgendamentoIA.create({
      clinica_id: user.clinica_id,
      conversation_id: conversation_id,
      contato_id: contato_id,
      agendamento_id: agendamento.id,
      converteu: true,
      tipo_agendamento: 'novo',
      origem_conversa: 'widget',
      data_conversao: new Date().toISOString()
    });

    // STEP 7: Criar mensagem confirmação
    const mensagemIA = `✅ Agendamento confirmado!

📅 **Data:** ${new Date(horarioSelecionado.data).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
🕐 **Horário:** ${horarioSelecionado.hora}
📍 **Local:** ${user.clinica_nome || 'Clínica'}

${telefone ? '💬 Você receberá uma confirmação via WhatsApp em breve.' : ''}

Precisa de algo mais?`;

    return Response.json({
      success: true,
      agendamento_id: agendamento.id,
      mensagem_ia: mensagemIA,
      detalhes: {
        data: horarioSelecionado.data,
        hora: horarioSelecionado.hora,
        paciente: contato[0].nome_completo
      }
    });

  } catch (error) {
    console.error('[AgendarIA] Erro:', error);
    return Response.json({ 
      success: false,
      error: error.message,
      mensagem_ia: 'Ops, não consegui agendar agora. Pode me passar telefone e horário preferencial? Um atendente entrará em contato.'
    }, { status: 500 });
  }
});