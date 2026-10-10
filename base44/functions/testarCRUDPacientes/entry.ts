import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Teste E2E de CRUD Pacientes
 * Executa: criar → ler → atualizar → deletar → validar
 * Retorna: métricas de performance + erros
 */
Deno.serve(async (req) => {
  const startTime = performance.now();
  const results = {
    modulo: 'Pacientes',
    timestamp: new Date().toISOString(),
    testes: [],
    metricas: { p95: 0, erros: 0, sucessos: 0 },
  };

  try {
    const base44 = createClientFromRequest(req);
    
    // CRITICAL: Verificar auth ANTES de usar service role
    const user = await base44.auth.me();
    if (!user?.clinica_id) {
      return Response.json({ 
        erro: 'Não autenticado ou sem clinica_id', 
        metricas: { erros: 1 } 
      }, { status: 401 });
    }

    const testData = {
      nome_completo: `TEST_${Date.now()}`,
      cpf: `${Math.floor(Math.random() * 100000000000)}`,
      telefone: '(11) 98765-4321',
      email: `test${Date.now()}@test.com`,
      clinica_id: user.clinica_id,
    };

    // 01 - CREATE
    let createTime = performance.now();
    const paciente = await base44.asServiceRole.entities.Paciente.create(testData);
    createTime = performance.now() - createTime;
    results.testes.push({ nome: 'CREATE', tempo: createTime, status: 'PASS' });

    // 02 - READ
    let readTime = performance.now();
    const leitura = await base44.asServiceRole.entities.Paciente.filter({ id: paciente.id });
    readTime = performance.now() - readTime;
    if (leitura.length === 0) throw new Error('Paciente não encontrado');
    results.testes.push({ nome: 'READ', tempo: readTime, status: 'PASS' });

    // 03 - UPDATE
    let updateTime = performance.now();
    await base44.asServiceRole.entities.Paciente.update(paciente.id, {
      telefone: '(11) 91234-5678',
    });
    updateTime = performance.now() - updateTime;
    results.testes.push({ nome: 'UPDATE', tempo: updateTime, status: 'PASS' });

    // 04 - DELETE
    let deleteTime = performance.now();
    await base44.asServiceRole.entities.Paciente.delete(paciente.id);
    deleteTime = performance.now() - deleteTime;
    results.testes.push({ nome: 'DELETE', tempo: deleteTime, status: 'PASS' });

    // 05 - EDGE: CPF duplicado
    try {
      await base44.asServiceRole.entities.Paciente.create(testData);
      await base44.asServiceRole.entities.Paciente.create(testData);
      results.testes.push({ nome: 'EDGE_CPF_DUP', status: 'FAIL', erro: 'Aceitou CPF duplicado' });
      results.metricas.erros++;
    } catch (e) {
      results.testes.push({ nome: 'EDGE_CPF_DUP', status: 'PASS', info: 'Rejeitou corretamente' });
    }

    // Calcular P95
    const tempos = results.testes.filter(t => t.tempo).map(t => t.tempo).sort((a, b) => a - b);
    results.metricas.p95 = tempos[Math.floor(tempos.length * 0.95)] || 0;
    results.metricas.sucessos = results.testes.filter(t => t.status === 'PASS').length;
    results.metricas.tempoTotal = performance.now() - startTime;

    return Response.json(results);
  } catch (error) {
    results.metricas.erros++;
    results.erro = error.message;
    return Response.json(results, { status: 500 });
  }
});