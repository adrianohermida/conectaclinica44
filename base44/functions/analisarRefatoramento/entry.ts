import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * ANÁLISE BRUTAL DE REFATORAMENTO
 * 
 * Compara módulo atual vs template ideal estruturado
 * Retorna: Score atual, Score esperado, Pros/Contras, Custo/Ganho
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

    // ANÁLISE BRUTAL VIA IA
    const analise = await base44.integrations.Core.InvokeLLM({
      prompt: `Você é um arquiteto de software BRUTAL e HONESTO. Analise este módulo e recomende se vale a pena REFATORAR.

═══════════════════════════════════════════
MÓDULO ATUAL
═══════════════════════════════════════════

Módulo: ${item.modulo}
Funcionalidade: ${item.funcionalidade}
Categoria: ${item.categoria}
Status: ${item.status}
Evidências: ${item.evidencias?.join(', ') || 'NENHUMA'}
Observações: ${item.observacoes || 'NENHUMA'}
Score Atual: ${item.score_checklist || 0}%

═══════════════════════════════════════════
TAREFA
═══════════════════════════════════════════

1. SCORE ATUAL (0-100):
   - Analise evidências, observações, estrutura
   - Identifique gaps críticos
   - Estime score REAL atual

2. TEMPLATE IDEAL:
   - Entities necessárias (schemas JSON)
   - Functions backend (input/output)
   - Pages/Components (arquitetura limpa)
   - Testes obrigatórios
   - Performance targets
   - Recursos Base44 (Visual Edit, lazy load, etc)

3. SCORE ESPERADO (0-100):
   - Se refatorar com template ideal
   - Ganhos em performance, escalabilidade, manutenibilidade

4. PROS vs CONTRAS:
   - Pros do refatoramento (mensuráveis)
   - Contras (custo, risco, tempo)

5. CUSTO vs GANHO:
   - Horas estimadas de refatoramento
   - Ganho esperado em:
     * Latência (ms reduzidos)
     * Bundle size (kb reduzidos)
     * Complexidade (ciclomatic reduction)
     * Manutenibilidade (score 0-100)
     * Escalabilidade (score 0-100)

6. RECOMENDAÇÃO:
   - REFATORAR ou MANTER
   - Justificativa técnica com ROI
   - Prioridade (crítica, alta, média, baixa)

Seja BRUTAL. Se está ruim, diga. Se não vale a pena, diga. Só recomende refatoramento se ROI for CLARO.`,
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
                    schema: { type: "string" }
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
                    input: { type: "string" },
                    output: { type: "string" }
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
                    hooks: { type: "array", items: { type: "string" } }
                  }
                }
              },
              testes_e2e: { type: "array", items: { type: "string" } },
              performance_targets: {
                type: "object",
                properties: {
                  p95_latency_ms: { type: "number" },
                  bundle_size_kb: { type: "number" }
                }
              },
              recursos_base44: {
                type: "object",
                properties: {
                  visual_edit: { type: "boolean" },
                  ai_controls: { type: "boolean" },
                  responsivo: { type: "boolean" },
                  acessibilidade: { type: "boolean" },
                  lazy_load: { type: "boolean" },
                  animacoes: { type: "boolean" }
                }
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
                severidade: { type: "string", enum: ["critica", "alta", "media", "baixa"] }
              }
            }
          },

          pros_refatoramento: { type: "array", items: { type: "string" } },
          contras_refatoramento: { type: "array", items: { type: "string" } },

          custo_refatoramento: {
            type: "object",
            properties: {
              horas_estimadas: { type: "number" },
              risco_introducao_bugs: { type: "string", enum: ["baixo", "medio", "alto"] },
              complexidade: { type: "string", enum: ["baixa", "media", "alta", "critica"] }
            }
          },

          ganhos_esperados: {
            type: "object",
            properties: {
              reducao_latencia_ms: { type: "number" },
              reducao_bundle_kb: { type: "number" },
              reducao_complexidade_percent: { type: "number" },
              ganho_manutenibilidade: { type: "number" },
              ganho_escalabilidade: { type: "number" },
              reducao_bugs_futuras_percent: { type: "number" }
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
                ganho_reuso: { type: "string" }
              }
            }
          }
        }
      }
    });

    return Response.json({
      item_id: item.id,
      modulo: item.modulo,
      analise
    });

  } catch (error) {
    console.error('[analisarRefatoramento] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});