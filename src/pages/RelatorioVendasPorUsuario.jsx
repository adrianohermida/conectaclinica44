import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import RouteGuard from "@/components/auth/RouteGuard";
import { useClinicaContext } from "@/components/hooks/useClinicaContext";
import {
  TrendingUp,
  UserCircle,
  AlertTriangle,
  ShoppingCart,
  DollarSign
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * RELATÓRIO VENDAS POR USUÁRIO - Detecção Fraude Interna
 * 
 * Mostra vendas por vendedor (user)
 * Detecta padrões anômalos:
 * - Vendas excessivas (>50/dia)
 * - Horários suspeitos (madrugada)
 * - Valores muito baixos repetidos
 * 
 * Ganho: compliance, auditoria, prevenir fraude interna
 */

export default function RelatorioVendasPorUsuario() {
  const { clinicaId } = useClinicaContext();
  const [periodoSelecionado, setPeriodoSelecionado] = useState("30d");

  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me()
  });

  const isSuperAdminOuGestor = user?.role === 'admin' || user?.perfil === 'admin_clinica';

  const { data: vendas = [] } = useQuery({
    queryKey: ["vendas", clinicaId],
    queryFn: () => clinicaId ? base44.entities.Venda.filter({ clinica_id: clinicaId }, "-data_venda", 500) : [],
    enabled: !!clinicaId && isSuperAdminOuGestor,
    staleTime: 60000
  });

  const { data: logsAuditoria = [] } = useQuery({
    queryKey: ["logs-vendas", clinicaId],
    queryFn: () => clinicaId ? base44.entities.LogAuditoria.filter({ 
      clinica_id: clinicaId,
      acao: 'venda_criada'
    }, "-created_date", 500) : [],
    enabled: !!clinicaId && isSuperAdminOuGestor,
    staleTime: 60000
  });

  const dataInicioPeriodo = useMemo(() => {
    const dias = periodoSelecionado === "7d" ? 7 : periodoSelecionado === "30d" ? 30 : 90;
    return subDays(new Date(), dias);
  }, [periodoSelecionado]);

  const vendasPorUsuario = useMemo(() => {
    const agregado = {};

    vendas.forEach(venda => {
      const dataVenda = new Date(venda.data_venda);
      if (dataVenda < dataInicioPeriodo) return;

      const vendedorId = venda.vendedor_id || 'desconhecido';
      if (!agregado[vendedorId]) {
        agregado[vendedorId] = {
          vendedor_id: vendedorId,
          vendedor_nome: venda.vendedor_nome || 'Desconhecido',
          total_vendas: 0,
          receita_total: 0,
          vendas_por_dia: {},
          horarios_suspeitos: 0 // vendas entre 00h-06h
        };
      }

      agregado[vendedorId].total_vendas++;
      agregado[vendedorId].receita_total += venda.valor_final || 0;

      // Detectar vendas em horários suspeitos (via audit log)
      const log = logsAuditoria.find(l => l.entidade_id === venda.id);
      if (log) {
        const horaVenda = new Date(log.created_date).getHours();
        if (horaVenda >= 0 && horaVenda < 6) {
          agregado[vendedorId].horarios_suspeitos++;
        }
      }

      // Vendas por dia
      const diaKey = format(dataVenda, "yyyy-MM-dd");
      agregado[vendedorId].vendas_por_dia[diaKey] = (agregado[vendedorId].vendas_por_dia[diaKey] || 0) + 1;
    });

    return Object.values(agregado).sort((a, b) => b.total_vendas - a.total_vendas);
  }, [vendas, logsAuditoria, dataInicioPeriodo]);

  const anomalias = useMemo(() => {
    return vendasPorUsuario.filter(v => {
      const maxVendasDia = Math.max(...Object.values(v.vendas_por_dia));
      return maxVendasDia > 50 || v.horarios_suspeitos > 5;
    });
  }, [vendasPorUsuario]);

  const dadosGrafico = useMemo(() => {
    return vendasPorUsuario.slice(0, 10).map(v => ({
      nome: v.vendedor_nome.split(' ')[0],
      vendas: v.total_vendas,
      receita: v.receita_total
    }));
  }, [vendasPorUsuario]);

  if (!isSuperAdminOuGestor) {
    return (
      <RouteGuard requireAuth requireClinica>
        <Card>
          <div className="p-8 text-center">
            <p className="text-red-600">Acesso restrito a administradores</p>
          </div>
        </Card>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard requireAuth requireClinica>
      <div className="space-y-6">
        <PageHeader
          title="Vendas por Usuário"
          description="Auditoria e detecção de anomalias"
          breadcrumbs={[{ label: "Financeiro" }, { label: "Auditoria" }]}
        />

        {/* Filtros */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border" style={{ borderColor: '#e8eaed' }}>
          <Select value={periodoSelecionado} onValueChange={setPeriodoSelecionado}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ zIndex: 999999 }}>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Anomalias Detectadas */}
        {anomalias.length > 0 && (
          <Card>
            <div className="p-6 bg-red-50 border-l-4 border-red-500">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="font-bold text-red-900 mb-2">
                    ⚠️ {anomalias.length} Usuário(s) com Padrão Anômalo
                  </h3>
                  <div className="space-y-2">
                    {anomalias.map(a => {
                      const maxVendasDia = Math.max(...Object.values(a.vendas_por_dia));
                      return (
                        <div key={a.vendedor_id} className="bg-white rounded-lg p-3 border border-red-200">
                          <p className="font-medium text-gray-800">{a.vendedor_nome}</p>
                          <div className="flex flex-wrap gap-3 text-sm text-gray-600 mt-1">
                            {maxVendasDia > 50 && <span>🔥 Pico: {maxVendasDia} vendas/dia</span>}
                            {a.horarios_suspeitos > 5 && <span>🌙 {a.horarios_suspeitos} vendas madrugada</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Gráfico Top Vendedores */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-bold mb-4" style={{ color: '#202124' }}>
              Top 10 Vendedores
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dadosGrafico}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8eaed" />
                <XAxis dataKey="nome" stroke="#5f6368" style={{ fontSize: '12px' }} />
                <YAxis stroke="#5f6368" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e8eaed',
                    borderRadius: '12px'
                  }}
                />
                <Bar dataKey="vendas" fill="#7E57FF" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Tabela Detalhada */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-bold mb-4" style={{ color: '#202124' }}>
              Detalhamento por Vendedor
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b" style={{ borderColor: '#e8eaed' }}>
                    <th className="text-left py-3 px-4 font-semibold" style={{ color: '#5f6368' }}>Vendedor</th>
                    <th className="text-center py-3 px-4 font-semibold" style={{ color: '#5f6368' }}>Total Vendas</th>
                    <th className="text-center py-3 px-4 font-semibold" style={{ color: '#5f6368' }}>Receita</th>
                    <th className="text-center py-3 px-4 font-semibold" style={{ color: '#5f6368' }}>Ticket Médio</th>
                    <th className="text-center py-3 px-4 font-semibold" style={{ color: '#5f6368' }}>Pico Dia</th>
                    <th className="text-center py-3 px-4 font-semibold" style={{ color: '#5f6368' }}>Madrugada</th>
                  </tr>
                </thead>
                <tbody>
                  {vendasPorUsuario.map(v => {
                    const maxVendasDia = Math.max(...Object.values(v.vendas_por_dia));
                    const ticketMedio = v.receita_total / v.total_vendas;
                    
                    return (
                      <tr key={v.vendedor_id} className="border-b hover:bg-gray-50" style={{ borderColor: '#e8eaed' }}>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <UserCircle className="w-4 h-4 text-purple-600" />
                            <span className="font-medium">{v.vendedor_nome}</span>
                          </div>
                        </td>
                        <td className="text-center py-4 px-4 font-bold">
                          {v.total_vendas}
                        </td>
                        <td className="text-center py-4 px-4 font-bold text-green-600">
                          R$ {v.receita_total.toFixed(2)}
                        </td>
                        <td className="text-center py-4 px-4 text-gray-600">
                          R$ {ticketMedio.toFixed(2)}
                        </td>
                        <td className="text-center py-4 px-4">
                          <span className={`px-3 py-1 rounded-full font-bold ${
                            maxVendasDia > 50 ? 'bg-red-100 text-red-700' :
                            maxVendasDia > 20 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {maxVendasDia}
                          </span>
                        </td>
                        <td className="text-center py-4 px-4">
                          {v.horarios_suspeitos > 0 && (
                            <span className="px-3 py-1 rounded-full font-bold bg-orange-100 text-orange-700">
                              {v.horarios_suspeitos}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </div>
    </RouteGuard>
  );
}