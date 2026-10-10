import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@17.5.0';

/**
 * HEALTH CHECK STRIPE - Teste real de conectividade
 * Testa: API key válida, produtos acessíveis, webhooks configurados
 */
Deno.serve(async (req) => {
  const startTime = Date.now();
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.role === 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const results = { tests: [], status: 'success', latencia_total_ms: 0 };

    // TEST 1: Listar produtos
    try {
      const produtos = await stripe.products.list({ limit: 5 });
      results.tests.push({
        nome: 'Listar Produtos',
        status: 'pass',
        detalhes: `${produtos.data.length} produtos encontrados`
      });
    } catch (error) {
      results.tests.push({
        nome: 'Listar Produtos',
        status: 'fail',
        erro: error.message
      });
      results.status = 'error';
    }

    // TEST 2: Verificar webhook endpoint
    try {
      const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
      results.tests.push({
        nome: 'Webhook Secret',
        status: webhookSecret ? 'pass' : 'fail',
        detalhes: webhookSecret ? 'Configurado' : 'STRIPE_WEBHOOK_SECRET ausente'
      });
      if (!webhookSecret) results.status = 'error';
    } catch (error) {
      results.tests.push({
        nome: 'Webhook Secret',
        status: 'fail',
        erro: error.message
      });
      results.status = 'error';
    }

    // TEST 3: Buscar últimos eventos
    try {
      const events = await stripe.events.list({ limit: 5 });
      results.tests.push({
        nome: 'Eventos Stripe',
        status: 'pass',
        detalhes: `${events.data.length} eventos recentes`
      });
    } catch (error) {
      results.tests.push({
        nome: 'Eventos Stripe',
        status: 'fail',
        erro: error.message
      });
      results.status = 'error';
    }

    // TEST 4: Validar auditoria funcionando
    try {
      const logs = await base44.asServiceRole.entities.StripeEventLog.list('-created_date', 5);
      results.tests.push({
        nome: 'Auditoria StripeEventLog',
        status: logs.length > 0 ? 'pass' : 'warning',
        detalhes: logs.length > 0 ? `${logs.length} eventos auditados` : 'Nenhum evento auditado ainda'
      });
    } catch (error) {
      results.tests.push({
        nome: 'Auditoria StripeEventLog',
        status: 'fail',
        erro: error.message
      });
    }

    results.latencia_total_ms = Date.now() - startTime;
    results.timestamp = new Date().toISOString();

    console.log('[HealthCheck:Stripe]', results);

    return Response.json(results);

  } catch (error) {
    return Response.json({ 
      status: 'error',
      error: error.message,
      latencia_total_ms: Date.now() - startTime
    }, { status: 500 });
  }
});