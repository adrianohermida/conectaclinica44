import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatCard from "@/components/ui/StatCard";
import { Activity, DollarSign, MessageSquare, TrendingUp, AlertCircle, CheckCircle2, Users, Zap } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function MonitoramentoWidget() {
  const [periodo, setPeriodo] = useState('30d');

  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me(),
  });

  const { data: consumos = [], isLoading: loadingConsumos } = useQuery({
    queryKey: ["consumo-widget", user?.clinica_id, periodo],
    queryFn: async () => {
      if (!user?.clinica_id) return [];
      return await base44.entities.ConsumoWidgetIA.filter({ 
        clinica_id: user.clinica_id 
      });
    },
    enabled: !!user?.clinica_id
  });

  const { data: sessoes = [], isLoading: loadingSessoes } = useQuery({
    queryKey: ["sessoes-widget", user?.clinica_id, periodo],
    queryFn: async () => {
      if (!user?.clinica_id) return [];
      return await base44.entities.SessaoWidget.filter({ 
        clinica_id: user.clinica_id 
      });
    },
    enabled: !!user?.clinica_id
  });

  const { data: creditos = [], isLoading: loadingCreditos } = useQuery({
    queryKey: ["creditos-ia", user?.clinica_id],
    queryFn: async () => {
      if (!user?.clinica_id) return [];
      return await base44.entities.CreditoIA.filter({ 
        clinica_id: user.clinica_id 
      });
    },
    enabled: !!user?.clinica_id
  });

  const creditoAtual = creditos[0] || { saldo: 0, consumo_total: 0 };
  const totalConsumos = consumos.length;
  const creditosConsumidos = consumos.reduce((sum, c) => sum + (c.creditos_consumidos || 0), 0);
  const custoTotalBRL = consumos.reduce((sum, c) => sum + (c.custo_cobrado_brl || 0), 0);
  const sessoesConvertidas = sessoes.filter(s => s.converteu_ticket).length;
  const taxaConversao = sessoes.length > 0 ? (sessoesConvertidas / sessoes.length * 100).toFixed(1) : 0;
  const saldoPercentual = (creditoAtual.saldo / 100) * 100;
  const alertaSaldoBaixo = saldoPercentual < 20;

  const consumoPorTipo = consumos.reduce((acc, c) => {
    acc[c.tipo_consumo] = (acc[c.tipo_consumo] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      {alertaSaldoBaixo && (
        <div className="p-4 rounded-xl border-2" style={{ backgroundColor: '#fef9e5', borderColor: '#fbd54f' }}>
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#956802' }} />
            <div>
              <p className="font-semibold" style={{ color: '#956802' }}>⚠️ Saldo Baixo ({saldoPercentual.toFixed(0)}%)</p>
              <p className="text-sm mt-1" style={{ color: '#956802' }}>
                {creditoAtual.saldo.toFixed(2)} créditos restantes.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={DollarSign}
          label="Saldo Créditos"
          value={creditoAtual.saldo.toFixed(2)}
          color={alertaSaldoBaixo ? '#ea4335' : '#7E57FF'}
          bgColor={alertaSaldoBaixo ? '#fef2f2' : '#f5f3ff'}
          loading={loadingCreditos}
        />
        <StatCard
          icon={Zap}
          label="Requisições IA"
          value={totalConsumos}
          color="#7E57FF"
          bgColor="#f5f3ff"
          loading={loadingConsumos}
        />
        <StatCard
          icon={Users}
          label="Sessões Widget"
          value={sessoes.length}
          color="#7E57FF"
          bgColor="#f5f3ff"
          loading={loadingSessoes}
        />
        <StatCard
          icon={TrendingUp}
          label="Taxa Conversão"
          value={`${taxaConversao}%`}
          color={taxaConversao >= 40 ? '#34a853' : '#fbbc04'}
          bgColor={taxaConversao >= 40 ? '#e6f7ed' : '#fef9e5'}
          loading={loadingSessoes}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Consumo por Tipo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(consumoPorTipo).map(([tipo, qtd]) => (
              <div key={tipo} className="p-3 rounded-lg" style={{ backgroundColor: '#f5f3ff' }}>
                <p className="text-xs text-gray-600 mb-1">{tipo.replace('_', ' ').toUpperCase()}</p>
                <p className="text-2xl font-bold" style={{ color: '#7E57FF' }}>{qtd}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Últimos Consumos (20)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Data</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Tipo</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Origem</th>
                  <th className="text-right p-3 text-sm font-medium text-gray-600">Tokens</th>
                  <th className="text-right p-3 text-sm font-medium text-gray-600">Créditos</th>
                  <th className="text-right p-3 text-sm font-medium text-gray-600">Custo (R$)</th>
                  <th className="text-center p-3 text-sm font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {consumos.slice(0, 20).map((consumo) => (
                  <tr key={consumo.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-sm">
                      {format(new Date(consumo.created_date), "dd/MM HH:mm", { locale: ptBR })}
                    </td>
                    <td className="p-3 text-sm">{consumo.tipo_consumo.replace('_', ' ')}</td>
                    <td className="p-3 text-sm">{consumo.origem}</td>
                    <td className="p-3 text-sm text-right">{consumo.tokens_total.toLocaleString()}</td>
                    <td className="p-3 text-sm text-right font-medium">{consumo.creditos_consumidos.toFixed(3)}</td>
                    <td className="p-3 text-sm text-right">R$ {consumo.custo_cobrado_brl.toFixed(4)}</td>
                    <td className="p-3 text-center">
                      {consumo.sucesso ? (
                        <CheckCircle2 className="w-4 h-4 inline" style={{ color: '#34a853' }} />
                      ) : (
                        <AlertCircle className="w-4 h-4 inline" style={{ color: '#ea4335' }} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}