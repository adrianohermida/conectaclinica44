import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * NOTIFICAÇÃO AUTOMÁTICA - Criar/Editar/Cancelar Agendamento
 * Envia email para paciente E médico
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { agendamento_id, acao } = await req.json();

    // Buscar agendamento completo
    const agendamentos = await base44.asServiceRole.entities.Agendamento.filter({ id: agendamento_id });
    if (agendamentos.length === 0) {
      return Response.json({ error: 'Agendamento não encontrado' }, { status: 404 });
    }

    const agendamento = agendamentos[0];

    // Buscar dados do paciente
    let pacienteEmail = null;
    if (agendamento.paciente_id) {
      const pacientes = await base44.asServiceRole.entities.Contato.filter({ id: agendamento.paciente_id });
      if (pacientes.length > 0) {
        pacienteEmail = pacientes[0].email;
      }
    }

    // Buscar dados do médico
    let medicoEmail = null;
    if (agendamento.medico_id) {
      const medicos = await base44.asServiceRole.entities.Medico.filter({ id: agendamento.medico_id });
      if (medicos.length > 0) {
        medicoEmail = medicos[0].email;
      }
    }

    const resultados = [];

    // Email para PACIENTE
    if (pacienteEmail) {
      try {
        let assunto, corpo;

        if (acao === 'criar') {
          assunto = "✅ Consulta Agendada - ConectaClínica";
          corpo = `
            <div style="font-family: Arial; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
              <div style="background: white; border-radius: 16px; padding: 30px;">
                <h2 style="color: #7E57FF;">Consulta Confirmada</h2>
                <p>Olá, <strong>${agendamento.paciente_nome}</strong>!</p>
                <p>Sua consulta foi agendada com sucesso:</p>
                <div style="background: #f5f3ff; border-left: 4px solid #7E57FF; padding: 20px; margin: 20px 0;">
                  <p><strong>📅 Data:</strong> ${new Date(agendamento.data).toLocaleDateString('pt-BR')}</p>
                  <p><strong>🕐 Horário:</strong> ${agendamento.horario}</p>
                  ${agendamento.medico ? `<p><strong>👨‍⚕️ Médico:</strong> Dr(a). ${agendamento.medico}</p>` : ''}
                  <p><strong>📍 Tipo:</strong> ${agendamento.tipo_consulta === 'presencial' ? 'Presencial' : 'Telemedicina'}</p>
                </div>
                <p>Chegue 10 minutos antes. Em caso de cancelamento, entre em contato.</p>
              </div>
            </div>
          `;
        } else if (acao === 'editar') {
          assunto = "🔄 Consulta Remarcada - ConectaClínica";
          corpo = `
            <div style="font-family: Arial; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
              <div style="background: white; border-radius: 16px; padding: 30px;">
                <h2 style="color: #0B7A9E;">Consulta Remarcada</h2>
                <p>Olá, <strong>${agendamento.paciente_nome}</strong>!</p>
                <p>Sua consulta foi remarcada:</p>
                <div style="background: #e0f2fe; border-left: 4px solid #0B7A9E; padding: 20px; margin: 20px 0;">
                  <p><strong>📅 Nova Data:</strong> ${new Date(agendamento.data).toLocaleDateString('pt-BR')}</p>
                  <p><strong>🕐 Novo Horário:</strong> ${agendamento.horario}</p>
                  ${agendamento.medico ? `<p><strong>👨‍⚕️ Médico:</strong> Dr(a). ${agendamento.medico}</p>` : ''}
                </div>
              </div>
            </div>
          `;
        } else if (acao === 'cancelar') {
          assunto = "❌ Consulta Cancelada - ConectaClínica";
          corpo = `
            <div style="font-family: Arial; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
              <div style="background: white; border-radius: 16px; padding: 30px;">
                <h2 style="color: #ea4335;">Consulta Cancelada</h2>
                <p>Olá, <strong>${agendamento.paciente_nome}</strong>!</p>
                <p>Informamos que sua consulta foi cancelada:</p>
                <div style="background: #fee2e2; border-left: 4px solid #ea4335; padding: 20px; margin: 20px 0;">
                  <p><strong>📅 Data:</strong> ${new Date(agendamento.data).toLocaleDateString('pt-BR')}</p>
                  <p><strong>🕐 Horário:</strong> ${agendamento.horario}</p>
                </div>
                <p>Entre em contato para reagendar.</p>
              </div>
            </div>
          `;
        }

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: pacienteEmail,
          subject: assunto,
          body: corpo
        });

        resultados.push({ destinatario: 'paciente', email: pacienteEmail, status: 'enviado' });
      } catch (error) {
        console.error('Erro ao enviar email para paciente:', error);
        resultados.push({ destinatario: 'paciente', email: pacienteEmail, status: 'erro', erro: error.message });
      }
    }

    // Email para MÉDICO
    if (medicoEmail) {
      try {
        let assunto, corpo;

        if (acao === 'criar') {
          assunto = `🩺 Nova Consulta Agendada - ${agendamento.paciente_nome}`;
          corpo = `
            <div style="font-family: Arial; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
              <div style="background: white; border-radius: 16px; padding: 30px;">
                <h2 style="color: #7E57FF;">Nova Consulta na Agenda</h2>
                <p>Dr(a). ${agendamento.medico},</p>
                <p>Você tem uma nova consulta agendada:</p>
                <div style="background: #f5f3ff; border-left: 4px solid #7E57FF; padding: 20px; margin: 20px 0;">
                  <p><strong>👤 Paciente:</strong> ${agendamento.paciente_nome}</p>
                  <p><strong>📅 Data:</strong> ${new Date(agendamento.data).toLocaleDateString('pt-BR')}</p>
                  <p><strong>🕐 Horário:</strong> ${agendamento.horario}</p>
                  <p><strong>📍 Tipo:</strong> ${agendamento.tipo_consulta === 'presencial' ? 'Presencial' : 'Telemedicina'}</p>
                  ${agendamento.observacoes ? `<p><strong>📝 Obs:</strong> ${agendamento.observacoes}</p>` : ''}
                </div>
              </div>
            </div>
          `;
        } else if (acao === 'editar') {
          assunto = `🔄 Consulta Remarcada - ${agendamento.paciente_nome}`;
          corpo = `
            <div style="font-family: Arial; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
              <div style="background: white; border-radius: 16px; padding: 30px;">
                <h2 style="color: #0B7A9E;">Consulta Remarcada</h2>
                <p>Dr(a). ${agendamento.medico},</p>
                <p>Uma consulta foi remarcada:</p>
                <div style="background: #e0f2fe; border-left: 4px solid #0B7A9E; padding: 20px; margin: 20px 0;">
                  <p><strong>👤 Paciente:</strong> ${agendamento.paciente_nome}</p>
                  <p><strong>📅 Nova Data:</strong> ${new Date(agendamento.data).toLocaleDateString('pt-BR')}</p>
                  <p><strong>🕐 Novo Horário:</strong> ${agendamento.horario}</p>
                  <p><strong>📍 Tipo:</strong> ${agendamento.tipo_consulta === 'presencial' ? 'Presencial' : 'Telemedicina'}</p>
                </div>
              </div>
            </div>
          `;
        } else if (acao === 'cancelar') {
          assunto = `🚫 Consulta Cancelada - ${agendamento.paciente_nome}`;
          corpo = `
            <div style="font-family: Arial; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
              <div style="background: white; border-radius: 16px; padding: 30px;">
                <h2 style="color: #ea4335;">Consulta Cancelada</h2>
                <p>Dr(a). ${agendamento.medico},</p>
                <p>Uma consulta foi cancelada:</p>
                <div style="background: #fee2e2; border-left: 4px solid #ea4335; padding: 20px; margin: 20px 0;">
                  <p><strong>👤 Paciente:</strong> ${agendamento.paciente_nome}</p>
                  <p><strong>📅 Data:</strong> ${new Date(agendamento.data).toLocaleDateString('pt-BR')}</p>
                  <p><strong>🕐 Horário:</strong> ${agendamento.horario}</p>
                </div>
              </div>
            </div>
          `;
        }

        // Validação crítica - prevenir undefined
        if (!assunto || !corpo) {
          throw new Error(`Ação inválida para médico: ${acao}`);
        }

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: medicoEmail,
          subject: assunto,
          body: corpo
        });

        resultados.push({ destinatario: 'medico', email: medicoEmail, status: 'enviado' });
      } catch (error) {
        console.error('Erro ao enviar email para médico:', error);
        resultados.push({ destinatario: 'medico', email: medicoEmail, status: 'erro', erro: error.message });
      }
    }

    return Response.json({
      agendamento_id,
      acao,
      notificacoes_enviadas: resultados.filter(r => r.status === 'enviado').length,
      detalhes: resultados
    });

  } catch (error) {
    console.error('Erro geral:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});