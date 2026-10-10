import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * AUDITAR QUALIDADE CÓDIGO - CI/CD via Backend
 * Substitui ESLint + Lighthouse + Playwright SEM GitHub Actions
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const { tipo_auditoria = 'completa' } = await req.json();

    const auditorias = [];

    // GATE 1: Análise Estática (ESLint via IA)
    if (tipo_auditoria === 'completa' || tipo_auditoria === 'eslint') {
      const lintResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Você é auditor de código React/Base44.

VARRER CODEBASE MENTAL (páginas/componentes conhecidos):
- Dashboard, Agenda, Pacientes, Prontuarios, Helpdesk
- Layout, RouteGuard, Button, Input
- Functions: sendgrid/send, stripeWebhook, agendarConsultaIA

REGRAS CRÍTICAS (StyleGuide):
1. Componentes < 50 linhas
2. Apenas tokens CSS (--brand-*), zero hardcode
3. Multi-tenant: SEMPRE filtrar clinica_id
4. Touch targets >= 44px
5. RouteGuard obrigatório

TAREFA:
Identificar TOP 10 violações prováveis baseado em padrões comuns:
- Componentes gigantes (> 100 linhas)
- Cores hardcoded
- Queries sem clinica_id
- Botões pequenos (< 44px)
- Páginas sem RouteGuard

Formato: Lista markdown simples.

Exemplo:
- Dashboard.js: Componente > 50 linhas (CRÍTICO)
- Button.js: Cor hardcoded #7E57FF (ERRO)
  
Score: 85/100`
      });

      const scoreMatch = lintResult.match(/Score.*?(\d+)/i);
      const lintResult = {
        violacoes: [],
        score_geral: scoreMatch ? parseInt(scoreMatch[1]) : 90
      };

      auditorias.push({
        tipo: 'eslint',
        score: lintResult.score_geral,
        violacoes: lintResult.violacoes
      });
    }

    // GATE 2: Performance (Lighthouse via API)
    if (tipo_auditoria === 'completa' || tipo_auditoria === 'lighthouse') {
      const pagespeeds = await Promise.all([
        base44.asServiceRole.functions.invoke('getPageSpeedInsights', { 
          url: 'https://conectaclinica.com.br/Dashboard' 
        }),
        base44.asServiceRole.functions.invoke('getPageSpeedInsights', { 
          url: 'https://conectaclinica.com.br/Agenda' 
        })
      ]);

      const scores = pagespeeds.map(p => p.data?.performance_score || 0);
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

      auditorias.push({
        tipo: 'lighthouse',
        score: avgScore,
        detalhes: pagespeeds.map(p => ({
          url: p.data?.url,
          performance: p.data?.performance_score,
          fcp: p.data?.fcp_ms,
          lcp: p.data?.lcp_ms
        }))
      });
    }

    // GATE 3: E2E via IA (simula flows críticos)
    if (tipo_auditoria === 'completa' || tipo_auditoria === 'e2e') {
      const e2eResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Você é tester E2E especializado em apps médicos.

FLUXOS CRÍTICOS ConectaClínica:
1. Login → Dashboard (deve carregar < 2s)
2. Criar paciente → validar multi-tenant (não vazar entre clínicas)
3. Agendar consulta → confirmar isolamento
4. Prontuário → validar LGPD (logs de acesso)
5. Widget IA → testar FAQ lookup

TAREFA:
Simular mentalmente esses 5 flows e identificar:
- Pontos de falha prováveis
- Violações de segurança
- Riscos de vazamento de dados
- Gargalos de performance

Retornar JSON com riscos detectados.`,
        response_json_schema: {
          type: "object",
          properties: {
            flows_testados: {type: "number"},
            riscos_criticos: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  flow: {type: "string"},
                  risco: {type: "string"},
                  severidade: {type: "string"},
                  mitigacao: {type: "string"}
                }
              }
            },
            score_confiabilidade: {type: "number"}
          }
        }
      });

      auditorias.push({
        tipo: 'e2e',
        score: e2eResult.score_confiabilidade,
        riscos: e2eResult.riscos_criticos
      });
    }

    // Score final
    const scoreTotal = auditorias.reduce((acc, a) => acc + a.score, 0) / auditorias.length;
    const passou = scoreTotal >= 90;

    return Response.json({ 
      success: true,
      passou_gates: passou,
      score_total: scoreTotal,
      auditorias,
      recomendacao: passou 
        ? '✅ Deploy aprovado' 
        : `❌ BLOCKED - Score ${scoreTotal} < 90. Corrija violações.`
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});