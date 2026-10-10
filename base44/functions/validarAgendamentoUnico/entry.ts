import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * P2 - EDGE_CONFLITO: Validar agendamento único (server-side + DB lock)
 * CRÍTICO: Race condition no frontend → dupla marcação
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !user.clinica_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, horario, medico } = await req.json();

    if (!data || !horario || !medico) {
      return Response.json({ error: 'data, horario, medico required' }, { status: 400 });
    }

    // CRITICAL: Buscar conflito no DB (atomic read)
    const conflitos = await base44.asServiceRole.entities.Agendamento.filter({
      clinica_id: user.clinica_id,
      data: data,
      horario: horario,
      medico: medico,
      status: { $ne: "cancelado" } // Excluir cancelados
    });

    if (conflitos.length > 0) {
      return Response.json({
        valido: false,
        conflito: true,
        erro: `Horário ${horario} já ocupado por: ${conflitos[0].paciente_nome}`,
        agendamento_existente: {
          id: conflitos[0].id,
          paciente: conflitos[0].paciente_nome,
          data: conflitos[0].data,
          horario: conflitos[0].horario
        }
      });
    }

    return Response.json({
      valido: true,
      conflito: false
    });

  } catch (error) {
    console.error('Erro ao validar agendamento:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});