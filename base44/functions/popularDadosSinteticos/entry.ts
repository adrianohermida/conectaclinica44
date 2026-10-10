import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * POPULAR DADOS SINTÉTICOS - VALIDAÇÃO DE ÍNDICES
 * Cria 1000 registros por entity para testar performance REAL
 * SEM dados = teste INVÁLIDO | COM dados = prova de index scan vs full scan
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clinicaId = user.clinica_id || '6933153160425a5bbedbcb88';
    const resultados = [];
    const batchSize = 100; // Criar em lotes de 100

    // MEDICAMENTO - 1000 registros
    const startMedicamento = performance.now();
    const medicamentos = [];
    for (let i = 0; i < 1000; i++) {
      medicamentos.push({
        clinica_id: clinicaId,
        nome: `Medicamento Teste ${i}`,
        principio_ativo: `Ativo ${i % 50}`,
        categoria: ['antibiotico', 'analgesico', 'vitamina'][i % 3],
        quantidade_estoque: Math.floor(Math.random() * 100),
        estoque_minimo: 10,
        preco_custo: 10 + Math.random() * 50,
        preco_venda: 20 + Math.random() * 100,
        ativo: i % 10 !== 0 // 90% ativos
      });
    }
    
    // Criar em lotes
    for (let i = 0; i < medicamentos.length; i += batchSize) {
      await base44.asServiceRole.entities.Medicamento.bulkCreate(
        medicamentos.slice(i, i + batchSize)
      );
    }
    const endMedicamento = performance.now();
    resultados.push({
      entity: 'Medicamento',
      registros_criados: 1000,
      tempo_ms: Math.round(endMedicamento - startMedicamento)
    });

    // MOVIMENTACAO ESTOQUE - 1000 registros
    const startMovimentacao = performance.now();
    const movimentacoes = [];
    const medicamentosIds = await base44.asServiceRole.entities.Medicamento
      .filter({ clinica_id: clinicaId }, '-created_date', 100);
    
    for (let i = 0; i < 1000; i++) {
      const medId = medicamentosIds[i % medicamentosIds.length]?.id || 'test';
      movimentacoes.push({
        clinica_id: clinicaId,
        medicamento_id: medId,
        medicamento_nome: `Med ${i % 50}`,
        tipo_movimentacao: ['entrada', 'saida', 'ajuste'][i % 3],
        quantidade: Math.floor(Math.random() * 50),
        data_movimentacao: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        estoque_anterior: Math.floor(Math.random() * 100),
        estoque_atual: Math.floor(Math.random() * 100)
      });
    }
    
    for (let i = 0; i < movimentacoes.length; i += batchSize) {
      await base44.asServiceRole.entities.MovimentacaoEstoque.bulkCreate(
        movimentacoes.slice(i, i + batchSize)
      );
    }
    const endMovimentacao = performance.now();
    resultados.push({
      entity: 'MovimentacaoEstoque',
      registros_criados: 1000,
      tempo_ms: Math.round(endMovimentacao - startMovimentacao)
    });

    // MENSAGEM - 1000 registros
    const startMensagem = performance.now();
    const mensagens = [];
    for (let i = 0; i < 1000; i++) {
      mensagens.push({
        clinica_id: clinicaId,
        remetente_id: `user_${i % 10}`,
        remetente_nome: `Usuário ${i % 10}`,
        destinatario_id: user.id,
        destinatario_nome: user.full_name,
        mensagem: `Mensagem de teste ${i}`,
        lida: i % 3 === 0 // 33% lidas
      });
    }
    
    for (let i = 0; i < mensagens.length; i += batchSize) {
      await base44.asServiceRole.entities.Mensagem.bulkCreate(
        mensagens.slice(i, i + batchSize)
      );
    }
    const endMensagem = performance.now();
    resultados.push({
      entity: 'Mensagem',
      registros_criados: 1000,
      tempo_ms: Math.round(endMensagem - startMensagem)
    });

    // JORNADA PACIENTE - 1000 registros
    const startJornada = performance.now();
    const jornadas = [];
    for (let i = 0; i < 1000; i++) {
      jornadas.push({
        clinica_id: clinicaId,
        paciente_id: `paciente_${i}`,
        paciente_nome: `Paciente Teste ${i}`,
        estagio_atual: ['novo', 'triagem', 'tratamento', 'acompanhamento', 'alta'][i % 5],
        data_inicio: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    }
    
    for (let i = 0; i < jornadas.length; i += batchSize) {
      await base44.asServiceRole.entities.JornadaPaciente.bulkCreate(
        jornadas.slice(i, i + batchSize)
      );
    }
    const endJornada = performance.now();
    resultados.push({
      entity: 'JornadaPaciente',
      registros_criados: 1000,
      tempo_ms: Math.round(endJornada - startJornada)
    });

    // COLABORACAO MEDICA - 1000 registros
    const startColaboracao = performance.now();
    const colaboracoes = [];
    for (let i = 0; i < 1000; i++) {
      colaboracoes.push({
        clinica_id: clinicaId,
        titulo: `Colaboração ${i}`,
        tipo: ['segunda_opiniao', 'caso_complexo', 'discussao_clinica'][i % 3],
        medico_solicitante: `Dr. ${i % 20}`,
        descricao_caso: `Descrição do caso ${i}`,
        status: ['aberto', 'em_discussao', 'resolvido', 'fechado'][i % 4]
      });
    }
    
    for (let i = 0; i < colaboracoes.length; i += batchSize) {
      await base44.asServiceRole.entities.ColaboracaoMedica.bulkCreate(
        colaboracoes.slice(i, i + batchSize)
      );
    }
    const endColaboracao = performance.now();
    resultados.push({
      entity: 'ColaboracaoMedica',
      registros_criados: 1000,
      tempo_ms: Math.round(endColaboracao - startColaboracao)
    });

    // PLANO TRATAMENTO - 1000 registros
    const startPlano = performance.now();
    const planos = [];
    for (let i = 0; i < 1000; i++) {
      planos.push({
        clinica_id: clinicaId,
        paciente_id: `paciente_${i}`,
        paciente_nome: `Paciente ${i}`,
        titulo: `Plano de Tratamento ${i}`,
        descricao: `Descrição detalhada ${i}`,
        data_inicio: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: ['ativo', 'concluido', 'pausado', 'cancelado'][i % 4],
        progresso_percentual: Math.floor(Math.random() * 100)
      });
    }
    
    for (let i = 0; i < planos.length; i += batchSize) {
      await base44.asServiceRole.entities.PlanoTratamento.bulkCreate(
        planos.slice(i, i + batchSize)
      );
    }
    const endPlano = performance.now();
    resultados.push({
      entity: 'PlanoTratamento',
      registros_criados: 1000,
      tempo_ms: Math.round(endPlano - startPlano)
    });

    // DOCUMENTO ANALISE IA - 500 registros (mais pesado)
    const startDocumento = performance.now();
    const documentos = [];
    for (let i = 0; i < 500; i++) {
      documentos.push({
        paciente_id: `paciente_${i}`,
        paciente_nome: `Paciente ${i}`,
        tipo_documento: ['exame_sangue', 'raio_x', 'tomografia'][i % 3],
        nome_arquivo: `documento_${i}.pdf`,
        arquivo_url: `https://test.com/doc_${i}.pdf`,
        data_analise: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
        analise_ia: {
          resumo: `Análise automatizada ${i}`,
          achados_principais: [`Achado ${i}`],
          nivel_urgencia: ['baixo', 'medio', 'alto'][i % 3],
          confidence_score: Math.random()
        },
        status_validacao: ['pendente', 'aprovado'][i % 2]
      });
    }
    
    for (let i = 0; i < documentos.length; i += batchSize) {
      await base44.asServiceRole.entities.DocumentoAnaliseIA.bulkCreate(
        documentos.slice(i, i + batchSize)
      );
    }
    const endDocumento = performance.now();
    resultados.push({
      entity: 'DocumentoAnaliseIA',
      registros_criados: 500,
      tempo_ms: Math.round(endDocumento - startDocumento)
    });

    const totalTempo = resultados.reduce((sum, r) => sum + r.tempo_ms, 0);
    const totalRegistros = resultados.reduce((sum, r) => sum + r.registros_criados, 0);

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      resumo: {
        total_entities: 7,
        total_registros: totalRegistros,
        tempo_total_ms: totalTempo,
        throughput: Math.round(totalRegistros / (totalTempo / 1000))
      },
      detalhes: resultados,
      proximos_passos: [
        '1. Aguardar 30s para índices MongoDB sincronizarem',
        '2. Executar /medirImpactoIndices',
        '3. Validar P95 < 150ms (vs baseline 1500ms)',
        '4. Se P95 > 200ms = índices não foram aplicados corretamente'
      ]
    });

  } catch (error) {
    return Response.json({ 
      success: false, 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});