import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * APLICAR DEADLINES OTIMIZADOS - BACKEND COM RATE LIMIT CONTROL
 * 
 * Processa sequencialmente para evitar 429
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ordem_recomendada } = await req.json();
    
    if (!ordem_recomendada || !Array.isArray(ordem_recomendada)) {
      return Response.json({ error: 'ordem_recomendada obrigatório' }, { status: 400 });
    }

    const hoje = new Date();
    const total = ordem_recomendada.length;
    let aplicados = 0;
    const erros = [];

    // ULTRA SEQUENCIAL: um por vez com retry
    for (let idx = 0; idx < total; idx++) {
      const rec = ordem_recomendada[idx];
      const novaDeadline = new Date(hoje.getTime() + (idx + 1) * 3 * 24 * 60 * 60 * 1000);
      
      // Buscar item atual para preservar observações
      const itemAtual = await base44.asServiceRole.entities.ChecklistProjeto.get(rec.id);
      
      let sucesso = false;
      for (let tentativa = 0; tentativa < 3 && !sucesso; tentativa++) {
        try {
          await base44.asServiceRole.entities.ChecklistProjeto.update(rec.id, {
            deadline: novaDeadline.toISOString().split('T')[0],
            observacoes: `${rec.recomendacao}\n\n--- ORDEM OTIMIZADA (${rec.ordem}/${total}) ---\nScore: ${rec.score_total}% | Reuso: ${rec.scores_detalhados.reuso}% | Impacto: ${rec.scores_detalhados.impacto}%\n\n${itemAtual?.observacoes || ''}`
          });
          sucesso = true;
          aplicados++;
        } catch (error) {
          if (tentativa < 2) {
            await new Promise(r => setTimeout(r, 1000 * (tentativa + 1)));
          } else {
            erros.push({ id: rec.id, modulo: rec.modulo, erro: error.message });
          }
        }
      }
      
      // Delay obrigatório entre requests
      await new Promise(r => setTimeout(r, 200));
    }

    return Response.json({
      sucesso: erros.length === 0,
      total_processado: total,
      aplicados,
      erros: erros.length,
      detalhes_erros: erros
    });

  } catch (error) {
    console.error('[aplicarDeadlines] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});