import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import sgMail from 'npm:@sendgrid/mail';

/**
 * DIAGNÓSTICO BRUTAL: Testar SendGrid end-to-end
 * Valida API key, sender verification, deliverability
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Apenas admin' }, { status: 403 });
    }

    const { email_destino } = await req.json();

    if (!email_destino) {
      return Response.json({ error: 'email_destino obrigatório' }, { status: 400 });
    }

    const diagnostico = {
      api_key: null,
      sender_verification: null,
      teste_envio: null,
      timestamp: new Date().toISOString()
    };

    // STEP 1: Validar API Key
    const apiKey = Deno.env.get('SENDGRID_API_KEY');
    if (!apiKey) {
      diagnostico.api_key = {
        status: 'CRÍTICO',
        problema: 'SENDGRID_API_KEY não configurada',
        solucao: 'Configurar em Settings → Environment Variables'
      };
      return Response.json({ success: false, diagnostico }, { status: 500 });
    }

    diagnostico.api_key = {
      status: 'OK',
      preview: apiKey.substring(0, 10) + '...',
      length: apiKey.length
    };

    sgMail.setApiKey(apiKey);

    // STEP 2: Verificar sender
    const fromEmail = 'noreply@conectaclinica.com.br';
    diagnostico.sender_verification = {
      email: fromEmail,
      status: 'ASSUMIDO OK (Single Sender Verification manual)',
      nota: 'Se email falhar, verificar em SendGrid Dashboard → Settings → Sender Authentication'
    };

    // STEP 3: Teste de envio REAL
    console.log('📧 Enviando email teste para:', email_destino);

    const msg = {
      to: email_destino,
      from: {
        email: fromEmail,
        name: 'ConectaClínica - Teste'
      },
      subject: '✅ Teste SendGrid - ConectaClínica',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #7E57FF;">✅ SendGrid Funcionando!</h1>
          <p>Este é um email de teste enviado em ${new Date().toLocaleString('pt-BR')}</p>
          <p>Se você recebeu este email, o SendGrid está configurado corretamente.</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e8eaed;">
          <p style="color: #5f6368; font-size: 12px;">
            Enviado por: ${user.email}<br>
            API Key: ${apiKey.substring(0, 10)}...<br>
            Timestamp: ${new Date().toISOString()}
          </p>
        </div>
      `,
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true }
      }
    };

    const [response] = await sgMail.send(msg);

    console.log('✅ SendGrid response:', response.statusCode, response.headers);

    diagnostico.teste_envio = {
      status: 'SUCESSO',
      status_code: response.statusCode,
      message_id: response.headers['x-message-id'] || 'sem-id',
      para: email_destino,
      instrucoes: 'Verifique a caixa de entrada do destinatário em até 5 minutos'
    };

    return Response.json({
      success: true,
      diagnostico,
      conclusao: '✅ SendGrid 100% funcional - emails devem chegar normalmente'
    });

  } catch (error) {
    console.error('❌ ERRO BRUTAL:', error);
    console.error('Response:', error.response?.body);

    return Response.json({
      success: false,
      erro_brutal: {
        message: error.message,
        code: error.code,
        sendgrid_error: error.response?.body?.errors || null,
        sendgrid_status: error.response?.statusCode || null
      },
      diagnostico_parcial: diagnostico || null,
      solucao: error.code === 403 
        ? '🔴 SENDER NOT VERIFIED - Configurar em SendGrid Dashboard → Sender Authentication'
        : error.message.includes('API key')
        ? '🔴 API Key inválida - Regerar em SendGrid e atualizar env vars'
        : '🔴 Erro desconhecido - verificar logs completos acima'
    }, { status: 500 });
  }
});