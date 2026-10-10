import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * CRITICAL: Adiciona deadlines AUTOMÁTICOS aos 96 itens sem deadline
 * 
 * Lógica:
 * - Crítica: +7 dias (urgente)
 * - Alta: +14 dias
 * - Média: +30 dias
 * - Baixa: +60 dias
 * 
 * Base: 2025-12-18 (hoje)
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Buscar itens SEM deadline
    const itensSemDeadline = await base44.asServiceRole.entities.ChecklistProjeto.filter({
      deadline: null
    });

    console.log(`[DeadlineBot] ${itensSemDeadline.length} itens sem deadline`);

    const hoje = new Date('2025-12-18');
    const updates = [];

    for (const item of itensSemDeadline) {
      const prioridade = item.prioridade || 'media';
      
      let diasParaAdicionar = 30; // Padrão média
      
      if (prioridade === 'critica') diasParaAdicionar = 7;
      else if (prioridade === 'alta') diasParaAdicionar = 14;
      else if (prioridade === 'baixa') diasParaAdicionar = 60;

      const deadline = new Date(hoje);
      deadline.setDate(deadline.getDate() + diasParaAdicionar);
      
      const deadlineStr = deadline.toISOString().split('T')[0];

      await base44.asServiceRole.entities.ChecklistProjeto.update(item.id, {
        deadline: deadlineStr,
        owner: 'Você'
      });

      updates.push({
        id: item.id,
        modulo: item.modulo,
        funcionalidade: item.funcionalidade,
        prioridade,
        deadline: deadlineStr
      });
    }

    return Response.json({
      success: true,
      total_atualizado: updates.length,
      resumo: {
        critica: updates.filter(u => u.prioridade === 'critica').length,
        alta: updates.filter(u => u.prioridade === 'alta').length,
        media: updates.filter(u => u.prioridade === 'media').length,
        baixa: updates.filter(u => u.prioridade === 'baixa').length
      },
      updates: updates.slice(0, 20) // Primeiros 20
    });
  } catch (error) {
    console.error('[DeadlineBot] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});