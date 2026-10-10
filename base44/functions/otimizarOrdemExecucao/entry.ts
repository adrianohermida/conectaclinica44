import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Buscar todos os itens pendentes/em progresso/bloqueados
    const itens = await base44.asServiceRole.entities.ChecklistProjeto.filter({
      status: { $in: ['pendente', 'em_progresso', 'bloqueado'] }
    });
    
    // APLICAR AUTOMATICAMENTE - SEM MODAL
    // Ordenar por: Ordem Manual (se existir) -> Status (bloqueado primeiro) -> Prioridade -> Categoria
    const prioridadeMap = { critica: 1, alta: 2, media: 3, baixa: 4 };
    const statusMap = { bloqueado: 1, em_progresso: 2, pendente: 3 };
    const categoriaMap = { core: 1, compliance: 2, monetizacao: 3, seguranca: 4, performance: 5, integracao: 6, ux: 7 };
    
    itens.sort((a, b) => {
      // PRIORIDADE 1: Ordem manual definida
      const ordemA = a.ordem_execucao || 999999;
      const ordemB = b.ordem_execucao || 999999;
      if (ordemA !== ordemB) {
        return ordemA - ordemB;
      }
      
      // PRIORIDADE 2: Status
      if (statusMap[a.status] !== statusMap[b.status]) {
        return statusMap[a.status] - statusMap[b.status];
      }
      
      // PRIORIDADE 3: Prioridade
      if (prioridadeMap[a.prioridade] !== prioridadeMap[b.prioridade]) {
        return prioridadeMap[a.prioridade] - prioridadeMap[b.prioridade];
      }
      
      // PRIORIDADE 4: Categoria
      return categoriaMap[a.categoria] - categoriaMap[b.categoria];
    });

    // APLICAR DEADLINES SEQUENCIALMENTE
    const hoje = new Date();
    let aplicados = 0;
    const erros = [];

    for (let idx = 0; idx < itens.length; idx++) {
      const item = itens[idx];
      const diasOffset = (idx + 1) * 3; // 3 dias entre cada item
      const novaDeadline = new Date(hoje.getTime() + diasOffset * 24 * 60 * 60 * 1000);
      
      let sucesso = false;
      for (let tentativa = 0; tentativa < 3 && !sucesso; tentativa++) {
        try {
          await base44.asServiceRole.entities.ChecklistProjeto.update(item.id, {
            deadline: novaDeadline.toISOString().split('T')[0]
          });
          sucesso = true;
          aplicados++;
        } catch (error) {
          if (tentativa < 2) {
            await new Promise(r => setTimeout(r, 1000 * (tentativa + 1)));
          } else {
            erros.push({ id: item.id, modulo: item.modulo, erro: error.message });
          }
        }
      }
      
      // Rate limit protection
      await new Promise(r => setTimeout(r, 200));
    }

    return Response.json({
      sucesso: erros.length === 0,
      total_processado: itens.length,
      aplicados,
      erros_count: erros.length,
      detalhes_erros: erros.slice(0, 5), // Primeiros 5 erros apenas
      resumo: {
        bloqueados: itens.filter(i => i.status === 'bloqueado').length,
        criticos: itens.filter(i => i.prioridade === 'critica').length,
        altos: itens.filter(i => i.prioridade === 'alta').length
      }
    });

  } catch (error) {
    console.error('[otimizarOrdemExecucao] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});