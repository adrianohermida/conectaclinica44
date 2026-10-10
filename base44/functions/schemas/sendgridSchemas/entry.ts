/**
 * SCHEMAS DE RESPOSTA - SENDGRID API v3
 * Documentação: https://docs.sendgrid.com/api-reference
 * 
 * TODOS schemas salvos para auditoria e debug
 */

export const SendGridSchemas = {
  // POST /v3/mail/send - Enviar email
  sendEmail: {
    request: {
      personalizations: [{ to: [{ email: String }], subject: String }],
      from: { email: String, name: String },
      reply_to: { email: String, name: String },
      content: [{ type: String, value: String }],
      custom_args: Object,
      tracking_settings: Object
    },
    response: {
      status: 202,
      headers: {
        'x-message-id': String
      },
      body: null // 202 Accepted sem body
    },
    errors: {
      400: { errors: [{ message: String, field: String }] },
      401: { errors: [{ message: 'Unauthorized' }] },
      413: { errors: [{ message: 'Payload too large' }] }
    }
  },

  // GET /v3/verified_senders - Listar senders verificados
  listVerifiedSenders: {
    response: {
      results: [{
        id: Number,
        from_email: String,
        from_name: String,
        reply_to: String,
        reply_to_name: String,
        verified: Boolean,
        locked: Boolean
      }]
    }
  },

  // POST /v3/verified_senders - Criar sender
  createVerifiedSender: {
    request: {
      from_email: String,
      from_name: String,
      reply_to: String,
      reply_to_name: String,
      address: String,
      address2: String,
      city: String,
      state: String,
      zip: String,
      country: String,
      nickname: String
    },
    response: {
      id: Number,
      from_email: String,
      verified: false,
      locked: false
    }
  },

  // GET /v3/user/webhooks/parse/settings - Listar Inbound Parse
  listInboundParse: {
    response: {
      result: [{
        hostname: String,
        url: String,
        spam_check: Boolean,
        send_raw: Boolean
      }]
    }
  },

  // POST /v3/user/webhooks/parse/settings - Criar Inbound Parse
  createInboundParse: {
    request: {
      hostname: String,
      url: String,
      spam_check: Boolean,
      send_raw: Boolean
    },
    response: {
      hostname: String,
      url: String,
      spam_check: Boolean,
      send_raw: Boolean
    }
  },

  // DELETE /v3/user/webhooks/parse/settings/:hostname
  deleteInboundParse: {
    response: { status: 204 }
  },

  // POST /v3/whitelabel/domains - Adicionar domínio autenticado
  addAuthenticatedDomain: {
    request: {
      domain: String,
      subdomain: String,
      username: String,
      ips: [String],
      custom_spf: Boolean,
      default: Boolean,
      automatic_security: Boolean
    },
    response: {
      id: Number,
      domain: String,
      subdomain: String,
      username: String,
      user_id: Number,
      ips: [String],
      custom_spf: Boolean,
      default: Boolean,
      legacy: Boolean,
      automatic_security: Boolean,
      valid: Boolean,
      dns: {
        mail_cname: { valid: Boolean, type: String, host: String, data: String },
        dkim1: { valid: Boolean, type: String, host: String, data: String },
        dkim2: { valid: Boolean, type: String, host: String, data: String }
      }
    }
  },

  // GET /v3/whitelabel/domains - Listar domínios autenticados
  listAuthenticatedDomains: {
    response: [{
      id: Number,
      domain: String,
      subdomain: String,
      username: String,
      valid: Boolean,
      default: Boolean,
      dns: Object
    }]
  },

  // POST /v3/whitelabel/domains/:id/validate - Validar domínio
  validateDomain: {
    response: {
      id: Number,
      valid: Boolean,
      validation_results: {
        mail_cname: { valid: Boolean, reason: String },
        dkim1: { valid: Boolean, reason: String },
        dkim2: { valid: Boolean, reason: String }
      }
    }
  },

  // GET /v3/messages - Activity (Email Activity Feed)
  searchActivity: {
    request: {
      query: String, // Ex: "to_email='paciente@gmail.com' AND last_event_time BETWEEN '2025-12-17' AND '2025-12-18'"
      limit: Number
    },
    response: {
      messages: [{
        from_email: String,
        to_email: String,
        subject: String,
        status: String,
        opens_count: Number,
        clicks_count: Number,
        last_event_time: String,
        msg_id: String,
        events: [{
          event_name: String,
          processed: String
        }]
      }]
    }
  },

  // GET /v3/suppression/bounces - Listar bounces
  listBounces: {
    response: [{
      email: String,
      created: Number,
      reason: String,
      status: String
    }]
  },

  // DELETE /v3/suppression/bounces/:email - Remover bounce
  deleteBounce: {
    response: { status: 204 }
  },

  // GET /v3/stats - Estatísticas globais
  getStats: {
    request: {
      start_date: String, // YYYY-MM-DD
      end_date: String,
      aggregated_by: String // 'day' | 'week' | 'month'
    },
    response: [{
      date: String,
      stats: [{
        metrics: {
          blocks: Number,
          bounces: Number,
          clicks: Number,
          deferred: Number,
          delivered: Number,
          invalid_emails: Number,
          opens: Number,
          processed: Number,
          requests: Number,
          spam_report_drops: Number,
          spam_reports: Number,
          unique_clicks: Number,
          unique_opens: Number,
          unsubscribe_drops: Number,
          unsubscribes: Number
        }
      }]
    }]
  },

  // Webhook Events - Inbound Parse
  webhookInboundParse: {
    fields: {
      to: String,
      from: String,
      subject: String,
      text: String,
      html: String,
      sender_ip: String,
      envelope: String,
      attachments: Number,
      'attachment-info': String, // JSON com metadados
      charsets: String,
      SPF: String, // 'pass' | 'fail' | 'softfail' | 'neutral'
      DKIM: String, // 'pass' | 'fail'
      'dkim-signature': String,
      headers: String,
      'Message-ID': String,
      'In-Reply-To': String,
      References: String,
      Date: String
    }
  },

  // Webhook Events - Event Webhook (delivery status)
  webhookEventWebhook: {
    events: [{
      email: String,
      event: String, // 'processed' | 'delivered' | 'bounce' | 'dropped' | 'open' | 'click' | 'spam_report' | 'unsubscribe'
      timestamp: Number,
      sg_message_id: String,
      sg_event_id: String,
      reason: String,
      status: String,
      response: String,
      tls: Number,
      url: String,
      ip: String,
      useragent: String,
      type: String
    }]
  }
};

/**
 * Salvar schema de resposta real (debug/auditoria)
 */
export async function salvarSchemaResposta(base44, endpoint, request, response, clinica_id = null) {
  try {
    await base44.asServiceRole.entities.LogAuditoria.create({
      clinica_id,
      tipo_operacao: 'sendgrid_api_call',
      usuario_id: 'system',
      usuario_email: 'sendgrid@conectaclinica',
      entidade_afetada: 'SendGridAPI',
      detalhes: {
        endpoint,
        request,
        response: {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          body: await response.clone().json().catch(() => null)
        },
        timestamp: new Date().toISOString()
      },
      sucesso: response.ok
    });
  } catch (error) {
    console.warn('[salvarSchemaResposta] Falha ao salvar:', error.message);
  }
}