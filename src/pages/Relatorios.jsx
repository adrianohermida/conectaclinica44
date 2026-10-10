import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  Users,
  Calendar,
  DollarSign,
  Package,
  Download,
  ArrowUp,
  ArrowDown,
  Activity,
  FileText
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import { motion } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import RouteGuard from "@/components/auth/RouteGuard";
import { useRelatoriosData } from "@/components/hooks/useRelatoriosData";
import usePerformanceTracker from "@/components/hooks/usePerformanceTracker";
import { useClinicaContext } from "@/components/hooks/useClinicaContext";
import { createPageUrl } from "@/utils";

export default function Relatorios() {
  return (
    <RouteGuard requireAuth requireClinica>
      <RelatoriosContent />
    </RouteGuard>
  );
}

function RelatoriosContent() {
  usePerformanceTracker('/Relatorios');
  const { clinicaId } = useClinicaContext();
  const [periodo, setPeriodo] = useState("30dias");
  const [tipoVisualizacao, setTipoVisualizacao] = useState("kpis");

  // CRÍTICO: 7 queries em paralelo (Promise.all) - 1400ms → 250ms
  const { data: relatoriosData, isLoading } = useRelatoriosData(clinicaId, !!clinicaId);

  const agendamentos = relatoriosData?.agendamentos || [];
  const pacientes = relatoriosData?.pacientes || [];
  const vendas = relatoriosData?.vendas || [];
  const medicamentos = relatoriosData?.medicamentos || [];
  const jornadas = relatoriosData?.jornadas || [];
  const prontuarios = relatoriosData?.prontuarios || [];
  const planos = relatoriosData?.planos || [];

  // Filtrar dados por período
  const getDataFiltrada = (data, dateField) => {
    const hoje = new Date();
    let dataInicio;

    switch (periodo) {
      case "7dias":
        dataInicio = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30dias":
        dataInicio = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90dias":
        dataInicio = new Date(hoje.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "mes":
        dataInicio = startOfMonth(new Date());
        break;
      default:
        dataInicio = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return (data || []).filter((item) => {
      const itemDate = new Date(item[dateField]);
      return itemDate >= dataInicio;
    });
  };

  const agendamentosFiltrados = getDataFiltrada(agendamentos, "data");
  const vendasFiltradas = getDataFiltrada(vendas, "data_venda");
  const prontuariosFiltrados = getDataFiltrada(prontuarios, "data_atendimento");

  // Receita Total
  const receitaTotal = vendasFiltradas.reduce((acc, v) => acc + (v.valor_final || 0), 0);

  // Comparação com período anterior
  const getPeriodoAnteriorDates = (currentPeriod) => {
    const hoje = new Date();
    let dataInicioAnterior, dataFimAnterior;

    switch (currentPeriod) {
      case "7dias":
        dataFimAnterior = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
        dataInicioAnterior = new Date(dataFimAnterior.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30dias":
        dataFimAnterior = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);
        dataInicioAnterior = new Date(dataFimAnterior.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90dias":
        dataFimAnterior = new Date(hoje.getTime() - 90 * 24 * 60 * 60 * 1000);
        dataInicioAnterior = new Date(dataFimAnterior.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "mes":
        dataFimAnterior = endOfMonth(subMonths(hoje, 1));
        dataInicioAnterior = startOfMonth(subMonths(hoje, 1));
        break;
      default: // default to 30 days
        dataFimAnterior = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);
        dataInicioAnterior = new Date(dataFimAnterior.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }
    return { dataInicioAnterior, dataFimAnterior };
  };

  const { dataInicioAnterior, dataFimAnterior } = getPeriodoAnteriorDates(periodo);

  const vendasPeriodoAnterior = (vendas || []).filter(v => {
    const dataVenda = new Date(v.data_venda);
    return dataVenda >= dataInicioAnterior && dataVenda <= dataFimAnterior;
  });

  const receitaPeriodoAnterior = vendasPeriodoAnterior.reduce((acc, v) => acc + (v.valor_final || 0), 0);

  const variacaoReceita = useMemo(() => {
    if (receitaPeriodoAnterior === 0) {
      return receitaTotal > 0 ? 100 : 0;
    }
    return parseFloat((((receitaTotal - receitaPeriodoAnterior) / receitaPeriodoAnterior) * 100).toFixed(1));
  }, [receitaTotal, receitaPeriodoAnterior]);


  // Agendamentos por Status
  const agendamentosPorStatus = [
    {
      name: "Agendado",
      value: agendamentosFiltrados.filter((a) => a.status === "agendado").length,
      color: "bg-[#58B4D4]"
    },
    {
      name: "Confirmado",
      value: agendamentosFiltrados.filter((a) => a.status === "confirmado").length,
      color: "bg-[#0B7A9E]"
    },
    {
      name: "Concluído",
      value: agendamentosFiltrados.filter((a) => a.status === "concluido").length,
      color: "bg-[#8FD8C4]"
    },
    {
      name: "Cancelado",
      value: agendamentosFiltrados.filter((a) => a.status === "cancelado").length,
      color: "bg-[#FFB4AB]"
    }
  ];

  const totalAgendamentos = agendamentosPorStatus.reduce((acc, s) => acc + s.value, 0);

  // Agendamentos por Especialidade
  const agendamentosPorEspecialidade = (agendamentosFiltrados || []).reduce((acc, a) => {
    const esp = a.especialidade || "outro";
    acc[esp] = (acc[esp] || 0) + 1;
    return acc;
  }, {});

  const dadosEspecialidade = Object.entries(agendamentosPorEspecialidade)
    .map(([name, value]) => ({
      name: name.replace(/_/g, " "),
      value,
      percentage: agendamentosFiltrados.length > 0 ? ((value / agendamentosFiltrados.length) * 100).toFixed(1) : 0
    }))
    .sort((a, b) => b.value - a.value);

  // Receita por Mês (últimos 6 meses)
  const receitaPorMes = [];
  for (let i = 5; i >= 0; i--) {
    const mes = subMonths(new Date(), i);
    const inicio = startOfMonth(mes);
    const fim = endOfMonth(mes);

    const vendasDoMes = (vendas || []).filter((v) => {
      const dataVenda = new Date(v.data_venda);
      return dataVenda >= inicio && dataVenda <= fim;
    });

    receitaPorMes.push({
      mes: format(mes, "MMM/yy", { locale: ptBR }),
      receita: vendasDoMes.reduce((acc, v) => acc + (v.valor_final || 0), 0)
    });
  }

  const maxReceita = Math.max(...receitaPorMes.map((r) => r.receita));

  // Jornada do Paciente - Distribuição
  const jornadaDistribuicao = (jornadas || []).reduce((acc, j) => {
    const etapa = j.etapa_atual;
    acc[etapa] = (acc[etapa] || 0) + 1;
    return acc;
  }, {});

  const dadosJornada = Object.entries(jornadaDistribuicao)
    .map(([name, value]) => ({
      name: name.replace(/_/g, " "),
      value,
      percentage: jornadas.length > 0 ? ((value / jornadas.length) * 100).toFixed(1) : 0
    }))
    .sort((a, b) => b.value - a.value);

  // Top 5 Medicamentos com Estoque Baixo
  const estoquesBaixos = (medicamentos || [])
    .filter((m) => m.quantidade_estoque <= (m.estoque_minimo || 0))
    .sort((a, b) => a.quantidade_estoque - b.quantidade_estoque)
    .slice(0, 5);

  // Novos indicadores
  const taxaConversao = useMemo(() => {
    const agendados = agendamentosFiltrados.filter(a => a.status === "agendado" || a.status === "confirmado").length;
    const concluidos = agendamentosFiltrados.filter(a => a.status === "concluido").length;
    return agendados > 0 ? ((concluidos / agendados) * 100).toFixed(1) : 0;
  }, [agendamentosFiltrados]);

  const atendimentosPorMedico = useMemo(() => {
    const porMedico = {};
    (prontuariosFiltrados || []).forEach(p => {
      const medico = p.medico_nome || "Não informado";
      porMedico[medico] = (porMedico[medico] || 0) + 1;
    });
    return Object.entries(porMedico)
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [prontuariosFiltrados]);

  const distribuicaoFormasPagamento = useMemo(() => {
    const formas = {};
    (vendasFiltradas || []).forEach(v => {
      const forma = v.forma_pagamento || "não informado";
      formas[forma] = (formas[forma] || 0) + 1;
    });
    return Object.entries(formas)
      .map(([forma, count]) => ({ forma, count }))
      .sort((a, b) => b.count - a.count);
  }, [vendasFiltradas]);

  const exportarRelatorio = () => {
    const relatorio = {
      periodo: periodo,
      data_geracao: format(new Date(), "dd/MM/yyyy HH:mm"),
      resumo: {
        total_pacientes: pacientes.length,
        agendamentos_periodo: agendamentosFiltrados.length,
        receita_periodo: receitaTotal,
        variacao_receita_anterior: variacaoReceita,
        medicamentos_estoque_baixo: estoquesBaixos.length,
        taxa_conversao: `${taxaConversao}%`,
        atendimentos_no_periodo: prontuariosFiltrados.length,
        planos_ativos: planos.filter(p => p.status === "ativo").length,
      },
      agendamentos_por_status: agendamentosPorStatus,
      agendamentos_por_especialidade: dadosEspecialidade,
      receita_mensal_ultimos_6_meses: receitaPorMes,
      jornada_paciente_distribuicao: dadosJornada,
      atendimentos_por_medico_top_5: atendimentosPorMedico,
      distribuicao_formas_pagamento: distribuicaoFormasPagamento,
      estoque_critico_top_5: estoquesBaixos.map(m => ({
        nome: m.nome,
        apresentacao: m.apresentacao,
        quantidade_estoque: m.quantidade_estoque,
        estoque_minimo: m.estoque_minimo,
      })),
    };

    const blob = new Blob([JSON.stringify(relatorio, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio_prevenclin_${format(new Date(), "yyyy-MM-dd")}.json`;
    link.click();
  };

  if (isLoading) {
    return (
      <RouteGuard requireAuth={true} requireClinica={true}>
        <div className="max-w-7xl mx-auto space-y-6 overflow-x-hidden">
          <div className="pc-card p-6 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-56 mb-3" />
            <div className="h-5 bg-gray-200 rounded w-80" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={i} className="pc-card p-6 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-24 mb-3" />
                <div className="h-8 bg-gray-200 rounded w-16" />
              </div>
            ))}
          </div>
        </div>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard requireAuth={true} requireClinica={true}>
      <div className="max-w-7xl mx-auto space-y-5 md:space-y-6 overflow-x-hidden">:::
        <PageHeader
        title="Relatórios e Analytics"
        description="Análise de dados e métricas"
        breadcrumbs={[
          { label: "Administração", url: createPageUrl("Administracao") },
          { label: "Relatórios" }
        ]}
        action={
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="bg-gray-100 border-0 rounded-full min-h-[48px] w-full sm:w-44" style={{ fontSize: '14px' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7dias" style={{ fontSize: '14px' }}>7 dias</SelectItem>
                <SelectItem value="30dias" style={{ fontSize: '14px' }}>30 dias</SelectItem>
                <SelectItem value="90dias" style={{ fontSize: '14px' }}>90 dias</SelectItem>
                <SelectItem value="mes" style={{ fontSize: '14px' }}>Este mês</SelectItem>
              </SelectContent>
            </Select>
            <button
              onClick={exportarRelatorio}
              className="font-bold rounded-full hover:opacity-90 transition-all min-h-[48px] inline-flex items-center justify-center gap-2 px-5 whitespace-nowrap"
              style={{ backgroundColor: '#7E57FF', color: '#ffffff', fontSize: '14px' }}
              aria-label="Exportar relatório completo"
            >
              <Download className="w-5 h-5 flex-shrink-0" />
              <span className="hidden sm:inline">Exportar</span>
            </button>
          </div>
        }
      />

      {/* Navegação - Mobile First */}
      <div className="pc-card p-3 md:p-4">
        <div className="grid grid-cols-3 gap-2">
          {["kpis", "graficos", "executivo"].map((tipo) => (
            <button
              key={tipo}
              onClick={() => setTipoVisualizacao(tipo)}
              className={`font-bold rounded-xl transition-all min-h-[48px] overflow-hidden ${
                tipoVisualizacao === tipo ? "text-white" : "hover:bg-gray-100"
              }`}
              style={tipoVisualizacao === tipo ? { 
                backgroundColor: '#7E57FF',
                color: '#ffffff',
                fontSize: '14px'
              } : {
                backgroundColor: '#f8f9fa',
                color: '#5f6368',
                fontSize: '14px'
              }}
              aria-pressed={tipoVisualizacao === tipo}
              aria-label={`Visualizar ${tipo === "kpis" ? "indicadores" : tipo === "graficos" ? "gráficos" : "resumo executivo"}`}
            >
              <span className="truncate px-2">
                {tipo === "kpis" ? "KPIs" : tipo === "graficos" ? "Gráficos" : "Executivo"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* KPIs Principais */}
      {tipoVisualizacao === "kpis" && (
        <>
          {(
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <StatCard title="Pacientes" value={pacientes.length} icon={Users} color="#7E57FF" delay={0} />
                <StatCard title="Agendamentos" value={agendamentosFiltrados.length} icon={Calendar} color="#7E57FF" delay={0.05} />
                <StatCard 
                  title="Receita" 
                  value={`R$ ${receitaTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} 
                  icon={DollarSign} 
                  color="#34a853" 
                  delay={0.1}
                  trend={variacaoReceita}
                />
                <StatCard title="Estoque Baixo" value={estoquesBaixos.length} icon={Package} color="#ea4335" delay={0.15} />
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <StatCard title="Conversão" value={`${taxaConversao}%`} icon={TrendingUp} color="#7E57FF" delay={0.2} />
                <StatCard 
                  title="Ticket Médio" 
                  value={`R$ ${vendasFiltradas.length > 0 ? (receitaTotal / vendasFiltradas.length).toFixed(2) : "0.00"}`} 
                  icon={DollarSign} 
                  color="#34a853" 
                  delay={0.25} 
                />
                <StatCard title="Atendimentos" value={prontuariosFiltrados.length} icon={FileText} color="#7E57FF" delay={0.3} />
                <StatCard 
                  title="Planos Ativos" 
                  value={planos.filter(p => p.status === "ativo").length} 
                  icon={Activity} 
                  color="#7E57FF" 
                  delay={0.35} 
                />
              </div>
            </>
          )}
        </>
      )}

      {/* Gráficos Detalhados */}
      {tipoVisualizacao === "graficos" && (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5 overflow-hidden">
            <div className="pc-card p-5 md:p-6">
              <div className="min-w-0">
                <h2 className="pc-heading-4 mb-4 flex items-center gap-2 break-words">
                  <Activity className="w-5 h-5 flex-shrink-0" style={{ color: '#7E57FF' }} aria-hidden="true" />
                  <span className="truncate">Agendamentos</span>
                </h2>
                <div className="space-y-3 overflow-hidden">
                  {agendamentosPorStatus.map((item) => {
                    const percentage = totalAgendamentos > 0 ? (item.value / totalAgendamentos) * 100 : 0;
                    return (
                      <div key={item.name} className="space-y-2 min-w-0">
                        <div className="flex justify-between items-center gap-2 min-w-0">
                          <span className="font-bold truncate" style={{ color: '#202124', fontSize: '14px' }}>{item.name}</span>
                          <span className="whitespace-nowrap flex-shrink-0" style={{ color: '#5f6368', fontSize: '14px' }}>
                            {item.value} ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <ProgressBar value={percentage} max={100} showLabel={false} color="auto" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pc-card p-5 md:p-6">
              <div className="min-w-0">
                <h2 className="pc-heading-4 mb-4 flex items-center gap-2 break-words">
                  <TrendingUp className="w-5 h-5 flex-shrink-0" style={{ color: '#7E57FF' }} aria-hidden="true" />
                  <span className="truncate">Especialidade</span>
                </h2>
                <div className="space-y-3 overflow-hidden">
                  {dadosEspecialidade.length === 0 ? (
                    <div className="text-center py-8">
                      <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p style={{ color: '#5f6368', fontSize: '14px' }}>Nenhum agendamento por especialidade</p>
                    </div>
                  ) : (
                    dadosEspecialidade.slice(0, 5).map((item) => (
                      <div key={item.name} className="bg-gray-100 rounded-xl p-3 border overflow-hidden min-w-0" style={{ borderColor: '#e8eaed' }}>
                        <div className="flex justify-between items-center gap-2 min-w-0">
                          <span className="capitalize truncate flex-1" style={{ color: '#202124', fontSize: '14px', fontWeight: '500' }}>{item.name}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="whitespace-nowrap" style={{ color: '#5f6368', fontSize: '14px' }}>{item.value}</span>
                            <span className="px-2 py-1 rounded-lg font-bold whitespace-nowrap" style={{ 
                              backgroundColor: '#e8f1fb',
                              color: '#1a73e8',
                              fontSize: '13px',
                              border: '1px solid #c2e0ff'
                            }}>{item.percentage}%</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="pc-card p-4 md:p-6">
              <div>
                <h2 className="pc-heading-4 mb-3 md:mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" style={{ color: '#7E57FF' }} aria-hidden="true" />
                  <span className="truncate">Atendimentos por Médico</span>
                </h2>
                <div className="space-y-2.5 md:space-y-3">
                  {atendimentosPorMedico.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm text-gray-600">Nenhum atendimento no período</p>
                    </div>
                  ) : (
                    atendimentosPorMedico.map((item, idx) => (
                      <div key={idx} className="rounded-xl p-3 border overflow-hidden" style={{ backgroundColor: '#f5f3ff', borderColor: '#e9ddff' }}>
                        <div className="flex justify-between items-center gap-2">
                          <span className="font-normal text-xs sm:text-sm text-gray-800 truncate">Dr(a). {item.nome}</span>
                          <span className="text-base sm:text-lg font-semibold whitespace-nowrap" style={{ color: '#7E57FF' }}>{item.total}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="pc-card p-4 md:p-6">
              <div>
                <h2 className="pc-heading-4 mb-3 md:mb-4 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" style={{ color: '#34a853' }} aria-hidden="true" />
                  <span className="truncate">Formas de Pagamento</span>
                </h2>
                <div className="space-y-2.5 md:space-y-3">
                  {distribuicaoFormasPagamento.length === 0 ? (
                    <div className="text-center py-8">
                      <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm text-gray-600">Nenhuma venda no período</p>
                    </div>
                  ) : (
                    distribuicaoFormasPagamento.map((item, idx) => (
                      <div key={idx} className="rounded-xl p-3 border overflow-hidden" style={{ backgroundColor: '#f0fdf4', borderColor: '#d1fae5' }}>
                        <div className="flex justify-between items-center gap-2">
                          <span className="font-normal text-xs sm:text-sm capitalize text-gray-800 truncate flex-1">{item.forma.replace(/_/g, " ")}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">{item.count}</span>
                            <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-green-50 text-green-700 border border-green-200 whitespace-nowrap">
                              {vendasFiltradas.length > 0 ? ((item.count / vendasFiltradas.length) * 100).toFixed(1) : 0}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="pc-card p-4 md:p-6 lg:col-span-2">
              <div>
                <h2 className="pc-heading-4 mb-3 md:mb-4 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" style={{ color: '#34a853' }} aria-hidden="true" />
                  <span className="truncate">Evolução da Receita</span>
                </h2>
                <div className="space-y-2 md:space-y-3 overflow-hidden">
                  {receitaPorMes.map((item) => {
                    const percentage = maxReceita > 0 ? (item.receita / maxReceita) * 100 : 0;
                    return (
                      <div key={item.mes} className="space-y-1.5 md:space-y-2">
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-xs md:text-sm font-normal text-gray-600 whitespace-nowrap">{item.mes}</span>
                          <span className="text-xs md:text-sm font-semibold text-gray-800 truncate">
                            R$ {item.receita.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        <ProgressBar value={percentage} max={100} showLabel={false} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pc-card p-4 md:p-6">
              <div>
                <h2 className="pc-heading-4 mb-3 md:mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" style={{ color: '#7E57FF' }} aria-hidden="true" />
                  <span className="truncate">Jornada dos Pacientes</span>
                </h2>
                <div className="space-y-2.5 md:space-y-3">
                  {dadosJornada.length === 0 ? (
                    <div className="text-center py-8">
                      <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm text-gray-600">Nenhuma jornada registrada</p>
                    </div>
                  ) : (
                    dadosJornada.slice(0, 6).map((item) => (
                      <div key={item.name} className="rounded-xl p-3 border overflow-hidden" style={{ backgroundColor: '#f5f3ff', borderColor: '#e9ddff' }}>
                        <div className="flex justify-between items-center gap-2">
                          <span className="font-normal capitalize text-xs sm:text-sm text-gray-800 truncate flex-1">{item.name}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">{item.value}</span>
                            <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">{item.percentage}%</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="pc-card p-4 md:p-6">
              <div>
                <h2 className="pc-heading-4 mb-3 md:mb-4 flex items-center gap-2">
                  <Package className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" style={{ color: '#ea4335' }} aria-hidden="true" />
                  <span className="truncate">Estoque Crítico</span>
                </h2>
                <div className="space-y-2.5 md:space-y-3">
                  {estoquesBaixos.length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <h3 className="text-sm font-semibold text-gray-800 mb-1">Estoque saudável</h3>
                      <p className="text-xs text-gray-600">Nenhum item com estoque baixo</p>
                    </div>
                  ) : (
                    estoquesBaixos.map((med) => (
                      <div key={med.id} className="bg-red-50 rounded-xl p-3 sm:p-4 border-l-4 overflow-hidden" style={{ borderLeftColor: '#ea4335', borderRight: '1px solid #fecaca', borderTop: '1px solid #fecaca', borderBottom: '1px solid #fecaca' }}>
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-800 text-xs sm:text-sm truncate">{med.nome}</h3>
                            <p className="text-[10px] sm:text-xs text-gray-600 mt-1 truncate">{med.apresentacao}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-base sm:text-lg font-semibold text-red-600 whitespace-nowrap">{med.quantidade_estoque}</p>
                            <p className="text-[10px] sm:text-xs text-gray-600 whitespace-nowrap">Mín: {med.estoque_minimo}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            </div>
        </>
      )}

      {/* Resumo Executivo */}
      {tipoVisualizacao === "executivo" && (
        <>
          {isLoading ? (
            <div className="space-y-4">
              <div className="pc-card p-4 md:p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="space-y-3">
                      <div className="h-10 w-10 rounded-lg bg-gray-200" />
                      <div className="h-4 bg-gray-200 rounded w-2/3" />
                      <div className="h-6 bg-gray-200 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="pc-card p-4 md:p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/4 mb-4" />
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-gray-200 rounded-xl" />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
            <div className="pc-card p-4 md:p-6">
              <div>
                <h2 className="pc-heading-3 mb-3 md:mb-4">Resumo Executivo</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                  <StatCard 
                    title="Conclusão" 
                    value={`${totalAgendamentos > 0 ? ((agendamentosPorStatus.find((s) => s.name === "Concluído")?.value / totalAgendamentos) * 100).toFixed(1) : 0}%`} 
                    icon={TrendingUp} 
                    color="#34a853" 
                  />
                  <StatCard 
                    title="Cancelamento" 
                    value={`${totalAgendamentos > 0 ? ((agendamentosPorStatus.find((s) => s.name === "Cancelado")?.value / totalAgendamentos) * 100).toFixed(1) : 0}%`} 
                    icon={ArrowDown} 
                    color="#ea4335" 
                  />
                  <StatCard 
                    title="Ticket Médio" 
                    value={`R$ ${vendasFiltradas.length > 0 ? (receitaTotal / vendasFiltradas.length).toFixed(2) : "0.00"}`} 
                    icon={DollarSign} 
                    color="#7E57FF" 
                  />
                  <StatCard 
                    title="Ativos" 
                    value={pacientes.filter((p) => p.status === "ativo").length} 
                    icon={Users} 
                    color="#7E57FF" 
                  />
                </div>
              </div>
            </div>

            <div className="pc-card p-4 md:p-6">
              <div>
                <h3 className="pc-heading-4 mb-3 md:mb-4">💡 Insights</h3>
                <div className="space-y-2 md:space-y-3">
                  <div className="bg-green-50 rounded-xl p-3 md:p-4 border border-green-200 min-h-[64px] flex items-center overflow-hidden">
                    <p className="text-xs md:text-sm text-green-800 break-words">
                      <strong>✅ Crescimento:</strong> Receita {variacaoReceita > 0 ? "↑" : "↓"} {Math.abs(variacaoReceita)}%
                    </p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3 md:p-4 border border-blue-200 min-h-[64px] flex items-center overflow-hidden">
                    <p className="text-xs md:text-sm text-blue-800 break-words">
                      <strong>📊 Conversão:</strong> {taxaConversao}% concluídos
                    </p>
                  </div>
                  {atendimentosPorMedico[0] && (
                    <div className="rounded-xl p-3 md:p-4 border min-h-[64px] flex items-center overflow-hidden" style={{ backgroundColor: '#f5f3ff', borderColor: '#e9ddff' }}>
                      <p className="text-xs md:text-sm break-words" style={{ color: '#7E57FF' }}>
                        <strong>🏆 Destaque:</strong> Dr(a). {atendimentosPorMedico[0].nome} - {atendimentosPorMedico[0].total}
                      </p>
                    </div>
                  )}
                  {distribuicaoFormasPagamento[0] && vendasFiltradas.length > 0 && (
                    <div className="bg-yellow-50 rounded-xl p-3 md:p-4 border border-yellow-200 min-h-[64px] flex items-center overflow-hidden">
                      <p className="text-xs md:text-sm text-yellow-800 break-words">
                        <strong>💳:</strong> {((distribuicaoFormasPagamento[0].count / vendasFiltradas.length) * 100).toFixed(0)}% {distribuicaoFormasPagamento[0].forma}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            </div>
          )}
        </>
      )}
      </div>
    </RouteGuard>
  );
}