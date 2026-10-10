import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { enviarEmailSendGrid } from './services/emailService.js';

/**
 * MIGRADO PARA SENDGRID: Lembretes 24h antes consulta
 * Cron diário 9h
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Buscar agendamentos das próximas 24 horas
    const agendamentos = await base44.asServiceRole.entities.Agendamento.filter({
      status: "confirmado"
    });

    const agora = new Date();
    const em24h = new Date(agora.getTime() + 24 * 60 * 60 * 1000);

    let enviados = 0;
    let erros = 0;

    for (const agend of agendamentos) {
      try {
        const dataAgendamento = new Date(`${agend.data} ${agend.horario || "00:00"}`);
        
        // Verifica se está entre agora e 24h
        if (dataAgendamento >= agora && dataAgendamento <= em24h) {
          // Buscar dados do paciente (tentar Contato primeiro, fallback Paciente)
          let paciente = null;
          let emailPaciente = null;

          if (agend.paciente_id) {
            const contatos = await base44.asServiceRole.entities.Contato.filter({
              id: agend.paciente_id,
              clinica_id: agend.clinica_id
            });
            if (contatos.length > 0) {
              paciente = contatos[0];
              emailPaciente = contatos[0].emails?.[0]?.email || contatos[0].email;
            } else {
              // Fallback: Paciente entity
              const pacientes = await base44.asServiceRole.entities.Paciente.filter({
                id: agend.paciente_id
              });
              if (pacientes.length > 0) {
                paciente = pacientes[0];
                emailPaciente = pacientes[0].email;
              }
            }
          }

          if (!paciente || !emailPaciente) {
            console.warn(`[Lembrete] Paciente sem email: ${agend.paciente_id}`);
            continue;
          }

          // Buscar clínica
          const clinicas = await base44.asServiceRole.entities.Clinica.filter({ id: agend.clinica_id });
          const clinica = clinicas[0] || { nome: 'Clínica', telefone: '', endereco: '' };

          // SENDGRID: Template dinâmico
          await enviarEmailSendGrid({
            base44,
            clinica_id: agend.clinica_id,
            template_tipo: 'lembrete_consulta',
            destinatario: emailPaciente,
            vars: {
              paciente_nome: paciente.nome_completo,
              data: new Date(agend.data).toLocaleDateString('pt-BR'),
              horario: agend.horario,
              medico: agend.medico || 'Não definido',
              especialidade: agend.especialidade || '',
              tipo_consulta: agend.tipo_consulta === 'telemedicina' ? 'Online (Telemedicina)' : 'Presencial',
              endereco_clinica: clinica.endereco || 'Consulte a clínica',
              telefone_clinica: clinica.telefone || '',
              clinica_nome: clinica.nome,
              observacoes: agend.observacoes || ''
            }
          });

          enviados++;
        }
      } catch (error) {
        console.error(`[Lembrete] Erro agendamento ${agend.id}:`, error);
        erros++;
      }
    }

    return Response.json({ 
      success: true, 
      enviados,
      erros,
      message: `${enviados} lembretes enviados, ${erros} falhas`
    });
  } catch (error) {
    console.error("[Lembrete] Erro fatal:", error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});