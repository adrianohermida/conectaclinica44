
import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Sparkles,
  TrendingUp,
  CheckCircle,
  Clock,
  Brain,
  BarChart2,
  Bell,
  Link as LinkIcon,
  Eye
} from "lucide-react";
import AcompanhamentoProgresso from "@/components/plano/AcompanhamentoProgresso";
import AlertasMedicacao from "@/components/plano/AlertasMedicacao";
import VinculacaoProntuarios from "@/components/plano/VinculacaoProntuarios";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/Button";
import SlideInPanel from "@/components/ui/SlideInPanel";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import SearchBar from "@/components/ui/SearchBar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";
import { LoadingState } from "@/components/ui/LoadingSpinner";
import EmptyState from "@/components/ui/EmptyState";
import AlertBanner from "@/components/ui/AlertBanner";
import { motion } from "framer-motion";
import { useClinicaContext } from "@/components/hooks/useClinicaContext";
import { useOptimizedQuery } from "@/components/hooks/useOptimizedQuery";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import RouteGuard from "@/components/auth/RouteGuard";
import PermissionGuard from "@/components/auth/PermissionGuard";
import usePerformanceTracker from "@/components/hooks/usePerformanceTracker";

export default function Tratamentos() {
  usePerformanceTracker('/Tratamentos');
  const { clinicaId } = useClinicaContext();
  const [showPanel, setShowPanel] = useState(false);
  const [showIAPanel, setShowIAPanel] = useState(false);
  const [showTimelinePanel, setShowTimelinePanel] = useState(false);
  const [showProgressoPanel, setShowProgressoPanel] = useState(false);
  const [showAlertasPanel, setShowAlertasPanel] = useState(false);
  const [showProntuariosPanel, setShowProntuariosPanel] = useState(false);
  const [editingPlano, setEditingPlano] = useState(null);
  const [planoSelecionado, setPlanoSelecionado] = useState(null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [gerandoIA, setGerandoIA] = useState(false);
  const queryClient = useQueryClient();

  const { data: planos = [], isLoading } = useOptimizedQuery({
    queryKey: ["planos-tratamento", clinicaId],
    queryFn: () => clinicaId ? base44.entities.PlanoTratamento.filter({ clinica_id: clinicaId }, "-created_date") : [],
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

  const { data: medicos = [] } = useOptimizedQuery({
    queryKey: ["medicos", clinicaId],
    queryFn: () => clinicaId ? base44.entities.Medico.filter({ clinica_id: clinicaId }) : [],
    enabled: !!clinicaId
  });

  const { data: prontuarios = [] } = useOptimizedQuery({
    queryKey: ["prontuarios", clinicaId],
    queryFn: () => clinicaId ? base44.entities.Prontuario.filter({ clinica_id: clinicaId }) : [],
    enabled: !!clinicaId
  });

  const { data: agendamentos = [] } = useOptimizedQuery({
    queryKey: ["agendamentos", clinicaId],
    queryFn: () => clinicaId ? base44.entities.Agendamento.filter({ clinica_id: clinicaId }) : [],
    enabled: !!clinicaId
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      const payload = { ...data, clinica_id: user.clinica_id };
      return base44.entities.PlanoTratamento.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["planos-tratamento"]);
      setShowPanel(false);
      setShowIAPanel(false);
      setEditingPlano(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const user = await base44.auth.me();
      const payload = { ...data, clinica_id: user.clinica_id };
      return base44.entities.PlanoTratamento.update(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["planos-tratamento"]);
      setShowPanel(false);
      setEditingPlano(null);
    }
  });

  const [formData, setFormData] = useState({
    paciente_id: "",
    paciente_nome: "",
    medico_responsavel: "",
    data_inicio: format(new Date(), "yyyy-MM-dd"),
    data_fim_prevista: "",
    diagnostico: "",
    objetivo_tratamento: "",
    tratamentos: [],
    medicamentos: [],
    exames_acompanhamento: [],
    metas: [],
    evolucao: [],
    status: "ativo",
    progresso_percentual: 0,
    observacoes: ""
  });

  const [dadosIA, setDadosIA] = useState({
    paciente_nome: "",
    idade: "",
    diagnostico: "",
    condicoes_pre_existentes: "",
    objetivo: ""
  });

  const gerarPlanoIA = async () => {
    if (!dadosIA.paciente_nome) {
      alert("Selecione um paciente");
      return;
    }

    setGerandoIA(true);
    try {
      const paciente = pacientes.find((p) => p.nome_completo === dadosIA.paciente_nome);
      const prontuariosPaciente = prontuarios.filter((p) => p.paciente_id === paciente?.id);

      const prompt = `Você é um assistente médico especializado em medicina integrativa. Analise o histórico do paciente e crie um plano de tratamento personalizado e detalhado.

DADOS DO PACIENTE:
Nome: ${dadosIA.paciente_nome}
Objetivo: ${dadosIA.objetivo}
Diagnóstico: ${dadosIA.diagnostico || "Não informado"}
Idade: ${dadosIA.idade || "Não informada"}
Condições pré-existentes: ${dadosIA.condicoes_pre_existentes || "Nenhuma"}

HISTÓRICO CLÍNICO:
- Total de consultas: ${prontuariosPaciente.length}
- Últimos diagnósticos: ${prontuariosPaciente.length > 0 ? prontuariosPaciente.slice(0, 3).map(p => p.hipotese_diagnostica).join(", ") : "Nenhum prontuário recente."}
- Alergias: ${paciente?.alergias || "Nenhuma registrada"}

Com base nessas informações, crie um plano de tratamento completo incluindo:
1. Tratamentos específicos com frequência e duração. Indique o status inicial como "pendente" e data_inicio como hoje.
2. Medicamentos recomendados.
3. Exames de acompanhamento. Indique o status inicial 'realizado' como false.
4. Metas terapêuticas com prazos. Indique o status inicial 'alcancada' como false.
5. Observações importantes.

Formato JSON estruturado.`;

      const resultado = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            objetivo_tratamento: { type: "string" },
            tratamentos: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  tipo: { type: "string" },
                  descricao: { type: "string" },
                  frequencia: { type: "string" },
                  duracao: { type: "string" },
                  status: { type: "string" }
                }
              }
            },
            medicamentos: { type: "array", items: { type: "string" } },
            exames_acompanhamento: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  exame: { type: "string" },
                  frequencia: { type: "string" },
                  realizado: { type: "boolean" }
                }
              }
            },
            metas: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  descricao: { type: "string" },
                  prazo: { type: "string" },
                  alcancada: { type: "boolean" }
                }
              }
            },
            observacoes: { type: "string" }
          },
          required: ["objetivo_tratamento", "tratamentos", "medicamentos", "exames_acompanhamento", "metas", "observacoes"]
        }
      });

      const planoIA = resultado;

      if (planoIA.tratamentos) {
        planoIA.tratamentos = planoIA.tratamentos.map(t => ({
          ...t,
          status: t.status || "pendente",
          data_inicio: t.data_inicio || format(new Date(), "yyyy-MM-dd")
        }));
      }
      if (planoIA.exames_acompanhamento) {
        planoIA.exames_acompanhamento = planoIA.exames_acompanhamento.map(e => ({
          ...e,
          realizado: e.realizado || false,
          proximo: e.proximo || ""
        }));
      }
      if (planoIA.metas) {
        planoIA.metas = planoIA.metas.map(m => ({
          ...m,
          alcancada: m.alcancada || false
        }));
      }

      const dataFim = new Date();
      dataFim.setMonth(dataFim.getMonth() + 3);

      setFormData({
        ...formData,
        paciente_id: paciente?.id || "",
        paciente_nome: dadosIA.paciente_nome,
        data_inicio: format(new Date(), "yyyy-MM-dd"),
        data_fim_prevista: format(dataFim, "yyyy-MM-dd"),
        diagnostico: dadosIA.diagnostico,
        objetivo_tratamento: dadosIA.objetivo || planoIA.objetivo_tratamento,
        tratamentos: planoIA.tratamentos || [],
        medicamentos: planoIA.medicamentos || [],
        exames_acompanhamento: planoIA.exames_acompanhamento || [],
        metas: planoIA.metas || [],
        evolucao: [],
        status: "ativo",
        progresso_percentual: 0,
        criado_por_ia: true,
        observacoes: planoIA.observacoes || ""
      });

      setShowIAPanel(false);
      setShowPanel(true);
    } catch (error) {
      console.error("Erro ao gerar plano:", error);
      alert("Erro ao gerar plano com IA");
    } finally {
      setGerandoIA(false);
    }
  };

  const sugerirAjusteIA = async (plano) => {
    setGerandoIA(true);
    try {
      const prontuariosRecentes = prontuarios
        .filter(p => p.paciente_id === plano.paciente_id)
        .sort((a, b) => new Date(b.data_atendimento) - new Date(a.data_atendimento))
        .slice(0, 5);

      const prompt = `Analise a evolução do paciente e sugira ajustes no plano de tratamento.

PLANO ATUAL:
Objetivo: ${plano.objetivo_tratamento}
Diagnóstico: ${plano.diagnostico}
Progresso: ${plano.progresso_percentual}%

EVOLUÇÃO RECENTE:
${prontuariosRecentes.map(p => `- ${format(new Date(p.data_atendimento), "dd/MM/yyyy")}: ${p.queixa_principal}`).join("\n")}

Sugira ajustes necessários.`;

      const sugestaoIA = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false,
        response_json_schema: {
          type: "object",
          properties: {
            sugestoes_tratamentos: { type: "array", items: { type: "object" } },
            recomendacoes_gerais: { type: "string" }
          }
        }
      });

      alert(`🤖 Sugestões da IA:\n\n${sugestaoIA.recomendacoes_gerais}`);

    } catch (error) {
      alert("Erro ao gerar sugestão com IA");
    } finally {
      setGerandoIA(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingPlano) {
      updateMutation.mutate({ id: editingPlano.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (plano) => {
    setEditingPlano(plano);
    setFormData({
      ...plano,
      tratamentos: plano.tratamentos || [],
      medicamentos: plano.medicamentos || [],
      exames_acompanhamento: plano.exames_acompanhamento || [],
      metas: plano.metas || [],
      evolucao: plano.evolucao || [],
    });
    setShowPanel(true);
  };

  const planosFiltrados = useMemo(
    () => planos
      .filter(p => filtroStatus === "todos" ? true : p.status === filtroStatus)
      .filter(p => p.paciente_nome?.toLowerCase().includes(busca.toLowerCase())),
    [planos, filtroStatus, busca]
  );

  const planosAtivos = planos.filter(p => p.status === "ativo").length;
  const planosConcluidos = planos.filter(p => p.status === "concluido").length;
  const progressoMedio = planos.length > 0
    ? Math.round(planos.reduce((acc, p) => acc + (p.progresso_percentual || 0), 0) / planos.length)
    : 0;

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
    <RouteGuard requireAuth requireClinica>
      <PermissionGuard modulo="planos_tratamento">
        <div className="max-w-6xl mx-auto space-y-5 md:space-y-6 overflow-x-hidden">
      <PageHeader
        title="Tratamentos"
        description="Planos personalizados com IA"
        breadcrumbs={[{ label: "Tratamentos" }]}
        action={
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                setDadosIA({
                  paciente_nome: "",
                  idade: "",
                  diagnostico: "",
                  condicoes_pre_existentes: "",
                  objetivo: ""
                });
                setShowIAPanel(true);
              }}
              aria-label="Criar plano com IA"
              className="inline-flex items-center justify-center gap-2 font-bold rounded-full hover:opacity-90 transition-all min-h-[48px] px-5 whitespace-nowrap overflow-hidden"
              style={{ backgroundColor: '#7E57FF', color: '#ffffff', fontSize: '14px' }}
            >
              <Sparkles className="w-5 h-5 flex-shrink-0" />
              <span>Criar com IA</span>
            </button>
            <button
              onClick={() => {
                setEditingPlano(null);
                setFormData({
                  paciente_id: "",
                  paciente_nome: "",
                  medico_responsavel: "",
                  data_inicio: format(new Date(), "yyyy-MM-dd"),
                  data_fim_prevista: "",
                  diagnostico: "",
                  objetivo_tratamento: "",
                  tratamentos: [],
                  medicamentos: [],
                  exames_acompanhamento: [],
                  metas: [],
                  evolucao: [],
                  status: "ativo",
                  progresso_percentual: 0,
                  observacoes: ""
                });
                setShowPanel(true);
              }}
              aria-label="Criar plano manualmente"
              className="inline-flex items-center justify-center gap-2 font-bold rounded-full hover:bg-gray-200 transition-all min-h-[48px] px-5 whitespace-nowrap overflow-hidden"
              style={{ backgroundColor: '#f8f9fa', color: '#202124', fontSize: '14px' }}
            >
              <span>Manual</span>
            </button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 overflow-hidden">
        <StatCard
          title="Planos Ativos"
          value={planosAtivos}
          icon={Activity}
          color="#7E57FF"
          delay={0}
        />
        <StatCard
          title="Concluídos"
          value={planosConcluidos}
          icon={CheckCircle}
          color="#34a853"
          delay={0.05}
        />
        <StatCard
          title="Progresso Médio"
          value={`${progressoMedio}%`}
          icon={TrendingUp}
          color="#7E57FF"
          delay={0.1}
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border p-4 md:p-5 overflow-hidden" style={{ borderColor: '#e8eaed' }}>
        <div className="min-w-0">
          <div className="flex flex-col gap-3">
            <div className="w-full min-w-0">
              <SearchBar
                value={busca}
                onChange={setBusca}
                placeholder="Buscar por paciente..."
              />
            </div>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-full bg-gray-100 border-0 rounded-full min-h-[48px]" style={{ fontSize: '14px' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" style={{ fontSize: '14px' }}>Todos</SelectItem>
                <SelectItem value="ativo" style={{ fontSize: '14px' }}>Ativo</SelectItem>
                <SelectItem value="concluido" style={{ fontSize: '14px' }}>Concluído</SelectItem>
                <SelectItem value="suspenso" style={{ fontSize: '14px' }}>Suspenso</SelectItem>
                <SelectItem value="cancelado" style={{ fontSize: '14px' }}>Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid gap-4 overflow-hidden">
        {planosFiltrados.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="Nenhum plano encontrado"
            description="Crie planos de tratamento personalizados com IA ou manualmente"
            action={{
              label: "Criar Primeiro Plano com IA",
              onClick: () => {
                setDadosIA({
                  paciente_nome: "",
                  idade: "",
                  diagnostico: "",
                  condicoes_pre_existentes: "",
                  objetivo: ""
                });
                setShowIAPanel(true);
              },
              icon: Sparkles
            }}
          />
        ) : (
          planosFiltrados.map((plano) => (
            <div
              key={plano.id}
              className="bg-white rounded-2xl shadow-sm border p-5 md:p-6 overflow-hidden"
              style={{ borderColor: '#e8eaed' }}
            >
              <div className="min-w-0">
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3 min-w-0">
                 <div className="flex items-start gap-3 flex-1 min-w-0">
                   <div
                     className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                     style={{
                       backgroundColor: plano.status === "ativo" ? '#f5f3ff' :
                                      plano.status === "concluido" ? '#e6f7ed' : '#f8f9fa',
                       color: plano.status === "ativo" ? '#7E57FF' :
                             plano.status === "concluido" ? '#34a853' : '#80868b'
                     }}
                   >
                     <Activity className="w-6 h-6" />
                   </div>
                   <div className="flex-1 min-w-0">
                     <h3 className="font-bold truncate" style={{ color: '#202124', fontSize: '16px' }}>{plano.paciente_nome}</h3>
                     <p className="mt-1 truncate" style={{ color: '#5f6368', fontSize: '14px' }}>
                       Dr(a). {plano.medico_responsavel}
                     </p>
                     <div className="flex flex-wrap gap-2 mt-2">
                       {plano.criado_por_ia && (
                         <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg font-bold" style={{ backgroundColor: '#f5f3ff', color: '#7E57FF', fontSize: '12px' }}>
                           <Brain className="w-3 h-3 flex-shrink-0" />
                           IA
                         </span>
                       )}
                       <span className={`px-2.5 py-1 rounded-lg font-bold ${
                         plano.status === "ativo" ? "bg-green-50 border border-green-200 text-green-700" :
                         plano.status === "concluido" ? "bg-blue-50 border border-blue-200 text-blue-700" :
                         plano.status === "suspenso" ? "bg-yellow-50 border border-yellow-200 text-yellow-700" : 
                         "bg-gray-100 border border-gray-200 text-gray-700"
                       }`} style={{ fontSize: '12px' }}>
                         {plano.status}
                       </span>
                     </div>
                   </div>
                 </div>
                 <div className="text-right flex-shrink-0">
                   <p className="mb-1" style={{ color: '#5f6368', fontSize: '13px' }}>Progresso</p>
                   <p className="text-2xl font-bold" style={{ color: '#7E57FF' }}>{plano.progresso_percentual || 0}%</p>
                 </div>
                </div>

                {plano.diagnostico && (
                  <div className="bg-gray-100 p-3 rounded-xl overflow-hidden">
                    <p className="mb-1 font-bold truncate" style={{ color: '#80868b', fontSize: '13px' }}>Diagnóstico:</p>
                    <p className="break-words" style={{ color: '#202124', fontSize: '14px', lineHeight: '1.5' }}>{plano.diagnostico}</p>
                  </div>
                )}

                {plano.objetivo_tratamento && (
                  <div className="bg-gray-100 p-3 rounded-xl overflow-hidden">
                    <p className="mb-1 font-bold truncate" style={{ color: '#80868b', fontSize: '13px' }}>Objetivo:</p>
                    <p className="break-words" style={{ color: '#202124', fontSize: '14px', lineHeight: '1.5' }}>{plano.objetivo_tratamento}</p>
                  </div>
                )}

                <ProgressBar 
                  value={plano.progresso_percentual || 0} 
                  max={100} 
                  showLabel={false}
                  color="auto"
                  size="md"
                />

                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 overflow-hidden">
                  <button 
                    onClick={() => handleEdit(plano)}
                    aria-label="Ver detalhes do plano"
                    className="inline-flex items-center justify-center gap-2 font-bold rounded-xl hover:bg-gray-200 transition-all min-h-[48px] px-3 overflow-hidden"
                    style={{ backgroundColor: '#f8f9fa', color: '#202124', fontSize: '14px' }}
                  >
                    <Eye className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">Ver</span>
                  </button>
                  <button 
                    onClick={() => {
                      setPlanoSelecionado(plano);
                      setShowProgressoPanel(true);
                    }}
                    aria-label="Ver progresso"
                    className="inline-flex items-center justify-center gap-2 font-bold rounded-xl hover:bg-gray-200 transition-all min-h-[48px] px-3 overflow-hidden"
                    style={{ backgroundColor: '#f8f9fa', color: '#202124', fontSize: '14px' }}
                  >
                    <BarChart2 className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">Progresso</span>
                  </button>
                  <button 
                    onClick={() => {
                      setPlanoSelecionado(plano);
                      setShowAlertasPanel(true);
                    }}
                    aria-label="Ver alertas"
                    className="inline-flex items-center justify-center gap-2 font-bold rounded-xl hover:bg-gray-200 transition-all min-h-[48px] px-3 overflow-hidden"
                    style={{ backgroundColor: '#f8f9fa', color: '#202124', fontSize: '14px' }}
                  >
                    <Bell className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">Alertas</span>
                  </button>
                  <button 
                    onClick={() => {
                      setPlanoSelecionado(plano);
                      setShowProntuariosPanel(true);
                    }}
                    aria-label="Ver prontuários"
                    className="inline-flex items-center justify-center gap-2 font-bold rounded-xl hover:bg-gray-200 transition-all min-h-[48px] px-3 overflow-hidden"
                    style={{ backgroundColor: '#f8f9fa', color: '#202124', fontSize: '14px' }}
                  >
                    <LinkIcon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">Prontuários</span>
                  </button>
                  <button 
                    onClick={() => sugerirAjusteIA(plano)}
                    disabled={gerandoIA}
                    aria-label="Sugerir ajustes com IA"
                    className="inline-flex items-center justify-center gap-2 font-bold rounded-xl hover:opacity-90 transition-all min-h-[48px] px-3 disabled:opacity-50 disabled:cursor-not-allowed col-span-2 sm:col-span-1 overflow-hidden"
                    style={{ backgroundColor: '#7E57FF', color: '#ffffff', fontSize: '14px' }}
                  >
                    {gerandoIA ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0" />
                        <span className="truncate">Analisando...</span>
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">Sugerir IA</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              </div>
            </div>
          ))
        )}
      </div>

      <SlideInPanel
        open={showIAPanel}
        onClose={() => setShowIAPanel(false)}
        title="Criar Plano com IA"
        maxWidth="700px"
      >
        <div className="space-y-4">
          <div className="rounded-lg p-4 flex items-start gap-3 border overflow-hidden" style={{ backgroundColor: '#f5f3ff', borderColor: '#e9ddff' }}>
            <Sparkles className="w-6 h-6 flex-shrink-0 mt-1" style={{ color: '#7E57FF' }} />
            <div className="min-w-0">
              <h3 className="font-bold mb-1" style={{ color: '#7E57FF' }}>Assistente Inteligente</h3>
              <p className="text-sm break-words" style={{ color: '#5f4ab8' }}>
                Forneça as informações do paciente e nossa IA gerará um plano personalizado
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Diagnóstico *</label>
            <textarea
              value={dadosIA.diagnostico}
              onChange={(e) => setDadosIA({ ...dadosIA, diagnostico: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-3 resize-none min-h-[88px]"
              style={{ fontSize: '14px' }}
              rows="3"
              placeholder="Descreva o diagnóstico principal..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Objetivos *</label>
            <textarea
              value={dadosIA.objetivo}
              onChange={(e) => setDadosIA({ ...dadosIA, objetivo: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-3 resize-none min-h-[88px]"
              style={{ fontSize: '14px' }}
              rows="3"
              placeholder="Objetivos do tratamento..."
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowIAPanel(false)}
              disabled={gerandoIA}
              className="min-h-[44px] flex-1"
            >
              Cancelar
            </Button>
            <button
              type="button"
              onClick={gerarPlanoIA}
              disabled={gerandoIA || !dadosIA.paciente_nome || !dadosIA.diagnostico || !dadosIA.objetivo}
              className="flex-1 text-white font-medium px-4 py-2 rounded-lg min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
              style={{ backgroundColor: '#7E57FF' }}
            >
              {gerandoIA ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Gerando...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 flex-shrink-0" />
                  <span>Gerar Plano</span>
                </>
              )}
            </button>
          </div>
        </div>
      </SlideInPanel>

      <SlideInPanel
        open={showPanel}
        onClose={() => setShowPanel(false)}
        title={editingPlano ? "Editar Plano" : "Novo Plano"}
        maxWidth="900px"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <SelectTrigger className="pc-input min-h-[44px]">
                  <SelectValue placeholder="Selecione" />
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Médico *</label>
              <Select
                value={formData.medico_responsavel}
                onValueChange={(value) => setFormData({ ...formData, medico_responsavel: value })}
              >
                <SelectTrigger className="pc-input min-h-[44px]">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {medicos.map((m) => (
                    <SelectItem key={m.id} value={m.nome_completo}>
                      Dr(a). {m.nome_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Objetivo *</label>
            <textarea
              value={formData.objetivo_tratamento}
              onChange={(e) => setFormData({ ...formData, objetivo_tratamento: e.target.value })}
              className="w-full pc-input resize-none min-h-[88px]"
              rows="3"
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowPanel(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="flex-1 text-white font-medium px-4 py-2 rounded-lg min-h-[44px] disabled:opacity-50"
              style={{ backgroundColor: '#7E57FF' }}
            >
              {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </SlideInPanel>

      <SlideInPanel
        open={showProgressoPanel}
        onClose={() => {
          setShowProgressoPanel(false);
          queryClient.invalidateQueries(["planos-tratamento"]);
        }}
        title={`Progresso - ${planoSelecionado?.paciente_nome}`}
        maxWidth="800px"
      >
        {planoSelecionado && (
          <AcompanhamentoProgresso
            plano={planoSelecionado}
            onAtualizar={() => queryClient.invalidateQueries(["planos-tratamento"])}
          />
        )}
      </SlideInPanel>

      <SlideInPanel
        open={showAlertasPanel}
        onClose={() => setShowAlertasPanel(false)}
        title={`Alertas - ${planoSelecionado?.paciente_nome}`}
        maxWidth="700px"
      >
        {planoSelecionado && (
          <AlertasMedicacao plano={planoSelecionado} prontuarios={prontuarios} />
        )}
      </SlideInPanel>

      <SlideInPanel
        open={showProntuariosPanel}
        onClose={() => setShowProntuariosPanel(false)}
        title={`Prontuários - ${planoSelecionado?.paciente_nome}`}
        maxWidth="800px"
      >
        {planoSelecionado && (
          <VinculacaoProntuarios plano={planoSelecionado} prontuarios={prontuarios} />
        )}
      </SlideInPanel>
        </div>
      </PermissionGuard>
    </RouteGuard>
  );
}
