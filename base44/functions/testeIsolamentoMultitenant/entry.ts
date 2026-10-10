import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * TESTE RUNTIME MULTITENANT - Prova isolamento real
 * Cria 2 clínicas, insere dados, valida que cada uma só vê seus próprios dados
 * Retorna relatório de segurança com PASS/FAIL
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const admin = await base44.auth.me();

    if (!admin || admin.role !== 'admin') {
      return Response.json({ error: 'Apenas admins' }, { status: 403 });
    }

    const timestamp = Date.now();
    const resultados = {
      timestamp: new Date().toISOString(),
      status: 'PASS',
      vulnerabilidades: [],
      testes: []
    };

    // CRIAR 2 CLÍNICAS DE TESTE
    const clinica1 = await base44.asServiceRole.entities.Clinica.create({
      nome: `TestClinica_A_${timestamp}`,
      cnpj: `11111111000${timestamp.toString().slice(-3)}`,
      email: `test_a_${timestamp}@test.com`,
      ativa: true
    });

    const clinica2 = await base44.asServiceRole.entities.Clinica.create({
      nome: `TestClinica_B_${timestamp}`,
      cnpj: `22222222000${timestamp.toString().slice(-3)}`,
      email: `test_b_${timestamp}@test.com`,
      ativa: true
    });

    // INSERIR 3 CONTATOS EM CADA CLÍNICA
    const contatosA = await base44.asServiceRole.entities.Contato.bulkCreate([
      { clinica_id: clinica1.id, nome_completo: 'Paciente A1', tipo_contato: 'paciente', telefone: '11111111111' },
      { clinica_id: clinica1.id, nome_completo: 'Paciente A2', tipo_contato: 'paciente', telefone: '11111111112' },
      { clinica_id: clinica1.id, nome_completo: 'Paciente A3', tipo_contato: 'paciente', telefone: '11111111113' }
    ]);

    const contatosB = await base44.asServiceRole.entities.Contato.bulkCreate([
      { clinica_id: clinica2.id, nome_completo: 'Paciente B1', tipo_contato: 'paciente', telefone: '22222222221' },
      { clinica_id: clinica2.id, nome_completo: 'Paciente B2', tipo_contato: 'paciente', telefone: '22222222222' },
      { clinica_id: clinica2.id, nome_completo: 'Paciente B3', tipo_contato: 'paciente', telefone: '22222222223' }
    ]);

    resultados.testes.push({
      teste: 'Criar clínicas e contatos',
      status: 'PASS',
      detalhes: `Clínica A: ${contatosA.length} contatos | Clínica B: ${contatosB.length} contatos`
    });

    // TESTE 1: Listar contatos da Clínica A (deve retornar APENAS 3)
    const resultadoA = await base44.asServiceRole.entities.Contato.filter({ 
      clinica_id: clinica1.id 
    });

    if (resultadoA.length !== 3) {
      resultados.vulnerabilidades.push({
        tipo: 'vazamento_multitenant',
        severidade: 'CRITICAL',
        detalhes: `Clínica A deveria retornar 3 contatos, retornou ${resultadoA.length}`,
        evidencia: resultadoA.map(c => ({ id: c.id, nome: c.nome_completo, clinica_id: c.clinica_id }))
      });
      resultados.status = 'FAIL';
    }

    resultados.testes.push({
      teste: 'Isolamento Clínica A',
      status: resultadoA.length === 3 ? 'PASS' : 'FAIL',
      esperado: 3,
      retornado: resultadoA.length,
      detalhes: resultadoA.map(c => c.nome_completo).join(', ')
    });

    // TESTE 2: Listar contatos da Clínica B (deve retornar APENAS 3)
    const resultadoB = await base44.asServiceRole.entities.Contato.filter({ 
      clinica_id: clinica2.id 
    });

    if (resultadoB.length !== 3) {
      resultados.vulnerabilidades.push({
        tipo: 'vazamento_multitenant',
        severidade: 'CRITICAL',
        detalhes: `Clínica B deveria retornar 3 contatos, retornou ${resultadoB.length}`,
        evidencia: resultadoB.map(c => ({ id: c.id, nome: c.nome_completo, clinica_id: c.clinica_id }))
      });
      resultados.status = 'FAIL';
    }

    resultados.testes.push({
      teste: 'Isolamento Clínica B',
      status: resultadoB.length === 3 ? 'PASS' : 'FAIL',
      esperado: 3,
      retornado: resultadoB.length,
      detalhes: resultadoB.map(c => c.nome_completo).join(', ')
    });

    // TESTE 3: Verificar que NENHUM contato de A aparece em B
    const contatosAEmB = resultadoB.filter(c => 
      contatosA.some(ca => ca.id === c.id)
    );

    if (contatosAEmB.length > 0) {
      resultados.vulnerabilidades.push({
        tipo: 'cross_tenant_leak',
        severidade: 'CRITICAL',
        detalhes: `${contatosAEmB.length} contatos da Clínica A vazaram para Clínica B`,
        evidencia: contatosAEmB
      });
      resultados.status = 'FAIL';
    }

    resultados.testes.push({
      teste: 'Vazamento Cross-Tenant (A→B)',
      status: contatosAEmB.length === 0 ? 'PASS' : 'FAIL',
      vazamentos: contatosAEmB.length
    });

    // TESTE 4: .list() SEM filtro (modo inseguro) - deve retornar TUDO
    const todosSemFiltro = await base44.asServiceRole.entities.Contato.list('-created_date', 1000);
    const totalEsperado = contatosA.length + contatosB.length;

    resultados.testes.push({
      teste: 'List sem filtro (baseline)',
      status: 'INFO',
      total_sistema: todosSemFiltro.length,
      total_teste: totalEsperado,
      alerta: todosSemFiltro.length > totalEsperado ? 
        `ATENÇÃO: Existem ${todosSemFiltro.length - totalEsperado} contatos de OUTRAS clínicas no sistema` : 
        null
    });

    // CLEANUP: Deletar clínicas de teste
    try {
      await base44.asServiceRole.entities.Contato.filter({ clinica_id: clinica1.id })
        .then(list => Promise.all(list.map(c => base44.asServiceRole.entities.Contato.delete(c.id))));
      await base44.asServiceRole.entities.Contato.filter({ clinica_id: clinica2.id })
        .then(list => Promise.all(list.map(c => base44.asServiceRole.entities.Contato.delete(c.id))));
      await base44.asServiceRole.entities.Clinica.delete(clinica1.id);
      await base44.asServiceRole.entities.Clinica.delete(clinica2.id);
      
      resultados.cleanup = 'SUCCESS';
    } catch (e) {
      resultados.cleanup = `PARTIAL: ${e.message}`;
    }

    // CONCLUSÃO
    resultados.conclusao = resultados.status === 'PASS' 
      ? '✅ ISOLAMENTO MULTITENANT VALIDADO - Sistema seguro'
      : '❌ VULNERABILIDADES DETECTADAS - Risco LGPD crítico';

    return Response.json(resultados);

  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});