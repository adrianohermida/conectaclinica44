import React from "react";
import { Button } from "@/components/ui/Button";
import { Download, Copy, FileText } from "lucide-react";
import { toast } from "sonner";

/**
 * EXPORT GLOBAL - TUDO DO MÓDULO EM UM CLIQUE
 * 
 * Gera prompt executável completo:
 * - Diagnóstico brutal
 * - Árvore técnica
 * - Template ideal
 * - Scan código
 * - Sprint breakdown
 * - Todos históricos
 */
export default function ExportModuloCompleto({ item }) {
  const gerarPromptExecutavel = () => {
    const prompt = `
╔═══════════════════════════════════════════════════════════════╗
║  CONECTACLINICA - PROMPT DE EXECUÇÃO COMPLETO                ║
║  Módulo: ${item.modulo}                                      ║
║  Gerado: ${new Date().toISOString()}                         ║
╚═══════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 MISSÃO EXECUTÁVEL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Módulo:** ${item.modulo}
**Funcionalidade:** ${item.funcionalidade}
**Categoria:** ${item.categoria}
**Prioridade:** ${item.prioridade}
**Deadline:** ${item.deadline || 'NÃO DEFINIDO'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 ESTADO ATUAL (SCAN REAL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${item.ultimo_scan_codebase ? `
**Score Real:** ${item.ultimo_scan_codebase.score_real}%
**Evidências Validadas:** ${item.ultimo_scan_codebase.evidencias_validadas}/${item.ultimo_scan_codebase.total_evidencias}

**FALTANDO:**
${JSON.stringify(item.ultimo_scan_codebase.faltando, null, 2)}

**PRÓXIMOS PASSOS:**
${item.ultimo_scan_codebase.proximos_passos?.map((p, i) => `${i+1}. [${p.prioridade.toUpperCase()}] ${p.acao} (${p.estimativa_horas}h)`).join('\n')}
` : 'SCAN NÃO EXECUTADO - Execute "Escanear Código" antes'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌳 ÁRVORE TÉCNICA PROFISSIONAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${item.ultima_arvore_tecnica ? `
**ENTITIES (${item.ultima_arvore_tecnica.entities?.length || 0}):**
${item.ultima_arvore_tecnica.entities?.map(e => `
  ${e.existe ? '✅' : '❌'} ${e.nome}
  Schema: ${e.schema_completo ? 'OK' : 'INCOMPLETO'}
  Índices: ${e.indices_otimizados ? 'OK' : 'FALTANDO'}
  Campos: ${e.campos_principais?.join(', ')}
  ${e.debitos_tecnicos?.length > 0 ? `⚠️  Débitos: ${e.debitos_tecnicos.join('; ')}` : ''}
  💡 ${e.recomendacao}
`).join('\n') || 'Nenhuma entity'}

**FUNCTIONS (${item.ultima_arvore_tecnica.functions?.length || 0}):**
${item.ultima_arvore_tecnica.functions?.map(f => `
  ${f.existe ? '✅' : '❌'} ${f.nome}
  Input: ${f.input_schema}
  Output: ${f.output_schema}
  Integrações: ${f.integracoes_externas?.join(', ') || 'Nenhuma'}
  Performance: ${f.performance_ok ? 'OK' : 'RUIM'}
  Error Handling: ${f.error_handling_ok ? 'OK' : 'FALTANDO'}
  ${f.debitos_tecnicos?.length > 0 ? `⚠️  Débitos: ${f.debitos_tecnicos.join('; ')}` : ''}
  💡 ${f.recomendacao}
`).join('\n') || 'Nenhuma function'}

**PAGES (${item.ultima_arvore_tecnica.pages?.length || 0}):**
${item.ultima_arvore_tecnica.pages?.map(p => `
  ${p.existe ? '✅' : '❌'} ${p.nome}
  Componentes: ${p.componentes_usados?.join(', ')}
  Lazy: ${p.lazy_loaded ? '✅' : '❌'} | Responsive: ${p.responsive ? '✅' : '❌'} | A11y: ${p.acessivel ? '✅' : '❌'}
  ${p.debitos_tecnicos?.length > 0 ? `⚠️  Débitos: ${p.debitos_tecnicos.join('; ')}` : ''}
  💡 ${p.recomendacao}
`).join('\n') || 'Nenhuma page'}

**DÉBITOS TÉCNICOS (${item.ultima_arvore_tecnica.debitos_tecnicos_gerais?.length || 0}):**
${item.ultima_arvore_tecnica.debitos_tecnicos_gerais?.map(d => `
  🔴 [${d.severidade.toUpperCase()}] ${d.categoria}
  ${d.descricao}
  Custo: ${d.custo_resolucao_horas}h | Ganho: ${d.ganho_resolucao}
`).join('\n') || 'Nenhum débito'}

**COMPONENTES REUTILIZÁVEIS:**
${item.ultima_arvore_tecnica.componentes_reutilizaveis?.map(c => `
  ♻️  ${c.componente} - usado em ${c.usado_em.join(', ')}
  Ganho: ${c.ganho_reuso}
`).join('\n') || 'Nenhum'}
` : 'ÁRVORE NÃO GERADA - Execute "Gerar Árvore" antes'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔥 ANÁLISE DE REFATORAMENTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${item.ultima_analise_refatoramento ? `
**ROI Score:** ${item.ultima_analise_refatoramento.roi_score}%
**Recomendação:** ${item.ultima_analise_refatoramento.recomendacao}
**Comentário:** ${item.ultima_analise_refatoramento.comentario_destaque}

**Score:** ${item.ultima_analise_refatoramento.score_atual}% → ${item.ultima_analise_refatoramento.score_esperado}%
**Delta:** +${item.ultima_analise_refatoramento.delta_score}%

**GAPS CRÍTICOS ATUAIS:**
${item.ultima_analise_refatoramento.gaps_atuais?.map((g, i) => `
${i+1}. [${g.severidade.toUpperCase()}] ${g.tipo}
   ${g.descricao}
   Impacto Performance: ${g.impacto_performance || 'N/A'}
   Impacto Segurança: ${g.impacto_seguranca || 'N/A'}
`).join('\n') || 'Nenhum gap crítico'}

**GAPS PAGESPEED (impedem 100/100):**
${item.ultima_analise_refatoramento.pagespeed_gaps_criticos?.map((g, i) => `
${i+1}. [${g.categoria}] ${g.problema}
   Impacto: -${g.impacto_score} pts
   Solução: ${g.solucao}
   Economia: ${g.economia_estimada || 'N/A'}
`).join('\n') || 'Nenhum gap PageSpeed'}

**MÉTRICAS PERFORMANCE ATUAIS:**
- LCP Mobile: ${item.ultima_analise_refatoramento.metricas_performance_atuais?.lcp_mobile_segundos || 'N/A'}s
- LCP Desktop: ${item.ultima_analise_refatoramento.metricas_performance_atuais?.lcp_desktop_segundos || 'N/A'}s
- FCP Mobile: ${item.ultima_analise_refatoramento.metricas_performance_atuais?.fcp_mobile_segundos || 'N/A'}s
- CLS: ${item.ultima_analise_refatoramento.metricas_performance_atuais?.cls_mobile || 'N/A'}
- TBT: ${item.ultima_analise_refatoramento.metricas_performance_atuais?.tbt_mobile_ms || 'N/A'}ms
- Bundle: ${item.ultima_analise_refatoramento.metricas_performance_atuais?.bundle_kb || 'N/A'}kb
- Bundle JS Não Usado: ${item.ultima_analise_refatoramento.metricas_performance_atuais?.bundle_js_nao_usado_kb || 0}kb
- Long Tasks: ${item.ultima_analise_refatoramento.metricas_performance_atuais?.long_tasks_count || 0}
- DOM Elements: ${item.ultima_analise_refatoramento.metricas_performance_atuais?.dom_elements || 'N/A'}

**CONFORMIDADE BASE44:**
- Score Conformidade: ${item.ultima_analise_refatoramento.conformidade_base44?.score_conformidade || 'N/A'}%
- Core Web Vitals: LCP ${item.ultima_analise_refatoramento.conformidade_base44?.core_web_vitals_compliance?.lcp_ok ? '✅' : '❌'} | CLS ${item.ultima_analise_refatoramento.conformidade_base44?.core_web_vitals_compliance?.cls_ok ? '✅' : '❌'} | INP ${item.ultima_analise_refatoramento.conformidade_base44?.core_web_vitals_compliance?.inp_ok ? '✅' : '❌'}
- Recursos Faltando: ${item.ultima_analise_refatoramento.conformidade_base44?.recursos_faltando?.join(', ') || 'Nenhum'}
- Otimizações Faltando: ${item.ultima_analise_refatoramento.conformidade_base44?.otimizacoes_faltando?.join(', ') || 'Nenhuma'}

**TEMPLATE IDEAL:**

ENTITIES (${item.ultima_analise_refatoramento.template_ideal?.entities?.length || 0}):
${item.ultima_analise_refatoramento.template_ideal?.entities?.map(e => `  - ${e.name}: ${e.descricao}
    Campos: ${e.campos_principais?.join(', ')}
    Índices: ${e.indices_necessarios?.join(', ') || 'Padrão'}`).join('\n') || 'Nenhuma'}

FUNCTIONS (${item.ultima_analise_refatoramento.template_ideal?.functions?.length || 0}):
${item.ultima_analise_refatoramento.template_ideal?.functions?.map(f => `  - ${f.name}: ${f.descricao}
    Input: ${f.input_schema}
    Output: ${f.output_schema}
    Integração: ${f.integracao_externa || 'Nenhuma'}`).join('\n') || 'Nenhuma'}

PAGES (${item.ultima_analise_refatoramento.template_ideal?.pages?.length || 0}):
${item.ultima_analise_refatoramento.template_ideal?.pages?.map(p => `  - ${p.name}
    Componentes: ${p.componentes?.join(', ')}
    Hooks: ${p.hooks?.join(', ')}
    Lazy: ${p.lazy_loaded ? '✅' : '❌'}`).join('\n') || 'Nenhuma'}

**PERFORMANCE TARGETS (PageSpeed 100/100):**
- LCP Mobile: < ${item.ultima_analise_refatoramento.template_ideal?.performance_targets?.lcp_mobile_segundos || 2.5}s
- LCP Desktop: < ${item.ultima_analise_refatoramento.template_ideal?.performance_targets?.lcp_desktop_segundos || 1.3}s
- FCP Mobile: < ${item.ultima_analise_refatoramento.template_ideal?.performance_targets?.fcp_mobile_segundos || 1.8}s
- CLS: < ${item.ultima_analise_refatoramento.template_ideal?.performance_targets?.cls_score || 0.01}
- TBT: < ${item.ultima_analise_refatoramento.template_ideal?.performance_targets?.tbt_ms || 150}ms
- Bundle JS: < ${item.ultima_analise_refatoramento.template_ideal?.performance_targets?.bundle_js_kb || 300}kb
- Cache TTL: ${Math.round((item.ultima_analise_refatoramento.template_ideal?.performance_targets?.cache_ttl_segundos || 31536000) / 86400)}d
- DOM Max: < ${item.ultima_analise_refatoramento.template_ideal?.performance_targets?.dom_max_nodes || 1500}
- Long Tasks: ${item.ultima_analise_refatoramento.template_ideal?.performance_targets?.long_tasks_max || 0}

**RECURSOS BASE44 (${Object.keys(item.ultima_analise_refatoramento.template_ideal?.recursos_base44 || {}).length} critérios):**
${Object.entries(item.ultima_analise_refatoramento.template_ideal?.recursos_base44 || {}).map(([k, v]) => `  ${v ? '✅' : '❌'} ${k}`).join('\n') || 'Checklist não disponível'}

**TESTES E2E OBRIGATÓRIOS:**
${item.ultima_analise_refatoramento.template_ideal?.testes_e2e?.map((t, i) => `${i+1}. ${t}`).join('\n') || 'Nenhum teste definido'}

**CUSTO vs GANHO:**

CUSTO:
- Horas: ${item.ultima_analise_refatoramento.custo_refatoramento?.horas_estimadas || 'N/A'}h
- Risco Bugs: ${item.ultima_analise_refatoramento.custo_refatoramento?.risco_introducao_bugs || 'N/A'}
- Complexidade: ${item.ultima_analise_refatoramento.custo_refatoramento?.complexidade || 'N/A'}

GANHO:
- Latência: -${item.ultima_analise_refatoramento.ganhos_esperados?.reducao_latencia_ms || 0}ms
- Bundle: -${item.ultima_analise_refatoramento.ganhos_esperados?.reducao_bundle_kb || 0}kb
- LCP: -${item.ultima_analise_refatoramento.ganhos_esperados?.reducao_lcp_seconds || 0}s
- CLS: -${item.ultima_analise_refatoramento.ganhos_esperados?.melhoria_cls || 0}
- Manutenibilidade: +${item.ultima_analise_refatoramento.ganhos_esperados?.ganho_manutenibilidade || 0}%
- Escalabilidade: +${item.ultima_analise_refatoramento.ganhos_esperados?.ganho_escalabilidade || 0}%
- Redução Bugs: -${item.ultima_analise_refatoramento.ganhos_esperados?.reducao_bugs_futuras_percent || 0}%

**COMPONENTES REUTILIZÁVEIS (código real):**
${item.ultima_analise_refatoramento.componentes_reutilizaveis?.map(c => `  - ${c.componente} (usado em ${c.usado_em_quantos_modulos}x módulos)
    Ganho: ${c.ganho_reuso}
    Localização: ${c.localizacao_atual}`).join('\n') || 'Nenhum identificado'}

**JUSTIFICATIVA BRUTAL:**
${item.ultima_analise_refatoramento.justificativa_brutal || 'N/A'}

**PROS REFATORAMENTO:**
${item.ultima_analise_refatoramento.pros_refatoramento?.map((p, i) => `${i+1}. ${p}`).join('\n') || 'Nenhum'}

**CONTRAS REFATORAMENTO:**
${item.ultima_analise_refatoramento.contras_refatoramento?.map((c, i) => `${i+1}. ${c}`).join('\n') || 'Nenhum'}
` : 'ANÁLISE NÃO EXECUTADA - Execute "Analisar Refatoramento" antes'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 SPRINT BREAKDOWN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${item.ultimo_sprint_breakdown ? `
**Estimativa Total:** ${item.ultimo_sprint_breakdown.estimativa_total_horas}h
**Total Tarefas:** ${item.ultimo_sprint_breakdown.total_tarefas}
**Complexidade:** ${item.ultimo_sprint_breakdown.complexidade}

**TAREFAS ATÔMICAS:**
${item.ultimo_sprint_breakdown.tarefas?.map((t, i) => `
${t.ordem}. [${t.tipo.toUpperCase()}] ${t.titulo} (${t.estimativa_horas}h)
   ${t.descricao}
   Critérios: ${t.criterios_aceite?.join('; ')}
   Arquivos: ${t.arquivos_afetados?.join(', ')}
   ${t.bloqueadores?.length > 0 ? `Bloqueadores: ${t.bloqueadores.join(', ')}` : ''}
`).join('\n')}

**RISCOS:**
${item.ultimo_sprint_breakdown.riscos_principais?.map((r, i) => `${i+1}. ${r}`).join('\n')}

**DEPENDÊNCIAS:**
${item.ultimo_sprint_breakdown.dependencias_principais?.map((d, i) => `${i+1}. ${d}`).join('\n')}
` : 'BREAKDOWN NÃO GERADO - Execute "Gerar Breakdown" antes'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 RECURSOS BASE44 (Boas Práticas)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${item.ultimo_audit_recursos ? `
**Score Recursos Base44:** ${item.ultimo_audit_recursos.score_geral}%

**DETALHAMENTO:**
- Visual Edit: ${item.ultimo_audit_recursos.recursos?.visual_edit || 0}%
- AI Controls: ${item.ultimo_audit_recursos.recursos?.ai_controls || 0}%
- Responsividade: ${item.ultimo_audit_recursos.recursos?.responsividade || 0}%
- Acessibilidade: ${item.ultimo_audit_recursos.recursos?.acessibilidade || 0}%
- Performance: ${item.ultimo_audit_recursos.recursos?.performance || 0}%

**GAPS CRÍTICOS (Base44):**
${item.ultimo_audit_recursos.gaps_criticos?.map((g, i) => `${i+1}. ${g}`).join('\n') || 'Nenhum'}

**MELHORIAS PRIORITÁRIAS:**
${item.ultimo_audit_recursos.melhorias_prioritarias?.map((m, i) => `${i+1}. ${m}`).join('\n') || 'Nenhuma'}
` : 'AUDITORIA NÃO EXECUTADA - Execute "Auditar Recursos" antes'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 DIFF CODEBASE (Impacto Real)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${item.ultimo_diff_codebase ? `
**IMPACTO:**
- Entities: ${item.ultimo_diff_codebase.antes?.entities || 0} → ${item.ultimo_diff_codebase.depois?.entities || 0} (+${(item.ultimo_diff_codebase.depois?.entities || 0) - (item.ultimo_diff_codebase.antes?.entities || 0)})
- Pages: ${item.ultimo_diff_codebase.antes?.pages || 0} → ${item.ultimo_diff_codebase.depois?.pages || 0} (+${(item.ultimo_diff_codebase.depois?.pages || 0) - (item.ultimo_diff_codebase.antes?.pages || 0)})
- Functions: ${item.ultimo_diff_codebase.antes?.functions || 0} → ${item.ultimo_diff_codebase.depois?.functions || 0} (+${(item.ultimo_diff_codebase.depois?.functions || 0) - (item.ultimo_diff_codebase.antes?.functions || 0)})
- Components: ${item.ultimo_diff_codebase.antes?.components || 0} → ${item.ultimo_diff_codebase.depois?.components || 0} (+${(item.ultimo_diff_codebase.depois?.components || 0) - (item.ultimo_diff_codebase.antes?.components || 0)})

**ARQUIVOS CRIADOS:**
${item.ultimo_diff_codebase.arquivos_criados?.map((a, i) => `${i+1}. ${a}`).join('\n') || 'Nenhum'}

**BUNDLE IMPACT:** +${item.ultimo_diff_codebase.bundle_impact_estimado_kb || 0}kb
**QUERIES SQL:** +${item.ultimo_diff_codebase.queries_sql_adicionadas || 0}

**BLOQUEADORES:**
${item.ultimo_diff_codebase.bloqueadores_identificados?.map((b, i) => `${i+1}. ${b}`).join('\n') || 'Nenhum'}

**DEPENDÊNCIAS:**
${item.ultimo_diff_codebase.dependencias_identificadas?.map((d, i) => `${i+1}. ${d}`).join('\n') || 'Nenhuma'}
` : 'DIFF NÃO CALCULADO - Execute "Calcular Diff" antes'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ EVIDÊNCIAS DECLARADAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${item.evidencias?.map((e, i) => `${i+1}. ${e}`).join('\n') || 'Nenhuma evidência'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔑 REQUISITOS EXTERNOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${item.requisitos_externos?.map((r, i) => `${i+1}. ${r}`).join('\n') || 'Nenhum requisito'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 HISTÓRICO DE ANÁLISES (${item.historico_analises?.length || 0})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${item.historico_analises?.map((h, i) => `
[${h.timestamp}] ${h.tipo}
${JSON.stringify(h.resultado, null, 2)}
`).join('\n---\n') || 'Sem histórico'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 BLOQUEADORES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${item.bloqueadores?.map((b, i) => `${i+1}. ${b}`).join('\n') || 'Nenhum bloqueador'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ PROMPT DE EXECUÇÃO PARA BASE44
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Você é o Base44, melhor agente de desenvolvimento do mundo.

IMPLEMENTE O MÓDULO "${item.modulo}" com estas especificações EXATAS:

**1. ENTITIES (criar schemas JSON completos):**
${item.ultima_analise_refatoramento?.template_ideal?.entities?.map(e => `
   - entities/${e.name}.json
     ${e.descricao}
     Campos: ${e.campos_principais?.join(', ')}
     Índices: ${e.indices_necessarios?.join(', ') || 'Padrão (created_date, updated_date)'}
`).join('\n') || item.evidencias?.filter(e => e.includes('entities/')).join('\n   - ') || 'Nenhuma entity'}

**2. BACKEND FUNCTIONS:**
${item.ultima_analise_refatoramento?.template_ideal?.functions?.map(f => `
   - functions/${f.name}.js
     ${f.descricao}
     Input: ${f.input_schema}
     Output: ${f.output_schema}
     ${f.integracao_externa ? `Integração: ${f.integracao_externa}` : ''}
     Performance: < 200ms P95
     Error handling: OBRIGATÓRIO
`).join('\n') || item.evidencias?.filter(e => e.includes('functions/')).join('\n   - ') || 'Nenhuma function'}

**3. FRONTEND (Pages + Components):**
${item.ultima_analise_refatoramento?.template_ideal?.pages?.map(p => `
   - pages/${p.name}.jsx
     Componentes: ${p.componentes?.join(', ')}
     Hooks: ${p.hooks?.join(', ')}
     Lazy: ${p.lazy_loaded ? 'SIM' : 'IMPLEMENTAR'}
     OBRIGATÓRIO: Responsive mobile-first, WCAG AA, < 300 linhas
`).join('\n') || item.evidencias?.filter(e => e.includes('pages/')).join('\n   - ') || 'Nenhuma page'}

${item.ultima_arvore_tecnica?.components?.filter(c => !c.existe).length > 0 ? `
**COMPONENTS FALTANTES:**
${item.ultima_arvore_tecnica.components.filter(c => !c.existe).map(c => `
   - components/${c.nome}
     ${c.recomendacao}
     Ganho Reuso: ${c.ganho_reuso_estimado_horas}h
`).join('\n')}
` : ''}

**4. DEFINITION OF DONE (OBRIGATÓRIO):**
${item.ultima_analise_refatoramento?.template_ideal?.testes_e2e?.map((t, i) => `   ${i+1}. ${t}`).join('\n') ||
  item.definition_of_done?.map((d, i) => `   ${i+1}. ${d}`).join('\n') ||
  `   1. Testes E2E para fluxos críticos passando
   2. PageSpeed 100/100 mobile + desktop
   3. Bundle < 300kb (zero unused code)
   4. Zero erros console
   5. WCAG AA compliance (contraste 4.5:1, touch 44px, ARIA)
   6. Todas evidências validadas (scan 100%)`}

**5. PERFORMANCE TARGETS (PageSpeed 100/100):**
${item.ultima_analise_refatoramento?.template_ideal?.performance_targets ? `
   - LCP Mobile: < ${item.ultima_analise_refatoramento.template_ideal.performance_targets.lcp_mobile_segundos}s
   - LCP Desktop: < ${item.ultima_analise_refatoramento.template_ideal.performance_targets.lcp_desktop_segundos}s
   - FCP Mobile: < ${item.ultima_analise_refatoramento.template_ideal.performance_targets.fcp_mobile_segundos}s
   - CLS: < ${item.ultima_analise_refatoramento.template_ideal.performance_targets.cls_score}
   - TBT: < ${item.ultima_analise_refatoramento.template_ideal.performance_targets.tbt_ms}ms
   - Bundle JS: < ${item.ultima_analise_refatoramento.template_ideal.performance_targets.bundle_js_kb}kb
   - Bundle CSS: < ${item.ultima_analise_refatoramento.template_ideal.performance_targets.bundle_css_kb || 50}kb
   - Cache TTL: ${Math.round(item.ultima_analise_refatoramento.template_ideal.performance_targets.cache_ttl_segundos / 86400)}d
   - DOM Max: < ${item.ultima_analise_refatoramento.template_ideal.performance_targets.dom_max_nodes}
   - Long Tasks: ${item.ultima_analise_refatoramento.template_ideal.performance_targets.long_tasks_max}
   - Zero unused code (tree shaking + code splitting)
   - Preconnect: base44.app + CDNs críticos
   - Touch targets: ≥ 44px
   - Contraste: ≥ 4.5:1
` : `
   - LCP Mobile: < 2.5s
   - LCP Desktop: < 1.3s
   - FCP: < 1.8s
   - CLS: < 0.01
   - TBT: < 150ms
   - Bundle JS: < 300kb
   - Cache TTL: 1 ano (assets)
   - Zero unused code
   - Preconnect: base44.app
   - Touch targets: ≥ 44px
   - Contraste: ≥ 4.5:1
`}

**6. REQUISITOS EXTERNOS:**
${item.requisitos_externos?.map((r, i) => `   ${i+1}. ${r}`).join('\n') || 'Nenhum'}

**7. BLOQUEADORES A RESOLVER:**
${item.bloqueadores?.map((b, i) => `   ${i+1}. ${b}`).join('\n') || 
  item.ultimo_diff_codebase?.bloqueadores_identificados?.map((b, i) => `   ${i+1}. ${b}`).join('\n') || 
  'Nenhum'}

**8. GAPS CRÍTICOS (RESUMO):**
${item.ultima_analise_refatoramento?.gaps_atuais?.filter(g => g.severidade === 'critica').map((g, i) => `   ${i+1}. [${g.tipo}] ${g.descricao}`).join('\n') || 'Nenhum gap crítico'}

**9. DÉBITOS TÉCNICOS (ALTA SEVERIDADE):**
${item.ultima_arvore_tecnica?.debitos_tecnicos_gerais?.filter(d => d.severidade === 'alta' || d.severidade === 'critica').map((d, i) => `   ${i+1}. [${d.categoria}] ${d.descricao} - ${d.custo_resolucao_horas}h`).join('\n') || 'Nenhum'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 ORDEM DE EXECUÇÃO (SPRINT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${item.ultimo_sprint_breakdown?.tarefas?.map((t, i) => `
${t.ordem}. ${t.titulo} (${t.estimativa_horas}h)
   Tipo: ${t.tipo}
   Critérios: ${t.criterios_aceite?.join('; ')}
   Arquivos: ${t.arquivos_afetados?.join(', ')}
`).join('\n') || `
1. Criar entities/${item.modulo}.json com índices otimizados
2. Implementar functions/ com I/O validado e error handling
3. Criar pages/ com lazy loading e responsive
4. Componentizar (< 200 linhas por arquivo)
5. Testes E2E
6. Validar PageSpeed 100/100
`}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💀 REGRAS BRUTAIS (NÃO NEGOCIÁVEIS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. ZERO arquivos > 300 linhas (componentizar)
2. LAZY LOADING obrigatório (pages, images, components below fold)
3. Responsive FIRST (mobile 375px → desktop 1920px)
4. WCAG AA compliance (contraste 4.5:1, touch 44px, ARIA)
5. Performance: LCP < 2.5s, Bundle < 300kb, zero unused code
6. Error handling em TODAS functions
7. Loading states em TODAS mutations
8. Toast feedback em TODAS ações
9. Índices otimizados em TODAS entities
10. Cache TTL 1 ano (assets hashed)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ CRITÉRIOS DE ACEITE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- [ ] Todas evidências validadas (scan 100%)
- [ ] PageSpeed 100/100 mobile + desktop
- [ ] Zero erros console
- [ ] Zero débitos técnicos críticos
- [ ] Testes E2E passando
- [ ] Componentes < 200 linhas
- [ ] Bundle < 300kb
- [ ] WCAG AA compliance

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**COMECE PELA TAREFA #1. Não avance sem validar anterior.**
`;

    return prompt;
  };

  const gerarPromptPorSprint = (numeroSprint) => {
    const tarefas = item.ultimo_sprint_breakdown?.tarefas || [];
    const tarefaSprint = tarefas[numeroSprint - 1];
    if (!tarefaSprint) return null;

    return `
╔═══════════════════════════════════════════════════════════════╗
║  SPRINT ${numeroSprint}/${tarefas.length} - ${item.modulo}
║  Tarefa: ${tarefaSprint.titulo}
║  Estimativa: ${tarefaSprint.estimativa_horas}h
╚═══════════════════════════════════════════════════════════════╝

🎯 TAREFA ATÔMICA:

**Tipo:** ${tarefaSprint.tipo}
**Título:** ${tarefaSprint.titulo}
**Descrição:** ${tarefaSprint.descricao}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ CRITÉRIOS DE ACEITE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${tarefaSprint.criterios_aceite?.map((c, i) => `${i+1}. ${c}`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 ARQUIVOS AFETADOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${tarefaSprint.arquivos_afetados?.map((a, i) => `${i+1}. ${a}`).join('\n')}

${tarefaSprint.bloqueadores?.length > 0 ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 BLOQUEADORES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${tarefaSprint.bloqueadores.map((b, i) => `${i+1}. ${b}`).join('\n')}
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ PROMPT DE EXECUÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Você é o Base44, melhor agente de desenvolvimento do mundo.

EXECUTE A TAREFA "${tarefaSprint.titulo}" com estas especificações:

**ARQUIVOS:**
${tarefaSprint.arquivos_afetados?.map(a => `- ${a}`).join('\n')}

**CRITÉRIOS DE ACEITE (VALIDAÇÃO OBRIGATÓRIA):**
${tarefaSprint.criterios_aceite?.map((c, i) => `${i+1}. ${c}`).join('\n')}

**PERFORMANCE TARGETS:**
- LCP Mobile: < 2.5s
- Bundle: < 300kb
- Zero erros console
- WCAG AA compliance

**AO CONCLUIR:**
1. Execute "Escanear Código" para validar evidências
2. Confirme TODOS critérios de aceite antes de avançar
3. NÃO avance para Sprint ${numeroSprint + 1} sem validação 100%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**PROGRESSO:** Sprint ${numeroSprint}/${tarefas.length} (${Math.round((numeroSprint / tarefas.length) * 100)}%)
`;
  };

  const copiarPrompt = () => {
    const prompt = gerarPromptExecutavel();
    navigator.clipboard.writeText(prompt);
    toast.success('📋 Prompt executável copiado - Cole no Base44');
  };

  const copiarSprintAtual = () => {
    const sprint1 = gerarPromptPorSprint(1);
    if (!sprint1) {
      toast.error('Sprint breakdown não disponível');
      return;
    }
    navigator.clipboard.writeText(sprint1);
    toast.success('📋 Sprint 1 copiado - Execute e valide antes de avançar');
  };

  const baixarMarkdown = () => {
    const prompt = gerarPromptExecutavel();
    const blob = new Blob([prompt], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.modulo.replace(/\s/g, '_')}_execucao_completa.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('📥 Markdown baixado');
  };

  const copiarJSON = () => {
    const json = {
      modulo: item.modulo,
      funcionalidade: item.funcionalidade,
      status: item.status,
      deadline: item.deadline,
      evidencias: item.evidencias,
      requisitos_externos: item.requisitos_externos,
      bloqueadores: item.bloqueadores,
      definition_of_done: item.definition_of_done,
      scan_codebase: item.ultimo_scan_codebase,
      arvore_tecnica: item.ultima_arvore_tecnica,
      analise_refatoramento: item.ultima_analise_refatoramento,
      sprint_breakdown: item.ultimo_sprint_breakdown,
      historico_analises: item.historico_analises
    };
    
    navigator.clipboard.writeText(JSON.stringify(json, null, 2));
    toast.success('JSON completo copiado');
  };

  // Verificar completude (pelo menos scan + evidências)
  const temScan = !!item.ultimo_scan_codebase;
  const temEvidencias = item.evidencias && item.evidencias.length > 0;
  const dataMinima = temScan && temEvidencias;

  return (
    <div className="p-4 rounded-lg border-4 border-indigo-400 bg-indigo-50">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-bold text-lg mb-1">📦 Export Executável</h3>
          <p className="text-sm text-gray-600">
            {dataMinima 
              ? 'Prompt pronto (baseado em scan + evidências)' 
              : '⚠️ Execute "Escanear Código" antes'}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {/* Sprint-by-Sprint (RECOMENDADO) */}
        <div className="p-3 bg-green-50 border-2 border-green-400 rounded-lg">
          <p className="text-xs font-bold text-green-800 mb-2">✅ EXECUÇÃO POR SPRINT (Recomendado)</p>
          <Button 
            onClick={copiarSprintAtual} 
            className="w-full bg-green-600"
            disabled={!item.ultimo_sprint_breakdown}
          >
            <Copy className="w-4 h-4 mr-2" />
            Copiar Sprint 1 (Validável)
          </Button>
          <p className="text-xs text-green-700 mt-2">
            Valida conclusão antes de avançar. Evita retrabalho.
          </p>
        </div>

        {/* Prompt Completo (fallback) */}
        <div className="grid grid-cols-3 gap-2">
          <Button 
            onClick={copiarPrompt} 
            className="bg-indigo-600"
            disabled={!dataMinima}
          >
            <Copy className="w-4 h-4 mr-2" />
            Prompt Completo
          </Button>
          <Button 
            onClick={baixarMarkdown}
            className="bg-gray-600"
            disabled={!dataMinima}
          >
            <Download className="w-4 h-4 mr-2" />
            Baixar MD
          </Button>
          <Button 
            onClick={copiarJSON}
            variant="outline"
            disabled={!dataMinima}
          >
            <FileText className="w-4 h-4 mr-2" />
            JSON
          </Button>
        </div>
      </div>

      {!dataMinima && (
        <div className="mt-3 p-3 bg-yellow-50 rounded border border-yellow-300">
          <p className="text-xs text-yellow-800 font-bold">
            ⚠️ {!temScan && 'Execute "Escanear Código"'} {!temEvidencias && 'Adicione evidências'}
          </p>
        </div>
      )}
    </div>
  );
}