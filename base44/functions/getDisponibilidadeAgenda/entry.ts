import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * GET DISPONIBILIDADE AGENDA - Retorna slots disponíveis para agendamento público
 */
Deno.serve(async (req) => {
  try {
    const { clinica_id, data } = await req.json();

    if (!clinica_id || !data) {
      return Response.json({ error: 'clinica_id e data obrigatórios' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Buscar configuração
    const configs = await base44.asServiceRole.entities.ConfiguracaoAgendaOnline.filter({
      clinica_id,
      ativo: true
    });

    if (configs.length === 0) {
      return Response.json({ error: 'Agenda online não configurada' }, { status: 404 });
    }

    const config = configs[0];

    // Verificar se dia da semana está disponível
    const dataObj = new Date(data + 'T00:00:00');
    const diaSemana = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'][dataObj.getDay()];

    if (!config.dias_semana.includes(diaSemana)) {
      return Response.json({ slots: [] });
    }

    // Gerar slots
    const slots = [];
    const [horaInicio, minInicio] = config.horario_inicio.split(':').map(Number);
    const [horaFim, minFim] = config.horario_fim.split(':').map(Number);

    let currentTime = horaInicio * 60 + minInicio;
    const endTime = horaFim * 60 + minFim;

    while (currentTime + config.duracao_padrao_minutos <= endTime) {
      const hora = Math.floor(currentTime / 60);
      const min = currentTime % 60;
      const horario = `${String(hora).padStart(2, '0')}:${String(min).padStart(2, '0')}`;

      // Verificar se já existe agendamento
      const agendamentos = await base44.asServiceRole.entities.Agendamento.filter({
        clinica_id,
        data,
        horario,
        status: { $ne: 'cancelado' }
      });

      if (agendamentos.length === 0) {
        slots.push({
          horario,
          disponivel: true
        });
      }

      currentTime += config.intervalo_minutos;
    }

    return Response.json({ slots });
  } catch (error) {
    console.error('[getDisponibilidadeAgenda] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});