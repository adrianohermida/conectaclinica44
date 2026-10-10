import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2024-12-18.acacia'
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // AUTH: Apenas admin pode criar checkouts de recarga
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const { clinica_id, quantidade = 100 } = await req.json();

    if (!clinica_id) {
      return Response.json({ error: 'clinica_id obrigatório' }, { status: 400 });
    }

    // VALIDAÇÃO OWNERSHIP: Admin só pode recarregar própria clínica ou com justificativa
    const [clinica] = await base44.asServiceRole.entities.Clinica.filter({ id: clinica_id });
    if (!clinica) {
      return Response.json({ error: 'Clínica não encontrada' }, { status: 404 });
    }

    // CRÍTICO: Validar que admin pertence à clínica (exceto superadmin global)
    if (user.clinica_id && user.clinica_id !== clinica_id) {
      return Response.json({ 
        error: 'Unauthorized - Não pode recarregar clínica externa',
        user_clinica: user.clinica_id,
        target_clinica: clinica_id
      }, { status: 403 });
    }

    // LOG AUDITORIA LGPD
    await base44.asServiceRole.entities.LogAcessoDado.create({
      usuario_email: user.email,
      acao: 'recarga_creditos',
      entidade: 'Clinica',
      entidade_id: clinica_id,
      justificativa: 'Recarga administrativa de créditos',
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent'),
      cross_tenant: user.clinica_id !== clinica_id
    });

    // PRODUTO RECARGA: prod_TYSqXxE5aqU1Mc (ConectaClinica_Recarga)
    // PRICE: price_1SbLuSFEZT2Uu2jImUXTYBo5 (one-time, R$ 900.00 per 1000 credits)
    const PRODUTO_RECARGA_ID = 'prod_TYSqXxE5aqU1Mc';
    const PRICE_RECARGA_ID = 'price_1SbLuSFEZT2Uu2jImUXTYBo5'; // R$ 900 per 1000 credits

    // CRIAR CHECKOUT SESSION
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price: PRICE_RECARGA_ID,
          quantity: Math.ceil(quantidade / 1000) // Transform quantity: divide by 1000
        }
      ],
      success_url: `${Deno.env.get('BASE44_BASE_URL')}/FinanceiroPlataforma?recarga=success`,
      cancel_url: `${Deno.env.get('BASE44_BASE_URL')}/FinanceiroPlataforma?recarga=cancel`,
      metadata: {
        clinica_id,
        quantidade_creditos: quantidade.toString(),
        tipo: 'recarga_rapida',
        admin_email: user.email
      },
      customer_email: clinica.email || user.email,
      client_reference_id: clinica_id
    });

    // LOG AÇÃO
    console.log('[RecargaRapida] Checkout criado:', {
      session_id: session.id,
      clinica: clinica.nome,
      quantidade,
      admin: user.email
    });

    return Response.json({
      success: true,
      url: session.url,
      session_id: session.id,
      quantidade_creditos: quantidade
    });

  } catch (error) {
    console.error('[RecargaRapida] Erro:', error);
    return Response.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});