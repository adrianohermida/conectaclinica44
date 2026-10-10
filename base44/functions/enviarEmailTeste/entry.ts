import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import nodemailer from 'npm:nodemailer@6.9.7';

/**
 * Envia email de teste para validar configuração SMTP
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { email_destino, config_email } = await req.json();

    if (!email_destino) {
      return Response.json({ error: 'Email destino obrigatório' }, { status: 400 });
    }

    if (!config_email?.smtp_host || !config_email?.smtp_user || !config_email?.smtp_password_encrypted) {
      return Response.json({ 
        error: 'Configuração SMTP incompleta' 
      }, { status: 400 });
    }

    // Buscar clínica
    const clinicas = await base44.asServiceRole.entities.Clinica.list();
    const clinica = clinicas.find(c => c.id === user.clinica_id);

    const transporter = nodemailer.createTransport({
      host: config_email.smtp_host,
      port: config_email.smtp_port || 587,
      secure: config_email.smtp_port === 465,
      auth: {
        user: config_email.smtp_user,
        pass: config_email.smtp_password_encrypted
      }
    });

    const htmlEmail = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8f9fa;">
  <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #7E57FF 0%, #9333ea 100%); padding: 40px 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">✅ Email de Teste</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 12px 0 0 0; font-size: 16px;">Configuração SMTP Validada</p>
    </div>
    <div style="padding: 40px 30px;">
      <div style="background: #f5f3ff; border-left: 4px solid #7E57FF; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
        <p style="margin: 0; font-size: 14px; color: #6d28d9; font-weight: 600;">TESTE REALIZADO COM SUCESSO</p>
        <p style="margin: 8px 0 0 0; font-size: 13px; color: #5b21b6;">Se você recebeu este email, sua configuração SMTP está funcionando corretamente.</p>
      </div>
      
      <h2 style="font-size: 18px; color: #202124; margin: 0 0 16px 0; font-weight: 600;">Detalhes da Configuração:</h2>
      
      <table style="width: 100%; font-size: 14px; color: #5f6368; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #e8eaed;">
          <td style="padding: 12px 0; font-weight: 600;">Clínica:</td>
          <td style="padding: 12px 0;">${clinica?.nome || 'N/A'}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e8eaed;">
          <td style="padding: 12px 0; font-weight: 600;">Servidor SMTP:</td>
          <td style="padding: 12px 0;">${config_email.smtp_host}:${config_email.smtp_port}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e8eaed;">
          <td style="padding: 12px 0; font-weight: 600;">Remetente:</td>
          <td style="padding: 12px 0;">${config_email.email_remetente}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e8eaed;">
          <td style="padding: 12px 0; font-weight: 600;">Data/Hora:</td>
          <td style="padding: 12px 0;">${new Date().toLocaleString('pt-BR')}</td>
        </tr>
      </table>

      <div style="background: #e0f2fe; border: 2px solid #0ea5e9; border-radius: 12px; padding: 20px; margin-top: 30px;">
        <p style="margin: 0 0 12px 0; font-size: 14px; color: #0c4a6e; font-weight: 600;">✅ Próximos Passos:</p>
        <ol style="margin: 0; padding-left: 20px; font-size: 13px; color: #075985; line-height: 1.8;">
          <li>Verifique se este email chegou na caixa de entrada (não spam)</li>
          <li>Configure SPF/DKIM no seu domínio para melhor entregabilidade</li>
          <li>Ative o webhook Inbound Parse no SendGrid</li>
          <li>Teste enviar e receber emails reais de tickets</li>
        </ol>
      </div>

      <div style="margin-top: 30px; padding-top: 24px; border-top: 1px solid #e8eaed; text-align: center;">
        <p style="margin: 0; font-size: 13px; color: #80868b;">
          Email de teste enviado via <strong style="color: #7E57FF;">ConectaClínica</strong>
        </p>
      </div>
    </div>
    <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e8eaed;">
      <p style="margin: 0; font-size: 12px; color: #80868b;">© ${new Date().getFullYear()} ConectaClínica • Sistema de Gestão Médica</p>
    </div>
  </div>
</body>
</html>`;

    await transporter.sendMail({
      from: `${config_email.nome_remetente} <${config_email.email_remetente}>`,
      replyTo: config_email.email_remetente,
      to: email_destino,
      subject: '✅ Email de Teste - ConectaClínica',
      html: htmlEmail
    });

    console.log('[TESTE_EMAIL] ✅ Enviado para:', email_destino);

    // Atualizar status da config
    const configs = await base44.asServiceRole.entities.ConfiguracaoEmail.filter({ 
      clinica_id: user.clinica_id 
    });
    
    if (configs.length > 0) {
      await base44.asServiceRole.entities.ConfiguracaoEmail.update(configs[0].id, {
        status_conexao: 'sucesso',
        ultima_conexao_testada: new Date().toISOString()
      });
    }

    return Response.json({ 
      success: true,
      message: 'Email de teste enviado com sucesso' 
    });

  } catch (error) {
    console.error('[TESTE_EMAIL] ❌ Erro:', error);

    // Atualizar status como falhou
    try {
      const base44Fallback = createClientFromRequest(req);
      const userFallback = await base44Fallback.auth.me();
      
      const configs = await base44Fallback.asServiceRole.entities.ConfiguracaoEmail.filter({ 
        clinica_id: userFallback.clinica_id 
      });
      
      if (configs.length > 0) {
        await base44Fallback.asServiceRole.entities.ConfiguracaoEmail.update(configs[0].id, {
          status_conexao: 'falhou',
          ultima_conexao_testada: new Date().toISOString()
        });
      }
    } catch {}

    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});