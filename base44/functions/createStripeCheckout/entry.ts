import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@14.0.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !user.clinica_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { priceId, planoSlug, successUrl, cancelUrl, mode = 'subscription' } = await req.json();

    if (!priceId || !planoSlug) {
      return Response.json({ error: 'Missing priceId or planoSlug' }, { status: 400 });
    }

    const clinicas = await base44.entities.Clinica.filter({ id: user.clinica_id });
    const clinica = clinicas[0];

    if (!clinica) {
      return Response.json({ error: 'Clinic not found' }, { status: 404 });
    }

    // Get or create Stripe customer
    let customerId = clinica.stripe_customer_id;
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: clinica.email,
        name: clinica.nome,
        metadata: {
          clinica_id: clinica.id,
          user_id: user.id
        }
      });
      customerId = customer.id;
      
      // Update clinic with customer ID
      await base44.entities.Clinica.update(clinica.id, {
        stripe_customer_id: customerId
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: mode,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl || `${req.headers.get('origin')}/CheckoutSuccess?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${req.headers.get('origin')}/PlanosPrecos`,
      metadata: {
        clinica_id: clinica.id,
        plano_slug: planoSlug,
        user_id: user.id
      }
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});