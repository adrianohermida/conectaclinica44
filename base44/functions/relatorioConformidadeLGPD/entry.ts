import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Relatório de Conformidade LGPD
 * Analisa: ROPA, DPIA, logs, minimização, acessos
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.clinica_id) throw new Error('Auth falhou');

    const relatorio = {
      clinica_id: user.clinica_id,
      data_geracao: new Date().toISOString(),
      score_geral: 0,
      conformidade: 'desconhecido',
      secoes: [],
    };

    // 01 - ROPA (Registro de Operações de Tratamento)
    const ropa = await base44.asServiceRole.entities.ROPA.filter({ clinica_id: user.clinica_id });
    const scoreROPA = ropa.length > 0 ? 100 : 0;
    relatorio.secoes.push({
      nome: 'ROPA',
      score: scoreROPA,
      detalhes: `${ropa.length} operações mapeadas`,
      obrigatorio: true,
      status: scoreROPA === 100 ? 'ok' : 'pendente',
    });

    // 02 - DPIA (Avaliação de Impacto)
    const dpia = await base44.asServiceRole.entities.DPIA.filter({ clinica_id: user.clinica_id });
    const scoreDPIA = dpia.length > 0 ? 100 : 50; // Não obrigatório para todos
    relatorio.secoes.push({
      nome: 'DPIA',
      score: scoreDPIA,
      detalhes: `${dpia.length} avaliações realizadas`,
      obrigatorio: false,
      status: scoreDPIA === 100 ? 'ok' : 'recomendado',
    });

    // 03 - Logs de Acesso
    const logs = await base44.asServiceRole.entities.LogAcessoDado.filter({ clinica_id: user.clinica_id });
    const scoreLogs = logs.length > 0 ? 100 : 0;
    relatorio.secoes.push({
      nome: 'Logs de Acesso',
      score: scoreLogs,
      detalhes: `${logs.length} acessos registrados`,
      obrigatorio: true,
      status: scoreLogs === 100 ? 'ok' : 'critico',
    });

    // 04 - Minimização de Dados
    const minimizacao = await base44.asServiceRole.entities.MinimizacaoDados.filter({ clinica_id: user.clinica_id });
    const scoreMin = minimizacao.length > 0 ? 100 : 70;
    relatorio.secoes.push({
      nome: 'Minimização',
      score: scoreMin,
      detalhes: `${minimizacao.length} avaliações`,
      obrigatorio: false,
      status: scoreMin === 100 ? 'ok' : 'recomendado',
    });

    // 05 - Termos de Consentimento
    const termos = await base44.asServiceRole.entities.TermoConsentimento.list();
    const scoreTermos = termos.length > 0 ? 100 : 0;
    relatorio.secoes.push({
      nome: 'Consentimento',
      score: scoreTermos,
      detalhes: `${termos.length} termos ativos`,
      obrigatorio: true,
      status: scoreTermos === 100 ? 'ok' : 'critico',
    });

    // Calcular score geral
    const obrigatorios = relatorio.secoes.filter(s => s.obrigatorio);
    const scoreObrigatorios = obrigatorios.reduce((sum, s) => sum + s.score, 0) / obrigatorios.length;
    const scoreOpcional = relatorio.secoes.filter(s => !s.obrigatorio).reduce((sum, s) => sum + s.score, 0) / relatorio.secoes.filter(s => !s.obrigatorio).length;
    
    relatorio.score_geral = Math.round(scoreObrigatorios * 0.7 + scoreOpcional * 0.3);

    // Status de conformidade
    if (relatorio.score_geral >= 90) relatorio.conformidade = 'conforme';
    else if (relatorio.score_geral >= 70) relatorio.conformidade = 'parcial';
    else relatorio.conformidade = 'nao_conforme';

    // Riscos e recomendações
    relatorio.riscos = relatorio.secoes
      .filter(s => s.status === 'critico')
      .map(s => s.nome);

    relatorio.recomendacoes = [];
    if (scoreROPA < 100) relatorio.recomendacoes.push('Mapear todas operações de tratamento (ROPA)');
    if (scoreLogs < 100) relatorio.recomendacoes.push('Implementar logs de acesso a dados sensíveis');
    if (scoreTermos < 100) relatorio.recomendacoes.push('Criar termo de consentimento');
    if (scoreDPIA < 100) relatorio.recomendacoes.push('Realizar DPIA para operações de alto risco');

    return Response.json(relatorio);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});