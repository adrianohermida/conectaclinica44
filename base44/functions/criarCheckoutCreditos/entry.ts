import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe';

/**
 * CRIAR CHECKOUT STRIPE - RECARGA DE CRÉDITOS ASSINATURA DIGITAL
 * Produto: ConectaClinica_Recarga (prod_TYSqXxE5aqU1Mc)
 * Preço: R$ 900,00 (price_1SbLuSFEZT2Uu2jImUXTYBo5)
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !user.clinica_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { quantidade = 100 } = await req.json(); // Default 100 créditos

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2023-10-16',
    });

    // Criar sessão de checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'boleto'],
      mode: 'payment',
      line_items: [
        {
          price: 'price_1SbLuSFEZT2Uu2jImUXTYBo5', // ConectaClinica_Recarga
          quantity: Math.ceil(quantidade / 100), // 100 créditos = 1 unidade
        },
      ],
      success_url: `${req.headers.get('origin')}/RecargaCreditosSuccess?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/RecargaCreditos`,
      customer_email: user.email,
      client_reference_id: user.clinica_id,
      metadata: {
        clinica_id: user.clinica_id,
        usuario_id: user.id,
        usuario_nome: user.full_name || user.email,
        quantidade_creditos: quantidade.toString(),
        tipo_credito: 'recarga'
      }
    });

    return Response.json({
      success: true,
      checkout_url: session.url,
      session_id: session.id
    });

  } catch (error) {
    console.error('Erro ao criar checkout:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});