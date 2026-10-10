import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * SPRINT 2: Popular 5 templates financeiro/clínico
 * Cobrança, Vencimento, Prontuário, Exame, Receita Digital
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Apenas SuperAdmin' }, { status: 401 });
    }

    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
    if (!SENDGRID_API_KEY) {
      return Response.json({ error: 'SENDGRID_API_KEY não configurada' }, { status: 400 });
    }

    const templates = [
      {
        tipo: 'cobranca',
        nome: 'Cobrança - ConectaClínica',
        categoria: 'billing',
        vars: ['paciente_nome', 'clinica_nome', 'valor', 'vencimento', 'descricao', 'link_pagamento', 'parcela'],
        html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family: -apple-system, sans-serif; background: #f8f9fa; margin: 0; padding: 20px;"><div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden;"><div style="background: #7E57FF; padding: 30px; text-align: center;"><h1 style="color: white; margin: 0;">💰 Cobrança</h1></div><div style="padding: 32px;"><p>Olá <strong>{{paciente_nome}}</strong>,</p><p>Enviamos a cobrança referente a: <strong>{{descricao}}</strong></p><div style="background: #f5f3ff; border: 2px solid #7E57FF; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;"><p style="font-size: 36px; font-weight: bold; color: #7E57FF; margin: 0;">{{valor}}</p><p style="margin: 8px 0 0 0; color: #666;">Vencimento: {{vencimento}}</p><p style="margin: 4px 0 0 0; color: #999; font-size: 12px;">Parcela: {{parcela}}</p></div><div style="text-align: center; margin: 32px 0;"><a href="{{link_pagamento}}" style="background: #34a853; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Pagar Agora</a></div></div></div></body></html>`
      },
      {
        tipo: 'alerta_vencimento',
        nome: 'Alerta Vencimento - ConectaClínica',
        categoria: 'billing',
        vars: ['paciente_nome', 'clinica_nome', 'valor', 'vencimento', 'descricao', 'link_pagamento', 'dias_restantes'],
        html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family: -apple-system, sans-serif; background: #f8f9fa; margin: 0; padding: 20px;"><div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden;"><div style="background: #fbbc04; padding: 30px; text-align: center;"><h1 style="color: white; margin: 0;">⏰ Vencimento Próximo</h1></div><div style="padding: 32px;"><p>Olá <strong>{{paciente_nome}}</strong>,</p><p>Lembramos que você tem um pagamento vencendo em <strong>{{dias_restantes}} dias</strong>.</p><div style="background: #fef9e5; border: 2px solid #fbbc04; border-radius: 12px; padding: 20px; margin: 24px 0;"><p style="margin: 4px 0;"><strong>Valor:</strong> {{valor}}</p><p style="margin: 4px 0;"><strong>Vencimento:</strong> {{vencimento}}</p><p style="margin: 4px 0;"><strong>Descrição:</strong> {{descricao}}</p></div><div style="text-align: center; margin: 32px 0;"><a href="{{link_pagamento}}" style="background: #34a853; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Pagar Agora</a></div></div></div></body></html>`
      },
      {
        tipo: 'prontuario_pronto',
        nome: 'Prontuário Pronto - ConectaClínica',
        categoria: 'clinic',
        vars: ['paciente_nome', 'clinica_nome', 'medico_nome', 'data_consulta', 'resumo', 'link_portal'],
        html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family: -apple-system, sans-serif; background: #f8f9fa; margin: 0; padding: 20px;"><div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden;"><div style="background: #34a853; padding: 30px; text-align: center;"><h1 style="color: white; margin: 0;">✅ Prontuário Disponível</h1></div><div style="padding: 32px;"><p>Olá <strong>{{paciente_nome}}</strong>,</p><p>Seu prontuário da consulta com <strong>{{medico_nome}}</strong> está disponível.</p><div style="background: #e6f7ed; border: 2px solid #34a853; border-radius: 12px; padding: 20px; margin: 24px 0;"><p style="margin: 4px 0;"><strong>Data:</strong> {{data_consulta}}</p><p style="margin: 12px 0 0 0; color: #666; font-size: 14px;">{{resumo}}</p></div><div style="text-align: center; margin: 32px 0;"><a href="{{link_portal}}" style="background: #7E57FF; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Visualizar Prontuário</a></div></div></div></body></html>`
      },
      {
        tipo: 'exame_anexado',
        nome: 'Exame Anexado - ConectaClínica',
        categoria: 'clinic',
        vars: ['paciente_nome', 'clinica_nome', 'documento_tipo', 'documento_nome', 'data', 'link_visualizar'],
        html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family: -apple-system, sans-serif; background: #f8f9fa; margin: 0; padding: 20px;"><div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden;"><div style="background: #0B7A9E; padding: 30px; text-align: center;"><h1 style="color: white; margin: 0;">📄 Novo {{documento_tipo}}</h1></div><div style="padding: 32px;"><p>Olá <strong>{{paciente_nome}}</strong>,</p><p>Um novo documento foi anexado ao seu prontuário.</p><div style="background: #e0f2fe; border: 2px solid #0B7A9E; border-radius: 12px; padding: 20px; margin: 24px 0;"><p style="margin: 4px 0;"><strong>Tipo:</strong> {{documento_tipo}}</p><p style="margin: 4px 0;"><strong>Nome:</strong> {{documento_nome}}</p><p style="margin: 4px 0;"><strong>Data:</strong> {{data}}</p></div><div style="text-align: center; margin: 32px 0;"><a href="{{link_visualizar}}" style="background: #0B7A9E; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Visualizar Documento</a></div></div></div></body></html>`
      },
      {
        tipo: 'receita_digital',
        nome: 'Receita Digital - ConectaClínica',
        categoria: 'clinic',
        vars: ['paciente_nome', 'clinica_nome', 'medico_nome', 'crm', 'data_prescricao', 'medicamentos', 'orientacoes', 'validade_dias', 'qr_code_url', 'link_validacao'],
        html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family: -apple-system, sans-serif; background: #f8f9fa; margin: 0; padding: 20px;"><div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden;"><div style="background: #7E57FF; padding: 30px; text-align: center;"><h1 style="color: white; margin: 0;">💊 Receita Digital</h1></div><div style="padding: 32px;"><p>Olá <strong>{{paciente_nome}}</strong>,</p><p>Sua receita digital foi emitida por <strong>{{medico_nome}}</strong> ({{crm}}).</p><div style="background: #f5f3ff; border: 2px solid #7E57FF; border-radius: 12px; padding: 20px; margin: 24px 0;"><p style="margin: 4px 0;"><strong>Data:</strong> {{data_prescricao}}</p><p style="margin: 12px 0 8px 0; font-size: 14px; font-weight: bold;">Medicamentos:</p><div style="font-size: 13px; color: #666;">{{{medicamentos}}}</div><p style="margin: 12px 0 8px 0; font-size: 14px; font-weight: bold;">Orientações:</p><p style="font-size: 13px; color: #666; margin: 0;">{{orientacoes}}</p></div><div style="text-align: center; margin: 24px 0;"><img src="{{qr_code_url}}" alt="QR Code Validação" style="width: 150px; height: 150px;"><p style="font-size: 11px; color: #999; margin: 8px 0 0 0;">Valide em: <a href="{{link_validacao}}" style="color: #7E57FF;">{{link_validacao}}</a></p><p style="font-size: 11px; color: #999; margin: 4px 0 0 0;">Válido por {{validade_dias}} dias</p></div></div></div></body></html>`
      },
      {
        tipo: 'colaboracao_mencionado',
        nome: 'Colaboração Médica - ConectaClínica',
        categoria: 'clinic',
        vars: ['medico_nome', 'autor_nome', 'tipo_colaboracao', 'paciente_nome', 'mensagem_resumo', 'link_discussao', 'clinica_nome'],
        html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family: -apple-system, sans-serif; background: #f8f9fa; margin: 0; padding: 20px;"><div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden;"><div style="background: #0B7A9E; padding: 30px; text-align: center;"><h1 style="color: white; margin: 0;">👥 Você foi mencionado</h1></div><div style="padding: 32px;"><p>Olá <strong>{{medico_nome}}</strong>,</p><p><strong>{{autor_nome}}</strong> mencionou você em: <strong>{{tipo_colaboracao}}</strong></p><div style="background: #e0f2fe; border: 2px solid #0B7A9E; border-radius: 12px; padding: 20px; margin: 24px 0;"><p style="margin: 4px 0;"><strong>Paciente:</strong> {{paciente_nome}}</p><p style="margin: 12px 0 0 0; color: #666; font-size: 14px;">{{mensagem_resumo}}</p></div><div style="text-align: center; margin: 32px 0;"><a href="{{link_discussao}}" style="background: #0B7A9E; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Ver Discussão</a></div></div></div></body></html>`
      }
    ];

    const criados = [];
    const errors = [];

    for (const tmpl of templates) {
      try {
        const existentes = await base44.asServiceRole.entities.TemplateSendGrid.filter({ tipo: tmpl.tipo });
        if (existentes.length > 0) {
          console.log(`[PopularSprint2] Template ${tmpl.tipo} já existe`);
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
          throw new Error(`SendGrid create failed: ${await createResponse.text()}`);
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
          throw new Error(`Version create failed: ${await versionResponse.text()}`);
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

        console.log(`[PopularSprint2] ✅ ${tmpl.tipo}: ${templateId}`);
        criados.push({ tipo: tmpl.tipo, status: 'created', id: templateId });

      } catch (error) {
        console.error(`[PopularSprint2] ❌ ${tmpl.tipo}:`, error);
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
    console.error('[PopularSprint2] Erro fatal:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});