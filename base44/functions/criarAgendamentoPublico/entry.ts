import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * CRIAR AGENDAMENTO PÚBLICO - Cria agendamento sem autenticação
 */
Deno.serve(async (req) => {
  try {
    const { clinica_id, data, horario, nome, telefone, email, observacoes } = await req.json();

    if (!clinica_id || !data || !horario || !nome || !telefone) {
      return Response.json({ error: 'Dados obrigatórios faltando' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Verificar se horário ainda está disponível
    const agendamentos = await base44.asServiceRole.entities.Agendamento.filter({
      clinica_id,
      data,
      horario,
      status: { $ne: 'cancelado' }
    });

    if (agendamentos.length > 0) {
      return Response.json({ error: 'Horário não disponível' }, { status: 409 });
    }

    // Criar ou buscar contato
    let contatos = await base44.asServiceRole.entities.Contato.filter({
      clinica_id,
      telefone
    });

    let contato;
    if (contatos.length === 0) {
      contato = await base44.asServiceRole.entities.Contato.create({
        clinica_id,
        nome_completo: nome,
        telefone,
        email: email || '',
        tipo_contato: 'lead',
        status: 'ativo',
        origem_lead: 'widget'
      });
    } else {
      contato = contatos[0];
    }

    // Criar agendamento
    const agendamento = await base44.asServiceRole.entities.Agendamento.create({
      clinica_id,
      paciente_id: contato.id,
      paciente_nome: nome,
      data,
      horario,
      tipo_consulta: 'presencial',
      status: 'agendado',
      observacoes: observacoes || `Agendado via widget online - Contato: ${telefone}${email ? ` - ${email}` : ''}`
    });

    // Enviar confirmação (WhatsApp + Email)
    try {
      const config = await base44.asServiceRole.entities.ConfiguracaoAgendaOnline.filter({
        clinica_id,
        ativo: true
      });

      if (config[0]?.confirmacao_automatica) {
        // WhatsApp
        await base44.asServiceRole.functions.invoke('enviarLembreteAgendamento', {
          agendamento_id: agendamento.id,
          tipo: 'confirmacao'
        });

        // Email (se fornecido)
        if (email) {
          await base44.asServiceRole.functions.invoke('enviarEmailConfirmacaoAgendamento', {
            email,
            nome,
            data,
            horario
          });
        }
      }
    } catch (notifError) {
      console.warn('[criarAgendamentoPublico] Erro ao enviar confirmação:', notifError.message);
    }

    // CRITICAL: Notificar médico (buscar médico_id da config clínica ou padrão)
    try {
      // Buscar médico padrão da clínica ou primeiro ativo
      const medicos = await base44.asServiceRole.entities.Medico.filter({
        clinica_id,
        ativo: true
      });

      if (medicos && medicos.length > 0 && medicos[0].usuario_id) {
        await base44.asServiceRole.entities.NotificacaoSistema.create({
          clinica_id,
          tipo: 'agendamento_confirmado',
          destinatario_id: medicos[0].usuario_id,
          destinatario_email: medicos[0].email,
          remetente_id: 'sistema',
          remetente_nome: 'Agenda Online',
          titulo: `Agendamento online confirmado`,
          corpo: `${nome} agendou consulta para ${data} às ${horario}`,
          acao_url: `/Agenda?dia=${data}`,
          acao_label: 'Abrir agenda',
          canal: 'in_app',
          prioridade: 'media',
          metadata: {
            agendamento_id: agendamento.id,
            contato_id: contato.id,
            paciente_nome: nome,
            data,
            horario,
            telefone,
            email,
            origem: 'widget_publico'
          },
          icone: 'Calendar',
          cor: '#7E57FF'
        });
      }
    } catch (notifError) {
      console.error('[criarAgendamentoPublico] Erro notificação médico:', notifError);
      // Não bloqueia criação do agendamento
    }

    return Response.json({
      success: true,
      agendamento_id: agendamento.id,
      contato_id: contato.id
    });
  } catch (error) {
    console.error('[criarAgendamentoPublico] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});