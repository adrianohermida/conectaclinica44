import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * APLICAR BETA GRATUITO
 * Atualiza AssinaturaClinica para status "ativa" sem cobrar (Beta)
 * 
 * Payload: { clinica_id: "xxx", plano_slug: "profissional" }
 * 
 * REGRA BETA:
 * - Acesso gratuito a planos de assinatura (não cobra Stripe)
 * - Recargas (créditos IA/consulta) continuam pagas normalmente
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'SuperAdmin apenas' }, { status: 403 });
    }

    const { clinica_id, plano_slug } = await req.json();

    if (!clinica_id || !plano_slug) {
      return Response.json({ 
        error: 'clinica_id e plano_slug obrigatórios' 
      }, { status: 400 });
    }

    // Buscar PlanoModulo
    const planos = await base44.asServiceRole.entities.PlanoModulo.filter({});
    const plano = planos.find(p => p.nome.toLowerCase() === plano_slug.toLowerCase());

    if (!plano) {
      return Response.json({ error: 'Plano não encontrado' }, { status: 404 });
    }

    // Verificar se clínica é beta no plano
    const isBeta = plano.beta_clinicas?.includes(clinica_id);

    // Buscar ou criar AssinaturaClinica
    const assinaturas = await base44.asServiceRole.entities.AssinaturaClinica.filter({
      clinica_id
    });

    let assinatura;
    if (assinaturas.length === 0) {
      // Criar nova
      const clinicas = await base44.asServiceRole.entities.Clinica.filter({ id: clinica_id });
      if (clinicas.length === 0) {
        return Response.json({ error: 'Clínica não encontrada' }, { status: 404 });
      }

      const clinica = clinicas[0];
      assinatura = await base44.asServiceRole.entities.AssinaturaClinica.create({
        clinica_id,
        clinica_nome: clinica.nome,
        clinica_email: clinica.email,
        plano_slug: plano_slug.toLowerCase(),
        modulos_inclusos: plano.modulos_inclusos,
        status: isBeta ? "ativa" : "trial",
        data_inicio: new Date().toISOString().split('T')[0],
        // BETA = 0 pagamento
        valor_mensal_centavos: isBeta ? 0 : (plano.preco_mensal * 100)
      });
    } else {
      // Atualizar existente
      assinatura = await base44.asServiceRole.entities.AssinaturaClinica.update(assinaturas[0].id, {
        plano_slug: plano_slug.toLowerCase(),
        modulos_inclusos: plano.modulos_inclusos,
        status: isBeta ? "ativa" : assinaturas[0].status,
        valor_mensal_centavos: isBeta ? 0 : (plano.preco_mensal * 100)
      });
    }

    console.log(`✅ Beta aplicado: ${clinica_id} → ${plano.nome} (gratuito: ${isBeta})`);

    return Response.json({
      success: true,
      assinatura,
      beta_ativo: isBeta,
      mensagem: isBeta 
        ? "✅ Acesso GRATUITO ativado (Beta)" 
        : "⚠️ Clínica não está na lista beta deste plano"
    });

  } catch (error) {
    console.error('Erro aplicar beta:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});