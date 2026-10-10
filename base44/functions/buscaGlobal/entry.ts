import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * BUSCA GLOBAL - Backend Unificado
 * 
 * Busca em múltiplas entidades com isolamento multi-tenant
 * e retorno otimizado com highlighting de resultados
 * 
 * MÉTRICA: Latência P95 < 500ms
 */

Deno.serve(async (req) => {
  const startTime = Date.now();
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user.clinica_id) {
      return Response.json({ error: 'clinica_id obrigatório' }, { status: 400 });
    }

    const { payload } = await req.json();
    const { query = '', limit = 20 } = payload || {};

    if (!query || query.trim().length < 2) {
      return Response.json({ 
        success: true,
        resultados: [],
        metrics: { total: 0, latency_ms: Date.now() - startTime }
      });
    }

    const queryLower = query.toLowerCase().trim();
    const clinicaId = user.clinica_id;

    console.log(`[BuscaGlobal] Query: "${query}" | Clinica: ${clinicaId}`);

    // Busca paralela em múltiplas entidades
    const [pacientes, agendamentos, prontuarios, tickets] = await Promise.all([
      // Pacientes
      base44.entities.Contato.filter({
        clinica_id: clinicaId,
        tipo_contato: 'paciente'
      }, '-created_date', limit).catch(() => []),

      // Agendamentos
      base44.entities.Agendamento.filter({
        clinica_id: clinicaId
      }, '-data_hora', limit).catch(() => []),

      // Prontuários
      base44.entities.Prontuario.filter({
        clinica_id: clinicaId
      }, '-created_date', limit).catch(() => []),

      // Tickets
      base44.entities.Ticket.filter({
        clinica_id: clinicaId
      }, '-created_date', limit).catch(() => [])
    ]);

    // Filtro client-side (busca fuzzy)
    const matchQuery = (texto) => {
      if (!texto) return false;
      return texto.toLowerCase().includes(queryLower);
    };

    const resultadosPacientes = pacientes
      .filter(p => 
        matchQuery(p.nome_completo) ||
        matchQuery(p.cpf) ||
        matchQuery(p.telefone) ||
        matchQuery(p.email)
      )
      .map(p => ({
        tipo: 'paciente',
        id: p.id,
        titulo: p.nome_completo,
        subtitulo: p.telefone || p.email,
        url: `/PacienteDetalhes?id=${p.id}`,
        destacado: highlightMatch(p.nome_completo, query),
        data: p.created_date
      }));

    const resultadosAgendamentos = agendamentos
      .filter(a => 
        matchQuery(a.paciente_nome) ||
        matchQuery(a.motivo) ||
        matchQuery(a.medico_nome)
      )
      .map(a => ({
        tipo: 'agendamento',
        id: a.id,
        titulo: a.paciente_nome,
        subtitulo: `${a.data_hora ? new Date(a.data_hora).toLocaleDateString('pt-BR') : ''} - ${a.motivo || 'Consulta'}`,
        url: `/Agenda?id=${a.id}`,
        destacado: highlightMatch(a.paciente_nome, query),
        data: a.data_hora
      }));

    const resultadosProntuarios = prontuarios
      .filter(pr => 
        matchQuery(pr.paciente_nome) ||
        matchQuery(pr.diagnostico) ||
        matchQuery(pr.anamnese)
      )
      .map(pr => ({
        tipo: 'prontuario',
        id: pr.id,
        titulo: `Prontuário - ${pr.paciente_nome}`,
        subtitulo: pr.diagnostico || 'Sem diagnóstico',
        url: `/Prontuarios?id=${pr.id}`,
        destacado: highlightMatch(pr.paciente_nome, query),
        data: pr.created_date
      }));

    const resultadosTickets = tickets
      .filter(t => 
        matchQuery(t.titulo) ||
        matchQuery(t.descricao) ||
        matchQuery(t.contato_nome)
      )
      .map(t => ({
        tipo: 'ticket',
        id: t.id,
        titulo: t.titulo,
        subtitulo: t.contato_nome || 'Ticket de suporte',
        url: `/Helpdesk?id=${t.id}`,
        destacado: highlightMatch(t.titulo, query),
        data: t.created_date
      }));

    // Consolidar e ordenar por relevância
    const todos = [
      ...resultadosPacientes,
      ...resultadosAgendamentos,
      ...resultadosProntuarios,
      ...resultadosTickets
    ].slice(0, limit);

    const latency = Date.now() - startTime;

    console.log(`[BuscaGlobal] ✅ ${todos.length} resultados | ${latency}ms`);

    return Response.json({
      success: true,
      resultados: todos,
      metrics: {
        total: todos.length,
        latency_ms: latency,
        por_tipo: {
          pacientes: resultadosPacientes.length,
          agendamentos: resultadosAgendamentos.length,
          prontuarios: resultadosProntuarios.length,
          tickets: resultadosTickets.length
        }
      }
    });

  } catch (error) {
    console.error('[BuscaGlobal] ERRO:', error);
    return Response.json({ 
      error: error.message,
      latency_ms: Date.now() - startTime
    }, { status: 500 });
  }
});

function highlightMatch(texto, query) {
  if (!texto || !query) return texto;
  
  const regex = new RegExp(`(${query})`, 'gi');
  return texto.replace(regex, '<mark>$1</mark>');
}