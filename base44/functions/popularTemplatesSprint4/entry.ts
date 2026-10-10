import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * SPRINT 4: Popular 3 templates compliance/LGPD
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Apenas SuperAdmin' }, { status: 401 });
    }

    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');

    const templates = [
      {
        tipo: 'termo_pendente',
        nome: 'Termo LGPD Pendente - ConectaClínica',
        categoria: 'compliance',
        vars: ['usuario_nome', 'termo_titulo', 'termo_descricao', 'link_aceite', 'prazo_dias', 'clinica_nome'],
        html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family: -apple-system, sans-serif; background: #f8f9fa; margin: 0; padding: 20px;"><div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden;"><div style="background: #ea4335; padding: 30px; text-align: center;"><h1 style="color: white; margin: 0;">📜 Aceite Necessário</h1></div><div style="padding: 32px;"><p>Olá <strong>{{usuario_nome}}</strong>,</p><p>É necessário aceitar o termo: <strong>{{termo_titulo}}</strong></p><div style="background: #fde7e7; border: 2px solid #ea4335; border-radius: 12px; padding: 20px; margin: 24px 0;"><p style="margin: 0; color: #666; font-size: 14px;">{{termo_descricao}}</p></div><div style="text-align: center; margin: 32px 0;"><a href="{{link_aceite}}" style="background: #ea4335; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Aceitar Termo</a></div><p style="color: #991b1b; font-size: 12px; font-weight: bold;">⚠️ Prazo: {{prazo_dias}} dias</p></div></div></body></html>`
      },
      {
        tipo: 'certidao_vence',
        nome: 'Certidão Vencendo - ConectaClínica',
        categoria: 'compliance',
        vars: ['admin_nome', 'certidao_tipo', 'orgao_emissor', 'dias_restantes', 'data_vencimento', 'link_renovar', 'clinica_nome'],
        html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family: -apple-system, sans-serif; background: #f8f9fa; margin: 0; padding: 20px;"><div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden;"><div style="background: #fbbc04; padding: 30px; text-align: center;"><h1 style="color: white; margin: 0;">⚠️ Certidão Vencendo</h1></div><div style="padding: 32px;"><p>Olá <strong>{{admin_nome}}</strong>,</p><p>A certidão <strong>{{certidao_tipo}}</strong> vence em <strong>{{dias_restantes}} dias</strong>.</p><div style="background: #fef9e5; border: 2px solid #fbbc04; border-radius: 12px; padding: 20px; margin: 24px 0;"><p style="margin: 4px 0;"><strong>Órgão:</strong> {{orgao_emissor}}</p><p style="margin: 4px 0;"><strong>Vencimento:</strong> {{data_vencimento}}</p></div><div style="text-align: center; margin: 32px 0;"><a href="{{link_renovar}}" style="background: #ea4335; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Renovar Agora</a></div></div></div></body></html>`
      },
      {
        tipo: 'ticket_criado',
        nome: 'Novo Ticket - ConectaClínica',
        categoria: 'admin',
        vars: ['atendente_nome', 'numero_ticket', 'assunto', 'prioridade', 'solicitante_nome', 'link_ticket', 'clinica_nome'],
        html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family: -apple-system, sans-serif; background: #f8f9fa; margin: 0; padding: 20px;"><div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden;"><div style="background: #7E57FF; padding: 30px; text-align: center;"><h1 style="color: white; margin: 0;">🎫 Novo Ticket</h1></div><div style="padding: 32px;"><p>Olá <strong>{{atendente_nome}}</strong>,</p><p>Um novo ticket foi atribuído a você:</p><div style="background: #f5f3ff; border: 2px solid #7E57FF; border-radius: 12px; padding: 20px; margin: 24px 0;"><p style="margin: 4px 0;"><strong>Nº:</strong> {{numero_ticket}}</p><p style="margin: 4px 0;"><strong>Assunto:</strong> {{assunto}}</p><p style="margin: 4px 0;"><strong>Prioridade:</strong> <span style="color: #ea4335; font-weight: bold;">{{prioridade}}</span></p><p style="margin: 4px 0;"><strong>Solicitante:</strong> {{solicitante_nome}}</p></div><div style="text-align: center; margin: 32px 0;"><a href="{{link_ticket}}" style="background: #7E57FF; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Ver Ticket</a></div></div></div></body></html>`
      }
    ];

    const criados = [];
    const errors = [];

    for (const tmpl of templates) {
      try {
        const existentes = await base44.asServiceRole.entities.TemplateSendGrid.filter({ tipo: tmpl.tipo });
        if (existentes.length > 0) {
          criados.push({ tipo: tmpl.tipo, status: 'existing', id: existentes[0].template_sendgrid_id });
          continue;
        }

        const createResponse = await fetch('https://api.sendgrid.com/v3/templates', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SENDGRID_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: tmpl.nome,
            generation: 'dynamic'
          })
        });

        if (!createResponse.ok) {
          throw new Error(await createResponse.text());
        }

        const templateData = await createResponse.json();
        const templateId = templateData.id;

        const versionResponse = await fetch(`https://api.sendgrid.com/v3/templates/${templateId}/versions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SENDGRID_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: 'v1',
            subject: `{{subject}}`,
            html_content: tmpl.html,
            active: 1
          })
        });

        if (!versionResponse.ok) {
          throw new Error(await versionResponse.text());
        }

        await base44.asServiceRole.entities.TemplateSendGrid.create({
          tipo: tmpl.tipo,
          nome: tmpl.nome,
          template_sendgrid_id: templateId,
          categoria: tmpl.categoria,
          variaveis: tmpl.vars,
          ativo: true,
          uso_count: 0
        });

        criados.push({ tipo: tmpl.tipo, status: 'created', id: templateId });

      } catch (error) {
        errors.push({ tipo: tmpl.tipo, error: error.message });
      }
    }

    return Response.json({
      success: true,
      criados: criados.length,
      errors: errors.length,
      detalhes: { criados, errors }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});