import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * SINCRONIZAR PLANOS → ASSINATURAS
 * Quando PlanoModulo muda módulos, sincroniza AssinaturaClinica.modulos_inclusos
 * 
 * Payload: { plano_slug: "starter" }
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'SuperAdmin apenas' }, { status: 403 });
    }

    const { plano_slug } = await req.json();

    // Buscar PlanoModulo
    const planos = await base44.asServiceRole.entities.PlanoModulo.filter({});
    const plano = planos.find(p => p.nome.toLowerCase() === plano_slug.toLowerCase());

    if (!plano) {
      return Response.json({ error: 'Plano não encontrado' }, { status: 404 });
    }

    // Buscar todas AssinaturaClinica com este plano
    const assinaturas = await base44.asServiceRole.entities.AssinaturaClinica.filter({
      plano_slug: plano_slug.toLowerCase()
    });

    console.log(`🔄 Sincronizando ${assinaturas.length} assinaturas com plano ${plano.nome}`);

    let atualizadas = 0;
    for (const ass of assinaturas) {
      await base44.asServiceRole.entities.AssinaturaClinica.update(ass.id, {
        modulos_inclusos: plano.modulos_inclusos
      });
      atualizadas++;
    }

    return Response.json({
      success: true,
      plano_nome: plano.nome,
      modulos_sincronizados: plano.modulos_inclusos,
      assinaturas_atualizadas: atualizadas
    });

  } catch (error) {
    console.error('Erro sincronização:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});