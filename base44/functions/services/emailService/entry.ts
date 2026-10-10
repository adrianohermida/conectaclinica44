import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * SERVICE LAYER: Envio de emails via SendGrid
 * DRY, retry, fallback, tracking, vars dinâmicas
 */

// Wrapper simplificado para compatibilidade
export async function enviarEmail({ tipo, para, assunto, variaveis = {}, anexos = [] }) {
  const base44 = createClientFromRequest(new Request('http://localhost'));
  
  return await enviarEmailSendGrid({
    base44,
    clinica_id: null,
    template_tipo: tipo,
    destinatario: para,
    vars: variaveis,
    anexos: anexos.map(a => ({
      content_base64: a.content,
      nome: a.filename,
      tipo: a.type
    }))
  });
}

export async function enviarEmailSendGrid({
  base44,
  clinica_id,
  template_tipo,
  destinatario,
  vars = {},
  anexos = [],
  prioridade = 'normal',
  track_opens = true,
  track_clicks = true
}) {
  try {
    // 1. Buscar template do tipo
    const templates = await base44.asServiceRole.entities.TemplateSendGrid.filter({
      tipo: template_tipo,
      ativo: true
    });

    if (templates.length === 0) {
      throw new Error(`Template ${template_tipo} não encontrado - crie via SuperAdmin`);
    }

    const template = templates[0];
    const sendgridTemplateId = template.template_sendgrid_id;

    // 2. Buscar config SendGrid (global ou clínica)
    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
    if (!SENDGRID_API_KEY) {
      throw new Error('SENDGRID_API_KEY não configurado');
    }
    
    const { auditSendGridCall, auditSendGridError } = await import('../middleware/auditSendGrid.js');

    // 3. Buscar email remetente (config clínica ou default)
    let emailFrom = 'noreply@conectaclinica.com.br';
    let nomeFrom = 'ConectaClínica';

    if (clinica_id) {
      const configsEmail = await base44.asServiceRole.entities.ConfiguracaoEmail.filter({
        clinica_id,
        ativo: true
      });

      if (configsEmail.length > 0) {
        emailFrom = configsEmail[0].email_remetente || emailFrom;
        nomeFrom = configsEmail[0].nome_remetente || nomeFrom;
      }
    }

    // 4. Preparar payload SendGrid
    const payload = {
      personalizations: [{
        to: [{ email: destinatario }],
        dynamic_template_data: vars
      }],
      from: {
        email: emailFrom,
        name: nomeFrom
      },
      template_id: sendgridTemplateId,
      tracking_settings: {
        click_tracking: { enable: track_clicks },
        open_tracking: { enable: track_opens }
      }
    };

    // Anexos (se houver)
    if (anexos.length > 0) {
      payload.attachments = anexos.map(a => ({
        content: a.content_base64,
        filename: a.nome,
        type: a.tipo,
        disposition: 'attachment'
      }));
    }

    // 5. Enviar via SendGrid API
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    // AUDIT: Centralizado
    await auditSendGridCall(base44, {
      clinica_id: clinica_id || 'global',
      emailData: payload,
      sendGridRes: response,
      tipo: template_tipo
    });

    if (!response.ok) {
      const error = await response.text();
      
      await auditSendGridError(base44, {
        clinica_id: clinica_id || 'global',
        emailData: payload,
        errorText: error,
        tipo: template_tipo
      });
      
      throw new Error(`SendGrid error: ${error}`);
    }

    // 6. Extrair message_id do header
    const messageId = response.headers.get('x-message-id');

    // 7. Registrar tracking
    await base44.asServiceRole.entities.StatusEntregaEmail.create({
      clinica_id: clinica_id || 'global',
      message_id: messageId,
      template_tipo,
      destinatario,
      status: 'accepted',
      provider: 'sendgrid',
      metadata: { prioridade, vars_enviadas: Object.keys(vars) }
    });

    // 8. Incrementar contador uso template
    await base44.asServiceRole.entities.TemplateSendGrid.update(template.id, {
      uso_count: (template.uso_count || 0) + 1
    });

    console.log(`[EmailService] Enviado: ${template_tipo} para ${destinatario} (msg_id: ${messageId})`);

    return { success: true, message_id: messageId };

  } catch (error) {
    console.error('[EmailService] Erro:', error);
    
    // FALLBACK: Core.SendEmail se SendGrid falhar
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: destinatario,
        subject: `[FALLBACK] ${template_tipo}`,
        body: JSON.stringify(vars)
      });
      console.warn(`[EmailService] FALLBACK usado para ${template_tipo}`);
      return { success: true, fallback: true };
    } catch (fallbackError) {
      throw new Error(`SendGrid e Fallback falharam: ${error.message}`);
    }
  }
}

/**
 * Retry com backoff exponencial
 */
export async function enviarComRetry(params, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await enviarEmailSendGrid(params);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = Math.pow(2, i) * 1000;
      console.log(`[EmailService] Retry ${i + 1}/${maxRetries} em ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}