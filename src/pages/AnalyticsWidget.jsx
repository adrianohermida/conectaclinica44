import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import RouteGuard from "@/components/auth/RouteGuard";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { DollarSign, TrendingUp, AlertCircle, Zap, Building2, Loader2 } from "lucide-react";

export default function AnalyticsWidget() {
  return (
    <RouteGuard requireAuth requireClinica={false}>
      <AnalyticsWidgetContent />
    </RouteGuard>
  );
}

function AnalyticsWidgetContent() {
  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me(),
  });

  const { data: consumos, isLoading: loadingConsumos } = useQuery({
    queryKey: ["consumos-widget-global"],
    queryFn: () => base44.entities.ConsumoWidgetIA.list('-created_date', 1000),
    enabled: user?.role === 'admin'
  });

  const { data: creditos, isLoading: loadingCreditos } = useQuery({
    queryKey: ["creditos-global"],
    queryFn: () => base44.entities.CreditoIA.list('-created_date', 100),
    enabled: user?.role === 'admin'
  });

  const { data: sessoes, isLoading: loadingSessoes } = useQuery({
    queryKey: ["sessoes-widget-global"],
    queryFn: () => base44.entities.SessaoWidget.list('-created_date', 500),
    enabled: user?.role === 'admin'
  });

  const analytics = useMemo(() => {
    if (!consumos || !creditos || !sessoes) return null;

    // Agrupar por clínica
    const porClinica = {};
    
    consumos.forEach(c => {
      if (!porClinica[c.clinica_id]) {
        porClinica[c.clinica_id] = {
          clinica_id: c.clinica_id,
          custo_total_brl: 0,
          tokens_total: 0,
          creditos_consumidos: 0,
          sessoes: 0
        };
      }
      porClinica[c.clinica_id].custo_total_brl += c.custo_cobrado_brl || 0;
      porClinica[c.clinica_id].tokens_total += c.tokens_total || 0;
      porClinica[c.clinica_id].creditos_consumidos += c.creditos_consumidos || 0;
    });

    sessoes.forEach(s => {
      if (porClinica[s.clinica_id]) {
        porClinica[s.clinica_id].sessoes++;
      }
    });

    // Calcular receita total (saldo_total - saldo_atual)
    const receitaTotal = creditos.reduce((acc, c) => 
      acc + ((c.saldo_total || 0) - (c.saldo || 0)) * 9, 0
    );

    const custoTotal = consumos.reduce((acc, c) => acc + (c.custo_cobrado_brl || 0), 0);
    const margem = receitaTotal > 0 ? ((receitaTotal - custoTotal) / receitaTotal) * 100 : 0;

    // Top 10 clínicas por consumo
    const top10 = Object.values(porClinica)
      .sort((a, b) => b.custo_total_brl - a.custo_total_brl)
      .slice(0, 10);

    // Deficits (consumo > créditos disponíveis)
    const deficits = creditos.filter(c => {
      const clinicaConsumo = porClinica[c.clinica_id];
      return clinicaConsumo && (c.saldo || 0) < (clinicaConsumo.creditos_consumidos * 0.1);
    });

    return {
      receitaTotal,
      custoTotal,
      margem,
      top10,
      deficits,
      totalClinicas: Object.keys(porClinica).length,
      totalSessoes: sessoes.length
    };
  }, [consumos, creditos, sessoes]);

  if (loadingConsumos || loadingCreditos || loadingSessoes) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#7E57FF' }} />
      </div>
    );
  }

  if (!analytics) return null;

  const COLORS = ['#7E57FF', '#34a853', '#fbbc04', '#ea4335', '#0B7A9E'];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Analytics Widget Global"
        description="Monitoramento financeiro IA - Todas clínicas"
        breadcrumbs={[
          { label: "SuperAdmin", url: "/SuperAdmin" },
          { label: "Growth & Suporte" },
          { label: "Analytics Widget" }
        ]}
      />

      {/* KPIs Globais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Receita Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" style={{ color: '#34a853' }}>
              R$ {analytics.receitaTotal.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Recargas de créditos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Custo IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" style={{ color: '#ea4335' }}>
              R$ {analytics.custoTotal.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500 mt-1">LLM Base44 consumido</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Margem
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" style={{ color: '#7E57FF' }}>
              {analytics.margem.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-500 mt-1">Lucro líquido</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Clínicas Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" style={{ color: '#7E57FF' }}>
              {analytics.totalClinicas}
            </div>
            <p className="text-xs text-gray-500 mt-1">{analytics.totalSessoes} sessões</p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas Deficit */}
      {analytics.deficits.length > 0 && (
        <Card className="border-2" style={{ borderColor: '#ea4335', backgroundColor: '#fef2f2' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: '#991b1b' }}>
              <AlertCircle className="w-5 h-5" />
              ⚠️ Clínicas em Deficit ({analytics.deficits.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.deficits.map(c => (
                <div key={c.id} className="p-3 rounded-lg bg-white border flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">Clínica: {c.clinica_id.substring(0, 8)}</p>
                    <p className="text-xs text-gray-600">Saldo: {c.saldo?.toFixed(2)} créditos</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: '#ea4335', color: 'white' }}>
                    CRÍTICO
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top 10 Clínicas por Consumo */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Clínicas - Consumo IA</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={analytics.top10}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8eaed" />
              <XAxis 
                dataKey="clinica_id" 
                tickFormatter={(value) => value.substring(0, 8)}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                label={{ value: 'Custo (R$)', angle: -90, position: 'insideLeft' }}
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                formatter={(value) => `R$ ${value.toFixed(2)}`}
                labelFormatter={(label) => `Clínica: ${label.substring(0, 12)}`}
              />
              <Bar dataKey="custo_total_brl" fill="#7E57FF" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Distribuição Tokens */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição Tokens (Top 5)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.top10.slice(0, 5)}
                  dataKey="tokens_total"
                  nameKey="clinica_id"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(entry) => `${entry.clinica_id.substring(0, 6)}`}
                >
                  {analytics.top10.slice(0, 5).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value} tokens`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sessões por Clínica (Top 5)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.top10.slice(0, 5).map((c, idx) => (
                <div key={c.clinica_id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#f5f3ff' }}>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-lg" style={{ color: '#7E57FF' }}>#{idx + 1}</span>
                    <div>
                      <p className="font-semibold text-sm">{c.clinica_id.substring(0, 12)}</p>
                      <p className="text-xs text-gray-600">{c.creditos_consumidos.toFixed(2)} créditos</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold" style={{ color: '#7E57FF' }}>{c.sessoes}</p>
                    <p className="text-xs text-gray-600">sessões</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}