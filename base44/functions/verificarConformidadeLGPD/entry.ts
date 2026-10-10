import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * VERIFICA CONFORMIDADE LGPD - RELATÓRIO BRUTAL
 * Retorna score de conformidade e gaps críticos
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso apenas para admins' }, { status: 403 });
    }

    const clinicaId = user.clinica_id;
    if (!clinicaId) {
      return Response.json({ error: 'Clínica não identificada' }, { status: 400 });
    }

    // Buscar dados de conformidade
    const [
      ropas,
      dpias,
      logsAcesso,
      minimizacoes,
      termos
    ] = await Promise.all([
      base44.asServiceRole.entities.ROPA.filter({ clinica_id: clinicaId }),
      base44.asServiceRole.entities.DPIA.filter({ clinica_id: clinicaId }),
      base44.asServiceRole.entities.LogAcessoDado.filter({ clinica_id: clinicaId }),
      base44.asServiceRole.entities.MinimizacaoDados.filter({ clinica_id: clinicaId }),
      base44.asServiceRole.entities.TermoConsentimento.filter({ clinica_id: clinicaId })
    ]);

    // Avaliação brutal
    const gaps = [];
    let score = 100;

    // 1. ROPA (Obrigatório - Art. 37 LGPD)
    if (ropas.length === 0) {
      gaps.push({
        severidade: 'CRÍTICO',
        artigo: 'Art. 37 LGPD',
        gap: 'ROPA não implementado',
        impacto: 'Multa até R$ 50M (Art. 52)',
        acao: 'Criar Registro de Operações de Tratamento imediatamente'
      });
      score -= 30;
    } else {
      // Verificar qualidade do ROPA
      const ropasSemBaseLegal = ropas.filter(r => !r.base_legal);
      if (ropasSemBaseLegal.length > 0) {
        gaps.push({
          severidade: 'ALTO',
          artigo: 'Art. 7º LGPD',
          gap: `${ropasSemBaseLegal.length} operações sem base legal definida`,
          impacto: 'Tratamento ilícito de dados',
          acao: 'Revisar e atribuir base legal a todas operações'
        });
        score -= 15;
      }
    }

    // 2. DPIA (Obrigatório quando alto risco - Art. 38)
    const tratamentosAltoRisco = ropas.filter(r => 
      r.dados_sensiveis && r.dpia_necessaria && !r.dpia_id
    );
    if (tratamentosAltoRisco.length > 0) {
      gaps.push({
        severidade: 'CRÍTICO',
        artigo: 'Art. 38 LGPD',
        gap: `${tratamentosAltoRisco.length} tratamentos de alto risco sem DPIA`,
        impacto: 'Não conformidade grave',
        acao: 'Elaborar DPIA para tratamentos de dados sensíveis'
      });
      score -= 25;
    }

    // 3. Auditoria de acesso (Art. 37 + Art. 48)
    const ultimaSemana = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const logsRecentes = logsAcesso.filter(l => 
      new Date(l.timestamp).getTime() > ultimaSemana
    );
    
    if (logsRecentes.length === 0 && ropas.length > 0) {
      gaps.push({
        severidade: 'ALTO',
        artigo: 'Art. 48 LGPD',
        gap: 'Auditoria de acesso não implementada',
        impacto: 'Impossível rastrear acessos não autorizados',
        acao: 'Implementar logging de todos os acessos a dados sensíveis'
      });
      score -= 20;
    }

    // 4. Minimização de dados (Art. 6º, III)
    if (minimizacoes.length === 0) {
      gaps.push({
        severidade: 'MÉDIO',
        artigo: 'Art. 6º, III LGPD',
        gap: 'Análise de minimização não realizada',
        impacto: 'Coleta excessiva de dados',
        acao: 'Avaliar necessidade de cada campo coletado'
      });
      score -= 10;
    }

    // 5. Consentimento (Art. 8º)
    const termosAtivos = termos.filter(t => t.status === 'ativo');
    if (termosAtivos.length === 0) {
      gaps.push({
        severidade: 'MÉDIO',
        artigo: 'Art. 8º LGPD',
        gap: 'Termo de consentimento não configurado',
        impacto: 'Falta de base legal clara',
        acao: 'Criar e implementar termo de consentimento'
      });
      score -= 10;
    }

    // 6. Retenção e expurgo (Art. 15 + Art. 16)
    const ropasSemRetencao = ropas.filter(r => !r.retencao_prazo);
    if (ropasSemRetencao.length > 0) {
      gaps.push({
        severidade: 'ALTO',
        artigo: 'Art. 15 + 16 LGPD',
        gap: `${ropasSemRetencao.length} operações sem prazo de retenção definido`,
        impacto: 'Dados mantidos indefinidamente',
        acao: 'Definir prazo de retenção para cada operação (CFM 1821/2007 = 20 anos para prontuários)'
      });
      score -= 15;
    }

    // Status geral
    let statusGeral = 'CONFORME';
    if (score < 70) statusGeral = 'NÃO_CONFORME';
    else if (score < 85) statusGeral = 'RISCO_MÉDIO';

    // Prazo de regularização estimado
    const gapsCriticos = gaps.filter(g => g.severidade === 'CRÍTICO');
    const prazoRegularizacao = gapsCriticos.length > 0 ? '7 dias' : 
                              gaps.length > 3 ? '30 dias' : 
                              gaps.length > 0 ? '60 dias' : 'N/A';

    return Response.json({
      status: 'success',
      conformidade: {
        status_geral: statusGeral,
        score,
        gaps,
        prazo_regularizacao: prazoRegularizacao,
        multa_potencial: score < 70 ? 'Até R$ 50.000.000 (2% faturamento)' : 'Baixo risco'
      },
      estatisticas: {
        ropas_cadastrados: ropas.length,
        dpias_realizados: dpias.length,
        logs_ultimos_7d: logsRecentes.length,
        minimizacoes_realizadas: minimizacoes.length,
        termos_ativos: termosAtivos.length
      },
      recomendacoes: [
        score < 70 && 'URGENTE: Regularizar gaps críticos em até 7 dias',
        ropas.length === 0 && 'Criar ROPA completo com todas operações de tratamento',
        tratamentosAltoRisco.length > 0 && 'Elaborar DPIA para tratamentos de alto risco',
        logsRecentes.length === 0 && 'Implementar auditoria de acesso imediatamente',
        'Contratar DPO certificado se >50 funcionários ou alto volume de dados'
      ].filter(Boolean)
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});