import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * CRÍTICO: Popular templates SendGrid (Sprint 1 desbloqueio)
 * Cria 8 templates via API + popula entity TemplateSendGrid
 * RODAR 1x APENAS para desbloquear emailService.js
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
        tipo: 'reset_senha',
        nome: 'Reset Senha - ConectaClínica',
        categoria: 'auth',
        vars: ['nome_usuario', 'link_reset', 'validade', 'email_usuario'],
        html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family: -apple-system, sans-serif; background: #f8f9fa; margin: 0; padding: 20px;"><div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden;"><div style="background: #7E57FF; padding: 30px; text-align: center;"><h1 style="color: white; margin: 0;">🔑 Recuperar Senha</h1></div><div style="padding: 32px;"><p>Olá <strong>{{nome_usuario}}</strong>,</p><p>Recebemos uma solicitação para redefinir sua senha.</p><div style="text-align: center; margin: 32px 0;"><a href="{{link_reset}}" style="background: #7E57FF; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Redefinir Senha</a></div><p style="color: #666; font-size: 13px;">⏱️ Este link expira em {{validade}}.</p><p style="color: #666; font-size: 13px;">Se você não solicitou, ignore este email.</p></div></div></body></html>`
      },
      {
        tipo: '2fa_codigo',
        nome: '2FA Código - ConectaClínica',
        categoria: 'auth',
        vars: ['nome_usuario', 'codigo', 'validade_minutos', 'email_usuario'],
        html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family: -apple-system, sans-serif; background: #f8f9fa; margin: 0; padding: 20px;"><div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden;"><div style="background: #7E57FF; padding: 30px; text-align: center;"><h1 style="color: white; margin: 0;">🔐 Código de Verificação</h1></div><div style="padding: 32px; text-align: center;"><p>Olá <strong>{{nome_usuario}}</strong>,</p><p>Seu código de verificação é:</p><div style="background: #f5f3ff; border: 3px solid #7E57FF; border-radius: 12px; padding: 24px; margin: 24px 0;"><p style="font-size: 48px; font-weight: bold; color: #7E57FF; margin: 0; letter-spacing: 8px; font-family: monospace;">{{codigo}}</p></div><p style="color: #666; font-size: 13px;">⏱️ Válido por {{validade_minutos}} minutos.</p></div></div></body></html>`
      },
      {
        tipo: 'pagamento_falhou',
        nome: 'Pagamento Falhou - ConectaClínica',
        categoria: 'billing',
        vars: ['nome_admin', 'clinica_nome', 'valor', 'metodo_falhou', 'link_atualizar', 'tentativa', 'data_falha'],
        html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family: -apple-system, sans-serif; background: #f8f9fa; margin: 0; padding: 20px;"><div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden;"><div style="background: #ea4335; padding: 30px; text-align: center;"><h1 style="color: white; margin: 0;">⚠️ Pagamento Não Processado</h1></div><div style="padding: 32px;"><p>Olá <strong>{{nome_admin}}</strong>,</p><p>Tentamos processar o pagamento de <strong>{{valor}}</strong> para <strong>{{clinica_nome}}</strong>, mas não foi possível.</p><div style="background: #fde7e7; border-left: 4px solid #ea4335; padding: 16px; margin: 24px 0;"><p style="margin: 0; font-size: 13px; color: #991b1b;"><strong>Método:</strong> {{metodo_falhou}}<br><strong>Tentativa:</strong> {{tentativa}}<br><strong>Data:</strong> {{data_falha}}</p></div><div style="text-align: center; margin: 32px 0;"><a href="{{link_atualizar}}" style="background: #ea4335; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Atualizar Método de Pagamento</a></div><p style="color: #666; font-size: 13px;">🚨 Atualize em até 7 dias para evitar suspensão.</p></div></div></body></html>`
      },
      {
        tipo: 'trial_expirando',
        nome: 'Trial Expirando - ConectaClínica',
        categoria: 'billing',
        vars: ['nome_admin', 'clinica_nome', 'dias_restantes', 'link_upgrade', 'planos_disponiveis'],
        html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family: -apple-system, sans-serif; background: #f8f9fa; margin: 0; padding: 20px;"><div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden;"><div style="background: #fbbc04; padding: 30px; text-align: center;"><h1 style="color: white; margin: 0;">⏰ Trial Expirando</h1></div><div style="padding: 32px;"><p>Olá <strong>{{nome_admin}}</strong>,</p><p>Seu período trial do <strong>{{clinica_nome}}</strong> expira em <strong>{{dias_restantes}} dias</strong>.</p><div style="text-align: center; margin: 32px 0;"><a href="{{link_upgrade}}" style="background: #34a853; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Ver Planos e Fazer Upgrade</a></div><p style="color: #666; font-size: 13px;">Planos: {{planos_disponiveis}}</p></div></div></body></html>`
      },
      {
        tipo: 'credito_baixo',
        nome: 'Crédito IA Baixo - ConectaClínica',
        categoria: 'billing',
        vars: ['nome_admin', 'clinica_nome', 'saldo_atual', 'percentual', 'dias_restantes', 'link_recarga', 'valor_recarga'],
        html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family: -apple-system, sans-serif; background: #f8f9fa; margin: 0; padding: 20px;"><div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden;"><div style="background: #fbbc04; padding: 30px; text-align: center;"><h1 style="color: white; margin: 0;">🪫 Créditos IA Baixos</h1></div><div style="padding: 32px;"><p>Olá <strong>{{nome_admin}}</strong>,</p><p>Os créditos IA da <strong>{{clinica_nome}}</strong> estão acabando.</p><div style="background: #fef9e5; border: 2px solid #fbbc04; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;"><p style="font-size: 36px; font-weight: bold; color: #854d0e; margin: 0;">{{saldo_atual}} créditos</p><p style="color: #7f1d1d; margin: 8px 0 0 0; font-size: 14px;">{{percentual}}% restante • ~{{dias_restantes}} dias</p></div><div style="text-align: center; margin: 32px 0;"><a href="{{link_recarga}}" style="background: #7E57FF; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Recarregar Agora - {{valor_recarga}}</a></div></div></div></body></html>`
      },
      {
        tipo: 'lembrete_consulta',
        nome: 'Lembrete Consulta - ConectaClínica',
        categoria: 'clinic',
        vars: ['paciente_nome', 'data', 'horario', 'medico', 'especialidade', 'tipo_consulta', 'endereco_clinica', 'telefone_clinica', 'clinica_nome', 'observacoes'],
        html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family: -apple-system, sans-serif; background: #f8f9fa; margin: 0; padding: 20px;"><div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden;"><div style="background: #34a853; padding: 30px; text-align: center;"><h1 style="color: white; margin: 0;">📅 Lembrete de Consulta</h1></div><div style="padding: 32px;"><p>Olá <strong>{{paciente_nome}}</strong>,</p><p>Lembramos sua consulta amanhã:</p><div style="background: #e6f7ed; border: 2px solid #34a853; border-radius: 12px; padding: 20px; margin: 24px 0;"><p style="margin: 4px 0;"><strong>📅 Data:</strong> {{data}}</p><p style="margin: 4px 0;"><strong>🕐 Horário:</strong> {{horario}}</p><p style="margin: 4px 0;"><strong>👨‍⚕️ Médico:</strong> {{medico}} - {{especialidade}}</p><p style="margin: 4px 0;"><strong>📍 Tipo:</strong> {{tipo_consulta}}</p></div><p style="color: #666; font-size: 13px;"><strong>Local:</strong> {{endereco_clinica}}<br><strong>Telefone:</strong> {{telefone_clinica}}</p><p style="color: #666; font-size: 12px; margin-top: 20px;">{{observacoes}}</p></div></div></body></html>`
      },
      {
        tipo: 'convite_equipe',
        nome: 'Convite Equipe - ConectaClínica',
        categoria: 'admin',
        vars: ['clinica_nome', 'perfil_nome', 'perfil_atribuido', 'link_aceite', 'validade_horas', 'nome_convidador'],
        html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family: -apple-system, sans-serif; background: #f8f9fa; margin: 0; padding: 20px;"><div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden;"><div style="background: #7E57FF; padding: 30px; text-align: center;"><h1 style="color: white; margin: 0;">👥 Convite para Equipe</h1></div><div style="padding: 32px;"><p>Você foi convidado(a) para fazer parte da equipe da <strong>{{clinica_nome}}</strong>.</p><div style="background: #f5f3ff; border: 2px solid #7E57FF; border-radius: 12px; padding: 20px; margin: 24px 0;"><p style="margin: 0;"><strong>Perfil:</strong> {{perfil_nome}}</p><p style="margin: 8px 0 0 0; color: #666; font-size: 13px;">Convidado por: {{nome_convidador}}</p></div><div style="text-align: center; margin: 32px 0;"><a href="{{link_aceite}}" style="background: #7E57FF; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Aceitar Convite</a></div><p style="color: #666; font-size: 13px;">⏱️ Convite válido por {{validade_horas}} horas.</p></div></div></body></html>`
      },
      {
        tipo: 'link_telemedicina',
        nome: 'Link Telemedicina - ConectaClínica',
        categoria: 'clinic',
        vars: ['paciente_nome', 'data', 'horario', 'medico', 'especialidade', 'link_sala', 'clinica_nome', 'instrucoes'],
        html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family: -apple-system, sans-serif; background: #f8f9fa; margin: 0; padding: 20px;"><div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden;"><div style="background: #0B7A9E; padding: 30px; text-align: center;"><h1 style="color: white; margin: 0;">🎥 Telemedicina</h1></div><div style="padding: 32px;"><p>Olá <strong>{{paciente_nome}}</strong>,</p><p>Sua consulta online está próxima:</p><div style="background: #e0f2fe; border: 2px solid #0B7A9E; border-radius: 12px; padding: 20px; margin: 24px 0;"><p style="margin: 4px 0;"><strong>📅 Data:</strong> {{data}} às {{horario}}</p><p style="margin: 4px 0;"><strong>👨‍⚕️ Médico:</strong> {{medico}}</p></div><div style="text-align: center; margin: 32px 0;"><a href="{{link_sala}}" style="background: #0B7A9E; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">🎥 Entrar na Sala</a></div><p style="color: #666; font-size: 13px;">{{instrucoes}}</p></div></div></body></html>`
      }
    ];

    const criados = [];
    const errors = [];

    for (const tmpl of templates) {
      try {
        // Verificar se já existe
        const existentes = await base44.asServiceRole.entities.TemplateSendGrid.filter({ tipo: tmpl.tipo });
        if (existentes.length > 0) {
          console.log(`[PopularTemplates] Template ${tmpl.tipo} já existe, skip`);
          criados.push({ tipo: tmpl.tipo, status: 'existing', id: existentes[0].template_sendgrid_id });
          continue;
        }

        // Criar template no SendGrid via API
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

        // Criar versão com HTML
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

        // Popular entity TemplateSendGrid
        await base44.asServiceRole.entities.TemplateSendGrid.create({
          tipo: tmpl.tipo,
          nome: tmpl.nome,
          template_sendgrid_id: templateId,
          categoria: tmpl.categoria,
          variaveis: tmpl.vars,
          ativo: true,
          uso_count: 0
        });

        console.log(`[PopularTemplates] ✅ Template ${tmpl.tipo} criado: ${templateId}`);
        criados.push({ tipo: tmpl.tipo, status: 'created', id: templateId });

      } catch (error) {
        console.error(`[PopularTemplates] ❌ Erro ${tmpl.tipo}:`, error);
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
    console.error('[PopularTemplates] Erro fatal:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});