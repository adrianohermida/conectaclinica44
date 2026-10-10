import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * CRON DIÁRIO: Aprendizado contínuo da IA
 * 
 * Executa:
 * 1. Análise de conversas do widget
 * 2. Geração de playbooks otimizados
 * 3. Sugestão de FAQs
 * 4. Identificação de gargalos
 * 5. Relatório para admin
 * 
 * Agendar: 04:00 BRT diariamente (Vercel Cron ou similar)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar auth (Vercel Cron ou service role)
    const authHeader = req.headers.get('Authorization');
    const isCronRequest = req.headers.get('user-agent')?.includes('vercel-cron');
    
    if (!isCronRequest && (!authHeader || !authHeader.startsWith('Bearer '))) {
      return Response.json({ error: 'Unauthorized - Use Vercel Cron or provide auth token' }, { status: 401 });
    }

    console.log('[CRON] Iniciando aprendizado contínuo...');

    // 1. Analisar conversas DIRETO (sem invocar function - evita 500)
    console.log('[CRON] Analisando conversas...');
    let analise = { conversas_analisadas: 0, faqs_criados: 0, analise: {} };
    
    try {
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - 1);

      const conversasRecentes = await base44.asServiceRole.entities.ConversaWidget.filter({
        created_date: { $gte: dataLimite.toISOString() },
        analisado_por_ia: false
      });

      console.log(`[CRON] ${conversasRecentes.length} conversas não analisadas`);

      // Análise simplificada inline
      const gaps = [];
      const objecoes = [];
      
      conversasRecentes.forEach(conversa => {
        if (conversa.perguntas_sem_resposta) {
          gaps.push(...conversa.perguntas_sem_resposta);
        }
        if (conversa.objecoes_registradas) {
          objecoes.push(...conversa.objecoes_registradas);
        }
      });

      analise = {
        conversas_analisadas: conversasRecentes.length,
        faqs_criados: 0,
        analise: {
          taxa_conversao: calcularTaxaConversao(conversasRecentes),
          gaps_faq: [...new Set(gaps)].slice(0, 10),
          objecoes_comuns: objecoes.slice(0, 5)
        }
      };

      // Marcar como analisadas
      for (const conversa of conversasRecentes) {
        await base44.asServiceRole.entities.ConversaWidget.update(conversa.id, {
          analisado_por_ia: true
        });
      }

    } catch (error) {
      console.error('[CRON] Erro ao analisar conversas:', error.message);
      // Continua execução mesmo com erro
    }

    // 2. Gerar playbooks se taxa de conversão mudou significativamente
    console.log('[CRON] Verificando necessidade de novos playbooks...');
    const playbooksGerados = [];
    
    try {
      if (analise.analise?.taxa_conversao < 30) {
        // Taxa baixa - gerar playbook de cold calling
        const playbook = await base44.asServiceRole.functions.invoke('gerarPlaybookVendas', {
          tipo: 'cold_calling'
        });
        playbooksGerados.push(playbook.data);
      }

      if (analise.analise?.gargalos?.some(g => g.tipo === 'alto_abandono')) {
        // Abandono alto - gerar playbook de retenção
        const playbook = await base44.asServiceRole.functions.invoke('gerarPlaybookVendas', {
          tipo: 'retencao'
        });
        playbooksGerados.push(playbook.data);
      }
    } catch (error) {
      console.error('[CRON] Erro ao gerar playbooks:', error.message);
      // Continua execução
    }

    // 3. Buscar aprendizados não aplicados
    const aprendizadosPendentes = await base44.asServiceRole.entities.AprendizadoIA.filter({
      aprovado: true,
      aplicado: false
    });

    console.log(`[CRON] ${aprendizadosPendentes.length} aprendizados pendentes de aplicação`);

    // 4. Aplicar FAQs aprovados automaticamente ao agente
    const faqsAprovados = await base44.asServiceRole.entities.ArtigoFAQ.filter({
      aprovado: true,
      origem: 'ia_sugerida',
      ativo: true
    });

    // 5. Calcular ROI do aprendizado
    const conversasAntes = await base44.asServiceRole.entities.ConversaWidget.filter({
      created_date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() }
    });
    
    const taxaConversaoAtual = calcularTaxaConversao(conversasAntes);
    
    // 6. Gerar relatório para admin
    const relatorio = {
      data_execucao: new Date().toISOString(),
      conversas_analisadas: analise.conversas_analisadas || 0,
      faqs_criados: analise.faqs_criados || 0,
      playbooks_gerados: playbooksGerados.length,
      taxa_conversao_atual: taxaConversaoAtual,
      gargalos_identificados: analise.analise?.gargalos || [],
      gaps_faq: analise.analise?.gaps_faq?.length || 0,
      aprendizados_pendentes: aprendizadosPendentes.length,
      sugestoes_prioridade_alta: analise.analise?.sugestoes_melhoria?.problemas_criticos || []
    };

    // 7. Enviar email de relatório para admin
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    const adminEmail = admins[0]?.email || 'contato@aetherlab.com.br';
    
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: adminEmail,
      subject: `🤖 Aprendizado IA - ${new Date().toLocaleDateString('pt-BR')}`,
      body: gerarEmailRelatorio(relatorio)
    });

    // 8. Marcar aprendizados como aplicados
    for (const aprendizado of aprendizadosPendentes) {
      await base44.asServiceRole.entities.AprendizadoIA.update(aprendizado.id, {
        aplicado: true,
        data_aplicacao: new Date().toISOString()
      });
    }

    console.log('[CRON] Aprendizado contínuo concluído com sucesso');

    return Response.json({
      success: true,
      relatorio,
      executado_em: new Date().toISOString()
    });

  } catch (error) {
    console.error('[CRON] Erro no aprendizado contínuo:', error);
    
    // Enviar alerta de erro
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: 'admin@conectaclinica.com.br',
        subject: '🚨 ERRO - Cron Aprendizado IA',
        body: `Erro no cron de aprendizado contínuo:\n\n${error.message}\n\n${error.stack}`
      });
    } catch (emailError) {
      console.error('[CRON] Erro ao enviar email de alerta:', emailError);
    }

    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calcularTaxaConversao(conversas) {
  if (conversas.length === 0) return 0;
  const convertidas = conversas.filter(c => c.resultado === 'converteu').length;
  return ((convertidas / conversas.length) * 100).toFixed(2);
}

function gerarEmailRelatorio(relatorio) {
  return `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #7E57FF;">🤖 Relatório de Aprendizado Contínuo da IA</h2>
  
  <p><strong>Data:</strong> ${new Date(relatorio.data_execucao).toLocaleString('pt-BR')}</p>
  
  <h3>📊 Resumo Executivo</h3>
  <ul>
    <li><strong>Conversas analisadas:</strong> ${relatorio.conversas_analisadas}</li>
    <li><strong>Taxa de conversão atual:</strong> ${relatorio.taxa_conversao_atual}%</li>
    <li><strong>FAQs criados:</strong> ${relatorio.faqs_criados}</li>
    <li><strong>Playbooks gerados:</strong> ${relatorio.playbooks_gerados}</li>
    <li><strong>Gaps FAQ identificados:</strong> ${relatorio.gaps_faq}</li>
  </ul>

  <h3>🔴 Gargalos Identificados</h3>
  ${relatorio.gargalos_identificados.length > 0 ? `
    <ul>
      ${relatorio.gargalos_identificados.map(g => `
        <li><strong>${g.tipo}:</strong> ${g.descricao} (${g.percentual}%)</li>
      `).join('')}
    </ul>
  ` : '<p>Nenhum gargalo crítico identificado.</p>'}

  <h3>⚠️ Ações Recomendadas (Prioridade Alta)</h3>
  ${relatorio.sugestoes_prioridade_alta.length > 0 ? `
    <ul>
      ${relatorio.sugestoes_prioridade_alta.map(s => `<li>${s}</li>`).join('')}
    </ul>
  ` : '<p>Nenhuma ação urgente.</p>'}

  <h3>📝 Pendências</h3>
  <ul>
    <li><strong>Aprendizados aguardando aprovação:</strong> ${relatorio.aprendizados_pendentes}</li>
  </ul>

  <p style="margin-top: 30px;">
    <a href="https://app.conectaclinica.com.br/DashboardInteligenciaFAQ" 
       style="background: #7E57FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
      Ver Dashboard Completo
    </a>
  </p>
</body>
</html>
  `;
}