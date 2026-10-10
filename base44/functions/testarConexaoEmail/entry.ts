import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import nodemailer from 'npm:nodemailer@6.9.7';

/**
 * Testa conexão SMTP antes de salvar config
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { smtp_host, smtp_port, smtp_user, smtp_password, smtp_secure } = await req.json();

    if (!smtp_host || !smtp_user || !smtp_password) {
      return Response.json({ 
        success: false,
        error: 'Campos obrigatórios: host, user, password' 
      }, { status: 400 });
    }

    // Testar conexão
    const transporter = nodemailer.createTransport({
      host: smtp_host,
      port: smtp_port || 587,
      secure: smtp_secure !== false,
      auth: {
        user: smtp_user,
        pass: smtp_password
      },
      connectionTimeout: 10000
    });

    await transporter.verify();

    console.log('[TESTE_SMTP] ✅ Conexão OK:', smtp_host);

    return Response.json({ 
      success: true,
      message: `Conexão estabelecida com ${smtp_host}` 
    });

  } catch (error) {
    console.error('[TESTE_SMTP] ❌ Falhou:', error.message);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 200 }); // 200 para não quebrar frontend
  }
});