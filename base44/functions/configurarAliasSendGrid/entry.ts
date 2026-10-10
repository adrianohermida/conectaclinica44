import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Configura alias de recebimento no SendGrid Inbound Parse
 * 
 * PASSO A PASSO:
 * 1. Configure DNS: Adicionar MX record apontando para SendGrid
 *    Domínio: conectaclinica.com.br
 *    MX Record: mx.sendgrid.net (prioridade 10)
 * 
 * 2. No SendGrid Dashboard:
 *    Settings > Inbound Parse > Add Host & URL
 *    - Domain: conectaclinica.com.br
 *    - Subdomain: (deixar vazio para receber @conectaclinica.com.br)
 *    - Destination URL: https://[APP_URL]/receberEmailWebhook
 *    - Spam Check: Enabled
 *    - Send Raw: Disabled
 * 
 * 3. Criar ConfiguracaoEmail com alias_recebimento único
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { clinica_id, alias } = await req.json();

    if (!clinica_id || !alias) {
      return Response.json({ 
        error: 'clinica_id e alias são obrigatórios',
        exemplo: { clinica_id: 'uuid', alias: 'prevenclin@conectaclinica.com.br' }
      }, { status: 400 });
    }

    // Validar que clínica existe
    const clinicas = await base44.asServiceRole.entities.Clinica.filter({ id: clinica_id });
    if (clinicas.length === 0) {
      return Response.json({ error: 'Clínica não encontrada' }, { status: 404 });
    }

    // Verificar se alias já existe
    const existentes = await base44.asServiceRole.entities.ConfiguracaoEmail.filter({
      alias_recebimento: alias
    });

    if (existentes.length > 0) {
      return Response.json({ 
        error: 'Alias já existe',
        config_existente: existentes[0]
      }, { status: 409 });
    }

    // Criar ou atualizar ConfiguracaoEmail
    const configsClinica = await base44.asServiceRole.entities.ConfiguracaoEmail.filter({
      clinica_id
    });

    let config;
    if (configsClinica.length > 0) {
      // Atualizar existente
      config = await base44.asServiceRole.entities.ConfiguracaoEmail.update(configsClinica[0].id, {
        alias_recebimento: alias,
        ativo: true,
        provedor: 'sendgrid',
        usar_email_builtin: false
      });
    } else {
      // Criar nova
      config = await base44.asServiceRole.entities.ConfiguracaoEmail.create({
        clinica_id,
        alias_recebimento: alias,
        ativo: true,
        provedor: 'sendgrid',
        usar_email_builtin: false,
        email_remetente: alias,
        nome_remetente: clinicas[0].nome
      });
    }

    // Testar configuração SendGrid (verificar DNS)
    const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');
    if (!sendgridApiKey) {
      return Response.json({
        success: true,
        config,
        warning: 'SENDGRID_API_KEY não configurada - configure DNS manualmente'
      });
    }

    // Verificar configuração Inbound Parse
    const inboundParseResponse = await fetch('https://api.sendgrid.com/v3/user/webhooks/parse/settings', {
      headers: {
        'Authorization': `Bearer ${sendgridApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const inboundConfigs = await inboundParseResponse.json();

    // Construir URL do webhook
    const webhookUrl = `${new URL(req.url).origin}/receberEmailWebhook`;

    return Response.json({
      success: true,
      config,
      clinica: clinicas[0].nome,
      alias,
      webhook_url: webhookUrl,
      instrucoes: {
        passo_1_dns: {
          descricao: 'Configure MX record no seu DNS',
          tipo: 'MX',
          nome: 'conectaclinica.com.br',
          valor: 'mx.sendgrid.net',
          prioridade: 10,
          ttl: 3600
        },
        passo_2_sendgrid: {
          descricao: 'Configure Inbound Parse no SendGrid Dashboard',
          url_dashboard: 'https://app.sendgrid.com/settings/parse',
          domain: 'conectaclinica.com.br',
          subdomain: '(vazio)',
          destination_url: webhookUrl,
          spam_check: true,
          send_raw: false
        },
        passo_3_teste: {
          descricao: 'Envie um email teste',
          para: alias,
          de: 'seu_email@gmail.com',
          assunto: 'Teste de recebimento',
          corpo: 'Este é um teste'
        }
      },
      inbound_parse_configs_existentes: inboundConfigs
    });

  } catch (error) {
    console.error('[CONFIGURAR_ALIAS]', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});