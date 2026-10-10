import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * SPRINT 3: Enviar newsletter via SendGrid Marketing
 * Entity Newsletter → bulk send com tracking
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Apenas admin' }, { status: 401 });
    }

    const { newsletter_id } = await req.json();
    const newsletter = await base44.entities.Newsletter.filter({ id: newsletter_id })[0];

    if (!newsletter || newsletter.status !== 'agendada') {
      return Response.json({ error: 'Newsletter inválida' }, { status: 400 });
    }

    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');

    // Buscar inscritos ativos
    const inscritos = newsletter.destinatarios_emails || [];

    if (inscritos.length === 0) {
      return Response.json({ error: 'Sem destinatários' }, { status: 400 });
    }

    // Criar Single Send
    const response = await fetch('https://api.sendgrid.com/v3/marketing/singlesends', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: newsletter.titulo,
        send_to: {
          all: false
        },
        email_config: {
          subject: newsletter.assunto,
          html_content: newsletter.html_content,
          sender_id: parseInt(Deno.env.get('SENDGRID_SENDER_ID') || '0'),
          suppression_group_id: parseInt(Deno.env.get('SENDGRID_NEWSLETTER_UNSUBSCRIBE_GROUP') || '0')
        },
        send_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const result = await response.json();

    // Atualizar newsletter
    await base44.entities.Newsletter.update(newsletter_id, {
      status: 'enviada',
      sendgrid_singlesend_id: result.id,
      data_envio_real: new Date().toISOString(),
      total_enviados: inscritos.length
    });

    return Response.json({
      success: true,
      singlesend_id: result.id,
      total_enviados: inscritos.length
    });

  } catch (error) {
    console.error('[NewsletterBulk] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});