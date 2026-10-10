import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import nodemailer from 'npm:nodemailer@6.9.7';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !user.clinica_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { config, email_teste } = await req.json();

    if (!config.smtp_host || !config.smtp_user || !config.smtp_password_encrypted) {
      return Response.json({ 
        success: false, 
        error: 'Configuração incompleta' 
      }, { status: 400 });
    }

    console.log('[SMTP_TEST] Iniciando teste:', { 
      host: config.smtp_host, 
      port: config.smtp_port,
      user: config.smtp_user 
    });

    const transporter = nodemailer.createTransport({
      host: config.smtp_host,
      port: config.smtp_port,
      secure: config.smtp_secure,
      auth: {
        user: config.smtp_user,
        pass: config.smtp_password_encrypted
      }
    });

    // Verificar conexão
    await transporter.verify();
    console.log('[SMTP_TEST] Conexão verificada');

    // Enviar email de teste
    await transporter.sendMail({
      from: `"${config.nome_remetente || 'ConectaClínica'}" <${config.email_remetente || config.smtp_user}>`,
      to: email_teste,
      subject: '✅ Teste de Configuração SMTP - ConectaClínica',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="margin: 0; padding: 40px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #F4F7FA;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #7E57FF; margin: 0; font-size: 28px;">✅ SMTP Configurado!</h1>
    </div>
    <p style="font-size: 16px; color: #202124; line-height: 1.6;">
      Parabéns! Sua configuração SMTP está funcionando corretamente.
    </p>
    <div style="background: #f5f3ff; border-left: 4px solid #7E57FF; padding: 16px; margin: 24px 0; border-radius: 8px;">
      <p style="margin: 0; color: #5f6368; font-size: 14px;">
        <strong>Configuração:</strong><br>
        Host: ${config.smtp_host}<br>
        Porta: ${config.smtp_port}<br>
        Remetente: ${config.email_remetente || config.smtp_user}
      </p>
    </div>
    <p style="font-size: 14px; color: #80868b;">
      A partir de agora, todos os convites e notificações serão enviados usando seu email institucional.
    </p>
  </div>
</body>
</html>
      `.trim()
    });

    console.log('[SMTP_TEST] Email enviado:', { to: email_teste });

    return Response.json({ 
      success: true,
      message: 'Email de teste enviado com sucesso'
    });

  } catch (error) {
    console.error('[SMTP_TEST] Erro:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});