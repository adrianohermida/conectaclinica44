import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Upload,
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  Brain,
  Eye,
  ChevronDown,
  ChevronUp,
  BarChart3
} from "lucide-react";
import ValidacaoMedica from "@/components/analise/ValidacaoMedica";
import CategorizacaoInteligente from "@/components/analise/CategorizacaoInteligente";
import HistoricoAnalises from "@/components/analise/HistoricoAnalises";
import ExtracaoDados from "@/components/analise/ExtracaoDados";
import SlideInPanel from "@/components/ui/SlideInPanel";
import FilterBar from "@/components/ui/FilterBar";
import { Button } from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/input";
import EmptyState from "@/components/ui/EmptyState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOptimizedQuery } from "@/components/hooks/useOptimizedQuery";
import usePerformanceTracker from "@/components/hooks/usePerformanceTracker";
import RouteGuard from "@/components/auth/RouteGuard";
import PermissionGuard from "@/components/auth/PermissionGuard";

export default function AnaliseDocumentosIA() {
  usePerformanceTracker('/AnaliseDocumentosIA');
  const [visaoAtual, setVisaoAtual] = useState("analises");
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroCategoria, setFiltroCategoria] = useState("todos");
  const [analisando, setAnalisando] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [expandido, setExpandido] = useState({});
  const [showValidacaoPanel, setShowValidacaoPanel] = useState(false);
  const [showExtracaoPanel, setShowExtracaoPanel] = useState(false);
  const [analiseSelecionada, setAnaliseSelecionada] = useState(null);
  const queryClient = useQueryClient();

  const { data: user } = useOptimizedQuery({
    queryKey: ["user"],
    queryFn: () => base44.auth.me()
  });

  const clinicaId = user?.clinica_id;

  const { data: analises = [], isLoading } = useOptimizedQuery({
    queryKey: ["analises-ia", clinicaId],
    queryFn: () => clinicaId ? base44.entities.DocumentoAnaliseIA.filter({ clinica_id: clinicaId }, "-data_analise") : [],
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

  const validarMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DocumentoAnaliseIA.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["analises-ia"]);
    }
  });

  const [formUpload, setFormUpload] = useState({
    paciente_nome: "",
    tipo_documento: "exame_sangue"
  });

  const analisarDocumento = async () => {
    if (!uploadFile || !formUpload.paciente_nome) {
      alert("Selecione um paciente e faça upload do arquivo");
      return;
    }

    setAnalisando(true);
    try {
      // Upload do arquivo
      const { file_url } = await base44.integrations.Core.UploadFile({
        file: uploadFile
      });

      // Análise com IA
      const prompt = `Analise o seguinte documento médico (${formUpload.tipo_documento}) e forneça:

1. Resumo executivo
2. Achados principais (lista)
3. Valores críticos ou fora do normal
4. Sugestões de acompanhamento
5. Nível de urgência (baixo/medio/alto/critico)

Paciente: ${formUpload.paciente_nome}
Tipo: ${formUpload.tipo_documento}

Forneça resposta estruturada em JSON.`;

      const analise = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            resumo: { type: "string" },
            achados_principais: { type: "array", items: { type: "string" } },
            valores_criticos: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  exame: { type: "string" },
                  valor: { type: "string" },
                  referencia: { type: "string" },
                  status: { type: "string" }
                }
              }
            },
            sugestoes: { type: "array", items: { type: "string" } },
            nivel_urgencia: { type: "string" },
            confidence_score: { type: "number" }
          }
        }
      });

      // Salvar análise
      const user = await base44.auth.me();
      const paciente = pacientes.find(p => p.nome_completo === formUpload.paciente_nome);
      await base44.entities.DocumentoAnaliseIA.create({
        clinica_id: user.clinica_id,
        paciente_id: paciente?.id || "",
        paciente_nome: formUpload.paciente_nome,
        tipo_documento: formUpload.tipo_documento,
        arquivo_url: file_url,
        data_analise: new Date().toISOString(),
        analise_ia: analise,
        status_validacao: "pendente"
      });

      queryClient.invalidateQueries(["analises-ia"]);
      setUploadFile(null);
      setFormUpload({ paciente_nome: "", tipo_documento: "exame_sangue" });
      alert("Documento analisado com sucesso!");
    } catch (error) {
      console.error("Erro na análise:", error);
      alert("Erro ao analisar documento");
    } finally {
      setAnalisando(false);
    }
  };

  const validarAnalise = async (analise, status, observacoes = "") => {
    await validarMutation.mutateAsync({
      id: analise.id,
      data: {
        ...analise,
        status_validacao: status,
        observacoes_medico: observacoes,
        validado_por: "Dr. Sistema" // TODO: pegar médico logado
      }
    });
  };

  const toggleExpand = (id) => {
    setExpandido(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const analisesFiltradas = analises
    .filter(a => filtroStatus === "todos" ? true : a.status_validacao === filtroStatus)
    .filter(a => filtroCategoria === "todos" ? true : a.tipo_documento === filtroCategoria)
    .filter(a => a.paciente_nome?.toLowerCase().includes(busca.toLowerCase()));

  const validar = (analise) => {
    setAnaliseSelecionada(analise);
    setShowValidacaoPanel(true);
  };

  const extrair = (analise) => {
    setAnaliseSelecionada(analise);
    setShowExtracaoPanel(true);
  };

  const getNivelUrgenciaColor = (nivel) => {
    switch (nivel) {
      case "critico": return "bg-red-100 text-red-800 border-red-300";
      case "alto": return "bg-orange-100 text-orange-800 border-orange-300";
      case "medio": return "bg-yellow-100 text-yellow-800 border-yellow-300";
      default: return "bg-green-100 text-green-800 border-green-300";
    }
  };

  return (
    <RouteGuard requireAuth requireClinica>
      <PermissionGuard modulo="analise_ia">
        <div className="space-y-4 md:space-y-6 overflow-x-hidden">
      <PageHeader
        title="Análise de Documentos IA"
        description="Análise inteligente de exames e laudos"
        breadcrumbs={[{ label: "Análise IA" }]}
      />

      <div className="pc-card p-3 md:p-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setVisaoAtual("analises")}
            className={`inline-flex items-center justify-center gap-2 font-medium px-3 py-2.5 rounded-lg min-h-[44px] transition-all text-sm ${
              visaoAtual === "analises" ? "text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            style={visaoAtual === "analises" ? { backgroundColor: '#7E57FF' } : {}}
          >
            <FileText className="w-4 h-4 flex-shrink-0" />
            <span>Análises</span>
          </button>
          <button
            onClick={() => setVisaoAtual("historico")}
            className={`inline-flex items-center justify-center gap-2 font-medium px-3 py-2.5 rounded-lg min-h-[44px] transition-all text-sm ${
              visaoAtual === "historico" ? "text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            style={visaoAtual === "historico" ? { backgroundColor: '#7E57FF' } : {}}
          >
            <BarChart3 className="w-4 h-4 flex-shrink-0" />
            <span>Histórico</span>
          </button>
        </div>
      </div>

      {/* Histórico e Métricas */}
      {visaoAtual === "historico" && <HistoricoAnalises analises={analises} />}

      {visaoAtual === "analises" && (
        <>

      <div className="pc-card p-4 md:p-6">
        <div>
          <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
            <Brain className="w-5 h-5 md:w-6 md:h-6" style={{ color: '#7E57FF' }} />
            <h2 className="text-base md:text-lg font-semibold" style={{ color: '#202124' }}>Nova Análise</h2>
          </div>

          <div className="space-y-4">
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Paciente *</label>
            <Select
              value={formUpload.paciente_nome}
              onValueChange={(value) => setFormUpload({ ...formUpload, paciente_nome: value })}
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
            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Tipo de Documento</label>
            <Select
              value={formUpload.tipo_documento}
              onValueChange={(value) => setFormUpload({ ...formUpload, tipo_documento: value })}
            >
              <SelectTrigger className="border border-gray-300 rounded-lg min-h-[44px]" style={{ fontSize: '14px' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="exame_sangue">Exame de Sangue</SelectItem>
                <SelectItem value="raio_x">Raio-X</SelectItem>
                <SelectItem value="tomografia">Tomografia</SelectItem>
                <SelectItem value="ressonancia">Ressonância</SelectItem>
                <SelectItem value="ultrassom">Ultrassom</SelectItem>
                <SelectItem value="eletro">Eletrocardiograma</SelectItem>
                <SelectItem value="laudo">Laudo Médico</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-xs md:text-sm font-medium text-[var(--pc-text-secondary)] mb-2">Arquivo *</label>
            <div className="border-2 border-dashed rounded-xl p-4 md:p-6 text-center transition-all min-h-[140px] flex flex-col items-center justify-center" style={{ borderColor: uploadFile ? '#7E57FF' : '#e8eaed' }}>
              <input
                type="file"
                onChange={(e) => setUploadFile(e.target.files[0])}
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer w-full">
                <Upload className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-2" style={{ color: uploadFile ? '#7E57FF' : '#bdc1c6' }} />
                <p className="text-xs md:text-sm text-gray-700 break-all px-2">
                  {uploadFile ? uploadFile.name : "Clique ou arraste"}
                </p>
                <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG</p>
              </label>
            </div>
          </div>

            <button
              onClick={analisarDocumento}
              disabled={analisando || !uploadFile || !formUpload.paciente_nome}
              className="w-full text-white font-medium px-4 py-2.5 rounded-lg min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
              style={{ backgroundColor: '#7E57FF' }}
            >
              {analisando ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Analisando Documento...</span>
                </>
              ) : (
                <>
                  <Brain className="w-5 h-5 flex-shrink-0" />
                  <span>Analisar Documento</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <CategorizacaoInteligente documentos={analises} onFiltrar={setFiltroCategoria} />

      <FilterBar
        searchValue={busca}
        onSearchChange={setBusca}
        searchPlaceholder="Buscar por paciente..."
        filters={[
          {
            value: filtroStatus,
            onValueChange: setFiltroStatus,
            placeholder: "Status",
            options: [
              { value: "todos", label: "Todos" },
              { value: "pendente", label: "Pendente" },
              { value: "aprovado", label: "Aprovado" },
              { value: "aprovado_com_ressalvas", label: "Ressalvas" },
              { value: "rejeitado", label: "Rejeitado" }
            ]
          }
        ]}
      />

      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="pc-card p-4 md:p-5 animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gray-200 flex-shrink-0" />
                  <div className="flex-1 space-y-3 min-w-0">
                    <div className="h-5 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-12 bg-gray-200 rounded w-full" />
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-10 bg-gray-200 rounded" />
                      <div className="h-10 bg-gray-200 rounded" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : analisesFiltradas.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nenhuma análise encontrada"
            description="Faça upload de um documento para análise com IA"
            iconColor="#bdc1c6"
          />
        ) : (
          analisesFiltradas.map((analise) => (
            <div key={analise.id} className="pc-card overflow-hidden">
              {/* Header - Mobile First */}
              <div className="p-3 sm:p-4 md:p-5 border-b border-gray-200">
                <div className="flex items-start justify-between gap-2 sm:gap-3 mb-2 md:mb-3 flex-wrap sm:flex-nowrap">
                <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f5f3ff' }}>
                    <Brain className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: '#7E57FF' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-gray-800 truncate">{analise.paciente_nome}</h3>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1 truncate">
                      {analise.tipo_documento?.replace(/_/g, " ")} • 
                      {new Date(analise.data_analise).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-lg text-xs font-medium flex-shrink-0 ${
                  analise.status_validacao === "validado" ? "bg-green-50 text-green-700 border border-green-200" :
                  analise.status_validacao === "rejeitado" ? "bg-red-50 text-red-700 border border-red-200" : 
                  "bg-yellow-50 text-yellow-700 border border-yellow-200"
                }`}>
                  {analise.status_validacao}
                </span>
                </div>

                {/* Resumo - Mobile Optimized */}
                {analise.analise_ia?.resumo && (
                  <div className="bg-gray-100 rounded-xl p-2.5 md:p-3 mb-2 md:mb-3 overflow-hidden">
                    <p className="text-xs md:text-sm text-gray-800 break-words">{analise.analise_ia.resumo}</p>
                  </div>
                )}

                {/* Nível de Urgência - Mobile First */}
                {analise.analise_ia?.nivel_urgencia && (
                  <div className="flex flex-col xs:flex-row xs:items-center gap-2 mb-2 md:mb-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" style={{ color: '#fbbc04' }} />
                      <span className="text-xs md:text-sm font-medium text-gray-800">
                        <span className="capitalize">{analise.analise_ia.nivel_urgencia}</span>
                      </span>
                    </div>
                    {analise.analise_ia.confidence_score && (
                      <span className="text-xs text-gray-600 xs:ml-auto whitespace-nowrap">
                        {Math.round(analise.analise_ia.confidence_score * 100)}%
                      </span>
                    )}
                  </div>
                )}

                {/* Toggle Detalhes */}
                <button
                  onClick={() => toggleExpand(analise.id)}
                  className="w-full flex items-center justify-between py-2 text-xs md:text-sm font-medium transition-all min-h-[44px]"
                  style={{ color: '#7E57FF' }}
                >
                  <span>Ver detalhes</span>
                  {expandido[analise.id] ? <ChevronUp className="w-4 h-4 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 flex-shrink-0" />}
                </button>
              </div>

              {/* Detalhes Expandidos - Mobile Optimized */}
              {expandido[analise.id] && (
                <div className="p-3 md:p-5 space-y-3 md:space-y-4 bg-gray-50 overflow-hidden">
                  {/* Achados Principais */}
                  {analise.analise_ia?.achados_principais?.length > 0 && (
                    <div>
                      <h4 className="font-bold text-gray-800 mb-2 text-xs md:text-sm">Achados:</h4>
                      <ul className="space-y-1.5">
                        {analise.analise_ia.achados_principais.map((achado, idx) => (
                          <li key={idx} className="text-xs md:text-sm text-gray-700 flex items-start gap-2">
                            <span className="mt-0.5 flex-shrink-0" style={{ color: '#7E57FF' }}>•</span>
                            <span className="flex-1 break-words">{achado}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Valores Críticos */}
                  {analise.analise_ia?.valores_criticos?.length > 0 && (
                    <div>
                      <h4 className="font-bold text-gray-800 mb-2 text-xs md:text-sm">Valores Críticos:</h4>
                      <div className="space-y-2">
                        {analise.analise_ia.valores_criticos.map((valor, idx) => (
                          <div key={idx} className="bg-white rounded-lg p-3 border border-gray-200 overflow-hidden">
                            <div className="flex flex-col xs:flex-row justify-between items-start gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-gray-800 text-sm truncate">{valor.exame}</p>
                                <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">Valor: {valor.valor}</p>
                                <p className="text-xs text-gray-500 break-words">Referência: {valor.referencia}</p>
                              </div>
                              <span className={`px-2 py-1 rounded-lg text-xs font-medium flex-shrink-0 whitespace-nowrap ${
                                valor.status === "critico" ? "bg-red-50 text-red-700 border border-red-200" :
                                valor.status === "alterado" ? "bg-yellow-50 text-yellow-700 border border-yellow-200" :
                                "bg-green-50 text-green-700 border border-green-200"
                              }`}>
                                {valor.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sugestões */}
                  {analise.analise_ia?.sugestoes?.length > 0 && (
                    <div>
                      <h4 className="font-bold text-gray-800 mb-2 text-xs md:text-sm">Sugestões de Acompanhamento:</h4>
                      <ul className="space-y-1.5">
                        {analise.analise_ia.sugestoes.map((sugestao, idx) => (
                          <li key={idx} className="text-xs sm:text-sm text-gray-700 flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span className="break-words">{sugestao}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Ações - Mobile Grid */}
                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 pt-3 md:pt-4">
                    {analise.status_validacao === "pendente" && (
                      <button
                        onClick={() => validar(analise)}
                        className="bg-green-50 hover:bg-green-100 text-green-700 font-medium px-3 py-2 rounded-lg text-xs sm:text-sm flex items-center justify-center gap-2 min-h-[44px] transition-all border border-green-200"
                      >
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        <span>Validar</span>
                      </button>
                    )}
                    <button
                      onClick={() => extrair(analise)}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium px-3 py-2 rounded-lg text-xs sm:text-sm flex items-center justify-center gap-2 min-h-[44px] transition-all"
                    >
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <span className="hidden xs:inline">Extrair</span><span className="xs:hidden">Ext.</span>
                    </button>
                    <a
                      href={analise.arquivo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium px-3 py-2 rounded-lg text-xs sm:text-sm flex items-center justify-center gap-2 min-h-[44px] transition-all col-span-2 sm:col-span-1"
                    >
                      <Eye className="w-4 h-4 flex-shrink-0" />
                      <span>Ver Arquivo</span>
                    </a>
                  </div>

                  {/* Observações do Médico */}
                  {analise.observacoes_medico && (
                    <div className="rounded-lg p-3 border overflow-hidden" style={{ backgroundColor: '#f5f3ff', borderColor: '#e9ddff' }}>
                      <p className="text-xs font-medium mb-1" style={{ color: '#7E57FF' }}>Observações do Médico:</p>
                      <p className="text-sm break-words" style={{ color: '#5f4ab8' }}>{analise.observacoes_medico}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
      </>
      )}

      {/* Panel - Validação */}
      <SlideInPanel
        open={showValidacaoPanel}
        onClose={() => {
          setShowValidacaoPanel(false);
          setAnaliseSelecionada(null);
        }}
        title="Validação Médica"
        maxWidth="700px"
      >
        {analiseSelecionada && (
          <ValidacaoMedica
            analise={analiseSelecionada}
            onValidado={() => {
              queryClient.invalidateQueries(["analises-ia"]);
              setShowValidacaoPanel(false);
              setAnaliseSelecionada(null);
            }}
          />
        )}
      </SlideInPanel>

      {/* Panel - Extração */}
      <SlideInPanel
        open={showExtracaoPanel}
        onClose={() => {
          setShowExtracaoPanel(false);
          setAnaliseSelecionada(null);
        }}
        title="Extração de Dados"
        maxWidth="800px"
      >
        {analiseSelecionada && <ExtracaoDados analise={analiseSelecionada} />}
      </SlideInPanel>
        </div>
      </PermissionGuard>
    </RouteGuard>
  );
}