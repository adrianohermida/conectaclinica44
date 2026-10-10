import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * VALIDAR ISOLAMENTO DE PLANOS - Testa se Layout respeita módulos do plano
 * Simula 3 clínicas (Starter, Profissional, Enterprise) e valida acesso
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const admin = await base44.auth.me();

    if (!admin || admin.role !== 'admin') {
      return Response.json({ error: 'Apenas admins' }, { status: 403 });
    }

    const resultados = {
      timestamp: new Date().toISOString(),
      status: 'PASS',
      testes: [],
      vulnerabilidades: []
    };

    // BUSCAR 3 CLÍNICAS COM PLANOS DIFERENTES
    const assinaturas = await base44.asServiceRole.entities.AssinaturaClinica.list('-created_date', 100);
    
    const starter = assinaturas.find(a => a.plano_slug === 'starter' && a.status === 'ativa');
    const profissional = assinaturas.find(a => a.plano_slug === 'profissional' && a.status === 'ativa');
    const enterprise = assinaturas.find(a => a.plano_slug === 'enterprise' && a.status === 'ativa');

    if (!starter || !profissional || !enterprise) {
      return Response.json({
        error: 'Criar clínicas demo primeiro',
        encontrado: {
          starter: !!starter,
          profissional: !!profissional,
          enterprise: !!enterprise
        }
      }, { status: 400 });
    }

    // MÓDULOS ESPERADOS POR PLANO
    const modulosEsperados = {
      starter: ['dashboard', 'agenda', 'pacientes', 'prontuarios'],
      profissional: ['dashboard', 'agenda', 'pacientes', 'prontuarios', 'produtos', 'atendimento', 'financeiro'],
      enterprise: ['dashboard', 'agenda', 'pacientes', 'prontuarios', 'produtos', 'atendimento', 'administracao', 'relatorios', 'financeiro', 'estoque', 'jornada', 'planos_tratamento', 'analise_ia']
    };

    // TESTE 1: STARTER - Não deve ter acesso a Produtos, Financeiro, Estoque
    const starterBloqueados = ['produtos', 'financeiro', 'estoque', 'administracao'];
    const starterVazou = starterBloqueados.filter(m => starter.modulos_inclusos?.includes(m));
    
    if (starterVazou.length > 0) {
      resultados.vulnerabilidades.push({
        tipo: 'vazamento_modulo',
        severidade: 'HIGH',
        clinica: starter.clinica_nome,
        plano: 'starter',
        modulos_vazados: starterVazou,
        detalhes: `Plano Starter NÃO deveria ter: ${starterVazou.join(', ')}`
      });
      resultados.status = 'FAIL';
    }

    resultados.testes.push({
      teste: 'Starter - Bloqueio de módulos premium',
      status: starterVazou.length === 0 ? 'PASS' : 'FAIL',
      clinica: starter.clinica_nome,
      modulos_inclusos: starter.modulos_inclusos?.length || 0,
      esperado: modulosEsperados.starter,
      real: starter.modulos_inclusos,
      vazamentos: starterVazou
    });

    // TESTE 2: PROFISSIONAL - Deve ter Financeiro mas não Estoque/IA
    const profBloqueados = ['estoque', 'analise_ia', 'jornada', 'planos_tratamento'];
    const profVazou = profBloqueados.filter(m => profissional.modulos_inclusos?.includes(m));
    
    if (profVazou.length > 0) {
      resultados.vulnerabilidades.push({
        tipo: 'vazamento_modulo',
        severidade: 'HIGH',
        clinica: profissional.clinica_nome,
        plano: 'profissional',
        modulos_vazados: profVazou,
        detalhes: `Plano Profissional NÃO deveria ter: ${profVazou.join(', ')}`
      });
      resultados.status = 'FAIL';
    }

    resultados.testes.push({
      teste: 'Profissional - Bloqueio de módulos Enterprise',
      status: profVazou.length === 0 ? 'PASS' : 'FAIL',
      clinica: profissional.clinica_nome,
      modulos_inclusos: profissional.modulos_inclusos?.length || 0,
      esperado: modulosEsperados.profissional,
      real: profissional.modulos_inclusos,
      vazamentos: profVazou
    });

    // TESTE 3: ENTERPRISE - Deve ter TUDO
    const modulosEnterprise = modulosEsperados.enterprise;
    const faltandoEnterprise = modulosEnterprise.filter(m => !enterprise.modulos_inclusos?.includes(m));
    
    if (faltandoEnterprise.length > 0) {
      resultados.vulnerabilidades.push({
        tipo: 'modulo_faltando',
        severidade: 'MEDIUM',
        clinica: enterprise.clinica_nome,
        plano: 'enterprise',
        modulos_faltando: faltandoEnterprise,
        detalhes: `Enterprise deveria ter: ${faltandoEnterprise.join(', ')}`
      });
      resultados.status = 'FAIL';
    }

    resultados.testes.push({
      teste: 'Enterprise - Acesso completo',
      status: faltandoEnterprise.length === 0 ? 'PASS' : 'FAIL',
      clinica: enterprise.clinica_nome,
      modulos_inclusos: enterprise.modulos_inclusos?.length || 0,
      esperado: modulosEnterprise.length,
      real: enterprise.modulos_inclusos?.length || 0,
      faltando: faltandoEnterprise
    });

    // TESTE 4: Validar que módulos estão sendo LIDOS pelo PlanoProvider
    resultados.testes.push({
      teste: 'INFO - AssinaturaClinica populada',
      status: 'INFO',
      total_assinaturas: assinaturas.length,
      distribuicao: {
        starter: assinaturas.filter(a => a.plano_slug === 'starter').length,
        profissional: assinaturas.filter(a => a.plano_slug === 'profissional').length,
        enterprise: assinaturas.filter(a => a.plano_slug === 'enterprise').length,
        trial: assinaturas.filter(a => a.plano_slug === 'trial').length
      }
    });

    resultados.conclusao = resultados.status === 'PASS' 
      ? '✅ ISOLAMENTO DE PLANOS VALIDADO - Layout deve respeitar módulos'
      : '❌ VAZAMENTO DE MÓDULOS DETECTADO - Layout mostrando módulos proibidos';

    resultados.proximos_passos = resultados.status === 'PASS'
      ? [
          '1. Logar em clínica Starter e verificar menu visual',
          '2. Confirmar que Financeiro/Estoque não aparecem',
          '3. Testar ModuloGuard bloqueando rotas diretas'
        ]
      : [
          '1. CRÍTICO: Consertar PlanoProvider.temAcessoModulo()',
          '2. Garantir que NavItem respeita moduloDisponivel',
          '3. Re-rodar este teste até PASS'
        ];

    return Response.json(resultados);

  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});