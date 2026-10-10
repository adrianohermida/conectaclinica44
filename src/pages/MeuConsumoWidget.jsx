import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import RouteGuard from "@/components/auth/RouteGuard";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/Button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { DollarSign, Zap, TrendingDown, AlertCircle, Loader2, CreditCard } from "lucide-react";
import { format, subDays } from "date-fns";

export default function MeuConsumoWidget() {
  return (
    <RouteGuard requireAuth requireClinica>
      <MeuConsumoWidgetContent />
    </RouteGuard>
  );
}

function MeuConsumoWidgetContent() {
  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me(),
  });

  const { data: credito, isLoading: loadingCredito } = useQuery({
    queryKey: ["credito-ia", user?.clinica_id],
    queryFn: async () => {
      const c = await base44.entities.CreditoIA.filter({ clinica_id: user.clinica_id });
      return c[0] || { saldo: 0, saldo_total: 0 };
    },
    enabled: !!user?.clinica_id
  });

  const { data: consumos, isLoading: loadingConsumos } = useQuery({
    queryKey: ["consumos-30d", user?.clinica_id],
    queryFn: async () => {
      const dataInicio = subDays(new Date(), 30).toISOString();
      const all = await base44.entities.ConsumoWidgetIA.filter({
        clinica_id: user.clinica_id
      });
      return all.filter(c => new Date(c.created_date) >= new Date(dataInicio));
    },
    enabled: !!user?.clinica_id
  });

  const analytics = useMemo(() => {
    if (!consumos) return null;

    // Agrupar por dia
    const porDia = {};
    consumos.forEach(c => {
      const dia = format(new Date(c.created_date), 'dd/MM');
      if (!porDia[dia]) {
        porDia[dia] = { dia, creditos: 0 };
      }
      porDia[dia].creditos += c.creditos_consumidos || 0;
    });

    const grafico = Object.values(porDia).sort((a, b) => 
      new Date(a.dia.split('/').reverse().join('-')) - new Date(b.dia.split('/').reverse().join('-'))
    );

    const consumoDiarioMedio = consumos.length > 0 
      ? consumos.reduce((acc, c) => acc + (c.creditos_consumidos || 0), 0) / 30 
      : 0;

    const diasRestantes = consumoDiarioMedio > 0 
      ? Math.floor((credito?.saldo || 0) / consumoDiarioMedio) 
      : 999;

    return {
      grafico,
      consumoDiarioMedio,
      diasRestantes,
      totalConsumo30d: consumos.reduce((acc, c) => acc + (c.creditos_consumidos || 0), 0)
    };
  }, [consumos, credito]);

  const handleRecarregar = async () => {
    try {
      const response = await base44.functions.invoke('criarCheckoutCreditos', {
        clinica_id: user.clinica_id,
        quantidade_creditos: 100
      });

      if (response.data.checkout_url) {
        window.location.href = response.data.checkout_url;
      }
    } catch (error) {
      console.error('Erro checkout:', error);
    }
  };

  if (loadingCredito || loadingConsumos) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#7E57FF' }} />
      </div>
    );
  }

  const saldoBaixo = (credito?.saldo || 0) < 10;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Consumo de Créditos IA"
        description="Monitore seu saldo e projeções"
        breadcrumbs={[
          { label: "Administração", url: "/Administracao" },
          { label: "Consumo Widget" }
        ]}
      />

      {/* Alerta Saldo Baixo <20% */}
      {(credito?.saldo || 0) / (credito?.saldo_total || 1) < 0.2 && (
        <Card className="border-2 animate-pulse" style={{ borderColor: '#ea4335', backgroundColor: '#fef2f2' }}>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <AlertCircle className="w-8 h-8 flex-shrink-0" style={{ color: '#ea4335' }} />
              <div className="flex-1">
                <h3 className="font-bold text-xl mb-2" style={{ color: '#991b1b' }}>
                  🚨 ALERTA: Saldo Crítico ({((credito?.saldo || 0) / (credito?.saldo_total || 1) * 100).toFixed(0)}%)
                </h3>
                <p className="text-sm mb-3" style={{ color: '#7f1d1d' }}>
                  Você tem apenas <strong>{(credito?.saldo || 0).toFixed(2)} créditos</strong> restantes.
                  {analytics?.diasRestantes < 7 && ` Projeção: esgota em ${analytics.diasRestantes} dias.`}
                </p>
                <p className="text-xs mb-4" style={{ color: '#991b1b' }}>
                  ⚠️ Sem créditos, a IA será desativada automaticamente e clientes receberão apenas respostas manuais.
                </p>
                <Button
                  onClick={handleRecarregar}
                  className="px-6 py-3"
                  style={{ backgroundColor: '#ea4335' }}
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  Recarregar Agora (R$ 900 = 100 créditos)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Saldo Atual */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Saldo Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold" style={{ color: saldoBaixo ? '#ea4335' : '#34a853' }}>
              {(credito?.saldo || 0).toFixed(2)}
            </div>
            <p className="text-xs text-gray-500 mt-1">créditos disponíveis</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Consumo 30d
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold" style={{ color: '#7E57FF' }}>
              {analytics?.totalConsumo30d.toFixed(2) || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">créditos consumidos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Projeção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold" style={{ color: analytics?.diasRestantes < 7 ? '#ea4335' : '#7E57FF' }}>
              {analytics?.diasRestantes || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">dias até esgotamento</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico Consumo 30d */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico Consumo (30 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics?.grafico || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8eaed" />
              <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
              <YAxis label={{ value: 'Créditos', angle: -90, position: 'insideLeft' }} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => `${value.toFixed(2)} créditos`} />
              <Line type="monotone" dataKey="creditos" stroke="#7E57FF" strokeWidth={2} dot={{ fill: '#7E57FF' }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Informações */}
      <Card>
        <CardHeader>
          <CardTitle>Informações de Cobrança</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-xl" style={{ backgroundColor: '#f5f3ff' }}>
            <p className="text-sm font-semibold mb-2" style={{ color: '#7E57FF' }}>
              💰 Modelo de Cobrança
            </p>
            <ul className="text-sm space-y-1" style={{ color: '#5f6368' }}>
              <li>• 1 crédito ≈ 1 pergunta IA no widget</li>
              <li>• Recarga: R$ 900,00 = 100 créditos</li>
              <li>• Custo médio: ~R$ 9,00 por pergunta</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl" style={{ backgroundColor: '#fef9e5' }}>
            <p className="text-sm font-semibold mb-2" style={{ color: '#956802' }}>
              📊 Sua Média Diária
            </p>
            <p className="text-2xl font-bold" style={{ color: '#7E57FF' }}>
              {analytics?.consumoDiarioMedio.toFixed(2)} créditos/dia
            </p>
            <p className="text-xs mt-1" style={{ color: '#80868b' }}>
              Base: últimos 30 dias
            </p>
          </div>

          <Button
            onClick={handleRecarregar}
            className="w-full py-3"
            style={{ backgroundColor: '#34a853' }}
          >
            <CreditCard className="w-5 h-5 mr-2" />
            Recarregar Créditos (R$ 900 = 100 créditos)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}