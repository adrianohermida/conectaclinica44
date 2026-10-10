import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Exporta relatório de atendimento em CSV
 * Métricas: SLA, volume, sentimento, resolução
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user?.clinica_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { periodo_dias = 30, formato = 'csv' } = await req.json().catch(() => ({}));

    // Buscar tickets
    const tickets = await base44.entities.Ticket.filter(
      { clinica_id: user.clinica_id },
      '-created_date',
      1000
    );

    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - periodo_dias);
    const ticketsPeriodo = tickets.filter(t => new Date(t.created_date) >= dataInicio);

    // Métricas agregadas
    const metricas = {
      total_tickets: ticketsPeriodo.length,
      resolvidos: ticketsPeriodo.filter(t => ['resolvido', 'fechado'].includes(t.status)).length,
      tempo_medio_primeira_resposta: 0,
      tempo_medio_resolucao: 0,
      taxa_resolucao: 0,
      por_canal: {},
      por_categoria: {},
      por_prioridade: {}
    };

    // Calcular tempos
    const comPrimeiraResposta = ticketsPeriodo.filter(t => t.tempo_primeira_resposta);
    if (comPrimeiraResposta.length > 0) {
      metricas.tempo_medio_primeira_resposta = Math.round(
        comPrimeiraResposta.reduce((acc, t) => acc + t.tempo_primeira_resposta, 0) / comPrimeiraResposta.length
      );
    }

    const comResolucao = ticketsPeriodo.filter(t => t.tempo_resolucao);
    if (comResolucao.length > 0) {
      metricas.tempo_medio_resolucao = Math.round(
        comResolucao.reduce((acc, t) => acc + t.tempo_resolucao, 0) / comResolucao.length
      );
    }

    metricas.taxa_resolucao = ticketsPeriodo.length > 0
      ? Math.round((metricas.resolvidos / ticketsPeriodo.length) * 100)
      : 0;

    // Agregações
    ticketsPeriodo.forEach(t => {
      metricas.por_canal[t.canal] = (metricas.por_canal[t.canal] || 0) + 1;
      metricas.por_categoria[t.categoria] = (metricas.por_categoria[t.categoria] || 0) + 1;
      metricas.por_prioridade[t.prioridade] = (metricas.por_prioridade[t.prioridade] || 0) + 1;
    });

    if (formato === 'json') {
      return Response.json({
        success: true,
        periodo: `${periodo_dias} dias`,
        metricas,
        tickets: ticketsPeriodo.map(t => ({
          id: t.numero_ticket,
          assunto: t.assunto,
          status: t.status,
          prioridade: t.prioridade,
          canal: t.canal,
          categoria: t.categoria,
          criado_em: t.created_date,
          tempo_primeira_resposta: t.tempo_primeira_resposta || 0,
          tempo_resolucao: t.tempo_resolucao || 0
        }))
      });
    }

    // CSV
    const linhas = [
      'Ticket,Assunto,Status,Prioridade,Canal,Categoria,Criado,Tempo 1ª Resposta (min),Tempo Resolução (min)'
    ];

    ticketsPeriodo.forEach(t => {
      linhas.push([
        t.numero_ticket || t.id.slice(0, 8),
        `"${t.assunto.replace(/"/g, '""')}"`,
        t.status,
        t.prioridade,
        t.canal,
        t.categoria || '',
        new Date(t.created_date).toISOString().split('T')[0],
        t.tempo_primeira_resposta || 0,
        t.tempo_resolucao || 0
      ].join(','));
    });

    // Adicionar linha de resumo
    linhas.push('');
    linhas.push('RESUMO DO PERÍODO');
    linhas.push(`Total de Tickets,${metricas.total_tickets}`);
    linhas.push(`Resolvidos,${metricas.resolvidos}`);
    linhas.push(`Taxa Resolução,${metricas.taxa_resolucao}%`);
    linhas.push(`Tempo Médio 1ª Resposta,${metricas.tempo_medio_primeira_resposta} min`);
    linhas.push(`Tempo Médio Resolução,${Math.round(metricas.tempo_medio_resolucao / 60)} horas`);

    const csv = linhas.join('\n');
    const bom = '\uFEFF'; // UTF-8 BOM para Excel

    return new Response(bom + csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="relatorio-atendimento-${periodo_dias}d.csv"`
      }
    });

  } catch (error) {
    console.error('Erro exportarRelatorioAtendimento:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});