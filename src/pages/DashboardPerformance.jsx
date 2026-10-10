import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { AlertTriangle, TrendingUp, TrendingDown, RefreshCw, Activity, Zap, XCircle } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import RouteGuard from "@/components/auth/RouteGuard";
import usePerformanceTracker from "@/components/hooks/usePerformanceTracker";
import { useOptimizedQuery } from "@/components/hooks/useOptimizedQuery";

export default function DashboardPerformance() {
  usePerformanceTracker('/DashboardPerformance');
  const [agregando, setAgregando] = useState(false);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setPageLoading(false), 90);
    return () => clearTimeout(timer);
  }, []);

  const { data: alertas = [], refetch: refetchAlertas, isLoading: loadingAlertas } = useOptimizedQuery({
    queryKey: ['alertas-performance'],
    queryFn: () => base44.entities.AlertaPerformance.filter({ status: 'ativo' })
  });

  const { data: metricas = [], refetch: refetchMetricas } = useOptimizedQuery({
    queryKey: ['metricas-performance'],
    queryFn: async () => {
      const res = await base44.functions.invoke('agregadorMetricas', { janela_horas: 24 });
      return res.data;
    }
  });

  const atualizarMetricas = async () => {
    setAgregando(true);
    await refetchMetricas();
    await refetchAlertas();
    setUltimaAtualizacao(new Date());
    setAgregando(false);
  };

  const endpoints = Object.keys(metricas.metricas || {});
  
  // Dados para gráfico de latência
  const chartData = endpoints.map(endpoint => ({
    name: endpoint.replace('/pages/', '').replace('.jsx', ''),
    P50: metricas.metricas?.[endpoint]?.p50 || 0,
    P95: metricas.metricas?.[endpoint]?.p95 || 0,
    P99: metricas.metricas?.[endpoint]?.p99 || 0,
  }));

  // Alertas críticos
  const alertasCriticos = alertas.filter(a => a.severidade === 'critica');

  if (pageLoading || loadingAlertas) {
    return (
      <RouteGuard requireAuth={true} requireClinica={true}>
        <div className="space-y-6 overflow-x-hidden animate-pulse">
          <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: '#e8eaed' }}>
            <div className="h-8 bg-gray-200 rounded w-48 mb-3" />
            <div className="h-5 bg-gray-200 rounded w-64" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white rounded-2xl p-6 border" style={{ borderColor: '#e8eaed' }}>
                <div className="h-8 bg-gray-200 rounded mb-2" />
                <div className="h-6 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard requireAuth={true} requireClinica={true}>
      <div className="space-y-5 md:space-y-6 overflow-x-hidden min-w-0">
      <PageHeader
        title="Performance"
        description="Métricas P95/P99"
        action={
          <button
            onClick={atualizarMetricas}
            disabled={agregando}
            aria-label="Atualizar métricas"
            className="font-bold rounded-full hover:opacity-90 min-h-[48px] px-6 flex items-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: '#7E57FF', color: '#ffffff', fontSize: '15px' }}
          >
            {agregando ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0" />
            ) : (
              <RefreshCw className="w-4 h-4 flex-shrink-0" />
            )}
            Atualizar
          </button>
        }
      />

      {ultimaAtualizacao && (
        <p className="text-sm text-[var(--pc-text-tertiary)] mb-4">
          Última atualização: {ultimaAtualizacao.toLocaleTimeString()}
        </p>
      )}

      {/* Alertas críticos */}
      {alertasCriticos.length > 0 && (
        <Card className="p-4 mb-6 bg-red-50 border-red-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 mb-2">
                {alertasCriticos.length} Alerta(s) Crítico(s)
              </h3>
              <div className="space-y-2">
                {alertasCriticos.map((alerta, i) => (
                  <div key={i} className="text-sm text-red-800">
                    <strong>{alerta.endpoint}</strong>: {alerta.metrica} = {alerta.valor_atual}{alerta.metrica === 'P95' ? 'ms' : '%'} 
                    {' '}(meta: {alerta.valor_meta}{alerta.metrica === 'P95' ? 'ms' : '%'})
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 overflow-hidden">
        <div className="bg-white rounded-2xl p-5 border overflow-hidden" style={{ borderColor: '#e8eaed' }}>
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 flex-shrink-0" style={{ color: '#1a73e8' }} />
            <div className="min-w-0">
              <p className="truncate" style={{ color: '#80868b', fontSize: '14px' }}>Total Medições</p>
              <p className="font-bold" style={{ color: '#202124', fontSize: '24px' }}>{metricas.total_medicoes || 0}</p>
            </div>
          </div>
        </div>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Zap className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-[var(--pc-text-secondary)]">Endpoints OK</p>
              <p className="text-2xl font-semibold">
                {endpoints.filter(e => (metricas.metricas?.[e]?.p95 || 0) < 200).length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <TrendingDown className="w-8 h-8 text-red-600" />
            <div>
              <p className="text-sm text-[var(--pc-text-secondary)]">Endpoints Lentos</p>
              <p className="text-2xl font-semibold text-red-600">
                {endpoints.filter(e => (metricas.metricas?.[e]?.p95 || 0) >= 200).length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <XCircle className="w-8 h-8 text-yellow-600" />
            <div>
              <p className="text-sm text-[var(--pc-text-secondary)]">Alertas Ativos</p>
              <p className="text-2xl font-semibold">{alertas.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Gráfico de latência */}
      <Card className="p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Latência por Endpoint (24h)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
            <YAxis label={{ value: 'Latência (ms)', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Bar dataKey="P50" fill="#34a853" name="P50" />
            <Bar dataKey="P95" fill="#fbbc04" name="P95" />
            <Bar dataKey="P99" fill="#ea4335" name="P99" />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-600 rounded" />
            <span>P50 (Mediana)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-600 rounded" />
            <span>P95 (Meta: &lt;200ms)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-600 rounded" />
            <span>P99 (Tail latency)</span>
          </div>
        </div>
      </Card>

      {/* Tabela de endpoints */}
      <div className="bg-white rounded-2xl p-6 border overflow-hidden" style={{ borderColor: '#e8eaed' }}>
        <h3 className="font-bold mb-4 break-words" style={{ color: '#202124', fontSize: '18px' }}>Detalhamento por Endpoint</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f3f4' }}>
                <th className="text-left py-3 font-bold" style={{ color: '#5f6368', fontSize: '14px' }}>Endpoint</th>
                <th className="text-right py-3 font-bold" style={{ color: '#5f6368', fontSize: '14px' }}>P50</th>
                <th className="text-right py-3 font-bold" style={{ color: '#5f6368', fontSize: '14px' }}>P95</th>
                <th className="text-right py-3 font-bold" style={{ color: '#5f6368', fontSize: '14px' }}>P99</th>
                <th className="text-right py-3 font-bold" style={{ color: '#5f6368', fontSize: '14px' }}>Taxa Erro</th>
                <th className="text-right py-3 font-bold" style={{ color: '#5f6368', fontSize: '14px' }}>Requisições</th>
              </tr>
            </thead>
            <tbody>
              {endpoints.map((endpoint, i) => {
                const dados = metricas.metricas[endpoint];
                const p95Excedido = dados.p95 > 200;
                return (
                  <tr key={i} className="border-b border-[var(--pc-border-secondary)]">
                    <td className="py-3">{endpoint}</td>
                    <td className="text-right">{dados.p50}ms</td>
                    <td className={`text-right font-semibold ${p95Excedido ? 'text-red-600' : 'text-green-600'}`}>
                      {dados.p95}ms {p95Excedido && '⚠️'}
                    </td>
                    <td className="text-right">{dados.p99}ms</td>
                    <td className="text-right">{dados.taxa_erro}</td>
                    <td className="text-right">{dados.total_requisicoes}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </RouteGuard>
  );
}