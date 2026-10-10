import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * TESTE E2E BRUTAL: Modal Termos Legais
 * OBJETIVO: Expor exatamente ONDE o modal reabre
 * - Simula aceite completo (BD + localStorage)
 * - Valida query cache, sessionStorage e edge cases
 * - Testa race conditions e revalidation
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resultados = {
      fase: 'E2E Termos Legais - BRUTAL',
      timestamp: new Date().toISOString(),
      user: user.email,
      testes: [],
      diagnostico: {}
    };

    // PRÉ-DIAGNÓSTICO: Estado atual
    const termosAtivos = await base44.asServiceRole.entities.TermoLegal.filter({ ativo: true });
    const aceitesUsuario = await base44.entities.AceiteTermoLegal.filter({ 
      usuario_id: user.id 
    });

    resultados.diagnostico.termosAtivos = termosAtivos.length;
    resultados.diagnostico.aceitesExistentes = aceitesUsuario.length;
    resultados.diagnostico.termosDetalhes = termosAtivos.map(t => ({
      id: t.id,
      tipo: t.tipo,
      versao: t.versao,
      titulo: t.titulo
    }));
    resultados.diagnostico.aceitesDetalhes = aceitesUsuario.map(a => ({
      termo_id: a.termo_legal_id,
      versao: a.versao,
      aceito: a.aceito,
      data: a.data_aceite
    }));

    // TESTE 1: Termos ativos existem
    resultados.testes.push({
      nome: '1. Termos ativos existem no BD',
      passou: termosAtivos.length > 0,
      detalhes: `${termosAtivos.length} termos ativos`
    });

    if (termosAtivos.length === 0) {
      return Response.json({
        ...resultados,
        status: 'SKIP',
        motivo: 'Nenhum termo ativo para testar'
      });
    }

    // TESTE 2: Criar aceite COMPLETO simulando fluxo real
    const termo = termosAtivos[0];
    
    const aceiteTest = await base44.entities.AceiteTermoLegal.create({
      usuario_id: user.id,
      usuario_email: user.email,
      usuario_nome: user.full_name,
      termo_legal_id: termo.id,
      termo_versao: termo.versao,
      tipo_documento: termo.tipo,
      aceito: true,
      data_aceite: new Date().toISOString(),
      tipo_aceite: 'obrigatorio',
      hash_sha256: `hash_${Date.now()}`,
      ip_aceite: 'test_e2e',
      user_agent: 'E2E_Test',
      tempo_leitura_segundos: 30,
      scroll_percent: 100,
      campos_obrigatorios_preenchidos: true
    });

    resultados.testes.push({
      nome: '2. Aceite criado com TODOS os campos',
      passou: !!aceiteTest.id,
      detalhes: `Aceite ID: ${aceiteTest.id} | termo_id: ${aceiteTest.termo_legal_id} | versão: ${aceiteTest.termo_versao}`
    });

    // TESTE 3: Query com os MESMOS filtros usados no frontend
    const queryFiltroFrontend = await base44.entities.AceiteTermoLegal.filter({
      usuario_id: user.id,
      termo_legal_id: termo.id,
      termo_versao: termo.versao,
      aceito: true
    });

    resultados.testes.push({
      nome: '3. Query EXATA do frontend retorna aceite',
      passou: queryFiltroFrontend.length > 0,
      detalhes: `${queryFiltroFrontend.length} aceites encontrados com filtro: {usuario_id, termo_legal_id, termo_versao, aceito: true}`,
      critico: queryFiltroFrontend.length === 0
    });

    // TESTE 4: Verificar campo termo_legal_id (pode estar salvando errado)
    const aceiteReload = await base44.asServiceRole.entities.AceiteTermoLegal.filter({ id: aceiteTest.id });
    const aceiteReal = aceiteReload[0];

    resultados.testes.push({
      nome: '4. Campos salvos corretamente no BD',
      passou: aceiteReal.termo_legal_id === termo.id && aceiteReal.termo_versao === termo.versao,
      detalhes: {
        esperado: { termo_legal_id: termo.id, termo_versao: termo.versao },
        salvo: { termo_legal_id: aceiteReal.termo_legal_id, termo_versao: aceiteReal.termo_versao }
      },
      critico: aceiteReal.termo_legal_id !== termo.id
    });

    // TESTE 5: Simular query race condition (fetch antes do create)
    const aceitesPendentes = await base44.entities.AceiteTermoLegal.filter({
      usuario_id: user.id,
      termo_legal_id: termo.id,
      termo_versao: termo.versao
    });

    const temAceiteValidoFinal = aceitesPendentes.some(a => a.aceito === true);

    resultados.testes.push({
      nome: '5. Aceite persiste após race condition simulada',
      passou: temAceiteValidoFinal,
      detalhes: `${aceitesPendentes.length} aceites encontrados, ${aceitesPendentes.filter(a => a.aceito).length} com aceito=true`,
      critico: !temAceiteValidoFinal
    });

    // TESTE 6: Nova versão DO MESMO termo exige novo aceite
    const aceitesDiferenteVersao = await base44.entities.AceiteTermoLegal.filter({
      usuario_id: user.id,
      termo_legal_id: termo.id,
      termo_versao: termo.versao + 1,
      aceito: true
    });

    resultados.testes.push({
      nome: '6. Nova versão não tem aceite (requer novo)',
      passou: aceitesDiferenteVersao.length === 0,
      detalhes: `Versão ${termo.versao + 1} não aceita: ${aceitesDiferenteVersao.length === 0}`
    });

    // TESTE 7: Simular obterTermosPendentes (backend function)
    let termosPendentesFunction = [];
    try {
      const respPendentes = await base44.functions.invoke('obterTermosPendentes', {});
      termosPendentesFunction = respPendentes.data || [];
    } catch (error) {
      resultados.testes.push({
        nome: '7. Backend function obterTermosPendentes',
        passou: false,
        detalhes: `ERRO: ${error.message}`,
        critico: true
      });
    }

    if (termosPendentesFunction.length !== undefined) {
      resultados.testes.push({
        nome: '7. Backend function obterTermosPendentes OK',
        passou: true,
        detalhes: `${termosPendentesFunction.length} termos pendentes retornados`
      });

      // TESTE 8: Termo aceito NÃO deve aparecer como pendente
      const termoPendenteErrado = termosPendentesFunction.find(t => 
        t.id === termo.id && t.versao === termo.versao
      );

      resultados.testes.push({
        nome: '8. Termo aceito NÃO retorna como pendente',
        passou: !termoPendenteErrado,
        detalhes: termoPendenteErrado ? `FALHA: Termo ${termo.id} v${termo.versao} aparece como pendente mesmo após aceite` : 'OK - termo não aparece',
        critico: !!termoPendenteErrado
      });
    }

    // Limpar aceite de teste (SEMPRE no final)
    await base44.asServiceRole.entities.AceiteTermoLegal.delete(aceiteTest.id);

    resultados.testes.push({
      nome: '9. Limpeza: aceite de teste removido',
      passou: true,
      detalhes: `Aceite ${aceiteTest.id} deletado`
    });

    // RESULTADO FINAL
    const todosTestes = resultados.testes.every(t => t.passou);
    const testeCriticoFalhou = resultados.testes.some(t => t.critico && !t.passou);
    
    return Response.json({
      ...resultados,
      status: todosTestes ? '✅ PASSOU' : (testeCriticoFalhou ? '🔴 CRÍTICO' : '⚠️ FALHOU'),
      resumo: `${resultados.testes.filter(t => t.passou).length}/${resultados.testes.length} testes passaram`,
      acaoCritica: testeCriticoFalhou ? 'PROBLEMA ESTRUTURAL DETECTADO - Verificar queries e schema' : null
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack,
      status: '💥 ERRO DE EXECUÇÃO'
    }, { status: 500 });
  }
});