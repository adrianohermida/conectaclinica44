import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const events = await req.json();

    console.log('[Webhook SendGrid] Recebidos', events.length, 'eventos');

    for (const event of events) {
      const { event: eventType, sg_message_id, timestamp } = event;
      
      if (!sg_message_id) continue;

      // Buscar convite pelo message_id
      const convites = await base44.asServiceRole.entities.ConviteUsuario.filter({
        sendgrid_message_id: sg_message_id
      });

      if (convites.length === 0) {
        console.log('[Webhook] Convite não encontrado para message_id:', sg_message_id);
        continue;
      }

      const convite = convites[0];
      const updateData = {};

      // Mapear evento SendGrid -> status_email
      switch (eventType) {
        case 'delivered':
          updateData.status_email = 'entregue';
          updateData.data_entrega = new Date(timestamp * 1000).toISOString();
          break;
        case 'open':
          updateData.status_email = 'aberto';
          updateData.data_leitura = new Date(timestamp * 1000).toISOString();
          break;
        case 'click':
          updateData.status_email = 'clicado';
          updateData.data_clique = new Date(timestamp * 1000).toISOString();
          break;
        case 'bounce':
          updateData.status_email = 'bounce';
          break;
        case 'spamreport':
          updateData.status_email = 'spam';
          break;
        case 'dropped':
        case 'deferred':
          updateData.status_email = 'erro';
          break;
      }

      if (Object.keys(updateData).length > 0) {
        await base44.asServiceRole.entities.ConviteUsuario.update(convite.id, updateData);
        console.log('[Webhook] Convite', convite.id, 'atualizado:', eventType);
      }
    }

    return Response.json({ success: true, processed: events.length });

  } catch (error) {
    console.error('[Webhook SendGrid] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});