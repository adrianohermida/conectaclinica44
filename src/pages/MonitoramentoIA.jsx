import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Brain, TrendingUp, DollarSign, Zap, Clock, Users } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays } from "date-fns";
import { useAuth } from "../components/hooks/useAuth";
import RouteGuard from "@/components/auth/RouteGuard";
import usePerformanceTracker from "@/components/hooks/usePerformanceTracker";
import { useOptimizedQuery } from "@/components/hooks/useOptimizedQuery";

export default function MonitoramentoIA() {
  usePerformanceTracker('/MonitoramentoIA');
  const { isAdmin } = useAuth();

  const { data: metricas = [] } = useOptimizedQuery({
    queryKey: ["metricas-ia"],
    queryFn: () => base44.entities.MetricasIA.list("-data", 30)
  });

  const { data: cacheEntries = [] } = useOptimizedQuery({
    queryKey: ["cache-ia"],
    queryFn: () => base44.entities.CacheIA.list("-ultima_utilizacao", 100)
  });

  const hoje = new Date();
  const ultimos7Dias = useMemo(() => {
    const dados = [];
    for (let i = 6; i >= 0; i--) {
      const dia = subDays(hoje, i);
      const dataStr = format(dia, "yyyy-MM-dd");
      const metricaDia = metricas.filter(m => m.data === dataStr);
      
      const totalChamadas = metricaDia.reduce((acc, m) => acc + m.total_chamadas, 0);
      const cacheHits = metricaDia.reduce((acc, m) => acc + m.cache_hits, 0);
      const custo = metricaDia.reduce((acc, m) => acc + m.custo_total_usd, 0);
      
      dados.push({
        dia: format(dia, "dd/MM"),
        chamadas: totalChamadas,
        cache: cacheHits,
        custo: custo.toFixed(2)
      });
    }
    return dados;
  }, [metricas]);

  const estatisticas = useMemo(() => {
    const totalChamadas = metricas.reduce((acc, m) => acc + m.total_chamadas, 0);
    const totalCache = metricas.reduce((acc, m) => acc + m.cache_hits, 0);
    const custoTotal = metricas.reduce((acc, m) => acc + m.custo_total_usd, 0);
    const economiaTotal = metricas.reduce((acc, m) => acc + m.economia_cache_usd, 0);
    const taxaCache = totalChamadas > 0 ? (totalCache / totalChamadas * 100).toFixed(1) : 0;
    
    return {
      totalChamadas,
      totalCache,
      custoTotal,
      economiaTotal,
      taxaCache
    };
  }, [metricas]);

  const porTipo = useMemo(() => {
    const tipos = {};
    metricas.forEach(m => {
      if (!tipos[m.tipo_analise]) {
        tipos[m.tipo_analise] = { chamadas: 0, custo: 0 };
      }
      tipos[m.tipo_analise].chamadas += m.total_chamadas;
      tipos[m.tipo_analise].custo += m.custo_total_usd;
    });
    return Object.entries(tipos).map(([tipo, data]) => ({ tipo, ...data }));
  }, [metricas]);

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto">
        <PageHeader title="Monitoramento IA" description="Acesso restrito" />
        <div className="bg-yellow-50 rounded-lg p-8 text-center border border-yellow-200">
          <p className="text-yellow-800 font-medium">Acesso restrito a administradores</p>
        </div>
      </div>
    );
  }

  return (
    <RouteGuard requireAuth={true} requireClinica={true}>
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
      <PageHeader
        title="Monitoramento IA"
        description="Custos e performance"
        breadcrumbs={[{ label: "IA" }]}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-4 h-4 text-purple-600" />
            <span className="text-xs text-gray-600">Chamadas</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{estatisticas.totalChamadas}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-green-600" />
            <span className="text-xs text-gray-600">Cache Hits</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{estatisticas.totalCache}</p>
          <p className="text-xs text-green-600 mt-1">{estatisticas.taxaCache}% taxa</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-red-600" />
            <span className="text-xs text-gray-600">Custo Total</span>
          </div>
          <p className="text-xl font-bold text-gray-800">${estatisticas.custoTotal.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-xs text-gray-600">Economia</span>
          </div>
          <p className="text-xl font-bold text-green-600">${estatisticas.economiaTotal.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-gray-600">Entradas Cache</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{cacheEntries.length}</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="font-bold text-gray-800 mb-4">Chamadas por Dia</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={ultimos7Dias}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dia" style={{ fontSize: '12px' }} />
              <YAxis style={{ fontSize: '12px' }} />
              <Tooltip />
              <Bar dataKey="chamadas" fill="#9333ea" name="Total" />
              <Bar dataKey="cache" fill="#22c55e" name="Cache" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="font-bold text-gray-800 mb-4">Custo por Dia (USD)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={ultimos7Dias}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dia" style={{ fontSize: '12px' }} />
              <YAxis style={{ fontSize: '12px' }} />
              <Tooltip />
              <Line type="monotone" dataKey="custo" stroke="#ef4444" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Uso por Tipo */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="font-bold text-gray-800 mb-4">Análises por Tipo</h3>
        <div className="grid gap-3">
          {porTipo.map((item, idx) => (
            <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800 capitalize">{item.tipo.replace(/_/g, " ")}</p>
                  <p className="text-sm text-gray-600">{item.chamadas} chamada(s)</p>
                </div>
                <p className="text-lg font-bold text-gray-800">${item.custo.toFixed(3)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Budget Alert */}
      <div className={`rounded-lg p-4 border ${
        estatisticas.custoTotal > 300 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"
      }`}>
        <p className="text-sm font-medium">
          Budget Mensal: ${estatisticas.custoTotal.toFixed(2)} / $300.00 
          {estatisticas.custoTotal > 300 && " ⚠️ Acima do limite!"}
        </p>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div 
            className={`h-2 rounded-full ${estatisticas.custoTotal > 300 ? "bg-red-600" : "bg-green-600"}`}
            style={{ width: `${Math.min((estatisticas.custoTotal / 300) * 100, 100)}%` }}
          ></div>
        </div>
      </div>
      </div>
    </RouteGuard>
  );
}