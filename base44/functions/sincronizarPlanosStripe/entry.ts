import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * CRÍTICO: Sincronizar PlanoModulo com produtos Stripe
 * Mapeia produtos ConectaClinica_* para entidade PlanoModulo
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Mapeamento hardcoded baseado no catálogo Stripe
    const planosMap = [
      {
        nome: 'Starter',
        preco_mensal: 97,
        preco_anual: 931.20,
        stripe_product_id: 'prod_TZMPgVo220MLim',
        stripe_price_id_mensal: 'price_1ScDhAFEZT2Uu2jIGWLNdkNX',
        stripe_price_id_anual: 'price_1ScDhfFEZT2Uu2jIhFGOpPPT',
        modulos_inclusos: ['dashboard', 'agenda', 'pacientes'],
        ordem: 1,
        destaque: false,
        limite_usuarios: 3,
        limite_storage_gb: 5
      },
      {
        nome: 'Profissional',
        preco_mensal: 297,
        preco_anual: 2851,
        stripe_product_id: 'prod_TZMTwCEu8BLXd5',
        stripe_price_id_mensal: 'price_1ScDkpFEZT2Uu2jIhvqfZgsK',
        stripe_price_id_anual: 'price_1ScDlMFEZT2Uu2jI8u6SGY1Q',
        modulos_inclusos: ['dashboard', 'agenda', 'pacientes', 'prontuarios', 'financeiro'],
        ordem: 2,
        destaque: true,
        limite_usuarios: 10,
        limite_storage_gb: 20
      },
      {
        nome: 'Enterprise',
        preco_mensal: 497,
        preco_anual: 4773,
        stripe_product_id: 'prod_TZMVDZosZKleyL',
        stripe_price_id_mensal: 'price_1ScDn5FEZT2Uu2jIezgBG9yV',
        stripe_price_id_anual: 'price_1ScDmWFEZT2Uu2jIZQBh8sLw',
        modulos_inclusos: ['dashboard', 'agenda', 'pacientes', 'prontuarios', 'financeiro', 'estoque', 'relatorios', 'administracao'],
        ordem: 3,
        destaque: false,
        limite_usuarios: 50,
        limite_storage_gb: 100
      }
    ];

    // Limpar planos existentes
    const planosExistentes = await base44.asServiceRole.entities.PlanoModulo.list();
    for (const plano of planosExistentes) {
      await base44.asServiceRole.entities.PlanoModulo.delete(plano.id);
    }

    // Criar novos planos
    const created = [];
    for (const plano of planosMap) {
      const novo = await base44.asServiceRole.entities.PlanoModulo.create({
        ...plano,
        ativo: true,
        descricao: `Plano ${plano.nome} - ${plano.modulos_inclusos.length} módulos`,
        limite_emails_dia: plano.nome === 'Starter' ? 30 : plano.nome === 'Profissional' ? 100 : 500
      });
      created.push(novo);
      console.log(`[sincronizarPlanosStripe] ✅ Criado: ${novo.nome}`);
    }

    return Response.json({
      message: `${created.length} planos sincronizados com Stripe`,
      planos: created.map(p => ({ nome: p.nome, stripe_product_id: p.stripe_product_id }))
    });

  } catch (error) {
    console.error('[sincronizarPlanosStripe] ❌ ERRO:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});