import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { destinatario, mensagem, tipo } = await req.json();

    // Como não temos Twilio/SendGrid configurado, vamos enviar por email
    // Em produção, isso seria substituído por WhatsApp API
    
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: "PrevenClin",
      to: destinatario,
      subject: `📱 Notificação PrevenClin - ${tipo}`,
      body: `
${mensagem}

---
Esta mensagem foi enviada automaticamente pelo sistema PrevenClin.

📧 Caso prefira, responda este email que entraremos em contato.
📱 WhatsApp: (92) 99999-9999
🌐 Site: https://prevenclin.com.br

PrevenClin - Medicina Integrativa
Ponta Negra, Manaus - AM
      `
    });

    // Registrar notificação no sistema
    await base44.asServiceRole.entities.ConfiguracaoNotificacao.create({
      destinatario,
      tipo,
      mensagem,
      canal: "email",
      status: "enviado",
      data_envio: new Date().toISOString()
    });

    return Response.json({ success: true, message: "Notificação enviada" });
  } catch (error) {
    console.error("Erro ao enviar notificação:", error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});