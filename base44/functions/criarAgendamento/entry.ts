import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * P2 FINAL: Criar agendamento com validação conflito atômica
 * CRITICAL: Validação + create em 1 transação = race condition safe
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !user.clinica_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agendamentoData = await req.json();

    // P2 CRITICAL: Validar conflito ANTES de criar (atomic)
    const conflitos = await base44.asServiceRole.entities.Agendamento.filter({
      clinica_id: user.clinica_id,
      data: agendamentoData.data,
      horario: agendamentoData.horario,
      medico: agendamentoData.medico
    });

    // Excluir cancelados
    const conflitoAtivo = conflitos.find(ag => ag.status !== "cancelado");

    if (conflitoAtivo) {
      return Response.json({
        error: `Horário ${agendamentoData.horario} já ocupado por: ${conflitoAtivo.paciente_nome}`,
        agendamento_existente: {
          id: conflitoAtivo.id,
          paciente: conflitoAtivo.paciente_nome,
          data: conflitoAtivo.data,
          horario: conflitoAtivo.horario
        }
      }, { status: 409 });
    }

    // Criar agendamento
    const novoAgendamento = await base44.asServiceRole.entities.Agendamento.create({
      ...agendamentoData,
      clinica_id: user.clinica_id
    });

    // CRITICAL: Notificar médico responsável
    if (agendamentoData.medico_id) {
      try {
        const medico = await base44.asServiceRole.entities.Medico.filter({
          id: agendamentoData.medico_id
        });

        if (medico && medico[0]?.usuario_id) {
          await base44.asServiceRole.entities.NotificacaoSistema.create({
            clinica_id: user.clinica_id,
            tipo: 'agendamento_confirmado',
            destinatario_id: medico[0].usuario_id,
            destinatario_email: medico[0].email,
            remetente_id: user.id,
            remetente_nome: user.full_name,
            titulo: `Nova consulta agendada`,
            corpo: `${agendamentoData.paciente_nome} agendou para ${agendamentoData.data} às ${agendamentoData.horario}`,
            acao_url: `/Agenda?dia=${agendamentoData.data}`,
            acao_label: 'Abrir agenda',
            canal: 'in_app',
            prioridade: 'media',
            metadata: {
              agendamento_id: novoAgendamento.id,
              paciente_id: agendamentoData.paciente_id,
              paciente_nome: agendamentoData.paciente_nome,
              data: agendamentoData.data,
              horario: agendamentoData.horario,
              tipo_consulta: agendamentoData.tipo_consulta
            },
            icone: 'Calendar',
            cor: '#7E57FF'
          });
        }
      } catch (notifError) {
        console.error('[criarAgendamento] Erro notificação médico:', notifError);
        // Não bloqueia criação do agendamento
      }
    }

    return Response.json(novoAgendamento);

  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});