import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

/**
 * CRIAR COUPON BETA
 * Cria cupom de desconto para clínicas beta (0-100% off)
 * 
 * Payload: {
 *   plano_nome: "Starter",
 *   percent_off: 100,
 *   duration: "forever" | "once" | "repeating"
 * }
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'SuperAdmin apenas' }, { status: 403 });
    }

    const { plano_nome, percent_off = 100, duration = 'forever' } = await req.json();

    if (!plano_nome) {
      return Response.json({ error: 'plano_nome obrigatório' }, { status: 400 });
    }

    if (percent_off < 0 || percent_off > 100) {
      return Response.json({ error: 'percent_off deve estar entre 0 e 100' }, { status: 400 });
    }

    const couponId = `BETA_${plano_nome.toUpperCase().replace(/\s/g, '_')}_${percent_off}OFF`;

    try {
      // Tentar resgatar existente
      const existente = await stripe.coupons.retrieve(couponId);
      return Response.json({
        success: true,
        coupon_id: existente.id,
        percent_off: existente.percent_off,
        duration: existente.duration,
        ja_existia: true
      });
    } catch (error) {
      // Criar novo
      const novoCoupon = await stripe.coupons.create({
        id: couponId,
        percent_off,
        duration,
        name: `Beta ${plano_nome} - ${percent_off}% OFF`,
        metadata: { 
          tipo: 'beta',
          plano: plano_nome
        }
      });

      console.log(`✅ Coupon criado: ${couponId}`);

      return Response.json({
        success: true,
        coupon_id: novoCoupon.id,
        percent_off: novoCoupon.percent_off,
        duration: novoCoupon.duration,
        ja_existia: false
      });
    }

  } catch (error) {
    console.error('Erro criar coupon:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});