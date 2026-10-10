import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    console.log('[analyzeRoutes] ✅ User authenticated:', user.email);
    console.log('[analyzeRoutes] Iniciando análise...');

    const nodes = await base44.asServiceRole.entities.RouteNode.list();
    const edges = await base44.asServiceRole.entities.RouteEdge.list();
    
    console.log('[analyzeRoutes] Dados carregados:', {
      nodesCount: nodes.length,
      edgesCount: edges.length
    });
    
    if (nodes.length === 0) {
      return Response.json({ 
        error: 'Nenhuma rota encontrada. Execute "Coletar Rotas" primeiro.',
        nodes: 0,
        edges: 0
      }, { status: 400 });
    }

    const issues = [];

    // 1. ROTAS QUEBRADAS: destinos sem node
    const validPaths = new Set(nodes.map(n => n.path));
    for (const edge of edges) {
      if (!validPaths.has(edge.to_path)) {
        issues.push({
          type: 'rota_quebrada',
          severity: 'critical',
          node_path: edge.from_path,
          edge_id: edge.id,
          description: `Link de "${edge.from_path}" para "${edge.to_path}" está quebrado (destino não existe)`,
          evidence: [{ file: 'unknown', line: 0, code: `to: "${edge.to_path}"` }],
          suggested_fix: `Remover link ou criar rota ${edge.to_path}`,
          impact: 'Erro 404 para usuários',
          ai_diagnosis: 'Rota de destino não encontrada no mapa',
          ai_prompt: `Prompt Base44: Verificar se a rota "${edge.to_path}" existe. Se não, remover referências ou criar página.`
        });
      }
    }

    // 2. ROTAS ÓRFÃS: nodes sem entrada (exceto entry_points)
    const hasIncoming = new Set(edges.map(e => e.to_path));
    for (const node of nodes) {
      if (!node.entry_point && !hasIncoming.has(node.path)) {
        issues.push({
          type: 'orfao',
          severity: 'high',
          node_path: node.path,
          description: `Rota "${node.path}" é órfã (sem entrada a partir de entry points)`,
          evidence: [],
          suggested_fix: `Adicionar link ou remover rota`,
          impact: 'Página inacessível',
          ai_diagnosis: 'Nenhuma navegação leva a esta rota',
          ai_prompt: `Prompt Base44: Criar link para "${node.path}" ou remover página se obsoleta.`
        });
      }
    }

    // 3. LOOPS: ciclos diretos (A -> B -> A)
    for (const edge1 of edges) {
      const reverse = edges.find(e => e.from_path === edge1.to_path && e.to_path === edge1.from_path);
      if (reverse && !edge1.is_loop && edge1?.id) {
        await base44.asServiceRole.entities.RouteEdge.update(edge1.id, { is_loop: true });
        issues.push({
          type: 'loop',
          severity: 'medium',
          node_path: edge1.from_path,
          description: `Loop detectado: ${edge1.from_path} <-> ${edge1.to_path}`,
          evidence: [],
          suggested_fix: 'Verificar lógica de navegação',
          impact: 'Usuário pode ficar preso',
          ai_diagnosis: 'Ciclo de navegação direto',
          ai_prompt: `Prompt Base44: Revisar guards e condições entre "${edge1.from_path}" e "${edge1.to_path}".`
        });
      }
    }

    // 4. PERFORMANCE AVANÇADA: TTI > 1500ms (threshold mais agressivo)
    for (const node of nodes) {
      if (node.tti_ms > 1500) {
        const severity = node.tti_ms > 2500 ? 'critical' : 'high';
        const queriesCount = (node.queries || []).length;
        const componentsCount = (node.components || []).length;
        
        // Diagnóstico específico baseado em contexto
        let rootCause = 'Performance geral';
        let specificFix = 'Otimizar carregamento';
        
        if (queriesCount > 3) {
          rootCause = `Excesso de queries (${queriesCount})`;
          specificFix = `Combinar queries em uma única chamada ou usar prefetch. Ex: useQueries([...]) ao invés de múltiplos useQuery`;
        } else if (componentsCount > 10) {
          rootCause = `Muitos componentes (${componentsCount})`;
          specificFix = `Code splitting: lazy(() => import('./Heavy')). Virtualizar listas longas com react-window`;
        } else if (node.entities?.length > 2) {
          rootCause = `Múltiplas entidades (${node.entities.length})`;
          specificFix = `Prefetch crítico: usePrefetch() no Layout. Memoizar dados: useMemo() para filtros`;
        }
        
        issues.push({
          type: 'performance',
          severity: severity,
          node_path: node.path,
          description: `TTI ${node.tti_ms}ms em "${node.path}". Causa raiz: ${rootCause}`,
          evidence: [
            { file: node.path, line: 0, code: `queries: ${queriesCount}, components: ${componentsCount}` }
          ],
          suggested_fix: specificFix,
          impact: `${node.visits_30d} usuários/mês afetados. Estimativa: ${((node.tti_ms - 500) / 1000 * node.visits_30d * 0.25).toFixed(0)} abandonos/mês`,
          ai_diagnosis: rootCause,
          ai_prompt: `
AÇÃO BASE44 - Otimizar Performance "${node.path}":
1. ${specificFix}
2. Adicionar loading skeleton para feedback visual
3. Implementar error boundary específico
4. Medir FCP/LCP com PerformanceObserver
CÓDIGO SUGERIDO:
const Heavy = lazy(() => import('./Heavy'));
const { data, isLoading } = useQuery({ 
  queryKey: ['${node.path}'], 
  staleTime: 5 * 60 * 1000 
});
if (isLoading) return <Skeleton />;
`.trim()
        });
      }
    }

    // 5. ERROS: taxa > 1%
    for (const node of nodes) {
      if (node.score_error > 1) {
        issues.push({
          type: 'code_smell',
          severity: 'medium',
          node_path: node.path,
          description: `Taxa de erro de ${node.score_error.toFixed(2)}% em "${node.path}"`,
          evidence: [],
          suggested_fix: 'Revisar ErrorBoundary, validações',
          impact: 'Usuários veem erros',
          ai_diagnosis: 'Alta taxa de erro',
          ai_prompt: `Prompt Base44: Auditar "${node.path}": try/catch, validações, logs.`
        });
      }
    }

    // N+1 DETECTION AVANÇADO: queries repetidas + análise de padrões
    for (const node of nodes) {
      const queriesCount = (node.queries || []).length;
      if (queriesCount > 5) {
        // Detectar queries duplicadas (padrão comum em loops)
        const queriesSet = new Set(node.queries);
        const hasDuplicates = queriesSet.size < node.queries.length;
        const duplicatesCount = node.queries.length - queriesSet.size;
        
        const severity = queriesCount > 10 ? 'critical' : 'high';
        const isDatabaseQuery = node.entities && node.entities.length > 0;
        
        let specificDiagnosis = `${queriesCount} queries detectadas`;
        let optimizationStrategy = 'Consolidar queries';
        
        if (hasDuplicates) {
          specificDiagnosis = `N+1 confirmado: ${duplicatesCount} queries duplicadas em loop`;
          optimizationStrategy = `
CRÍTICO - N+1 Pattern:
1. Substituir loop por batch query:
   ANTES: items.map(i => useQuery(['item', i.id]))
   DEPOIS: useQuery(['items', ids], () => batchFetch(ids))
2. Usar dataloader pattern ou batch GraphQL
3. Adicionar índice no banco se necessário
`.trim();
        } else if (isDatabaseQuery) {
          specificDiagnosis = `${queriesCount} queries a entidades ${node.entities.join(', ')}`;
          optimizationStrategy = `
OTIMIZAR QUERIES DB:
1. Usar select projection: .filter({ fields: ['id', 'name'] })
2. Combinar em query única com $or ou aggregation
3. Prefetch relações: incluir joins/populate
4. Cache: staleTime 5min para dados estáticos
`.trim();
        }
        
        issues.push({
          type: 'n_plus_1',
          severity: severity,
          node_path: node.path,
          description: `${specificDiagnosis} em "${node.path}"`,
          evidence: [
            ...node.queries.slice(0, 5).map(q => ({ file: node.path, line: 0, code: `useQuery(['${q}'])` })),
            { file: node.path, line: 0, code: `${queriesCount} total queries, ${duplicatesCount} duplicadas` }
          ],
          suggested_fix: optimizationStrategy,
          impact: `Latência acumulada: ~${queriesCount * 50}ms. Custo DB: ${queriesCount} round-trips`,
          ai_diagnosis: specificDiagnosis,
          ai_prompt: `
AÇÃO BASE44 - Corrigir N+1 "${node.path}":
${optimizationStrategy}

EXEMPLO CÓDIGO:
// ❌ ANTES (N+1)
{items.map(i => {
  const { data } = useQuery(['item', i.id]);
  return <Item data={data} />;
})}

// ✅ DEPOIS (batch)
const ids = items.map(i => i.id);
const { data: allItems } = useQuery(['items', ids], () => 
  base44.entities.Item.filter({ id: { $in: ids } })
);
{allItems.map(item => <Item data={item} />)}
`.trim()
        });
      }
    }

    // CIRCULAR DEPS: detectar módulos com dependências circulares via nodes
    const moduleDeps = {};
    for (const node of nodes) {
      if (!node.module) continue;
      if (!moduleDeps[node.module]) moduleDeps[node.module] = new Set();
      
      (node.components || []).forEach(comp => {
        // Heurística: se component de outro módulo, adiciona dep
        for (const otherNode of nodes) {
          if (otherNode.module && otherNode.module !== node.module) {
            if (comp.toLowerCase().includes(otherNode.module.substring(0, 5))) {
              moduleDeps[node.module].add(otherNode.module);
            }
          }
        }
      });
    }

    Object.entries(moduleDeps).forEach(([mod, deps]) => {
      deps.forEach(depMod => {
        if (moduleDeps[depMod]?.has(mod)) {
          issues.push({
            type: 'dependencia_circular',
            severity: 'medium',
            node_path: `module:${mod}`,
            description: `Dependência circular: ${mod} ↔ ${depMod}`,
            evidence: [],
            suggested_fix: 'Extrair lógica compartilhada para módulo comum',
            impact: 'Acoplamento alto',
            ai_diagnosis: 'Módulos mutuamente dependentes',
            ai_prompt: `Prompt Base44: Refatorar ${mod} e ${depMod} para remover ciclo.`
          });
        }
      });
    });

    // LIMPAR ISSUES ANTIGAS
    console.log('[analyzeRoutes] Limpando RouteIssue antigas...');
    const existingIssues = await base44.asServiceRole.entities.RouteIssue.list();
    for (const issue of existingIssues) {
      if (issue?.id) {
        await base44.asServiceRole.entities.RouteIssue.delete(issue.id);
      }
    }
    console.log(`[analyzeRoutes] ✅ Deletados ${existingIssues.length} issues antigos`);

    // CRIAR ISSUES
    const issuesCreated = [];
    for (const issue of issues) {
      const created = await base44.asServiceRole.entities.RouteIssue.create(issue);
      issuesCreated.push(created);
    }

    // ANÁLISE DE GARGALOS EM EDGES: perf_cost_ms alto
    console.log('[analyzeRoutes] Analisando gargalos em edges...');
    for (const edge of edges) {
      if (edge.perf_cost_ms > 300) {
        const fromNode = nodes.find(n => n.path === edge.from_path);
        const toNode = nodes.find(n => n.path === edge.to_path);
        
        issues.push({
          type: 'performance',
          severity: edge.perf_cost_ms > 500 ? 'high' : 'medium',
          node_path: edge.from_path,
          edge_id: edge.id,
          description: `Transição lenta ${edge.from_path} → ${edge.to_path}: ${edge.perf_cost_ms}ms`,
          evidence: [
            { file: edge.from_path, line: 0, code: `navigate('${edge.to_path}')` }
          ],
          suggested_fix: `
OTIMIZAR TRANSIÇÃO:
1. Prefetch destino: usePrefetchOnHover('${toNode?.path}')
2. Suspense boundary com fallback
3. Preload data crítica antes de navigate
4. Lazy load componentes pesados de "${toNode?.path}"
`.trim(),
          impact: `${edge.count_30d} navegações/mês. Latência total: ${(edge.perf_cost_ms * edge.count_30d / 1000 / 60).toFixed(1)} min/mês desperdiçados`,
          ai_diagnosis: `Gargalo na navegação: ${edge.perf_cost_ms}ms`,
          ai_prompt: `
AÇÃO BASE44 - Otimizar Edge "${edge.from_path} → ${edge.to_path}":
1. Adicionar prefetch on hover:
   <Link to="${toNode?.path}" onMouseEnter={() => prefetch.${toNode?.module}?.()}>
2. Lazy load destino:
   const ${toNode?.path.replace('/', '')} = lazy(() => import('.${toNode?.path}'));
3. Suspense com skeleton:
   <Suspense fallback={<Skeleton />}><${toNode?.path.replace('/', '')} /></Suspense>
`.trim()
        });
      }
    }

    // ANÁLISE DE DROP-OFF: rotas com alta taxa de abandono
    console.log('[analyzeRoutes] Analisando drop-off rates...');
    for (const node of nodes) {
      if (node.drop_off_rate > 20) {
        const incomingEdges = edges.filter(e => e.to_path === node.path);
        const mainEntry = incomingEdges.sort((a, b) => b.count_30d - a.count_30d)[0];
        
        issues.push({
          type: 'ux_issue',
          severity: node.drop_off_rate > 40 ? 'critical' : 'high',
          node_path: node.path,
          description: `Alta taxa de abandono em "${node.path}": ${node.drop_off_rate.toFixed(1)}%`,
          evidence: [
            { file: node.path, line: 0, code: `${node.visits_30d} visitas, ${(node.visits_30d * node.drop_off_rate / 100).toFixed(0)} abandonos` }
          ],
          suggested_fix: `
REDUZIR DROP-OFF (${node.drop_off_rate.toFixed(1)}%):
1. PERFORMANCE: Reduzir TTI ${node.tti_ms}ms → <1000ms
2. UX: Adicionar loading skeleton/progress
3. CONTEÚDO: Breadcrumbs claros (usuário sabe onde está)
4. CTA: Botões primários destacados, next steps óbvios
5. ERROR HANDLING: ErrorBoundary com recovery UI
6. MOBILE: Testar responsividade (50%+ do tráfego)
`.trim(),
          impact: `${(node.visits_30d * node.drop_off_rate / 100).toFixed(0)} usuários/mês abandonam. Estimativa perda: R$ ${(node.visits_30d * node.drop_off_rate / 100 * 97).toFixed(0)}/mês (assumindo R$ 97 LTV)`,
          ai_diagnosis: `Drop-off crítico: ${node.drop_off_rate.toFixed(1)}% dos usuários abandonam`,
          ai_prompt: `
AÇÃO BASE44 - Reduzir Drop-off "${node.path}":
1. IMEDIATO: Adicionar loading state melhor
2. CURTO PRAZO: Otimizar TTI ${node.tti_ms}ms
3. MÉDIO PRAZO: A/B test CTAs
4. LONGO PRAZO: User research (heatmaps, session replay)

CÓDIGO SKELETON:
{isLoading && (
  <div className="animate-pulse space-y-4">
    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
    <div className="h-4 bg-gray-200 rounded w-full"></div>
  </div>
)}
`.trim()
        });
      }
    }

    // PADRÕES DE NAVEGAÇÃO INEFICIENTES: loops desnecessários
    console.log('[analyzeRoutes] Detectando padrões de navegação ineficientes...');
    const navigationPaths = {};
    for (const edge of edges) {
      if (!navigationPaths[edge.from_path]) navigationPaths[edge.from_path] = [];
      navigationPaths[edge.from_path].push({ to: edge.to_path, count: edge.count_30d });
    }
    
    for (const [fromPath, destinations] of Object.entries(navigationPaths)) {
      const backAndForth = destinations.find(d => {
        const reverse = navigationPaths[d.to]?.find(r => r.to === fromPath);
        return reverse && d.count > 10 && reverse.count > 10;
      });
      
      if (backAndForth) {
        issues.push({
          type: 'ux_pattern',
          severity: 'medium',
          node_path: fromPath,
          description: `Padrão vai-volta detectado: ${fromPath} ↔ ${backAndForth.to} (${backAndForth.count} vezes/mês)`,
          evidence: [],
          suggested_fix: `
OTIMIZAR FLUXO:
1. Consolidar ${fromPath} e ${backAndForth.to} em view única com tabs
2. Usar modal/drawer para ação rápida ao invés de navegação completa
3. Manter contexto: preservar scroll/state ao voltar
4. Quick actions: permitir ação direta sem navegar
`.trim(),
          impact: `${backAndForth.count * 2} navegações/mês desnecessárias. ~${(backAndForth.count * 2 * 0.3).toFixed(0)}s/mês desperdiçados`,
          ai_diagnosis: 'Fluxo de navegação ineficiente',
          ai_prompt: `
AÇÃO BASE44 - Otimizar Fluxo "${fromPath} ↔ ${backAndForth.to}":
1. TABS: Consolidar em uma view:
   <Tabs>
     <Tab label="View A" />
     <Tab label="View B" />
   </Tabs>
2. MODAL: Ação quick sem sair da página:
   <SlideInPanel open={showPanel} />
3. STATE: Preservar ao navegar:
   sessionStorage.setItem('scroll', window.scrollY);
`.trim()
        });
      }
    }

    console.log(`[analyzeRoutes] ✅ ${issuesCreated.length} issues detectadas`);

    return Response.json({
      success: true,
      issues: issuesCreated.length,
      breakdown: {
        rota_quebrada: issues.filter(i => i.type === 'rota_quebrada').length,
        orfao: issues.filter(i => i.type === 'orfao').length,
        loop: issues.filter(i => i.type === 'loop').length,
        performance: issues.filter(i => i.type === 'performance').length,
        code_smell: issues.filter(i => i.type === 'code_smell').length,
        n_plus_1: issues.filter(i => i.type === 'n_plus_1').length,
        ux_issue: issues.filter(i => i.type === 'ux_issue').length,
        ux_pattern: issues.filter(i => i.type === 'ux_pattern').length
      },
      critical_count: issues.filter(i => i.severity === 'critical').length,
      estimated_impact: {
        wasted_ms_per_month: issues.reduce((acc, i) => {
          if (i.type === 'performance') {
            const node = nodes.find(n => n.path === i.node_path);
            return acc + ((node?.tti_ms || 0) * (node?.visits_30d || 0));
          }
          return acc;
        }, 0),
        potential_revenue_loss_brl: issues.filter(i => i.type === 'ux_issue').reduce((acc, i) => {
          const node = nodes.find(n => n.path === i.node_path);
          return acc + ((node?.visits_30d || 0) * (node?.drop_off_rate || 0) / 100 * 97);
        }, 0).toFixed(2)
      }
    });

  } catch (error) {
    console.error('[analyzeRoutes] ERRO FATAL:', error);
    return Response.json({ 
      error: error.message, 
      stack: error.stack,
      hint: 'Verifique se scanCodebaseReal foi executado primeiro'
    }, { status: 500 });
  }
});