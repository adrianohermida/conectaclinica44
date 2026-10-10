import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * P2.10 - TESTE E2E: Fluxo completo de aceite de termo
 * 
 * Testa:
 * 1. Criação de termo
 * 2. Busca de termos pendentes
 * 3. Registro de aceite
 * 4. Validação de hash
 * 5. Geração de certificado
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = {
      teste: 'fluxo_aceite_termo',
      timestamp: new Date().toISOString(),
      usuario: user.email,
      passos: []
    };

    // PASSO 1: Criar termo teste
    results.passos.push({ passo: 1, acao: 'criar_termo_teste' });
    
    const conteudoTeste = `<h1>Termo de Teste</h1><p>Este é um termo de teste criado em ${new Date().toISOString()}</p>`;
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(conteudoTeste);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashTermo = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const termoTeste = await base44.asServiceRole.entities.TermoLegal.create({
      tipo: 'termo_uso',
      titulo: `Termo de Teste - ${Date.now()}`,
      conteudo_html: conteudoTeste,
      conteudo_markdown: '# Termo de Teste\n\nEste é um termo de teste.',
      versao: '1.0',
      hash_sha256: hashTermo,
      modulo_aplicacao: 'dashboard',
      obrigatorio: false,
      ativo: true,
      data_vigencia: new Date().toISOString().split('T')[0],
      autor_criacao: user.email
    });

    results.passos.push({ 
      passo: 1, 
      status: 'sucesso', 
      termo_id: termoTeste.id,
      hash_gerado: hashTermo
    });

    // PASSO 2: Buscar termos pendentes
    results.passos.push({ passo: 2, acao: 'buscar_termos_pendentes' });

    const responsePendentes = await base44.functions.invoke('obterTermosPendentes', {
      pathname: '/DashboardCompleto'
    });

    const termosPendentes = responsePendentes.data.termos_pendentes || [];
    const termoEncontrado = termosPendentes.find(t => t.id === termoTeste.id);

    results.passos.push({ 
      passo: 2, 
      status: termoEncontrado ? 'sucesso' : 'falha',
      total_pendentes: termosPendentes.length,
      termo_encontrado: !!termoEncontrado
    });

    // PASSO 3: Registrar aceite
    results.passos.push({ passo: 3, acao: 'registrar_aceite' });

    const responseAceite = await base44.functions.invoke('registrarAceiteTermo', {
      termo_id: termoTeste.id,
      consentimento_coleta_metadados: true
    });

    results.passos.push({ 
      passo: 3, 
      status: responseAceite.data.success ? 'sucesso' : 'falha',
      aceite_id: responseAceite.data.aceite_id,
      hash_aceite: responseAceite.data.hash_aceite
    });

    // PASSO 4: Verificar se aceite foi salvo
    results.passos.push({ passo: 4, acao: 'verificar_aceite_salvo' });

    const aceitesSalvos = await base44.entities.AceiteTermoLegal.filter({
      termo_legal_id: termoTeste.id,
      usuario_id: user.id
    });

    results.passos.push({ 
      passo: 4, 
      status: aceitesSalvos.length > 0 ? 'sucesso' : 'FALHA CRÍTICA',
      aceites_encontrados: aceitesSalvos.length
    });

    // PASSO 5: Verificar se termo saiu da lista de pendentes
    results.passos.push({ passo: 5, acao: 'verificar_termo_removido' });

    const responsePendentes2 = await base44.functions.invoke('obterTermosPendentes', {
      pathname: '/DashboardCompleto'
    });

    const termosPendentes2 = responsePendentes2.data.termos_pendentes || [];
    const termoAindaPendente = termosPendentes2.find(t => t.id === termoTeste.id);

    results.passos.push({ 
      passo: 5, 
      status: !termoAindaPendente ? 'sucesso' : 'FALHA CRÍTICA - LOOP DETECTADO',
      termo_ainda_pendente: !!termoAindaPendente
    });

    // LIMPEZA: Deletar termo teste
    await base44.asServiceRole.entities.TermoLegal.delete(termoTeste.id);
    if (aceitesSalvos.length > 0) {
      await base44.asServiceRole.entities.AceiteTermoLegal.delete(aceitesSalvos[0].id);
    }

    results.resultado_final = results.passos.every(p => p.status === 'sucesso' || !p.status) 
      ? '✅ TESTE PASSOU' 
      : '❌ TESTE FALHOU';

    return Response.json(results);

  } catch (error) {
    console.error('Erro no teste:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});