/**
 * AUDITORIA SENDGRID - Schema completo
 * Registra TODAS chamadas SendGrid para compliance LGPD
 * 
 * REGISTRA:
 * - Request completo (headers, body, destinatário)
 * - Response completo (status, headers, message_id)
 * - Metadados (clinica_id, tipo_email, timestamp)
 */

/**
 * Auditar chamada SendGrid
 * @param {Object} base44 - Cliente SDK
 * @param {Object} params - Parâmetros
 * @param {string} params.clinica_id - ID clínica
 * @param {Object} params.emailData - Payload SendGrid
 * @param {Response} params.sendGridRes - Resposta SendGrid
 * @param {string} params.tipo - Tipo email (confirmacao, reset_senha, etc)
 * @param {string} params.ticket_id - ID ticket (opcional)
 */
export async function auditSendGridCall(base44, { 
  clinica_id, 
  emailData, 
  sendGridRes, 
  tipo, 
  ticket_id = null 
}) {
  try {
    const sgMessageId = sendGridRes.headers.get('x-message-id');
    
    await base44.asServiceRole.entities.LogAuditoria.create({
      clinica_id,
      tipo_operacao: 'sendgrid_send_email',
      usuario_id: 'system',
      usuario_email: emailData.from.email,
      entidade_afetada: ticket_id ? 'Ticket' : 'Email',
      detalhes: {
        endpoint: '/v3/mail/send',
        tipo_email: tipo,
        request: {
          from: emailData.from,
          to: emailData.personalizations[0].to[0].email,
          subject: emailData.personalizations[0].subject,
          reply_to: emailData.reply_to || null,
          custom_args: emailData.custom_args || {},
          message_id_gerado: emailData.headers?.['Message-ID'] || null
        },
        response: {
          status: sendGridRes.status,
          statusText: sendGridRes.statusText,
          headers: Object.fromEntries(sendGridRes.headers.entries()),
          sg_message_id: sgMessageId
        },
        timestamp: new Date().toISOString(),
        ticket_id
      },
      sucesso: sendGridRes.ok
    });
    
    console.log(`[AuditSG] ✅ Auditado: ${tipo} → ${emailData.personalizations[0].to[0].email}`);
    
  } catch (error) {
    console.error('[AuditSG] ❌ Erro ao auditar:', error.message);
    // Não propagar erro - auditoria não deve bloquear funcionalidade
  }
}

/**
 * Auditar erro SendGrid
 * @param {Object} base44 - Cliente SDK
 * @param {Object} params - Parâmetros
 */
export async function auditSendGridError(base44, { 
  clinica_id, 
  emailData, 
  errorText, 
  tipo, 
  ticket_id = null 
}) {
  try {
    await base44.asServiceRole.entities.LogAuditoria.create({
      clinica_id,
      tipo_operacao: 'sendgrid_error',
      usuario_id: 'system',
      usuario_email: emailData.from.email,
      entidade_afetada: ticket_id ? 'Ticket' : 'Email',
      detalhes: {
        endpoint: '/v3/mail/send',
        tipo_email: tipo,
        error: errorText,
        request: {
          from: emailData.from,
          to: emailData.personalizations[0].to[0].email,
          subject: emailData.personalizations[0].subject
        },
        timestamp: new Date().toISOString(),
        ticket_id
      },
      sucesso: false
    });
    
    console.log(`[AuditSG] ⚠️ Erro auditado: ${tipo}`);
    
  } catch (error) {
    console.error('[AuditSG] ❌ Erro ao auditar erro:', error.message);
  }
}