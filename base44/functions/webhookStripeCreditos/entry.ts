import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe';

/**
 * WEBHOOK STRIPE - PROCESSAR PAGAMENTO CRÉDITOS
 * Event: checkout.session.completed
 */

Deno.serve(async (req) => {
  try {
    const signature = req.headers.get('stripe-signature');
    const body = await req.text();
    
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2023-10-16',
    });

    // Validar webhook signature
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')
    );

    if (event.type !== 'checkout.session.completed') {
      return Response.json({ received: true });
    }

    const session = event.data.object;

    // CRITICAL: Usar service role (sem auth de user, pois é webhook externo)
    const base44 = createClientFromRequest(req);
    
    // Extrair metadados
    const clinicaId = session.metadata.clinica_id || session.client_reference_id;
    const quantidadeCreditos = parseInt(session.metadata.quantidade_creditos || '100');
    const valorPago = session.amount_total / 100; // centavos → reais

    if (!clinicaId) {
      console.error('Webhook sem clinica_id:', session.id);
      return Response.json({ error: 'Missing clinica_id' }, { status: 400 });
    }

    // Criar registro de créditos
    await base44.asServiceRole.entities.CreditoAssinaturaDigital.create({
      clinica_id: clinicaId,
      tipo_credito: 'recarga',
      quantidade_adquirida: quantidadeCreditos,
      quantidade_utilizada: 0,
      quantidade_disponivel: quantidadeCreditos,
      valor_pago: valorPago,
      stripe_payment_id: session.payment_intent || session.id,
      ativo: true
    });

    console.log(`✅ Créditos processados: ${quantidadeCreditos} para ${clinicaId}`);

    return Response.json({ 
      success: true,
      creditos: quantidadeCreditos,
      clinica_id: clinicaId
    });

  } catch (error) {
    console.error('Erro webhook Stripe:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});