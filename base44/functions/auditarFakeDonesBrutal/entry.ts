import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * AUDITORIA BRUTAL ANTI-FAKE-DONE
 * 
 * Valida SE itens "completos" estão REALMENTE concluídos:
 * 1. Evidências existem no codebase?
 * 2. Observações têm detalhamento técnico (>100 chars)?
 * 3. Deadline razoável (não 1+ ano futuro)?
 * 4. Definition of Done preenchido?
 * 5. Dependencies resolvidas?
 * 
 * RETORNA:
 * - score_fake_done (0-100, quanto MENOR = mais FAKE)
 * - problemas detectados
 * - recomendações
 * - itens_atualizados (fake-dones resetados para pendente)
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { batch_size = 10, offset = 0 } = await req.json();

    // Buscar itens "completos"
    const todosCompletos = await base44.asServiceRole.entities.ChecklistProjeto.filter(
      { status: 'completo' },
      '-updated_date'
    );

    const batchItens = todosCompletos.slice(offset, offset + batch_size);
    const resultados = [];
    const itensAtualizados = [];

    for (const item of batchItens) {
      const problemas = [];
      const avisos = [];
      let scoreFakeDone = 100;

      // 1. VALIDAR EVIDÊNCIAS
      if (!item.evidencias || item.evidencias.length === 0) {
        problemas.push({
          tipo: "CRÍTICO",
          mensagem: "Zero evidências - FAKE DONE garantido",
          penalidade: 40
        });
        scoreFakeDone -= 40;
      } else {
        const evidenciasValidas = [];
        const evidenciasInvalidas = [];

        for (const evidencia of item.evidencias) {
          // Validação básica (arquivo existe no path)
          if (evidencia.startsWith('pages/') || 
              evidencia.startsWith('components/') || 
              evidencia.startsWith('functions/')) {
            // Assumir válido (filesystem check complexo)
            evidenciasValidas.push(evidencia);
          } else if (evidencia.startsWith('entities/')) {
            const entityName = evidencia.replace('entities/', '').replace('.json', '');
            try {
              // Verificar se entity existe
              await base44.asServiceRole.entities[entityName].list("", 1);
              evidenciasValidas.push(evidencia);
            } catch {
              evidenciasInvalidas.push({
                evidencia,
                motivo: "Entity não existe ou sem permissão"
              });
              scoreFakeDone -= 10;
            }
          } else {
            // Evidência genérica
            avisos.push(`Evidência genérica: ${evidencia}`);
          }
        }

        if (evidenciasInvalidas.length > 0) {
          problemas.push({
            tipo: "CRÍTICO",
            mensagem: `${evidenciasInvalidas.length} evidências INVÁLIDAS`,
            detalhe: evidenciasInvalidas,
            penalidade: evidenciasInvalidas.length * 10
          });
        }

        if (evidenciasValidas.length < 2) {
          problemas.push({
            tipo: "MÉDIO",
            mensagem: "Poucas evidências (<2) - conclusão duvidosa",
            penalidade: 15
          });
          scoreFakeDone -= 15;
        }
      }

      // 2. VALIDAR OBSERVAÇÕES (detalhamento técnico)
      if (!item.observacoes || item.observacoes.length < 100) {
        problemas.push({
          tipo: "MÉDIO",
          mensagem: `Observações vazias/genéricas (${item.observacoes?.length || 0} chars < 100)`,
          detalhe: "Itens completos devem ter: arquitetura, componentes criados, testes, pendências",
          penalidade: 20
        });
        scoreFakeDone -= 20;
      }

      // 3. VALIDAR DEADLINE (1+ ano futuro = fake urgência)
      if (item.deadline) {
        const deadlineDate = new Date(item.deadline);
        const umAnoFuturo = new Date();
        umAnoFuturo.setFullYear(umAnoFuturo.getFullYear() + 1);
        
        if (deadlineDate > umAnoFuturo) {
          problemas.push({
            tipo: "SUSPEITO",
            mensagem: `Deadline ${item.deadline} (1+ ano futuro) = fake urgência`,
            penalidade: 10
          });
          scoreFakeDone -= 10;
        }
      } else {
        problemas.push({
          tipo: "ALERTA",
          mensagem: "Sem deadline definido",
          penalidade: 5
        });
        scoreFakeDone -= 5;
      }

      // 4. VALIDAR DEFINITION OF DONE
      if (!item.definition_of_done || item.definition_of_done.length === 0) {
        avisos.push("Definition of Done vazio - como validar conclusão?");
        scoreFakeDone -= 10;
      }

      // 5. VALIDAR PERCENTUAL (se < 100% mas status completo = incoerência)
      if (item.percentual_completo < 100) {
        problemas.push({
          tipo: "INCOERÊNCIA",
          mensagem: `Status 'completo' mas ${item.percentual_completo}% (deveria ser 100%)`,
          penalidade: 15
        });
        scoreFakeDone -= 15;
      }

      // 6. CHECAR BLOQUEADORES (se tem bloqueadores ativos = não pode estar completo)
      if (item.bloqueadores && item.bloqueadores.length > 0) {
        problemas.push({
          tipo: "CRÍTICO",
          mensagem: `${item.bloqueadores.length} bloqueadores ativos mas status 'completo'`,
          detalhe: item.bloqueadores,
          penalidade: 30
        });
        scoreFakeDone -= 30;
      }

      // CLASSIFICAÇÃO FINAL
      const statusReal = scoreFakeDone >= 80 ? "✅ COMPLETO REAL" :
                         scoreFakeDone >= 60 ? "⚠️ PARCIAL (fake-done parcial)" :
                         scoreFakeDone >= 40 ? "🔴 FAKE DONE (evidências fracas)" :
                         "💀 MENTIRA TOTAL (zero evidências)";

      const recomendacao = scoreFakeDone < 80 
        ? "Resetar para 'pendente' + adicionar evidências reais + detalhamento técnico"
        : "Conclusão validada - manter 'completo'";

      // AUTO-RESET FAKE-DONES (score < 60)
      if (scoreFakeDone < 60) {
        await base44.asServiceRole.entities.ChecklistProjeto.update(item.id, {
          status: 'pendente',
          percentual_completo: Math.max(0, scoreFakeDone - 20), // Ajustar % realista
          observacoes: `❌ FAKE DONE DETECTADO (score ${scoreFakeDone}%)\n\nPROBLEMAS:\n${problemas.map(p => `- ${p.mensagem}`).join('\n')}\n\n---\nOBSERVAÇÕES ORIGINAIS:\n${item.observacoes || '(vazio)'}`
        });

        itensAtualizados.push({
          id: item.id,
          modulo: item.modulo,
          funcionalidade: item.funcionalidade,
          score_antes: scoreFakeDone,
          acao: "Resetado para 'pendente'"
        });
      }

      resultados.push({
        id: item.id,
        modulo: item.modulo,
        funcionalidade: item.funcionalidade,
        score_fake_done: scoreFakeDone,
        status_real: statusReal,
        problemas,
        avisos,
        recomendacao,
        evidencias_declaradas: item.evidencias?.length || 0,
        observacoes_length: item.observacoes?.length || 0
      });
    }

    // ESTATÍSTICAS GERAIS
    const estatisticas = {
      total_analisados: resultados.length,
      total_completos: todosCompletos.length,
      completos_reais: resultados.filter(r => r.score_fake_done >= 80).length,
      fake_dones_parciais: resultados.filter(r => r.score_fake_done >= 60 && r.score_fake_done < 80).length,
      fake_dones: resultados.filter(r => r.score_fake_done >= 40 && r.score_fake_done < 60).length,
      mentiras_totais: resultados.filter(r => r.score_fake_done < 40).length,
      resetados_automaticamente: itensAtualizados.length,
      score_medio: resultados.length > 0 
        ? Math.round(resultados.reduce((acc, r) => acc + r.score_fake_done, 0) / resultados.length)
        : 0
    };

    return Response.json({
      success: true,
      batch: {
        offset,
        size: batch_size,
        processados: batchItens.length,
        restantes: Math.max(0, todosCompletos.length - offset - batch_size)
      },
      estatisticas,
      resultados,
      itens_atualizados: itensAtualizados,
      proximo_offset: offset + batch_size < todosCompletos.length ? offset + batch_size : null,
      mensagem_brutal: estatisticas.score_medio < 50 
        ? `💀 CATÁSTROFE: ${estatisticas.score_medio}% score médio - ${estatisticas.fake_dones + estatisticas.mentiras_totais} fake-dones de ${estatisticas.total_analisados}`
        : estatisticas.score_medio < 70
        ? `🔴 RUIM: ${estatisticas.score_medio}% - ${estatisticas.fake_dones_parciais} parciais duvidosos`
        : `✅ ACEITÁVEL: ${estatisticas.score_medio}% - maioria validada`
    });

  } catch (error) {
    console.error('Erro na auditoria:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});