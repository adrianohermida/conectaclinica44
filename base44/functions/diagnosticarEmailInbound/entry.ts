import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * DIAGNÓSTICO BRUTAL: Email Inbound não chega na caixa
 * CRÍTICO: Identifica exatamente onde o fluxo quebra
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.clinica_id && user?.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clinica_id } = await req.json();
    const targetClinicaId = clinica_id || user.clinica_id;

    console.log('[DIAGNÓSTICO] 🔍 Clínica:', targetClinicaId);

    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');

    // 1. BUSCAR CONFIGURAÇÃO EMAIL DA CLÍNICA
    const configs = await base44.asServiceRole.entities.ConfiguracaoEmail.filter({
      clinica_id: targetClinicaId,
      provedor: 'dominio_proprio'
    });

    const config = configs[0];

    if (!config) {
      return Response.json({
        erro: 'CRÍTICO: ConfiguracaoEmail não encontrada',
        clinica_id: targetClinicaId,
        acao: 'Criar ConfiguracaoEmail com alias_recebimento'
      }, { status: 404 });
    }

    // 2. VERIFICAR INBOUND PARSE NO SENDGRID
    const inboundRes = await fetch('https://api.sendgrid.com/v3/user/webhooks/parse/settings', {
      headers: { 'Authorization': `Bearer ${SENDGRID_API_KEY}` }
    });

    let inboundParse = null;
    if (inboundRes.ok) {
      const data = await inboundRes.json();
      inboundParse = data.result?.find(s => 
        s.hostname?.includes(config.dkim_domain) || 
        s.hostname === 'mail.conectaclinica.com.br'
      );
    }

    // 3. ÚLTIMOS EMAILS RECEBIDOS (TODOS)
    const emailsRecebidos = await base44.asServiceRole.entities.EmailRecebido.filter(
      { clinica_id: targetClinicaId },
      '-created_date',
      10
    );

    // 4. ÚLTIMOS LOGS DE AUDIT DO WEBHOOK
    const logsWebhook = await base44.asServiceRole.entities.LogAuditoria.filter(
      { tipo_operacao: 'webhook_email_recebido' },
      '-created_date',
      20
    );

    // 5. BUSCAR CLINICA
    const clinicas = await base44.asServiceRole.entities.Clinica.filter({ id: targetClinicaId });
    const clinica = clinicas[0];

    // 6. DIAGNÓSTICO FINAL
    const diagnostico = {
      clinica: {
        id: targetClinicaId,
        nome: clinica?.nome,
        slug: clinica?.slug
      },
      config_email: {
        existe: !!config,
        alias_recebimento: config?.alias_recebimento,
        dkim_domain: config?.dkim_domain,
        dkim_domain_id: config?.dkim_domain_id,
        email_remetente: config?.email_remetente,
        ativo: config?.ativo,
        inbound_parse_configurado: config?.inbound_parse_configurado
      },
      sendgrid_inbound_parse: {
        configurado: !!inboundParse,
        hostname: inboundParse?.hostname,
        url: inboundParse?.url,
        spam_check: inboundParse?.spam_check
      },
      emails_recebidos: {
        total: emailsRecebidos.length,
        ultimos: emailsRecebidos.map(e => ({
          from: e.from_email,
          to: e.to_email,
          subject: e.subject,
          processed: e.processed,
          ticket_id: e.ticket_id,
          data: e.created_date
        }))
      },
      webhook_logs: {
        total: logsWebhook.length,
        ultimos: logsWebhook.slice(0, 10).map(log => ({
          from: log.detalhes?.from,
          to: log.detalhes?.to,
          dominio: log.detalhes?.dominio,
          configs_found: log.detalhes?.configs_found,
          sucesso: log.sucesso,
          data: log.created_date
        }))
      },
      problemas_detectados: []
    };

    // ANÁLISE DE PROBLEMAS
    if (!config.alias_recebimento) {
      diagnostico.problemas_detectados.push({
        severidade: 'CRÍTICO',
        problema: 'alias_recebimento não configurado',
        impacto: 'Webhook não consegue rotear emails para esta clínica',
        acao: `Adicionar alias_recebimento na ConfiguracaoEmail (ex: ${clinica?.slug || 'prevenclin'}@conectaclinica.com.br)`
      });
    }

    if (!inboundParse) {
      diagnostico.problemas_detectados.push({
        severidade: 'CRÍTICO',
        problema: 'Inbound Parse não configurado no SendGrid',
        impacto: 'SendGrid não envia emails para o webhook',
        acao: 'Configurar Inbound Parse no SendGrid para mail.conectaclinica.com.br'
      });
    }

    if (inboundParse && !inboundParse.url?.includes('webhookReceberEmail')) {
      diagnostico.problemas_detectados.push({
        severidade: 'ALTO',
        problema: 'Inbound Parse aponta para URL incorreta',
        impacto: 'Emails não chegam no webhook correto',
        acao: `Atualizar URL para: ${Deno.env.get('BASE44_BASE_URL')}/api/apps/${Deno.env.get('BASE44_APP_ID')}/functions/webhookReceberEmail`
      });
    }

    const webhookLogsDaClinica = logsWebhook.filter(log => 
      log.detalhes?.to === config?.alias_recebimento
    );

    if (webhookLogsDaClinica.length === 0) {
      diagnostico.problemas_detectados.push({
        severidade: 'ALTO',
        problema: `Nenhum email recebido para ${config?.alias_recebimento}`,
        impacto: 'Webhook não está recebendo emails para este alias',
        acao: 'Verificar DNS MX e testar envio direto para o alias'
      });
    }

    if (emailsRecebidos.length === 0 && webhookLogsDaClinica.length > 0) {
      diagnostico.problemas_detectados.push({
        severidade: 'ALTO',
        problema: 'Webhook recebe mas não persiste EmailRecebido',
        impacto: 'Emails chegam mas não aparecem na caixa',
        acao: 'Bug no webhook - verificar logs de erro'
      });
    }

    return Response.json(diagnostico);

  } catch (error) {
    console.error('[DIAGNÓSTICO] Erro:', error);
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});