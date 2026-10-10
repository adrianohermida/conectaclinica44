import React from "react";
import RouteGuard from "@/components/auth/RouteGuard";
import PageHeader from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { TrendingUp, Clock, MousePointerClick, CheckCircle2, Users, Target } from "lucide-react";

export default function DashboardNotificacoes() {
  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me()
  });

  const { data: notificacoes = [], isLoading } = useQuery({
    queryKey: ['notificacoes-metricas', user?.clinica_id],
    queryFn: async () => {
      if (!user?.clinica_id) return [];
      return await base44.entities.NotificacaoSistema.filter(
        { clinica_id: user.clinica_id },
        '-created_date',
        500
      );
    },
    enabled: !!user?.clinica_id
  });

  // MÉTRICAS CALCULADAS
  const totalNotifs = notificacoes.length;
  const entregues = notificacoes.filter(n => n.entregue || n.lida).length;
  const lidas = notificacoes.filter(n => n.lida).length;
  const clicadas = notificacoes.filter(n => n.clicada).length;

  const taxaEntrega = totalNotifs > 0 ? Math.round((entregues / totalNotifs) * 100) : 0;
  const taxaLeitura = totalNotifs > 0 ? Math.round((lidas / totalNotifs) * 100) : 0;
  const taxaClique = totalNotifs > 0 ? Math.round((clicadas / totalNotifs) * 100) : 0;

  // TEMPO ATÉ LEITURA (P50, P95)
  const temposLeitura = notificacoes
    .filter(n => n.lida && n.lida_em && n.created_date)
    .map(n => {
      const criacao = new Date(n.created_date).getTime();
      const leitura = new Date(n.lida_em).getTime();
      return Math.round((leitura - criacao) / 1000 / 60); // minutos
    })
    .sort((a, b) => a - b);

  const p50 = temposLeitura[Math.floor(temposLeitura.length * 0.5)] || 0;
  const p95 = temposLeitura[Math.floor(temposLeitura.length * 0.95)] || 0;

  // NOTIFICAÇÕES POR TIPO
  const porTipo = {};
  notificacoes.forEach(n => {
    porTipo[n.tipo] = (porTipo[n.tipo] || 0) + 1;
  });

  const dadosTipo = Object.entries(porTipo)
    .map(([tipo, count]) => ({ tipo, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // USUÁRIOS MAIS/MENOS ENGAJADOS
  const porUsuario = {};
  notificacoes.forEach(n => {
    const email = n.destinatario_email;
    if (!porUsuario[email]) {
      porUsuario[email] = { total: 0, lidas: 0, clicadas: 0 };
    }
    porUsuario[email].total++;
    if (n.lida) porUsuario[email].lidas++;
    if (n.clicada) porUsuario[email].clicadas++;
  });

  const usuariosEngajamento = Object.entries(porUsuario)
    .map(([email, stats]) => ({
      email,
      ...stats,
      taxa_leitura: stats.total > 0 ? Math.round((stats.lidas / stats.total) * 100) : 0
    }))
    .sort((a, b) => b.taxa_leitura - a.taxa_leitura);

  const maisEngajados = usuariosEngajamento.slice(0, 3);
  const menosEngajados = usuariosEngajamento.slice(-3).reverse();

  const CORES = ['#7E57FF', '#34a853', '#0B7A9E', '#ea4335', '#f59e0b'];

  if (isLoading) {
    return (
      <RouteGuard requireAuth>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-[#7E57FF] rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Carregando métricas...</p>
          </div>
        </div>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard requireAuth>
      <div className="space-y-6">
        <PageHeader
          title="Dashboard Notificações"
          description="Métricas de entrega, leitura, clique e engajamento"
        />

        {/* KPIs */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Taxa Entrega</span>
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{taxaEntrega}%</p>
            <p className="text-xs text-gray-500 mt-1">{entregues}/{totalNotifs} entregues</p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Taxa Leitura</span>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{taxaLeitura}%</p>
            <p className="text-xs text-gray-500 mt-1">{lidas}/{totalNotifs} lidas</p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Taxa Clique</span>
              <MousePointerClick className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{taxaClique}%</p>
            <p className="text-xs text-gray-500 mt-1">{clicadas}/{totalNotifs} clicadas</p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Tempo Leitura</span>
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{p50}min</p>
            <p className="text-xs text-gray-500 mt-1">P50 / P95: {p95}min</p>
          </Card>
        </div>

        {/* Notificações por Tipo */}
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4">Notificações por Tipo (Top 5)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dadosTipo}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tipo" angle={-45} textAnchor="end" height={100} fontSize={11} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#7E57FF" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Distribuição Engajamento */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-bold">Mais Engajados</h3>
            </div>
            <div className="space-y-3">
              {maisEngajados.map((usuario, idx) => (
                <div key={usuario.email} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{usuario.email}</p>
                    <p className="text-xs text-gray-500">{usuario.lidas}/{usuario.total} lidas</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800 ml-2">
                    {usuario.taxa_leitura}%
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-red-600" />
              <h3 className="text-lg font-bold">Menos Engajados</h3>
            </div>
            <div className="space-y-3">
              {menosEngajados.map((usuario, idx) => (
                <div key={usuario.email} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{usuario.email}</p>
                    <p className="text-xs text-gray-500">{usuario.lidas}/{usuario.total} lidas</p>
                  </div>
                  <Badge className="bg-red-100 text-red-800 ml-2">
                    {usuario.taxa_leitura}%
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Benchmark */}
        <Card className="p-6 bg-blue-50 border-blue-200">
          <h3 className="font-bold mb-3">📊 Benchmarks Indústria</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-600 mb-1">Taxa Entrega:</p>
              <p className="font-bold">Meta: {'≥'}90% | Atual: {taxaEntrega}%</p>
              <Badge className={taxaEntrega >= 90 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                {taxaEntrega >= 90 ? '✅ ATINGIDO' : '❌ ABAIXO'}
              </Badge>
            </div>
            <div>
              <p className="text-gray-600 mb-1">Tempo P50:</p>
              <p className="font-bold">Meta: {'≤'}3min | Atual: {p50}min</p>
              <Badge className={p50 <= 3 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                {p50 <= 3 ? '✅ ATINGIDO' : '🟡 ACIMA'}
              </Badge>
            </div>
            <div>
              <p className="text-gray-600 mb-1">Taxa Clique:</p>
              <p className="font-bold">Meta: {'≥'}30% | Atual: {taxaClique}%</p>
              <Badge className={taxaClique >= 30 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                {taxaClique >= 30 ? '✅ ATINGIDO' : '❌ ABAIXO'}
              </Badge>
            </div>
          </div>
        </Card>
      </div>
    </RouteGuard>
  );
}