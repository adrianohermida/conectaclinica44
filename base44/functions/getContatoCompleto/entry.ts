import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contato_id } = await req.json();

    if (!contato_id) {
      return Response.json({ error: 'contato_id obrigatório' }, { status: 400 });
    }

    // AGREGADOR OTIMIZADO: 1 call, 10 registros cada (vs 100) = 500KB → 50KB
    const [contato, prontuarios, agendamentos, documentos, tickets, vendas] = await Promise.all([
      base44.entities.Contato.filter({ id: contato_id }).then(r => r[0]),
      base44.entities.Prontuario.filter({ paciente_id: contato_id }, "-data_atendimento", 10),
      base44.entities.Agendamento.filter({ paciente_id: contato_id }, "-data", 10),
      base44.entities.DocumentoPaciente.filter({ paciente_id: contato_id }, "-created_date", 10),
      base44.entities.Ticket.filter({ contato_id: contato_id }, "-created_date", 10),
      base44.entities.Venda.filter({ paciente_id: contato_id }, "-created_date", 10)
    ]);

    if (!contato) {
      return Response.json({ error: 'Contato não encontrado' }, { status: 404 });
    }

    // CALCULAR MÉTRICAS SERVER-SIDE
    const proximaConsulta = agendamentos.find(a => 
      new Date(`${a.data} ${a.horario || "00:00"}`) > new Date() && a.status !== "cancelado"
    );
    const ultimoProntuario = prontuarios[0];
    const ticketsAbertos = tickets.filter(t => t.status !== "resolvido" && t.status !== "fechado").length;
    const totalVendas = vendas.reduce((acc, v) => acc + (v.valor_final || 0), 0);

    return Response.json({
      contato,
      metricas: {
        prontuarios_count: prontuarios.length,
        agendamentos_count: agendamentos.length,
        documentos_count: documentos.length,
        tickets_count: tickets.length,
        tickets_abertos: ticketsAbertos,
        total_vendas: totalVendas,
        proxima_consulta: proximaConsulta,
        ultimo_prontuario: ultimoProntuario
      },
      dados: {
        prontuarios,
        agendamentos,
        tickets
      }
    }, {
      headers: {
        'Cache-Control': 'max-age=300, stale-while-revalidate=60',
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});