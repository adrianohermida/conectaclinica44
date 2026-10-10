import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * GET PORTAL TIMELINE - Backend retorna timeline pronta
 * FASE 3: Remove filtros frontend, backend processa tudo
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (!user.clinica_id) {
      return Response.json({ error: 'Usuário sem clínica' }, { status: 403 });
    }

    const contatoId = user.contato_id || user.paciente_id;

    if (!contatoId) {
      return Response.json({ error: 'Usuário não é paciente' }, { status: 403 });
    }

    console.log('📅 [TIMELINE] Gerando para contato:', contatoId);

    // Buscar dados em paralelo
    const [agendamentos, prontuarios, tickets] = await Promise.all([
      base44.asServiceRole.entities.Agendamento.filter({ 
        paciente_id: contatoId,
        clinica_id: user.clinica_id
      }),
      base44.asServiceRole.entities.Prontuario.filter({ 
        paciente_id: contatoId,
        clinica_id: user.clinica_id
      }),
      base44.asServiceRole.entities.Ticket.filter({ 
        solicitante_email: user.email,
        clinica_id: user.clinica_id
      })
    ]);

    // Montar timeline unificada
    const eventos = [];

    agendamentos.forEach(a => {
      eventos.push({
        tipo: 'agendamento',
        data: a.data,
        hora: a.horario || '00:00',
        timestamp: new Date(`${a.data} ${a.horario || '00:00'}`).getTime(),
        titulo: `Consulta - ${a.especialidade || 'Geral'}`,
        descricao: a.tipo_consulta === 'telemedicina' ? '🎥 Online' : '🏥 Presencial',
        status: a.status,
        metadata: {
          medico: a.medico,
          tipo_consulta: a.tipo_consulta
        }
      });
    });

    prontuarios.forEach(p => {
      eventos.push({
        tipo: 'prontuario',
        data: p.data_atendimento,
        hora: p.hora_atendimento || '00:00',
        timestamp: new Date(`${p.data_atendimento} ${p.hora_atendimento || '00:00'}`).getTime(),
        titulo: `Atendimento - ${p.tipo_atendimento}`,
        descricao: p.hipotese_diagnostica || 'Consulta médica',
        status: p.status_prontuario,
        metadata: {
          medico: p.medico_nome,
          conduta: p.conduta
        }
      });
    });

    tickets.forEach(t => {
      eventos.push({
        tipo: 'ticket',
        data: t.created_date.split('T')[0],
        hora: new Date(t.created_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        timestamp: new Date(t.created_date).getTime(),
        titulo: `Ticket ${t.numero_ticket}`,
        descricao: t.assunto,
        status: t.status,
        metadata: {
          categoria: t.categoria,
          prioridade: t.prioridade
        }
      });
    });

    // Ordenar por timestamp (mais recente primeiro)
    eventos.sort((a, b) => b.timestamp - a.timestamp);

    console.log('✅ [TIMELINE] Eventos encontrados:', eventos.length);

    return Response.json({ 
      eventos,
      total: eventos.length
    });

  } catch (error) {
    console.error('❌ [TIMELINE] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});