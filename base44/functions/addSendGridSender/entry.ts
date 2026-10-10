import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * CRITICAL: Adiciona Sender Verification no SendGrid
 * Sem isso, SendGrid REJEITA 100% dos emails (erro 403)
 * 
 * API: POST /v3/verified_senders
 * Docs: https://docs.sendgrid.com/api-reference/sender-verification/create-verified-sender-request
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { from_email, from_name, reply_to_email } = await req.json();

    if (!from_email) {
      return Response.json({ 
        success: false,
        error: 'from_email obrigatório' 
      }, { status: 400 });
    }

    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
    if (!SENDGRID_API_KEY) {
      return Response.json({ 
        success: false,
        error: 'SENDGRID_API_KEY não configurada' 
      }, { status: 500 });
    }

    // 1. Verificar se sender já existe
    const listRes = await fetch('https://api.sendgrid.com/v3/verified_senders', {
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`
      }
    });

    if (!listRes.ok) {
      return Response.json({
        success: false,
        error: 'Falha ao listar senders existentes'
      }, { status: 500 });
    }

    const existing = await listRes.json();
    const alreadyExists = existing.results?.find(s => s.from_email === from_email);

    if (alreadyExists) {
      return Response.json({
        success: true,
        already_exists: true,
        verified: alreadyExists.verified,
        sender_id: alreadyExists.id,
        message: `Sender já existe (${alreadyExists.verified ? 'verificado' : 'pendente'})`
      });
    }

    // 2. Criar novo sender
    const createRes = await fetch('https://api.sendgrid.com/v3/verified_senders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nickname: from_name || from_email.split('@')[0],
        from_email: from_email,
        from_name: from_name || 'ConectaClínica',
        reply_to: reply_to_email || from_email,
        address: 'Rua Exemplo, 123',
        city: 'São Paulo',
        state: 'SP',
        zip: '01000-000',
        country: 'Brazil'
      })
    });

    if (!createRes.ok) {
      const error = await createRes.text();
      return Response.json({
        success: false,
        error: `SendGrid rejeitou: ${error}`
      }, { status: createRes.status });
    }

    const created = await createRes.json();

    return Response.json({
      success: true,
      sender_id: created.id,
      verification_email_sent: true,
      message: `Sender adicionado! Verifique email em ${from_email} para confirmar.`
    });
  } catch (error) {
    console.error('[addSendGridSender] Erro:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});