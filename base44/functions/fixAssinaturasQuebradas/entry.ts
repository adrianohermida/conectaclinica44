import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * FIX CRÍTICO: Corrige assinaturas com stripe_price_id null
 * Mapeia plano_slug → PlanoModulo → stripe_price_id correto
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // 1. Buscar assinaturas quebradas
    const assinaturasQuebradas = await base44.asServiceRole.entities.AssinaturaClinica.filter({
      stripe_price_id: null
    });

    if (assinaturasQuebradas.length === 0) {
      return Response.json({ 
        message: 'Nenhuma assinatura quebrada encontrada',
        fixed: 0
      });
    }

    console.log(`[fixAssinaturasQuebradas] Encontradas ${assinaturasQuebradas.length} assinaturas quebradas`);

    // 2. Buscar PlanoModulo para mapeamento
    const planosModulo = await base44.asServiceRole.entities.PlanoModulo.list();
    const planoMap = new Map();
    
    planosModulo.forEach(plano => {
      // Criar map: plano_slug → { mensal, anual }
      const slug = plano.nome.toLowerCase().replace(/\s+/g, '_');
      planoMap.set(slug, {
        mensal: plano.stripe_price_id_mensal,
        anual: plano.stripe_price_id_anual
      });
    });

    // 3. Corrigir assinaturas
    const fixes = [];
    for (const assinatura of assinaturasQuebradas) {
      const planoSlug = assinatura.plano_slug;
      const planoData = planoMap.get(planoSlug);

      if (!planoData) {
        console.warn(`[fixAssinaturasQuebradas] Plano ${planoSlug} não encontrado em PlanoModulo`);
        continue;
      }

      // Inferir se é mensal ou anual (default: mensal)
      const stripePriceId = planoData.mensal || planoData.anual;

      if (!stripePriceId) {
        console.warn(`[fixAssinaturasQuebradas] Nenhum stripe_price_id encontrado para ${planoSlug}`);
        continue;
      }

      // Atualizar assinatura
      await base44.asServiceRole.entities.AssinaturaClinica.update(assinatura.id, {
        stripe_price_id: stripePriceId
      });

      fixes.push({
        assinatura_id: assinatura.id,
        clinica_nome: assinatura.clinica_nome,
        plano_slug: planoSlug,
        stripe_price_id: stripePriceId
      });

      console.log(`[fixAssinaturasQuebradas] ✅ Corrigido: ${assinatura.clinica_nome} → ${stripePriceId}`);
    }

    return Response.json({
      message: `${fixes.length} assinaturas corrigidas`,
      fixed: fixes.length,
      total_quebradas: assinaturasQuebradas.length,
      fixes
    });

  } catch (error) {
    console.error('[fixAssinaturasQuebradas] ❌ ERRO:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});