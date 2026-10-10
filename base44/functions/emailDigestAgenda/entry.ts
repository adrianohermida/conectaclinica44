import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { enviarEmail } from './services/emailService.js';

/**
 * SPRINT 3: Email digest diário - consultas do dia
 * MANUAL: Admin clica "Enviar Digest Médicos" (vs CRON automático)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clinica_id, data_referencia } = await req.json();
    const targetClinica = clinica_id || user.clinica_id;
    const hoje = data_referencia || new Date().toISOString().split('T')[0];

    // Buscar agendamentos do dia
    const agendamentos = await base44.entities.Agendamento.filter({
      clinica_id: targetClinica,
      data: hoje,
      status: { $ne: 'cancelado' }
    });

    // Agrupar por médico
    const porMedico = {};
    for (const ag of agendamentos) {
      const medicoEmail = ag.medico_email || ag.created_by;
      if (!porMedico[medicoEmail]) {
        porMedico[medicoEmail] = [];
      }
      porMedico[medicoEmail].push(ag);
    }

    const enviados = [];
    const clinica = await base44.entities.Clinica.filter({ id: targetClinica })[0];

    for (const [medicoEmail, consultas] of Object.entries(porMedico)) {
      const medico = await base44.entities.User.filter({ email: medicoEmail })[0];
      
      const listaHTML = consultas.map(c => 
        `<li>${c.horario} - ${c.paciente_nome} (${c.tipo_consulta || 'Consulta'})</li>`
      ).join('');

      await enviarEmail({
        tipo: 'digest_agenda',
        para: medicoEmail,
        assunto: `Agenda ${new Date(hoje).toLocaleDateString('pt-BR')} - ${clinica.nome}`,
        variaveis: {
          medico_nome: medico?.full_name || 'Médico',
          data: new Date(hoje).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }),
          total_consultas: consultas.length,
          lista_consultas: listaHTML,
          clinica_nome: clinica.nome
        }
      });

      enviados.push(medicoEmail);
    }

    return Response.json({
      success: true,
      total_medicos: enviados.length,
      total_consultas: agendamentos.length,
      enviados
    });

  } catch (error) {
    console.error('[DigestAgenda] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});