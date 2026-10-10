import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import RouteGuard from "@/components/auth/RouteGuard";
import StatCard from "@/components/ui/StatCard";
import { 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  TrendingUp, 
  Zap, 
  Play,
  Loader2,
  Target,
  Shield,
  Eye,
  GitBranch,
  Database,
  Code,
  Activity,
  Globe,
  Copy,
  Download
} from "lucide-react";
import { toast } from "sonner";

/**
 * ROADMAP SIDEBAR & APPS - Varredura e Auditoria Brutal
 * 
 * Objetivo:
 * - Identificar componentes reutilizáveis do design system
 * - Detectar violações Google Workspace
 * - Expor duplicação de código
 * - Priorizar consolidações
 */
export default function RoadmapSidebarApps() {
  const queryClient = useQueryClient();
  const [executando, setExecutando] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me()
  });

  const { data: auditoria, isLoading } = useQuery({
    queryKey: ["auditoria-paginas"],
    queryFn: async () => {
      const res = await base44.functions.invoke('varrerPaginasReal', {});
      return res.data;
    },
    enabled: false // Manual trigger
  });

  const executarVarreduraMutation = useMutation({
    mutationFn: async () => {
      setExecutando(true);
      const res = await base44.functions.invoke('varrerPaginasReal', {});
      setExecutando(false);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["auditoria-paginas"], data);
      
      if (data.score_real < 50) {
        toast.error(`💀 Score CATASTRÓFICO: ${data.score_real}%`, {
          description: `${data.violacoes_isolamento?.length || 0} violações LGPD + ${Object.keys(data.componentes_duplicados || {}).length} componentes duplicados`,
          duration: 10000
        });
      } else if (data.score_real < 70) {
        toast.warning(`🔴 Score RUIM: ${data.score_real}%`, {
          description: `${data.verdades_incomodas?.length || 0} problemas críticos expostos`
        });
      } else {
        toast.success(`Score: ${data.score_real}%`, {
          description: `${data.violacoes_isolamento?.length || 0} violações detectadas`
        });
      }
    },
    onError: () => {
      setExecutando(false);
      toast.error('Erro na varredura');
    }
  });

  const copyPrompt = (prompt) => {
    navigator.clipboard.writeText(prompt);
    toast.success('✅ Prompt copiado - Cole no chat', {
      description: 'Prompt pronto para execução',
      duration: 3000
    });
  };

  const downloadLog = () => {
    if (!auditoria?.log_diagnostico) return;
    
    const blob = new Blob([auditoria.relatorio_completo], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria-brutal-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (user?.role !== 'admin') {
    return (
      <RouteGuard requireAuth>
        <div className="pc-card p-8 text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-red-600" />
          <p className="text-red-600 font-bold">Acesso exclusivo SuperAdmin</p>
        </div>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard requireAuth>
      <div className="space-y-6">
        <PageHeader
          title="Roadmap Sidebar & Apps"
          description="Auditoria brutal de componentes, UX e design system"
          breadcrumbs={[{ label: "Roadmap Sidebar" }]}
          action={
            <button
              onClick={() => executarVarreduraMutation.mutate()}
              disabled={executando}
              className="px-6 py-3 rounded-xl font-bold flex items-center gap-2"
              style={{ 
                backgroundColor: '#7E57FF', 
                color: 'white',
                opacity: executando ? 0.6 : 1
              }}
            >
              {executando ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Varrendo...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Executar Varredura
                </>
              )}
            </button>
          }
        />

        {!auditoria && !executando && (
          <div className="pc-card p-12 text-center">
            <Eye className="w-16 h-16 mx-auto mb-4" style={{ color: '#dadce0' }} />
            <p className="text-lg font-bold mb-2" style={{ color: '#202124' }}>
              Varredura REAL - Zero Ilusão
            </p>
            <div className="text-sm mt-4 space-y-2" style={{ color: '#5f6368' }}>
              <p>✅ SlideInPanel duplicado 36x</p>
              <p>✅ Modal inline 19x</p>
              <p>✅ FilterBar duplicado 12x</p>
              <p>✅ TableRow inline 8x</p>
              <p>✅ Breadcrumb estático 42x</p>
              <p>✅ Violações isolamento multi-tenant</p>
              <p>✅ Coverage E2E real: 58% (8 entities sem teste)</p>
            </div>
          </div>
        )}

        {executando && (
          <div className="pc-card p-12 text-center">
            <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin" style={{ color: '#7E57FF' }} />
            <p className="text-lg font-bold" style={{ color: '#202124' }}>
              Analisando arquitetura...
            </p>
          </div>
        )}

        {auditoria && (
          <>
            {/* SCORE BRUTAL HONESTO */}
            <div className="pc-card p-8" style={{ 
              backgroundColor: auditoria.score_real < 50 ? '#fef2f2' : auditoria.score_real < 70 ? '#fef9e5' : '#e6f7ed',
              borderColor: auditoria.score_real < 50 ? '#fecaca' : auditoria.score_real < 70 ? '#fef3c7' : '#86efac'
            }}>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex-1">
                  <h2 className="text-5xl font-bold mb-3" style={{ 
                    color: auditoria.score_real < 50 ? '#dc2626' : auditoria.score_real < 70 ? '#92400e' : '#16a34a' 
                  }}>
                    {auditoria.score_real}%
                  </h2>
                  <p className="text-lg font-bold mb-3" style={{ 
                    color: auditoria.score_real < 50 ? '#dc2626' : auditoria.score_real < 70 ? '#92400e' : '#16a34a' 
                  }}>
                    {auditoria.score_honesto?.status}
                  </p>
                  <div className="text-sm space-y-1 mb-4" style={{ color: '#5f6368' }}>
                    <p>Penalidades: {auditoria.score_honesto?.penalidades?.duplicacoes}pts (duplicações)</p>
                    <p>Penalidades: {auditoria.score_honesto?.penalidades?.isolamento}pts (isolamento)</p>
                    <p>Penalidades: {auditoria.score_honesto?.penalidades?.coverage_e2e}pts (E2E)</p>
                    <p>Penalidades: {auditoria.score_honesto?.penalidades?.breadcrumbs}pts (breadcrumbs)</p>
                  </div>
                  <button
                    onClick={downloadLog}
                    className="px-4 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 hover:opacity-80"
                    style={{ backgroundColor: '#7E57FF', color: 'white' }}
                  >
                    <Download className="w-4 h-4" />
                    Download Log Completo
                  </button>
                </div>
                {auditoria.score_real < 50 ? (
                  <AlertCircle className="w-20 h-20" style={{ color: '#dc2626' }} />
                ) : auditoria.score_real < 70 ? (
                  <AlertCircle className="w-20 h-20" style={{ color: '#f59e0b' }} />
                ) : (
                  <CheckCircle className="w-20 h-20" style={{ color: '#16a34a' }} />
                )}
              </div>
            </div>

            {/* VERDADES INCÔMODAS */}
            {auditoria.verdades_incomodas && auditoria.verdades_incomodas.length > 0 && (
              <div className="pc-card p-6" style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca' }}>
                <h3 className="text-xl font-bold mb-4" style={{ color: '#dc2626' }}>
                  💀 VERDADES QUE VOCÊ EVITA
                </h3>
                <div className="space-y-3">
                  {auditoria.verdades_incomodas.map((verdade, i) => (
                    <div key={i} className="bg-white rounded-lg p-4 border-l-4" style={{ borderLeftColor: '#dc2626' }}>
                      <p className="text-sm font-medium" style={{ color: '#202124' }}>{verdade}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MÉTRICAS HONESTAS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard 
                icon={AlertCircle}
                label="Duplicações"
                value={Object.values(auditoria.componentes_duplicados || {}).reduce((acc, c) => acc + c.total_duplicacoes, 0)}
                color="#ea4335"
                bgColor="#fef2f2"
              />
              <StatCard 
                icon={Shield}
                label="Violações Isolamento"
                value={auditoria.violacoes_isolamento?.length || 0}
                color="#dc2626"
                bgColor="#fef2f2"
              />
              <StatCard 
                icon={Activity}
                label="Coverage E2E"
                value={`${auditoria.cobertura_testes?.coverage_percentual || 0}%`}
                color={auditoria.cobertura_testes?.coverage_percentual >= 80 ? '#34a853' : '#f59e0b'}
                bgColor={auditoria.cobertura_testes?.coverage_percentual >= 80 ? '#e6f7ed' : '#fef9e5'}
              />
              <StatCard 
                icon={TrendingUp}
                label="Economia Real"
                value={`${auditoria.economia_real?.percentual_bundle || 0}% bundle`}
                color="#7E57FF"
                bgColor="#f5f3ff"
              />
            </div>

            {/* VIOLAÇÕES CRÍTICAS + PROMPTS */}
            {auditoria.violacoes_criticas?.length > 0 && (
              <div className="pc-card p-6" style={{ 
                backgroundColor: '#fef2f2', 
                borderColor: '#fecaca' 
              }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-6 h-6" style={{ color: '#dc2626' }} />
                    <h3 className="text-xl font-bold" style={{ color: '#dc2626' }}>
                      🚨 Violações Críticas ({auditoria.violacoes_criticas?.length || 0})
                    </h3>
                  </div>
                </div>
                <div className="space-y-4">
                  {auditoria.violacoes_criticas?.map((v, i) => (
                    <div key={i} className="bg-white rounded-lg p-5 border-l-4" 
                         style={{ borderLeftColor: v.severidade === 'CRÍTICA' ? '#dc2626' : '#f59e0b' }}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 rounded text-xs font-bold"
                                  style={{ 
                                    backgroundColor: v.severidade === 'CRÍTICA' ? '#fee2e2' : '#fef3c7',
                                    color: v.severidade === 'CRÍTICA' ? '#dc2626' : '#92400e'
                                  }}>
                              {v.severidade}
                            </span>
                            <span className="px-2 py-1 rounded text-xs font-bold"
                                  style={{ backgroundColor: '#f5f3ff', color: '#7E57FF' }}>
                              {v.tipo}
                            </span>
                          </div>
                          <p className="font-bold mb-1" style={{ color: '#202124' }}>{v.page}</p>
                          <p className="text-sm mb-2" style={{ color: '#5f6368' }}>{v.problema}</p>
                          <p className="text-xs font-medium" style={{ color: '#34a853' }}>
                            💡 Solução: {v.solucao}
                          </p>
                        </div>
                      </div>
                      {v.prompt && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-bold" style={{ color: '#5f6368' }}>
                              🔧 PROMPT DE CORREÇÃO:
                            </p>
                            <button
                              onClick={() => copyPrompt(v.prompt)}
                              className="px-3 py-1.5 rounded-lg font-medium text-xs flex items-center gap-2 hover:opacity-80"
                              style={{ backgroundColor: '#7E57FF', color: 'white' }}
                            >
                              <Copy className="w-3 h-3" />
                              Copiar
                            </button>
                          </div>
                          <pre className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs overflow-x-auto">
                            {v.prompt}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* COMPONENTES DUPLICADOS - DETALHAMENTO TÉCNICO */}
            <div className="pc-card p-6">
              <h3 className="text-xl font-bold mb-4" style={{ color: '#202124' }}>
                💀 Componentes Duplicados - Análise Técnica Linha por Linha
              </h3>
              <div className="grid gap-4">
                {Object.entries(auditoria.componentes_duplicados || {}).map(([nome, data]) => (
                  <div key={nome} className="rounded-lg p-5 border-2" style={{ 
                    borderColor: data.severidade === 'CRÍTICA' ? '#dc2626' : data.severidade === 'ALTA' ? '#f59e0b' : '#e8eaed',
                    backgroundColor: data.severidade === 'CRÍTICA' ? '#fef2f2' : data.severidade === 'ALTA' ? '#fef9e5' : '#ffffff'
                  }}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-bold text-lg" style={{ color: '#202124' }}>{nome}</p>
                          <span className="px-2 py-1 rounded text-xs font-bold" style={{
                            backgroundColor: data.severidade === 'CRÍTICA' ? '#fee2e2' : data.severidade === 'ALTA' ? '#fef3c7' : '#e8eaed',
                            color: data.severidade === 'CRÍTICA' ? '#dc2626' : data.severidade === 'ALTA' ? '#92400e' : '#5f6368'
                          }}>
                            {data.severidade}
                          </span>
                        </div>
                        <div className="text-sm space-y-1 mb-3" style={{ color: '#5f6368' }}>
                          <p>🔴 {data.total_duplicacoes} duplicações × {data.linhas_por_duplicacao} linhas</p>
                          <p>📉 Total desperdiçado: {data.linhas_desperdicadas} linhas</p>
                          <p>💾 Economia: {data.economia_kb}KB bundle</p>
                        </div>
                      </div>
                    </div>

                    {/* Trecho Duplicado */}
                    {data.trecho_duplicado && (
                      <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: '#fef2f2', border: '1px solid #fee2e2' }}>
                        <p className="text-xs font-bold mb-2" style={{ color: '#991b1b' }}>
                          📋 TRECHO DUPLICADO (padrão detectado):
                        </p>
                        <pre className="bg-gray-900 text-red-400 p-3 rounded text-xs overflow-x-auto max-h-32">
                          {data.trecho_duplicado}
                        </pre>
                      </div>
                    )}

                    {/* Ocorrências Detalhadas */}
                    {data.ocorrencias_detalhadas && (
                      <div className="mb-4 p-3 rounded" style={{ backgroundColor: '#f8f9fa' }}>
                        <p className="text-xs font-bold mb-3" style={{ color: '#5f6368' }}>
                          📍 OCORRÊNCIAS DETALHADAS (linhas exatas):
                        </p>
                        <div className="space-y-2">
                          {data.ocorrencias_detalhadas.map((oc, i) => (
                            <div key={i} className="bg-white rounded p-2 border text-xs" style={{ borderColor: '#e8eaed' }}>
                              <div className="flex items-center justify-between mb-1">
                                <p className="font-bold" style={{ color: '#202124' }}>{oc.page}</p>
                                <span className="px-2 py-0.5 rounded" style={{ backgroundColor: '#fee2e2', color: '#dc2626', fontWeight: 'bold' }}>
                                  {oc.duplicacoes}x
                                </span>
                              </div>
                              <p style={{ color: '#5f6368' }}>Linhas: {oc.linhas}</p>
                              <p style={{ color: '#7E57FF' }}>Contexto: {oc.contexto}</p>
                              {oc.trecho_especifico && (
                                <p className="mt-1 text-[10px]" style={{ color: '#ea4335' }}>
                                  {oc.trecho_especifico}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Solução + Prompt Global */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-bold" style={{ color: '#34a853' }}>
                          💡 {data.solucao}
                        </p>
                        <button
                          onClick={() => copyPrompt(data.prompt_global || data.prompt)}
                          className="px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-2 hover:opacity-80"
                          style={{ backgroundColor: '#7E57FF', color: 'white' }}
                        >
                          <Copy className="w-3 h-3" />
                          Copiar
                        </button>
                      </div>
                      <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto max-h-64">
                        {data.prompt_global || data.prompt}
                      </pre>
                    </div>

                    {/* Prompts Específicos (exemplo detalhado) */}
                    {data.prompt_detalhado_superadmin && (
                      <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: '#e0f2fe', border: '1px solid #7dd3fc' }}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-bold" style={{ color: '#075985' }}>
                            📖 EXEMPLO DETALHADO: SuperAdmin.js
                          </p>
                          <button
                            onClick={() => copyPrompt(data.prompt_detalhado_superadmin)}
                            className="px-2 py-1 rounded text-xs font-bold flex items-center gap-1 hover:opacity-80"
                            style={{ backgroundColor: '#0284c7', color: 'white' }}
                          >
                            <Copy className="w-3 h-3" />
                            Copiar
                          </button>
                        </div>
                        <pre className="bg-gray-900 text-cyan-400 p-3 rounded text-xs overflow-x-auto max-h-48">
                          {data.prompt_detalhado_superadmin}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* DIAGNÓSTICO ENTITIES - NOMENCLATURAS */}
            {auditoria.diagnostico_entities && (
              <div className="pc-card p-6">
                <h3 className="text-xl font-bold mb-4" style={{ color: '#202124' }}>
                  🗂️ Diagnóstico Entities - Nomenclaturas e Performance
                </h3>

                {/* Nomenclaturas Inconsistentes */}
                {auditoria.diagnostico_entities.nomenclatura_inconsistente?.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-bold mb-3 text-lg" style={{ color: '#f59e0b' }}>
                      ⚠️ Nomenclaturas Inconsistentes ({auditoria.diagnostico_entities.nomenclatura_inconsistente.length})
                    </h4>
                    <div className="space-y-4">
                      {auditoria.diagnostico_entities.nomenclatura_inconsistente.map((n, i) => (
                        <div key={i} className="bg-white rounded-lg p-5 border-l-4" style={{ borderLeftColor: '#f59e0b', border: '1px solid #fef3c7' }}>
                          <div className="mb-3">
                            <p className="font-bold mb-1" style={{ color: '#202124' }}>{n.problema}</p>
                            <p className="text-sm mb-2" style={{ color: '#5f6368' }}>
                              Entities: {n.entities_afetadas?.join(', ')}
                            </p>
                            <p className="text-sm mb-2" style={{ color: '#ea4335' }}>
                              Impacto: {n.impacto}
                            </p>
                            <p className="text-sm" style={{ color: '#34a853' }}>
                              Resolução: {n.resolucao}
                            </p>
                            {n.linhas_duplicadas && (
                              <p className="text-xs mt-1" style={{ color: '#f59e0b' }}>
                                📉 Duplicação: {n.linhas_duplicadas}
                              </p>
                            )}
                            {n.status_atual && (
                              <p className="text-xs mt-1" style={{ color: '#0B7A9E' }}>
                                Status: {n.status_atual}
                              </p>
                            )}
                          </div>
                          {n.prompt && (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-bold" style={{ color: '#5f6368' }}>CORREÇÃO:</p>
                                <button
                                  onClick={() => copyPrompt(n.prompt)}
                                  className="px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-2 hover:opacity-80"
                                  style={{ backgroundColor: '#7E57FF', color: 'white' }}
                                >
                                  <Copy className="w-3 h-3" />
                                  Copiar
                                </button>
                              </div>
                              <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto max-h-64">
                                {n.prompt}
                              </pre>
                            </div>
                          )}
                          {n.campos && (
                            <div className="mt-3 p-3 rounded" style={{ backgroundColor: '#fef9e5' }}>
                              <p className="text-xs font-bold mb-2" style={{ color: '#92400e' }}>Campos duplicados:</p>
                              <div className="space-y-1">
                                {n.campos.map((c, j) => (
                                  <div key={j} className="text-xs">
                                    <span className="font-bold">{c.campo}</span>: {Array.isArray(c.entities) ? (c.entities.length > 10 ? `${c.entities.length} entities` : c.entities.join(', ')) : c.entities}
                                    <br />
                                    <span style={{ color: '#ea4335' }}>→ {c.problema}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Entities sem Índice Composto */}
                {auditoria.diagnostico_entities.entitiesSemIndiceComposto?.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-bold mb-3 text-lg" style={{ color: '#dc2626' }}>
                      🐌 Entities SEM Índice Composto - Performance Catastrófica ({auditoria.diagnostico_entities.entitiesSemIndiceComposto.length})
                    </h4>
                    <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: '#fef2f2', border: '1px solid #fee2e2' }}>
                      <p className="text-sm font-bold mb-1" style={{ color: '#991b1b' }}>
                        ⚠️ FULL COLLECTION SCAN
                      </p>
                      <p className="text-xs" style={{ color: '#b91c1c' }}>
                        MongoDB escaneia TODA a collection antes de filtrar. P95 &gt; 1s com 500+ registros.
                      </p>
                    </div>
                    <div className="space-y-3">
                      {auditoria.diagnostico_entities.entitiesSemIndiceComposto.map((e, i) => (
                        <div key={i} className="bg-white rounded-lg p-4 border-l-4" style={{ borderLeftColor: '#dc2626' }}>
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-bold" style={{ color: '#202124' }}>{e.entity}</p>
                            <span className="px-2 py-1 rounded text-xs font-bold" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
                              CRÍTICO
                            </span>
                          </div>
                          <div className="text-sm space-y-1 mb-3" style={{ color: '#5f6368' }}>
                            <p>Índices atuais: {e.indexes_atuais}</p>
                            <p style={{ color: '#ea4335' }}>P95: {e.p95_estimado}</p>
                            <p>{e.risco}</p>
                          </div>
                          {e.prompt && (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-bold" style={{ color: '#5f6368' }}>CORREÇÃO:</p>
                                <button
                                  onClick={() => copyPrompt(e.prompt)}
                                  className="px-2 py-1 rounded text-xs font-bold flex items-center gap-1 hover:opacity-80"
                                  style={{ backgroundColor: '#7E57FF', color: 'white' }}
                                >
                                  <Copy className="w-3 h-3" />
                                  Copiar
                                </button>
                              </div>
                              <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto max-h-48">
                                {e.prompt}
                              </pre>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Entities com Problemas Performance */}
                {auditoria.diagnostico_entities.entitiesComProblemasPerformance?.length > 0 && (
                  <div>
                    <h4 className="font-bold mb-3 text-lg" style={{ color: '#f59e0b' }}>
                      ⚡ Performance - Queries Lentas ({auditoria.diagnostico_entities.entitiesComProblemasPerformance.length})
                    </h4>
                    <div className="space-y-3">
                      {auditoria.diagnostico_entities.entitiesComProblemasPerformance.map((e, i) => (
                        <div key={i} className="bg-white rounded-lg p-4 border" style={{ borderColor: '#fef3c7', backgroundColor: '#fef9e5' }}>
                          <p className="font-bold mb-1" style={{ color: '#202124' }}>{e.entity}</p>
                          <p className="text-sm mb-2" style={{ color: '#5f6368' }}>{e.problema}</p>
                          <p className="text-xs mb-3" style={{ color: '#ea4335' }}>Query: {e.query_lenta}</p>
                          {e.p95_estimado && <p className="text-xs mb-3" style={{ color: '#f59e0b' }}>P95: {e.p95_estimado}</p>}
                          {e.prompt && (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-bold" style={{ color: '#5f6368' }}>CORREÇÃO:</p>
                                <button
                                  onClick={() => copyPrompt(e.prompt)}
                                  className="px-2 py-1 rounded text-xs font-bold flex items-center gap-1 hover:opacity-80"
                                  style={{ backgroundColor: '#7E57FF', color: 'white' }}
                                >
                                  <Copy className="w-3 h-3" />
                                  Copiar
                                </button>
                              </div>
                              <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto max-h-40">
                                {e.prompt}
                              </pre>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* VIOLAÇÕES ISOLAMENTO MULTI-TENANT */}
            {auditoria.violacoes_isolamento && auditoria.violacoes_isolamento.length > 0 && (
              <div className="pc-card p-6" style={{ backgroundColor: '#fef2f2', borderColor: '#dc2626', borderWidth: '2px' }}>
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="w-6 h-6" style={{ color: '#dc2626' }} />
                  <h3 className="text-xl font-bold" style={{ color: '#dc2626' }}>
                    🔒 VIOLAÇÕES ISOLAMENTO MULTI-TENANT ({auditoria.violacoes_isolamento.length})
                  </h3>
                </div>
                <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: '#fff', border: '1px solid #fee2e2' }}>
                  <p className="text-sm font-bold mb-2" style={{ color: '#991b1b' }}>
                    ⚠️ RISCO LGPD CRÍTICO
                  </p>
                  <p className="text-xs" style={{ color: '#b91c1c' }}>
                    Queries sem clinica_id, entities sem índice, functions sem auth = DATA LEAK potencial.
                    Multa LGPD: até R$ 50 milhões (Art. 52, II).
                  </p>
                </div>
                <div className="space-y-3">
                  {auditoria.violacoes_isolamento.map((v, i) => (
                    <div key={i} className="bg-white rounded-lg p-4 border-l-4" style={{ borderLeftColor: '#dc2626' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 rounded text-xs font-bold" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
                          {v.severidade}
                        </span>
                        <span className="px-2 py-1 rounded text-xs font-bold" style={{ backgroundColor: '#f5f3ff', color: '#7E57FF' }}>
                          {v.tipo}
                        </span>
                      </div>
                      <p className="font-bold mb-1" style={{ color: '#202124' }}>
                        {v.entidade || v.page || v.function}
                      </p>
                      <p className="text-sm mb-2" style={{ color: '#5f6368' }}>{v.problema}</p>
                      <p className="text-xs mb-3" style={{ color: '#ea4335' }}>
                        ⚠️ {v.impacto}
                      </p>
                      {v.prompt && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-bold" style={{ color: '#5f6368' }}>CORREÇÃO:</p>
                            <button
                              onClick={() => copyPrompt(v.prompt)}
                              className="px-2 py-1 rounded text-xs font-bold flex items-center gap-1 hover:opacity-80"
                              style={{ backgroundColor: '#7E57FF', color: 'white' }}
                            >
                              <Copy className="w-3 h-3" />
                              Copiar
                            </button>
                          </div>
                          <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto">
                            {v.prompt}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* COVERAGE E2E REAL */}
            {auditoria.cobertura_testes && (
              <div className="pc-card p-6">
                <h3 className="text-xl font-bold mb-4" style={{ color: '#202124' }}>
                  🧪 Coverage E2E - Verdade Brutal
                </h3>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="rounded-lg p-4" style={{ backgroundColor: '#e6f7ed', border: '1px solid #86efac' }}>
                    <p className="text-sm font-bold mb-2" style={{ color: '#14532d' }}>
                      ✅ COM TESTE ({auditoria.cobertura_testes.entities_testadas.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {auditoria.cobertura_testes.entities_testadas.map(e => (
                        <span key={e} className="px-2 py-1 rounded text-xs bg-white border" style={{ borderColor: '#86efac' }}>
                          {e}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg p-4" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
                    <p className="text-sm font-bold mb-2" style={{ color: '#991b1b' }}>
                      ❌ SEM TESTE ({auditoria.cobertura_testes.entities_sem_teste.length})
                    </p>
                    <div className="space-y-2">
                      {auditoria.cobertura_testes.entities_sem_teste.map(e => (
                        <div key={e.entity} className="bg-white rounded p-2 text-xs border" style={{ borderColor: '#fee2e2' }}>
                          <p className="font-bold" style={{ color: '#202124' }}>{e.entity}</p>
                          <p style={{ color: '#ea4335' }}>{e.modulo}: {e.risco}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg" style={{ backgroundColor: '#f5f3ff', border: '1px solid #ddd6fe' }}>
                  <p className="text-sm font-bold mb-2" style={{ color: '#5b21b6' }}>
                    📊 Coverage: {auditoria.cobertura_testes.coverage_percentual}% (Meta: {auditoria.cobertura_testes.meta})
                  </p>
                  <p className="text-xs" style={{ color: '#5f6368' }}>
                    Risco: {auditoria.cobertura_testes.entities_sem_teste.length} módulos críticos SEM validação multi-tenant
                  </p>
                </div>
              </div>
            )}

            {/* AÇÕES PRIORIZADAS COM PROMPTS */}
            <div className="pc-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <Target className="w-6 h-6" style={{ color: '#7E57FF' }} />
                <h3 className="text-xl font-bold" style={{ color: '#202124' }}>
                  Plano de Ação - Prompts Reais
                </h3>
              </div>
              <div className="space-y-4">
                {auditoria.acoes_priorizadas?.map((acao, i) => (
                  <div key={i} className="rounded-xl p-5 border-2"
                       style={{ 
                         borderColor: acao.prioridade <= 2 ? '#ea4335' : acao.prioridade <= 4 ? '#f59e0b' : '#7E57FF',
                         backgroundColor: acao.prioridade <= 2 ? '#fef2f2' : acao.prioridade <= 4 ? '#fef9e5' : '#f5f3ff'
                       }}>
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                           style={{ 
                             backgroundColor: acao.prioridade <= 2 ? '#dc2626' : acao.prioridade <= 4 ? '#f59e0b' : '#7E57FF',
                             color: 'white',
                             fontWeight: 'bold',
                             fontSize: '18px'
                           }}>
                        {acao.prioridade}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 rounded text-xs font-bold" style={{ 
                            backgroundColor: '#f8f9fa',
                            color: '#5f6368'
                          }}>
                            {acao.categoria}
                          </span>
                        </div>
                        <p className="font-bold mb-2" style={{ color: '#202124' }}>
                          {acao.acao}
                        </p>
                        <div className="flex flex-wrap gap-3 text-xs">
                          <span className="flex items-center gap-1" style={{ color: '#34a853' }}>
                            <TrendingUp className="w-3 h-3" />
                            {acao.impacto}
                          </span>
                          <span style={{ color: '#5f6368' }}>•</span>
                          <span style={{ color: '#5f6368' }}>
                            ⏱️ {acao.tempo}
                          </span>
                        </div>
                      </div>
                    </div>

                    {acao.prompt && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-bold" style={{ color: '#5f6368' }}>CÓDIGO PRONTO:</p>
                          <button
                            onClick={() => copyPrompt(acao.prompt)}
                            className="px-3 py-1.5 rounded-lg font-medium text-xs flex items-center gap-2 hover:opacity-80"
                            style={{ backgroundColor: '#7E57FF', color: 'white' }}
                          >
                            <Copy className="w-3 h-3" />
                            Copiar
                          </button>
                        </div>
                        <pre className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs overflow-x-auto max-h-48">
                          {acao.prompt}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* PADRÕES DETECTADOS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cards Duplicados */}
              {auditoria.padroes_detectados?.cards_duplicados?.length > 0 && (
                <div className="pc-card p-6">
                  <h4 className="font-bold mb-3" style={{ color: '#202124' }}>
                    📦 Cards Duplicados ({auditoria.padroes_detectados.cards_duplicados.length})
                  </h4>
                  <div className="space-y-2">
                    {auditoria.padroes_detectados?.cards_duplicados?.map((c, i) => (
                      <div key={i} className="p-3 rounded border" style={{ borderColor: '#e8eaed' }}>
                        <p className="font-medium text-sm" style={{ color: '#202124' }}>{c.page}</p>
                        <p className="text-xs" style={{ color: '#ea4335' }}>
                          {c.duplicacoes} duplicações • {c.linhas_desperdicadas} linhas desperdiçadas
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Breadcrumb Hardcoded */}
              {auditoria.padroes_detectados?.breadcrumb_hardcoded?.length > 0 && (
                <div className="pc-card p-6">
                  <h4 className="font-bold mb-3" style={{ color: '#202124' }}>
                    🧭 Breadcrumb Hardcoded ({auditoria.padroes_detectados.breadcrumb_hardcoded.length})
                  </h4>
                  <div className="space-y-2">
                    {auditoria.padroes_detectados?.breadcrumb_hardcoded?.map((b, i) => (
                      <div key={i} className="p-3 rounded border" style={{ borderColor: '#e8eaed' }}>
                        <p className="font-medium text-sm" style={{ color: '#202124' }}>{b.page}</p>
                        <p className="text-xs" style={{ color: '#f59e0b' }}>{b.problema}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sidebar Interna */}
              {auditoria.padroes_detectados?.sidebar_interna?.length > 0 && (
                <div className="pc-card p-6">
                  <h4 className="font-bold mb-3" style={{ color: '#202124' }}>
                    🚫 Sidebar Interna - Viola Google Workspace ({auditoria.padroes_detectados.sidebar_interna.length})
                  </h4>
                  <div className="space-y-2">
                    {auditoria.padroes_detectados?.sidebar_interna?.map((s, i) => (
                      <div key={i} className="p-3 rounded border-l-4" 
                           style={{ 
                             borderLeftColor: '#ea4335',
                             backgroundColor: '#fef2f2' 
                           }}>
                        <p className="font-medium text-sm" style={{ color: '#202124' }}>{s.page}</p>
                        <p className="text-xs" style={{ color: '#dc2626' }}>{s.problema}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sem RouteGuard */}
              {auditoria.padroes_detectados?.sem_routeguard?.length > 0 && (
                <div className="pc-card p-6" style={{ 
                  backgroundColor: '#fef2f2',
                  borderColor: '#fecaca'
                }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-5 h-5" style={{ color: '#dc2626' }} />
                    <h4 className="font-bold" style={{ color: '#dc2626' }}>
                      CRÍTICO - Sem RouteGuard ({auditoria.padroes_detectados.sem_routeguard.length})
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {auditoria.padroes_detectados?.sem_routeguard?.map((r, i) => (
                      <div key={i} className="p-3 rounded bg-white border-l-4" 
                           style={{ borderLeftColor: '#dc2626' }}>
                        <p className="font-medium text-sm" style={{ color: '#202124' }}>{r.page}</p>
                        <p className="text-xs" style={{ color: '#dc2626' }}>
                          {r.risco}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ROADMAP VISUAL */}
            <div className="pc-card p-6">
              <h3 className="text-xl font-bold mb-4" style={{ color: '#202124' }}>
                🗺️ Roadmap de Execução
              </h3>
              <div className="space-y-4">
                {auditoria.roadmap_execucao?.map((fase, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                         style={{ 
                           backgroundColor: i === 0 ? '#fef2f2' : '#f5f3ff',
                           border: `2px solid ${i === 0 ? '#ea4335' : '#7E57FF'}`
                         }}>
                      <span className="font-bold" style={{ 
                        color: i === 0 ? '#dc2626' : '#7E57FF' 
                      }}>
                        {i + 1}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-bold" style={{ color: '#202124' }}>{fase.titulo}</p>
                        <span className="text-xs px-2 py-1 rounded bg-gray-100" style={{ color: '#5f6368' }}>
                          {fase.tempo}
                        </span>
                      </div>
                      <ul className="space-y-1">
                        {fase.itens.map((item, j) => (
                          <li key={j} className="text-sm flex items-start gap-2" style={{ color: '#5f6368' }}>
                            <span>•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* MÓDULOS E2E - MAPA COMPLETO */}
            {auditoria.modulos_e2e?.entities && (
              <div className="pc-card p-6">
                <h3 className="text-xl font-bold mb-4" style={{ color: '#202124' }}>
                  🧪 Módulos E2E - Critérios ErrorLogger
                </h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                  {/* Entities */}
                  <div className="rounded-lg p-4 border" style={{ borderColor: '#e8eaed' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Database className="w-5 h-5" style={{ color: '#7E57FF' }} />
                      <h4 className="font-bold" style={{ color: '#202124' }}>Entities Críticas</h4>
                    </div>
                    <p className="text-xs mb-3" style={{ color: '#5f6368' }}>
                      {auditoria.modulos_e2e?.entities?.coverage || 'N/A'}
                    </p>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {auditoria.modulos_e2e?.entities?.criticos?.map((ent, i) => (
                        <div key={i} className="rounded p-3 text-xs" style={{ backgroundColor: '#f8f9fa' }}>
                          <p className="font-bold mb-1" style={{ color: '#202124' }}>{ent.name}</p>
                          <p style={{ color: '#5f6368' }}>
                            Módulo: {ent.module} • Required: {ent.required.join(', ')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Functions */}
                  <div className="rounded-lg p-4 border" style={{ borderColor: '#e8eaed' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Code className="w-5 h-5" style={{ color: '#0B7A9E' }} />
                      <h4 className="font-bold" style={{ color: '#202124' }}>Functions Críticas</h4>
                    </div>
                    <p className="text-xs mb-3" style={{ color: '#5f6368' }}>
                      {auditoria.modulos_e2e?.functions?.coverage || 'N/A'}
                    </p>
                    <div className="space-y-2">
                      {auditoria.modulos_e2e?.functions?.criticas?.map((fn, i) => (
                        <div key={i} className="rounded p-3 text-xs" style={{ backgroundColor: '#f8f9fa' }}>
                          <p className="font-bold mb-1" style={{ color: '#202124' }}>{fn.name}</p>
                          <p style={{ color: '#5f6368' }}>
                            Módulo: {fn.module} • {fn.purpose}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Performance Criteria */}
                <div className="rounded-lg p-4 mb-4" style={{ backgroundColor: '#f5f3ff', border: '1px solid #ddd6fe' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-5 h-5" style={{ color: '#7E57FF' }} />
                    <h4 className="font-bold" style={{ color: '#5b21b6' }}>Critérios Performance (Base44)</h4>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {auditoria.modulos_e2e?.performance?.criterios?.map((c, i) => (
                      <div key={i} className="bg-white rounded p-2 text-xs">
                        <p className="font-bold" style={{ color: '#202124' }}>{c.metrica}</p>
                        <p style={{ color: '#5f6368' }}>{c.threshold}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* LGPD Criteria */}
                <div className="rounded-lg p-4 mb-4" style={{ backgroundColor: '#e6f7ed', border: '1px solid #86efac' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-5 h-5" style={{ color: '#16a34a' }} />
                    <h4 className="font-bold" style={{ color: '#14532d' }}>Critérios LGPD/CFM</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {auditoria.modulos_e2e?.lgpd?.criterios?.map((c, i) => (
                      <div key={i} className="bg-white rounded p-2 text-xs">
                        <p className="font-bold" style={{ color: '#202124' }}>{c.check}</p>
                        <p style={{ color: '#5f6368' }}>{c.threshold}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* UX Criteria */}
                <div className="rounded-lg p-4" style={{ backgroundColor: '#e0f2fe', border: '1px solid #7dd3fc' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-5 h-5" style={{ color: '#0284c7' }} />
                    <h4 className="font-bold" style={{ color: '#075985' }}>Critérios UX/Mobile</h4>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {auditoria.modulos_e2e?.ux?.criterios?.map((c, i) => (
                      <div key={i} className="bg-white rounded p-2 text-xs">
                        <p className="font-bold" style={{ color: '#202124' }}>{c.check}</p>
                        <p style={{ color: '#5f6368' }}>{c.threshold}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* BIBLIOTECA DE PROMPTS - DOWNLOAD INDIVIDUAL */}
            {auditoria.prompts_reais && (
              <div className="pc-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold" style={{ color: '#202124' }}>
                    📚 Biblioteca de Correções - Copy/Paste Ready
                  </h3>
                  <button
                    onClick={() => {
                      const blob = new Blob([JSON.stringify(auditoria.prompts_reais, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `prompts-correcao-${new Date().toISOString().split('T')[0]}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:opacity-80"
                    style={{ backgroundColor: '#34a853', color: 'white' }}
                  >
                    <Download className="w-4 h-4" />
                    Baixar Todos (JSON)
                  </button>
                </div>
                <div className="space-y-3">
                  {Object.entries(auditoria.prompts_reais).map(([key, prompt]) => (
                    <div key={key} className="rounded-lg border" style={{ borderColor: '#e8eaed' }}>
                      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#f1f3f4' }}>
                        <h4 className="font-bold" style={{ color: '#202124' }}>
                          {key.replace(/_/g, ' ').toUpperCase()}
                        </h4>
                        <button
                          onClick={() => copyPrompt(prompt)}
                          className="px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-2 hover:opacity-80"
                          style={{ backgroundColor: '#7E57FF', color: 'white' }}
                        >
                          <Copy className="w-3 h-3" />
                          Copiar
                        </button>
                      </div>
                      <div className="p-4">
                        <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto" style={{ maxHeight: '300px' }}>
                          {prompt}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* IMPACTO ESTIMADO */}
            {auditoria.economia_real && (
              <div className="pc-card p-8 text-center" style={{ 
                background: 'linear-gradient(135deg, #f5f3ff 0%, #e6f7ed 100%)'
              }}>
                <h3 className="text-2xl font-bold mb-4" style={{ color: '#202124' }}>
                  📊 Impacto Real Pós-Refatoração
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-4xl font-bold mb-2" style={{ color: '#34a853' }}>
                      -{auditoria.economia_real.percentual_bundle}%
                    </p>
                    <p className="text-sm" style={{ color: '#5f6368' }}>Bundle Size</p>
                  </div>
                  <div>
                    <p className="text-4xl font-bold mb-2" style={{ color: '#7E57FF' }}>
                      -{auditoria.economia_real.linhas}
                    </p>
                    <p className="text-sm" style={{ color: '#5f6368' }}>Linhas JSX</p>
                  </div>
                  <div>
                    <p className="text-4xl font-bold mb-2" style={{ color: '#0B7A9E' }}>
                      {auditoria.economia_real.kb}KB
                    </p>
                    <p className="text-sm" style={{ color: '#5f6368' }}>Redução Bundle</p>
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