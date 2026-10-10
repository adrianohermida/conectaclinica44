import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { secureEntities } from "@/components/security/SecureEntityWrapper";
import { useQuery } from "@tanstack/react-query";
import RouteGuard from "@/components/auth/RouteGuard";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import StatCard from "@/components/ui/StatCard";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  BarChart3,
  ExternalLink,
  Zap,
  Users,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Activity
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import TabEventosStripe from "@/components/financeiro/TabEventosStripe";

export default function FinanceiroPlataforma() {
  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me()
  });

  // BLOQUEIO: apenas admin
  if (user && user.role !== 'admin') {
    return (
      <RouteGuard requireAuth>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h1>
            <p className="text-gray-600">Apenas SuperAdmin pode acessar Financeiro Plataforma</p>
          </div>
        </div>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard requireAuth>
      <FinanceiroPlataformaContent />
    </RouteGuard>
  );
}

function FinanceiroPlataformaContent() {
  const [activeTab, setActiveTab] = useState("assinaturas");
  const [recargando, setRecargando] = useState(false);

  // CRÍTICO: secureEntities para isolamento multi-tenant
  const { data: assinaturas = [], isLoading: loadingAssinaturas } = useQuery({
    queryKey: ["assinaturas-plataforma"],
    queryFn: () => secureEntities.AssinaturaClinica.list("-created_date"),
    staleTime: 2 * 60 * 1000
  });

  const { data: clinicas = [] } = useQuery({
    queryKey: ["clinicas-plataforma"],
    queryFn: () => secureEntities.Clinica.list("-created_date"),
    staleTime: 5 * 60 * 1000
  });

  const { data: recargas = [], isLoading: loadingRecargas } = useQuery({
    queryKey: ["recargas-plataforma"],
    queryFn: () => secureEntities.CreditoIA.list("-created_date", 100),
    staleTime: 1 * 60 * 1000
  });

  // Métricas calculadas
  const metricas = useMemo(() => {
    const ativas = assinaturas.filter(a => a.status === 'ativa');
    const trial = assinaturas.filter(a => a.status === 'trial');
    const canceladas = assinaturas.filter(a => a.status === 'cancelada');

    const mrr = ativas.reduce((acc, a) => {
      const valor = a.valor_mensal || 0;
      return acc + valor;
    }, 0);

    const arr = mrr * 12;

    const churnRate = assinaturas.length > 0 
      ? (canceladas.length / assinaturas.length * 100) 
      : 0;

    const recargasHoje = recargas.filter(r => {
      const hoje = format(new Date(), "yyyy-MM-dd");
      return format(new Date(r.created_date), "yyyy-MM-dd") === hoje;
    });

    const receitaRecargas = recargas
      .filter(r => r.status === 'completed')
      .reduce((acc, r) => acc + (r.valor_brl || 0), 0);

    return {
      totalAssinaturas: assinaturas.length,
      assinaturasAtivas: ativas.length,
      trial: trial.length,
      canceladas: canceladas.length,
      mrr,
      arr,
      churnRate,
      recargasHoje: recargasHoje.length,
      receitaRecargas
    };
  }, [assinaturas, recargas]);

  // Recarga rápida 1-click
  const handleRecargaRapida = async (clinica_id, quantidade) => {
    if (!clinica_id) {
      toast.error("Selecione uma clínica");
      return;
    }

    setRecargando(true);
    try {
      const { data } = await base44.functions.invoke('criarCheckoutRecargaRapida', {
        clinica_id,
        quantidade
      });

      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error("Erro ao criar checkout");
      }
    } catch (error) {
      toast.error(`Erro: ${error.message}`);
    } finally {
      setRecargando(false);
    }
  };

  // Dados gráfico MRR evolução (últimos 6 meses)
  const dadosMRR = useMemo(() => {
    const meses = [];
    for (let i = 5; i >= 0; i--) {
      const data = new Date();
      data.setMonth(data.getMonth() - i);
      const mesAno = format(data, "yyyy-MM");
      
      const mrrMes = assinaturas
        .filter(a => {
          const criacao = format(new Date(a.created_date), "yyyy-MM");
          return criacao <= mesAno && (!a.data_cancelamento || format(new Date(a.data_cancelamento), "yyyy-MM") > mesAno);
        })
        .reduce((acc, a) => acc + (a.valor_mensal || 0), 0);

      meses.push({
        mes: format(data, "MMM/yy", { locale: ptBR }),
        mrr: mrrMes
      });
    }
    return meses;
  }, [assinaturas]);

  const COLORS = ['#7E57FF', '#34a853', '#fbbc04', '#ea4335', '#0B7A9E'];

  return (
    <div className="space-y-6">
      <PageHeader
        title="💰 Financeiro Plataforma"
        description="Gestão completa de monetização, assinaturas e recargas"
        breadcrumbs={[
          { label: "SuperAdmin" },
          { label: "Financeiro Plataforma" }
        ]}
      />

      {/* KPIs Críticos - Componentizados */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={DollarSign}
          label="MRR"
          value={`R$ ${metricas.mrr.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          color="#7E57FF"
          bgColor="#f5f3ff"
          loading={loadingAssinaturas}
        />
        <StatCard
          icon={Users}
          label="Assinaturas"
          value={metricas.assinaturasAtivas}
          color="#34a853"
          bgColor="#e6f7ed"
          loading={loadingAssinaturas}
        />
        <StatCard
          icon={TrendingUp}
          label="Churn Rate"
          value={`${metricas.churnRate.toFixed(1)}%`}
          color={metricas.churnRate > 5 ? '#ea4335' : '#fbbc04'}
          bgColor={metricas.churnRate > 5 ? '#fef2f2' : '#fef9e5'}
          loading={loadingAssinaturas}
        />
        <StatCard
          icon={Zap}
          label="Recargas Hoje"
          value={metricas.recargasHoje}
          color="#0B7A9E"
          bgColor="#e0f2fe"
          loading={loadingRecargas}
        />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl p-4 border" style={{ borderColor: '#e8eaed' }}>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { value: "assinaturas", label: "Assinaturas", icon: Users },
            { value: "recargas", label: "Recargas", icon: Zap },
            { value: "metricas", label: "Métricas", icon: BarChart3 },
            { value: "eventos", label: "Eventos Stripe", icon: Activity },
            { value: "stripe", label: "Stripe", icon: CreditCard }
          ].map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className="px-5 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-2"
              style={activeTab === tab.value ? { 
                backgroundColor: '#7E57FF', 
                color: '#ffffff'
              } : { 
                backgroundColor: '#f8f9fa', 
                color: '#5f6368'
              }}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Assinaturas */}
      {activeTab === "assinaturas" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Assinaturas Ativas</h2>
          </div>

          {loadingAssinaturas ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
          ) : assinaturas.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border" style={{ borderColor: '#e8eaed' }}>
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-600">Nenhuma assinatura cadastrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assinaturas.map(assinatura => {
                const clinica = clinicas.find(c => c.id === assinatura.clinica_id);
                const statusConfig = {
                  ativa: { icon: CheckCircle2, color: '#34a853', bg: '#e6f7ed', label: 'Ativa' },
                  trial: { icon: Clock, color: '#fbbc04', bg: '#fef9e5', label: 'Trial' },
                  cancelada: { icon: XCircle, color: '#ea4335', bg: '#fef2f2', label: 'Cancelada' },
                  suspensa: { icon: AlertCircle, color: '#f59e0b', bg: '#fef3c7', label: 'Suspensa' }
                }[assinatura.status] || { icon: AlertCircle, color: '#5f6368', bg: '#f8f9fa', label: assinatura.status };

                return (
                  <div key={assinatura.id} className="bg-white rounded-xl p-5 border hover:shadow-md transition-all" style={{ borderColor: '#e8eaed' }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: statusConfig.bg }}>
                          <statusConfig.icon className="w-6 h-6" style={{ color: statusConfig.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 mb-1">{clinica?.nome || assinatura.clinica_id}</h3>
                          <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                            <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">
                              {assinatura.plano_slug || 'N/A'}
                            </span>
                            <span className="px-2 py-0.5 rounded" style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}>
                              {statusConfig.label}
                            </span>
                            <span>
                              Desde {format(new Date(assinatura.created_date), "dd/MM/yy")}
                            </span>
                          </div>
                          {assinatura.stripe_subscription_id && (
                            <p className="text-xs text-gray-500 mt-1 font-mono">
                              {assinatura.stripe_subscription_id}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-2xl font-bold text-gray-900">
                          R$ {(assinatura.valor_mensal || 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">/ mês</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Recargas */}
      {activeTab === "recargas" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Histórico Recargas</h2>
            <Button
              onClick={() => {
                const clinica_id = prompt("ID da clínica para recarga:");
                if (clinica_id) handleRecargaRapida(clinica_id, 100);
              }}
              disabled={recargando}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {recargando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Recarga Rápida 1-Click
                </>
              )}
            </Button>
          </div>

          {loadingRecargas ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
          ) : recargas.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border" style={{ borderColor: '#e8eaed' }}>
              <Zap className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-600">Nenhuma recarga registrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recargas.slice(0, 50).map(recarga => {
                const clinica = clinicas.find(c => c.id === recarga.clinica_id);
                const statusConfig = {
                  completed: { color: '#34a853', bg: '#e6f7ed', label: '✓ Completo' },
                  pending: { color: '#fbbc04', bg: '#fef9e5', label: '⏳ Pendente' },
                  failed: { color: '#ea4335', bg: '#fef2f2', label: '✗ Falhou' }
                }[recarga.status] || { color: '#5f6368', bg: '#f8f9fa', label: recarga.status };

                return (
                  <div key={recarga.id} className="bg-white rounded-xl p-4 border" style={{ borderColor: '#e8eaed' }}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 mb-1">{clinica?.nome || recarga.clinica_id}</h4>
                        <div className="flex gap-2 text-sm">
                          <span className="px-2 py-0.5 rounded font-medium" style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}>
                            {statusConfig.label}
                          </span>
                          <span className="text-gray-600">
                            {recarga.quantidade_creditos} créditos
                          </span>
                          <span className="text-gray-500">
                            {format(new Date(recarga.created_date), "dd/MM/yy HH:mm")}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-900">
                          R$ {(recarga.valor_brl || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Métricas */}
      {activeTab === "metricas" && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900">Evolução MRR (6 meses)</h2>
          <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: '#e8eaed' }}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dadosMRR}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8eaed" />
                <XAxis dataKey="mes" stroke="#5f6368" />
                <YAxis stroke="#5f6368" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e8eaed',
                    borderRadius: '12px'
                  }}
                />
                <Line type="monotone" dataKey="mrr" stroke="#7E57FF" strokeWidth={3} dot={{ fill: '#7E57FF', r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: '#e8eaed' }}>
              <h3 className="font-bold text-gray-900 mb-4">Distribuição por Status</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Ativas', value: metricas.assinaturasAtivas },
                      { name: 'Trial', value: metricas.trial },
                      { name: 'Canceladas', value: metricas.canceladas }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {COLORS.map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl p-6 border space-y-4" style={{ borderColor: '#e8eaed' }}>
              <h3 className="font-bold text-gray-900">Métricas Críticas</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-3 border-b" style={{ borderColor: '#e8eaed' }}>
                  <span className="text-gray-600">LTV Médio</span>
                  <span className="font-bold text-gray-900">
                    R$ {(metricas.mrr * 12 / (metricas.churnRate / 100 || 1)).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b" style={{ borderColor: '#e8eaed' }}>
                  <span className="text-gray-600">Receita Recargas</span>
                  <span className="font-bold text-green-600">
                    R$ {metricas.receitaRecargas.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b" style={{ borderColor: '#e8eaed' }}>
                  <span className="text-gray-600">Ticket Médio MRR</span>
                  <span className="font-bold text-gray-900">
                    R$ {metricas.assinaturasAtivas > 0 ? (metricas.mrr / metricas.assinaturasAtivas).toFixed(2) : '0.00'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Taxa Conversão Trial</span>
                  <span className="font-bold text-purple-600">
                    {metricas.totalAssinaturas > 0 ? ((metricas.assinaturasAtivas / metricas.totalAssinaturas) * 100).toFixed(1) : '0'}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Eventos Stripe */}
      {activeTab === "eventos" && <TabEventosStripe />}

      {/* Tab: Stripe */}
      {activeTab === "stripe" && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-2xl p-8 text-white">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                <CreditCard className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1">Stripe Dashboard</h2>
                <p className="text-purple-100">Gestão completa de pagamentos e assinaturas</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white/10 rounded-xl p-4">
                <p className="text-purple-200 text-sm mb-1">Produtos Ativos</p>
                <p className="text-3xl font-bold">3</p>
                <p className="text-xs text-purple-200 mt-1">Starter, Pro, Enterprise</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <p className="text-purple-200 text-sm mb-1">Webhook Status</p>
                <p className="text-3xl font-bold">✓</p>
                <p className="text-xs text-purple-200 mt-1">Configurado e ativo</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <p className="text-purple-200 text-sm mb-1">Modo</p>
                <p className="text-3xl font-bold">LIVE</p>
                <p className="text-xs text-purple-200 mt-1">Produção ativa</p>
              </div>
            </div>

            <div className="flex gap-3">
              <a
                href="https://dashboard.stripe.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-white text-purple-600 font-bold px-6 py-3 rounded-xl hover:bg-purple-50 transition-all flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-5 h-5" />
                Abrir Dashboard Stripe
              </a>
              <a
                href="https://dashboard.stripe.com/subscriptions"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/20 text-white font-bold px-6 py-3 rounded-xl hover:bg-white/30 transition-all flex items-center justify-center gap-2"
              >
                Ver Assinaturas
              </a>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: '#e8eaed' }}>
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-purple-600" />
              Links Úteis
            </h3>
            <div className="space-y-2">
              {[
                { label: "Produtos & Preços", url: "https://dashboard.stripe.com/products" },
                { label: "Clientes", url: "https://dashboard.stripe.com/customers" },
                { label: "Pagamentos", url: "https://dashboard.stripe.com/payments" },
                { label: "Webhooks", url: "https://dashboard.stripe.com/webhooks" },
                { label: "Relatórios", url: "https://dashboard.stripe.com/reports" }
              ].map((link, idx) => (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-all"
                >
                  <span className="text-gray-700">{link.label}</span>
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}