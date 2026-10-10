import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@17.5.0';
import { format, addMonths } from 'npm:date-fns@3.6.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

/**
 * Helper: Criar/resgatar coupon 100% off para clínicas beta
 */
async function criarCouponBeta(stripe, planoNome) {
  const couponId = `BETA_${planoNome.toUpperCase()}_100OFF`;
  
  try {
    // Tentar resgatar existente
    const existente = await stripe.coupons.retrieve(couponId);
    return existente.id;
  } catch (error) {
    // Criar novo se não existir
    const novoCoupon = await stripe.coupons.create({
      id: couponId,
      percent_off: 100,
      duration: 'forever',
      name: `Beta ${planoNome} - 100% OFF`,
      metadata: { tipo: 'beta_gratuito' }
    });
    return novoCoupon.id;
  }
}

/**
 * Webhook Stripe - processa eventos de assinatura
 * Eventos críticos:
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - invoice.paid
 * - invoice.payment_failed
 */
Deno.serve(async (req) => {
  const startTime = Date.now();
  let eventLog = null;

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return Response.json({ error: 'Signature missing' }, { status: 400 });
    }

    // Verificar assinatura
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret
    );

    console.log(`✅ Webhook recebido: ${event.type}`);

    // AUDITORIA: Criar log do evento ANTES de processar
    const clinica_id = event.data.object?.metadata?.clinica_id || 
                       event.data.object?.customer_id || 
                       null;
    
    const impactaReceita = ['invoice.paid', 'invoice.payment_failed', 'charge.refunded', 'charge.succeeded'].includes(event.type);
    
    eventLog = await base44.asServiceRole.entities.StripeEventLog.create({
      event_id: event.id,
      event_type: event.type,
      clinica_id,
      stripe_customer_id: event.data.object.customer,
      stripe_subscription_id: event.data.object.subscription || event.data.object.id,
      stripe_invoice_id: event.data.object.invoice || null,
      valor_centavos: event.data.object.amount_paid || event.data.object.amount || 0,
      status_processamento: 'processado',
      tentativas_processamento: 1,
      payload_completo: event,
      data_evento: new Date(event.created * 1000).toISOString(),
      data_processamento: new Date().toISOString(),
      impacto_receita: impactaReceita
    });

    // Processar evento
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const clinica_id = subscription.metadata.clinica_id;

        if (!clinica_id) {
          console.warn('⚠️ Subscription sem clinica_id no metadata');
          if (eventLog) {
            await base44.asServiceRole.entities.StripeEventLog.update(eventLog.id, {
              acao_tomada: 'Ignorado - sem clinica_id no metadata'
            });
          }
          break;
        }

        // Determinar plano pelo product_id via PlanoModulo
        const price = subscription.items.data[0].price;
        const price_id = price.id;
        const product_id = price.product;
        const valor_centavos = price.unit_amount;
        
        // Buscar PlanoModulo por stripe_product_id
        const planos = await base44.asServiceRole.entities.PlanoModulo.filter({ 
          stripe_product_id: product_id 
        });

        if (planos.length === 0) {
          console.error(`❌ Product ID ${product_id} não mapeado em PlanoModulo`);
          if (eventLog) {
            await base44.asServiceRole.entities.StripeEventLog.update(eventLog.id, {
              status_processamento: 'falhado',
              erro_detalhes: `Product ${product_id} não mapeado em PlanoModulo`,
              acao_tomada: 'Falha - produto não configurado'
            });
          }
          return Response.json({ 
            error: 'Product não mapeado. Configure PlanoModulo com stripe_product_id.' 
          }, { status: 400 });
        }

        const plano = planos[0];
        const plano_slug = plano.nome.toLowerCase();
        const modulos_inclusos = plano.modulos_inclusos;

        // 🎁 BETA ENFORCEMENT: Aplicar desconto 100% se clínica é beta
        const isBeta = plano.beta_clinicas?.includes(clinica_id);
        
        if (isBeta) {
          console.log(`🎁 BETA DETECTADO: ${clinica_id} é beta em ${plano.nome} - APLICANDO DESCONTO 100%`);
          
          // Aplicar coupon 100% off na subscription
          try {
            await stripe.subscriptions.update(subscription.id, {
              coupon: await criarCouponBeta(stripe, plano.nome)
            });
            console.log(`✅ Desconto 100% aplicado à subscription ${subscription.id}`);
          } catch (error) {
            console.error('❌ Erro ao aplicar coupon beta:', error);
            // Continuar mesmo se falhar - vai criar AssinaturaClinica com valor 0
          }
        }
        
        // Limites baseados no plano
        const limites = {
          max_usuarios: plano.limite_usuarios || 3,
          max_pacientes: plano_slug === 'starter' ? 100 : plano_slug === 'profissional' ? 500 : 9999,
          max_agendamentos_mes: plano_slug === 'starter' ? 500 : plano_slug === 'profissional' ? 2000 : 9999,
          creditos_ia_mes: plano_slug === 'starter' ? 100 : plano_slug === 'profissional' ? 300 : 1000,
          creditos_consulta_mes: plano_slug === 'starter' ? 50 : plano_slug === 'profissional' ? 200 : 500,
          storage_gb: plano.limite_storage_gb || 5
        };

        // Buscar ou criar AssinaturaClinica
        const assinaturas = await base44.asServiceRole.entities.AssinaturaClinica.filter({ clinica_id });
        
        const dataProximoPagamento = new Date(subscription.current_period_end * 1000);
        
        let acaoTomada = '';
        
        if (assinaturas.length > 0) {
          // Atualizar
          await base44.asServiceRole.entities.AssinaturaClinica.update(assinaturas[0].id, {
            ...assinaturas[0],
            plano_slug,
            modulos_inclusos,
            status: subscription.status === 'active' ? 'ativa' : subscription.status,
            stripe_subscription_id: subscription.id,
            stripe_price_id: price_id,
            valor_mensal_centavos: isBeta ? 0 : valor_centavos,
            data_proximo_pagamento: format(dataProximoPagamento, 'yyyy-MM-dd'),
            limites
          });
          acaoTomada = `AssinaturaClinica atualizada para ${plano_slug} (R$ ${(valor_centavos/100).toFixed(2)}/mês)`;
        } else {
          // Criar
          await base44.asServiceRole.entities.AssinaturaClinica.create({
            clinica_id,
            plano_slug,
            modulos_inclusos,
            status: 'ativa',
            stripe_customer_id: subscription.customer,
            stripe_subscription_id: subscription.id,
            stripe_price_id: price_id,
            data_inicio: format(new Date(), 'yyyy-MM-dd'),
            data_proximo_pagamento: format(dataProximoPagamento, 'yyyy-MM-dd'),
            valor_mensal_centavos: isBeta ? 0 : valor_centavos,
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
          acaoTomada = `AssinaturaClinica criada para ${plano_slug} (R$ ${(valor_centavos/100).toFixed(2)}/mês)`;
        }

        // Criar/atualizar créditos de IA
        const creditosIA = await base44.asServiceRole.entities.CreditoIA.filter({ clinica_id });
        if (creditosIA.length > 0) {
          await base44.asServiceRole.entities.CreditoIA.update(creditosIA[0].id, {
            ...creditosIA[0],
            saldo_creditos: limites.creditos_ia_mes,
            creditos_mensais_plano: limites.creditos_ia_mes,
            data_ultimo_reset: format(new Date(), 'yyyy-MM-dd')
          });
        } else {
          await base44.asServiceRole.entities.CreditoIA.create({
            clinica_id,
            saldo_creditos: limites.creditos_ia_mes,
            creditos_mensais_plano: limites.creditos_ia_mes,
            data_ultimo_reset: format(new Date(), 'yyyy-MM-dd')
          });
        }

        // Criar/atualizar créditos de Consulta
        const creditosConsulta = await base44.asServiceRole.entities.CreditoConsulta.filter({ clinica_id });
        if (creditosConsulta.length > 0) {
          await base44.asServiceRole.entities.CreditoConsulta.update(creditosConsulta[0].id, {
            ...creditosConsulta[0],
            saldo_creditos: limites.creditos_consulta_mes,
            creditos_mensais_plano: limites.creditos_consulta_mes,
            data_ultimo_reset: format(new Date(), 'yyyy-MM-dd')
          });
        } else {
          await base44.asServiceRole.entities.CreditoConsulta.create({
            clinica_id,
            saldo_creditos: limites.creditos_consulta_mes,
            creditos_mensais_plano: limites.creditos_consulta_mes,
            data_ultimo_reset: format(new Date(), 'yyyy-MM-dd')
          });
        }

        // AUDIT: Atualizar acao_tomada
        if (eventLog) {
          await base44.asServiceRole.entities.StripeEventLog.update(eventLog.id, {
            acao_tomada: acaoTomada
          });
        }

        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object;
        const subscription_id = invoice.subscription;

        // Buscar assinatura
        const assinaturas = await base44.asServiceRole.entities.AssinaturaClinica.filter({ 
          stripe_subscription_id: subscription_id 
        });

        let acaoTomada = '';
        
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
            ...assinatura,
            status: 'ativa',
            historico_pagamentos: historico
          });
          
          acaoTomada = `Pagamento R$ ${(invoice.amount_paid/100).toFixed(2)} registrado, assinatura ${assinatura.id} ativada`;
        } else {
          acaoTomada = 'Invoice paid processado, mas assinatura não encontrada';
        }

        // AUDIT: Atualizar acao_tomada
        if (eventLog) {
          await base44.asServiceRole.entities.StripeEventLog.update(eventLog.id, {
            acao_tomada: acaoTomada
          });
        }
        
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subscription_id = invoice.subscription;

        const assinaturas = await base44.asServiceRole.entities.AssinaturaClinica.filter({ 
          stripe_subscription_id: subscription_id 
        });

        let acaoTomada = '';
        
        if (assinaturas.length > 0) {
          await base44.asServiceRole.entities.AssinaturaClinica.update(assinaturas[0].id, {
            ...assinaturas[0],
            status: 'inadimplente'
          });
          acaoTomada = `Assinatura ${assinaturas[0].id} marcada como inadimplente (R$ ${(invoice.amount_due/100).toFixed(2)} não pago)`;
        } else {
          acaoTomada = 'Payment failed processado, mas assinatura não encontrada';
        }

        // AUDIT: Atualizar acao_tomada
        if (eventLog) {
          await base44.asServiceRole.entities.StripeEventLog.update(eventLog.id, {
            acao_tomada: acaoTomada
          });
        }
        
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const clinica_id = subscription.metadata.clinica_id;

        let acaoTomada = '';
        
        if (clinica_id) {
          const assinaturas = await base44.asServiceRole.entities.AssinaturaClinica.filter({ clinica_id });
          if (assinaturas.length > 0) {
            await base44.asServiceRole.entities.AssinaturaClinica.update(assinaturas[0].id, {
              ...assinaturas[0],
              status: 'cancelada',
              cancelamento: {
                data_efetiva: format(new Date(), 'yyyy-MM-dd')
              }
            });
            acaoTomada = `Assinatura ${assinaturas[0].id} cancelada`;
          } else {
            acaoTomada = 'Subscription deleted processado, mas assinatura não encontrada';
          }
        } else {
          acaoTomada = 'Subscription deleted sem clinica_id';
        }

        // AUDIT: Atualizar acao_tomada
        if (eventLog) {
          await base44.asServiceRole.entities.StripeEventLog.update(eventLog.id, {
            acao_tomada: acaoTomada
          });
        }
        
        break;
      }

      default:
        console.log(`Evento não tratado: ${event.type}`);
        if (eventLog) {
          await base44.asServiceRole.entities.StripeEventLog.update(eventLog.id, {
            acao_tomada: `Evento ${event.type} não possui handler (ignorado)`
          });
        }
    }

    // AUDITORIA: Atualizar log com tempo (acao_tomada já foi setada no switch)
    const tempoProcessamento = Date.now() - startTime;
    if (eventLog) {
      const logAtual = await base44.asServiceRole.entities.StripeEventLog.filter({ id: eventLog.id });
      await base44.asServiceRole.entities.StripeEventLog.update(eventLog.id, {
        tempo_processamento_ms: tempoProcessamento,
        acao_tomada: logAtual[0].acao_tomada || `Evento ${event.type} processado com sucesso`
      });
    }

    return Response.json({ received: true, tempo_ms: tempoProcessamento });

  } catch (error) {
    console.error('❌ Erro webhook:', error);

    // AUDITORIA: Marcar log como falhado
    if (eventLog) {
      try {
        await base44.asServiceRole.entities.StripeEventLog.update(eventLog.id, {
          status_processamento: 'falhado',
          erro_detalhes: error.message,
          tempo_processamento_ms: Date.now() - startTime
        });
      } catch (logError) {
        console.error('❌ Erro ao atualizar log de falha:', logError);
      }
    }

    return Response.json({ error: error.message }, { status: 500 });
  }
});