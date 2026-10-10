import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@14.0.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2023-10-16',
});

/**
 * FASE 5: CHECKOUT MÓDULO IA PREMIUM
 * R$2.999/mês (produto isolado)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.clinica_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // CORREÇÃO: Usar price real do catálogo Stripe (ConectaClinica_Enterprise mensal)
    const { priceId = 'price_1ScDn5FEZT2Uu2jIezgBG9yV' } = await req.json(); // R$497/mês Enterprise

    // Verificar se já tem módulo IA ativo
    const planosModulos = await base44.entities.PlanoModulo.filter({
      modulo_slug: 'secretaria_ia',
      ativo: true
    });

    const moduloIA = planosModulos.find(p => p.modulo_slug === 'secretaria_ia');
    if (!moduloIA) {
      return Response.json({ error: 'Módulo IA não existe no catálogo' }, { status: 404 });
    }

    // Buscar assinatura atual
    const assinaturas = await base44.entities.AssinaturaClinica.filter({
      clinica_id: user.clinica_id,
      status: 'ativa'
    });

    const assinatura = assinaturas[0];
    if (!assinatura) {
      return Response.json({ error: 'Clínica sem assinatura ativa' }, { status: 400 });
    }

    // Verificar se já tem IA Premium
    const modulosAtivos = assinatura.modulos_adicionais || [];
    if (modulosAtivos.includes('secretaria_ia')) {
      return Response.json({ error: 'IA Premium já ativa' }, { status: 400 });
    }

    // Criar checkout Stripe
    const baseUrl = req.headers.get('origin') || 'https://app.conectaclinica.com.br';
    
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId, // ID do price Stripe criado manualmente
          quantity: 1,
        },
      ],
      customer_email: user.email,
      client_reference_id: user.clinica_id,
      metadata: {
        clinica_id: user.clinica_id,
        modulo: 'secretaria_ia',
        tipo: 'addon'
      },
      success_url: `${baseUrl}/ConfiguracaoAgenteIA?upgrade=success`,
      cancel_url: `${baseUrl}/ConfiguracaoAgenteIA?upgrade=cancelled`,
      subscription_data: {
        metadata: {
          clinica_id: user.clinica_id,
          modulo: 'secretaria_ia', // FIX: Usar mesma key do webhook
          tipo: 'addon'
        }
      }
    });

    console.log('[CheckoutIA] Sessão criada:', session.id);

    return Response.json({
      success: true,
      checkout_url: session.url,
      session_id: session.id
    });

  } catch (error) {
    console.error('[CheckoutIA] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});