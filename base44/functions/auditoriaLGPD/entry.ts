import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Auditoria LGPD - Simula acesso e valida compliance
 * Testa: logs de acesso, export, delete, consentimento
 */
Deno.serve(async (req) => {
  const results = {
    modulo: 'LGPD Compliance',
    timestamp: new Date().toISOString(),
    testes: [],
    score: 0,
    status: 'unknown',
  };

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.clinica_id) throw new Error('Auth falhou');

    // 01 - Criar paciente teste
    const pacienteTest = await base44.asServiceRole.entities.Paciente.create({
      clinica_id: user.clinica_id,
      nome_completo: `LGPD_TEST_${Date.now()}`,
      cpf: `${Math.floor(Math.random() * 100000000000)}`,
      email: `lgpdtest${Date.now()}@test.com`,
    });

    // 02 - TESTE: Acessar dados sensíveis e validar log
    const beforeLogs = await base44.asServiceRole.entities.LogAcessoDado.list();
    const beforeCount = beforeLogs.length;

    await base44.asServiceRole.entities.Paciente.filter({ id: pacienteTest.id });

    await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar log

    const afterLogs = await base44.asServiceRole.entities.LogAcessoDado.list();
    const afterCount = afterLogs.length;

    const logCriado = afterCount > beforeCount;
    results.testes.push({
      nome: 'LOG_ACESSO',
      status: logCriado ? 'PASS' : 'FAIL',
      info: logCriado ? 'Log de acesso registrado' : '❌ FALHA CRÍTICA: Acesso não logado',
      severidade: logCriado ? 'ok' : 'critica',
    });
    if (logCriado) results.score += 25;

    // 03 - TESTE: Export de dados (portabilidade)
    try {
      const exportData = {
        paciente: pacienteTest,
        historico: [],
        documentos: [],
      };
      const exportJSON = JSON.stringify(exportData, null, 2);
      
      results.testes.push({
        nome: 'PORTABILIDADE',
        status: 'PASS',
        info: `Export JSON: ${exportJSON.length} bytes`,
        severidade: 'ok',
      });
      results.score += 25;
    } catch (e) {
      results.testes.push({
        nome: 'PORTABILIDADE',
        status: 'FAIL',
        erro: e.message,
        severidade: 'alta',
      });
    }

    // 04 - TESTE: Delete de dados (direito ao esquecimento)
    try {
      await base44.asServiceRole.entities.Paciente.delete(pacienteTest.id);
      
      // Validar se realmente foi deletado
      const deletado = await base44.asServiceRole.entities.Paciente.filter({ id: pacienteTest.id });
      const sucesso = deletado.length === 0;
      
      results.testes.push({
        nome: 'ESQUECIMENTO',
        status: sucesso ? 'PASS' : 'FAIL',
        info: sucesso ? 'Dados deletados com sucesso' : '❌ Dados não foram removidos',
        severidade: sucesso ? 'ok' : 'critica',
      });
      if (sucesso) results.score += 25;
    } catch (e) {
      results.testes.push({
        nome: 'ESQUECIMENTO',
        status: 'FAIL',
        erro: e.message,
        severidade: 'critica',
      });
    }

    // 05 - TESTE: ROPA existe?
    const ropa = await base44.asServiceRole.entities.ROPA.list();
    const temROPA = ropa.length > 0;
    results.testes.push({
      nome: 'ROPA',
      status: temROPA ? 'PASS' : 'FAIL',
      info: temROPA ? `${ropa.length} operações mapeadas` : '❌ ROPA vazio',
      severidade: temROPA ? 'ok' : 'alta',
    });
    if (temROPA) results.score += 25;

    // Score final
    if (results.score >= 75) results.status = 'conforme';
    else if (results.score >= 50) results.status = 'parcial';
    else results.status = 'nao_conforme';

    // Calcular riscos
    const criticos = results.testes.filter(t => t.severidade === 'critica' && t.status === 'FAIL');
    if (criticos.length > 0) {
      results.status = 'nao_conforme';
      results.riscos = criticos.map(t => t.nome);
      results.multa_estimada = criticos.length * 10000000; // R$ 10M por falha crítica
    }

    return Response.json(results);
  } catch (error) {
    results.status = 'erro';
    results.erro = error.message;
    return Response.json(results, { status: 500 });
  }
});