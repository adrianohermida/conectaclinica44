import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * RELATÓRIO CONSUMO MENSAL - SuperAdmin
 * 
 * Agregação semanal/mensal de ConsumoRecurso
 * Usado para billing, analytics e pricing otimization
 * 
 * Retorna:
 * - Consumo por clínica
 * - Breakdown por tipo_recurso
 * - Custo total estimado
 * - Sugestões de upgrade
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: apenas SuperAdmin' }, { status: 403 });
    }

    const { periodo = 'mes_atual' } = await req.json();

    // Calcular data início/fim
    const hoje = new Date();
    let dataInicio, dataFim;

    if (periodo === 'mes_atual') {
      dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    } else if (periodo === 'mes_anterior') {
      dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      dataFim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
    } else {
      dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 7);
      dataFim = hoje;
    }

    const dataInicioStr = formatDate(dataInicio);
    const dataFimStr = formatDate(dataFim);

    // Fetch todos os consumos
    const consumos = await base44.asServiceRole.entities.ConsumoRecurso.list('-data_consumo', 10000);

    const consumosFiltrados = consumos.filter(c => 
      c.data_consumo >= dataInicioStr && c.data_consumo <= dataFimStr
    );

    // Agregar por clínica
    const agregadoPorClinica = {};

    consumosFiltrados.forEach(c => {
      if (!agregadoPorClinica[c.clinica_id]) {
        agregadoPorClinica[c.clinica_id] = {
          clinica_id: c.clinica_id,
          total_consumos: 0,
          custo_total: 0,
          por_tipo: {}
        };
      }

      agregadoPorClinica[c.clinica_id].total_consumos += c.quantidade || 0;
      agregadoPorClinica[c.clinica_id].custo_total += c.custo_estimado || 0;

      if (!agregadoPorClinica[c.clinica_id].por_tipo[c.tipo_recurso]) {
        agregadoPorClinica[c.clinica_id].por_tipo[c.tipo_recurso] = {
          quantidade: 0,
          custo: 0
        };
      }

      agregadoPorClinica[c.clinica_id].por_tipo[c.tipo_recurso].quantidade += c.quantidade || 0;
      agregadoPorClinica[c.clinica_id].por_tipo[c.tipo_recurso].custo += c.custo_estimado || 0;
    });

    // Buscar nomes clínicas
    const clinicaIds = Object.keys(agregadoPorClinica);
    const clinicas = await base44.asServiceRole.entities.Clinica.list('-created_date', 100);
    const clinicasMap = {};
    clinicas.forEach(c => {
      clinicasMap[c.id] = c.nome;
    });

    const relatorio = Object.values(agregadoPorClinica).map(c => ({
      ...c,
      clinica_nome: clinicasMap[c.clinica_id] || 'Desconhecida'
    }));

    // Totais gerais
    const totais = relatorio.reduce((acc, r) => ({
      consumos: acc.consumos + r.total_consumos,
      custo: acc.custo + r.custo_total
    }), { consumos: 0, custo: 0 });

    return Response.json({
      success: true,
      periodo: { inicio: dataInicioStr, fim: dataFimStr },
      totais,
      por_clinica: relatorio.sort((a, b) => b.custo_total - a.custo_total),
      gerado_em: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    return Response.json({ 
      error: error.message,
      details: error.stack
    }, { status: 500 });
  }
});

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}