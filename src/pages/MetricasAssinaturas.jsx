import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/ui/PageHeader";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  CreditCard,
  AlertCircle,
  Calendar,
  BarChart3
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import RouteGuard from "@/components/auth/RouteGuard";
import usePerformanceTracker from "@/components/hooks/usePerformanceTracker";
import { useOptimizedQuery } from "@/components/hooks/useOptimizedQuery";

export default function MetricasAssinaturas() {
  usePerformanceTracker('/MetricasAssinaturas');
  const { data: clinicas = [] } = useOptimizedQuery({
    queryKey: ["clinicas"],
    queryFn: () => base44.entities.Clinica.list()
  });

  const { data: planos = [] } = useOptimizedQuery({
    queryKey: ["planos"],
    queryFn: () => base44.entities.PlanoAssinatura.list()
  });

  // Métricas MRR
  const mrr = useMemo(() => {
    return clinicas
      .filter(c => c.status_assinatura === "ativa")
      .reduce((total, c) => {
        const plano = planos.find(p => p.slug === c.plano_assinatura);
        return total + (plano?.preco_mensal || 0);
      }, 0);
  }, [clinicas, planos]);

  // ARR
  const arr = mrr * 12;

  // Churn Rate (últimos 30 dias)
  const churnRate = useMemo(() => {
    const hoje = new Date();
    const mes_passado = subMonths(hoje, 1);
    
    const canceladas = clinicas.filter(c => 
      c.status_assinatura === "cancelada" &&
      c.updated_date &&
      new Date(c.updated_date) >= mes_passado
    ).length;
    
    const ativas = clinicas.filter(c => c.status_assinatura === "ativa").length;
    
    return ativas > 0 ? ((canceladas / (ativas + canceladas)) * 100).toFixed(2) : 0;
  }, [clinicas]);

  // Distribuição por plano
  const distribuicaoPlanos = useMemo(() => {
    const dist = {};
    clinicas
      .filter(c => c.status_assinatura === "ativa")
      .forEach(c => {
        const planoNome = planos.find(p => p.slug === c.plano_assinatura)?.nome || "Desconhecido";
        dist[planoNome] = (dist[planoNome] || 0) + 1;
      });
    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [clinicas, planos]);

  // Status das assinaturas
  const statusAssinaturas = useMemo(() => {
    const status = {
      trial: 0,
      ativa: 0,
      suspensa: 0,
      cancelada: 0
    };
    clinicas.forEach(c => {
      status[c.status_assinatura] = (status[c.status_assinatura] || 0) + 1;
    });
    return Object.entries(status).map(([name, value]) => ({ 
      name: name.charAt(0).toUpperCase() + name.slice(1), 
      value 
    }));
  }, [clinicas]);

  // MRR histórico (últimos 6 meses - simulado)
  const mrrHistorico = useMemo(() => {
    const meses = [];
    for (let i = 5; i >= 0; i--) {
      const data = subMonths(new Date(), i);
      const clinicasAtivas = clinicas.filter(c => {
        const inicio = new Date(c.created_date);
        return inicio <= data && c.status_assinatura === "ativa";
      }).length;
      
      meses.push({
        mes: format(data, "MMM", { locale: ptBR }),
        mrr: clinicasAtivas * (mrr / clinicas.filter(c => c.status_assinatura === "ativa").length || 0)
      });
    }
    return meses;
  }, [clinicas, mrr]);

  // Clínicas com vencimento próximo (próximos 7 dias)
  const vencimentosProximos = useMemo(() => {
    const hoje = new Date();
    const seteDias = new Date(hoje);
    seteDias.setDate(seteDias.getDate() + 7);
    
    return clinicas.filter(c => 
      c.status_assinatura === "ativa" &&
      c.data_vencimento_plano &&
      new Date(c.data_vencimento_plano) >= hoje &&
      new Date(c.data_vencimento_plano) <= seteDias
    );
  }, [clinicas]);

  const COLORS = ['#0B7A9E', '#58B4D4', '#10b981', '#f59e0b', '#ef4444'];

  const totalClientes = clinicas.length;
  const ativasCount = clinicas.filter(c => c.status_assinatura === "ativa").length;
  const trialCount = clinicas.filter(c => c.status_assinatura === "trial").length;
  const suspensasCount = clinicas.filter(c => c.status_assinatura === "suspensa").length;

  return (
    <RouteGuard requireAuth={true} requireClinica={false}>
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
      <PageHeader
        title="Métricas"
        description="MRR e churn"
        breadcrumbs={[{ label: "Super Admin" }, { label: "Métricas" }]}
      />

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 opacity-80" />
            <TrendingUp className="w-5 h-5" />
          </div>
          <p className="text-sm opacity-90 mb-1">MRR (Mensal)</p>
          <p className="text-3xl font-bold">R$ {mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <CreditCard className="w-8 h-8 opacity-80" />
            <Calendar className="w-5 h-5" />
          </div>
          <p className="text-sm opacity-90 mb-1">ARR (Anual)</p>
          <p className="text-3xl font-bold">R$ {arr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <TrendingDown className="w-8 h-8 opacity-80" />
            <AlertCircle className="w-5 h-5" />
          </div>
          <p className="text-sm opacity-90 mb-1">Churn Rate</p>
          <p className="text-3xl font-bold">{churnRate}%</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-8 h-8 opacity-80" />
            <BarChart3 className="w-5 h-5" />
          </div>
          <p className="text-sm opacity-90 mb-1">Clientes Ativos</p>
          <p className="text-3xl font-bold">{ativasCount}</p>
          <p className="text-xs opacity-80 mt-1">de {totalClientes} total</p>
        </div>
      </div>

      {/* Evolução MRR */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-6">Evolução do MRR (Últimos 6 Meses)</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mrrHistorico}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="mes" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
                formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              />
              <Line type="monotone" dataKey="mrr" stroke="#0B7A9E" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráficos de Distribuição */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Distribuição por Plano */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-6">Distribuição por Plano</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distribuicaoPlanos}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {distribuicaoPlanos.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status das Assinaturas */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-6">Status das Assinaturas</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusAssinaturas}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="value" fill="#0B7A9E" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Alertas de Vencimento */}
      {vencimentosProximos.length > 0 && (
        <div className="bg-orange-50 rounded-2xl border-2 border-orange-200 p-6">
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-bold text-orange-900 mb-1">
                Renovações Próximas ({vencimentosProximos.length})
              </h3>
              <p className="text-sm text-orange-800">
                Clínicas com vencimento nos próximos 7 dias
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {vencimentosProximos.slice(0, 5).map((clinica) => (
              <div key={clinica.id} className="bg-white rounded-lg p-3 flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-800">{clinica.nome}</p>
                  <p className="text-sm text-gray-600 capitalize">{clinica.plano_assinatura}</p>
                </div>
                <span className="text-sm text-gray-600">
                  {format(new Date(clinica.data_vencimento_plano), "dd/MM/yyyy")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resumo de Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Trial</p>
          <p className="text-2xl font-bold text-gray-800">{trialCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Ativas</p>
          <p className="text-2xl font-bold text-green-600">{ativasCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Suspensas</p>
          <p className="text-2xl font-bold text-orange-600">{suspensasCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Canceladas</p>
          <p className="text-2xl font-bold text-red-600">
            {clinicas.filter(c => c.status_assinatura === "cancelada").length}
          </p>
        </div>
      </div>
      </div>
    </RouteGuard>
  );
}