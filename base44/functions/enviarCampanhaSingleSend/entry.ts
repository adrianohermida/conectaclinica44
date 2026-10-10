import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * SPRINT 3: Enviar campanha marketing via SendGrid Single Send
 * CampanhaMarketing entity → SendGrid API
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { campanha_id } = await req.json();
    const campanha = await base44.entities.CampanhaMarketing.filter({ id: campanha_id })[0];

    if (!campanha || campanha.status !== 'agendada') {
      return Response.json({ error: 'Campanha inválida ou não agendada' }, { status: 400 });
    }

    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
    const clinica = await base44.entities.Clinica.filter({ id: user.clinica_id })[0];

    // Buscar template SendGrid
    const template = await base44.asServiceRole.entities.TemplateSendGrid.filter({
      tipo: 'campanha_marketing',
      ativo: true
    })[0];

    if (!template) {
      return Response.json({ error: 'Template campanha não encontrado' }, { status: 400 });
    }

    // Criar Single Send no SendGrid
    const response = await fetch('https://api.sendgrid.com/v3/marketing/singlesends', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: campanha.titulo,
        send_to: {
          segment_ids: campanha.segmento_ids || []
        },
        email_config: {
          subject: campanha.assunto,
          html_content: campanha.html_content,
          sender_id: parseInt(Deno.env.get('SENDGRID_SENDER_ID') || '0'),
          suppression_group_id: parseInt(Deno.env.get('SENDGRID_MARKETING_UNSUBSCRIBE_GROUP') || '0')
        },
        send_at: campanha.data_envio ? new Date(campanha.data_envio).toISOString() : undefined
      })
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const result = await response.json();

    // Atualizar campanha
    await base44.entities.CampanhaMarketing.update(campanha_id, {
      status: 'enviada',
      sendgrid_singlesend_id: result.id,
      data_envio_real: new Date().toISOString()
    });

    return Response.json({
      success: true,
      singlesend_id: result.id,
      detalhes: result
    });

  } catch (error) {
    console.error('[EnviarCampanha] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});