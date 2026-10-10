import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@14.0.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

/**
 * FASE 5: WEBHOOK STRIPE - ATIVAR MÓDULO IA PREMIUM
 */
Deno.serve(async (req) => {
  const sig = req.headers.get('stripe-signature');
  const body = await req.text();

  try {
    const event = await stripe.webhooks.constructEventAsync(
      body,
      sig,
      webhookSecret
    );

    console.log('[WebhookIA] Evento:', event.type);

    const base44 = createClientFromRequest(req);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const clinicaId = session.metadata.clinica_id;
      const modulo = session.metadata.modulo;

      if (modulo !== 'secretaria_ia') {
        return Response.json({ received: true });
      }

      console.log('[WebhookIA] Ativando módulo IA para clínica:', clinicaId);

      // Buscar assinatura da clínica
      const assinaturas = await base44.asServiceRole.entities.AssinaturaClinica.filter({
        clinica_id: clinicaId,
        status: 'ativa'
      });

      const assinatura = assinaturas[0];
      if (!assinatura) {
        console.error('[WebhookIA] Assinatura não encontrada');
        return Response.json({ error: 'Assinatura não encontrada' }, { status: 404 });
      }

      // Adicionar módulo IA aos módulos ativos
      const modulosAtivos = assinatura.modulos_adicionais || [];
      if (!modulosAtivos.includes('secretaria_ia')) {
        modulosAtivos.push('secretaria_ia');
        
        await base44.asServiceRole.entities.AssinaturaClinica.update(assinatura.id, {
          modulos_adicionais: modulosAtivos,
          ia_premium_ativa: true,
          ia_premium_desde: new Date().toISOString(),
          stripe_subscription_id_ia: session.subscription
        });

        console.log('[WebhookIA] Módulo IA ativado com sucesso');
      }

      // Registrar conversão (MÉTRICA FASE 5)
      await base44.asServiceRole.entities.LogUsageIA.create({
        clinica_id: clinicaId,
        modo: 'upgrade_premium',
        status: 'gerado',
        resposta_ia: 'Upgrade para IA Premium concluído via Stripe',
        tempo_resposta_ms: 0
      });
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const clinicaId = subscription.metadata.clinica_id;

      if (subscription.metadata.modulo_addon === 'secretaria_ia') {
        console.log('[WebhookIA] Cancelando módulo IA para clínica:', clinicaId);

        const assinaturas = await base44.asServiceRole.entities.AssinaturaClinica.filter({
          clinica_id: clinicaId
        });

        const assinatura = assinaturas[0];
        if (assinatura) {
          const modulosAtivos = (assinatura.modulos_adicionais || []).filter(m => m !== 'secretaria_ia');
          
          await base44.asServiceRole.entities.AssinaturaClinica.update(assinatura.id, {
            modulos_adicionais: modulosAtivos,
            ia_premium_ativa: false
          });

          console.log('[WebhookIA] Módulo IA desativado');
        }
      }
    }

    return Response.json({ received: true });

  } catch (error) {
    console.error('[WebhookIA] Erro:', error);
    return Response.json({ error: error.message }, { status: 400 });
  }
});