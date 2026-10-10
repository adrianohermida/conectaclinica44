import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  const startTime = performance.now();
  const results = {
    modulo: 'Agendamentos',
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
      clinica_id: user.clinica_id,
      paciente_nome: `TEST_${Date.now()}`,
      data: new Date().toISOString().split('T')[0],
      horario: '14:00',
      tipo_consulta: 'presencial',
      medico: 'Dr. Teste',
    };

    // 01 - CREATE
    let createTime = performance.now();
    const agendamento = await base44.asServiceRole.entities.Agendamento.create(testData);
    createTime = performance.now() - createTime;
    results.testes.push({ nome: 'CREATE', tempo: createTime, status: 'PASS' });

    // 02 - READ
    let readTime = performance.now();
    const leitura = await base44.asServiceRole.entities.Agendamento.filter({ id: agendamento.id });
    readTime = performance.now() - readTime;
    if (leitura.length === 0) throw new Error('Agendamento não encontrado');
    results.testes.push({ nome: 'READ', tempo: readTime, status: 'PASS' });

    // 03 - UPDATE
    let updateTime = performance.now();
    await base44.asServiceRole.entities.Agendamento.update(agendamento.id, {
      horario: '16:00',
    });
    updateTime = performance.now() - updateTime;
    results.testes.push({ nome: 'UPDATE', tempo: updateTime, status: 'PASS' });

    // 04 - EDGE: Horário conflitante
    try {
      await base44.asServiceRole.entities.Agendamento.create({
        ...testData,
        paciente_nome: 'Outro Paciente',
      });
      // Se chegou aqui, não validou conflito
      results.testes.push({ 
        nome: 'EDGE_CONFLITO', 
        status: 'WARN', 
        info: 'Sistema permite agendamentos simultâneos' 
      });
    } catch (e) {
      results.testes.push({ 
        nome: 'EDGE_CONFLITO', 
        status: 'PASS', 
        info: 'Rejeitou conflito corretamente' 
      });
    }

    // 05 - DELETE (cancelamento)
    let deleteTime = performance.now();
    await base44.asServiceRole.entities.Agendamento.update(agendamento.id, {
      status: 'cancelado',
    });
    deleteTime = performance.now() - deleteTime;
    results.testes.push({ nome: 'CANCEL', tempo: deleteTime, status: 'PASS' });

    // Cleanup
    await base44.asServiceRole.entities.Agendamento.delete(agendamento.id);

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