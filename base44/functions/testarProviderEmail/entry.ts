import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import nodemailer from 'npm:nodemailer@6.9.7';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { provider_id } = await req.json();
    
    const config = await base44.entities.ConfiguracaoEmail.filter({ id: provider_id });
    if (!config[0]) {
      return Response.json({ error: 'Provedor não encontrado' }, { status: 404 });
    }

    const provedor = config[0];
    let testResult = { success: false, error: null };

    // Testar baseado no tipo
    if (provedor.provedor === 'smtp_custom') {
      try {
        const transporter = nodemailer.createTransport({
          host: provedor.smtp_host,
          port: provedor.smtp_port,
          secure: provedor.smtp_port === 465,
          auth: {
            user: provedor.smtp_usuario,
            pass: provedor.smtp_senha_encrypted // TODO: descriptografar
          }
        });

        await transporter.verify();
        testResult.success = true;
      } catch (error) {
        testResult.error = `SMTP falhou: ${error.message}`;
      }
    } else if (provedor.provedor === 'conectaclinica') {
      // Testar SendGrid
      const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
      const res = await fetch('https://api.sendgrid.com/v3/user/profile', {
        headers: { 'Authorization': `Bearer ${SENDGRID_API_KEY}` }
      });
      
      testResult.success = res.ok;
      if (!res.ok) {
        testResult.error = 'SendGrid API falhou';
      }
    } else {
      testResult.error = 'Provedor não suportado para teste';
    }

    // Atualizar status teste
    await base44.entities.ConfiguracaoEmail.update(provider_id, {
      testado_em: new Date().toISOString(),
      teste_sucesso: testResult.success
    });

    return Response.json(testResult);
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});