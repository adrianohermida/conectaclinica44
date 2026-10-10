import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * AUTO-CONFIGURA webhook SendGrid na primeira execução
 * CRÍTICO LGPD: Sem webhook = sem tracking = sem unsubscribe = ilegal
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

    // FIX: URL webhook correta
    const webhookUrl = 'https://conectaclinica.com.br/functions/sendgridWebhook';

    // 1. Verificar webhook atual
    const statusRes = await fetch('https://api.sendgrid.com/v3/user/webhooks/event/settings', {
      headers: { 'Authorization': `Bearer ${SENDGRID_API_KEY}` }
    });
    
    if (!statusRes.ok) {
      throw new Error(`SendGrid API falhou: ${await statusRes.text()}`);
    }
    
    const currentSettings = await statusRes.json();
    
    if (currentSettings.enabled && currentSettings.url === webhookUrl) {
      return Response.json({ 
        success: true, 
        message: 'Webhook já configurado',
        url: webhookUrl,
        unsubscribe_groups_criados: 0
      });
    }

    // 2. Configurar webhook (auto-enable ALL events)
    const configRes = await fetch('https://api.sendgrid.com/v3/user/webhooks/event/settings', {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        enabled: true,
        url: webhookUrl,
        delivered: true,
        open: true,
        click: true,
        bounce: true,
        dropped: true,
        spam_report: true,
        unsubscribe: true,
        group_unsubscribe: true,
        group_resubscribe: true,
        processed: true,
        deferred: true
      })
    });

    if (!configRes.ok) {
      throw new Error(`SendGrid API error: ${await configRes.text()}`);
    }

    const result = await configRes.json();

    // 3. Criar unsubscribe groups se não existirem
    const groupsRes = await fetch('https://api.sendgrid.com/v3/asm/groups', {
      headers: { 'Authorization': `Bearer ${SENDGRID_API_KEY}` }
    });
    
    if (!groupsRes.ok) {
      throw new Error(`Erro ao buscar groups: ${await groupsRes.text()}`);
    }
    
    const existingGroups = await groupsRes.json();
    const groupNames = Array.isArray(existingGroups) ? existingGroups.map(g => g.name) : [];

    const groupsToCreate = [
      { name: 'Marketing e Campanhas', description: 'Emails promocionais e newsletters (LGPD Art. 7, V)' },
      { name: 'Alertas Operacionais', description: 'Lembretes consultas e vencimentos (base legítimo interesse)' },
      { name: 'Compliance e Segurança', description: 'Termos LGPD e certidões (obrigação legal Art. 7, II)' }
    ].filter(g => !groupNames.includes(g.name));

    const groupsCreated = [];
    for (const group of groupsToCreate) {
      const createRes = await fetch('https://api.sendgrid.com/v3/asm/groups', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(group)
      });
      
      if (createRes.ok) {
        const created = await createRes.json();
        groupsCreated.push({ nome: group.name, id: created.id });
      }
    }

    return Response.json({
      success: true,
      webhook_configurado: true,
      webhook_url: webhookUrl,
      unsubscribe_groups_criados: groupsCreated.length,
      groups: groupsCreated,
      message: 'Webhook + Unsubscribe Groups configurados automaticamente'
    });

  } catch (error) {
    console.error('[autoConfigurarWebhook] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});