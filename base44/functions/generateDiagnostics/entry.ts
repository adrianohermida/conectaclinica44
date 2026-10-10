import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * IA Engine v2 - Gera diagnósticos ACIONÁVEIS com prompts Base44
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { issue_ids } = await req.json();

    if (!issue_ids || !Array.isArray(issue_ids)) {
      return Response.json({ error: 'issue_ids required' }, { status: 400 });
    }

    console.log(`[generateDiagnostics] Analisando ${issue_ids.length} issues...`);

    const diagnostics = [];
    
    for (const issueId of issue_ids) {
      const issue = await base44.asServiceRole.entities.RouteIssue.filter({ id: issueId }).then(r => r[0]);
      
      if (!issue) continue;

      const diagnosis = await analyzeIssueWithIA(issue, base44);
      diagnostics.push(diagnosis);
    }

    return Response.json({
      success: true,
      diagnostics,
      summary: {
        total: diagnostics.length,
        critical: diagnostics.filter(d => d.severity === 'critical').length,
        estimated_hours: diagnostics.reduce((sum, d) => sum + (d.estimated_hours || 0), 0)
      }
    });

  } catch (error) {
    console.error('[generateDiagnostics] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function analyzeIssueWithIA(issue, base44) {
  const templates = {
    'rota_quebrada': {
      title: '🔴 Rota Quebrada',
      prompt: `CORRIGIR ROTA QUEBRADA:

Problema: Link quebrado ${issue.node_path} → destino inexistente

Arquivo: pages${issue.node_path}.jsx

Ações:
1. Verificar se destino existe (verificar pages/)
2. Se não existe: criar página destino OU remover link
3. Se existe: corrigir typo no createPageUrl()

Prompt Base44:
"Analisar página ${issue.node_path} e verificar links quebrados. Corrigir ou remover links para rotas inexistentes. Validar todos os createPageUrl() e <Link to={}> na página."

Estimativa: 10min
`,
      estimated_hours: 0.17,
      priority: 'urgent'
    },
    'loop': {
      title: '🔄 Loop Detectado',
      prompt: `ELIMINAR LOOP DE NAVEGAÇÃO:

Problema: ${issue.description}

Loop: ${issue.evidence?.map(e => e.file).join(' → ')}

Ações:
1. Identificar ponto de quebra do loop
2. Adicionar guard ou remover link redundante
3. Validar com teste manual

Prompt Base44:
"Refatorar navegação para eliminar loop: ${issue.evidence?.map(e => e.file).join(' → ')}. Adicionar guards ou remover links redundantes."

Estimativa: 20min
`,
      estimated_hours: 0.33,
      priority: 'high'
    },
    'performance': {
      title: '⚡ Performance Crítica',
      prompt: `OTIMIZAR PERFORMANCE:

Problema: ${issue.description}
Score atual: ${issue.evidence?.[0]?.score || 'N/A'}

Ações:
1. Adicionar lazy loading
2. Otimizar queries (batch, prefetch)
3. Cachear dados pesados
4. Code splitting se >100KB

Prompt Base44:
"Otimizar performance de ${issue.node_path}:
- Adicionar Suspense + lazy()
- Prefetch queries críticas
- Cache com staleTime adequado
Meta: P95 < 200ms"

Estimativa: 30min
`,
      estimated_hours: 0.5,
      priority: 'medium'
    },
    'n_plus_1': {
      title: '🐌 N+1 Queries',
      prompt: `RESOLVER N+1:

Problema: ${issue.description}

Ações:
1. Identificar queries em loop
2. Batch com Promise.all ou bulkFetch
3. Adicionar prefetch
4. Validar com QueryPerformanceMonitor

Prompt Base44:
"Refatorar queries em ${issue.node_path} para eliminar N+1. Usar Promise.all para queries paralelas e prefetchQueries para dados previsíveis."

Estimativa: 45min
`,
      estimated_hours: 0.75,
      priority: 'high'
    }
  };

  const template = templates[issue.type] || {
    title: `📋 ${issue.type}`,
    prompt: `Analisar issue: ${issue.description}`,
    estimated_hours: 1,
    priority: 'medium'
  };

  return {
    issue_id: issue.id,
    type: issue.type,
    severity: issue.severity,
    ...template,
    evidence: issue.evidence,
    ai_confidence: 0.85
  };
}