import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@17.5.0';
import { format } from 'npm:date-fns@3.6.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

/**
 * Webhook para recargas avulsas de créditos (one-time payments)
 * Processa pagamentos de pacotes de créditos
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return Response.json({ error: 'Signature missing' }, { status: 400 });
    }

    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret
    );

    console.log(`✅ Webhook recarga recebido: ${event.type}`);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      
      // Apenas para pagamentos one-time (recargas)
      if (session.mode !== 'payment') {
        return Response.json({ received: true });
      }

      const clinica_id = session.metadata.clinica_id;
      if (!clinica_id) {
        console.warn('⚠️ Session sem clinica_id');
        return Response.json({ received: true });
      }

      // Buscar line items para pegar quantity (créditos)
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      const priceId = lineItems.data[0]?.price?.id;
      const quantidade = lineItems.data[0]?.quantity || 1;

      // Mapear price_id para créditos
      const creditosMap = {
        'price_1SbLuSFEZT2Uu2jI9hmMb9lf': 100,
        'price_1SbLuSFEZT2Uu2jI8eCZS5Fh': 500,
        'price_1SbLuSFEZT2Uu2jImUXTYBo5': 1000,
        'price_1SbLuSFEZT2Uu2jI2Tkd8LpD': 5000
      };

      const creditosComprados = creditosMap[priceId] || 0;

      if (creditosComprados === 0) {
        console.warn('⚠️ Price ID não reconhecido para recarga:', priceId);
        return Response.json({ received: true });
      }

      // Adicionar créditos
      const creditosIA = await base44.asServiceRole.entities.CreditoIA.filter({ clinica_id });
      
      if (creditosIA.length > 0) {
        const credito = creditosIA[0];
        await base44.asServiceRole.entities.CreditoIA.update(credito.id, {
          ...credito,
          saldo_creditos: credito.saldo_creditos + creditosComprados,
          creditos_comprados_avulso: (credito.creditos_comprados_avulso || 0) + creditosComprados,
          data_ultima_recarga: format(new Date(), 'yyyy-MM-dd')
        });

        console.log(`✅ Adicionados ${creditosComprados} créditos para clínica ${clinica_id}`);
      } else {
        // Criar registro de créditos se não existir
        await base44.asServiceRole.entities.CreditoIA.create({
          clinica_id,
          saldo_creditos: creditosComprados,
          creditos_mensais_plano: 0,
          creditos_comprados_avulso: creditosComprados,
          total_consumido_mes: 0,
          total_consumido_historico: 0,
          data_ultima_recarga: format(new Date(), 'yyyy-MM-dd')
        });

        console.log(`✅ Criado registro de créditos com ${creditosComprados} créditos para clínica ${clinica_id}`);
      }
    }

    return Response.json({ received: true });

  } catch (error) {
    console.error('❌ Erro webhook recarga:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});