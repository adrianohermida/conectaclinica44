import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function RelatorioFinanceiro({ 
  vendas = [], 
  contasPagar = [], 
  contasReceber = [] 
}) {
  const [tipoRelatorio, setTipoRelatorio] = useState("fluxo_caixa");
  const [dataInicio, setDataInicio] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dataFim, setDataFim] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas");
  const [centroCustoFiltro, setCentroCustoFiltro] = useState("todos");

  const COLORS = ['#0B7A9E', '#58B4D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  // Fluxo de Caixa
  const dadosFluxoCaixa = useMemo(() => {
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    const dias = eachDayOfInterval({ start: inicio, end: fim });

    return dias.map(dia => {
      const diaStr = format(dia, "yyyy-MM-dd");
      
      const receitasDia = contasReceber
        .filter(c => c.data_recebimento === diaStr && c.status === "recebido")
        .reduce((acc, c) => acc + c.valor, 0);

      const despesasDia = contasPagar
        .filter(c => c.data_pagamento === diaStr && c.status === "pago")
        .reduce((acc, c) => acc + c.valor, 0);

      return {
        data: format(dia, "dd/MM"),
        receitas: receitasDia,
        despesas: despesasDia,
        saldo: receitasDia - despesasDia
      };
    });
  }, [dataInicio, dataFim, contasReceber, contasPagar]);

  // Receitas por Categoria
  const receitasPorCategoria = useMemo(() => {
    const categorias = {};
    contasReceber
      .filter(c => c.status === "recebido")
      .forEach(c => {
        categorias[c.categoria] = (categorias[c.categoria] || 0) + c.valor;
      });
    
    return Object.entries(categorias).map(([name, value]) => ({
      name: name.replace(/_/g, " "),
      value: value
    }));
  }, [contasReceber]);

  // Despesas por Categoria
  const despesasPorCategoria = useMemo(() => {
    const categorias = {};
    contasPagar
      .filter(c => c.status === "pago")
      .forEach(c => {
        categorias[c.categoria] = (categorias[c.categoria] || 0) + c.valor;
      });
    
    return Object.entries(categorias).map(([name, value]) => ({
      name: name.replace(/_/g, " "),
      value: value
    }));
  }, [contasPagar]);

  const exportarPDF = async () => {
    const element = document.getElementById('relatorio-container');
    const canvas = await html2canvas(element);
    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 190;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
    pdf.save(`relatorio_financeiro_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const exportarCSV = () => {
    let csv = "";
    
    if (tipoRelatorio === "fluxo_caixa") {
      csv = "Data;Receitas;Despesas;Saldo\n";
      csv += dadosFluxoCaixa.map(d => 
        `${d.data};${d.receitas.toFixed(2)};${d.despesas.toFixed(2)};${d.saldo.toFixed(2)}`
      ).join("\n");
    } else if (tipoRelatorio === "contas_receber") {
      csv = "Descrição;Categoria;Paciente;Valor;Vencimento;Status\n";
      csv += contasReceber.map(c => 
        `${c.descricao};${c.categoria};${c.paciente_nome || ''};${c.valor.toFixed(2)};${format(new Date(c.data_vencimento), 'dd/MM/yyyy')};${c.status}`
      ).join("\n");
    } else if (tipoRelatorio === "contas_pagar") {
      csv = "Descrição;Categoria;Fornecedor;Valor;Vencimento;Status\n";
      csv += contasPagar.map(c => 
        `${c.descricao};${c.categoria};${c.fornecedor || ''};${c.valor.toFixed(2)};${format(new Date(c.data_vencimento), 'dd/MM/yyyy')};${c.status}`
      ).join("\n");
    }

    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio_${tipoRelatorio}_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  const totalReceitas = useMemo(() => 
    contasReceber.filter(c => c.status === "recebido").reduce((acc, c) => acc + c.valor, 0),
    [contasReceber]
  );

  const totalDespesas = useMemo(() => 
    contasPagar.filter(c => c.status === "pago").reduce((acc, c) => acc + c.valor, 0),
    [contasPagar]
  );

  // KPIs Financeiros
  const kpis = useMemo(() => {
    const receitasPendentes = contasReceber.filter(c => c.status === "pendente").reduce((acc, c) => acc + c.valor, 0);
    const despesasPendentes = contasPagar.filter(c => c.status === "pendente").reduce((acc, c) => acc + c.valor, 0);
    const margemLucro = totalReceitas > 0 ? ((totalReceitas - totalDespesas) / totalReceitas * 100).toFixed(1) : 0;
    
    return {
      receitasPendentes,
      despesasPendentes,
      margemLucro,
      saldoProjetado: totalReceitas - totalDespesas + receitasPendentes - despesasPendentes
    };
  }, [totalReceitas, totalDespesas, contasReceber, contasPagar]);

  return (
    <div className="space-y-6" id="relatorio-container">
      {/* Controles */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Relatório</label>
            <Select value={tipoRelatorio} onValueChange={setTipoRelatorio}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[80]">
                <SelectItem value="fluxo_caixa">Fluxo de Caixa</SelectItem>
                <SelectItem value="receitas_despesas">Receitas vs Despesas</SelectItem>
                <SelectItem value="contas_receber">Contas a Receber</SelectItem>
                <SelectItem value="contas_pagar">Contas a Pagar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data Início</label>
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data Fim</label>
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
            <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[80]">
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="consulta">Consultas</SelectItem>
                <SelectItem value="procedimento">Procedimentos</SelectItem>
                <SelectItem value="venda_produtos">Vendas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={exportarCSV} variant="outline" className="flex-1">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button onClick={exportarPDF} variant="outline" className="flex-1">
              <FileText className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Resumo Executivo */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-green-50 rounded-lg p-6 border border-green-200">
          <p className="text-sm text-green-800 mb-1">Receitas Realizadas</p>
          <p className="text-3xl font-bold text-green-900">
            R$ {totalReceitas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
          <p className="pc-caption text-[var(--pc-success-700)] mt-1">
            Pendente: R$ {kpis.receitasPendentes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-[var(--pc-error-50)] rounded-xl p-6 border border-[var(--pc-error-200)]">
          <p className="pc-body-sm text-[var(--pc-error-800)] mb-1">Despesas Pagas</p>
          <p className="pc-heading-2 text-[var(--pc-error-900)]">
            R$ {totalDespesas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
          <p className="pc-caption text-[var(--pc-error-700)] mt-1">
            Pendente: R$ {kpis.despesasPendentes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className={`rounded-xl p-6 border ${totalReceitas - totalDespesas >= 0 ? "bg-[var(--pc-info-50)] border-[var(--pc-info-200)]" : "bg-[var(--pc-warning-50)] border-[var(--pc-warning-200)]"}`}>
          <p className={`pc-body-sm mb-1 ${totalReceitas - totalDespesas >= 0 ? "text-[var(--pc-info-800)]" : "text-[var(--pc-warning-800)]"}`}>
            Saldo Atual
          </p>
          <p className={`pc-heading-2 ${totalReceitas - totalDespesas >= 0 ? "text-[var(--pc-info-900)]" : "text-[var(--pc-warning-900)]"}`}>
            R$ {(totalReceitas - totalDespesas).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
          <p className="pc-caption mt-1">Margem: {kpis.margemLucro}%</p>
        </div>
        <div className="bg-[var(--pc-secondary-50)] rounded-xl p-6 border border-[var(--pc-secondary-200)]">
          <p className="pc-body-sm text-[var(--pc-secondary-800)] mb-1">Saldo Projetado</p>
          <p className="pc-heading-2 text-[var(--pc-secondary-900)]">
            R$ {kpis.saldoProjetado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
          <p className="pc-caption text-[var(--pc-secondary-700)] mt-1">Com pendências</p>
        </div>
      </div>

      {/* Gráficos */}
      {tipoRelatorio === "fluxo_caixa" && (
        <div className="pc-card p-6">
          <h3 className="pc-heading-4 mb-4">Fluxo de Caixa Diário</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dadosFluxoCaixa}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="data" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="receitas" stroke="#10B981" strokeWidth={2} name="Receitas" />
              <Line type="monotone" dataKey="despesas" stroke="#EF4444" strokeWidth={2} name="Despesas" />
              <Line type="monotone" dataKey="saldo" stroke="#0B7A9E" strokeWidth={2} name="Saldo" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {tipoRelatorio === "receitas_despesas" && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="pc-card p-6">
            <h3 className="pc-heading-4 mb-4">Receitas por Categoria</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={receitasPorCategoria}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {receitasPorCategoria.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="pc-card p-6">
            <h3 className="pc-heading-4 mb-4">Despesas por Categoria</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={despesasPorCategoria}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tipoRelatorio === "contas_receber" && (
        <div className="pc-card p-6">
          <h3 className="pc-heading-4 mb-4">Contas a Receber</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--pc-border-primary)] bg-[var(--pc-surface-variant)]">
                  <th className="text-left p-3 pc-body-sm font-medium">Descrição</th>
                  <th className="text-left p-3 pc-body-sm font-medium">Categoria</th>
                  <th className="text-left p-3 pc-body-sm font-medium">Paciente</th>
                  <th className="text-right p-3 pc-body-sm font-medium">Valor</th>
                  <th className="text-center p-3 pc-body-sm font-medium">Vencimento</th>
                  <th className="text-center p-3 pc-body-sm font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {contasReceber.map(c => (
                  <tr key={c.id} className="border-b border-[var(--pc-border-secondary)]">
                    <td className="p-3 pc-body-sm">{c.descricao}</td>
                    <td className="p-3 pc-body-sm text-[var(--pc-text-secondary)] capitalize">{c.categoria?.replace(/_/g, " ")}</td>
                    <td className="p-3 pc-body-sm text-[var(--pc-text-secondary)]">{c.paciente_nome || '-'}</td>
                    <td className="p-3 pc-body-sm text-right font-medium">
                      R$ {c.valor.toFixed(2)}
                    </td>
                    <td className="p-3 pc-body-sm text-center text-[var(--pc-text-secondary)]">
                      {format(new Date(c.data_vencimento), "dd/MM/yyyy")}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`pc-badge ${
                        c.status === "recebido" ? "pc-badge-success" :
                        c.status === "vencido" ? "pc-badge-error" :
                        "pc-badge-warning"
                      }`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tipoRelatorio === "contas_pagar" && (
        <div className="pc-card p-6">
          <h3 className="pc-heading-4 mb-4">Contas a Pagar</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--pc-border-primary)] bg-[var(--pc-surface-variant)]">
                  <th className="text-left p-3 pc-body-sm font-medium">Descrição</th>
                  <th className="text-left p-3 pc-body-sm font-medium">Categoria</th>
                  <th className="text-left p-3 pc-body-sm font-medium">Fornecedor</th>
                  <th className="text-right p-3 pc-body-sm font-medium">Valor</th>
                  <th className="text-center p-3 pc-body-sm font-medium">Vencimento</th>
                  <th className="text-center p-3 pc-body-sm font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {contasPagar.map(c => (
                  <tr key={c.id} className="border-b border-[var(--pc-border-secondary)]">
                    <td className="p-3 pc-body-sm">{c.descricao}</td>
                    <td className="p-3 pc-body-sm text-[var(--pc-text-secondary)] capitalize">{c.categoria?.replace(/_/g, " ")}</td>
                    <td className="p-3 pc-body-sm text-[var(--pc-text-secondary)]">{c.fornecedor || '-'}</td>
                    <td className="p-3 pc-body-sm text-right font-medium">
                      R$ {c.valor.toFixed(2)}
                    </td>
                    <td className="p-3 pc-body-sm text-center text-[var(--pc-text-secondary)]">
                      {format(new Date(c.data_vencimento), "dd/MM/yyyy")}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`pc-badge ${
                        c.status === "pago" ? "pc-badge-success" :
                        c.status === "vencido" ? "pc-badge-error" :
                        "pc-badge-warning"
                      }`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}