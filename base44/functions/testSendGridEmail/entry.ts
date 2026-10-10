import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email obrigatório' }, { status: 400 });
    }

    const resultado = await base44.asServiceRole.functions.invoke('sendgrid/send', {
      clinica_id: user.clinica_id || 'global',
      to: email,
      subject: '[TESTE] SendGrid Funcionando',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #7E57FF;">✅ SendGrid Conectado</h2>
          <p>Este é um email de teste automático enviado via HubEmail.</p>
          <p><strong>Enviado em:</strong> ${new Date().toLocaleString('pt-BR')}</p>
          <p><strong>Usuário:</strong> ${user.email}</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e8eaed;">
          <p style="color: #5f6368; font-size: 12px;">ConectaClínica - Hub Email</p>
        </div>
      `,
      tipo_email: 'outro'
    });

    return Response.json({
      success: true,
      message_id: resultado.data.message_id,
      enviado_para: email
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      details: error.response?.data || error.toString()
    }, { status: 500 });
  }
});