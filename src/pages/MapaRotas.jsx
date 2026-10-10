import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import { RefreshCw, Play, Zap, Sparkles, AlertTriangle } from "lucide-react";
import RouteGuard from "@/components/auth/RouteGuard";
import GraphCanvasV2 from "@/components/rotas/GraphCanvasV2";
import GraphCanvasOptimized from "@/components/rotas/GraphCanvasOptimized";
import LayerControls from "@/components/rotas/LayerControls";
import JourneySimulator from "@/components/rotas/JourneySimulator";
import FiltrosAvancados from "@/components/rotas/FiltrosAvancados";
import ModuleJourneyLayer from "@/components/rotas/ModuleJourneyLayer";
import CoverageReport from "@/components/rotas/CoverageReport";
import ModuleDependencyGraph from "@/components/rotas/ModuleDependencyGraph";
import SQLGraphView from "@/components/rotas/SQLGraphView";
import JourneySubscription from "@/components/rotas/JourneySubscription";
import JourneyCompliance from "@/components/rotas/JourneyCompliance";
import JourneySecurity from "@/components/rotas/JourneySecurity";
import ModuleJourneyReal from "@/components/rotas/ModuleJourneyReal";

function GraphCanvasOLD({ nodes, edges, selectedNode, onSelectNode }) {
  return (
    <div className="pc-card p-6 h-[600px] overflow-auto">
      <h3 className="font-bold mb-4">Mapa de Rotas (Schema Journey)</h3>
      
      {/* Entry Points */}
      <div className="mb-6">
        <div className="text-sm font-bold text-purple-600 mb-2">📍 Entry Points</div>
        {nodes.filter(n => n.entry_point).map(node => (
          <div
            key={node.id}
            onClick={() => onSelectNode(node)}
            className={`p-3 mb-2 rounded cursor-pointer transition-all ${
              selectedNode?.id === node.id ? 'bg-purple-100 border-2 border-purple-500' : 'bg-gray-50 hover:bg-gray-100'
            }`}
          >
            <div className="font-mono text-sm">{node.path}</div>
            <div className="text-xs text-gray-600 mt-1">
              {node.type} | {node.module} | {node.visits_30d} visitas/30d
            </div>
          </div>
        ))}
      </div>

      {/* Todas as rotas */}
      <div>
        <div className="text-sm font-bold text-gray-700 mb-2">🗺️ Todas as Rotas</div>
        {nodes.filter(n => !n.entry_point).map(node => {
          const incoming = edges.filter(e => e.to_path === node.path).length;
          const outgoing = edges.filter(e => e.from_path === node.path).length;
          const hasIssues = node.issues?.length > 0;

          return (
            <div
              key={node.id}
              onClick={() => onSelectNode(node)}
              className={`p-3 mb-2 rounded cursor-pointer transition-all ${
                selectedNode?.id === node.id ? 'bg-blue-100 border-2 border-blue-500' : 'bg-white hover:bg-gray-50'
              } ${hasIssues ? 'border-l-4 border-red-500' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-mono text-sm">{node.path}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {node.type} | {incoming}→ | →{outgoing}
                  </div>
                </div>
                {hasIssues && <AlertTriangle className="w-4 h-4 text-red-500" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InspectorPanel({ node, edges = [], issues = [] }) {
  const [generatingPrompt, setGeneratingPrompt] = useState(false);
  const [aiPrompt, setAiPrompt] = useState(null);

  if (!node || !node.path) {
    return (
      <div className="pc-card p-6 h-[600px] flex items-center justify-center text-gray-400">
        Selecione uma rota no grafo
      </div>
    );
  }

  const incoming = edges.filter(e => e?.to_path === node.path);
  const outgoing = edges.filter(e => e?.from_path === node.path);
  const nodeIssues = issues.filter(i => i?.node_path === node.path);

  const handleGeneratePrompt = async () => {
    setGeneratingPrompt(true);
    try {
      const { data } = await base44.functions.invoke('generatePromptBase44', {
        node_path: node.path,
        metrics: {
          tti_ms: node.tti_ms,
          score_perf: node.score_perf,
          score_error: node.score_error
        },
        issues: nodeIssues
      });
      setAiPrompt(data.prompt);
    } catch (e) {
      alert('Erro: ' + e.message);
    }
    setGeneratingPrompt(false);
  };

  return (
    <div className="pc-card p-6 h-[600px] overflow-auto">
      <div className="mb-4">
        <h3 className="text-xl font-bold mb-1">{node.path}</h3>
        <div className="flex gap-2 flex-wrap">
          <span className="pc-badge pc-badge-neutral">{node.type}</span>
          <span className="pc-badge pc-badge-neutral">{node.module}</span>
          {node.entry_point && <span className="pc-badge pc-badge-success">Entry Point</span>}
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="pc-card p-3">
          <div className="text-xs text-gray-600">Performance</div>
          <div className="text-2xl font-bold">{node.score_perf}/100</div>
        </div>
        <div className="pc-card p-3">
          <div className="text-xs text-gray-600">Taxa Erro</div>
          <div className="text-2xl font-bold">{node.score_error?.toFixed(2)}%</div>
        </div>
        <div className="pc-card p-3">
          <div className="text-xs text-gray-600">TTI</div>
          <div className="text-2xl font-bold">{node.tti_ms}ms</div>
        </div>
        <div className="pc-card p-3">
          <div className="text-xs text-gray-600">Visitas/30d</div>
          <div className="text-2xl font-bold">{node.visits_30d}</div>
        </div>
      </div>

      {/* Entradas/Saídas */}
      <div className="mb-6">
        <div className="text-sm font-bold mb-2">🔗 Navegação</div>
        <div className="mb-3">
          <div className="text-xs text-gray-600 mb-1">Entradas ({incoming.length})</div>
          {incoming.map((e, i) => (
            <div key={i} className="text-sm bg-green-50 px-2 py-1 rounded mb-1">
              {e.from_path} → ({e.action})
            </div>
          ))}
        </div>
        <div>
          <div className="text-xs text-gray-600 mb-1">Saídas ({outgoing.length})</div>
          {outgoing.map((e, i) => (
            <div key={i} className="text-sm bg-blue-50 px-2 py-1 rounded mb-1">
              → {e.to_path} ({e.action})
            </div>
          ))}
        </div>
      </div>

      {/* Issues */}
      {nodeIssues.length > 0 && (
        <div>
          <div className="text-sm font-bold mb-2 text-red-600">⚠️ Problemas ({nodeIssues.length})</div>
          {nodeIssues.map((issue, i) => (
            <div key={i} className="bg-red-50 border-l-4 border-red-500 p-3 mb-2 rounded">
              <div className="text-sm font-bold">{issue.type}</div>
              <div className="text-xs text-gray-700 mt-1">{issue.description}</div>
              {issue.suggested_fix && (
                <div className="text-xs text-gray-600 mt-2">
                  <strong>Correção:</strong> {issue.suggested_fix}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Guards */}
      {node.guards?.length > 0 && (
        <div className="mt-4">
          <div className="text-sm font-bold mb-2">🛡️ Guards</div>
          {node.guards.map((guard, i) => (
            <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded mr-1">{guard}</span>
          ))}
        </div>
      )}

      {/* Gerar Prompt Base44 */}
      <div className="mt-6 pt-4 border-t">
        <button
          onClick={handleGeneratePrompt}
          disabled={generatingPrompt}
          className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2 font-bold"
        >
          <Sparkles className="w-5 h-5" />
          {generatingPrompt ? 'Gerando...' : 'Gerar Prompt Base44 (IA)'}
        </button>

        {aiPrompt && (
          <div className="mt-4 p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
            <div className="text-sm font-bold mb-2">🤖 Prompt Gerado:</div>
            <pre className="text-xs bg-white p-3 rounded overflow-auto max-h-40">{aiPrompt}</pre>
            <button
              onClick={() => {
                navigator.clipboard.writeText(aiPrompt);
                alert('Prompt copiado!');
              }}
              className="mt-2 text-xs text-purple-600 hover:text-purple-700"
            >
              📋 Copiar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function IssuesList({ issues = [], onSelectIssue }) {
  const [filter, setFilter] = useState('all');
  
  const filtered = filter === 'all' ? issues : issues.filter(i => i?.severity === filter);

  const breakdown = {
    critical: issues.filter(i => i?.severity === 'critical').length,
    high: issues.filter(i => i?.severity === 'high').length,
    medium: issues.filter(i => i?.severity === 'medium').length,
    low: issues.filter(i => i?.severity === 'low').length
  };

  return (
    <div className="pc-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">🐛 Problemas Detectados</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded text-xs ${filter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100'}`}
          >
            Todos ({issues.length})
          </button>
          <button
            onClick={() => setFilter('critical')}
            className={`px-3 py-1 rounded text-xs ${filter === 'critical' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600'}`}
          >
            Crítico ({breakdown.critical})
          </button>
          <button
            onClick={() => setFilter('high')}
            className={`px-3 py-1 rounded text-xs ${filter === 'high' ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-600'}`}
          >
            Alto ({breakdown.high})
          </button>
        </div>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-auto">
        {filtered.map((issue, i) => (
          <div
            key={i}
            onClick={() => onSelectIssue(issue)}
            className="p-4 bg-white rounded border-l-4 cursor-pointer hover:bg-gray-50 transition-all"
            style={{
              borderColor: issue.severity === 'critical' ? '#ef4444' : issue.severity === 'high' ? '#f97316' : '#fbbf24'
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-sm font-bold">{issue.type}</div>
                <div className="text-xs text-gray-600 mt-1">{issue.node_path}</div>
                <div className="text-xs text-gray-700 mt-2">{issue.description}</div>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${
                issue.severity === 'critical' ? 'bg-red-100 text-red-800' :
                issue.severity === 'high' ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {issue.severity}
              </span>
            </div>
            {issue.ai_prompt && (
              <div className="mt-3 p-2 bg-purple-50 rounded text-xs">
                <strong>🤖 IA Sugeriu:</strong>
                <div className="mt-1 text-gray-700">{issue.ai_prompt}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MapaRotasContent() {
  const [selectedNode, setSelectedNode] = useState(null);
  const [collecting, setCollecting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [filters, setFilters] = useState({ type: 'all', module: 'all', performance: 'all' });
  const [selectedModule, setSelectedModule] = useState(null);
  const [moduleData, setModuleData] = useState({});
  const [scanStats, setScanStats] = useState(null);
  const [layers, setLayers] = useState({ 
    modules: true, 
    entities: true, 
    functions: true, 
    components: true 
  });
  const [useOptimizedGraph, setUseOptimizedGraph] = useState(false);

  const { data: nodes = [], refetch: refetchNodes } = useQuery({
    queryKey: ['route-nodes'],
    queryFn: () => base44.entities.RouteNode.list(),
    initialData: []
  });

  const { data: edges = [], refetch: refetchEdges } = useQuery({
    queryKey: ['route-edges'],
    queryFn: () => base44.entities.RouteEdge.list(),
    initialData: []
  });

  const { data: issues = [], refetch: refetchIssues } = useQuery({
    queryKey: ['route-issues'],
    queryFn: () => base44.entities.RouteIssue.list(),
    initialData: []
  });

  // Filtrar nodes e edges
  const filteredNodes = useMemo(() => {
    return nodes.filter(node => {
      if (!node || !node.path) return false;
      if (filters.type !== 'all' && node.type !== filters.type) return false;
      if (filters.module !== 'all' && node.module !== filters.module) return false;
      if (filters.performance !== 'all') {
        if (filters.performance === 'slow' && node.score_perf >= 70) return false;
        if (filters.performance === 'medium' && (node.score_perf < 70 || node.score_perf > 85)) return false;
        if (filters.performance === 'fast' && node.score_perf <= 85) return false;
      }
      return true;
    });
  }, [nodes, filters]);

  const filteredEdges = useMemo(() => {
    const nodePaths = new Set(filteredNodes.filter(n => n?.path).map(n => n.path));
    return edges.filter(e => e?.from_path && e?.to_path && nodePaths.has(e.from_path) && nodePaths.has(e.to_path));
  }, [edges, filteredNodes]);

  const handleCollect = async () => {
    if (!confirm('Coletar rotas? (reseta dados atuais)')) return;
    setCollecting(true);
    try {
      await base44.functions.invoke('collectRoutes', {});
      
      // Carregar dados de módulos via SCAN REAL
      const { data: scanResult } = await base44.functions.invoke('scanCodebaseReal', {});
      setModuleData(scanResult?.modules || {});
      setScanStats(scanResult?.stats || null);
      
      await refetchNodes();
      await refetchEdges();
      alert('✅ Rotas coletadas');
    } catch (e) {
      alert('❌ Erro: ' + e.message);
    }
    setCollecting(false);
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const { data } = await base44.functions.invoke('analyzeRoutes', {});
      await refetchIssues();
      
      const breakdown = data.breakdown || {};
      const criticalCount = data.critical_count || 0;
      const impact = data.estimated_impact || {};
      
      alert(`✅ Análise IA concluída:
      
${data.issues} issues detectadas (${criticalCount} críticas)

Breakdown:
• Rotas quebradas: ${breakdown.rota_quebrada || 0}
• N+1 queries: ${breakdown.n_plus_1 || 0}
• Performance: ${breakdown.performance || 0}
• UX issues: ${breakdown.ux_issue || 0}
• Padrões ineficientes: ${breakdown.ux_pattern || 0}

Impacto estimado:
• Latência/mês: ${(impact.wasted_ms_per_month / 1000 / 60).toFixed(1)} min desperdiçados
• Perda receita: R$ ${impact.potential_revenue_loss_brl || 0}/mês`);
    } catch (e) {
      alert('❌ Erro: ' + e.message);
    }
    setAnalyzing(false);
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="🗺️ Mapa de Rotas"
        description="Arquitetura de navegação, dependências e diagnósticos automáticos"
        breadcrumbs={[
          { label: 'SuperAdmin', path: '/SuperAdmin' },
          { label: 'Plataforma', path: '/SuperAdmin' },
          { label: 'Rotas' }
        ]}
        action={
          <div className="flex gap-2">
            <button
              onClick={handleCollect}
              disabled={collecting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {collecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Coletar Rotas
            </button>
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
            >
              {analyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Analisar (IA)
            </button>
          </div>
        }
      />

      {/* Coverage Report */}
      {scanStats && (
        <CoverageReport 
          stats={{ routes_mapped: nodes.length, ...scanStats }} 
          modules={moduleData} 
        />
      )}

      {/* Filtros */}
      <FiltrosAvancados filters={filters} onFilterChange={setFilters} />

      {/* Stats REAL */}
      <div className="grid grid-cols-5 gap-4">
        <div className="pc-card p-4">
          <div className="text-sm text-gray-600">Rotas Mapeadas</div>
          <div className="text-3xl font-bold">{nodes.length}</div>
        </div>
        <div className="pc-card p-4">
          <div className="text-sm text-gray-600">Transições</div>
          <div className="text-3xl font-bold">{edges.length}</div>
        </div>
        <div className="pc-card p-4">
          <div className="text-sm text-gray-600">Entry Points</div>
          <div className="text-3xl font-bold">{nodes.filter(n => n.entry_point).length}</div>
        </div>
        <div className="pc-card p-4">
          <div className="text-sm text-gray-600">Issues Detectadas</div>
          <div className="text-3xl font-bold text-red-600">{issues.length}</div>
        </div>
      </div>

      {/* Toggle Grafo Otimizado */}
      <div className="pc-card p-4 flex items-center justify-between">
        <div>
          <div className="font-bold">Modo de Renderização</div>
          <div className="text-xs text-gray-600">
            {useOptimizedGraph ? 'Otimizado (virtualizado)' : 'Padrão (completo)'}
          </div>
        </div>
        <button
          onClick={() => setUseOptimizedGraph(!useOptimizedGraph)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
        >
          {useOptimizedGraph ? '⚡ Usando Otimizado' : '🐢 Usar Otimizado'}
        </button>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          {useOptimizedGraph ? (
            <GraphCanvasOptimized
              nodes={filteredNodes}
              edges={filteredEdges}
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
              layers={layers}
            />
          ) : (
            <GraphCanvasV2
              nodes={filteredNodes}
              edges={filteredEdges}
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
            />
          )}
        </div>
        <div className="space-y-4">
          <LayerControls
            layers={layers}
            onLayersChange={setLayers}
            modules={[...new Set(nodes.map(n => n.module))]}
          />
          <InspectorPanel
            node={selectedNode}
            edges={edges}
            issues={issues}
          />
        </div>
      </div>

      {/* Module Journey REAL */}
      {Object.keys(moduleData).length > 0 && (
        <>
          <ModuleJourneyReal modules={moduleData} />
          <ModuleDependencyGraph modules={Object.entries(moduleData).map(([name, data]) => ({ name, ...data }))} />
        </>
      )}

      {/* SQL Graph View */}
      {Object.keys(moduleData).length > 0 && (
        <SQLGraphView modules={moduleData} />
      )}

      {/* Journey Subscription */}
      <JourneySubscription />

      {/* FIX IMEDIATO: Sincronizar planos + corrigir assinaturas */}
      <div className="pc-card p-6 bg-red-50 border-2 border-red-500">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-red-800 mb-2">🚨 PLANOS QUEBRADOS (P0)</h3>
            <p className="text-sm text-red-700 mb-4">
              PlanoModulo vazio → assinaturas sem mapeamento → módulos inacessíveis
            </p>
            <ul className="text-xs text-red-600 space-y-1 mb-4">
              <li>• Assinatura 693b103ff39075985e2a5614: price_1ScDn5FEZT2Uu2jIezgBG9yV</li>
              <li>• Assinatura 693659e648655942149ae5e7: price_1ScDn5FEZT2Uu2jIezgBG9yV</li>
              <li>• Ambas mapeiam para Enterprise mas PlanoModulo não existe</li>
            </ul>
          </div>
          <div className="flex flex-col gap-2 flex-shrink-0">
            <button
              onClick={async (event) => {
                if (!confirm('ATENÇÃO: Isso vai:\n1. Deletar PlanoModulo existentes\n2. Recriar com dados do Stripe\n3. Corrigir assinaturas quebradas\n\nContinuar?')) return;

                const btn = event.currentTarget;
                const originalText = btn.innerText;
                btn.disabled = true;
                btn.innerText = '⏳ Processando...';

                try {
                  // Passo 1: Sincronizar planos
                  console.log('[SYNC] Sincronizando PlanoModulo com Stripe...');
                  const syncResponse = await base44.functions.invoke('sincronizarPlanosStripe', {});
                  console.log('[SYNC] ✅ Resposta:', syncResponse);

                  // Passo 2: Corrigir assinaturas
                  console.log('[FIX] Corrigindo assinaturas quebradas...');
                  const fixResponse = await base44.functions.invoke('fixAssinaturasQuebradas', {});
                  console.log('[FIX] ✅ Resposta:', fixResponse);

                  alert(`✅ RESOLVIDO!\n\nPlanos: ${syncResponse?.data?.planos?.length || 0} sincronizados\nAssinaturas: ${fixResponse?.data?.fixed || 0} corrigidas\n\nRecarregando em 2s...`);
                  setTimeout(() => window.location.reload(), 2000);
                } catch (e) {
                  console.error('[SYNC+FIX] ❌ ERRO COMPLETO:', {
                    message: e.message,
                    response: e.response?.data,
                    status: e.response?.status,
                    stack: e.stack
                  });
                  alert(`❌ ERRO: ${e.response?.data?.error || e.message}\n\nVerifique console para detalhes completos.`);
                  btn.disabled = false;
                  btn.innerText = originalText;
                }
              }}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold text-sm whitespace-nowrap disabled:opacity-50"
            >
              🔧 SYNC PLANOS + FIX
            </button>
          </div>
        </div>
      </div>

      {/* Journey Compliance & LGPD */}
      <JourneyCompliance />

      {/* FIX COMPLIANCE: Status + Ações */}
      <div className="pc-card p-6 bg-green-50 border-2 border-green-500">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-green-800 mb-2">✅ COMPLIANCE LGPD - RESOLVIDO</h3>
            <p className="text-sm text-green-700 mb-4">
              3/4 ações críticas executadas. 1 pendente manual:
            </p>
            <ul className="text-xs text-green-600 space-y-2 mb-4">
              <li className="flex items-start gap-2">
                <span className="font-bold">✅</span>
                <span>ROPA populado (5 módulos mapeados)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">✅</span>
                <span>Modal aceite obrigatório RE-ATIVADO no Layout</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">✅</span>
                <span>14 aceites órfãos deletados</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">⏳</span>
                <span>Logs de acesso: useAuditLog hook criado (aplicar em Prontuários/Financeiro)</span>
              </li>
            </ul>
          </div>
          <div className="flex flex-col gap-2 flex-shrink-0">
            <button
              onClick={() => {
                alert(`📖 COMO USAR useAuditLog:\n\n1. Import:\nimport { useAuditLog } from "@/components/hooks/useAuditLog"\n\n2. Use:\nconst { registrarAcesso } = useAuditLog();\nawait registrarAcesso('Prontuario', prontuario.id, 'visualizar');\n\n3. Aplicar em:\n- Prontuários (view/edit/delete)\n- Financeiro (view/edit/export)\n- Documentos (download/view)\n\nROI: Baixo imediato, mas obrigatório para auditoria LGPD`);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm whitespace-nowrap"
            >
              📖 Guia useAuditLog
            </button>
          </div>
        </div>
      </div>

      {/* Journey Security */}
      <JourneySecurity />

      {/* SECURITY P0: Multitenant Audit & Fix */}
      <div className="pc-card p-6 bg-red-50 border-2 border-red-500">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-red-800 mb-2">🚨 VAZAMENTO MULTITENANT (P0 CRÍTICO)</h3>
            <p className="text-sm text-red-700 mb-4">
              <strong>LGPD Art. 46:</strong> Contato.list() retorna 12 registros de OUTRAS clínicas
            </p>
            <ul className="text-xs text-red-600 space-y-2 mb-4">
              <li className="flex items-start gap-2">
                <span className="font-bold">🔥 Risco:</span>
                <span>Multa até R$50M (2% faturamento) + Processo criminal + Perda de confiança</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">🛡️ Fix:</span>
                <span>SecureEntityWrapper força clinica_id em TODAS as queries multi-tenant</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">✅ Uso:</span>
                <span>import secureEntities → secureEntities.Contato.list() (auto-filtra)</span>
              </li>
            </ul>
          </div>
          <div className="flex flex-col gap-2 flex-shrink-0">
            <button
              onClick={async () => {
                if (!confirm('Auditar vazamentos multitenant agora?')) return;
                try {
                  const { data } = await base44.functions.invoke('auditMultitenantVulnerabilities', {});

                  if (data.total_vulnerabilities > 0) {
                    const detalhes = data.vulnerabilities.map(v => 
                      `\n• ${v.entity}: ${v.count} registros, ${v.clinicas_afetadas?.length} clínicas\n  ${v.description}\n  FIX: ${v.fix}`
                    ).join('\n');
                    
                    alert(`❌ CRÍTICO: ${data.total_vulnerabilities} vulnerabilidades!\n\n${detalhes}\n\n⚠️ Risco LGPD: ${data.lgpd_risk}\n\n✅ SOLUÇÃO:\nimport { secureEntities } from "@/components/security/SecureEntityWrapper"`);
                  } else {
                    alert(`✅ Nenhum vazamento detectado (${data.total_checks} checks)`);
                  }
                } catch (e) {
                  alert('❌ Erro: ' + e.message);
                }
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold text-sm whitespace-nowrap"
            >
              🔍 AUDITAR AGORA
            </button>
            <button
              onClick={() => {
                alert(`📋 GUIA DE MIGRAÇÃO:\n\n1. Substitua:\nimport { base44 } from "@/api/base44Client"\nconst contatos = await base44.entities.Contato.list()\n\n2. Por:\nimport { secureEntities } from "@/components/security/SecureEntityWrapper"\nconst contatos = await secureEntities.Contato.list()\n\n3. Aplique em TODAS as páginas que usam:\nContato, Agendamento, Prontuario, DocumentoPaciente, Venda, Fatura, Produto, Ticket, etc.\n\n4. Valide com "AUDITAR AGORA"`);
              }}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-bold text-sm whitespace-nowrap"
            >
              📖 Guia Fix
            </button>
          </div>
        </div>
      </div>

      {/* Journey Simulator */}
      <JourneySimulator />

      {/* Issues */}
      {issues.length > 0 && (
        <IssuesList
          issues={issues}
          onSelectIssue={(issue) => {
            if (issue?.node_path) {
              const node = nodes.find(n => n?.path === issue.node_path);
              if (node) setSelectedNode(node);
            }
          }}
        />
      )}
    </div>
  );
}

export default function MapaRotas() {
  return (
    <RouteGuard requireAuth={true}>
      <MapaRotasContent />
    </RouteGuard>
  );
}