import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  GitBranch,
  Plus,
  Search,
  TrendingUp,
  Users,
  CheckCircle,
  Brain,
  Sparkles,
  BarChart3,
  Eye,
  Bell
} from "lucide-react";
import VisualizacaoFluxo from "@/components/jornada/VisualizacaoFluxo";
import MetricasConversao from "@/components/jornada/MetricasConversao";
import FluxosPersonalizados from "@/components/jornada/FluxosPersonalizados";
import NotificacoesPaciente from "@/components/jornada/NotificacoesPaciente";
import FilterBar from "@/components/ui/FilterBar";
import { Button } from "@/components/ui/Button";
import SlideInPanel from "@/components/ui/SlideInPanel";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input.jsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useClinicaContext } from "@/components/hooks/useClinicaContext";
import ModuleTour from "@/components/onboarding/ModuleTour";
import RouteGuard from "@/components/auth/RouteGuard";
import PermissionGuard from "@/components/auth/PermissionGuard";
import usePerformanceTracker from "@/components/hooks/usePerformanceTracker";
import { useOptimizedQuery } from "@/components/hooks/useOptimizedQuery";

export default function JornadaPaciente() {
  usePerformanceTracker('/JornadaPaciente');
  const { clinicaId } = useClinicaContext();
  const [visaoAtual, setVisaoAtual] = useState("jornadas");
  const [showPanel, setShowPanel] = useState(false);
  const [showFluxoPanel, setShowFluxoPanel] = useState(false);
  const [showIAPanel, setShowIAPanel] = useState(false);
  const [showFluxosPanel, setShowFluxosPanel] = useState(false);
  const [showNotificacaoPanel, setShowNotificacaoPanel] = useState(false);
  const [jornadaSelecionada, setJornadaSelecionada] = useState(null);
  const [editingJornada, setEditingJornada] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroEtapa, setFiltroEtapa] = useState("todas");
  const [gerandoIA, setGerandoIA] = useState(false);
  const queryClient = useQueryClient();

  const { data: jornadas = [], isLoading } = useOptimizedQuery({
    queryKey: ["jornadas", clinicaId],
    queryFn: () => clinicaId ? base44.entities.JornadaPaciente.filter({ clinica_id: clinicaId }, "-created_date") : [],
    enabled: !!clinicaId
  });

  // ARQUITETURA V2: Contato unificado
  const { data: pacientes = [] } = useOptimizedQuery({
    queryKey: ["pacientes", clinicaId],
    queryFn: () => clinicaId ? base44.entities.Contato.filter({ 
      clinica_id: clinicaId,
      tipo_contato: "paciente"
    }) : [],
    enabled: !!clinicaId
  });

  const { data: agendamentos = [] } = useOptimizedQuery({
    queryKey: ["agendamentos", clinicaId],
    queryFn: () => clinicaId ? base44.entities.Agendamento.filter({ clinica_id: clinicaId }) : [],
    enabled: !!clinicaId
  });

  const { data: prontuarios = [] } = useOptimizedQuery({
    queryKey: ["prontuarios", clinicaId],
    queryFn: () => clinicaId ? base44.entities.Prontuario.filter({ clinica_id: clinicaId }) : [],
    enabled: !!clinicaId
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      const payload = { ...data, clinica_id: user.clinica_id };
      return base44.entities.JornadaPaciente.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["jornadas"]);
      setShowPanel(false);
      setShowIAPanel(false);
      setEditingJornada(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const user = await base44.auth.me();
      const payload = { ...data, clinica_id: user.clinica_id };
      return base44.entities.JornadaPaciente.update(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["jornadas"]);
      setShowPanel(false);
      setEditingJornada(null);
    }
  });

  const [formData, setFormData] = useState({
    paciente_nome: "",
    etapa_atual: "cadastro",
    data_inicio: format(new Date(), "yyyy-MM-dd"),
    proxima_acao: "",
    data_proxima_acao: "",
    historico_etapas: [],
    tratamentos_realizados: [],
    notas: "",
    alertas: [],
    satisfacao: 0
  });

  const [dadosIA, setDadosIA] = useState({
    paciente_nome: ""
  });

  const analisarJornadaIA = async () => {
    if (!dadosIA.paciente_nome) {
      alert("Selecione um paciente");
      return;
    }

    setGerandoIA(true);
    try {
      const paciente = pacientes.find(p => p.nome_completo === dadosIA.paciente_nome);
      const agendamentosPaciente = agendamentos.filter(a => a.paciente_id === paciente?.id);
      const prontuariosPaciente = prontuarios.filter(p => p.paciente_id === paciente?.id);

      const prompt = `Analise a jornada do paciente e sugira otimizações:

Paciente: ${dadosIA.paciente_nome}
Total de Agendamentos: ${agendamentosPaciente.length}
Consultas Realizadas: ${prontuariosPaciente.length}
Status Agendamentos: ${agendamentosPaciente.map(a => a.status).join(", ")}

Baseado nos dados, forneça:
1. Etapa atual recomendada na jornada
2. Próxima ação sugerida
3. Alertas importantes
4. Recomendações de tratamento
5. Score de engajamento (0-5)

Formato JSON.`;

      const analiseIA = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            etapa_atual: { type: "string" },
            proxima_acao: { type: "string" },
            data_proxima_acao: { type: "string" },
            alertas: { type: "array", items: { type: "string" } },
            tratamentos_sugeridos: { type: "array", items: { type: "string" } },
            notas: { type: "string" },
            satisfacao: { type: "number" }
          }
        }
      });

      setFormData({
        ...formData,
        paciente_nome: dadosIA.paciente_nome,
        paciente_id: paciente?.id || "",
        ...analiseIA,
        historico_etapas: [{
          etapa: "avaliacao_inicial",
          data: format(new Date(), "yyyy-MM-dd"),
          observacao: "Análise por IA"
        }]
      });

      setShowIAPanel(false);
      setShowPanel(true);
    } catch (error) {
      console.error("Erro na análise:", error);
      alert("Erro ao analisar jornada com IA");
    } finally {
      setGerandoIA(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingJornada) {
      updateMutation.mutate({ id: editingJornada.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (jornada) => {
    setEditingJornada(jornada);
    setFormData(jornada);
    setShowPanel(true);
  };

  const jornadasFiltradas = jornadas
    .filter((j) => filtroEtapa === "todas" ? true : j.etapa_atual === filtroEtapa)
    .filter((j) => j.paciente_nome?.toLowerCase().includes(busca.toLowerCase()));

  const etapas = [
    { valor: "cadastro", label: "Cadastro", cor: "bg-gray-500" },
    { valor: "primeira_consulta", label: "Primeira Consulta", cor: "bg-blue-500" },
    { valor: "avaliacao_inicial", label: "Avaliação Inicial", cor: "bg-cyan-500" },
    { valor: "plano_tratamento", label: "Plano de Tratamento", cor: "bg-purple-500" },
    { valor: "em_tratamento", label: "Em Tratamento", cor: "bg-orange-500" },
    { valor: "acompanhamento", label: "Acompanhamento", cor: "bg-yellow-500" },
    { valor: "retorno_agendado", label: "Retorno Agendado", cor: "bg-green-500" },
    { valor: "alta", label: "Alta", cor: "bg-emerald-600" },
    { valor: "inativo", label: "Inativo", cor: "bg-gray-400" }
  ];

  const getEtapaInfo = (etapaValor) => etapas.find(e => e.valor === etapaValor) || etapas[0];

  const totalPacientes = jornadas.length;
  const emTratamento = jornadas.filter(j => j.etapa_atual === "em_tratamento").length;
  const taxaConclusao = jornadas.filter(j => j.etapa_atual === "alta").length;

  const verFluxo = (jornada) => {
    setJornadaSelecionada(jornada);
    setShowFluxoPanel(true);
  };

  const avancarEtapa = async (jornada) => {
    const etapasOrdem = ["cadastro", "primeira_consulta", "avaliacao_inicial", "plano_tratamento", "em_tratamento", "acompanhamento", "retorno_agendado", "alta"];
    const indexAtual = etapasOrdem.indexOf(jornada.etapa_atual);
    
    if (indexAtual < etapasOrdem.length - 1) {
      const proximaEtapa = etapasOrdem[indexAtual + 1];
      const novoHistorico = [
        ...(jornada.historico_etapas || []),
        {
          etapa: proximaEtapa,
          data: format(new Date(), "yyyy-MM-dd"),
          observacao: "Avanço automático de etapa"
        }
      ];

      await updateMutation.mutateAsync({
        id: jornada.id,
        data: {
          ...jornada,
          etapa_atual: proximaEtapa,
          historico_etapas: novoHistorico
        }
      });
    }
  };

  const tourSteps = [
    {
      title: "Mapeie a jornada completa",
      description: "Acompanhe cada paciente desde o cadastro até a alta, com controle de etapas, tratamentos e satisfação."
    },
    {
      title: "IA para otimizar jornadas",
      description: "Use 'Análise IA' para receber sugestões personalizadas de próximas ações com base no histórico do paciente."
    },
    {
      title: "Métricas de conversão",
      description: "Veja taxas de conversão entre etapas, identifique gargalos e melhore a experiência do paciente."
    }
  ];

  if (isLoading) {
    return (
      <RouteGuard requireAuth={true} requireClinica={true}>
        <div className="max-w-6xl mx-auto space-y-6 overflow-x-hidden">
          <div className="bg-white rounded-2xl p-6 shadow-sm border animate-pulse" style={{ borderColor: '#e8eaed' }}>
            <div className="h-8 bg-gray-200 rounded w-56 mb-3" />
            <div className="h-5 bg-gray-200 rounded w-64" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border animate-pulse" style={{ borderColor: '#e8eaed' }}>
                <div className="h-5 bg-gray-200 rounded w-20 mb-3" />
                <div className="h-8 bg-gray-200 rounded w-16" />
              </div>
            ))}
          </div>
        </div>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard requireAuth requireClinica>
      <PermissionGuard modulo="jornada">
        <div className="max-w-6xl mx-auto space-y-5 md:space-y-6 overflow-x-hidden">
        <ModuleTour moduleName="jornada" steps={tourSteps} />
      <PageHeader
        title="Jornada do Paciente"
        description="Fluxo completo do paciente"
        breadcrumbs={[{ label: "Jornada" }]}
        action={
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                setDadosIA({ paciente_nome: "" });
                setShowIAPanel(true);
              }}
              aria-label="Analisar jornada com IA"
              className="inline-flex items-center justify-center gap-2 font-bold rounded-full hover:opacity-90 transition-all min-h-[48px] px-5 whitespace-nowrap"
              style={{ backgroundColor: '#7E57FF', color: '#ffffff', fontSize: '14px' }}
            >
              <Sparkles className="w-5 h-5 flex-shrink-0" />
              <span>Análise IA</span>
            </button>
            <button
              onClick={() => {
                setEditingJornada(null);
                setFormData({
                  paciente_nome: "",
                  etapa_atual: "cadastro",
                  data_inicio: format(new Date(), "yyyy-MM-dd"),
                  proxima_acao: "",
                  data_proxima_acao: "",
                  historico_etapas: [],
                  tratamentos_realizados: [],
                  notas: "",
                  alertas: [],
                  satisfacao: 0
                });
                setShowPanel(true);
              }}
              aria-label="Criar jornada manualmente"
              className="inline-flex items-center justify-center gap-2 font-bold rounded-full hover:bg-gray-200 transition-all min-h-[48px] px-5 whitespace-nowrap"
              style={{ backgroundColor: '#f8f9fa', color: '#202124', fontSize: '14px' }}
            >
              <Plus className="w-5 h-5 flex-shrink-0" />
              <span>Manual</span>
            </button>
          </div>
        }
      />

      <div className="bg-white rounded-2xl shadow-sm border p-3 md:p-4 overflow-x-hidden" style={{ borderColor: '#e8eaed' }}>
        <div className="flex gap-2">
          <button
            onClick={() => setVisaoAtual("jornadas")}
            aria-label="Visualizar jornadas"
            aria-pressed={visaoAtual === "jornadas"}
            className={`flex items-center justify-center gap-2 font-bold rounded-xl transition-all min-h-[48px] flex-1 px-3 whitespace-nowrap overflow-hidden ${
              visaoAtual === "jornadas" ? "" : "hover:bg-gray-100"
            }`}
            style={visaoAtual === "jornadas" ? { 
              backgroundColor: '#7E57FF', 
              color: '#ffffff',
              fontSize: '14px'
            } : {
              backgroundColor: '#f8f9fa',
              color: '#5f6368',
              fontSize: '14px'
            }}
          >
            <GitBranch className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Jornadas</span>
          </button>
          <button
            onClick={() => setVisaoAtual("metricas")}
            aria-label="Visualizar métricas"
            aria-pressed={visaoAtual === "metricas"}
            className={`flex items-center justify-center gap-2 font-bold rounded-xl transition-all min-h-[48px] flex-1 px-3 whitespace-nowrap overflow-hidden ${
              visaoAtual === "metricas" ? "" : "hover:bg-gray-100"
            }`}
            style={visaoAtual === "metricas" ? { 
              backgroundColor: '#7E57FF', 
              color: '#ffffff',
              fontSize: '14px'
            } : {
              backgroundColor: '#f8f9fa',
              color: '#5f6368',
              fontSize: '14px'
            }}
          >
            <BarChart3 className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Métricas</span>
          </button>
          <button
            onClick={() => setShowFluxosPanel(true)}
            aria-label="Configurar fluxos personalizados"
            className="flex items-center justify-center gap-2 font-bold rounded-xl transition-all min-h-[48px] flex-1 px-3 whitespace-nowrap hover:bg-gray-100 overflow-hidden"
            style={{ backgroundColor: '#f8f9fa', color: '#5f6368', fontSize: '14px' }}
          >
            <GitBranch className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Fluxos</span>
          </button>
        </div>
      </div>

      {/* Panel - Fluxos */}
      <SlideInPanel
        open={showFluxosPanel}
        onClose={() => setShowFluxosPanel(false)}
        title="Fluxos Personalizados"
        maxWidth="900px"
      >
        <FluxosPersonalizados
          onSelecionar={(fluxo) => {
            alert(`Fluxo "${fluxo.nome}" selecionado. Funcionalidade de aplicação em desenvolvimento.`);
            setShowFluxosPanel(false);
          }}
        />
      </SlideInPanel>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 overflow-hidden">
        {(
          <>
            <StatCard title="Total" value={totalPacientes} icon={Users} color="#7E57FF" delay={0} />
            <StatCard title="Em Tratamento" value={emTratamento} icon={TrendingUp} color="#7E57FF" delay={0.05} />
            <StatCard title="Alta" value={taxaConclusao} icon={CheckCircle} color="#34a853" delay={0.1} />
          </>
        )}
      </div>

      {/* Métricas de Conversão */}
      {visaoAtual === "metricas" && <MetricasConversao jornadas={jornadas} />}

      {visaoAtual === "jornadas" && (
        <FilterBar
          searchValue={busca}
          onSearchChange={setBusca}
          searchPlaceholder="Buscar por paciente..."
          filters={[
            {
              value: filtroEtapa,
              onValueChange: setFiltroEtapa,
              placeholder: "Etapa",
              options: [
                { value: "todas", label: "Todas as Etapas" },
                ...etapas.map(e => ({ value: e.valor, label: e.label }))
              ]
            }
          ]}
        />
      )}

      {visaoAtual === "jornadas" && (
        <div className="grid gap-4 overflow-hidden">
        {jornadasFiltradas.length === 0 ? (
          <EmptyState
            icon={GitBranch}
            title="Nenhuma jornada encontrada"
            description="Crie jornadas para acompanhar seus pacientes"
            action={{
              label: "Criar Primeira Jornada",
              onClick: () => {
                setEditingJornada(null);
                setFormData({
                  paciente_nome: "",
                  etapa_atual: "cadastro",
                  data_inicio: format(new Date(), "yyyy-MM-dd"),
                  proxima_acao: "",
                  data_proxima_acao: "",
                  historico_etapas: [],
                  tratamentos_realizados: [],
                  notas: "",
                  alertas: [],
                  satisfacao: 0
                });
                setShowPanel(true);
              },
              icon: Plus
            }}
          />
        ) : (
          jornadasFiltradas.map((jornada) => {
            const etapaInfo = getEtapaInfo(jornada.etapa_atual);
            const agendamentosPaciente = agendamentos.filter(a => a.paciente_id === jornada.paciente_id);
            const prontuariosPaciente = prontuarios.filter(p => p.paciente_id === jornada.paciente_id);
            
            return (
              <div
                key={jornada.id}
                className="bg-white rounded-2xl shadow-sm border p-5 md:p-6 overflow-hidden"
                style={{ borderColor: '#e8eaed' }}
              >
                <div className="flex flex-col gap-4 min-w-0">
                  <div className="flex items-start justify-between gap-3 min-w-0">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f5f3ff' }}>
                        <GitBranch className="w-6 h-6" style={{ color: '#7E57FF' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold truncate" style={{ color: '#202124', fontSize: '16px' }}>{jornada.paciente_nome}</h3>
                        <p className="mt-1 truncate" style={{ color: '#5f6368', fontSize: '14px' }}>
                          Início: {format(new Date(jornada.data_inicio), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap flex-shrink-0 ${etapaInfo.cor}`}
                          style={{ fontSize: '13px', color: '#ffffff' }}>
                      {etapaInfo.label}
                    </span>
                  </div>

                  {jornada.proxima_acao && (
                    <div className="rounded-xl p-3 border overflow-hidden" style={{ backgroundColor: '#f5f3ff', borderColor: '#e9ddff' }}>
                      <p className="mb-1 font-bold" style={{ color: '#7E57FF', fontSize: '13px' }}>Próxima Ação:</p>
                      <p className="break-words" style={{ color: '#5f4ab8', fontSize: '14px', lineHeight: '1.5' }}>{jornada.proxima_acao}</p>
                      {jornada.data_proxima_acao && (
                        <p className="mt-2" style={{ color: '#7E57FF', fontSize: '13px' }}>
                          Data: {format(new Date(jornada.data_proxima_acao), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      )}
                    </div>
                  )}

                  {jornada.tratamentos_realizados?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {jornada.tratamentos_realizados.map((trat, idx) => (
                        <Badge key={idx} variant="default">{trat}</Badge>
                      ))}
                    </div>
                  )}

                  {jornada.satisfacao > 0 && (
                    <div className="flex items-center gap-2">
                      <span style={{ color: '#5f6368', fontSize: '14px' }}>Satisfação:</span>
                      <div className="flex gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i} style={{ fontSize: '18px', color: i < jornada.satisfacao ? '#fbbc04' : '#dadce0' }}>★</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 mt-3 pt-3 overflow-hidden" style={{ borderTop: '1px solid #e8eaed' }}>
                    <span className="whitespace-nowrap" style={{ color: '#5f6368', fontSize: '14px' }}>📅 {agendamentosPaciente.length} agendamento(s)</span>
                    <span className="whitespace-nowrap" style={{ color: '#5f6368', fontSize: '14px' }}>📋 {prontuariosPaciente.length} consulta(s)</span>
                  </div>

                  <div className="flex flex-wrap gap-2 overflow-hidden">
                    <button 
                      onClick={() => verFluxo(jornada)}
                      aria-label="Ver fluxo da jornada"
                      className="inline-flex items-center justify-center gap-2 font-bold rounded-xl hover:bg-gray-200 transition-all min-h-[48px] px-4 overflow-hidden"
                      style={{ backgroundColor: '#f8f9fa', color: '#202124', fontSize: '14px' }}
                    >
                      <Eye className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">Ver Fluxo</span>
                    </button>
                    <button 
                      onClick={() => handleEdit(jornada)}
                      aria-label="Editar jornada"
                      className="inline-flex items-center justify-center gap-2 font-bold rounded-xl hover:bg-gray-200 transition-all min-h-[48px] px-4 overflow-hidden"
                      style={{ backgroundColor: '#f8f9fa', color: '#202124', fontSize: '14px' }}
                    >
                      <span className="truncate">Editar</span>
                    </button>
                    <button 
                      onClick={() => confirm(`Avançar ${jornada.paciente_nome}?`) && avancarEtapa(jornada)}
                      aria-label="Avançar etapa"
                      className="inline-flex items-center justify-center gap-2 font-bold rounded-xl hover:opacity-90 transition-all min-h-[48px] px-4 overflow-hidden"
                      style={{ backgroundColor: '#e6f7ed', color: '#137333', fontSize: '14px', border: '1px solid #b8e7ca' }}
                    >
                      <span className="truncate">Avançar</span>
                    </button>
                    <button 
                      onClick={() => { setJornadaSelecionada(jornada); setShowNotificacaoPanel(true); }}
                      aria-label="Notificar paciente"
                      className="inline-flex items-center justify-center gap-2 font-bold rounded-xl hover:bg-gray-200 transition-all min-h-[48px] px-4 overflow-hidden"
                      style={{ backgroundColor: '#f8f9fa', color: '#202124', fontSize: '14px' }}
                    >
                      <Bell className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate hidden sm:inline">Notificar</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      )}

      {/* Panel - Fluxo Visual */}
      <SlideInPanel
        open={showFluxoPanel}
        onClose={() => {
          setShowFluxoPanel(false);
          setJornadaSelecionada(null);
        }}
        title={`Fluxo: ${jornadaSelecionada?.paciente_nome}`}
        maxWidth="900px"
      >
        {jornadaSelecionada && (
          <VisualizacaoFluxo
            jornada={jornadaSelecionada}
            agendamentos={agendamentos}
            prontuarios={prontuarios}
          />
        )}
      </SlideInPanel>

      {/* SlideInPanel - IA */}
      <SlideInPanel
        open={showIAPanel}
        onClose={() => setShowIAPanel(false)}
        title="Análise de Jornada com IA"
        maxWidth="700px"
      >
        <div className="space-y-4">
          <div className="rounded-lg p-4 flex items-start gap-3 border" style={{ backgroundColor: '#f5f3ff', borderColor: '#e9ddff' }}>
            <Brain className="w-6 h-6 flex-shrink-0 mt-1" style={{ color: '#7E57FF' }} />
            <div className="min-w-0">
              <h3 className="font-bold mb-1" style={{ color: '#7E57FF' }}>Assistente Inteligente</h3>
              <p className="text-sm break-words" style={{ color: '#5f4ab8' }}>
                Nossa IA analisa todo o histórico do paciente (agendamentos, consultas, tratamentos) e sugere a melhor jornada personalizada.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Paciente *</label>
            <Select
              value={dadosIA.paciente_nome}
              onValueChange={(value) => setDadosIA({ ...dadosIA, paciente_nome: value })}
            >
              <SelectTrigger className="border border-gray-300 rounded-lg min-h-[44px]" style={{ fontSize: '14px' }}>
                <SelectValue placeholder="Selecione o paciente" />
              </SelectTrigger>
              <SelectContent>
                {pacientes.map((p) => (
                  <SelectItem key={p.id} value={p.nome_completo}>
                    {p.nome_completo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowIAPanel(false)}
              className="flex-1 border border-gray-300"
              disabled={gerandoIA}
            >
              Cancelar
            </Button>
            <button
              type="button"
              onClick={analisarJornadaIA}
              disabled={gerandoIA || !dadosIA.paciente_nome}
              className="flex-1 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px] transition-all"
              style={{ backgroundColor: '#7E57FF' }}
              >
              {gerandoIA ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Analisando...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 flex-shrink-0" />
                  <span>Analisar com IA</span>
                </>
              )}
            </button>
          </div>
        </div>
      </SlideInPanel>

      {/* SlideInPanel - Formulário Manual */}
      <SlideInPanel
        open={showPanel}
        onClose={() => setShowPanel(false)}
        title={editingJornada ? "Editar Jornada" : "Nova Jornada"}
        maxWidth="700px"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Paciente *</label>
            <Select
              value={formData.paciente_nome}
              onValueChange={(value) => {
                const paciente = pacientes.find(p => p.nome_completo === value);
                setFormData({
                  ...formData,
                  paciente_nome: value,
                  paciente_id: paciente?.id || ""
                });
              }}
            >
              <SelectTrigger className="border border-gray-300 rounded-lg min-h-[44px]" style={{ fontSize: '14px' }}>
                <SelectValue placeholder="Selecione o paciente" />
              </SelectTrigger>
              <SelectContent>
                {pacientes.map((p) => (
                  <SelectItem key={p.id} value={p.nome_completo}>
                    {p.nome_completo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Etapa Atual *</label>
              <Select
                value={formData.etapa_atual}
                onValueChange={(value) => setFormData({ ...formData, etapa_atual: value })}
              >
                <SelectTrigger className="border border-gray-300 rounded-lg min-h-[44px]" style={{ fontSize: '14px' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {etapas.map((etapa) => (
                    <SelectItem key={etapa.valor} value={etapa.valor}>
                      {etapa.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data Início</label>
              <Input
                type="date"
                value={formData.data_inicio}
                onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                className="border border-gray-300 rounded-lg min-h-[44px]"
                style={{ fontSize: '14px' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Próxima Ação</label>
            <Input
              value={formData.proxima_acao}
              onChange={(e) => setFormData({ ...formData, proxima_acao: e.target.value })}
              className="border border-gray-300 rounded-lg min-h-[44px]"
              style={{ fontSize: '14px' }}
              placeholder="Ex: Retorno em 30 dias"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data da Próxima Ação</label>
            <Input
              type="date"
              value={formData.data_proxima_acao}
              onChange={(e) => setFormData({ ...formData, data_proxima_acao: e.target.value })}
              className="border border-gray-300 rounded-lg min-h-[44px]"
              style={{ fontSize: '14px' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notas</label>
            <textarea
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-3 resize-none min-h-[100px]"
              style={{ fontSize: '14px' }}
              rows="4"
              placeholder="Observações sobre a jornada do paciente..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Satisfação (1-5)</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setFormData({ ...formData, satisfacao: num })}
                  className={`w-12 h-12 rounded-full font-bold border-2 transition-all min-w-[48px] ${
                    formData.satisfacao >= num 
                      ? "text-white" 
                      : "bg-white border-gray-300 text-gray-600"
                  }`}
                  style={formData.satisfacao >= num ? { backgroundColor: '#7E57FF', borderColor: '#7E57FF' } : {}}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPanel(false)}
              className="flex-1 border border-gray-300"
            >
              Cancelar
            </Button>
            <button
              type="submit"
              className="flex-1 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px] transition-all"
              style={{ backgroundColor: '#7E57FF' }}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
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

      {/* Panel - Notificações */}
      <SlideInPanel
        open={showNotificacaoPanel}
        onClose={() => {
          setShowNotificacaoPanel(false);
          setJornadaSelecionada(null);
        }}
        title="Notificar Paciente"
        maxWidth="600px"
      >
        {jornadaSelecionada && <NotificacoesPaciente jornada={jornadaSelecionada} />}
      </SlideInPanel>
        </div>
      </PermissionGuard>
    </RouteGuard>
  );
}