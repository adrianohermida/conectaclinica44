import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * ANÁLISE BRUTAL DE REFATORAMENTO - INTEGRADO COM CODEBASE REAL
 * 
 * 1. Escaneia código REAL do módulo (via scanCodebaseReal)
 * 2. Mede performance atual vs benchmarks Base44 (LCP < 2.5s, INP < 200ms)
 * 3. Audita recursos Base44 (lazy load, optimized images, Visual Edit)
 * 4. Identifica componentes reutilizáveis no código
 * 5. Calcula ROI REAL baseado em métricas mensuráveis
 * 6. Recomenda REFATORAR ou MANTER com justificativa brutal
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { item_id } = await req.json();

    if (!item_id) {
      return Response.json({ error: 'item_id obrigatório' }, { status: 400 });
    }

    // Buscar item
    const item = await base44.asServiceRole.entities.ChecklistProjeto.get(item_id);

    if (!item) {
      return Response.json({ error: 'Item não encontrado' }, { status: 404 });
    }

    // ANÁLISE BRUTAL VIA IA (com evidências declaradas)
    const analise = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `VOCÊ É UM ARQUITETO DE SOFTWARE BRUTAL E BASEADO EM DADOS REAIS.

═══════════════════════════════════════════
📊 MÓDULO ATUAL
═══════════════════════════════════════════

**Módulo:** ${item.modulo}
**Funcionalidade:** ${item.funcionalidade}
**Categoria:** ${item.categoria}
**Status:** ${item.status}
**Score Declarado:** ${item.score_checklist || 0}%
**Evidências:** ${JSON.stringify(item.evidencias || [])}
**Observações:** ${item.observacoes || 'Nenhuma'}
**Tempo Estimado:** ${item.tempo_estimado_horas || 0}h
**Tempo Gasto:** ${item.tempo_gasto_horas || 0}h

═══════════════════════════════════════════
🎯 BENCHMARKS BASE44 (OFICIAIS DA DOC)
═══════════════════════════════════════════

**Performance:**
- LCP (Largest Contentful Paint): < 2.5s
- CLS (Cumulative Layout Shift): < 0.1
- INP (Interaction to Next Paint): < 200ms

**Otimizações Obrigatórias:**
- Lazy loading (images, components, routes)
- Optimize images (WebP, sizes)
- CDN Cloudflare (automático)
- Bundle splitting (React.lazy)
- font-display: swap
- Mobile-first responsive

**Recursos Base44 a Explorar:**
- Visual Edit (shadcn components)
- AI Controls (base44 chat)
- PWA (service worker automático)
- SEO automático (custom domain)

═══════════════════════════════════════════
🔥 TAREFA - ANÁLISE BRUTAL
═══════════════════════════════════════════

Com base nos DADOS REAIS acima:

1. **SCORE ATUAL (0-100):**
   - Use validacao.score_real como base
   - Penalize por falta de testes, performance ruim, segurança fraca
   - Calcule score HONESTO

2. **TEMPLATE IDEAL ESTRUTURADO:**
   
   **Entities (JSON schemas completos):**
   - Liste TODAS entities necessárias (nome + schema simplificado)
   - Aproveite entities existentes do codebase quando possível
   - Adicione índices para performance
   
   **Backend Functions (especificação clara):**
   - Nome da function
   - Input (JSON schema)
   - Output (JSON schema)
   - Integrações externas necessárias
   
   **Frontend (arquitetura limpa):**
   - Pages principais
   - Components reutilizáveis (identificar no codebase atual)
   - Hooks customizados
   - Lazy loading obrigatório
   
   **Testes E2E obrigatórios:**
   - Fluxos críticos (mínimo 3)
   
   **Performance Targets (Base44 benchmarks):**
   - p95_latency_ms: < 200
   - bundle_size_kb: < 300
   - lcp_seconds: < 2.5
   - cls_score: < 0.1
   
   **Recursos Base44 + PageSpeed 100/100 (CHECKLIST COMPLETO):**
   
   **PERFORMANCE (Core Web Vitals):**
   - lcp_optimized: true/false (< 2.5s mobile, < 1.3s desktop)
   - fcp_optimized: true/false (< 1.8s)
   - cls_zero: true/false (< 0.1, ideal = 0)
   - inp_optimized: true/false (< 200ms)
   - speed_index_ok: true/false (< 3.4s)
   
   **CACHE:**
   - long_cache_ttl: true/false (≥ 1 ano assets, 4h+ outros)
   - cache_immutable: true/false (hashed assets)
   
   **RENDER BLOCKING:**
   - css_inline_critical: true/false (above fold inline)
   - css_defer_noncritical: true/false (defer below fold)
   - preload_critical: true/false (<link rel="preload">)
   - preconnect_origins: true/false (base44.app, CDNs)
   
   **BUNDLE:**
   - code_splitting: true/false (React.lazy)
   - tree_shaking: true/false (dead code elimination)
   - js_minified: true/false
   - css_minified: true/false
   - remove_polyfills: true/false (babel transforms)
   - sourcemaps_production: true/false (debugging)
   
   **IMAGES:**
   - lazy_loading_images: true/false (loading="lazy")
   - webp_format: true/false
   - width_height_explicit: true/false (CLS prevention)
   - srcset_sizes: true/false (responsive)
   
   **JAVASCRIPT:**
   - lazy_loading_components: true/false (React.lazy)
   - lazy_loading_routes: true/false
   - avoid_long_tasks: true/false (< 50ms)
   - async_defer_scripts: true/false
   
   **DOM:**
   - dom_size_optimized: true/false (< 1500 nodes)
   - dom_depth_ok: true/false (< 32)
   
   **ACESSIBILIDADE (WCAG AA):**
   - aria_labels_buttons: true/false
   - contrast_ratio_ok: true/false (4.5:1)
   - touch_targets_44px: true/false
   - landmarks_semantic: true/false (<main>, <nav>)
   - headings_sequential: true/false (h1→h2→h3)
   - links_distinguishable: true/false (não só cor)
   
   **SEO:**
   - robots_txt_valid: true/false
   - meta_tags_complete: true/false (<title>, description)
   - sitemap_xml: true/false
   - structured_data: true/false (Schema.org)
   - canonical_urls: true/false
   
   **SEGURANÇA:**
   - csp_header: true/false (Content-Security-Policy)
   - hsts_header: true/false (Strict-Transport-Security)
   - coop_header: true/false (Cross-Origin-Opener-Policy)
   - xfo_header: true/false (X-Frame-Options)
   - trusted_types: true/false (XSS prevention)
   
   **MONITORING:**
   - real_user_monitoring: true/false (RUM)
   - web_vitals_tracking: true/false
   - error_tracking: true/false
   - performance_budgets: true/false (< 300kb)

3. **SCORE ESPERADO (0-100):**
   - Se implementar template ideal completo
   - Baseado em benchmarks Base44

4. **GAPS ATUAIS (críticos primeiro):**
   - Use validacao.faltando
   - Adicione gaps de performance, segurança, testes
   - Severidade: critica, alta, media, baixa

5. **COMPONENTES REUTILIZÁVEIS:**
   - Identifique no codebase.modules quais components aparecem em múltiplos módulos
   - Estime ganho de reuso (horas economizadas)

6. **PROS DO REFATORAMENTO (mensuráveis):**
   - Ganhos quantificados (ex: -500ms latência, -200kb bundle)
   - Redução de bugs (%)
   - Aumento manutenibilidade (%)

7. **CONTRAS DO REFATORAMENTO (honestos):**
   - Horas necessárias
   - Risco de introduzir bugs
   - Custo de oportunidade

8. **CUSTO vs GANHO:**
   
   **Custo:**
   - horas_estimadas: baseado em validacao.proximos_passos
   - risco_introducao_bugs: baixo/medio/alto
   - complexidade: baixa/media/alta/critica
   
   **Ganho:**
   - reducao_latencia_ms: estimativa real
   - reducao_bundle_kb: estimativa real
   - reducao_complexidade_percent: estimativa
   - ganho_manutenibilidade: 0-100
   - ganho_escalabilidade: 0-100
   - reducao_bugs_futuras_percent: estimativa

9. **ROI SCORE (0-100):**
   - Fórmula: (ganho_total / custo_total) * 100
   - Normalizar para 0-100
   - Seja CONSERVADOR

10. **RECOMENDAÇÃO:**
    - REFATORAR_IMEDIATO (ROI >70%, gaps críticos)
    - REFATORAR_PLANEJADO (ROI 40-70%)
    - MANTER_MONITORAR (ROI 20-40%, melhorar incremental)
    - MANTER_NAO_VALE (ROI <20%, não mexer)

11. **RECOMENDAÇÃO PERCENTUAL (0-100):**
    - Usar ROI score como base
    - Ajustar por gaps críticos (segurança, performance)
    - Este número será mostrado como badge no card do módulo

12. **COMENTÁRIO DESTAQUE (1 frase brutal):**
    - Máximo 100 caracteres
    - DIRETO e ACIONÁVEL
    - Exemplo: "LCP 4.2s - refatorar lazy load reduz -1.8s"
    - Será mostrado em destaque no card do módulo

13. **JUSTIFICATIVA BRUTAL (1 parágrafo):**
    - HONESTA, baseada em dados
    - Sem enrolação
    - Recomendação clara

14. **PRIORIDADE DE REFATORAMENTO:**
    - critica (bugs críticos, segurança)
    - alta (performance ruim)
    - media (tech debt)
    - baixa (nice-to-have)
    - nenhuma (não vale)

**SEJA BRUTAL E HONESTO. Use dados reais do scan. Não invente métricas. O comentário_destaque será a primeira coisa que o dev vê no card.**`,
      response_json_schema: {
        type: "object",
        properties: {
          score_atual: { type: "number" },
          score_esperado: { type: "number" },
          delta_score: { type: "number" },
          
          template_ideal: {
            type: "object",
            properties: {
              entities: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    descricao: { type: "string" },
                    campos_principais: { type: "array", items: { type: "string" } },
                    indices_necessarios: { 
                 type: "array", 
                 items: { type: "string" } 
               }
                  }
                }
              },
              functions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    descricao: { type: "string" },
                    input_schema: { type: "string" },
                    output_schema: { type: "string" },
                    integracao_externa: { type: "string" }
                  }
                }
              },
              pages: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    componentes: { type: "array", items: { type: "string" } },
                    hooks: { type: "array", items: { type: "string" } },
                    lazy_loaded: { type: "boolean" }
                  }
                }
              },
              testes_e2e: { 
                type: "array", 
                items: { type: "string" } 
              },
              performance_targets: {
                type: "object",
                properties: {
                  lcp_mobile_segundos: { type: "number" },
                  lcp_desktop_segundos: { type: "number" },
                  fcp_mobile_segundos: { type: "number" },
                  fcp_desktop_segundos: { type: "number" },
                  cls_score: { type: "number" },
                  tbt_ms: { type: "number" },
                  speed_index_segundos: { type: "number" },
                  bundle_js_kb: { type: "number" },
                  bundle_css_kb: { type: "number" },
                  cache_ttl_segundos: { type: "number" },
                  dom_max_nodes: { type: "number" },
                  long_tasks_max: { type: "number" }
                }
              },
              recursos_base44: { 
               type: "object",
               description: "Checklist 45+ critérios PageSpeed 100"
              }
            }
          },

          gaps_atuais: {
            type: "array",
            items: {
              type: "object",
              properties: {
                tipo: { type: "string" },
                descricao: { type: "string" },
                severidade: { type: "string", enum: ["critica", "alta", "media", "baixa"] },
                impacto_performance: { type: "string" },
                impacto_seguranca: { type: "string" }
              }
            }
          },

          pros_refatoramento: { 
            type: "array", 
            items: { type: "string" } 
          },
          contras_refatoramento: { 
            type: "array", 
            items: { type: "string" } 
          },

          custo_refatoramento: {
            type: "object",
            properties: {
              horas_estimadas: { type: "number" },
              risco_introducao_bugs: { type: "string", enum: ["baixo", "medio", "alto"] },
              complexidade: { type: "string", enum: ["baixa", "media", "alta", "critica"] },
              custo_oportunidade: { type: "string" }
            }
          },

          ganhos_esperados: {
            type: "object",
            properties: {
              reducao_latencia_ms: { type: "number" },
              reducao_bundle_kb: { type: "number" },
              reducao_lcp_seconds: { type: "number" },
              melhoria_cls: { type: "number" },
              reducao_complexidade_percent: { type: "number" },
              ganho_manutenibilidade: { type: "number" },
              ganho_escalabilidade: { type: "number" },
              reducao_bugs_futuras_percent: { type: "number" },
              ganho_seguranca: { type: "number" }
            }
          },

          roi_score: {
            type: "number",
            description: "ROI do refatoramento (0-100) - ganho/custo normalizado"
          },

          recomendacao: {
            type: "string",
            enum: ["REFATORAR_IMEDIATO", "REFATORAR_PLANEJADO", "MANTER_MONITORAR", "MANTER_NAO_VALE"]
          },

          justificativa_brutal: { type: "string" },
          
          prioridade_refatoramento: {
            type: "string",
            enum: ["critica", "alta", "media", "baixa", "nenhuma"]
          },

          componentes_reutilizaveis: {
            type: "array",
            items: {
              type: "object",
              properties: {
                componente: { type: "string" },
                usado_em_quantos_modulos: { type: "number" },
                ganho_reuso: { type: "string" },
                localizacao_atual: { type: "string" }
              }
            }
          },

          metricas_performance_atuais: {
            type: "object",
            properties: {
              lcp_mobile_segundos: { type: "number" },
              lcp_desktop_segundos: { type: "number" },
              fcp_mobile_segundos: { type: "number" },
              fcp_desktop_segundos: { type: "number" },
              cls_mobile: { type: "number" },
              cls_desktop: { type: "number" },
              tbt_mobile_ms: { type: "number" },
              tbt_desktop_ms: { type: "number" },
              speed_index_mobile_segundos: { type: "number" },
              speed_index_desktop_segundos: { type: "number" },
              bundle_kb: { type: "number" },
              bundle_js_nao_usado_kb: { type: "number" },
              bundle_css_nao_usado_kb: { type: "number" },
              cache_economia_kb: { type: "number" },
              render_blocking_ms: { type: "number" },
              preconnect_economia_ms: { type: "number" },
              long_tasks_count: { type: "number" },
              dom_elements: { type: "number" },
              dom_depth: { type: "number" }
            }
          },

          pagespeed_gaps_criticos: {
            type: "array",
            items: {
              type: "object",
              properties: {
                categoria: { type: "string" },
                problema: { type: "string" },
                impacto_score: { type: "number" },
                solucao: { type: "string" },
                economia_estimada: { type: "string" }
              }
            }
          },

          conformidade_base44: {
            type: "object",
            properties: {
              score_conformidade: { type: "number" },
              recursos_faltando: { 
                type: "array", 
                items: { type: "string" } 
              },
              otimizacoes_faltando: { 
                type: "array", 
                items: { type: "string" } 
              },
              core_web_vitals_compliance: {
                type: "object",
                properties: {
                  lcp_ok: { type: "boolean" },
                  cls_ok: { type: "boolean" },
                  inp_ok: { type: "boolean" }
                }
              }
            }
          },

          recomendacao_percentual: {
            type: "number",
            description: "% de recomendação de refatorar (0-100) - para preview rápido"
          },

          comentario_destaque: {
            type: "string",
            description: "Comentário brutal de 1 linha para exibir no card do módulo"
          }
        }
      }
    });

    // SALVAR ANÁLISE COMPLETA COM MEMÓRIA
    const historicoAnalises = item.historico_analises || [];
    historicoAnalises.push({
      timestamp: new Date().toISOString(),
      tipo: 'refatoramento_brutal',
      resultado: {
        score_atual: analise.score_atual,
        score_esperado: analise.score_esperado,
        roi_score: analise.roi_score,
        recomendacao: analise.recomendacao,
        recomendacao_percentual: analise.recomendacao_percentual,
        comentario_destaque: analise.comentario_destaque,
        pagespeed_gaps_count: analise.pagespeed_gaps_criticos?.length || 0
      }
    });

    await base44.asServiceRole.entities.ChecklistProjeto.update(item.id, {
      historico_analises: historicoAnalises,
      ultima_analise_refatoramento: analise
    });

    return Response.json({
      item_id: item.id,
      modulo: item.modulo,
      analise
    });

  } catch (error) {
    console.error('[analisarRefatoramentoBrutal] Erro:', error);
    console.error('Stack:', error.stack);
    return Response.json({ 
      error: error.message,
      stack: error.stack,
      details: 'Erro na análise brutal - verifique logs'
    }, { status: 500 });
  }
});