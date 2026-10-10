import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { secureEntities } from "@/components/security/SecureEntityWrapper";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import RouteGuard from "@/components/auth/RouteGuard";
import ModuloGuard from "@/components/auth/ModuloGuard";
import PermissionGuard from "@/components/auth/PermissionGuard";
import { useClinicaContext } from "@/components/hooks/useClinicaContext";
import { useFinanceiroData } from "@/components/hooks/useFinanceiroData";
import usePerformanceTracker from "@/components/hooks/usePerformanceTracker";
import {
  DollarSign,
  Plus,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  ShoppingCart
} from "lucide-react";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button";
import SlideInPanel from "@/components/ui/SlideInPanel";
import PageHeader from "@/components/ui/PageHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";

export default function Financeiro() {
  return (
    <RouteGuard requireAuth requireClinica>
      <FinanceiroContent />
    </RouteGuard>
  );
}

function FinanceiroContent() {
  usePerformanceTracker('/Financeiro');
  const { clinicaId } = useClinicaContext();
  const queryClient = useQueryClient();
  
  const [showPagarPanel, setShowPagarPanel] = useState(false);
  const [showReceberPanel, setShowReceberPanel] = useState(false);
  const [editingConta, setEditingConta] = useState(null);
  const [tipoVisao, setTipoVisao] = useState("pagar");
  const [filtroPeriodo, setFiltroPeriodo] = useState("30d");
  const [filtroCategoriaProduto, setFiltroCategoriaProduto] = useState("todos");
  const [formPagar, setFormPagar] = useState({
    descricao: "",
    categoria: "fornecedor",
    fornecedor: "",
    valor: 0,
    data_vencimento: "",
    forma_pagamento: "pix",
    status: "pendente",
    recorrente: false,
    observacoes: ""
  });
  const [formReceber, setFormReceber] = useState({
    descricao: "",
    categoria: "consulta",
    paciente_nome: "",
    valor: 0,
    data_vencimento: "",
    forma_recebimento: "pix",
    status: "pendente",
    observacoes: ""
  });

  // CRÍTICO: 5 queries em paralelo (Promise.all) - 1000ms → 250ms
  const { data: financeiroData, isLoading: loadingFinanceiro } = useFinanceiroData(clinicaId, !!clinicaId);

  const vendas = financeiroData?.vendas || [];
  const produtos = financeiroData?.produtos || [];
  const contasPagar = financeiroData?.contasPagar || [];
  const contasReceber = financeiroData?.contasReceber || [];
  const pacientes = financeiroData?.pacientes || [];

  const loadingVendas = loadingFinanceiro;
  const loadingPagar = loadingFinanceiro;
  const loadingReceber = loadingFinanceiro;

  const createPagarMutation = useMutation({
    mutationFn: async (data) => {
      return secureEntities.ContaPagar.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["contasPagar"]);
      setShowPagarPanel(false);
      setEditingConta(null);
      toast.success("Conta a pagar criada!");
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  const updatePagarMutation = useMutation({
    mutationFn: ({ id, data }) => secureEntities.ContaPagar.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["contasPagar"]);
      setShowPagarPanel(false);
      setEditingConta(null);
      toast.success("Conta atualizada!");
    }
  });

  const createReceberMutation = useMutation({
    mutationFn: async (data) => {
      return secureEntities.ContaReceber.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["contasReceber"]);
      setShowReceberPanel(false);
      setEditingConta(null);
      toast.success("Conta a receber criada!");
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  const updateReceberMutation = useMutation({
    mutationFn: ({ id, data }) => secureEntities.ContaReceber.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["contasReceber"]);
      setShowReceberPanel(false);
      setEditingConta(null);
      toast.success("Conta atualizada!");
    }
  });

  const handleSubmitPagar = (e) => {
    e.preventDefault();
    if (editingConta) {
      updatePagarMutation.mutate({ id: editingConta.id, data: formPagar });
    } else {
      createPagarMutation.mutate(formPagar);
    }
  };

  const handleSubmitReceber = (e) => {
    e.preventDefault();
    if (editingConta) {
      updateReceberMutation.mutate({ id: editingConta.id, data: formReceber });
    } else {
      createReceberMutation.mutate(formReceber);
    }
  };

  // Estatísticas
  const hoje = new Date();

  const totalRecebido = useMemo(() => {
    return (vendas || [])
      .filter(v => v.status_pagamento === "pago")
      .reduce((acc, v) => acc + (v.valor_final || 0), 0);
  }, [vendas]);

  const totalPendente = useMemo(() => {
    return (vendas || [])
      .filter(v => v.status_pagamento === "pendente")
      .reduce((acc, v) => acc + (v.valor_final || 0), 0);
  }, [vendas]);

  const totalPagar = useMemo(() => {
    return (contasPagar || [])
      .filter(c => c.status === "pendente")
      .reduce((acc, c) => acc + (c.valor || 0), 0);
  }, [contasPagar]);

  const totalReceber = useMemo(() => {
    return (contasReceber || [])
      .filter(c => c.status === "pendente")
      .reduce((acc, c) => acc + (c.valor || 0), 0);
  }, [contasReceber]);

  const saldoAtual = useMemo(() => {
    const recebido = (vendas || []).filter(v => v.status_pagamento === "pago").reduce((acc, v) => acc + (v.valor_final || 0), 0);
    const recebidoContas = (contasReceber || []).filter(c => c.status === "recebido").reduce((acc, c) => acc + (c.valor || 0), 0);
    const pago = (contasPagar || []).filter(c => c.status === "pago").reduce((acc, c) => acc + (c.valor || 0), 0);
    return recebido + recebidoContas - pago;
  }, [vendas, contasReceber, contasPagar]);

  const contasVencidas = useMemo(() => {
    const pagarVencidas = (contasPagar || []).filter(c => 
      c.status === "pendente" && new Date(c.data_vencimento) < hoje
    );
    const receberVencidas = (contasReceber || []).filter(c => 
      c.status === "pendente" && new Date(c.data_vencimento) < hoje
    );
    return { pagar: pagarVencidas.length, receber: receberVencidas.length };
  }, [contasPagar, contasReceber]);

  const dadosFluxoCaixa = useMemo(() => {
    const dias = [];
    for (let i = 29; i >= 0; i--) {
      const dia = new Date();
      dia.setDate(dia.getDate() - i);
      const dataStr = format(dia, "yyyy-MM-dd");
      
      const entradas = (vendas || [])
        .filter(v => v.data_venda === dataStr && v.status_pagamento === "pago")
        .reduce((acc, v) => acc + (v.valor_final || 0), 0);
      
      const saidas = (contasPagar || [])
        .filter(c => c.data_pagamento === dataStr && c.status === "pago")
        .reduce((acc, c) => acc + (c.valor || 0), 0);
      
      dias.push({ dia: format(dia, "dd/MM", { locale: ptBR }), entradas, saidas });
    }
    return dias;
  }, [vendas, contasPagar]);

  return (
    <PermissionGuard modulo="financeiro">
      <div className="space-y-4 md:space-y-6 overflow-x-hidden">
      <PageHeader
        title="Financeiro"
        description="Gestão completa de receitas e despesas"
        breadcrumbs={[{ label: "Financeiro" }]}
      />

      {/* KPIs - Skeleton States */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {(loadingVendas || loadingPagar || loadingReceber) ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border animate-pulse overflow-hidden" style={{ borderColor: '#e8eaed' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gray-200 flex-shrink-0" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-16" />
                    <div className="h-6 bg-gray-200 rounded w-24" />
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border overflow-hidden" style={{ borderColor: '#e8eaed' }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f5f3ff' }}>
                  <TrendingUp className="w-5 h-5 md:w-6 md:h-6" style={{ color: '#7E57FF' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="mb-1 truncate" style={{ color: '#80868b', fontSize: '14px' }}>Saldo Atual</p>
                  <p className="text-lg md:text-2xl font-bold truncate" style={{ color: '#202124' }}>
                    R$ {saldoAtual.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border overflow-hidden" style={{ borderColor: '#e8eaed' }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#e6f7ed' }}>
                  <CheckCircle className="w-5 h-5 md:w-6 md:h-6" style={{ color: '#34a853' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="mb-1 truncate" style={{ color: '#80868b', fontSize: '14px' }}>Recebido</p>
                  <p className="text-lg md:text-2xl font-bold truncate" style={{ color: '#34a853' }}>
                    R$ {totalRecebido.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border overflow-hidden" style={{ borderColor: '#e8eaed' }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#fef9e5' }}>
                  <Clock className="w-5 h-5 md:w-6 md:h-6" style={{ color: '#f59e0b' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="mb-1 truncate" style={{ color: '#80868b', fontSize: '14px' }}>A Receber</p>
                  <p className="text-lg md:text-2xl font-bold truncate" style={{ color: '#f59e0b' }}>
                    R$ {(totalPendente + totalReceber).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border overflow-hidden" style={{ borderColor: '#e8eaed' }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#fde7e7' }}>
                  <TrendingDown className="w-5 h-5 md:w-6 md:h-6" style={{ color: '#ea4335' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="mb-1 truncate" style={{ color: '#80868b', fontSize: '14px' }}>A Pagar</p>
                  <p className="text-lg md:text-2xl font-bold truncate" style={{ color: '#ea4335' }}>
                    R$ {totalPagar.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Alertas Vencidas */}
      {(contasVencidas.pagar > 0 || contasVencidas.receber > 0) && (
        <div className="rounded-2xl p-4 border-l-4 overflow-hidden" style={{ backgroundColor: '#fde7e7', borderColor: '#ea4335' }}>
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#ea4335' }} />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold mb-1 truncate" style={{ color: '#842820', fontSize: '16px' }}>Atenção: Contas Vencidas</h3>
              <p className="truncate" style={{ color: '#9d2f2a', fontSize: '14px' }}>
                {contasVencidas.pagar > 0 && `${contasVencidas.pagar} a pagar`}
                {contasVencidas.pagar > 0 && contasVencidas.receber > 0 && " • "}
                {contasVencidas.receber > 0 && `${contasVencidas.receber} a receber`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs - Mobile First */}
      <div className="bg-white rounded-2xl p-3 md:p-4 shadow-sm border overflow-hidden" style={{ borderColor: '#e8eaed' }}>
        <div className="flex gap-2 overflow-x-auto pb-1 pc-scrollbar">
          {[
            { value: "pagar", label: "A Pagar" },
            { value: "receber", label: "A Receber" },
            { value: "fluxo", label: "Fluxo" },
            { value: "produtos", label: "Receita por Produto" }
          ].map(tab => (
            <button
              key={tab.value}
              onClick={() => setTipoVisao(tab.value)}
              className="px-5 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all min-h-[48px] flex-shrink-0"
              style={tipoVisao === tab.value ? { 
                backgroundColor: '#7E57FF', 
                color: '#ffffff',
                fontSize: '14px'
              } : { 
                backgroundColor: '#f8f9fa', 
                color: '#5f6368',
                fontSize: '14px'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Fluxo de Caixa */}
      {tipoVisao === "fluxo" && (
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border overflow-hidden" style={{ borderColor: '#e8eaed' }}>
          <h2 className="font-bold mb-4 md:mb-6" style={{ color: '#202124', fontSize: '20px' }}>Fluxo de Caixa (30 dias)</h2>
          <div className="w-full overflow-x-auto -mx-2 px-2 touch-pan-x">
            <div className="min-w-[280px] h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dadosFluxoCaixa} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8eaed" />
                  <XAxis dataKey="dia" stroke="#5f6368" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#5f6368" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e8eaed',
                      borderRadius: '12px',
                      fontSize: '14px',
                      padding: '8px 12px'
                    }}
                  />
                  <Line type="monotone" dataKey="entradas" stroke="#34a853" strokeWidth={3} name="Entradas" dot={{ fill: '#34a853', r: 4 }} />
                  <Line type="monotone" dataKey="saidas" stroke="#ea4335" strokeWidth={3} name="Saídas" dot={{ fill: '#ea4335', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Contas a Pagar */}
      {tipoVisao === "pagar" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 className="font-bold" style={{ color: '#202124', fontSize: '20px' }}>Contas a Pagar</h2>
            <button
              onClick={() => {
                setEditingConta(null);
                setFormPagar({
                  descricao: "",
                  categoria: "fornecedor",
                  fornecedor: "",
                  valor: 0,
                  data_vencimento: "",
                  forma_pagamento: "pix",
                  status: "pendente",
                  recorrente: false,
                  observacoes: ""
                });
                setShowPagarPanel(true);
              }}
              className="w-full sm:w-auto text-white font-bold px-5 py-3 rounded-xl flex items-center justify-center gap-2 min-h-[48px] hover:opacity-90 transition-all"
              style={{ backgroundColor: '#7E57FF', fontSize: '14px' }}
            >
              <Plus className="w-5 h-5" />
              <span>Nova Conta</span>
            </button>
          </div>

          {loadingPagar ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border animate-pulse overflow-hidden" style={{ borderColor: '#e8eaed' }}>
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gray-200 flex-shrink-0" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="h-5 bg-gray-200 rounded w-3/4" />
                      <div className="h-4 bg-gray-200 rounded w-1/2" />
                    </div>
                    <div className="h-5 bg-gray-200 rounded w-20 flex-shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          ) : (contasPagar || []).length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border overflow-hidden" style={{ borderColor: '#e8eaed' }}>
              <FileText className="w-16 h-16 mx-auto mb-4" style={{ color: '#dadce0' }} />
              <p className="font-medium mb-1" style={{ color: '#202124', fontSize: '16px' }}>Nenhuma conta a pagar</p>
              <p style={{ color: '#80868b', fontSize: '14px' }}>Suas despesas aparecerão aqui</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(contasPagar || []).map((conta) => {
                const vencida = conta.status === "pendente" && new Date(conta.data_vencimento) < hoje;
                return (
                  <div key={conta.id} className="bg-white rounded-2xl p-5 shadow-sm border hover:shadow-md transition-all overflow-hidden" style={{ borderColor: '#e8eaed' }}>
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col sm:flex-row items-start gap-3">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{
                          backgroundColor: conta.status === "pago" ? '#e6f7ed' : '#fef9e5'
                        }}>
                          <TrendingDown className="w-6 h-6" style={{
                            color: conta.status === "pago" ? '#34a853' : '#f59e0b'
                          }} />
                        </div>
                        <div className="flex-1 min-w-0 w-full sm:w-auto">
                          <h3 className="font-bold truncate" style={{ color: '#202124', fontSize: '18px' }}>{conta.descricao}</h3>
                          <p className="capitalize truncate" style={{ color: '#80868b', fontSize: '14px' }}>{conta.categoria?.replace(/_/g, " ")}</p>
                          {conta.fornecedor && (
                            <p className="mt-1 truncate" style={{ color: '#80868b', fontSize: '14px' }}>{conta.fornecedor}</p>
                          )}
                        </div>
                        <div className="text-left sm:text-right flex-shrink-0 w-full sm:w-auto">
                          <p className="font-bold" style={{ color: '#202124', fontSize: '18px' }}>
                            R$ {conta.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                          <p style={{ color: '#80868b', fontSize: '14px' }}>
                            {format(new Date(conta.data_vencimento), "dd/MM/yy")}
                          </p>
                          {vencida && <span className="font-semibold" style={{ color: '#ea4335', fontSize: '14px' }}>Vencida</span>}
                        </div>
                      </div>
                      {conta.status === "pendente" && (
                        <button
                          onClick={() => {
                            updatePagarMutation.mutate({
                              id: conta.id,
                              data: { ...conta, status: "pago", data_pagamento: format(new Date(), "yyyy-MM-dd") }
                            });
                          }}
                          className="w-full border-2 font-bold px-4 py-3 rounded-xl hover:opacity-90 transition-all min-h-[48px]"
                          style={{ backgroundColor: '#e6f7ed', borderColor: '#34a853', color: '#1f6332', fontSize: '14px' }}
                        >
                          Marcar como Pago
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Contas a Receber */}
      {tipoVisao === "receber" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 className="font-bold" style={{ color: '#202124', fontSize: '20px' }}>Contas a Receber</h2>
            <button
              onClick={() => {
                setEditingConta(null);
                setFormReceber({
                  descricao: "",
                  categoria: "consulta",
                  paciente_nome: "",
                  valor: 0,
                  data_vencimento: "",
                  forma_recebimento: "pix",
                  status: "pendente",
                  observacoes: ""
                });
                setShowReceberPanel(true);
              }}
              className="w-full sm:w-auto text-white font-bold px-5 py-3 rounded-xl flex items-center justify-center gap-2 min-h-[48px] hover:opacity-90 transition-all"
              style={{ backgroundColor: '#7E57FF', fontSize: '14px' }}
            >
              <Plus className="w-5 h-5" />
              <span>Nova Conta</span>
            </button>
          </div>

          {loadingReceber ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border animate-pulse overflow-hidden" style={{ borderColor: '#e8eaed' }}>
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gray-200 flex-shrink-0" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="h-5 bg-gray-200 rounded w-3/4" />
                      <div className="h-4 bg-gray-200 rounded w-1/2" />
                    </div>
                    <div className="h-5 bg-gray-200 rounded w-20 flex-shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          ) : (contasReceber || []).length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border overflow-hidden" style={{ borderColor: '#e8eaed' }}>
              <FileText className="w-16 h-16 mx-auto mb-4" style={{ color: '#dadce0' }} />
              <p className="font-medium mb-1" style={{ color: '#202124', fontSize: '16px' }}>Nenhuma conta a receber</p>
              <p style={{ color: '#80868b', fontSize: '14px' }}>Suas receitas aparecerão aqui</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(contasReceber || []).map((conta) => {
                const vencida = conta.status === "pendente" && new Date(conta.data_vencimento) < hoje;
                return (
                  <div key={conta.id} className="bg-white rounded-2xl p-5 shadow-sm border hover:shadow-md transition-all overflow-hidden" style={{ borderColor: '#e8eaed' }}>
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col sm:flex-row items-start gap-3">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{
                          backgroundColor: conta.status === "recebido" ? '#e6f7ed' : '#f5f3ff'
                        }}>
                          <TrendingUp className="w-6 h-6" style={{
                            color: conta.status === "recebido" ? '#34a853' : '#7E57FF'
                          }} />
                        </div>
                        <div className="flex-1 min-w-0 w-full sm:w-auto">
                          <h3 className="font-bold truncate" style={{ color: '#202124', fontSize: '18px' }}>{conta.descricao}</h3>
                          <p className="capitalize truncate" style={{ color: '#80868b', fontSize: '14px' }}>{conta.categoria?.replace(/_/g, " ")}</p>
                          {conta.paciente_nome && (
                            <p className="mt-1 truncate" style={{ color: '#80868b', fontSize: '14px' }}>{conta.paciente_nome}</p>
                          )}
                        </div>
                        <div className="text-left sm:text-right flex-shrink-0 w-full sm:w-auto">
                          <p className="font-bold" style={{ color: '#202124', fontSize: '18px' }}>
                            R$ {conta.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                          <p style={{ color: '#80868b', fontSize: '14px' }}>
                            {format(new Date(conta.data_vencimento), "dd/MM/yy")}
                          </p>
                          {vencida && <span className="font-semibold" style={{ color: '#ea4335', fontSize: '14px' }}>Vencida</span>}
                        </div>
                      </div>
                      {conta.status === "pendente" && (
                        <button
                          onClick={() => {
                            updateReceberMutation.mutate({
                              id: conta.id,
                              data: { ...conta, status: "recebido", data_recebimento: format(new Date(), "yyyy-MM-dd") }
                            });
                          }}
                          className="w-full border-2 font-bold px-4 py-3 rounded-xl hover:opacity-90 transition-all min-h-[48px]"
                          style={{ backgroundColor: '#e6f7ed', borderColor: '#34a853', color: '#1f6332', fontSize: '14px' }}
                        >
                          Marcar como Recebido
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Panel - Conta a Pagar */}
      <SlideInPanel open={showPagarPanel} onClose={() => setShowPagarPanel(false)} title="Nova Conta a Pagar" maxWidth="600px">
        <form onSubmit={handleSubmitPagar} className="space-y-4">
          <div>
            <label className="block font-semibold mb-2" style={{ color: '#5f6368', fontSize: '14px' }}>Descrição *</label>
            <Input value={formPagar.descricao} onChange={(e) => setFormPagar({ ...formPagar, descricao: e.target.value })} className="border-2 rounded-xl min-h-[48px]" style={{ borderColor: '#e8eaed', fontSize: '16px' }} required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-2" style={{ color: '#5f6368', fontSize: '14px' }}>Categoria</label>
              <Select value={formPagar.categoria} onValueChange={(value) => setFormPagar({ ...formPagar, categoria: value })}>
                <SelectTrigger className="border-2 rounded-xl min-h-[48px]" style={{ borderColor: '#e8eaed', fontSize: '14px' }}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fornecedor">Fornecedor</SelectItem>
                  <SelectItem value="aluguel">Aluguel</SelectItem>
                  <SelectItem value="salarios">Salários</SelectItem>
                  <SelectItem value="impostos">Impostos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block font-semibold mb-2" style={{ color: '#5f6368', fontSize: '14px' }}>Valor (R$) *</label>
              <Input type="number" step="0.01" value={formPagar.valor} onChange={(e) => setFormPagar({ ...formPagar, valor: parseFloat(e.target.value) })} className="border-2 rounded-xl min-h-[48px]" style={{ borderColor: '#e8eaed', fontSize: '16px' }} required />
            </div>
          </div>
          <div>
            <label className="block font-semibold mb-2" style={{ color: '#5f6368', fontSize: '14px' }}>Vencimento *</label>
            <Input type="date" value={formPagar.data_vencimento} onChange={(e) => setFormPagar({ ...formPagar, data_vencimento: e.target.value })} className="border-2 rounded-xl min-h-[48px]" style={{ borderColor: '#e8eaed', fontSize: '16px' }} required />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowPagarPanel(false)}
              className="flex-1 border-2 font-bold py-3 px-4 rounded-xl hover:bg-gray-50 transition-all min-h-[48px]"
              style={{ borderColor: '#e8eaed', color: '#5f6368', fontSize: '14px' }}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="flex-1 text-white font-bold py-3 px-4 rounded-xl hover:opacity-90 transition-all disabled:opacity-50 min-h-[48px] flex items-center justify-center gap-2" 
              style={{ backgroundColor: '#7E57FF', fontSize: '14px' }}
              disabled={createPagarMutation.isPending}
            >
              {createPagarMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                "Salvar"
              )}
            </button>
          </div>
        </form>
      </SlideInPanel>

      {/* Panel - Conta a Receber */}
      <SlideInPanel open={showReceberPanel} onClose={() => setShowReceberPanel(false)} title="Nova Conta a Receber" maxWidth="600px">
        <form onSubmit={handleSubmitReceber} className="space-y-4">
          <div>
            <label className="block font-semibold mb-2" style={{ color: '#5f6368', fontSize: '14px' }}>Descrição *</label>
            <Input value={formReceber.descricao} onChange={(e) => setFormReceber({ ...formReceber, descricao: e.target.value })} className="border-2 rounded-xl min-h-[48px]" style={{ borderColor: '#e8eaed', fontSize: '16px' }} required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-2" style={{ color: '#5f6368', fontSize: '14px' }}>Paciente</label>
              <Select value={formReceber.paciente_nome} onValueChange={(value) => setFormReceber({ ...formReceber, paciente_nome: value })}>
                <SelectTrigger className="border-2 rounded-xl min-h-[48px]" style={{ borderColor: '#e8eaed', fontSize: '14px' }}><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {(pacientes || []).map((p) => (
                    <SelectItem key={p.id} value={p.nome_completo}>{p.nome_completo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block font-semibold mb-2" style={{ color: '#5f6368', fontSize: '14px' }}>Valor (R$) *</label>
              <Input type="number" step="0.01" value={formReceber.valor} onChange={(e) => setFormReceber({ ...formReceber, valor: parseFloat(e.target.value) })} className="border-2 rounded-xl min-h-[48px]" style={{ borderColor: '#e8eaed', fontSize: '16px' }} required />
            </div>
          </div>
          <div>
            <label className="block font-semibold mb-2" style={{ color: '#5f6368', fontSize: '14px' }}>Vencimento *</label>
            <Input type="date" value={formReceber.data_vencimento} onChange={(e) => setFormReceber({ ...formReceber, data_vencimento: e.target.value })} className="border-2 rounded-xl min-h-[48px]" style={{ borderColor: '#e8eaed', fontSize: '16px' }} required />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowReceberPanel(false)}
              className="flex-1 border-2 font-bold py-3 px-4 rounded-xl hover:bg-gray-50 transition-all min-h-[48px]"
              style={{ borderColor: '#e8eaed', color: '#5f6368', fontSize: '14px' }}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="flex-1 text-white font-bold py-3 px-4 rounded-xl hover:opacity-90 transition-all disabled:opacity-50 min-h-[48px] flex items-center justify-center gap-2" 
              style={{ backgroundColor: '#7E57FF', fontSize: '14px' }}
              disabled={createReceberMutation.isPending}
            >
              {createReceberMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                "Salvar"
              )}
            </button>
          </div>
        </form>
      </SlideInPanel>

      {/* Receita por Produto */}
      {tipoVisao === "produtos" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 className="font-bold" style={{ color: '#202124', fontSize: '20px' }}>Top Produtos/Serviços</h2>
            <div className="flex gap-2">
              <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ zIndex: 999999 }}>
                  <SelectItem value="7d">7 dias</SelectItem>
                  <SelectItem value="30d">30 dias</SelectItem>
                  <SelectItem value="90d">90 dias</SelectItem>
                  <SelectItem value="all">Tudo</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filtroCategoriaProduto} onValueChange={setFiltroCategoriaProduto}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ zIndex: 999999 }}>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="servico">Serviços</SelectItem>
                  <SelectItem value="produto">Produtos</SelectItem>
                  <SelectItem value="medicamento">Medicamentos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            {(() => {
              const agora = new Date();
              const diasFiltro = filtroPeriodo === '7d' ? 7 : filtroPeriodo === '30d' ? 30 : filtroPeriodo === '90d' ? 90 : 9999;
              
              const vendasFiltradas = vendas.filter(v => {
                const diasAtras = (agora - new Date(v.data_venda)) / (1000 * 60 * 60 * 24);
                return diasAtras <= diasFiltro;
              });

              const receitaPorProduto = {};
              vendasFiltradas.forEach(venda => {
                (venda.itens || []).forEach(item => {
                  const produtoInfo = produtos.find(p => p.id === item.produto_id) || {};
                  const tipo = produtoInfo.tipo || 'produto';
                  
                  if (filtroCategoriaProduto !== 'todos' && tipo !== filtroCategoriaProduto) return;

                  if (!receitaPorProduto[item.produto_id || item.produto]) {
                    receitaPorProduto[item.produto_id || item.produto] = {
                      nome: item.produto,
                      receita: 0,
                      quantidade: 0,
                      custo: produtoInfo.custo || 0,
                      tipo
                    };
                  }
                  receitaPorProduto[item.produto_id || item.produto].receita += item.subtotal || 0;
                  receitaPorProduto[item.produto_id || item.produto].quantidade += item.quantidade || 0;
                });
              });

              const ranking = Object.values(receitaPorProduto)
                .sort((a, b) => b.receita - a.receita)
                .slice(0, 10);

              if (ranking.length === 0) {
                return (
                  <div className="bg-white rounded-2xl p-12 text-center shadow-sm border" style={{ borderColor: '#e8eaed' }}>
                    <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="font-medium mb-1" style={{ color: '#202124', fontSize: '16px' }}>Nenhuma venda no período</p>
                  </div>
                );
              }

              const maxReceita = ranking[0].receita;

              return ranking.map((item, idx) => {
                const margemReal = item.custo > 0 ? ((item.receita - (item.custo * item.quantidade)) / item.receita * 100) : 0;
                const lucroTotal = item.receita - (item.custo * item.quantidade);
                
                return (
                  <div key={idx} className="bg-white rounded-xl p-5 shadow-sm border" style={{ borderColor: '#e8eaed' }}>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full font-bold text-white flex-shrink-0" style={{
                        backgroundColor: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : '#7E57FF'
                      }}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold mb-1 truncate" style={{ color: '#202124', fontSize: '16px' }}>{item.nome}</h4>
                        <div className="flex flex-wrap gap-2 text-sm">
                          <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600">{item.tipo}</span>
                          <span className="text-gray-600">Qtd: {item.quantidade}</span>
                          {margemReal > 0 && (
                            <span className="text-green-600 font-medium">Margem: {margemReal.toFixed(1)}%</span>
                          )}
                        </div>
                        
                        {/* Barra de Receita */}
                        <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full" 
                            style={{ 
                              width: `${(item.receita / maxReceita) * 100}%`,
                              backgroundColor: '#7E57FF'
                            }} 
                          />
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-2xl font-bold" style={{ color: '#34a853' }}>
                          R$ {item.receita.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                        {lucroTotal > 0 && (
                          <p className="text-sm text-green-600 font-medium">
                            Lucro: R$ {lucroTotal.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}
      </div>
    </PermissionGuard>
  );
}