import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * CRÍTICO LGPD: Adiciona unsubscribe group_id nos 21 templates
 * CAN-SPAM + LGPD Art. 18 = link opt-out OBRIGATÓRIO
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Apenas admin' }, { status: 401 });
    }

    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
    if (!SENDGRID_API_KEY) {
      return Response.json({ error: 'SENDGRID_API_KEY não configurada' }, { status: 400 });
    }

    // 1. Buscar unsubscribe groups
    const groupsRes = await fetch('https://api.sendgrid.com/v3/asm/groups', {
      headers: { 'Authorization': `Bearer ${SENDGRID_API_KEY}` }
    });
    
    if (!groupsRes.ok) {
      throw new Error(`Erro ao buscar groups: ${await groupsRes.text()}`);
    }
    
    const groups = await groupsRes.json();

    const marketingGroup = groups.find(g => g.name.includes('Marketing'));
    const alertasGroup = groups.find(g => g.name.includes('Alertas'));
    const complianceGroup = groups.find(g => g.name.includes('Compliance'));

    if (!marketingGroup || !alertasGroup || !complianceGroup) {
      return Response.json({ 
        error: 'Execute autoConfigurarWebhookSendGrid primeiro para criar groups'
      }, { status: 400 });
    }

    // 2. Mapear templates para groups
    const templateGroupMap = {
      'marketing': marketingGroup.id,
      'alertas': alertasGroup.id,
      'compliance': complianceGroup.id
    };

    const templates = await base44.asServiceRole.entities.TemplateSendGrid.list();

    const categoriasMap = {
      'auth': 'compliance',
      'billing': 'alertas',
      'clinic': 'alertas',
      'admin': 'compliance'
    };

    // 3. Update cada template no SendGrid
    const updated = [];
    const erros = [];

    for (const template of templates) {
      try {
        const categoria = categoriasMap[template.categoria] || 'alertas';
        const groupId = templateGroupMap[categoria];

        // Fetch template atual
        const getRes = await fetch(`https://api.sendgrid.com/v3/templates/${template.template_sendgrid_id}`, {
          headers: { 'Authorization': `Bearer ${SENDGRID_API_KEY}` }
        });

        if (!getRes.ok) continue;

        const templateData = await getRes.json();
        const activeVersion = templateData.versions?.find(v => v.active);

        if (!activeVersion) continue;

        // Update version com unsubscribe group
        const updateRes = await fetch(
          `https://api.sendgrid.com/v3/templates/${template.template_sendgrid_id}/versions/${activeVersion.id}`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${SENDGRID_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              ...activeVersion,
              tracking_settings: {
                click_tracking: { enable: true },
                open_tracking: { enable: true },
                subscription_tracking: {
                  enable: true,
                  substitution_tag: '[unsubscribe]'
                }
              },
              editor: 'code',
              test_data: activeVersion.test_data || {},
              // Inject unsubscribe footer se não existir
              html_content: activeVersion.html_content?.includes('[unsubscribe]') 
                ? activeVersion.html_content
                : activeVersion.html_content + `
                  <div style="margin-top:40px;padding:20px;background:#f5f5f5;text-align:center;font-size:11px;color:#666">
                    <p>Você está recebendo este email de <strong>{{clinica_nome}}</strong></p>
                    <p style="margin-top:8px">
                      <a href="[unsubscribe]" style="color:#7E57FF;text-decoration:underline">
                        Cancelar inscrição
                      </a> | 
                      <a href="https://conectaclinica.com.br/PoliticaPrivacidade" style="color:#7E57FF;text-decoration:underline">
                        Política de Privacidade
                      </a>
                    </p>
                    <p style="margin-top:8px;font-size:10px">
                      ConectaClínica - Gestão Médica Inteligente
                    </p>
                  </div>
                `
            })
          }
        );

        if (updateRes.ok) {
          updated.push(template.nome);
        } else {
          erros.push({ template: template.nome, erro: await updateRes.text() });
        }

      } catch (error) {
        erros.push({ template: template.nome, erro: error.message });
      }
    }

    return Response.json({
      success: true,
      templates_atualizados: updated.length,
      templates_com_erro: erros.length,
      detalhes: { updated, erros },
      unsubscribe_groups: {
        marketing: marketingGroup.id,
        alertas: alertasGroup.id,
        compliance: complianceGroup.id
      }
    });

  } catch (error) {
    console.error('[adicionarUnsubscribe] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});