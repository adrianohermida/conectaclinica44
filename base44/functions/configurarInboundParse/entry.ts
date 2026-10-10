import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * CRÍTICO: Configura SendGrid Inbound Parse
 * Sem isso, emails externos NÃO viram tickets (falha silenciosa devastadora)
 * 
 * API: POST /v3/user/webhooks/parse/settings
 * Docs: https://docs.sendgrid.com/api-reference/parse-webhook-settings/create-a-parse-setting
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Allow users with clinica_id OR admins
    if (!user.clinica_id && user.role !== 'admin') {
      return Response.json({ error: 'User must belong to a clinic or be admin' }, { status: 403 });
    }

    const body = await req.json();
    const { hostname } = body;
    
    if (!hostname) {
      return Response.json({ 
        error: 'hostname é obrigatório (ex: prevenclin.com.br)' 
      }, { status: 400 });
    }
    
    console.log('[configurarInboundParse] 📥 Request:', body);

    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
    if (!SENDGRID_API_KEY) {
      throw new Error('SENDGRID_API_KEY não configurada');
    }

    // Webhook URL com token de validação
    const token = Deno.env.get('SENDGRID_WEBHOOK_VALIDATION_TOKEN');
    const baseUrl = Deno.env.get('BASE44_BASE_URL');
    const appId = Deno.env.get('BASE44_APP_ID');
    const webhookUrl = `${baseUrl}/api/apps/${appId}/functions/webhookReceberEmail?token=${token}`;

    // Verificar se já existe
    const checkRes = await fetch('https://api.sendgrid.com/v3/user/webhooks/parse/settings', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const existing = await checkRes.json();
    console.log('[configurarInboundParse] 📊 Configs existentes:', existing);
    
    const alreadyConfigured = existing.result?.some(s => s.hostname === hostname);

    if (alreadyConfigured) {
      console.log('[configurarInboundParse] ✅ Já configurado para:', hostname);
      return Response.json({
        success: true,
        already_configured: true,
        hostname,
        webhook_url: webhookUrl,
        mensagem: 'Inbound Parse já configurado'
      });
    }
    
    console.log('[configurarInboundParse] ➕ Criando Inbound Parse para:', hostname);

    // Criar Inbound Parse
    const createRes = await fetch('https://api.sendgrid.com/v3/user/webhooks/parse/settings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        hostname,
        url: webhookUrl,
        spam_check: true,
        send_raw: false
      })
    });

    if (!createRes.ok) {
      const error = await createRes.text();
      console.error('[configurarInboundParse] ❌ SendGrid error:', error);
      throw new Error(`SendGrid API error: ${error}`);
    }

    const created = await createRes.json();
    console.log('[configurarInboundParse] ✅ Criado:', created);
    console.log('[configurarInboundParse] 🌐 Webhook:', webhookUrl);

    return Response.json({
      success: true,
      hostname,
      webhook_url: webhookUrl,
      sendgrid_response: created,
      mensagem: `Inbound Parse configurado para ${hostname}`
    });
  } catch (error) {
    console.error('Erro ao configurar inbound parse:', error);
    
    // Registrar incidente
    try {
      const base44 = createClientFromRequest(req);
      await base44.functions.invoke('registrarIncidente', {
        modulo: 'email',
        severidade: 'critico',
        tipo_erro: 'inbound_parse_falhou',
        mensagem_erro: error.message,
        stack_trace: error.stack
      });
    } catch {}

    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});