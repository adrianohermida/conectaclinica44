import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calculator,
  Plus,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Trash2,
  Edit,
  Building2
} from "lucide-react";
import { Input } from "@/components/ui/input";
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
import { format, addMonths, setDate } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createPageUrl } from "@/utils";
import RouteGuard from "@/components/auth/RouteGuard";
import usePerformanceTracker from "@/components/hooks/usePerformanceTracker";
import { useOptimizedQuery } from "@/components/hooks/useOptimizedQuery";

const tiposTributo = [
  { value: "federal", label: "Federal" },
  { value: "estadual", label: "Estadual" },
  { value: "municipal", label: "Municipal" },
  { value: "previdenciario", label: "Previdenciário" },
  { value: "trabalhista", label: "Trabalhista" },
  { value: "outro", label: "Outro" }
];

const tiposObrigacao = [
  { value: "fiscal", label: "Fiscal" },
  { value: "contabil", label: "Contábil" },
  { value: "trabalhista", label: "Trabalhista" },
  { value: "previdenciaria", label: "Previdenciária" },
  { value: "acessoria", label: "Acessória" }
];

const periodicidades = [
  { value: "diaria", label: "Diária" },
  { value: "semanal", label: "Semanal" },
  { value: "quinzenal", label: "Quinzenal" },
  { value: "mensal", label: "Mensal" },
  { value: "trimestral", label: "Trimestral" },
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" },
  { value: "eventual", label: "Eventual" }
];

export default function FiscalContabil() {
  usePerformanceTracker('/FiscalContabil');
  const [visaoAtual, setVisaoAtual] = useState("parcelamentos");
  const [showParcelamentoPanel, setShowParcelamentoPanel] = useState(false);
  const [showObrigacaoPanel, setShowObrigacaoPanel] = useState(false);
  const [editingParcelamento, setEditingParcelamento] = useState(null);
  const [editingObrigacao, setEditingObrigacao] = useState(null);
  const queryClient = useQueryClient();

  const { data: parcelamentos = [] } = useOptimizedQuery({
    queryKey: ["parcelamentos"],
    queryFn: () => base44.entities.ParcelamentoFiscal.list("-created_date", 100)
  });

  const { data: obrigacoes = [] } = useOptimizedQuery({
    queryKey: ["obrigacoes"],
    queryFn: () => base44.entities.ObrigacaoFiscal.list()
  });

  // Mutations Parcelamento
  const createParcelamentoMutation = useMutation({
    mutationFn: (data) => base44.entities.ParcelamentoFiscal.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["parcelamentos"]);
      setShowParcelamentoPanel(false);
      setEditingParcelamento(null);
    }
  });

  const updateParcelamentoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ParcelamentoFiscal.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["parcelamentos"]);
      setShowParcelamentoPanel(false);
      setEditingParcelamento(null);
    }
  });

  const deleteParcelamentoMutation = useMutation({
    mutationFn: (id) => base44.entities.ParcelamentoFiscal.delete(id),
    onSuccess: () => queryClient.invalidateQueries(["parcelamentos"])
  });

  // Mutations Obrigação
  const createObrigacaoMutation = useMutation({
    mutationFn: (data) => base44.entities.ObrigacaoFiscal.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["obrigacoes"]);
      setShowObrigacaoPanel(false);
      setEditingObrigacao(null);
    }
  });

  const updateObrigacaoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ObrigacaoFiscal.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["obrigacoes"]);
      setShowObrigacaoPanel(false);
      setEditingObrigacao(null);
    }
  });

  const deleteObrigacaoMutation = useMutation({
    mutationFn: (id) => base44.entities.ObrigacaoFiscal.delete(id),
    onSuccess: () => queryClient.invalidateQueries(["obrigacoes"])
  });

  const [formParcelamento, setFormParcelamento] = useState({
    orgao: "",
    descricao: "",
    tipo_tributo: "federal",
    numero_processo: "",
    valor_total: 0,
    valor_parcela: 0,
    total_parcelas: 1,
    parcelas_pagas: 0,
    dia_vencimento: 15,
    data_inicio: "",
    data_fim_prevista: "",
    status: "ativo",
    observacoes: ""
  });

  const [formObrigacao, setFormObrigacao] = useState({
    nome: "",
    tipo: "fiscal",
    esfera: "federal",
    periodicidade: "mensal",
    dia_vencimento: 15,
    mes_referencia: "",
    sistema_envio: "",
    responsavel: "",
    descricao: "",
    multa_atraso: "",
    ativo: true,
    observacoes: ""
  });

  const handleSubmitParcelamento = (e) => {
    e.preventDefault();
    if (editingParcelamento) {
      updateParcelamentoMutation.mutate({ id: editingParcelamento.id, data: formParcelamento });
    } else {
      createParcelamentoMutation.mutate(formParcelamento);
    }
  };

  const handleSubmitObrigacao = (e) => {
    e.preventDefault();
    if (editingObrigacao) {
      updateObrigacaoMutation.mutate({ id: editingObrigacao.id, data: formObrigacao });
    } else {
      createObrigacaoMutation.mutate(formObrigacao);
    }
  };

  const registrarPagamento = (parc) => {
    if (parc.parcelas_pagas < parc.total_parcelas) {
      updateParcelamentoMutation.mutate({
        id: parc.id,
        data: {
          ...parc,
          parcelas_pagas: parc.parcelas_pagas + 1,
          status: parc.parcelas_pagas + 1 >= parc.total_parcelas ? "quitado" : "ativo"
        }
      });
    }
  };

  // Estatísticas
  const statsParcelamentos = useMemo(() => {
    const ativos = parcelamentos.filter(p => p.status === "ativo");
    const totalDevido = ativos.reduce((acc, p) => {
      const restante = (p.total_parcelas - p.parcelas_pagas) * p.valor_parcela;
      return acc + restante;
    }, 0);
    return {
      ativos: ativos.length,
      quitados: parcelamentos.filter(p => p.status === "quitado").length,
      totalDevido
    };
  }, [parcelamentos]);

  // Próximas obrigações do mês
  const hoje = new Date();
  const diaAtual = hoje.getDate();
  
  const proximasObrigacoes = useMemo(() => {
    return obrigacoes
      .filter(o => o.ativo && o.periodicidade === "mensal")
      .map(o => ({
        ...o,
        proximoVencimento: o.dia_vencimento >= diaAtual 
          ? setDate(hoje, o.dia_vencimento)
          : setDate(addMonths(hoje, 1), o.dia_vencimento)
      }))
      .sort((a, b) => a.dia_vencimento - b.dia_vencimento);
  }, [obrigacoes, diaAtual]);

  return (
    <RouteGuard requireAuth={true} requireClinica={true}>
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
      <PageHeader
        title="Fiscal e Contábil"
        description="Parcelamentos e obrigações"
        breadcrumbs={[
          { label: "Administração", href: createPageUrl("Administracao") },
          { label: "Fiscal e Contábil" }
        ]}
      />

      {/* Navegação */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setVisaoAtual("parcelamentos")}
            className={`px-4 py-2 rounded-lg font-medium ${
              visaoAtual === "parcelamentos"
                ? "text-white"
                : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"
            }`}
            style={visaoAtual === "parcelamentos" ? { backgroundColor: '#7E57FF' } : {}}
          >
            <DollarSign className="w-4 h-4 inline mr-2" />
            Parcelamentos Fiscais
          </button>
          <button
            onClick={() => setVisaoAtual("obrigacoes")}
            className={`px-4 py-2 rounded-lg font-medium ${
              visaoAtual === "obrigacoes"
                ? "text-white"
                : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"
            }`}
            style={visaoAtual === "obrigacoes" ? { backgroundColor: '#7E57FF' } : {}}
          >
            <Calendar className="w-4 h-4 inline mr-2" />
            Obrigações Fiscais/Contábeis
          </button>
          <button
            onClick={() => setVisaoAtual("calendario")}
            className={`px-4 py-2 rounded-lg font-medium ${
              visaoAtual === "calendario"
                ? "text-white"
                : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"
            }`}
            style={visaoAtual === "calendario" ? { backgroundColor: '#7E57FF' } : {}}
          >
            <Clock className="w-4 h-4 inline mr-2" />
            Calendário do Mês
          </button>
        </div>
      </div>

      {/* === PARCELAMENTOS === */}
      {visaoAtual === "parcelamentos" && (
        <>
          {/* Stats Parcelamentos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <Clock className="w-10 h-10 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold text-gray-800">{statsParcelamentos.ativos}</p>
                  <p className="text-sm text-gray-500">Parcelamentos Ativos</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-10 h-10 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-gray-800">{statsParcelamentos.quitados}</p>
                  <p className="text-sm text-gray-500">Quitados</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <DollarSign className="w-10 h-10 text-red-600" />
                <div>
                  <p className="text-xl font-bold text-gray-800">
                    R$ {statsParcelamentos.totalDevido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-gray-500">Total a Pagar</p>
                </div>
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                setEditingParcelamento(null);
                setFormParcelamento({
                  orgao: "",
                  descricao: "",
                  tipo_tributo: "federal",
                  numero_processo: "",
                  valor_total: 0,
                  valor_parcela: 0,
                  total_parcelas: 1,
                  parcelas_pagas: 0,
                  dia_vencimento: 15,
                  data_inicio: "",
                  data_fim_prevista: "",
                  status: "ativo",
                  observacoes: ""
                });
                setShowParcelamentoPanel(true);
              }}
              className="bg-[#0B7A9E] hover:bg-[#0a6582] text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Novo Parcelamento
            </button>
          </div>

          {/* Lista Parcelamentos */}
          <div className="space-y-4">
            {parcelamentos.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <Calculator className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum parcelamento cadastrado</p>
              </div>
            ) : (
              parcelamentos.map((parc) => {
                const progresso = (parc.parcelas_pagas / parc.total_parcelas) * 100;
                const valorRestante = (parc.total_parcelas - parc.parcelas_pagas) * parc.valor_parcela;
                return (
                  <div
                    key={parc.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            parc.status === "quitado" ? "bg-green-100" : "bg-orange-100"
                          }`}>
                            <Calculator className={`w-5 h-5 ${
                              parc.status === "quitado" ? "text-green-600" : "text-orange-600"
                            }`} />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-800">{parc.descricao}</h3>
                            <p className="text-sm text-gray-600">{parc.orgao}</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs capitalize">
                                {parc.tipo_tributo}
                              </span>
                              {parc.numero_processo && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                  Proc: {parc.numero_processo}
                                </span>
                              )}
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                parc.status === "ativo" ? "bg-orange-100 text-orange-700" :
                                parc.status === "quitado" ? "bg-green-100 text-green-700" :
                                "bg-red-100 text-red-700"
                              }`}>
                                {parc.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-800">
                            R$ {parc.valor_parcela.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-gray-500">por parcela</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-800">
                            {parc.parcelas_pagas}/{parc.total_parcelas} parcelas
                          </p>
                          <p className="text-xs text-gray-500">Venc. dia {parc.dia_vencimento}</p>
                        </div>
                      </div>
                    </div>

                    {/* Barra de Progresso */}
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Progresso</span>
                        <span>{progresso.toFixed(0)}%</span>
                      </div>
                      <div className="bg-gray-200 h-2 rounded-full">
                        <div
                          className={`h-full rounded-full ${
                            parc.status === "quitado" ? "bg-green-500" : "bg-[#0B7A9E]"
                          }`}
                          style={{ width: `${progresso}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Restante: R$ {valorRestante.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    {/* Ações */}
                    <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
                      {parc.status === "ativo" && (
                        <button
                          onClick={() => registrarPagamento(parc)}
                          className="bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Registrar Pagamento
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingParcelamento(parc);
                          setFormParcelamento({ ...parc });
                          setShowParcelamentoPanel(true);
                        }}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1"
                      >
                        <Edit className="w-4 h-4" />
                        Editar
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Deseja excluir este parcelamento?")) {
                            deleteParcelamentoMutation.mutate(parc.id);
                          }
                        }}
                        className="bg-red-50 hover:bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1"
                      >
                        <Trash2 className="w-4 h-4" />
                        Excluir
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* === OBRIGAÇÕES === */}
      {visaoAtual === "obrigacoes" && (
        <>
          <div className="flex justify-end">
            <button
              onClick={() => {
                setEditingObrigacao(null);
                setFormObrigacao({
                  nome: "",
                  tipo: "fiscal",
                  esfera: "federal",
                  periodicidade: "mensal",
                  dia_vencimento: 15,
                  mes_referencia: "",
                  sistema_envio: "",
                  responsavel: "",
                  descricao: "",
                  multa_atraso: "",
                  ativo: true,
                  observacoes: ""
                });
                setShowObrigacaoPanel(true);
              }}
              className="bg-[#0B7A9E] hover:bg-[#0a6582] text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Nova Obrigação
            </button>
          </div>

          <div className="space-y-4">
            {obrigacoes.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Nenhuma obrigação cadastrada</p>
              </div>
            ) : (
              obrigacoes.map((obr) => (
                <div
                  key={obr.id}
                  className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${
                    !obr.ativo ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-800">{obr.nome}</h3>
                          <p className="text-sm text-gray-600">{obr.descricao}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs capitalize">
                              {obr.tipo}
                            </span>
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs capitalize">
                              {obr.esfera}
                            </span>
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs capitalize">
                              {obr.periodicidade}
                            </span>
                            {obr.sistema_envio && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                {obr.sistema_envio}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Vencimento</p>
                        <p className="font-bold text-gray-800">Dia {obr.dia_vencimento}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        obr.ativo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                      }`}>
                        {obr.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setEditingObrigacao(obr);
                        setFormObrigacao({ ...obr });
                        setShowObrigacaoPanel(true);
                      }}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1"
                    >
                      <Edit className="w-4 h-4" />
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Deseja excluir esta obrigação?")) {
                          deleteObrigacaoMutation.mutate(obr.id);
                        }
                      }}
                      className="bg-red-50 hover:bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      Excluir
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* === CALENDÁRIO DO MÊS === */}
      {visaoAtual === "calendario" && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6">
            Calendário de Obrigações - {format(hoje, "MMMM yyyy", { locale: ptBR })}
          </h2>
          
          <div className="space-y-3">
            {proximasObrigacoes.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nenhuma obrigação mensal cadastrada</p>
            ) : (
              proximasObrigacoes.map((obr) => {
                const passou = obr.dia_vencimento < diaAtual;
                return (
                  <div
                    key={obr.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      passou 
                        ? "bg-green-50 border-green-200" 
                        : obr.dia_vencimento <= diaAtual + 5 
                          ? "bg-orange-50 border-orange-200"
                          : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg ${
                        passou 
                          ? "bg-green-200 text-green-700" 
                          : "bg-white border border-gray-300 text-gray-800"
                      }`}>
                        {obr.dia_vencimento}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{obr.nome}</p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs text-gray-500 capitalize">{obr.tipo}</span>
                          {obr.sistema_envio && (
                            <span className="text-xs text-gray-500">• {obr.sistema_envio}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {passou ? (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Passou
                        </span>
                      ) : obr.dia_vencimento <= diaAtual + 5 ? (
                        <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Próximo
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Pendente
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Panel Parcelamento */}
      <SlideInPanel
        open={showParcelamentoPanel}
        onClose={() => setShowParcelamentoPanel(false)}
        title={editingParcelamento ? "Editar Parcelamento" : "Novo Parcelamento"}
        maxWidth="700px"
      >
        <form onSubmit={handleSubmitParcelamento} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Órgão *</label>
            <Input
              value={formParcelamento.orgao}
              onChange={(e) => setFormParcelamento({ ...formParcelamento, orgao: e.target.value })}
              className="border-gray-300"
              placeholder="Ex: Receita Federal, SEFAZ, Prefeitura..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Descrição *</label>
            <Input
              value={formParcelamento.descricao}
              onChange={(e) => setFormParcelamento({ ...formParcelamento, descricao: e.target.value })}
              className="border-gray-300"
              placeholder="Ex: Parcelamento IRPJ 2023..."
              required
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Tributo *</label>
              <Select
                value={formParcelamento.tipo_tributo}
                onValueChange={(value) => setFormParcelamento({ ...formParcelamento, tipo_tributo: value })}
              >
                <SelectTrigger className="border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tiposTributo.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nº Processo</label>
              <Input
                value={formParcelamento.numero_processo}
                onChange={(e) => setFormParcelamento({ ...formParcelamento, numero_processo: e.target.value })}
                className="border-gray-300"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Valor Total</label>
              <Input
                type="number"
                step="0.01"
                value={formParcelamento.valor_total}
                onChange={(e) => setFormParcelamento({ ...formParcelamento, valor_total: parseFloat(e.target.value) || 0 })}
                className="border-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Valor Parcela *</label>
              <Input
                type="number"
                step="0.01"
                value={formParcelamento.valor_parcela}
                onChange={(e) => setFormParcelamento({ ...formParcelamento, valor_parcela: parseFloat(e.target.value) || 0 })}
                className="border-gray-300"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dia Vencimento</label>
              <Input
                type="number"
                min="1"
                max="31"
                value={formParcelamento.dia_vencimento}
                onChange={(e) => setFormParcelamento({ ...formParcelamento, dia_vencimento: parseInt(e.target.value) || 15 })}
                className="border-gray-300"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Total de Parcelas *</label>
              <Input
                type="number"
                min="1"
                value={formParcelamento.total_parcelas}
                onChange={(e) => setFormParcelamento({ ...formParcelamento, total_parcelas: parseInt(e.target.value) || 1 })}
                className="border-gray-300"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Parcelas Pagas</label>
              <Input
                type="number"
                min="0"
                value={formParcelamento.parcelas_pagas}
                onChange={(e) => setFormParcelamento({ ...formParcelamento, parcelas_pagas: parseInt(e.target.value) || 0 })}
                className="border-gray-300"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data Início</label>
              <Input
                type="date"
                value={formParcelamento.data_inicio}
                onChange={(e) => setFormParcelamento({ ...formParcelamento, data_inicio: e.target.value })}
                className="border-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <Select
                value={formParcelamento.status}
                onValueChange={(value) => setFormParcelamento({ ...formParcelamento, status: value })}
              >
                <SelectTrigger className="border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="quitado">Quitado</SelectItem>
                  <SelectItem value="inadimplente">Inadimplente</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
            <textarea
              value={formParcelamento.observacoes}
              onChange={(e) => setFormParcelamento({ ...formParcelamento, observacoes: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-3 resize-none"
              rows="3"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowParcelamentoPanel(false)}
              className="flex-1 border-gray-300"
            >
              Cancelar
            </Button>
            <button
              type="submit"
              className="flex-1 bg-[#0B7A9E] hover:bg-[#0a6582] text-white font-medium py-2 px-4 rounded-lg"
              disabled={createParcelamentoMutation.isPending || updateParcelamentoMutation.isPending}
            >
              {createParcelamentoMutation.isPending || updateParcelamentoMutation.isPending ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </SlideInPanel>

      {/* Panel Obrigação */}
      <SlideInPanel
        open={showObrigacaoPanel}
        onClose={() => setShowObrigacaoPanel(false)}
        title={editingObrigacao ? "Editar Obrigação" : "Nova Obrigação"}
        maxWidth="700px"
      >
        <form onSubmit={handleSubmitObrigacao} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nome da Obrigação *</label>
            <Input
              value={formObrigacao.nome}
              onChange={(e) => setFormObrigacao({ ...formObrigacao, nome: e.target.value })}
              className="border-gray-300"
              placeholder="Ex: DCTF, EFD Contribuições, SPED Fiscal..."
              required
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo *</label>
              <Select
                value={formObrigacao.tipo}
                onValueChange={(value) => setFormObrigacao({ ...formObrigacao, tipo: value })}
              >
                <SelectTrigger className="border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tiposObrigacao.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Esfera *</label>
              <Select
                value={formObrigacao.esfera}
                onValueChange={(value) => setFormObrigacao({ ...formObrigacao, esfera: value })}
              >
                <SelectTrigger className="border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="federal">Federal</SelectItem>
                  <SelectItem value="estadual">Estadual</SelectItem>
                  <SelectItem value="municipal">Municipal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Periodicidade *</label>
              <Select
                value={formObrigacao.periodicidade}
                onValueChange={(value) => setFormObrigacao({ ...formObrigacao, periodicidade: value })}
              >
                <SelectTrigger className="border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periodicidades.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dia Vencimento</label>
              <Input
                type="number"
                min="1"
                max="31"
                value={formObrigacao.dia_vencimento}
                onChange={(e) => setFormObrigacao({ ...formObrigacao, dia_vencimento: parseInt(e.target.value) || 15 })}
                className="border-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sistema de Envio</label>
              <Input
                value={formObrigacao.sistema_envio}
                onChange={(e) => setFormObrigacao({ ...formObrigacao, sistema_envio: e.target.value })}
                className="border-gray-300"
                placeholder="Ex: e-CAC, SPED, Portal Prefeitura..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Responsável</label>
            <Input
              value={formObrigacao.responsavel}
              onChange={(e) => setFormObrigacao({ ...formObrigacao, responsavel: e.target.value })}
              className="border-gray-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
            <textarea
              value={formObrigacao.descricao}
              onChange={(e) => setFormObrigacao({ ...formObrigacao, descricao: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-3 resize-none"
              rows="2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Multa por Atraso</label>
            <Input
              value={formObrigacao.multa_atraso}
              onChange={(e) => setFormObrigacao({ ...formObrigacao, multa_atraso: e.target.value })}
              className="border-gray-300"
              placeholder="Ex: R$ 500,00 por mês de atraso..."
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formObrigacao.ativo}
              onChange={(e) => setFormObrigacao({ ...formObrigacao, ativo: e.target.checked })}
              className="w-4 h-4"
            />
            <label className="text-sm text-gray-700">Obrigação Ativa</label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowObrigacaoPanel(false)}
              className="flex-1 border-gray-300"
            >
              Cancelar
            </Button>
            <button
              type="submit"
              className="flex-1 bg-[#0B7A9E] hover:bg-[#0a6582] text-white font-medium py-2 px-4 rounded-lg"
              disabled={createObrigacaoMutation.isPending || updateObrigacaoMutation.isPending}
            >
              {createObrigacaoMutation.isPending || updateObrigacaoMutation.isPending ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </SlideInPanel>
      </div>
    </RouteGuard>
  );
}