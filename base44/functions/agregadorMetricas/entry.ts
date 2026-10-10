import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Agregador de métricas - Calcula P50/P95/P99
 * Executa periodicamente (cron) ou sob demanda
 * Gera alertas se P95 > 200ms
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { janela_horas = 1 } = await req.json().catch(() => ({}));

    const agora = new Date();
    const inicio = new Date(agora.getTime() - janela_horas * 60 * 60 * 1000);

    // Buscar todas métricas do período
    const metricas = await base44.asServiceRole.entities.MetricaPerformance.list();
    const metricasPeriodo = metricas.filter(m => 
      new Date(m.timestamp) >= inicio && new Date(m.timestamp) <= agora
    );

    // Agrupar por endpoint
    const porEndpoint = {};
    metricasPeriodo.forEach(m => {
      if (!porEndpoint[m.endpoint]) {
        porEndpoint[m.endpoint] = { latencias: [], erros: 0, total: 0 };
      }
      porEndpoint[m.endpoint].total++;
      if (m.metrica_tipo === 'latencia' || m.metrica_tipo === 'render') {
        porEndpoint[m.endpoint].latencias.push(m.valor);
      }
      if (m.metrica_tipo === 'erro') {
        porEndpoint[m.endpoint].erros++;
      }
    });

    // Calcular percentis
    const calcularPercentil = (arr, p) => {
      if (arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const idx = Math.ceil((p / 100) * sorted.length) - 1;
      return sorted[idx];
    };

    const resultado = {};
    const alertas = [];

    for (const [endpoint, dados] of Object.entries(porEndpoint)) {
      const p50 = calcularPercentil(dados.latencias, 50);
      const p95 = calcularPercentil(dados.latencias, 95);
      const p99 = calcularPercentil(dados.latencias, 99);
      const taxaErro = dados.erros / dados.total;

      resultado[endpoint] = {
        p50: Math.round(p50),
        p95: Math.round(p95),
        p99: Math.round(p99),
        taxa_erro: (taxaErro * 100).toFixed(2) + '%',
        total_requisicoes: dados.total,
      };

      // Alertas
      if (p95 > 200) {
        alertas.push({
          endpoint,
          metrica: 'P95',
          valor_atual: Math.round(p95),
          valor_meta: 200,
          severidade: p95 > 500 ? 'critica' : 'alta',
          status: 'ativo',
          data_deteccao: new Date().toISOString(),
        });
      }

      if (taxaErro > 0.01) { // > 1%
        alertas.push({
          endpoint,
          metrica: 'taxa_erro',
          valor_atual: parseFloat((taxaErro * 100).toFixed(2)),
          valor_meta: 1,
          severidade: taxaErro > 0.05 ? 'critica' : 'alta',
          status: 'ativo',
          data_deteccao: new Date().toISOString(),
        });
      }
    }

    // Salvar alertas
    for (const alerta of alertas) {
      // Checar se já existe alerta ativo
      const existente = await base44.asServiceRole.entities.AlertaPerformance.filter({
        endpoint: alerta.endpoint,
        metrica: alerta.metrica,
        status: 'ativo',
      });

      if (existente.length === 0) {
        await base44.asServiceRole.entities.AlertaPerformance.create(alerta);
      }
    }

    return Response.json({
      periodo: { inicio: inicio.toISOString(), fim: agora.toISOString() },
      metricas: resultado,
      alertas_gerados: alertas.length,
      total_medicoes: metricasPeriodo.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});