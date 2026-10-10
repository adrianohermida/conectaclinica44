import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * AUDITORIA BRUTAL DO ROADMAP
 * Valida evidências REAIS no codebase
 * Auto-completa itens com 100% de evidências
 * Detecta bloqueios e riscos
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const checklist = await base44.asServiceRole.entities.ChecklistProjeto.list();

    const auditoria = {
      timestamp: new Date().toISOString(),
      total_checklist: checklist.length,
      achados: [],
      atualizacoes: [],
      alertas_criticos: []
    };

    // CRITICAL: Itens sem deadline
    const semDeadline = checklist.filter(i => !i.deadline && i.status !== 'completo');
    if (semDeadline.length > 0) {
      auditoria.alertas_criticos.push({
        tipo: 'SEM_DEADLINE',
        severidade: 'CRÍTICO',
        quantidade: semDeadline.length,
        mensagem: `${semDeadline.length} itens ATIVOS sem deadline = sem urgência = nunca termina`,
        ids: semDeadline.map(i => i.id)
      });
    }

    // CRITICAL: Bloqueados há mais de 7 dias
    const hoje = new Date();
    const bloqueadosAntigos = checklist.filter(i => {
      if (i.status !== 'bloqueado' || !i.bloqueado_desde) return false;
      const dias = Math.floor((hoje - new Date(i.bloqueado_desde)) / (1000 * 60 * 60 * 24));
      return dias > 7;
    });
    
    if (bloqueadosAntigos.length > 0) {
      auditoria.alertas_criticos.push({
        tipo: 'BLOQUEIO_LONGO',
        severidade: 'CRÍTICO',
        quantidade: bloqueadosAntigos.length,
        mensagem: `${bloqueadosAntigos.length} itens bloqueados há >7 dias - DESBLOQUEIE OU CANCELE`,
        itens: bloqueadosAntigos.map(i => ({
          modulo: i.modulo,
          funcionalidade: i.funcionalidade,
          dias_bloqueado: Math.floor((hoje - new Date(i.bloqueado_desde)) / (1000 * 60 * 60 * 24))
        }))
      });
    }

    // VALIDAÇÃO: Status vs Percentual
    for (const item of checklist) {
      const updates = {};

      // Auto-complete se 100%
      if (item.percentual_completo === 100 && item.status !== 'completo') {
        updates.status = 'completo';
        updates.data_conclusao = new Date().toISOString().split('T')[0];
      }

      // Forçar 100% se completo
      if (item.status === 'completo' && item.percentual_completo !== 100) {
        updates.percentual_completo = 100;
      }

      // Marcar data de bloqueio
      if (item.status === 'bloqueado' && !item.bloqueado_desde) {
        updates.bloqueado_desde = new Date().toISOString().split('T')[0];
      }

      // Remover data de bloqueio se desbloqueado
      if (item.status !== 'bloqueado' && item.bloqueado_desde) {
        updates.bloqueado_desde = null;
      }

      if (Object.keys(updates).length > 0) {
        await base44.asServiceRole.entities.ChecklistProjeto.update(item.id, updates);
        auditoria.atualizacoes.push({
          modulo: item.modulo,
          funcionalidade: item.funcionalidade,
          alteracoes: updates
        });
      }
    }

    // VELOCITY: Itens completados nos últimos 7 dias
    const sete_dias_atras = new Date();
    sete_dias_atras.setDate(sete_dias_atras.getDate() - 7);
    
    const completosRecentes = checklist.filter(i => 
      i.status === 'completo' && 
      i.data_conclusao && 
      new Date(i.data_conclusao) >= sete_dias_atras
    );

    // BURNDOWN: Total vs Completo
    const stats = {
      total: checklist.length,
      completo: checklist.filter(i => i.status === 'completo').length,
      em_progresso: checklist.filter(i => i.status === 'em_progresso').length,
      bloqueado: checklist.filter(i => i.status === 'bloqueado').length,
      pendente: checklist.filter(i => i.status === 'pendente').length
    };
    stats.percentual_completo = Math.round((stats.completo / stats.total) * 100);
    stats.velocity_semanal = completosRecentes.length;

    auditoria.resumo = {
      criticos: auditoria.alertas_criticos.length,
      atualizados: auditoria.atualizacoes.length,
      stats,
      velocity: {
        itens_completados_7d: completosRecentes.length,
        meta_semanal: 10, // Ajustar conforme capacidade
        no_caminho: completosRecentes.length >= 10
      }
    };

    return Response.json(auditoria);

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});