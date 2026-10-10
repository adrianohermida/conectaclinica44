import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * ⭐ ANÁLISE COMPLETA ASSÍNCRONA
 * Executa 4 análises pesadas em background sem timeout:
 * 1. Scan Código → 2. Árvore Técnica → 3. Refatoramento → 4. Sprint
 * 
 * Usa status_analise_completa: processing → completed → error
 * Frontend faz polling para verificar status
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { item_id } = await req.json();

    // Marcar como processando
    await base44.asServiceRole.entities.ChecklistProjeto.update(item_id, {
      status_analise_completa: 'processing',
      analise_inicio: new Date().toISOString()
    });

    // Executar análises em background (não aguarda response)
    processarAnaliseBackground(item_id, base44);

    return Response.json({ 
      status: 'processing',
      message: 'Análise iniciada. Aguarde ~2 minutos.',
      item_id 
    });

  } catch (error) {
    console.error('[executarAnaliseCompletaAsync] ERRO:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function processarAnaliseBackground(itemId, base44) {
  try {
    const itemData = await base44.asServiceRole.entities.ChecklistProjeto.get(itemId);
    
    if (!itemData) {
      throw new Error(`Item ${itemId} não encontrado`);
    }

    // 1. SCAN CÓDIGO
    const scanResp = await base44.asServiceRole.functions.invoke('escanearCodebase', { item_id: itemId });
    
    // 2. ÁRVORE TÉCNICA
    const arvoreAnalise = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Gere árvore técnica profissional para módulo: ${itemData.modulo}

FUNCIONALIDADE: ${itemData.funcionalidade}
EVIDÊNCIAS: ${JSON.stringify(itemData.evidencias || [])}
OBSERVAÇÕES: ${itemData.observacoes || 'Nenhuma'}
SCAN: ${JSON.stringify(scanResp.data)}

Retorne JSON com entities, functions, pages, components, debitos_tecnicos_gerais, resumo_executivo.`,
      response_json_schema: {
        type: "object",
        properties: {
          entities: { type: "array" },
          functions: { type: "array" },
          pages: { type: "array" },
          components: { type: "array" },
          debitos_tecnicos_gerais: { type: "array" },
          componentes_reutilizaveis: { type: "array" },
          resumo_executivo: { 
            type: "object",
            properties: {
              score_completude: { type: "number" },
              score_qualidade: { type: "number" },
              total_debitos: { type: "number" },
              horas_estimadas_resolucao: { type: "number" },
              recomendacao_geral: { type: "string" }
            }
          }
        }
      }
    });
    
    // 3. REFATORAMENTO
    const refactorResp = await base44.asServiceRole.functions.invoke('analisarRefatoramentoBrutal', { item_id: itemId });
    
    // 4. SPRINT BREAKDOWN
    const sprintResp = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Gere sprint breakdown para módulo: ${itemData.modulo}. Evidências: ${JSON.stringify(itemData.evidencias)}. Quebre em tarefas atômicas (máx 4h cada).`,
      response_json_schema: {
        type: "object",
        properties: {
          total_estimado_horas: { type: "number" },
          complexidade: { type: "string" },
          riscos_principais: { type: "array", items: { type: "string" } },
          dependencias_externas: { type: "array", items: { type: "string" } },
          tarefas: {
            type: "array",
            items: {
              type: "object",
              properties: {
                ordem: { type: "number" },
                titulo: { type: "string" },
                descricao: { type: "string" },
                tipo: { type: "string" },
                estimativa_horas: { type: "number" },
                criterios_aceite: { type: "array", items: { type: "string" } },
                arquivos_afetados: { type: "array", items: { type: "string" } }
              }
            }
          }
        }
      }
    });
    
    // SALVAR TUDO + HISTÓRICO
    const historicoAnalises = itemData.historico_analises || [];
    historicoAnalises.push({
      timestamp: new Date().toISOString(),
      tipo: 'analise_completa_async',
      resultado: {
        scan_score: scanResp.data.score_real,
        arvore_completude: arvoreAnalise.resumo_executivo?.score_completude,
        refactor_roi: refactorResp.data.analise.roi_score,
        sprint_horas: sprintResp.total_estimado_horas
      }
    });
    
    await base44.asServiceRole.entities.ChecklistProjeto.update(itemId, {
      status_analise_completa: 'completed',
      analise_fim: new Date().toISOString(),
      historico_analises: historicoAnalises,
      ultima_arvore_tecnica: arvoreAnalise,
      ultimo_scan_codebase: scanResp.data,
      ultima_analise_refatoramento: refactorResp.data.analise,
      ultimo_sprint_breakdown: {
        estimativa_total_horas: sprintResp.total_estimado_horas,
        total_tarefas: sprintResp.tarefas?.length || 0,
        complexidade: sprintResp.complexidade,
        tarefas: sprintResp.tarefas,
        riscos_principais: sprintResp.riscos_principais,
        dependencias_principais: sprintResp.dependencias_externas
      },
      score_checklist: scanResp.data.score_real
    });

    console.log(`[SUCESSO] Análise completa para item ${itemId} - Score: ${scanResp.data.score_real}%`);
    
  } catch (error) {
    console.error('[processarAnaliseBackground] ERRO:', error);
    await base44.asServiceRole.entities.ChecklistProjeto.update(itemId, {
      status_analise_completa: 'error',
      analise_erro: error.message
    });
  }
}