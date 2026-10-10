import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * SENDGRID WRAPPER CENTRALIZADO
 * 
 * Features:
 * - Rate limiting por clínica (100 emails/min)
 * - Auditoria automática de custos
 * - Fallback sender inteligente
 * - Threading RFC 2822 automático
 * - Retry built-in (3x com backoff exponencial)
 * 
 * Usage:
 * const { data } = await base44.functions.invoke('sendgrid/send', {
 *   clinica_id: '...',
 *   to: 'email@example.com',
 *   subject: 'Assunto',
 *   html: '<p>Conteúdo</p>',
 *   tipo_email: 'notificacao',
 *   ticket_id: '...' // opcional
 * });
 */

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minuto
const MAX_EMAILS_PER_WINDOW = 100;

Deno.serve(async (req) => {
  const startTime = Date.now();
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { 
      clinica_id, 
      to, 
      subject, 
      html, 
      tipo_email = 'outro',
      ticket_id = null,
      reply_to = null,
      template_id = null,
      in_reply_to = null,
      references = null
    } = payload;

    // Validação
    if (!clinica_id || !to || !subject || !html) {
      return Response.json({ 
        error: 'Campos obrigatórios: clinica_id, to, subject, html' 
      }, { status: 400 });
    }

    // RATE LIMITING: Verificar quantos emails a clínica enviou no último minuto
    const umMinutoAtras = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const emailsRecentes = await base44.asServiceRole.entities.SendGridAuditoria.filter({
      clinica_id,
      created_date: { $gte: umMinutoAtras }
    });

    if (emailsRecentes.length >= MAX_EMAILS_PER_WINDOW) {
      return Response.json({ 
        error: 'Rate limit excedido',
        limite: `${MAX_EMAILS_PER_WINDOW} emails/minuto`,
        retry_after: 60
      }, { status: 429 });
    }

    // Buscar configuração de email da clínica
    let config = null;
    const configs = await base44.asServiceRole.entities.ConfiguracaoEmail.filter({
      clinica_id,
      provedor_padrao: true,
      ativo: true
    });

    if (configs.length === 0) {
      // Fallback: qualquer config ativa
      const configsAtivas = await base44.asServiceRole.entities.ConfiguracaoEmail.filter({
        clinica_id,
        ativo: true
      });
      
      if (configsAtivas.length > 0) {
        config = configsAtivas[0];
      }
    } else {
      config = configs[0];
    }

    // CRITICAL: Verificar se sender está verificado
    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
    let usarSenderClinica = false;
    let fromEmail = 'noreply@conectaclinica.com.br';
    let fromName = 'ConectaClínica';

    if (config) {
      const sendersRes = await fetch('https://api.sendgrid.com/v3/verified_senders', {
        headers: { Authorization: `Bearer ${SENDGRID_API_KEY}` }
      });
      
      if (sendersRes.ok) {
        const sendersData = await sendersRes.json();
        const senderVerificado = sendersData.results?.find(s => 
          s.from_email === config.email_remetente && s.verified === true
        );
        
        if (senderVerificado) {
          usarSenderClinica = true;
          fromEmail = config.email_remetente;
          fromName = config.nome_remetente;
        }
      }
    }

    // Buscar clínica para nome
    const clinicas = await base44.asServiceRole.entities.Clinica.filter({ id: clinica_id });
    const clinica = clinicas[0];
    
    if (!usarSenderClinica && clinica) {
      fromName = `${clinica.nome} (via ConectaClínica)`;
    }

    // THREADING: Montar headers RFC 2822
    const dominio = config?.dkim_domain || 'conectaclinica.com.br';
    const messageId = `<${crypto.randomUUID()}@${dominio}>`;
    const headers = { 'Message-ID': messageId };

    if (in_reply_to) {
      headers['In-Reply-To'] = in_reply_to;
      headers['References'] = references || in_reply_to;
    }

    // Reply-to inteligente
    const replyToEmail = reply_to || (config?.alias_recebimento || `${clinica?.slug || 'clinica'}@conectaclinica.com.br`);

    // Montar payload SendGrid
    const emailData = {
      personalizations: [{
        to: [{ email: to }],
        subject
      }],
      from: { 
        email: fromEmail, 
        name: fromName 
      },
      content: [{ 
        type: 'text/html', 
        value: html 
      }],
      headers,
      reply_to: { 
        email: replyToEmail,
        name: fromName
      },
      custom_args: {
        clinica_id,
        tipo_email,
        ticket_id: ticket_id || '',
        message_id: messageId
      },
      tracking_settings: {
        click_tracking: { enable: true },
        open_tracking: { enable: true }
      }
    };

    if (template_id) {
      emailData.template_id = template_id;
    }

    // RETRY LOGIC: 3 tentativas com backoff exponencial
    let sendGridRes = null;
    let tentativa = 0;
    const maxRetries = 3;

    while (tentativa < maxRetries) {
      try {
        sendGridRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SENDGRID_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(emailData)
        });

        if (sendGridRes.ok) break; // Sucesso - sair do loop

        // Se não ok, verificar se é erro retriable
        const errorBody = await sendGridRes.text();
        const is5xx = sendGridRes.status >= 500 && sendGridRes.status < 600;
        const isRateLimit = sendGridRes.status === 429;

        if (!is5xx && !isRateLimit) {
          // Erro 4xx (bad request) - não retry
          throw new Error(`SendGrid error ${sendGridRes.status}: ${errorBody}`);
        }

        tentativa++;
        if (tentativa < maxRetries) {
          const backoffMs = Math.pow(2, tentativa) * 1000; // 2s, 4s, 8s
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      } catch (fetchError) {
        tentativa++;
        if (tentativa >= maxRetries) throw fetchError;
        
        const backoffMs = Math.pow(2, tentativa) * 1000;
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }

    if (!sendGridRes || !sendGridRes.ok) {
      const errorText = await sendGridRes?.text() || 'Network error';
      throw new Error(`SendGrid failed after ${maxRetries} retries: ${errorText}`);
    }

    const sgMessageId = sendGridRes.headers.get('x-message-id');
    const latencia = Date.now() - startTime;

    // AUDITORIA: Salvar em SendGridAuditoria
    await base44.asServiceRole.entities.SendGridAuditoria.create({
      clinica_id,
      tipo_email,
      destinatario: to,
      remetente: fromEmail,
      assunto: subject,
      message_id: messageId,
      sg_message_id: sgMessageId,
      custo_creditos: 1,
      status: 'sent',
      latencia_ms: latencia,
      template_id: template_id || null,
      ticket_id: ticket_id || null,
      sender_verificado: usarSenderClinica,
      usou_fallback: !usarSenderClinica,
      ip_address: req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent')
    });

    // CONSUMO: Registrar em ConsumoRecurso (para billing overage)
    try {
      await base44.asServiceRole.entities.ConsumoRecurso.create({
        clinica_id,
        recurso: 'email_enviado',
        quantidade: 1,
        unidade: 'email',
        custo_unitario_brl: 0.001, // R$ 0,001 por email (estimativa)
        mes_referencia: new Date().toISOString().substring(0, 7), // YYYY-MM
        metadata: {
          tipo_email,
          destinatario: to,
          message_id: messageId
        }
      });
    } catch (consumoError) {
      console.warn('[SendGrid] ⚠️ Falha ao registrar consumo:', consumoError.message);
    }

    console.log('[SendGrid] ✅ Email enviado:', {
      clinica_id,
      to,
      tipo_email,
      message_id: messageId,
      sg_message_id: sgMessageId,
      latencia_ms: latencia,
      sender_verificado: usarSenderClinica,
      tentativas: tentativa + 1
    });

    return Response.json({ 
      success: true,
      message_id: messageId,
      sg_message_id: sgMessageId,
      latencia_ms: latencia,
      status: 'sent'
    });

  } catch (error) {
    const latencia = Date.now() - startTime;
    console.error('[SendGrid] ❌ Erro:', error);

    // AUDIT: Registrar falha
    try {
      const payload = await req.clone().json();
      await base44.asServiceRole.entities.SendGridAuditoria.create({
        clinica_id: payload.clinica_id,
        tipo_email: payload.tipo_email || 'outro',
        destinatario: payload.to,
        remetente: 'error',
        assunto: payload.subject,
        message_id: 'error',
        sg_message_id: null,
        custo_creditos: 0,
        status: 'dropped',
        latencia_ms: latencia,
        erro_detalhes: error.message,
        ip_address: req.headers.get('cf-connecting-ip') || 'unknown'
      });
    } catch (auditError) {
      console.error('[SendGrid] ❌ Falha ao auditar erro:', auditError.message);
    }

    return Response.json({ 
      error: 'Erro ao enviar email',
      details: error.message 
    }, { status: 500 });
  }
});