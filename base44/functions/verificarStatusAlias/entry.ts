import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Verifica status de configuração de alias de email
 * Útil para debug e troubleshooting
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { alias } = await req.json();

    if (!alias) {
      return Response.json({ 
        error: 'alias é obrigatório',
        exemplo: { alias: 'prevenclin@conectaclinica.com.br' }
      }, { status: 400 });
    }

    // Buscar configuração
    const configs = await base44.asServiceRole.entities.ConfiguracaoEmail.filter({
      alias_recebimento: alias
    });

    if (configs.length === 0) {
      return Response.json({
        status: 'NOT_CONFIGURED',
        mensagem: `Alias ${alias} não está configurado`,
        solucao: 'Execute /configurarAliasSendGrid para criar configuração'
      });
    }

    const config = configs[0];

    // Buscar clínica
    const clinicas = await base44.asServiceRole.entities.Clinica.filter({ id: config.clinica_id });

    // Buscar tickets criados via este alias
    const tickets = await base44.asServiceRole.entities.Ticket.filter({
      clinica_id: config.clinica_id,
      canal: 'email'
    }, '-created_date', 10);

    // Verificar SendGrid Inbound Parse
    const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');
    let sendgridStatus = { configurado: false };

    if (sendgridApiKey) {
      try {
        const inboundResponse = await fetch('https://api.sendgrid.com/v3/user/webhooks/parse/settings', {
          headers: {
            'Authorization': `Bearer ${sendgridApiKey}`,
            'Content-Type': 'application/json'
          }
        });

        const inboundConfigs = await inboundResponse.json();
        const webhookUrl = `${new URL(req.url).origin}/receberEmailWebhook`;
        
        const configEncontrada = inboundConfigs.result?.find(c => 
          c.url === webhookUrl && c.hostname === 'conectaclinica.com.br'
        );

        sendgridStatus = {
          configurado: !!configEncontrada,
          webhook_url: webhookUrl,
          hostname: configEncontrada?.hostname || null,
          spam_check_enabled: configEncontrada?.spam_check || null,
          todas_configs: inboundConfigs.result || []
        };
      } catch (sgError) {
        sendgridStatus.erro = sgError.message;
      }
    }

    // DNS Check (simulado - requer verificação manual)
    const dnsCheck = {
      verificacao_manual_necessaria: true,
      instrucao: 'Execute: dig MX conectaclinica.com.br',
      esperado: 'mx.sendgrid.net',
      prioridade: 10
    };

    return Response.json({
      status: 'CONFIGURED',
      config: {
        id: config.id,
        clinica_id: config.clinica_id,
        clinica_nome: clinicas[0]?.nome || 'N/A',
        alias_recebimento: config.alias_recebimento,
        ativo: config.ativo,
        provedor: config.provedor,
        email_remetente: config.email_remetente,
        nome_remetente: config.nome_remetente
      },
      sendgrid: sendgridStatus,
      dns: dnsCheck,
      tickets_recentes: tickets.map(t => ({
        numero: t.numero_ticket,
        assunto: t.assunto,
        solicitante: t.solicitante_email,
        data: t.created_date,
        status: t.status
      })),
      total_tickets_email: tickets.length,
      webhook_endpoint: `${new URL(req.url).origin}/receberEmailWebhook`,
      diagnostico: {
        config_ativa: config.ativo,
        clinica_valida: clinicas.length > 0,
        sendgrid_configurado: sendgridStatus.configurado,
        tickets_recebidos: tickets.length > 0
      }
    });

  } catch (error) {
    console.error('[VERIFICAR_ALIAS]', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});