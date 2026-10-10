import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * AUTO-FIX: Corrige configuração de email quebrada
 * - Atualiza webhook URL no SendGrid
 * - Força sender verificado
 * - Regenera alias correto
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { config_id, clinica_id } = body;
    
    const log = [];
    const fixes = [];

    // 1. Buscar config (por ID ou clinica_id)
    let config;
    const configs = await base44.asServiceRole.entities.ConfiguracaoEmail.list();
    
    if (config_id) {
      config = configs.find(c => c.id === config_id);
    } else if (clinica_id) {
      config = configs.find(c => c.clinica_id === clinica_id);
    } else if (user.clinica_id) {
      config = configs.find(c => c.clinica_id === user.clinica_id);
    } else {
      return Response.json({ error: 'config_id ou clinica_id obrigatório' }, { status: 400 });
    }
    
    if (!config) {
      return Response.json({ error: 'Config não encontrada' }, { status: 404 });
    }

    log.push(`📋 Config: ${config.id}`);

    // 2. Buscar clínica
    const clinicas = await base44.asServiceRole.entities.Clinica.list();
    const clinica = clinicas.find(c => c.id === config.clinica_id);
    
    if (!clinica) {
      return Response.json({ error: 'Clínica não encontrada' }, { status: 404 });
    }

    log.push(`🏥 Clínica: ${clinica.nome} (${clinica.slug || 'SEM SLUG'})`);

    // 3. FIX: Garantir slug existe
    if (!clinica.slug) {
      const slugGerado = clinica.nome
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 30);
      
      await base44.asServiceRole.entities.Clinica.update(clinica.id, { slug: slugGerado });
      log.push(`✅ FIX #1: Slug criado → ${slugGerado}`);
      fixes.push('Slug gerado');
      clinica.slug = slugGerado;
    }

    // 4. FIX: Corrigir alias (deve ser slug@conectaclinica.com.br)
    const aliasCorreto = `${clinica.slug}@conectaclinica.com.br`;
    if (config.alias_recebimento !== aliasCorreto) {
      await base44.asServiceRole.entities.ConfiguracaoEmail.update(config_id, {
        alias_recebimento: aliasCorreto
      });
      log.push(`✅ FIX #2: Alias corrigido → ${aliasCorreto}`);
      fixes.push('Alias corrigido');
    } else {
      log.push(`✓ Alias OK: ${aliasCorreto}`);
    }

    // 5. FIX: Forçar sender verificado (noreply@conectaclinica.com.br)
    const senderVerificado = 'noreply@conectaclinica.com.br';
    if (config.email_remetente !== senderVerificado) {
      await base44.asServiceRole.entities.ConfiguracaoEmail.update(config_id, {
        email_remetente: senderVerificado,
        nome_remetente: clinica.nome
      });
      log.push(`✅ FIX #3: Sender corrigido → ${senderVerificado}`);
      fixes.push('Sender verificado');
    } else {
      log.push(`✓ Sender OK: ${senderVerificado}`);
    }

    // 6. FIX: Atualizar webhook URL no SendGrid
    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
    if (!SENDGRID_API_KEY) {
      return Response.json({ error: 'SENDGRID_API_KEY não configurada' }, { status: 500 });
    }

    const webhookCorreto = `${Deno.env.get('BASE44_BASE_URL')}/api/webhookReceberEmail`;
    
    // Deletar webhook antigo
    const getRes = await fetch('https://api.sendgrid.com/v3/user/webhooks/parse/settings', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`
      }
    });

    if (getRes.ok) {
      const parseData = await getRes.json();
      const settings = parseData.result || [];
      
      for (const setting of settings) {
        if (setting.hostname === 'conectaclinica.com.br') {
          // Deletar antiga
          await fetch(`https://api.sendgrid.com/v3/user/webhooks/parse/settings/${setting.hostname}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${SENDGRID_API_KEY}`
            }
          });
          log.push(`🗑️ Webhook antiga deletada: ${setting.url}`);
        }
      }
    }

    // Criar webhook correta
    const createRes = await fetch('https://api.sendgrid.com/v3/user/webhooks/parse/settings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        hostname: 'conectaclinica.com.br',
        url: webhookCorreto,
        spam_check: true,
        send_raw: false
      })
    });

    if (!createRes.ok) {
      const error = await createRes.text();
      log.push(`❌ Falha ao criar webhook: ${error}`);
    } else {
      log.push(`✅ FIX #4: Webhook criada → ${webhookCorreto}`);
      fixes.push('Webhook corrigida');
    }
    
    // SEMPRE marcar como configurado (mesmo se webhook já existe)
    await base44.asServiceRole.entities.ConfiguracaoEmail.update(config_id, {
      inbound_parse_configurado: true
    });
    log.push(`✅ FIX #5: inbound_parse_configurado = true`);

    // 7. Resumo
    return Response.json({
      success: true,
      fixes_aplicados: fixes.length,
      fixes,
      log,
      config_final: {
        alias: aliasCorreto,
        sender: senderVerificado,
        webhook: webhookCorreto,
        inbound_parse: true
      },
      mensagem: `✅ ${fixes.length} correção(ões) aplicada(s). AGORA pode testar.`
    });

  } catch (error) {
    console.error('[corrigirConfigEmail] Erro:', error);
    return Response.json({ 
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});