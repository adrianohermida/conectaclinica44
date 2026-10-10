import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * CORREÇÃO EMERGENCIAL: Garantir que todas AssinaturaClinica do plano Enterprise tenham wildcard
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    // Buscar todas assinaturas Enterprise
    const todasAssinaturas = await base44.asServiceRole.entities.AssinaturaClinica.list();
    const assinaturasEnterprise = todasAssinaturas.filter(a => 
      a.plano_slug === 'enterprise' || 
      a.plano_slug === 'Enterprise' ||
      a.stripe_price_id?.includes('prod_TZMVDZosZKleyL') // ID do produto Enterprise
    );

    console.log('[corrigirAssinaturas] Encontradas', assinaturasEnterprise.length, 'assinaturas Enterprise');

    const correcoes = [];
    
    for (const assinatura of assinaturasEnterprise) {
      // Verificar se precisa correção
      const precisaCorrecao = 
        !assinatura.modulos_inclusos || 
        assinatura.modulos_inclusos.length === 0 ||
        !assinatura.modulos_inclusos.includes('*');

      if (precisaCorrecao) {
        console.log('[corrigirAssinaturas] Corrigindo', assinatura.clinica_nome);
        
        await base44.asServiceRole.entities.AssinaturaClinica.update(assinatura.id, {
          modulos_inclusos: ['*'],
          plano_slug: 'enterprise'
        });

        correcoes.push({
          clinica_id: assinatura.clinica_id,
          clinica_nome: assinatura.clinica_nome,
          antes: assinatura.modulos_inclusos,
          depois: ['*']
        });
      }
    }

    return Response.json({
      success: true,
      total_enterprise: assinaturasEnterprise.length,
      corrigidas: correcoes.length,
      detalhes: correcoes
    });

  } catch (error) {
    console.error('[corrigirAssinaturas Error]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});