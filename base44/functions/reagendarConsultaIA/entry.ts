import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * FASE 3: REAGENDAR CONSULTA VIA IA
 * Input: agendamento_id, nova_data, novo_horario (NLP)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.clinica_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { agendamento_id, mensagem } = await req.json();

    if (!agendamento_id || !mensagem) {
      return Response.json({ error: 'agendamento_id e mensagem obrigatórios' }, { status: 400 });
    }

    // Buscar agendamento original
    const agendamentosOriginal = await base44.entities.Agendamento.filter({ id: agendamento_id });
    if (!agendamentosOriginal.length) {
      return Response.json({ error: 'Agendamento não encontrado' }, { status: 404 });
    }

    const agendamentoOriginal = agendamentosOriginal[0];

    // Extrair nova data/hora via LLM
    const extraidoRes = await base44.integrations.Core.InvokeLLM({
      prompt: `Extraia a nova data/hora desta solicitação de reagendamento:

MENSAGEM: "${mensagem}"
AGENDAMENTO ATUAL: ${agendamentoOriginal.data_consulta} às ${agendamentoOriginal.horario}
DATA ATUAL: ${new Date().toISOString().split('T')[0]}

Retorne JSON:`,
      response_json_schema: {
        type: "object",
        properties: {
          nova_data: { type: "string", description: "YYYY-MM-DD" },
          novo_horario: { type: "string", description: "HH:mm" },
          motivo: { type: "string", description: "Motivo do reagendamento" }
        }
      }
    });

    const { nova_data, novo_horario, motivo } = extraidoRes;

    // Verificar disponibilidade
    const disponibilidadeRes = await base44.functions.invoke('getDisponibilidadeAgenda', {
      clinica_id: user.clinica_id,
      data: nova_data,
      horario_preferencial: novo_horario
    });

    if (!disponibilidadeRes.data.success) {
      return Response.json({
        success: false,
        mensagem_ia: `Data ${nova_data} às ${novo_horario} não disponível. Horários livres: ${disponibilidadeRes.data.proximas_datas?.slice(0, 3).join(', ') || 'consulte agenda'}`,
        disponibilidade: disponibilidadeRes.data.proximas_datas
      });
    }

    // Atualizar agendamento
    await base44.entities.Agendamento.update(agendamento_id, {
      data_consulta: nova_data,
      horario: novo_horario,
      status: 'confirmado',
      observacoes: `${agendamentoOriginal.observacoes || ''}\n[REAGENDADO] De ${agendamentoOriginal.data_consulta} ${agendamentoOriginal.horario} → ${nova_data} ${novo_horario}. Motivo: ${motivo || 'Não informado'}`
    });

    // Registrar conversão (FASE 3 - Métrica)
    await base44.entities.ConversaoAgendamentoIA.create({
      clinica_id: user.clinica_id,
      conversation_id: agendamentoOriginal.conversation_id || 'direct',
      contato_id: agendamentoOriginal.contato_id,
      agendamento_id: agendamento_id,
      converteu: true,
      tipo_agendamento: 'reagendamento',
      origem_conversa: 'widget',
      data_conversao: new Date().toISOString()
    });

    // Enviar confirmação WhatsApp
    const telefone = agendamentoOriginal.paciente_telefone;
    if (telefone) {
      try {
        await base44.functions.invoke('enviarLembreteAgendamento', {
          agendamento_id: agendamento_id,
          tipo: 'reagendamento'
        });
      } catch (error) {
        console.error('[ReagenharIA] Erro WhatsApp:', error);
      }
    }

    return Response.json({
      success: true,
      agendamento_id: agendamento_id,
      mensagem_ia: `✅ Reagendamento confirmado!

📅 **Nova data:** ${new Date(nova_data).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
🕐 **Novo horário:** ${novo_horario}

${telefone ? '💬 Confirmação enviada via WhatsApp.' : ''}

Posso ajudar com mais alguma coisa?`
    });

  } catch (error) {
    console.error('[ReagenharIA] Erro:', error);
    return Response.json({ 
      success: false,
      error: error.message,
      mensagem_ia: 'Erro ao reagendar. Por favor, fale com nossa equipe.'
    }, { status: 500 });
  }
});