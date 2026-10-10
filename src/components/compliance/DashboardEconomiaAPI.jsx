import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, TrendingDown, Activity, Calendar, Building2, Loader2, CheckCircle2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function DashboardEconomiaAPI() {
  // Buscar consumos do mês atual
  const mesAtual = new Date().toISOString().substring(0, 7); // YYYY-MM

  const { data: consumos = [], isLoading } = useQuery({
    queryKey: ["consumo-infosimples", mesAtual],
    queryFn: () => base44.entities.ConsumoRecurso.filter({
      recurso: { $in: ['infosimples_consulta', 'infosimples_consulta_cached'] },
      mes_referencia: mesAtual
    }, "-created_date", 500),
    staleTime: 30 * 1000
  });

  const { data: clinicas = [] } = useQuery({
    queryKey: ["clinicas-compliance"],
    queryFn: async () => {
      const res = await base44.functions.invoke('listarClinicas', {});
      return res.data.clinicas || [];
    }
  });

  // Métricas
  const metricas = useMemo(() => {
    const apiCalls = consumos.filter(c => c.recurso === 'infosimples_consulta');
    const cacheHits = consumos.filter(c => c.recurso === 'infosimples_consulta_cached');
    
    const custoTotal = apiCalls.reduce((acc, c) => acc + (c.custo_unitario_brl || 0), 0);
    const economiaTotal = cacheHits.reduce((acc, c) => acc + (c.economia_brl || 0), 0);
    
    const totalRequests = apiCalls.length + cacheHits.length;
    const cacheHitRate = totalRequests > 0 ? ((cacheHits.length / totalRequests) * 100).toFixed(1) : 0;
    
    const custoSemCache = totalRequests * 5.00; // Se TODAS fossem API calls
    const economiaReal = custoSemCache - custoTotal;

    // Custo projetado mês completo
    const diasDecorridos = new Date().getDate();
    const diasNoMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const custoProjetado = (custoTotal / diasDecorridos) * diasNoMes;

    // Top clínicas por consumo
    const consumoPorClinica = {};
    consumos.forEach(c => {
      if (!consumoPorClinica[c.clinica_id]) {
        consumoPorClinica[c.clinica_id] = { api_calls: 0, cache_hits: 0, custo: 0 };
      }
      if (c.recurso === 'infosimples_consulta') {
        consumoPorClinica[c.clinica_id].api_calls++;
        consumoPorClinica[c.clinica_id].custo += (c.custo_unitario_brl || 0);
      } else {
        consumoPorClinica[c.clinica_id].cache_hits++;
      }
    });

    const topClinicas = Object.entries(consumoPorClinica)
      .map(([clinica_id, stats]) => {
        const clinica = clinicas.find(c => c.id === clinica_id);
        return {
          clinica_id,
          nome: clinica?.nome || clinica_id.substring(0, 12),
          ...stats,
          total: stats.api_calls + stats.cache_hits
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // Chart: Consumo diário
    const inicio = startOfMonth(new Date());
    const fim = endOfMonth(new Date());
    const dias = eachDayOfInterval({ start: inicio, end: fim });
    
    const dadosDiarios = dias.map(dia => {
      const diaStr = format(dia, 'yyyy-MM-dd');
      const consumosDia = consumos.filter(c => 
        c.created_date.startsWith(diaStr)
      );
      
      const apiCallsDia = consumosDia.filter(c => c.recurso === 'infosimples_consulta').length;
      const cacheDia = consumosDia.filter(c => c.recurso === 'infosimples_consulta_cached').length;
      const custoDia = consumosDia
        .filter(c => c.recurso === 'infosimples_consulta')
        .reduce((acc, c) => acc + (c.custo_unitario_brl || 0), 0);

      return {
        dia: format(dia, 'dd/MM'),
        api_calls: apiCallsDia,
        cache_hits: cacheDia,
        custo: custoDia
      };
    });

    return {
      totalRequests,
      apiCalls: apiCalls.length,
      cacheHits: cacheHits.length,
      cacheHitRate,
      custoTotal,
      economiaTotal,
      economiaReal,
      custoProjetado,
      topClinicas,
      dadosDiarios,
      latenciaMediaCache: cacheHits.length > 0 
        ? cacheHits.reduce((acc, c) => acc + (c.metadata?.latencia_ms || 0), 0) / cacheHits.length 
        : 0,
      latenciaMediaAPI: apiCalls.length > 0
        ? apiCalls.reduce((acc, c) => acc + (c.metadata?.latencia_ms || 0), 0) / apiCalls.length
        : 0
    };
  }, [consumos, clinicas]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs Críticos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border" style={{ borderColor: '#e8eaed' }}>
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className="w-5 h-5" style={{ color: '#34a853' }} />
            <p className="text-xs text-gray-500">Cache Hit Rate</p>
          </div>
          <p className="text-3xl font-bold text-green-600">{metricas.cacheHitRate}%</p>
          <p className="text-xs text-gray-500 mt-1">{metricas.cacheHits} hits / {metricas.totalRequests} total</p>
        </div>

        <div className="bg-white rounded-xl p-5 border" style={{ borderColor: '#e8eaed' }}>
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-5 h-5" style={{ color: '#ea4335' }} />
            <p className="text-xs text-gray-500">Custo Mês Atual</p>
          </div>
          <p className="text-3xl font-bold text-red-600">R$ {metricas.custoTotal.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">{metricas.apiCalls} API calls</p>
        </div>

        <div className="bg-white rounded-xl p-5 border" style={{ borderColor: '#e8eaed' }}>
          <div className="flex items-center gap-3 mb-2">
            <TrendingDown className="w-5 h-5" style={{ color: '#34a853' }} />
            <p className="text-xs text-gray-500">Economia com Cache</p>
          </div>
          <p className="text-3xl font-bold text-green-600">R$ {metricas.economiaReal.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">vs. sem cache</p>
        </div>

        <div className="bg-white rounded-xl p-5 border" style={{ borderColor: '#e8eaed' }}>
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-5 h-5" style={{ color: '#fbbc04' }} />
            <p className="text-xs text-gray-500">Projeção Mensal</p>
          </div>
          <p className="text-3xl font-bold text-yellow-600">R$ {metricas.custoProjetado.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">Estimativa fim do mês</p>
        </div>
      </div>

      {/* Alerta Economia */}
      {metricas.economiaReal > 50 && (
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-600 flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-green-900 mb-1">
                💰 R$ {metricas.economiaReal.toFixed(2)} economizados este mês
              </h3>
              <p className="text-sm text-green-700">
                Cache evitou {metricas.cacheHits} consultas desnecessárias. 
                Sem cache, você teria gasto R$ {(metricas.custoTotal + metricas.economiaReal).toFixed(2)}.
              </p>
              <p className="text-xs text-green-600 mt-2">
                📊 ROI anual projetado: R$ {(metricas.economiaReal * 12).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Chart: Evolução Diária */}
      <div className="bg-white rounded-xl p-6 border" style={{ borderColor: '#e8eaed' }}>
        <h3 className="font-bold text-gray-900 mb-4">Consumo Diário (Mês Atual)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={metricas.dadosDiarios}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8eaed" />
            <XAxis dataKey="dia" stroke="#5f6368" style={{ fontSize: 12 }} />
            <YAxis stroke="#5f6368" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e8eaed',
                borderRadius: '12px'
              }}
            />
            <Line type="monotone" dataKey="api_calls" stroke="#ea4335" name="API Calls" strokeWidth={2} />
            <Line type="monotone" dataKey="cache_hits" stroke="#34a853" name="Cache Hits" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top 10 Clínicas */}
      <div className="bg-white rounded-xl p-6 border" style={{ borderColor: '#e8eaed' }}>
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5" style={{ color: '#7E57FF' }} />
          Top 10 Clínicas por Consumo
        </h3>
        <div className="space-y-3">
          {metricas.topClinicas.map((item, idx) => {
            const hitRate = item.total > 0 ? ((item.cache_hits / item.total) * 100).toFixed(1) : 0;
            return (
              <div key={item.clinica_id} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm" style={{ backgroundColor: '#f5f3ff', color: '#7E57FF' }}>
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 truncate">{item.nome}</span>
                    <span className="text-sm font-bold text-gray-600">{item.total} consultas</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-gray-500">API: </span>
                      <span className="font-bold text-red-600">{item.api_calls}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Cache: </span>
                      <span className="font-bold text-green-600">{item.cache_hits}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Custo: </span>
                      <span className="font-bold text-gray-900">R$ {item.custo.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full bg-green-600" 
                        style={{ width: `${hitRate}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Hit rate: {hitRate}%</p>
                  </div>
                </div>
              </div>
            );
          })}
          {metricas.topClinicas.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhuma consulta registrada este mês</p>
            </div>
          )}
        </div>
      </div>

      {/* Métricas Performance */}
      <div className="bg-white rounded-xl p-6 border" style={{ borderColor: '#e8eaed' }}>
        <h3 className="font-bold text-gray-900 mb-4">Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Latência Cache</span>
              <span className="text-2xl font-bold text-green-600">{metricas.latenciaMediaCache.toFixed(0)}ms</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="h-2 rounded-full bg-green-600" style={{ width: '15%' }} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Latência API</span>
              <span className="text-2xl font-bold text-red-600">{metricas.latenciaMediaAPI.toFixed(0)}ms</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="h-2 rounded-full bg-red-600" style={{ width: '80%' }} />
            </div>
          </div>
        </div>
        <div className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-200">
          <p className="text-sm text-blue-800">
            ⚡ Cache é <strong>{(metricas.latenciaMediaAPI / metricas.latenciaMediaCache).toFixed(1)}x mais rápido</strong> que API
          </p>
        </div>
      </div>
    </div>
  );
}