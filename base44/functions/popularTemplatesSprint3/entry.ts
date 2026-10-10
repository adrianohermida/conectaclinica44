import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * SPRINT 3: Popular 3 templates marketing/automação
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
        tipo: 'digest_agenda',
        nome: 'Digest Agenda Diário - ConectaClínica',
        categoria: 'clinic',
        vars: ['medico_nome', 'data', 'total_consultas', 'lista_consultas', 'clinica_nome'],
        html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family: -apple-system, sans-serif; background: #f8f9fa; margin: 0; padding: 20px;"><div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden;"><div style="background: #7E57FF; padding: 30px; text-align: center;"><h1 style="color: white; margin: 0;">📅 Sua Agenda Hoje</h1></div><div style="padding: 32px;"><p>Bom dia, <strong>{{medico_nome}}</strong>!</p><p>Você tem <strong>{{total_consultas}} consultas</strong> agendadas para <strong>{{data}}</strong>:</p><div style="background: #f5f3ff; border: 2px solid #7E57FF; border-radius: 12px; padding: 20px; margin: 24px 0;"><ul style="margin: 0; padding-left: 20px;">{{{lista_consultas}}}</ul></div><p style="color: #666; font-size: 13px;">Tenha um ótimo dia! 💜</p></div></div></body></html>`
      },
      {
        tipo: 'relatorio_semanal',
        nome: 'Relatório Semanal - ConectaClínica',
        categoria: 'admin',
        vars: ['admin_nome', 'clinica_nome', 'periodo', 'total_tickets', 'resolvidos', 'taxa_resolucao', 'tempo_medio', 'csat_medio'],
        html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family: -apple-system, sans-serif; background: #f8f9fa; margin: 0; padding: 20px;"><div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden;"><div style="background: #0B7A9E; padding: 30px; text-align: center;"><h1 style="color: white; margin: 0;">📊 Relatório Semanal</h1></div><div style="padding: 32px;"><p>Olá <strong>{{admin_nome}}</strong>,</p><p>Resumo do atendimento de <strong>{{periodo}}</strong>:</p><div style="background: #e0f2fe; border: 2px solid #0B7A9E; border-radius: 12px; padding: 20px; margin: 24px 0;"><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;"><div><p style="margin: 0; font-size: 32px; font-weight: bold; color: #0B7A9E;">{{total_tickets}}</p><p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">Total Tickets</p></div><div><p style="margin: 0; font-size: 32px; font-weight: bold; color: #34a853;">{{taxa_resolucao}}</p><p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">Taxa Resolução</p></div><div><p style="margin: 0; font-size: 24px; font-weight: bold; color: #7E57FF;">{{tempo_medio}}</p><p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">Tempo Médio</p></div><div><p style="margin: 0; font-size: 24px; font-weight: bold; color: #fbbc04;">{{csat_medio}}/5</p><p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">CSAT Médio</p></div></div></div></div></div></body></html>`
      },
      {
        tipo: 'campanha_marketing',
        nome: 'Campanha Marketing - ConectaClínica',
        categoria: 'admin',
        vars: ['titulo', 'conteudo', 'cta_texto', 'cta_link', 'clinica_nome'],
        html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family: -apple-system, sans-serif; background: #f8f9fa; margin: 0; padding: 20px;"><div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden;"><div style="background: linear-gradient(135deg, #7E57FF 0%, #9334e9 100%); padding: 40px; text-align: center;"><h1 style="color: white; margin: 0;">{{titulo}}</h1></div><div style="padding: 32px;">{{{conteudo}}}<div style="text-align: center; margin: 32px 0;"><a href="{{cta_link}}" style="background: #7E57FF; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">{{cta_texto}}</a></div></div></div></body></html>`
      },
      {
        tipo: 'alerta_estoque',
        nome: 'Alerta Estoque Baixo - ConectaClínica',
        categoria: 'admin',
        vars: ['admin_nome', 'clinica_nome', 'total_produtos_baixos', 'total_produtos_zerados', 'lista_produtos', 'data'],
        html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family: -apple-system, sans-serif; background: #f8f9fa; margin: 0; padding: 20px;"><div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden;"><div style="background: #ea4335; padding: 30px; text-align: center;"><h1 style="color: white; margin: 0;">⚠️ Estoque Crítico</h1></div><div style="padding: 32px;"><p>Olá <strong>{{admin_nome}}</strong>,</p><p>Produtos com estoque baixo ou zerado em <strong>{{clinica_nome}}</strong>:</p><div style="background: #fde7e7; border: 2px solid #ea4335; border-radius: 12px; padding: 20px; margin: 24px 0;"><p style="margin: 0 0 12px 0; font-weight: bold;">Total: {{total_produtos_baixos}} abaixo mínimo | {{total_produtos_zerados}} zerados</p><ul style="margin: 0; padding-left: 20px;">{{{lista_produtos}}}</ul></div><p style="color: #666; font-size: 12px;">Data: {{data}}</p></div></div></body></html>`
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