import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  const startTime = performance.now();
  const results = {
    modulo: 'Prontuarios',
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

    // Criar paciente primeiro
    const paciente = await base44.asServiceRole.entities.Paciente.create({
      nome_completo: `TEST_PAC_${Date.now()}`,
      cpf: `${Math.floor(Math.random() * 100000000000)}`,
      clinica_id: user.clinica_id,
    });

    const testData = {
      clinica_id: user.clinica_id,
      paciente_id: paciente.id,
      paciente_nome: paciente.nome_completo,
      queixa_principal: `TEST_${Date.now()}`,
      data_atendimento: new Date().toISOString().split('T')[0],
      medico_nome: 'Dr. Teste',
      medico_crm: '123456',
    };

    // 01 - CREATE
    let createTime = performance.now();
    const prontuario = await base44.asServiceRole.entities.Prontuario.create(testData);
    createTime = performance.now() - createTime;
    results.testes.push({ nome: 'CREATE', tempo: createTime, status: 'PASS' });

    // 02 - READ
    let readTime = performance.now();
    const leitura = await base44.asServiceRole.entities.Prontuario.filter({ id: prontuario.id });
    readTime = performance.now() - readTime;
    if (leitura.length === 0) throw new Error('Prontuário não encontrado');
    results.testes.push({ nome: 'READ', tempo: readTime, status: 'PASS' });
    
    // Validar P95 < 500ms
    if (readTime > 500) {
      results.testes.push({ nome: 'PERF_READ', status: 'FAIL', tempo: readTime, meta: 500 });
      results.metricas.erros++;
    } else {
      results.testes.push({ nome: 'PERF_READ', status: 'PASS', tempo: readTime });
    }

    // 03 - UPDATE
    let updateTime = performance.now();
    await base44.asServiceRole.entities.Prontuario.update(prontuario.id, {
      conduta: 'Conduta atualizada',
    });
    updateTime = performance.now() - updateTime;
    results.testes.push({ nome: 'UPDATE', tempo: updateTime, status: 'PASS' });

    // 04 - SECURITY: Multi-tenant
    const todosP = await base44.asServiceRole.entities.Prontuario.list();
    const isolado = todosP.every(p => p.clinica_id === user.clinica_id);
    results.testes.push({ 
      nome: 'SECURITY_TENANT', 
      status: isolado ? 'PASS' : 'FAIL',
      info: isolado ? 'Isolamento OK' : 'VAZAMENTO DE DADOS' 
    });
    if (!isolado) results.metricas.erros++;

    // Cleanup
    await base44.asServiceRole.entities.Prontuario.delete(prontuario.id);
    await base44.asServiceRole.entities.Paciente.delete(paciente.id);

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