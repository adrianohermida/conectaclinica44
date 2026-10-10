import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * VALIDADOR DE CONCLUSÃO - BACKEND ENFORCEMENT
 * 
 * Bloqueia marcação como "completo" se:
 * - score_checklist < 100 E
 * - NÃO tem tag "feature_futura"
 * 
 * Chamado ANTES de update no frontend
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { item_id, novo_status } = await req.json();
    
    // Se não está tentando marcar como completo, liberar
    if (novo_status !== 'completo') {
      return Response.json({ permitido: true });
    }

    // Buscar item
    const item = await base44.asServiceRole.entities.ChecklistProjeto.get(item_id);
    
    const scoreChecklist = item.score_checklist || 0;
    const temTagFeature = item.tags?.includes('feature_futura');
    
    // BLOQUEIO: score < 100 E sem tag
    if (scoreChecklist < 100 && !temTagFeature) {
      return Response.json({
        permitido: false,
        motivo: `Score checklist ${scoreChecklist}% < 100%. Para marcar como completo:\n\n1. Completar TODOS os critérios (score = 100%)\nOU\n2. Adicionar tag "feature_futura" para skip intencional`,
        score_atual: scoreChecklist,
        score_necessario: 100,
        tem_tag_feature: temTagFeature
      });
    }

    return Response.json({ 
      permitido: true,
      motivo: temTagFeature ? 
        'Feature futura marcada - skip autorizado' : 
        `Score ${scoreChecklist}% atingido - conclusão aprovada`
    });

  } catch (error) {
    console.error('[validarConclusaoModulo] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});