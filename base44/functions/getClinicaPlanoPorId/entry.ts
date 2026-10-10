import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * FONTE ÚNICA DE VERDADE PARA PLANOS DE CLÍNICAS
 * Retorna plano ativo + módulos disponíveis
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let clinica_id;
    try {
      const body = await req.json();
      clinica_id = body.clinica_id;
    } catch {
      // Se não houver body, usar clinica_id do user
    }
    const targetClinicaId = clinica_id || user.clinica_id;

    if (!targetClinicaId) {
      return Response.json({ 
        plano_slug: 'trial',
        modulos_inclusos: ['dashboard', 'agenda', 'pacientes', 'prontuarios'],
        status: 'trial',
        clinica_id: null
      });
    }

    // 1. Verificar AssinaturaClinica
    const assinaturas = await base44.asServiceRole.entities.AssinaturaClinica.filter({ 
      clinica_id: targetClinicaId 
    });

    if (assinaturas.length > 0) {
      const assinatura = assinaturas[0];
      
      // CORREÇÃO: Se modulos_inclusos está vazio ou undefined, forçar wildcard
      let modulos = assinatura.modulos_inclusos;
      if (!modulos || modulos.length === 0) {
        console.log('[getClinicaPlanoPorId] ⚠️ modulos_inclusos vazio - aplicando wildcard');
        modulos = ['*'];
      }
      
      return Response.json({
        plano_slug: assinatura.plano_slug,
        modulos_inclusos: modulos,
        status: assinatura.status,
        stripe_subscription_id: assinatura.stripe_subscription_id,
        data_proximo_pagamento: assinatura.data_proximo_pagamento,
        clinica_id: targetClinicaId,
        source: 'AssinaturaClinica'
      });
    }

    // 2. Verificar beta_clinicas (override gratuito)
    const todosPlanos = await base44.asServiceRole.entities.PlanoModulo.list();
    const planoBeta = todosPlanos.find(p => p.beta_clinicas?.includes(targetClinicaId));

    if (planoBeta) {
      return Response.json({
        plano_slug: planoBeta.nome.toLowerCase().replace(/\s+/g, '_'),
        modulos_inclusos: planoBeta.modulos_inclusos || ['*'],
        status: 'beta',
        clinica_id: targetClinicaId,
        source: 'PlanoModulo_Beta'
      });
    }

    // 3. Fallback: Trial
    return Response.json({
      plano_slug: 'trial',
      modulos_inclusos: ['dashboard', 'agenda', 'pacientes', 'prontuarios'],
      status: 'trial',
      clinica_id: targetClinicaId,
      source: 'Trial_Default'
    });
  } catch (error) {
    console.error('[getClinicaPlanoPorId Error]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});