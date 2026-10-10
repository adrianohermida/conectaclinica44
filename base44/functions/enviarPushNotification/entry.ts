import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import webpush from 'npm:web-push@3.6.7';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscription, title, body, url, tag, requireInteraction } = await req.json();

    if (!subscription || !subscription.endpoint) {
      return Response.json({ error: 'Subscription inválida' }, { status: 400 });
    }

    // Configurar VAPID
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      return Response.json({ error: 'VAPID keys não configuradas' }, { status: 500 });
    }

    webpush.setVapidDetails(
      'mailto:contato@conectaclinica.com.br',
      vapidPublicKey,
      vapidPrivateKey
    );

    // Payload da notificação
    const payload = JSON.stringify({
      title: title || 'ConectaClínica',
      body: body || 'Nova notificação',
      url: url || '/',
      tag: tag || 'default',
      requireInteraction: requireInteraction || false
    });

    // Enviar push
    await webpush.sendNotification(subscription, payload);

    // Registrar log de auditoria
    await base44.asServiceRole.entities.LogAuditoria.create({
      user_id: user.id,
      acao: 'push_notification_sent',
      entidade: 'PushNotification',
      detalhes: {
        titulo: title,
        url: url,
        tag: tag
      },
      timestamp: new Date().toISOString()
    }).catch(() => {}); // Silent fail

    return Response.json({ 
      success: true,
      message: 'Push notification enviada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao enviar push:', error);
    
    // Se for erro de subscription expirada/inválida
    if (error.statusCode === 410 || error.statusCode === 404) {
      return Response.json({ 
        error: 'Subscription expirada ou inválida',
        expired: true 
      }, { status: 410 });
    }

    return Response.json({ 
      error: error.message || 'Erro ao enviar push notification'
    }, { status: 500 });
  }
});