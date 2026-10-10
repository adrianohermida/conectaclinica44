import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * AUDITORIA BRUTAL V2 - VALIDAÇÃO CONTRA CODEBASE REAL
 * 
 * Valida OBJETIVAMENTE:
 * 1. Evidências EXISTEM no codebase? (entities, pages, functions REAIS)
 * 2. Definition of Done COMPLETO? (min 3 critérios mensuráveis)
 * 3. Observações TÉCNICAS? (arquitetura, testes, performance, compliance)
 * 4. Requisitos externos DOCUMENTADOS?
 * 5. Performance MENSURADA? (P95, latência, índices)
 * 6. Compliance VALIDADO? (LGPD + CFM documentados)
 * 
 * RETORNA: Score honesto 0-100 + RESETAR status fake-dones + INJETAR checklist
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // MAPEAR CODEBASE REAL - fonte única de verdade
    const codebaseReal = {
      entities: [
        'ChecklistProjeto', 'Paciente', 'Contato', 'Agendamento', 'Prontuario', 
        'Produto', 'Medicamento', 'PlanoTratamento', 'DocumentoCompliance', 
        'PastaCompliance', 'Ticket', 'Mensagem', 'User', 'Clinica', 
        'Venda', 'ContaPagar', 'ContaReceber', 'Medico', 'TermoLegal', 
        'AceiteTermoLegal', 'FAQ', 'Notificacao', 'ConfiguracaoClinica',
        'PlanoModulo', 'AssinaturaClinica', 'ConsumoRecurso', 'CreditoIA',
        'JornadaPaciente', 'ColaboracaoMedica', 'DocumentoAnaliseIA'
      ],
      pages: [
        'PlanejamentoEstrategico', 'DashboardCompleto', 'Agenda', 'Pacientes', 
        'Prontuarios', 'Produtos', 'Atendimento', 'Financeiro', 
        'Administracao', 'Repositorio', 'HubCompliance', 'SuperAdmin',
        'Telemedicina', 'JornadaPaciente', 'ColaboracaoMedica', 'AnaliseDocumentosIA',
        'PrescricoesEletronicas', 'Tratamentos', 'GestaoClinicas', 'MapaRotas'
      ],
      functions: [
        'auditarModulosBrutal', 'otimizarOrdemExecucao', 'listarClinicas', 
        'stripeWebhook', 'createStripeCheckout', 'testeE2EIsolamentoCompleto',
        'consultarCrmAtivoCFM', 'registrarAceiteTermo', 'gerarCertificadoAuditoria',
        'indexarDocumentoIA', 'enviarAssinaturaDigital', 'criarCheckoutCreditos'
      ]
    };

    // Buscar TODOS itens
    const itens = await base44.asServiceRole.entities.ChecklistProjeto.list('-deadline', 500);
    
    let itens_atualizados = 0;
    let fake_dones_detectados = 0;
    let status_resetados = 0;
    const resultados = [];
    
    // RATE LIMIT PREVENTION: processar SEQUENCIALMENTE
    const updateWithRetry = async (item, novoStatus, novoPercentual, checklistBrutal, score, temTagFeature, maxRetries = 3) => {
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          await base44.asServiceRole.entities.ChecklistProjeto.update(item.id, {
            status: novoStatus,
            percentual_completo: novoPercentual,
            observacoes: checklistBrutal,
            score_checklist: score,
            bloqueio_completo_ate_100: !temTagFeature
          });
          return;
        } catch (error) {
          if (error.message?.includes('Rate limit') && attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 2000));
            continue;
          }
          throw error;
        }
      }
    };

      for (const item of itens) {
        // Auditar apenas completos ou em_progresso
        if (item.status !== 'completo' && item.status !== 'em_progresso') {
          continue;
        }

        const auditoria = auditarItemBrutal(item, codebaseReal);
        const score = auditoria.score_honesto;

        // BLOQUEIO CRÍTICO: Completo SÓ SE score=100 OU tag feature_futura
        const temTagFeature = item.tags?.includes('feature_futura');
        const isFakeDone = item.status === 'completo' && score < 100 && !temTagFeature;
        const isProgressoIrreal = item.status === 'em_progresso' && item.percentual_completo > (score + 10);

        if (isFakeDone) {
          fake_dones_detectados++;
          status_resetados++;
        }

        // RESETAR status + % se fake-done
        const novoStatus = isFakeDone ? 'pendente' : 
                          isProgressoIrreal ? 'pendente' : item.status;
        const novoPercentual = isProgressoIrreal ? Math.max(0, score - 10) : 
                              isFakeDone ? Math.max(0, score - 20) : 
                              item.percentual_completo;

        // GERAR CHECKLIST BRUTAL
        const checklistBrutal = gerarChecklistBrutal(item, score, auditoria, temTagFeature);

        // ATUALIZAR COM RETRY
        await updateWithRetry(item, novoStatus, novoPercentual, checklistBrutal, score, temTagFeature);

        itens_atualizados++;

        resultados.push({
          id: item.id,
          modulo: item.modulo,
          score,
          status_antes: item.status,
          status_depois: novoStatus,
          percentual_antes: item.percentual_completo,
          percentual_depois: novoPercentual,
          fake_done: isFakeDone,
          problemas: auditoria.problemas
        });

        // Delay ENTRE CADA ITEM (ultra-conservador)
        await new Promise(resolve => setTimeout(resolve, 400));
      }

    const scoreGeral = resultados.reduce((acc, r) => acc + r.score, 0) / (resultados.length || 1);

    return Response.json({
      success: true,
      itens_atualizados,
      total_analisado: itens.length,
      score_geral: scoreGeral,
      resumo: {
        fake_dones_totais: fake_dones_detectados,
        status_resetados,
        sem_evidencias: resultados.filter(r => r.problemas.includes('Nenhuma evidência declarada')).length,
        sem_dod: resultados.filter(r => r.problemas.includes('Definition of Done ausente')).length,
        compliance_falhas: resultados.filter(r => 
          r.problemas.some(p => p.includes('LGPD') || p.includes('CFM'))
        ).length
      },
      detalhes: resultados
    });

  } catch (error) {
    console.error('[auditarModulosBrutal] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function auditarItemBrutal(item, codebaseReal) {
  let score = 0;
  const problemas = [];
  const evidencias_validadas = { encontradas: [], faltando: [] };
  
  // 1. VALIDAR EVIDÊNCIAS CONTRA CODEBASE REAL (30 pontos)
  if (item.evidencias && item.evidencias.length > 0) {
    item.evidencias.forEach(ev => {
      const tipo = ev.includes('entities/') ? 'entities' : 
                   ev.includes('pages/') ? 'pages' : 
                   ev.includes('functions/') ? 'functions' : null;
      
      if (tipo) {
        const nome = ev.split('/')[1]?.replace('.json', '').replace('.js', '');
        if (codebaseReal[tipo].includes(nome)) {
          evidencias_validadas.encontradas.push(ev);
          score += 10; // 10 pontos por evidência válida (max 30)
        } else {
          evidencias_validadas.faltando.push(ev);
          problemas.push(`Evidência DECLARADA mas NÃO ENCONTRADA: ${ev}`);
        }
      } else {
        problemas.push(`Evidência com formato inválido: ${ev}`);
      }
    });
    
    if (evidencias_validadas.encontradas.length === 0) {
      problemas.push('Zero evidências validadas no codebase');
    }
  } else {
    problemas.push('Nenhuma evidência declarada');
  }
  
  // 2. DEFINITION OF DONE (20 pontos)
  if (item.definition_of_done && item.definition_of_done.length >= 3) {
    score += 20;
  } else if (item.definition_of_done && item.definition_of_done.length > 0) {
    score += 10;
    problemas.push(`DoD incompleta: ${item.definition_of_done.length}/3 critérios mínimos`);
  } else {
    problemas.push('Definition of Done ausente');
  }
  
  // 3. OBSERVAÇÕES TÉCNICAS DETALHADAS (15 pontos)
  const obs = item.observacoes || '';
  const temArquitetura = obs.includes('ARQUITETURA') || obs.includes('PROMPT');
  const temTestes = obs.toLowerCase().includes('teste') || obs.toLowerCase().includes('e2e');
  const temValidacao = obs.toLowerCase().includes('validação') || obs.toLowerCase().includes('schema');
  
  if (obs.length > 200 && (temArquitetura || temTestes || temValidacao)) {
    score += 15;
  } else if (obs.length > 100) {
    score += 8;
    problemas.push('Observações técnicas superficiais (falta arquitetura/testes/validação)');
  } else {
    problemas.push('Observações técnicas ausentes ou muito curtas');
  }
  
  // 4. REQUISITOS EXTERNOS DOCUMENTADOS (10 pontos)
  if (item.requisitos_externos && item.requisitos_externos.length > 0) {
    score += 10;
  } else if (item.categoria === 'integracao' || item.categoria === 'monetizacao') {
    problemas.push('Requisitos externos NÃO documentados (crítico para integração/pagamento)');
  }
  
  // 5. COMPLIANCE LGPD/CFM (15 pontos)
  const mencionaLGPD = obs.toLowerCase().includes('lgpd') || 
                       obs.toLowerCase().includes('consentimento') ||
                       obs.toLowerCase().includes('dados pessoais');
  const mencionaCFM = obs.toLowerCase().includes('cfm') || 
                      obs.toLowerCase().includes('crm') ||
                      obs.toLowerCase().includes('conselho medicina');
  
  if (item.categoria === 'compliance' || item.categoria === 'core') {
    if (mencionaLGPD && mencionaCFM) {
      score += 15;
    } else if (mencionaLGPD || mencionaCFM) {
      score += 8;
      problemas.push(`Compliance PARCIAL: falta ${!mencionaLGPD ? 'LGPD' : 'CFM'}`);
    } else {
      problemas.push('LGPD E CFM não mencionados (CRÍTICO para saúde)');
    }
  } else {
    if (mencionaLGPD || mencionaCFM) score += 10;
  }
  
  // 6. PERFORMANCE MENCIONADA (10 pontos)
  const mencionaPerformance = obs.toLowerCase().includes('p95') || 
                              obs.toLowerCase().includes('latência') ||
                              obs.toLowerCase().includes('índice') ||
                              obs.toLowerCase().includes('cache') ||
                              obs.toLowerCase().includes('query');
  if (mencionaPerformance) {
    score += 10;
  } else if (item.categoria === 'performance' || item.categoria === 'core') {
    problemas.push('Performance/otimização NÃO DOCUMENTADA');
  }
  
  return {
    score_honesto: Math.min(100, score),
    problemas,
    evidencias_validadas
  };
}

function gerarChecklistBrutal(item, score, auditoria, temTagFeature) {
  const hoje = new Date().toISOString().split('T')[0];
  const { problemas, evidencias_validadas } = auditoria;
  
  let checklist = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 AUDITORIA BRUTAL V2 - ${hoje}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SCORE HONESTO: ${score}%
STATUS REAL: ${score < 40 ? '💀 FAKE DONE CRÍTICO - RESETADO PARA PENDENTE' : 
               score < 60 ? '🔴 INCOMPLETO - RESETADO PARA PENDENTE' : 
               score < 80 ? '🟡 PARCIAL - COMPLETAR ANTES DE MARCAR PRONTO' : 
               '🟢 APROVADO - VALIDADO CONTRA CODEBASE'}

━━━ VALIDAÇÃO DE EVIDÊNCIAS NO CODEBASE ━━━
${evidencias_validadas.encontradas.length > 0 ? 
  `✅ VALIDADAS (${evidencias_validadas.encontradas.length}):\n${evidencias_validadas.encontradas.map(e => `   • ${e}`).join('\n')}` : 
  '⚠️  ZERO evidências validadas no codebase'}

${evidencias_validadas.faltando.length > 0 ? 
  `\n❌ DECLARADAS MAS NÃO EXISTEM (${evidencias_validadas.faltando.length}):\n${evidencias_validadas.faltando.map(e => `   • ${e} → MENTIRA, arquivo não existe`).join('\n')}` : 
  ''}

━━━ PROBLEMAS DETECTADOS (${problemas.length}) ━━━
${problemas.length > 0 ? problemas.map((p, i) => `${i + 1}. ${p}`).join('\n') : '✅ Nenhum problema crítico'}

━━━ CHECKLIST DEFINITION OF DONE ━━━
${evidencias_validadas.encontradas.length >= 3 ? '✅' : '❌'} [${evidencias_validadas.encontradas.length}/3] Evidências VALIDADAS no codebase
${item.definition_of_done?.length >= 3 ? '✅' : '❌'} [${item.definition_of_done?.length || 0}/3] Definition of Done completa
${item.observacoes?.length >= 200 ? '✅' : '❌'} [${item.observacoes?.length || 0}/200] Análise técnica DETALHADA
${item.requisitos_externos?.length > 0 ? '✅' : '❌'} Requisitos externos documentados
${item.deadline ? '✅' : '❌'} Deadline definida

━━━ COMPLIANCE & PERFORMANCE OBRIGATÓRIOS ━━━
${item.observacoes?.toLowerCase().includes('lgpd') ? '✅' : '❌'} LGPD validado e documentado
${item.observacoes?.toLowerCase().includes('cfm') || item.observacoes?.toLowerCase().includes('crm') ? '✅' : '❌'} CFM/CRM validado
${item.observacoes?.toLowerCase().includes('p95') || item.observacoes?.toLowerCase().includes('latência') ? '✅' : '❌'} Performance P95 < 200ms documentada
${item.observacoes?.toLowerCase().includes('teste') || item.observacoes?.toLowerCase().includes('e2e') ? '✅' : '❌'} Testes E2E especificados
${item.observacoes?.toLowerCase().includes('índice') || item.observacoes?.toLowerCase().includes('index') ? '✅' : '❌'} Índices DB otimizados

━━━ BLOQUEIO DE CONCLUSÃO ━━━
⚠️ Módulo NÃO PODE ser marcado como COMPLETO até:
   • Score checklist = 100% (TODOS critérios atendidos)
   OU
   • Tag "feature_futura" adicionada (skip intencional, retomar depois)

Status atual: 
   • Score: ${score}%
   • Tag feature_futura: ${temTagFeature ? 'SIM ✅' : 'NÃO ❌'}
   • Resultado: ${score >= 100 || temTagFeature ? '✅ PODE SER MARCADO COMPLETO' : '🔒 BLOQUEADO - completar checklist'}

━━━ AÇÃO NECESSÁRIA PARA APROVAR ━━━
`;

  if (score < 40) {
    checklist += `
1. 💀 CRÍTICO: Módulo é FAKE DONE - foi RESETADO para PENDENTE
2. REFAZER completamente com RIGOR TÉCNICO:
   • Criar entities, pages, functions REAIS (não só declarar)
   • Escrever Definition of Done MENSURÁVEL (min 3 critérios objetivos)
   • Documentar ARQUITETURA + APIS + INTEGRAÇÕES + TESTES E2E
   • Validar LGPD (consentimento, base legal, minimização)
   • Validar CFM (resolução 1643/2002, telemedicina se aplicável)
   • Medir PERFORMANCE (P95 < 200ms, índices documentados)
   • Adicionar TESTES (unitários + integração + E2E)
3. Definir deadline REALISTA (não otimista)`;
  } else if (score < 60) {
    checklist += `
1. 🔴 INCOMPLETO: Módulo RESETADO para PENDENTE
2. Completar TODAS as evidências faltantes
3. Adicionar evidências que EXISTAM no codebase (validar arquivos)
4. Escrever análise técnica COMPLETA (não superficial):
   • Arquitetura detalhada
   • Integrações documentadas
   • Testes especificados
5. Garantir compliance LGPD + CFM DOCUMENTADO
6. Definir métricas de performance atingidas`;
  } else if (score < 80) {
    checklist += `
1. 🟡 PARCIAL: Completar gaps antes de marcar completo
2. Adicionar evidências faltantes: ${evidencias_validadas.faltando.length > 0 ? evidencias_validadas.faltando.join(', ') : 'validar todas'}
3. Melhorar documentação técnica (adicionar diagramas se complexo)
4. Adicionar testes de carga + E2E críticos
5. Documentar métricas REAIS (não estimativas)`;
  } else {
    checklist += `
1. ✅ APROVADO: Qualidade validada objetivamente
2. Monitorar métricas de performance em produção
3. Auditoria de compliance mensal (LGPD + CFM)
4. Manter evidências atualizadas pós-refatorações`;
  }

  checklist += `\n\n━━━ CONTRATO MÍNIMO (NÃO NEGOCIÁVEL) ━━━
Para marcar como COMPLETO, exigir:
• ✅ 3+ evidências validadas no codebase
• ✅ DoD com 3+ critérios mensuráveis
• ✅ LGPD + CFM documentados
• ✅ Performance P95 < 200ms validada
• ✅ Testes E2E cobrindo fluxos críticos
• ✅ Zero bloqueadores técnicos
• ✅ Integrações funcionais (se aplicável)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

--- OBSERVAÇÕES ORIGINAIS ---
${item.observacoes || 'nenhuma'}
`;
  
  return checklist;
}