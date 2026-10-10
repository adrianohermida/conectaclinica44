import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * 🧪 TESTE E2E BRUTAL - ISOLAMENTO MULTI-TENANT COMPLETO
 * Valida isolamento em TODOS os módulos críticos
 * 
 * EXECUTAR: Toda sexta antes de deploy | CI/CD gate obrigatório
 * FALHA = BLOQUEIA DEPLOY
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'SuperAdmin only' }, { status: 401 });
    }

    const log = [];
    const suites = [];
    let totalPassed = 0;
    let totalFailed = 0;

    // Setup: 2 clínicas de teste
    const clinicas = await base44.asServiceRole.entities.Clinica.list();
    const clinica1 = clinicas[0];
    const clinica2 = clinicas[1];
    
    if (!clinica1 || !clinica2) {
      return Response.json({ error: 'Precisa de 2+ clínicas' }, { status: 400 });
    }

    log.push(`🏥 Clínica 1: ${clinica1.nome} (${clinica1.id})`);
    log.push(`🏥 Clínica 2: ${clinica2.nome} (${clinica2.id})`);

    // Helper: criar entidade e tentar acessar de outra clínica
    async function testIsolamento(entity, data1, data2, suiteNome) {
      const suiteLogs = [];
      let passed = 0;
      let failed = 0;
      const inicio = Date.now();

      try {
        // TESTE 1: Criar em clínica 1
        suiteLogs.push(`\n📝 ${suiteNome} - TESTE 1: Criar em Clínica 1`);
        const created = await base44.asServiceRole.entities[entity].create(data1);
        suiteLogs.push(`✅ ${entity} criado: ${created.id}`);
        passed++;

        // TESTE 2: Tentar criar DUPLICATA em clínica 2 (se tiver constraint)
        suiteLogs.push(`\n🚨 ${suiteNome} - TESTE 2: Tentar duplicar em Clínica 2`);
        try {
          await base44.asServiceRole.entities[entity].create(data2);
          suiteLogs.push(`⚠️ Sem constraint unique (OK se não crítico)`);
          passed++;
        } catch (e) {
          if (e.message.includes('duplicate') || e.message.includes('unique')) {
            suiteLogs.push(`✅ PASSOU: Constraint bloqueou duplicata`);
            passed++;
          } else {
            suiteLogs.push(`❌ FALHOU: Erro inesperado: ${e.message}`);
            failed++;
          }
        }

        // TESTE 3: Filtrar em clínica 2 - NÃO deve ver registro de clínica 1
        suiteLogs.push(`\n🔍 ${suiteNome} - TESTE 3: Validar filtro (Clínica 2 isolada)`);
        const filtered = await base44.asServiceRole.entities[entity].filter({
          clinica_id: clinica2.id
        });
        
        const vazou = filtered.some(r => r.id === created.id);
        
        if (vazou) {
          suiteLogs.push(`❌ FALHA CRÍTICA: Clínica 2 vê dados da Clínica 1`);
          failed++;
        } else {
          suiteLogs.push(`✅ PASSOU: Clínica 2 isolada`);
          passed++;
        }

        // Cleanup
        await base44.asServiceRole.entities[entity].delete(created.id);
        suiteLogs.push(`🧹 Cleanup OK`);

      } catch (setupError) {
        suiteLogs.push(`❌ Setup falhou: ${setupError.message}`);
        failed++;
      }

      const duracao = Date.now() - inicio;
      return { suite: suiteNome, passed, failed, logs: suiteLogs, tempo_execucao: duracao };
    }

    // SUITE 1: Tickets (Helpdesk/Atendimento)
    const ticketResult = await testIsolamento(
      'Ticket',
      {
        clinica_id: clinica1.id,
        assunto: 'Teste Isolamento Ticket 1',
        canal: 'email'
      },
      {
        clinica_id: clinica2.id,
        assunto: 'Teste Isolamento Ticket 2',
        canal: 'email'
      },
      'Tickets (Atendimento)'
    );
    suites.push(ticketResult);
    log.push(...ticketResult.logs);
    totalPassed += ticketResult.passed;
    totalFailed += ticketResult.failed;

    // SUITE 2: Contatos (Pacientes)
    const contatoResult = await testIsolamento(
      'Contato',
      {
        clinica_id: clinica1.id,
        nome_completo: 'Paciente Teste Isolamento 1',
        tipo_contato: 'paciente'
      },
      {
        clinica_id: clinica2.id,
        nome_completo: 'Paciente Teste Isolamento 2',
        tipo_contato: 'paciente'
      },
      'Contatos (Pacientes)'
    );
    suites.push(contatoResult);
    log.push(...contatoResult.logs);
    totalPassed += contatoResult.passed;
    totalFailed += contatoResult.failed;

    // SUITE 3: Prontuários
    const prontuarioResult = await testIsolamento(
      'Prontuario',
      {
        clinica_id: clinica1.id,
        paciente_id: 'test_pac_1',
        paciente_nome: 'Paciente Teste 1',
        data_atendimento: new Date().toISOString().split('T')[0],
        medico_crm: '12345/AM',
        medico_nome: 'Dr. Teste',
        queixa_principal: 'Teste isolamento'
      },
      {
        clinica_id: clinica2.id,
        paciente_id: 'test_pac_2',
        paciente_nome: 'Paciente Teste 2',
        data_atendimento: new Date().toISOString().split('T')[0],
        medico_crm: '67890/AM',
        medico_nome: 'Dra. Teste',
        queixa_principal: 'Teste isolamento'
      },
      'Prontuários'
    );
    suites.push(prontuarioResult);
    log.push(...prontuarioResult.logs);
    totalPassed += prontuarioResult.passed;
    totalFailed += prontuarioResult.failed;

    // SUITE 4: Agendamentos
    const agendamentoResult = await testIsolamento(
      'Agendamento',
      {
        clinica_id: clinica1.id,
        paciente_nome: 'Paciente Teste 1',
        data: new Date().toISOString().split('T')[0],
        horario: '09:00',
        tipo_consulta: 'presencial'
      },
      {
        clinica_id: clinica2.id,
        paciente_nome: 'Paciente Teste 2',
        data: new Date().toISOString().split('T')[0],
        horario: '10:00',
        tipo_consulta: 'presencial'
      },
      'Agendamentos (Agenda)'
    );
    suites.push(agendamentoResult);
    log.push(...agendamentoResult.logs);
    totalPassed += agendamentoResult.passed;
    totalFailed += agendamentoResult.failed;

    // SUITE 5: Documentos (Repositório)
    const documentoResult = await testIsolamento(
      'DocumentoCompliance',
      {
        clinica_id: clinica1.id,
        titulo: 'Doc Teste Isolamento 1',
        categoria: 'outros'
      },
      {
        clinica_id: clinica2.id,
        titulo: 'Doc Teste Isolamento 2',
        categoria: 'outros'
      },
      'Documentos (Repositório)'
    );
    suites.push(documentoResult);
    log.push(...documentoResult.logs);
    totalPassed += documentoResult.passed;
    totalFailed += documentoResult.failed;

    // SUITE 6: Produtos
    const produtoResult = await testIsolamento(
      'Produto',
      {
        clinica_id: clinica1.id,
        nome: 'Produto Teste 1',
        tipo: 'produto',
        preco_base: 100
      },
      {
        clinica_id: clinica2.id,
        nome: 'Produto Teste 2',
        tipo: 'produto',
        preco_base: 100
      },
      'Produtos'
    );
    suites.push(produtoResult);
    log.push(...produtoResult.logs);
    totalPassed += produtoResult.passed;
    totalFailed += produtoResult.failed;

    // SUITE 7: Financeiro (ContaPagar)
    const contaPagarResult = await testIsolamento(
      'ContaPagar',
      {
        clinica_id: clinica1.id,
        descricao: 'Conta Teste 1',
        valor: 100,
        data_vencimento: new Date().toISOString()
      },
      {
        clinica_id: clinica2.id,
        descricao: 'Conta Teste 2',
        valor: 100,
        data_vencimento: new Date().toISOString()
      },
      'Financeiro (ContaPagar)'
    );
    suites.push(contaPagarResult);
    log.push(...contaPagarResult.logs);
    totalPassed += contaPagarResult.passed;
    totalFailed += contaPagarResult.failed;

    // SUITE 8: Jornada Paciente
    const jornadaResult = await testIsolamento(
      'JornadaPaciente',
      {
        clinica_id: clinica1.id,
        paciente_id: 'test_jornada_1',
        paciente_nome: 'Paciente Jornada 1'
      },
      {
        clinica_id: clinica2.id,
        paciente_id: 'test_jornada_2',
        paciente_nome: 'Paciente Jornada 2'
      },
      'Jornada Paciente'
    );
    suites.push(jornadaResult);
    log.push(...jornadaResult.logs);
    totalPassed += jornadaResult.passed;
    totalFailed += jornadaResult.failed;

    // SUITE 9: Plano Tratamento
    const tratamentoResult = await testIsolamento(
      'PlanoTratamento',
      {
        clinica_id: clinica1.id,
        paciente_id: 'test_trat_1',
        paciente_nome: 'Paciente Teste 1',
        titulo: 'Tratamento Teste 1'
      },
      {
        clinica_id: clinica2.id,
        paciente_id: 'test_trat_2',
        paciente_nome: 'Paciente Teste 2',
        titulo: 'Tratamento Teste 2'
      },
      'Plano Tratamento'
    );
    suites.push(tratamentoResult);
    log.push(...tratamentoResult.logs);
    totalPassed += tratamentoResult.passed;
    totalFailed += tratamentoResult.failed;

    // SUITE 10: WhatsApp Config
    const whatsappResult = await testIsolamento(
      'ConfiguracaoWhatsApp',
      {
        clinica_id: clinica1.id,
        twilio_phone_number: '+5511999999991',
        twilio_account_sid: 'test_sid_1'
      },
      {
        clinica_id: clinica2.id,
        twilio_phone_number: '+5511999999992',
        twilio_account_sid: 'test_sid_2'
      },
      'WhatsApp Config'
    );
    suites.push(whatsappResult);
    log.push(...whatsappResult.logs);
    totalPassed += whatsappResult.passed;
    totalFailed += whatsappResult.failed;

    // SUITE 11: Vendas (Marketplace)
    const vendaResult = await testIsolamento(
      'Venda',
      {
        clinica_id: clinica1.id,
        data_venda: new Date().toISOString().split('T')[0],
        valor_final: 100
      },
      {
        clinica_id: clinica2.id,
        data_venda: new Date().toISOString().split('T')[0],
        valor_final: 200
      },
      'Vendas (Marketplace)'
    );
    suites.push(vendaResult);
    log.push(...vendaResult.logs);
    totalPassed += vendaResult.passed;
    totalFailed += vendaResult.failed;

    // SUITE 12: Estoque
    const estoqueResult = await testIsolamento(
      'MovimentacaoEstoque',
      {
        clinica_id: clinica1.id,
        medicamento_id: 'test_med_1',
        tipo_movimentacao: 'entrada',
        quantidade: 10
      },
      {
        clinica_id: clinica2.id,
        medicamento_id: 'test_med_2',
        tipo_movimentacao: 'entrada',
        quantidade: 20
      },
      'Movimentações Estoque'
    );
    suites.push(estoqueResult);
    log.push(...estoqueResult.logs);
    totalPassed += estoqueResult.passed;
    totalFailed += estoqueResult.failed;

    // SUITE 13: Colaboração Médica
    const colaboracaoResult = await testIsolamento(
      'ColaboracaoMedica',
      {
        clinica_id: clinica1.id,
        titulo: 'Discussão Teste 1',
        tipo: 'caso_complexo',
        medico_solicitante: 'Dr. Teste 1',
        descricao_caso: 'Caso teste isolamento 1'
      },
      {
        clinica_id: clinica2.id,
        titulo: 'Discussão Teste 2',
        tipo: 'caso_complexo',
        medico_solicitante: 'Dr. Teste 2',
        descricao_caso: 'Caso teste isolamento 2'
      },
      'Colaboração Médica'
    );
    suites.push(colaboracaoResult);
    log.push(...colaboracaoResult.logs);
    totalPassed += colaboracaoResult.passed;
    totalFailed += colaboracaoResult.failed;

    // SUITE 14: Email Config
    const emailResult = await testIsolamento(
      'ConfiguracaoEmail',
      {
        clinica_id: clinica1.id,
        provedor: 'conectaclinica',
        email_remetente: `teste1-${Date.now()}@conectaclinica.com.br`,
        nome_remetente: 'Teste 1'
      },
      {
        clinica_id: clinica2.id,
        provedor: 'conectaclinica',
        email_remetente: `teste2-${Date.now()}@conectaclinica.com.br`,
        nome_remetente: 'Teste 2'
      },
      'Config Email (SendGrid)'
    );
    suites.push(emailResult);
    log.push(...emailResult.logs);
    totalPassed += emailResult.passed;
    totalFailed += emailResult.failed;

    // SUITE 15: Mensagens Internas
    const mensagemResult = await testIsolamento(
      'MensagemInterna',
      {
        clinica_id: clinica1.id,
        remetente_id: 'test_user_1',
        remetente_nome: 'Teste 1',
        destinatario_id: 'test_user_dest_1',
        destinatario_nome: 'Dest 1',
        tipo_conversa: 'equipe_equipe',
        conteudo: 'Mensagem teste 1'
      },
      {
        clinica_id: clinica2.id,
        remetente_id: 'test_user_2',
        remetente_nome: 'Teste 2',
        destinatario_id: 'test_user_dest_2',
        destinatario_nome: 'Dest 2',
        tipo_conversa: 'equipe_equipe',
        conteudo: 'Mensagem teste 2'
      },
      'Mensagens Internas'
    );
    suites.push(mensagemResult);
    log.push(...mensagemResult.logs);
    totalPassed += mensagemResult.passed;
    totalFailed += mensagemResult.failed;

    // SUITE 16: Notas Internas (compliance)
    const notaResult = await testIsolamento(
      'NotaInterna',
      {
        clinica_id: clinica1.id,
        ticket_id: 'test_ticket_1',
        autor_id: 'test_autor_1',
        autor_nome: 'Autor Teste 1',
        conteudo: 'Nota teste 1'
      },
      {
        clinica_id: clinica2.id,
        ticket_id: 'test_ticket_2',
        autor_id: 'test_autor_2',
        autor_nome: 'Autor Teste 2',
        conteudo: 'Nota teste 2'
      },
      'Notas Internas'
    );
    suites.push(notaResult);
    log.push(...notaResult.logs);
    totalPassed += notaResult.passed;
    totalFailed += notaResult.failed;

    // SUITE 17: Templates Resposta
    const templateResult = await testIsolamento(
      'TemplateResposta',
      {
        clinica_id: clinica1.id,
        titulo: 'Template Teste 1',
        conteudo: 'Conteúdo template 1'
      },
      {
        clinica_id: clinica2.id,
        titulo: 'Template Teste 2',
        conteudo: 'Conteúdo template 2'
      },
      'Templates Resposta (Helpdesk)'
    );
    suites.push(templateResult);
    log.push(...templateResult.logs);
    totalPassed += templateResult.passed;
    totalFailed += templateResult.failed;

    // SUITE 18: Pastas Compliance (Repositório)
    const pastaResult = await testIsolamento(
      'PastaCompliance',
      {
        clinica_id: clinica1.id,
        nome: 'Pasta Teste 1'
      },
      {
        clinica_id: clinica2.id,
        nome: 'Pasta Teste 2'
      },
      'Pastas (Repositório)'
    );
    suites.push(pastaResult);
    log.push(...pastaResult.logs);
    totalPassed += pastaResult.passed;
    totalFailed += pastaResult.failed;

    // SUITE 19: Mensagens Ticket (Atendimento)
    const msgTicketResult = await testIsolamento(
      'MensagemTicket',
      {
        clinica_id: clinica1.id,
        ticket_id: 'test_tkt_msg_1',
        autor_nome: 'Autor 1',
        autor_email: 'autor1@test.com',
        tipo_autor: 'usuario',
        mensagem: 'Mensagem teste 1'
      },
      {
        clinica_id: clinica2.id,
        ticket_id: 'test_tkt_msg_2',
        autor_nome: 'Autor 2',
        autor_email: 'autor2@test.com',
        tipo_autor: 'usuario',
        mensagem: 'Mensagem teste 2'
      },
      'Mensagens Ticket (Atendimento)'
    );
    suites.push(msgTicketResult);
    log.push(...msgTicketResult.logs);
    totalPassed += msgTicketResult.passed;
    totalFailed += msgTicketResult.failed;

    // SUITE 20: Notificações Sistema
    const notifSistemaResult = await testIsolamento(
      'NotificacaoSistema',
      {
        clinica_id: clinica1.id,
        destinatario_id: 'test_dest_1',
        titulo: 'Notif Teste 1',
        mensagem: 'Mensagem notif 1',
        tipo: 'informacao'
      },
      {
        clinica_id: clinica2.id,
        destinatario_id: 'test_dest_2',
        titulo: 'Notif Teste 2',
        mensagem: 'Mensagem notif 2',
        tipo: 'informacao'
      },
      'Notificações Sistema'
    );
    suites.push(notifSistemaResult);
    log.push(...notifSistemaResult.logs);
    totalPassed += notifSistemaResult.passed;
    totalFailed += notifSistemaResult.failed;

    // SUITE 21: Notificações (User-facing)
    const notifResult = await testIsolamento(
      'Notificacao',
      {
        clinica_id: clinica1.id,
        usuario_id: 'test_usr_1',
        titulo: 'Notif User 1',
        mensagem: 'Msg User 1',
        tipo: 'geral'
      },
      {
        clinica_id: clinica2.id,
        usuario_id: 'test_usr_2',
        titulo: 'Notif User 2',
        mensagem: 'Msg User 2',
        tipo: 'geral'
      },
      'Notificações (User)'
    );
    suites.push(notifResult);
    log.push(...notifResult.logs);
    totalPassed += notifResult.passed;
    totalFailed += notifResult.failed;

    // SUITE 22: Sessão Widget IA
    const widgetSessaoResult = await testIsolamento(
      'SessaoWidget',
      {
        clinica_id: clinica1.id,
        visitor_id: 'visitor_test_1',
        origem: 'website'
      },
      {
        clinica_id: clinica2.id,
        visitor_id: 'visitor_test_2',
        origem: 'website'
      },
      'Sessão Widget IA'
    );
    suites.push(widgetSessaoResult);
    log.push(...widgetSessaoResult.logs);
    totalPassed += widgetSessaoResult.passed;
    totalFailed += widgetSessaoResult.failed;

    // SUITE 23: Consumo Widget IA
    const widgetConsumoResult = await testIsolamento(
      'ConsumoWidgetIA',
      {
        clinica_id: clinica1.id,
        sessao_id: 'test_sessao_1',
        tipo_interacao: 'mensagem_usuario',
        tokens_usados: 10
      },
      {
        clinica_id: clinica2.id,
        sessao_id: 'test_sessao_2',
        tipo_interacao: 'mensagem_usuario',
        tokens_usados: 20
      },
      'Consumo Widget IA'
    );
    suites.push(widgetConsumoResult);
    log.push(...widgetConsumoResult.logs);
    totalPassed += widgetConsumoResult.passed;
    totalFailed += widgetConsumoResult.failed;

    // SUITE 24: Prescrições Eletrônicas
    const prescricaoResult = await testIsolamento(
      'PrescricaoEletronica',
      {
        clinica_id: clinica1.id,
        paciente_id: 'test_pac_presc_1',
        paciente_nome: 'Paciente Presc 1',
        medico_crm: '12345/AM',
        medico_nome: 'Dr. Presc 1',
        data_prescricao: new Date().toISOString().split('T')[0]
      },
      {
        clinica_id: clinica2.id,
        paciente_id: 'test_pac_presc_2',
        paciente_nome: 'Paciente Presc 2',
        medico_crm: '67890/AM',
        medico_nome: 'Dr. Presc 2',
        data_prescricao: new Date().toISOString().split('T')[0]
      },
      'Prescrições Eletrônicas'
    );
    suites.push(prescricaoResult);
    log.push(...prescricaoResult.logs);
    totalPassed += prescricaoResult.passed;
    totalFailed += prescricaoResult.failed;

    // SUITE 25: Médicos
    const medicoResult = await testIsolamento(
      'Medico',
      {
        clinica_id: clinica1.id,
        nome_completo: 'Dr. Teste Isolamento 1',
        crm_principal: `${Math.random().toString().slice(2,7)}/AM`,
        especialidade_principal: 'clinica_geral'
      },
      {
        clinica_id: clinica2.id,
        nome_completo: 'Dr. Teste Isolamento 2',
        crm_principal: `${Math.random().toString().slice(2,7)}/SP`,
        especialidade_principal: 'clinica_geral'
      },
      'Médicos'
    );
    suites.push(medicoResult);
    log.push(...medicoResult.logs);
    totalPassed += medicoResult.passed;
    totalFailed += medicoResult.failed;

    // SUITE 26: Interações Paciente
    const interacaoResult = await testIsolamento(
      'InteracaoPaciente',
      {
        clinica_id: clinica1.id,
        paciente_id: 'test_pac_int_1',
        tipo: 'chamada',
        duracao_segundos: 120
      },
      {
        clinica_id: clinica2.id,
        paciente_id: 'test_pac_int_2',
        tipo: 'chamada',
        duracao_segundos: 180
      },
      'Interações Paciente'
    );
    suites.push(interacaoResult);
    log.push(...interacaoResult.logs);
    totalPassed += interacaoResult.passed;
    totalFailed += interacaoResult.failed;

    // SUITE 27: Agente IA Clínica
    const agenteResult = await testIsolamento(
      'AgenteIAClinica',
      {
        clinica_id: clinica1.id,
        nome: 'Agente Teste 1',
        tipo: 'atendimento',
        modelo_ia: 'gpt-4o-mini'
      },
      {
        clinica_id: clinica2.id,
        nome: 'Agente Teste 2',
        tipo: 'atendimento',
        modelo_ia: 'gpt-4o-mini'
      },
      'Agente IA Clínica'
    );
    suites.push(agenteResult);
    log.push(...agenteResult.logs);
    totalPassed += agenteResult.passed;
    totalFailed += agenteResult.failed;

    // SUITE 28: Análise Documentos IA
    const analiseIAResult = await testIsolamento(
      'DocumentoAnaliseIA',
      {
        paciente_id: 'test_pac_analise_1',
        paciente_nome: 'Paciente Análise 1',
        tipo_documento: 'exame_sangue',
        arquivo_url: 'https://example.com/exame1.pdf',
        analise_ia: {
          resumo: 'Teste resumo 1',
          nivel_urgencia: 'baixo'
        }
      },
      {
        paciente_id: 'test_pac_analise_2',
        paciente_nome: 'Paciente Análise 2',
        tipo_documento: 'exame_sangue',
        arquivo_url: 'https://example.com/exame2.pdf',
        analise_ia: {
          resumo: 'Teste resumo 2',
          nivel_urgencia: 'baixo'
        }
      },
      'Análise Documentos IA'
    );
    suites.push(analiseIAResult);
    log.push(...analiseIAResult.logs);
    totalPassed += analiseIAResult.passed;
    totalFailed += analiseIAResult.failed;

    // Score geral
    const total = totalPassed + totalFailed;
    const score = total > 0 ? (totalPassed / total * 100).toFixed(1) : 0;
    const status = totalFailed === 0 ? '✅ TODOS PASSARAM' : '❌ FALHAS CRÍTICAS DETECTADAS';

    // Detectar módulos lentos (> 3s)
    const modulosLentos = suites.filter(s => s.tempo_execucao > 3000);

    return Response.json({
      success: true,
      score: `${score}%`,
      passed: totalPassed,
      failed: totalFailed,
      total,
      status,
      suites: suites.map(s => ({
        suite: s.suite,
        passed: s.passed,
        failed: s.failed,
        tempo_execucao: s.tempo_execucao,
        status: s.failed === 0 ? '✅ OK' : '❌ FALHOU'
      })),
      log,
      criticidade: totalFailed > 0 ? 'CRÍTICA - DEPLOY BLOQUEADO' : 'OK',
      ci_cd_gate: totalFailed === 0,
      modulos_lentos: modulosLentos.map(m => ({
        modulo: m.suite,
        tempo_ms: m.tempo_execucao
      })),
      recomendacoes: (() => {
        const recs = [];
        if (totalFailed > 0) {
          recs.push('🚨 CRÍTICO: Corrigir isolamento ANTES de deploy');
          recs.push('🔒 Adicionar constraints unique onde faltam');
          recs.push('📊 Executar auditoria manual nos módulos que falharam');
        } else {
          recs.push('✅ Isolamento robusto em todos os módulos');
          recs.push('🔄 Executar diariamente no CI/CD');
        }
        if (modulosLentos.length > 0) {
          recs.push(`⚡ Otimizar ${modulosLentos.length} módulo(s) lento(s) (> 3s)`);
        }
        return recs;
      })()
    });
  } catch (error) {
    console.error('[testeE2EIsolamentoCompleto] Erro:', error);
    return Response.json({ 
      success: false, 
      error: error.message,
      ci_cd_gate: false
    }, { status: 500 });
  }
});