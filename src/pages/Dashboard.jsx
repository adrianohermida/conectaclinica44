import React, { useMemo, useEffect, useState, lazy, Suspense } from "react";
import { 
  TrendingUp, 
  Users, 
  Calendar,
  DollarSign, 
  FileText,
  Activity,
  Clock as ClockIcon
} from "lucide-react";
import { useClinicaContext } from "@/components/hooks/useClinicaContext";
import { useDashboardData } from "@/components/hooks/useDashboardData";
import { base44 } from "@/api/base44Client";
import { format, startOfMonth, endOfMonth, differenceInDays } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQueryClient } from "@tanstack/react-query";
import StatCard from "@/components/ui/StatCard";

// LAZY: Componentes pesados só após FCP
const PageHeader = lazy(() => import("@/components/ui/PageHeader"));
const AlertBanner = lazy(() => import("@/components/ui/AlertBanner"));
const LineChart = lazy(() => import("recharts").then(m => ({ default: m.LineChart })));
const Line = lazy(() => import("recharts").then(m => ({ default: m.Line })));
const XAxis = lazy(() => import("recharts").then(m => ({ default: m.XAxis })));
const YAxis = lazy(() => import("recharts").then(m => ({ default: m.YAxis })));
const CartesianGrid = lazy(() => import("recharts").then(m => ({ default: m.CartesianGrid })));
const Tooltip = lazy(() => import("recharts").then(m => ({ default: m.Tooltip })));
const ResponsiveContainer = lazy(() => import("recharts").then(m => ({ default: m.ResponsiveContainer })));
const RouteGuard = lazy(() => import("@/components/auth/RouteGuard"));

// Skeleton inline (< 200ms render)
const DashboardSkeleton = () => (
  <div className="space-y-4" role="status" aria-label="Carregando dashboard">
    <div className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
      ))}
    </div>
  </div>
);

export default function Dashboard() {
  const { clinicaId, user, isLoading: loadingContext } = useClinicaContext();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  // CRÍTICO: Defer 90% queries - só essenciais no mount
  const [deferredLoad, setDeferredLoad] = useState(false);
  
  useEffect(() => {
    // Trigger após 1s (FCP + LCP já renderizados)
    const timer = setTimeout(() => setDeferredLoad(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  // ULTRA-AGRESSIVO: staleTime 10min + gcTime 15min
  const { data: dashboardData, isLoading: loadingData } = useDashboardData(
    clinicaId, 
    !!clinicaId && !loadingContext,
    deferredLoad
  );

  // PREFETCH: Defer 3s para não competir com FCP/LCP
  React.useEffect(() => {
    if (!clinicaId || !deferredLoad) return;
    
    const prefetchTimer = setTimeout(() => {
      queryClient.prefetchQuery({
        queryKey: ['agenda-batch', clinicaId],
        queryFn: () => base44.functions.invoke('getAgendaCompleta', { clinica_id: clinicaId }).then(r => r.data).catch(() => null),
        staleTime: 10 * 60 * 1000,
        gcTime: 15 * 60 * 1000
      });
      
      queryClient.prefetchQuery({
        queryKey: ['prontuarios-batch', clinicaId],
        queryFn: () => base44.functions.invoke('getProntuariosCompleto', { clinica_id: clinicaId }).then(r => r.data).catch(() => null),
        staleTime: 10 * 60 * 1000,
        gcTime: 15 * 60 * 1000
      });
    }, 3000);
    
    return () => clearTimeout(prefetchTimer);
  }, [clinicaId, deferredLoad, queryClient]);

  const pacientes = dashboardData?.pacientes || [];
  const agendamentos = dashboardData?.agendamentos || [];
  const prontuarios = dashboardData?.prontuarios || [];
  const vendas = dashboardData?.vendas || [];
  const medicamentos = dashboardData?.medicamentos || [];
  const certidoes = dashboardData?.certidoes || [];
  const contasReceber = dashboardData?.contasReceber || [];

  const isLoading = loadingContext || loadingData;

  const hoje = new Date();
  const inicioMes = startOfMonth(hoje);
  const fimMes = endOfMonth(hoje);

  // Métricas do Mês
  const metricasMes = useMemo(() => {
    const agendMes = (agendamentos || []).filter(a => {
      if (!a?.data) return false;
      try {
        const data = new Date(a.data);
        return data >= inicioMes && data <= fimMes;
      } catch {
        return false;
      }
    });

    const prontuariosMes = (prontuarios || []).filter(p => {
      if (!p?.data_atendimento) return false;
      try {
        const data = new Date(p.data_atendimento);
        return data >= inicioMes && data <= fimMes;
      } catch {
        return false;
      }
    });

    const vendasMes = (vendas || []).filter(v => {
      if (!v?.data_venda) return false;
      try {
        const data = new Date(v.data_venda);
        return data >= inicioMes && data <= fimMes;
      } catch {
        return false;
      }
    });

    const receitaMes = vendasMes.reduce((acc, v) => acc + (v?.valor_final || 0), 0);

    return {
      totalAgendamentos: agendMes.length,
      totalAtendimentos: prontuariosMes.length,
      receitaMes,
      taxaComparecimento: agendMes.length > 0 ? (prontuariosMes.length / agendMes.length * 100).toFixed(1) : 0
    };
  }, [agendamentos, prontuarios, vendas, inicioMes, fimMes]);

  // Alertas Críticos
  const alertas = useMemo(() => {
    const alerts = [];
    
    const estoqueBaixo = (medicamentos || []).filter(m => m?.quantidade_estoque <= (m?.estoque_minimo || 0));
    if (estoqueBaixo.length > 0) {
      alerts.push({ tipo: "estoque", count: estoqueBaixo.length, texto: "Itens com estoque baixo", link: "/Estoque", cor: "orange" });
    }

    const certidoesVencendo = (certidoes || []).filter(c => {
      if (!c?.data_validade) return false;
      try {
        const dias = differenceInDays(new Date(c.data_validade), hoje);
        return dias <= 30 && dias >= 0;
      } catch {
        return false;
      }
    });
    if (certidoesVencendo.length > 0) {
      alerts.push({ tipo: "compliance", count: certidoesVencendo.length, texto: "Certidões vencendo", link: "/ComplianceCertidoes", cor: "red" });
    }

    const contasVencidas = (contasReceber || []).filter(c => {
      if (!c?.status || c.status !== "pendente" || !c?.data_vencimento) return false;
      try {
        return new Date(c.data_vencimento) < hoje;
      } catch {
        return false;
      }
    });
    if (contasVencidas.length > 0) {
      alerts.push({ tipo: "financeiro", count: contasVencidas.length, texto: "Contas vencidas", link: "/Financeiro", cor: "red" });
    }

    return alerts;
  }, [medicamentos, certidoes, contasReceber, hoje]);

  // Agendamentos Hoje
  const agendamentosHoje = useMemo(() => {
    try {
      const dataHoje = format(hoje, "yyyy-MM-dd");
      return (agendamentos || []).filter(a => a?.data === dataHoje).slice(0, 5);
    } catch {
      return [];
    }
  }, [agendamentos, hoje]);

  // Receita por Dia (últimos 7 dias)
  const receitaSemanal = useMemo(() => {
    const dados = [];
    try {
      for (let i = 6; i >= 0; i--) {
        const dia = new Date(hoje);
        dia.setDate(dia.getDate() - i);
        const dataStr = format(dia, "yyyy-MM-dd");
        
        const vendasDia = (vendas || []).filter(v => v?.data_venda === dataStr);
        const receita = vendasDia.reduce((acc, v) => acc + (v?.valor_final || 0), 0);
        
        dados.push({
          dia: format(dia, "dd/MM"),
          receita
        });
      }
    } catch {
      // Retornar dados vazios se erro
    }
    return dados;
  }, [vendas, hoje]);

  const isMedico = user?.role === 'medico';
  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-4 md:space-y-6 overflow-x-hidden" role="main" aria-label="Dashboard principal">

        <Suspense fallback={<div className="h-24 bg-gray-100 rounded-2xl animate-pulse" role="status" />}>
          <PageHeader
            title={`Bem-vindo, ${user?.full_name || "Usuário"}`}
            description={`Dashboard ${isMedico ? "Médico" : isAdmin ? "Administrativo" : "Operacional"}`}
            breadcrumbs={[{ label: "Dashboard" }]}
          />
        </Suspense>

        {/* Alertas lazy - não bloqueia FCP */}
        {deferredLoad && Array.isArray(alertas) && alertas.length > 0 && (
          <Suspense fallback={null}>
            <div className="grid gap-2 md:gap-3">
              {alertas.map((alerta, idx) => (
                <Link key={idx} to={alerta.link} className="block" aria-label={`Ver detalhes: ${alerta.texto}`}>
                  <AlertBanner
                    variant={alerta.cor === "red" ? "error" : "warning"}
                    title={alerta.texto}
                  >
                    <p style={{ fontSize: '14px' }}>{alerta.count} pendência(s) • Clique para ver detalhes</p>
                  </AlertBanner>
                </Link>
              ))}
            </div>
          </Suspense>
        )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          icon={Users}
          label="Pacientes"
          value={pacientes.length}
          color="#7E57FF"
          bgColor="#f5f3ff"
          loading={!deferredLoad}
          onClick={() => navigate(createPageUrl("Pacientes"))}
        />
        <StatCard
          icon={Calendar}
          label="Agend. Mês"
          value={metricasMes.totalAgendamentos}
          color="#7E57FF"
          bgColor="#f5f3ff"
          loading={!deferredLoad}
          onClick={() => navigate(createPageUrl("Agenda"))}
        />
        <StatCard
          icon={FileText}
          label="Atend. Mês"
          value={metricasMes.totalAtendimentos}
          color="#7E57FF"
          bgColor="#f5f3ff"
          loading={!deferredLoad}
          onClick={() => navigate(createPageUrl("Prontuarios") + "?status=pendente")}
        />
        <StatCard
          icon={DollarSign}
          label="Receita Mês"
          value={`R$ ${metricasMes.receitaMes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          color="#34a853"
          bgColor="#e6f7ed"
          loading={!deferredLoad}
          onClick={() => navigate(createPageUrl("Financeiro") + "?periodo=mes")}
        />
      </div>

      {/* Gráficos e Agenda - UMA RENDERIZAÇÃO */}
      {!deferredLoad ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6" role="status">
          <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border" style={{ borderColor: '#e8eaed', minHeight: '280px' }}>
            <div className="h-6 bg-gray-200 rounded w-1/2 mb-4 animate-pulse" />
            <div className="h-[220px] bg-gray-100 rounded-xl animate-pulse" />
          </div>
          <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border" style={{ borderColor: '#e8eaed', minHeight: '280px' }}>
            <div className="h-6 bg-gray-200 rounded w-1/2 mb-4 animate-pulse" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6" role="region" aria-label="Gráficos e agendamentos">
          <button 
            onClick={() => window.location.href = createPageUrl("Financeiro") + "?view=receita"}
            className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border hover:shadow-md transition-all text-left" 
            style={{ borderColor: '#e8eaed', minHeight: '280px' }}
            aria-label="Ver gráfico de receita completo"
          >
            <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" style={{ color: '#7E57FF' }} aria-hidden="true" />
              <span className="truncate">Receita (Últimos 7 Dias)</span>
            </h3>
            <div className="w-full" role="img" aria-label="Gráfico de receita dos últimos 7 dias" style={{ minHeight: '220px' }}>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={receitaSemanal} margin={{ top: 10, right: 10, left: -15, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--pc-border-primary)" />
                  <XAxis dataKey="dia" style={{ fontSize: '11px', fill: 'var(--pc-text-secondary)' }} />
                  <YAxis style={{ fontSize: '11px', fill: 'var(--pc-text-secondary)' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#ffffff', 
                      border: '1px solid var(--pc-border-primary)',
                      borderRadius: '12px',
                      fontSize: '13px',
                      padding: '8px 12px'
                    }}
                    formatter={(value) => [`R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, 'Receita']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="receita" 
                    stroke="#7E57FF" 
                    strokeWidth={3}
                    dot={{ fill: '#7E57FF', r: 4, strokeWidth: 2, stroke: '#ffffff' }}
                    activeDot={{ r: 6, strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </button>

          <Link to={createPageUrl("Agenda") + "?data=" + format(hoje, "yyyy-MM-dd")} aria-label="Ver agenda de hoje completa">
            <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border hover:shadow-md transition-all" style={{ borderColor: '#e8eaed', minHeight: '280px' }}>
              <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" style={{ color: '#7E57FF' }} aria-hidden="true" />
                <span className="truncate">Agendamentos Hoje</span>
              </h3>
              {!Array.isArray(agendamentosHoje) || agendamentosHoje.length === 0 ? (
                <div className="py-8 md:py-12 text-center">
                  <ClockIcon className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-2 md:mb-3" style={{ color: 'var(--pc-gray-400)' }} aria-hidden="true" />
                  <p style={{ color: 'var(--pc-text-secondary)', fontSize: '14px' }}>Nenhum agendamento hoje</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {agendamentosHoje.map((a) => (
                    <button 
                      key={a.id}
                      onClick={(e) => {
                        e.preventDefault();
                        window.location.href = `${createPageUrl("Agenda")}?view=${a.id}`;
                      }}
                      className="w-full rounded-xl p-3 md:p-4 flex items-center transition-all hover:bg-purple-50"
                      style={{ backgroundColor: '#f5f3ff', border: '1px solid #e9ddff', minHeight: '56px' }}
                      aria-label={`Ver agendamento de ${a.paciente_nome} às ${a.horario}`}
                    >
                      <div className="flex justify-between items-center w-full gap-3">
                        <div className="flex-1 min-w-0 text-left">
                          <p className="font-bold truncate" style={{ color: 'var(--pc-text-primary)', fontSize: 'clamp(14px, 3.5vw, 16px)' }}>
                            {a.paciente_nome || 'Paciente não identificado'}
                          </p>
                          <p className="truncate" style={{ color: 'var(--pc-text-secondary)', fontSize: '13px' }}>
                            {a.medico ? `Dr(a). ${a.medico}` : 'Médico não definido'} • {a.tipo_consulta === 'presencial' ? '🏥' : '💻'}
                          </p>
                        </div>
                        <span className="font-bold flex-shrink-0" style={{ color: '#7E57FF', fontSize: 'clamp(14px, 3.5vw, 16px)' }}>{a.horario}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Link>
        </div>
      )}



      {/* Ações Rápidas - LAZY: só após defer (abaixo da dobra) */}
      {deferredLoad && (
        <Suspense fallback={
          <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border" style={{ borderColor: '#e8eaed', minHeight: '180px' }} role="status">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-6 animate-pulse" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-[100px] bg-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          </div>
        }>
          <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border" style={{ borderColor: '#e8eaed' }}>
            <h3 className="text-base md:text-lg font-semibold mb-4 md:mb-6 flex items-center gap-2">
              <Activity className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" style={{ color: '#7E57FF' }} aria-hidden="true" />
              <span>Ações Rápidas</span>
            </h3>
            <nav className="grid grid-cols-2 lg:grid-cols-4 gap-3" role="navigation" aria-label="Ações rápidas">
              {[
                { to: "Agenda", icon: Calendar, label: "Nova Agenda", color: "#7E57FF" },
                { to: "Pacientes", icon: Users, label: "Novo Paciente", color: "#7E57FF" },
                { to: "Prontuarios", icon: FileText, label: "Prontuário", color: "#7E57FF" },
                { to: "Financeiro", icon: DollarSign, label: "Financeiro", color: "#34a853" }
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Link 
                    key={item.to} 
                    to={createPageUrl(item.to)}
                    aria-label={`Ir para ${item.label}`}
                  >
                    <div
                      className="bg-white rounded-2xl p-3 md:p-4 text-center hover:shadow-md transition-all flex flex-col items-center justify-center shadow-sm border"
                      style={{ borderColor: '#e8eaed', minHeight: '100px' }}
                    >
                      <div 
                        className="w-11 h-11 md:w-12 md:h-12 rounded-xl mx-auto mb-2 md:mb-3 flex items-center justify-center flex-shrink-0"
                        style={{ 
                          backgroundColor: item.color === '#7E57FF' ? '#f5f3ff' : '#e6f7ed',
                          color: item.color 
                        }}
                      >
                        <Icon className="w-5 h-5 md:w-6 md:h-6" aria-hidden="true" />
                      </div>
                      <p className="font-bold truncate w-full px-1" style={{ color: 'var(--pc-text-primary)', fontSize: 'clamp(13px, 3vw, 14px)' }}>{item.label}</p>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        </Suspense>
      )}
      </div>
  );
}