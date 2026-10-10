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
import { LoadingState, EmptyState } from "@/components/ui/LoadingSpinner";
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

export default function PlanosTratamento() {
  usePerformanceTracker('/PlanosTratamento');
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
    paciente_id: "", // Added
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
    evolucao: [], // Added
    status: "ativo",
    progresso_percentual: 0,
    observacoes: ""
  });

  const [dadosIA, setDadosIA] = useState({
    paciente_nome: "",
    idade: "",
    diagnostico: "",
    condicoes_pre_existentes: "",
    objetivo: "" // Renamed from 'objetivos'
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
      // const agendamentosPaciente = agendamentos.filter((a) => a.paciente_id === paciente?.id); // Not directly used in prompt, but available for context

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
            objetivo_tratamento: { type: "string" }, // Added to schema, as prompt asks for it
            tratamentos: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  tipo: { type: "string" },
                  descricao: { type: "string" },
                  frequencia: { type: "string" },
                  duracao: { type: "string" },
                  status: { type: "string" } // Added to schema
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
                  realizado: { type: "boolean" } // Added to schema
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
                  alcancada: { type: "boolean" } // Added to schema
                }
              }
            },
            observacoes: { type: "string" }
          },
          required: ["objetivo_tratamento", "tratamentos", "medicamentos", "exames_acompanhamento", "metas", "observacoes"]
        }
      });

      const planoIA = resultado;

      // Process planoIA to ensure default statuses/flags are present, even if AI didn't provide them
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
          proximo: e.proximo || "" // AI schema has no 'proximo', so default it
        }));
      }
      if (planoIA.metas) {
        planoIA.metas = planoIA.metas.map(m => ({
          ...m,
          alcancada: m.alcancada || false
        }));
      }

      const dataFim = new Date();
      dataFim.setMonth(dataFim.getMonth() + 3); // Default 3 months

      setFormData({
        ...formData, // Keep other formData defaults like medico_responsavel
        paciente_id: paciente?.id || "",
        paciente_nome: dadosIA.paciente_nome,
        // medico_responsavel: "", // Left blank or could default to a logged-in user
        data_inicio: format(new Date(), "yyyy-MM-dd"),
        data_fim_prevista: format(dataFim, "yyyy-MM-dd"),
        diagnostico: dadosIA.diagnostico,
        objetivo_tratamento: dadosIA.objetivo || planoIA.objetivo_tratamento, // Use AI's objective if provided, else patient's
        tratamentos: planoIA.tratamentos || [],
        medicamentos: planoIA.medicamentos || [],
        exames_acompanhamento: planoIA.exames_acompanhamento || [],
        metas: planoIA.metas || [],
        evolucao: [], // Initialize empty
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

  // New function for AI adjustment suggestions
  const sugerirAjusteIA = async (plano) => {
    setGerandoIA(true);
    try {
      const prontuariosRecentes = prontuarios
        .filter(p => p.paciente_id === plano.paciente_id)
        .sort((a, b) => new Date(b.data_atendimento) - new Date(a.data_atendimento)) // Sort by date
        .slice(0, 5); // Get up to 5 recent prontuarios

      const prompt = `Analise a evolução do paciente e sugira ajustes no plano de tratamento.
Considere que o plano de tratamento é flexível e deve se adaptar às necessidades do paciente.

PLANO ATUAL:
Objetivo: ${plano.objetivo_tratamento}
Diagnóstico: ${plano.diagnostico}
Progresso: ${plano.progresso_percentual}%
Tratamentos atuais: ${plano.tratamentos?.map(t => `${t.tipo} (${t.status})`).join(", ") || "Nenhum tratamento registrado"}
Medicamentos atuais: ${plano.medicamentos?.join(", ") || "Nenhum medicamento registrado"}
Metas atuais: ${plano.metas?.map(m => `${m.descricao} (Alcançada: ${m.alcancada ? "Sim" : "Não"})`).join(", ") || "Nenhuma meta registrada"}
Observações do plano: ${plano.observacoes || "Nenhuma"}

EVOLUÇÃO RECENTE DO PACIENTE (Prontuários):
${prontuariosRecentes.length > 0 ? prontuariosRecentes.map(p => `- Data: ${format(new Date(p.data_atendimento), "dd/MM/yyyy")}, Queixa: ${p.queixa_principal}, Diagnóstico: ${p.hipotese_diagnostica}, Conduta: ${p.conduta_plano_terapeutico}`).join("\n") : "Nenhum prontuário recente para análise."}

Baseado na evolução atual e no plano existente, sugira:
1. Ajustes específicos para tratamentos (manter, ajustar frequência/duração, descontinuar, adicionar novos), incluindo tipo, descrição, frequência e duração.
2. Novos medicamentos ou ajustes nos existentes.
3. Exames complementares ou modificações nos exames de acompanhamento.
4. Ajustes nas metas terapêuticas (revisar prazo, adicionar novas, marcar como alcançadas/não alcançadas).
5. Recomendações gerais para o próximo período.

Retorne no formato JSON com as seguintes propriedades:
{
  "sugestoes_tratamentos": [{"acao": "string (adicionar/ajustar/manter/descontinuar)", "tipo": "string", "descricao": "string", "frequencia": "string", "duracao": "string"}],
  "sugestoes_medicamentos": [{"acao": "string (adicionar/ajustar/descontinuar)", "medicamento": "string", "dosagem_frequencia": "string"}],
  "sugestoes_exames": [{"acao": "string (adicionar/manter/remover)", "exame": "string", "frequencia": "string"}],
  "sugestoes_metas": [{"acao": "string (adicionar/ajustar/marcar)", "descricao": "string", "prazo": "string (yyyy-MM-dd)", "alcancada": "boolean"}],
  "recomendacoes_gerais": "string"
}`;

      const sugestaoIA = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            sugestoes_tratamentos: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  acao: { type: "string" },
                  tipo: { type: "string" },
                  descricao: { type: "string" },
                  frequencia: { type: "string" },
                  duracao: { type: "string" }
                }
              }
            },
            sugestoes_medicamentos: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  acao: { type: "string" },
                  medicamento: { type: "string" },
                  dosagem_frequencia: { type: "string" }
                }
              }
            },
            sugestoes_exames: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  acao: { type: "string" },
                  exame: { type: "string" },
                  frequencia: { type: "string" }
                }
              }
            },
            sugestoes_metas: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  acao: { type: "string" },
                  descricao: { type: "string" },
                  prazo: { type: "string" },
                  alcancada: { type: "boolean" }
                }
              }
            },
            recomendacoes_gerais: { type: "string" }
          }
        }
      });

      // Format the AI suggestions for display
      let alertMessage = `🤖 Sugestões de Ajuste da IA para ${plano.paciente_nome}:\n\n`;

      if (sugestaoIA.sugestoes_tratamentos?.length > 0) {
        alertMessage += `📋 TRATAMENTOS:\n${sugestaoIA.sugestoes_tratamentos.map(t =>
          `- ${t.acao}: ${t.tipo} - ${t.descricao} (Freq: ${t.frequencia}, Dur: ${t.duracao})`
        ).join("\n")}\n\n`;
      } else {
        alertMessage += `📋 TRATAMENTOS: Manter atual\n\n`;
      }

      if (sugestaoIA.sugestoes_medicamentos?.length > 0) {
        alertMessage += `💊 MEDICAMENTOS:\n${sugestaoIA.sugestoes_medicamentos.map(m =>
          `- ${m.acao}: ${m.medicamento} (${m.dosagem_frequencia})`
        ).join("\n")}\n\n`;
      } else {
        alertMessage += `💊 MEDICAMENTOS: Sem alterações\n\n`;
      }

      if (sugestaoIA.sugestoes_exames?.length > 0) {
        alertMessage += `🔬 EXAMES:\n${sugestaoIA.sugestoes_exames.map(e =>
          `- ${e.acao}: ${e.exame} (Freq: ${e.frequencia})`
        ).join("\n")}\n\n`;
      } else {
        alertMessage += `🔬 EXAMES: Nenhum adicional necessário\n\n`;
      }

      if (sugestaoIA.sugestoes_metas?.length > 0) {
        alertMessage += `🎯 METAS:\n${sugestaoIA.sugestoes_metas.map(m =>
          `- ${m.acao}: ${m.descricao} (Prazo: ${m.prazo || 'N/A'}, Alcançada: ${m.alcancada ? 'Sim' : 'Não'})`
        ).join("\n")}\n\n`;
      } else {
        alertMessage += `🎯 METAS: Sem alterações\n\n`;
      }

      if (sugestaoIA.recomendacoes_gerais) {
        alertMessage += `💡 RECOMENDAÇÕES GERAIS:\n${sugestaoIA.recomendacoes_gerais}\n\n`;
      }

      alert(alertMessage + "Revise as sugestões e ajuste o plano conforme necessário.");

    } catch (error) {
      console.error("Erro ao sugerir ajuste:", error);
      alert("Erro ao gerar sugestão com IA");
    } finally {
      setGerandoIA(false);
    }
  };

  const verTimeline = (plano) => {
    setPlanoSelecionado(plano);
    setShowTimelinePanel(true);
  };

  const verProgresso = (plano) => {
    setPlanoSelecionado(plano);
    setShowProgressoPanel(true);
  };

  const verAlertas = (plano) => {
    setPlanoSelecionado(plano);
    setShowAlertasPanel(true);
  };

  const verProntuarios = (plano) => {
    setPlanoSelecionado(plano);
    setShowProntuariosPanel(true);
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
    // Ensure nested arrays are not null for form to handle correctly
    setFormData({
      ...plano,
      tratamentos: plano.tratamentos || [],
      medicamentos: plano.medicamentos || [],
      exames_acompanhamento: plano.exames_acompanhamento || [],
      metas: plano.metas || [],
      evolucao: plano.evolucao || [],
      // Ensure date fields are correctly formatted if necessary, though direct assignment should work
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
        title="Planos de Tratamento"
        description="Planos personalizados com IA"
        breadcrumbs={[{ label: "Planos" }]}
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

      {/* Stats - Mobile First */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 overflow-hidden">
        {(
          <>
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
          </>
        )}
      </div>

      {/* Filtros - Mobile First */}
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

      {/* Lista de Planos */}
      <div className="grid gap-4 overflow-hidden">
        {planosFiltrados.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border p-8 md:p-12 text-center overflow-hidden" style={{ borderColor: '#e8eaed' }}>
            <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="font-bold mb-2" style={{ color: '#202124', fontSize: '18px' }}>Nenhum plano encontrado</h3>
            <p className="mb-6" style={{ color: '#5f6368', fontSize: '14px' }}>Crie planos de tratamento personalizados com IA ou manualmente</p>
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
              aria-label="Criar primeiro plano com IA"
              className="inline-flex items-center gap-2 font-bold rounded-full hover:opacity-90 transition-all min-h-[48px] px-6"
              style={{ backgroundColor: '#7E57FF', color: '#ffffff', fontSize: '14px' }}
            >
              <Sparkles className="w-5 h-5 flex-shrink-0" />
              Criar Primeiro Plano com IA
            </button>
          </div>
        ) : (
          planosFiltrados.map((plano, idx) => (
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

                {/* Barra de Progresso */}
                <ProgressBar 
                  value={plano.progresso_percentual || 0} 
                  max={100} 
                  showLabel={false}
                  color="auto"
                  size="md"
                />

                {/* Ações - Mobile Grid */}
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
                    onClick={() => verProgresso(plano)}
                    aria-label="Ver progresso do tratamento"
                    className="inline-flex items-center justify-center gap-2 font-bold rounded-xl hover:bg-gray-200 transition-all min-h-[48px] px-3 overflow-hidden"
                    style={{ backgroundColor: '#f8f9fa', color: '#202124', fontSize: '14px' }}
                  >
                    <BarChart2 className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">Progresso</span>
                  </button>
                  <button 
                    onClick={() => verAlertas(plano)}
                    aria-label="Ver alertas de medicação"
                    className="inline-flex items-center justify-center gap-2 font-bold rounded-xl hover:bg-gray-200 transition-all min-h-[48px] px-3 overflow-hidden"
                    style={{ backgroundColor: '#f8f9fa', color: '#202124', fontSize: '14px' }}
                  >
                    <Bell className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">Alertas</span>
                  </button>
                  <button 
                    onClick={() => verProntuarios(plano)}
                    aria-label="Ver prontuários vinculados"
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

      {/* SlideInPanel - IA */}
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
                Forneça as informações do paciente e nossa IA gerará um plano de tratamento personalizado
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Idade</label>
            <Input
              type="number"
              value={dadosIA.idade}
              onChange={(e) => setDadosIA({ ...dadosIA, idade: e.target.value })}
              className="border border-gray-300 rounded-lg min-h-[44px]"
              style={{ fontSize: '14px' }}
              placeholder="Ex: 45"
            />
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Condições Pré-existentes</label>
            <textarea
              value={dadosIA.condicoes_pre_existentes}
              onChange={(e) => setDadosIA({ ...dadosIA, condicoes_pre_existentes: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-3 resize-none min-h-[72px]"
              style={{ fontSize: '14px' }}
              rows="2"
              placeholder="Hipertensão, diabetes, alergias..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Objetivos do Tratamento *</label>
            <textarea
              value={dadosIA.objetivo}
              onChange={(e) => setDadosIA({ ...dadosIA, objetivo: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-3 resize-none min-h-[88px]"
              style={{ fontSize: '14px' }}
              rows="3"
              placeholder="Descreva os objetivos principais do tratamento..."
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
                  <span>Gerando Plano...</span>
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

      {/* SlideInPanel - Formulário Manual */}
      <SlideInPanel
        open={showPanel}
        onClose={() => setShowPanel(false)}
        title={editingPlano ? "Editar Plano" : "Novo Plano de Tratamento"}
        maxWidth="900px"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs md:text-sm font-medium text-[var(--pc-text-secondary)] mb-2">Paciente *</label>
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
              <label className="block text-xs md:text-sm font-medium text-[var(--pc-text-secondary)] mb-2">Médico *</label>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs md:text-sm font-medium text-[var(--pc-text-secondary)] mb-2">Data Início</label>
              <Input
                type="date"
                value={formData.data_inicio}
                onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                className="pc-input min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-[var(--pc-text-secondary)] mb-2">Término Previsto</label>
              <Input
                type="date"
                value={formData.data_fim_prevista}
                onChange={(e) => setFormData({ ...formData, data_fim_prevista: e.target.value })}
                className="pc-input min-h-[44px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs md:text-sm font-medium text-[var(--pc-text-secondary)] mb-2">Diagnóstico</label>
            <Input
              value={formData.diagnostico}
              onChange={(e) => setFormData({ ...formData, diagnostico: e.target.value })}
              className="pc-input min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-xs md:text-sm font-medium text-[var(--pc-text-secondary)] mb-2">Objetivo *</label>
            <textarea
              value={formData.objetivo_tratamento}
              onChange={(e) => setFormData({ ...formData, objetivo_tratamento: e.target.value })}
              className="w-full pc-input resize-none min-h-[88px]"
              style={{ fontSize: '14px' }}
              rows="3"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs md:text-sm font-medium text-[var(--pc-text-secondary)] mb-2">Status</label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger className="pc-input min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="suspenso">Suspenso</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-[var(--pc-text-secondary)] mb-2">Progresso (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.progresso_percentual}
                onChange={(e) => setFormData({ ...formData, progresso_percentual: parseInt(e.target.value) })}
                className="pc-input min-h-[44px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs md:text-sm font-medium text-[var(--pc-text-secondary)] mb-2">Observações</label>
            <textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              className="w-full pc-input resize-none min-h-[88px]"
              style={{ fontSize: '14px' }}
              rows="3"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowPanel(false)}
              className="min-h-[44px] flex-1"
            >
              Cancelar
            </Button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="flex-1 text-white font-medium px-4 py-2 rounded-lg min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
              style={{ backgroundColor: '#7E57FF' }}
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

      {/* Panel - Progresso */}
      <SlideInPanel
        open={showProgressoPanel}
        onClose={() => {
          setShowProgressoPanel(false);
          queryClient.invalidateQueries(["planos-tratamento"]);
        }}
        title={`Acompanhamento - ${planoSelecionado?.paciente_nome}`}
        maxWidth="800px"
      >
        {planoSelecionado && (
          <AcompanhamentoProgresso
            plano={planoSelecionado}
            onAtualizar={() => queryClient.invalidateQueries(["planos-tratamento"])}
          />
        )}
      </SlideInPanel>

      {/* Panel - Alertas */}
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

      {/* Panel - Prontuários Vinculados */}
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

      {/* SlideInPanel - Timeline/Cronograma */}
      <SlideInPanel
        open={showTimelinePanel}
        onClose={() => setShowTimelinePanel(false)}
        title={`Cronograma - ${planoSelecionado?.paciente_nome}`}
        maxWidth="700px"
      >
        {planoSelecionado && (
          <div className="space-y-6">
            {/* Header do Plano */}
            <div className="clay-inset rounded-lg p-4">
              <h3 className="font-bold text-gray-800 mb-2">{planoSelecionado.objetivo_tratamento}</h3>
              <div className="grid sm:grid-cols-2 gap-2 text-sm text-gray-600">
                <span>Início: {format(new Date(planoSelecionado.data_inicio), "dd/MM/yyyy", { locale: ptBR })}</span>
                {planoSelecionado.data_fim_prevista && (
                  <span>Previsão: {format(new Date(planoSelecionado.data_fim_prevista), "dd/MM/yyyy", { locale: ptBR })}</span>
                )}
              </div>
            </div>

            {/* Timeline Vertical */}
            <div className="space-y-4">
              <h4 className="font-bold text-gray-800">Tratamentos</h4>
              {planoSelecionado.tratamentos?.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Nenhum tratamento definido</p>
              ) : (
                <div className="relative border-l-2 border-gray-300 pl-6 space-y-4">
                  {planoSelecionado.tratamentos?.map((trat, idx) => (
                    <div key={idx} className="relative">
                      <div className={`absolute -left-[29px] w-4 h-4 rounded-full border-2 ${
                        trat.status === "concluido" ? "bg-green-600 border-green-600" :
                        trat.status === "em_andamento" || trat.status === "ativo" ? "bg-orange-600 border-orange-600" :
                        "bg-white border-gray-300"
                      }`} />
                      <div className="clay-inset rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="font-medium text-gray-800">{trat.tipo}</h5>
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${
                            trat.status === "concluido" ? "bg-green-50 text-green-700 border-green-200" :
                            trat.status === "em_andamento" || trat.status === "ativo" ? "bg-orange-50 text-orange-700 border-orange-200" :
                            "bg-blue-50 text-blue-700 border-blue-200"
                          }`}>
                            {trat.status === "ativo" ? "em andamento" : trat.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{trat.descricao}</p>
                        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                          {trat.frequencia && <span>Frequência: {trat.frequencia}</span>}
                          {trat.duracao && <span>Duração: {trat.duracao}</span>}
                          {trat.data_inicio && <span>Início: {format(new Date(trat.data_inicio), "dd/MM/yy", { locale: ptBR })}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Exames de Acompanhamento */}
            {planoSelecionado.exames_acompanhamento?.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-bold text-gray-800">Exames de Acompanhamento</h4>
                {planoSelecionado.exames_acompanhamento.map((exame, idx) => (
                  <div key={idx} className="clay-inset rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-800">{exame.exame}</p>
                        <p className="text-sm text-gray-600">Frequência: {exame.frequencia}</p>
                      </div>
                      {exame.realizado ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <Clock className="w-5 h-5 text-orange-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Medicamentos */}
            {planoSelecionado.medicamentos?.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-bold text-gray-800">Medicamentos</h4>
                {planoSelecionado.medicamentos.map((medicamento, idx) => (
                  <div key={idx} className="clay-inset rounded-lg p-4">
                    <p className="font-medium text-gray-800">{medicamento}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Metas */}
            {planoSelecionado.metas?.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-bold text-gray-800">Metas Terapêuticas</h4>
                {planoSelecionado.metas.map((meta, idx) => (
                  <div key={idx} className="clay-inset rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{meta.descricao}</p>
                        {meta.prazo && (
                          <p className="text-sm text-gray-600 mt-1">Prazo: {format(new Date(meta.prazo), "dd/MM/yyyy", { locale: ptBR })}</p>
                        )}
                      </div>
                      {meta.alcancada ? (
                        <span className="bg-green-50 border border-green-200 text-green-700 px-3 py-1 rounded-lg text-xs font-medium">
                          Alcançada
                        </span>
                      ) : (
                        <span className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1 rounded-lg text-xs font-medium">
                          Em andamento
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Observações */}
            {planoSelecionado.observacoes && (
              <div className="space-y-3">
                <h4 className="font-bold text-gray-800">Observações</h4>
                <div className="clay-inset rounded-lg p-4">
                  <p className="text-sm text-gray-600">{planoSelecionado.observacoes}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </SlideInPanel>
        </div>
      </PermissionGuard>
    </RouteGuard>
  );
}