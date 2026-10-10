import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Plus,
  Search,
  MessageCircle,
  Send,
  Brain,
  CheckCircle,
  Clock,
  Paperclip
} from "lucide-react";
import SistemaMensagens from "@/components/colaboracao/SistemaMensagens";
import DiscussaoCaso from "@/components/colaboracao/DiscussaoCaso";
import AnexosReferencias from "@/components/colaboracao/AnexosReferencias";
import { Input } from "@/components/ui/input.jsx";
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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect } from "react";
import { useOptimizedQuery } from "@/components/hooks/useOptimizedQuery";
import usePerformanceTracker from "@/components/hooks/usePerformanceTracker";
import RouteGuard from "@/components/auth/RouteGuard";
import PermissionGuard from "@/components/auth/PermissionGuard";

export default function ColaboracaoMedica() {
  usePerformanceTracker('/ColaboracaoMedica');
  const [showPanel, setShowPanel] = useState(false);
  const [showMensagensPanel, setShowMensagensPanel] = useState(false);
  const [showDiscussaoPanel, setShowDiscussaoPanel] = useState(false);
  const [showAnexosPanel, setShowAnexosPanel] = useState(false);
  const [colaboracaoSelecionada, setColaboracaoSelecionada] = useState(null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [expandido, setExpandido] = useState({});
  const [gerandoSugestaoIA, setGerandoSugestaoIA] = useState(null);
  const [medicoAtual, setMedicoAtual] = useState("Dr. Sistema");
  const queryClient = useQueryClient();

  useEffect(() => {
    const getMedico = async () => {
      try {
        const user = await base44.auth.me();
        setMedicoAtual(user.full_name || user.email);
      } catch (e) {
        // Not logged in
      }
    };
    getMedico();
  }, []);

  const { data: user } = useOptimizedQuery({
    queryKey: ["user"],
    queryFn: () => base44.auth.me()
  });

  const clinicaId = user?.clinica_id;

  const { data: colaboracoes = [], isLoading } = useOptimizedQuery({
    queryKey: ["colaboracoes", clinicaId],
    queryFn: () => clinicaId ? base44.entities.ColaboracaoMedica.filter({ clinica_id: clinicaId }, "-created_date") : [],
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

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      const payload = { ...data, clinica_id: user.clinica_id };
      return base44.entities.ColaboracaoMedica.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["colaboracoes"]);
      setShowPanel(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const user = await base44.auth.me();
      const payload = { ...data, clinica_id: user.clinica_id };
      return base44.entities.ColaboracaoMedica.update(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["colaboracoes"]);
    }
  });

  const [formData, setFormData] = useState({
    titulo: "",
    paciente_nome: "",
    tipo: "segunda_opiniao",
    especialidade_alvo: "",
    medico_solicitante: "Dr. Sistema", // TODO: pegar médico logado
    descricao_caso: "",
    questoes_especificas: [""],
    prioridade: "normal",
    visibilidade: "equipe",
    status: "aberto"
  });

  const [respostaTemp, setRespostaTemp] = useState({
    colaboracao_id: null,
    resposta: "",
    recomendacoes: [""]
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const adicionarResposta = async (colaboracao) => {
    if (!respostaTemp.resposta) return;

    const novasRespostas = [
      ...(colaboracao.respostas || []),
      {
        medico: "Dr. Sistema", // TODO: pegar médico logado
        data: new Date().toISOString(),
        resposta: respostaTemp.resposta,
        recomendacoes: respostaTemp.recomendacoes.filter(r => r.trim()),
        referencias: []
      }
    ];

    await updateMutation.mutateAsync({
      id: colaboracao.id,
      data: {
        ...colaboracao,
        respostas: novasRespostas,
        status: "em_discussao"
      }
    });

    setRespostaTemp({ colaboracao_id: null, resposta: "", recomendacoes: [""] });
  };

  const gerarSugestaoIA = async (colaboracao) => {
    setGerandoSugestaoIA(colaboracao.id);
    try {
      const prompt = `Como assistente médico especializado, analise o seguinte caso clínico e forneça sugestões:

Título: ${colaboracao.titulo}
Tipo: ${colaboracao.tipo}
Especialidade: ${colaboracao.especialidade_alvo}
Paciente: ${colaboracao.paciente_nome || "Não identificado"}

Descrição do Caso:
${colaboracao.descricao_caso}

Questões Específicas:
${colaboracao.questoes_especificas?.join("\n")}

Forneça:
1. Análise detalhada do caso
2. Referências científicas relevantes (artigos, guidelines)
3. Casos similares na literatura

Formato JSON.`;

      const sugestao = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            analise: { type: "string" },
            referencias_cientificas: {
              type: "array",
              items: { type: "string" }
            },
            casos_similares: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      await updateMutation.mutateAsync({
        id: colaboracao.id,
        data: {
          ...colaboracao,
          sugestao_ia: sugestao
        }
      });
    } catch (error) {
      console.error("Erro ao gerar sugestão:", error);
      alert("Erro ao gerar sugestão com IA");
    } finally {
      setGerandoSugestaoIA(null);
    }
  };

  const toggleExpand = (id) => {
    setExpandido(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const colaboracoesFiltradas = colaboracoes
    .filter(c => filtroStatus === "todos" ? true : c.status === filtroStatus)
    .filter(c => 
      c.titulo?.toLowerCase().includes(busca.toLowerCase()) ||
      c.paciente_nome?.toLowerCase().includes(busca.toLowerCase())
    );

  const getPrioridadeColor = (prioridade) => {
    switch (prioridade) {
      case "urgente": return "bg-red-100 text-red-800 border-red-300";
      case "alta": return "bg-orange-100 text-orange-800 border-orange-300";
      case "normal": return "bg-blue-100 text-blue-800 border-blue-300";
      default: return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  return (
    <RouteGuard requireAuth requireClinica>
      <PermissionGuard modulo="colaboracao">
        <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="Colaboração Médica"
        description="Discussão de casos clínicos"
        breadcrumbs={[{ label: "Colaboração" }]}
        action={
          <Button
            variant="primary"
            icon={<Plus className="w-5 h-5" />}
            onClick={() => {
              setFormData({
                titulo: "",
                paciente_nome: "",
                tipo: "segunda_opiniao",
                especialidade_alvo: "",
                medico_solicitante: "Dr. Sistema",
                descricao_caso: "",
                questoes_especificas: [""],
                prioridade: "normal",
                visibilidade: "equipe",
                status: "aberto"
              });
              setShowPanel(true);
            }}
          >
            Nova Discussão
          </Button>
        }
      />

      {/* Stats - Skeleton States */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border animate-pulse overflow-hidden" style={{ borderColor: '#e8eaed' }}>
                <div className="w-10 h-10 rounded-xl bg-gray-200 mb-3" />
                <div className="h-3 bg-gray-200 rounded w-16 mb-2" />
                <div className="h-6 bg-gray-200 rounded w-10" />
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-sm border overflow-hidden" style={{ borderColor: '#e8eaed' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: '#f5f3ff' }}>
                <Clock className="w-5 h-5" style={{ color: '#7E57FF' }} />
              </div>
              <p className="mb-1" style={{ color: '#80868b', fontSize: '14px' }}>Abertos</p>
              <p className="text-2xl font-bold" style={{ color: '#202124' }}>{colaboracoes.filter(c => c.status === "aberto").length}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border overflow-hidden" style={{ borderColor: '#e8eaed' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: '#fef9e5' }}>
                <MessageCircle className="w-5 h-5" style={{ color: '#fbbc04' }} />
              </div>
              <p className="mb-1" style={{ color: '#80868b', fontSize: '14px' }}>Em Discussão</p>
              <p className="text-2xl font-bold" style={{ color: '#202124' }}>{colaboracoes.filter(c => c.status === "em_discussao").length}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border overflow-hidden" style={{ borderColor: '#e8eaed' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: '#e6f7ed' }}>
                <CheckCircle className="w-5 h-5" style={{ color: '#34a853' }} />
              </div>
              <p className="mb-1" style={{ color: '#80868b', fontSize: '14px' }}>Resolvidos</p>
              <p className="text-2xl font-bold" style={{ color: '#202124' }}>{colaboracoes.filter(c => c.status === "resolvido").length}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border overflow-hidden" style={{ borderColor: '#e8eaed' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: '#faf5ff' }}>
                <Users className="w-5 h-5" style={{ color: '#a855f7' }} />
              </div>
              <p className="mb-1" style={{ color: '#80868b', fontSize: '14px' }}>Total</p>
              <p className="text-2xl font-bold" style={{ color: '#202124' }}>{colaboracoes.length}</p>
            </div>
          </>
        )}
      </div>

      <FilterBar
        searchValue={busca}
        onSearchChange={setBusca}
        searchPlaceholder="Buscar discussões..."
        filters={[
          {
            value: filtroStatus,
            onValueChange: setFiltroStatus,
            placeholder: "Status",
            options: [
              { value: "todos", label: "Todos" },
              { value: "aberto", label: "Aberto" },
              { value: "em_discussao", label: "Em Discussão" },
              { value: "resolvido", label: "Resolvido" },
              { value: "fechado", label: "Fechado" }
            ]
          }
        ]}
      />

      <div className="space-y-3 md:space-y-4">
        {isLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border shadow-sm overflow-hidden animate-pulse" style={{ borderColor: '#e8eaed' }}>
                <div className="p-5 border-b" style={{ borderColor: '#e8eaed' }}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 space-y-3">
                      <div className="h-5 bg-gray-200 rounded w-3/4" />
                      <div className="h-4 bg-gray-200 rounded w-1/2" />
                      <div className="h-3 bg-gray-200 rounded w-1/3" />
                    </div>
                    <div className="h-6 w-20 bg-gray-200 rounded-full" />
                  </div>
                  <div className="h-16 bg-gray-200 rounded-xl mb-3" />
                  <div className="flex gap-2">
                    <div className="h-9 w-20 bg-gray-200 rounded-xl" />
                    <div className="h-9 w-24 bg-gray-200 rounded-xl" />
                    <div className="h-9 w-20 bg-gray-200 rounded-xl" />
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : colaboracoesFiltradas.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhuma discussão encontrada"
            description="Crie uma nova discussão médica para começar"
          />
        ) : (
          colaboracoesFiltradas.map((colab) => (
            <div key={colab.id} className="bg-white rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-all" style={{ borderColor: '#e8eaed' }}>
              <div className="p-5 border-b" style={{ borderColor: '#e8eaed' }}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className="font-bold truncate" style={{ color: '#202124', fontSize: '16px' }}>{colab.titulo}</h3>
                      <span className="px-3 py-1 rounded-lg font-semibold whitespace-nowrap" style={{
                        backgroundColor: colab.prioridade === "urgente" ? '#fde7e7' : colab.prioridade === "alta" ? '#fef9e5' : '#e8f1fb',
                        color: colab.prioridade === "urgente" ? '#842820' : colab.prioridade === "alta" ? '#956802' : '#0e4082',
                        fontSize: '14px'
                      }}>
                        {colab.prioridade}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2" style={{ fontSize: '14px', color: '#80868b' }}>
                      <span>{colab.tipo?.replace(/_/g, " ")}</span>
                      {colab.especialidade_alvo && <span>• {colab.especialidade_alvo}</span>}
                      {colab.paciente_nome && <span>• {colab.paciente_nome}</span>}
                    </div>
                    <p style={{ color: '#80868b', fontSize: '14px' }}>
                      Por {colab.medico_solicitante} • {format(new Date(colab.created_date), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-lg font-semibold whitespace-nowrap flex-shrink-0" style={{
                    backgroundColor: colab.status === "resolvido" ? '#e6f7ed' : colab.status === "em_discussao" ? '#fef9e5' : '#e8f1fb',
                    color: colab.status === "resolvido" ? '#1f6332' : colab.status === "em_discussao" ? '#956802' : '#0e4082',
                    fontSize: '14px'
                  }}>
                    {colab.status?.replace(/_/g, " ")}
                  </span>
                </div>

                <div className="rounded-xl p-4 mb-3 overflow-hidden" style={{ backgroundColor: '#f8f9fa', border: '1px solid #e8eaed' }}>
                  <p className="whitespace-pre-line" style={{ color: '#202124', fontSize: '14px', lineHeight: '1.6' }}>{colab.descricao_caso}</p>
                </div>

                {/* Questões */}
                {colab.questoes_especificas?.length > 0 && colab.questoes_especificas[0]?.trim() && (
                  <div className="mb-3">
                    <p className="font-semibold mb-2" style={{ color: '#5f6368', fontSize: '14px' }}>Questões:</p>
                    <ul className="space-y-2">
                      {colab.questoes_especificas.map((q, idx) => q.trim() && (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="font-bold flex-shrink-0" style={{ color: '#7E57FF', fontSize: '14px' }}>{idx + 1}.</span>
                          <span style={{ color: '#5f6368', fontSize: '14px' }}>{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => { setColaboracaoSelecionada(colab); setShowMensagensPanel(true); }}
                    className="px-4 py-2.5 rounded-xl border-2 font-semibold hover:bg-gray-50 transition-all flex items-center gap-2 min-h-[44px]"
                    style={{ borderColor: '#7E57FF', color: '#7E57FF', fontSize: '14px' }}
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span className="whitespace-nowrap">Chat</span>
                  </button>
                  <button
                    onClick={() => { setColaboracaoSelecionada(colab); setShowDiscussaoPanel(true); }}
                    className="px-4 py-2.5 rounded-xl border-2 font-semibold hover:bg-gray-50 transition-all flex items-center gap-2 min-h-[44px]"
                    style={{ borderColor: '#7E57FF', color: '#7E57FF', fontSize: '14px' }}
                  >
                    <Users className="w-4 h-4" />
                    <span className="whitespace-nowrap">Discussão ({colab.respostas?.length || 0})</span>
                  </button>
                  <button
                    onClick={() => { setColaboracaoSelecionada(colab); setShowAnexosPanel(true); }}
                    className="px-4 py-2.5 rounded-xl border-2 font-semibold hover:bg-gray-50 transition-all flex items-center gap-2 min-h-[44px]"
                    style={{ borderColor: '#7E57FF', color: '#7E57FF', fontSize: '14px' }}
                  >
                    <Paperclip className="w-4 h-4" />
                    <span className="whitespace-nowrap">Anexos ({colab.documentos_anexados?.length || 0})</span>
                  </button>
                  {!colab.sugestao_ia && (
                    <button
                      onClick={() => gerarSugestaoIA(colab)}
                      disabled={gerandoSugestaoIA === colab.id}
                      className="px-4 py-2.5 rounded-xl text-white font-semibold hover:opacity-90 transition-all flex items-center gap-2 min-h-[44px] disabled:opacity-50"
                      style={{ backgroundColor: '#a855f7', fontSize: '14px' }}
                    >
                      <Brain className="w-4 h-4" />
                      {gerandoSugestaoIA === colab.id ? (
                        <span className="whitespace-nowrap">Gerando...</span>
                      ) : (
                        <span className="whitespace-nowrap">IA</span>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Detalhes Expandidos */}
              {expandido[colab.id] && (
                <div className="p-5 space-y-4 overflow-hidden" style={{ backgroundColor: '#f8f9fa' }}>
                  {/* Sugestão IA */}
                  {colab.sugestao_ia && (
                    <div className="rounded-2xl p-5 border overflow-hidden" style={{ backgroundColor: '#faf5ff', borderColor: '#e9d5ff' }}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#a855f7' }}>
                          <Brain className="w-5 h-5 text-white" />
                        </div>
                        <h4 className="font-bold" style={{ color: '#6b21a8', fontSize: '16px' }}>Análise por IA</h4>
                      </div>
                      <p className="whitespace-pre-line mb-4" style={{ color: '#581c87', fontSize: '14px', lineHeight: '1.6' }}>{colab.sugestao_ia.analise}</p>
                      
                      {colab.sugestao_ia.referencias_cientificas?.length > 0 && (
                        <div>
                          <p className="font-semibold mb-2" style={{ color: '#7e22ce', fontSize: '14px' }}>Referências Científicas:</p>
                          <ul className="space-y-2">
                            {colab.sugestao_ia.referencias_cientificas.map((ref, idx) => (
                              <li key={idx} style={{ color: '#7e22ce', fontSize: '14px' }}>• {ref}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Respostas */}
                  {colab.respostas?.map((resp, idx) => (
                    <div key={idx} className="bg-white rounded-2xl p-5 border shadow-sm overflow-hidden" style={{ borderColor: '#e8eaed' }}>
                      <div className="flex items-start gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f5f3ff' }}>
                          <Users className="w-6 h-6" style={{ color: '#7E57FF' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold truncate" style={{ color: '#202124', fontSize: '16px' }}>{resp.medico}</p>
                          <p style={{ color: '#80868b', fontSize: '14px' }}>
                            {format(new Date(resp.data), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <p className="whitespace-pre-line mb-4" style={{ color: '#5f6368', fontSize: '14px', lineHeight: '1.6' }}>{resp.resposta}</p>
                      
                      {resp.recomendacoes?.length > 0 && resp.recomendacoes.some(r => r.trim()) && (
                        <div>
                          <p className="font-semibold mb-2" style={{ color: '#5f6368', fontSize: '14px' }}>Recomendações:</p>
                          <ul className="space-y-2">
                            {resp.recomendacoes.filter(r => r.trim()).map((rec, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#34a853' }} />
                                <span style={{ color: '#5f6368', fontSize: '14px' }}>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Adicionar Resposta */}
                  {colab.status !== "fechado" && (
                    <div className="bg-white rounded-2xl p-5 border-2 border-dashed overflow-hidden" style={{ borderColor: '#e8eaed' }}>
                      <textarea
                        value={respostaTemp.colaboracao_id === colab.id ? respostaTemp.resposta : ""}
                        onChange={(e) => setRespostaTemp({ 
                          ...respostaTemp, 
                          colaboracao_id: colab.id, 
                          resposta: e.target.value 
                        })}
                        placeholder="Adicione sua resposta ou opinião..."
                        className="w-full border-2 rounded-xl p-4 resize-none"
                        style={{ borderColor: '#e8eaed', fontSize: '14px', minHeight: '120px' }}
                        rows="4"
                      />
                      <button
                        onClick={() => adicionarResposta(colab)}
                        disabled={!respostaTemp.resposta || respostaTemp.colaboracao_id !== colab.id}
                        className="mt-3 w-full text-white font-bold py-3 px-4 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 transition-all hover:opacity-90 min-h-[48px]"
                        style={{ backgroundColor: '#7E57FF', fontSize: '14px' }}
                      >
                        <Send className="w-5 h-5" />
                        <span>Enviar Resposta</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* SlideInPanel - Nova Discussão */}
      <SlideInPanel
        open={showPanel}
        onClose={() => setShowPanel(false)}
        title="Nova Discussão"
        maxWidth="700px"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-semibold mb-2" style={{ color: '#5f6368', fontSize: '14px' }}>Título *</label>
            <Input
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              className="border-2 rounded-xl min-h-[48px]"
              style={{ borderColor: '#e8eaed', fontSize: '14px' }}
              placeholder="Ex: Segunda opinião - caso complexo de..."
              required
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-2" style={{ color: '#5f6368', fontSize: '14px' }}>Tipo *</label>
              <Select
                value={formData.tipo}
                onValueChange={(value) => setFormData({ ...formData, tipo: value })}
              >
                <SelectTrigger className="border-2 rounded-xl min-h-[48px]" style={{ borderColor: '#e8eaed', fontSize: '14px' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="segunda_opiniao">Segunda Opinião</SelectItem>
                  <SelectItem value="caso_complexo">Caso Complexo</SelectItem>
                  <SelectItem value="discussao_clinica">Discussão Clínica</SelectItem>
                  <SelectItem value="interconsulta">Interconsulta</SelectItem>
                  <SelectItem value="protocolo">Protocolo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block font-semibold mb-2" style={{ color: '#5f6368', fontSize: '14px' }}>Prioridade</label>
              <Select
                value={formData.prioridade}
                onValueChange={(value) => setFormData({ ...formData, prioridade: value })}
              >
                <SelectTrigger className="border-2 rounded-xl min-h-[48px]" style={{ borderColor: '#e8eaed', fontSize: '14px' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-2" style={{ color: '#5f6368', fontSize: '14px' }}>Paciente (opcional)</label>
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
                <SelectTrigger className="border-2 rounded-xl min-h-[48px]" style={{ borderColor: '#e8eaed', fontSize: '14px' }}>
                  <SelectValue placeholder="Selecione (opcional)" />
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
              <label className="block font-semibold mb-2" style={{ color: '#5f6368', fontSize: '14px' }}>Especialidade</label>
              <Input
                value={formData.especialidade_alvo}
                onChange={(e) => setFormData({ ...formData, especialidade_alvo: e.target.value })}
                className="border-2 rounded-xl min-h-[48px]"
                style={{ borderColor: '#e8eaed', fontSize: '14px' }}
                placeholder="Ex: Cardiologia"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-2" style={{ color: '#5f6368', fontSize: '14px' }}>Descrição do Caso *</label>
            <textarea
              value={formData.descricao_caso}
              onChange={(e) => setFormData({ ...formData, descricao_caso: e.target.value })}
              className="w-full border-2 rounded-xl p-4 resize-none"
              style={{ borderColor: '#e8eaed', fontSize: '14px', minHeight: '150px' }}
              rows="6"
              placeholder="Descreva o caso em detalhes..."
              required
            />
          </div>

          <div>
            <label className="block font-semibold mb-2" style={{ color: '#5f6368', fontSize: '14px' }}>Questões Específicas</label>
            <textarea
              value={formData.questoes_especificas[0]}
              onChange={(e) => setFormData({ ...formData, questoes_especificas: [e.target.value] })}
              className="w-full border-2 rounded-xl p-4 resize-none"
              style={{ borderColor: '#e8eaed', fontSize: '14px', minHeight: '100px' }}
              rows="3"
              placeholder="Quais são suas dúvidas específicas?"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowPanel(false)}
              className="flex-1 border-2 font-bold py-3 px-4 rounded-xl hover:bg-gray-50 transition-all min-h-[48px]"
              style={{ borderColor: '#e8eaed', color: '#5f6368', fontSize: '14px' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 text-white font-bold py-3 px-4 rounded-xl hover:opacity-90 transition-all disabled:opacity-50 min-h-[48px]"
              style={{ backgroundColor: '#7E57FF', fontSize: '14px' }}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Criando..." : "Criar Discussão"}
            </button>
          </div>
        </form>
      </SlideInPanel>

      {/* Panel - Chat de Mensagens */}
      <SlideInPanel
        open={showMensagensPanel}
        onClose={() => {
          setShowMensagensPanel(false);
          setColaboracaoSelecionada(null);
        }}
        title={`Chat: ${colaboracaoSelecionada?.titulo}`}
        maxWidth="700px"
      >
        {colaboracaoSelecionada && (
          <SistemaMensagens 
            colaboracaoId={colaboracaoSelecionada.id} 
            medicoAtual={medicoAtual}
          />
        )}
      </SlideInPanel>

      {/* Panel - Discussão */}
      <SlideInPanel
        open={showDiscussaoPanel}
        onClose={() => {
          setShowDiscussaoPanel(false);
          setColaboracaoSelecionada(null);
        }}
        title={`Discussão: ${colaboracaoSelecionada?.titulo}`}
        maxWidth="900px"
      >
        {colaboracaoSelecionada && (
          <DiscussaoCaso 
            colaboracao={colaboracaoSelecionada}
            onAtualizado={() => {
              queryClient.invalidateQueries(["colaboracoes"]);
            }}
          />
        )}
      </SlideInPanel>

      {/* Panel - Anexos */}
      <SlideInPanel
        open={showAnexosPanel}
        onClose={() => {
          setShowAnexosPanel(false);
          setColaboracaoSelecionada(null);
        }}
        title="Anexos e Referências"
        maxWidth="800px"
      >
        {colaboracaoSelecionada && (
          <AnexosReferencias 
            colaboracao={colaboracaoSelecionada}
            onAtualizado={() => {
              queryClient.invalidateQueries(["colaboracoes"]);
            }}
          />
        )}
      </SlideInPanel>
        </div>
      </PermissionGuard>
    </RouteGuard>
  );
}