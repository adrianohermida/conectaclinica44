import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

/**
 * RETRY WEBHOOK FAILURES - Dead Letter Queue Processor
 * Processa eventos Stripe que falharam no webhook principal
 * Chamado manualmente via SuperAdmin ou cron job
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // CRITICAL: Apenas SuperAdmin pode executar retry
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const startTime = Date.now();

    // Buscar eventos falhados (max 3 tentativas) E não reprocessados recentemente
    const umMinutoAtras = new Date(Date.now() - 60 * 1000).toISOString();
    
    const eventosFalhados = await base44.asServiceRole.entities.StripeEventLog.filter({
      status_processamento: { $in: ['falhado', 'retry_pendente'] },
      tentativas_processamento: { $lt: 3 },
      $or: [
        { data_processamento: { $lt: umMinutoAtras } },
        { data_processamento: { $exists: false } }
      ]
    });

    console.log(`[Retry] 🔄 Encontrados ${eventosFalhados.length} eventos para retry`);

    const resultados = {
      total: eventosFalhados.length,
      sucesso: 0,
      falha: 0,
      detalhes: []
    };

    for (const log of eventosFalhados) {
      try {
        const event = log.payload_completo;
        
        // Reprocessar evento
        const processResult = await processarEventoStripe(base44, event);
        
        // Atualizar log como processado
        await base44.asServiceRole.entities.StripeEventLog.update(log.id, {
          status_processamento: 'processado',
          tentativas_processamento: log.tentativas_processamento + 1,
          acao_tomada: processResult.acao,
          data_processamento: new Date().toISOString()
        });

        resultados.sucesso++;
        resultados.detalhes.push({
          event_id: log.event_id,
          tipo: log.event_type,
          resultado: 'sucesso',
          acao: processResult.acao
        });

      } catch (error) {
        // Marcar como falhado novamente
        await base44.asServiceRole.entities.StripeEventLog.update(log.id, {
          status_processamento: log.tentativas_processamento >= 2 ? 'falhado' : 'retry_pendente',
          tentativas_processamento: log.tentativas_processamento + 1,
          erro_detalhes: error.message,
          data_processamento: new Date().toISOString()
        });

        resultados.falha++;
        resultados.detalhes.push({
          event_id: log.event_id,
          tipo: log.event_type,
          resultado: 'falha',
          erro: error.message
        });

        console.error(`[Retry] ❌ Falha ao reprocessar ${log.event_id}:`, error.message);
      }
    }

    const tempoTotal = Date.now() - startTime;

    return Response.json({
      success: true,
      tempo_processamento_ms: tempoTotal,
      resultados
    });

  } catch (error) {
    console.error('[Retry] Erro geral:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

/**
 * Processa evento Stripe (mesma lógica do webhook principal)
 */
async function processarEventoStripe(base44, event) {
  const { format, addMonths } = await import('npm:date-fns@3.6.0');

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const clinica_id = subscription.metadata.clinica_id;

      if (!clinica_id) {
        throw new Error('Subscription sem clinica_id no metadata');
      }

      const price = subscription.items.data[0].price;
      const product_id = price.product;
      const valor_centavos = price.unit_amount;
      
      const planos = await base44.asServiceRole.entities.PlanoModulo.filter({ 
        stripe_product_id: product_id 
      });

      if (planos.length === 0) {
        throw new Error(`Product ID ${product_id} não mapeado em PlanoModulo`);
      }

      const plano = planos[0];
      const plano_slug = plano.nome.toLowerCase();
      const modulos_inclusos = plano.modulos_inclusos;

      const limites = {
        max_usuarios: plano.limite_usuarios || 3,
        max_pacientes: plano_slug === 'starter' ? 100 : plano_slug === 'profissional' ? 500 : 9999,
        max_agendamentos_mes: plano_slug === 'starter' ? 500 : plano_slug === 'profissional' ? 2000 : 9999,
        creditos_ia_mes: plano_slug === 'starter' ? 100 : plano_slug === 'profissional' ? 300 : 1000,
        creditos_consulta_mes: plano_slug === 'starter' ? 50 : plano_slug === 'profissional' ? 200 : 500,
        storage_gb: plano.limite_storage_gb || 5
      };

      const assinaturas = await base44.asServiceRole.entities.AssinaturaClinica.filter({ clinica_id });
      const dataProximoPagamento = new Date(subscription.current_period_end * 1000);
      
      if (assinaturas.length > 0) {
        await base44.asServiceRole.entities.AssinaturaClinica.update(assinaturas[0].id, {
          plano_slug,
          modulos_inclusos,
          status: subscription.status === 'active' ? 'ativa' : subscription.status,
          stripe_subscription_id: subscription.id,
          stripe_price_id: price.id,
          valor_mensal_centavos,
          data_proximo_pagamento: format(dataProximoPagamento, 'yyyy-MM-dd'),
          limites
        });
      } else {
        await base44.asServiceRole.entities.AssinaturaClinica.create({
          clinica_id,
          plano_slug,
          modulos_inclusos,
          status: 'ativa',
          stripe_customer_id: subscription.customer,
          stripe_subscription_id: subscription.id,
          stripe_price_id: price.id,
          data_inicio: format(new Date(), 'yyyy-MM-dd'),
          data_proximo_pagamento: format(dataProximoPagamento, 'yyyy-MM-dd'),
          valor_mensal_centavos,
          limites,
          uso_atual: {
            usuarios: 0,
            pacientes: 0,
            agendamentos_mes: 0,
            creditos_ia_usados: 0,
            creditos_consulta_usados: 0,
            storage_usado_gb: 0
          }
        });
      }

      return { acao: `AssinaturaClinica ${assinaturas.length > 0 ? 'atualizada' : 'criada'} para ${plano_slug}` };
    }

    case 'invoice.paid': {
      const invoice = event.data.object;
      const subscription_id = invoice.subscription;

      const assinaturas = await base44.asServiceRole.entities.AssinaturaClinica.filter({ 
        stripe_subscription_id: subscription_id 
      });

      if (assinaturas.length > 0) {
        const assinatura = assinaturas[0];
        const historico = assinatura.historico_pagamentos || [];
        historico.push({
          data: format(new Date(invoice.created * 1000), 'yyyy-MM-dd'),
          valor: invoice.amount_paid,
          status: 'pago',
          stripe_invoice_id: invoice.id
        });

        await base44.asServiceRole.entities.AssinaturaClinica.update(assinatura.id, {
          status: 'ativa',
          historico_pagamentos: historico
        });

        return { acao: 'Pagamento registrado, assinatura ativada' };
      }
      
      return { acao: 'Invoice paid processado (assinatura não encontrada)' };
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const subscription_id = invoice.subscription;

      const assinaturas = await base44.asServiceRole.entities.AssinaturaClinica.filter({ 
        stripe_subscription_id: subscription_id 
      });

      if (assinaturas.length > 0) {
        await base44.asServiceRole.entities.AssinaturaClinica.update(assinaturas[0].id, {
          status: 'inadimplente'
        });

        return { acao: 'Assinatura marcada como inadimplente' };
      }

      return { acao: 'Payment failed processado (assinatura não encontrada)' };
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const clinica_id = subscription.metadata.clinica_id;

      if (clinica_id) {
        const assinaturas = await base44.asServiceRole.entities.AssinaturaClinica.filter({ clinica_id });
        if (assinaturas.length > 0) {
          await base44.asServiceRole.entities.AssinaturaClinica.update(assinaturas[0].id, {
            status: 'cancelada',
            cancelamento: {
              data_efetiva: format(new Date(), 'yyyy-MM-dd')
            }
          });

          return { acao: 'Assinatura cancelada' };
        }
      }

      return { acao: 'Subscription deleted processado' };
    }

    default:
      return { acao: `Evento ${event.type} não tratado` };
  }
}