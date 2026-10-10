import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Webhook para receber emails via SendGrid/Mailgun
 * Configure seu provedor para enviar POST neste endpoint quando receber emails
 */
Deno.serve(async (req) => {
  try {
    // Webhook NÃO requer autenticação (chamado por serviço externo)
    // Validar assinatura do provedor aqui se disponível

    const contentType = req.headers.get('content-type');
    let emailData;

    // Parse baseado no provedor (FIX: SendGrid usa nomes diferentes)
    if (contentType?.includes('application/json')) {
      emailData = await req.json();
    } else {
      // SendGrid Inbound Parse usa 'from', 'to', 'subject', 'text', 'html'
      const formData = await req.formData();
      
      // CRITICAL: SendGrid envia como 'from', 'to', 'subject', 'text', 'html'
      // NÃO 'body-plain' ou 'body-html'
      const textContent = formData.get('text') || formData.get('body-plain') || formData.get('stripped-text') || '';
      const htmlContent = formData.get('html') || formData.get('body-html') || formData.get('stripped-html') || '';
      
      // EXTRAIR HEADERS COMPLETOS (SendGrid envia como JSON string)
      const headersJson = formData.get('headers') || '{}';
      const parsedHeaders = JSON.parse(headersJson);
      
      emailData = {
        from: formData.get('from') || formData.get('sender'),
        to: formData.get('to') || formData.get('recipient'),
        cc: formData.get('cc') || null,
        subject: formData.get('subject'),
        text: textContent,
        html: htmlContent,
        attachments: formData.get('attachments') || [],
        headers: parsedHeaders,
        date: formData.get('date') || parsedHeaders.Date
      };
      
      console.log('[WEBHOOK] Parsed:', { 
        from: emailData.from, 
        to: emailData.to, 
        subject: emailData.subject,
        textLength: textContent.length,
        htmlLength: htmlContent.length,
        headersCount: Object.keys(parsedHeaders).length
      });
    }

    console.log('[EMAIL_WEBHOOK] Email recebido:', { 
      from: emailData.from, 
      to: emailData.to, 
      subject: emailData.subject,
      hasText: !!emailData.text,
      hasHtml: !!emailData.html,
      textLength: emailData.text?.length || 0,
      htmlLength: emailData.html?.length || 0
    });

    // Identificar clínica pelo alias de recebimento
    const base44 = createClientFromRequest(req);
    
    // Extrair alias do destinatário (pode vir como "Nome <alias@...>" ou "alias@...")
    const emailDest = emailData.to.match(/<(.+)>/)?.[1] || emailData.to;
    
    console.log('[EMAIL_WEBHOOK] 🔍 Procurando config para alias:', emailDest);
    
    // 1. IDENTIFICAR CONFIGURAÇÃO DA CLÍNICA - ISOLAMENTO MULTITENANT STRICT
    // CRÍTICO: NUNCA misturar emails de clínicas diferentes
    
    // Buscar config ATIVA para o alias
    let configs = await base44.asServiceRole.entities.ConfiguracaoEmail.filter({
      alias_recebimento: emailDest,
      ativo: true
    });

    if (configs.length === 0) {
      console.log(`❌ BLOQUEADO: Nenhuma config ativa para ${emailDest}`);
      return Response.json({ 
        error: 'Email alias not configured or inactive',
        alias: emailDest,
        message: 'Configure this email alias in /ConfiguracaoEmail first'
      }, { status: 403 });
    }
    
    // ISOLAMENTO STRICT: Usar PRIMEIRA config encontrada (deve haver apenas 1 por alias)
    const config = configs[0];
    
    // VALIDAÇÃO STRICT: Garantir que clinica_id existe e é válido UUID
    if (!config.clinica_id || config.clinica_id === 'default' || config.clinica_id.length < 20) {
      console.log(`❌ BLOQUEADO STRICT: Config sem clinica_id válida - config.id=${config.id}, clinica_id=${config.clinica_id}`);
      return Response.json({ 
        error: 'SECURITY: Invalid clinic configuration - clinica_id obrigatório',
        alias: emailDest,
        config_id: config.id,
        message: 'Configure this email alias in /ConfiguracaoEmail with valid clinica_id first'
      }, { status: 403 });
    }
    
    // VALIDAÇÃO DUPLA: Verificar que a clínica existe
    const clinicaValidacao = await base44.asServiceRole.entities.Clinica.filter({ id: config.clinica_id });
    if (clinicaValidacao.length === 0) {
      console.log(`❌ BLOQUEADO STRICT: clinica_id ${config.clinica_id} não existe no banco`);
      return Response.json({ 
        error: 'SECURITY: Clinic not found',
        clinica_id: config.clinica_id
      }, { status: 403 });
    }
    
    console.log(`✅ Email aceito STRICT para clínica: ${config.clinica_id} (${clinicaValidacao[0].nome})`);

    // Categorização automática via IA ANTES de salvar
    let categoria = "outro";
    try {
      const resultadoIA = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Categorize o seguinte email de suporte de clínica médica em APENAS UMA das categorias: 
"suporte_tecnico", "agendamento", "financeiro", "documentos", "duvida", "reclamacao", "sugestao", "outro".

Assunto: ${emailData.subject}
Corpo: ${(emailData.text || '').substring(0, 500)}

Responda APENAS com a categoria, sem explicação.`,
        response_json_schema: {
          type: "object",
          properties: {
            categoria: {
              type: "string",
              enum: ["suporte_tecnico", "agendamento", "financeiro", "documentos", "duvida", "reclamacao", "sugestao", "outro"]
            }
          },
          required: ["categoria"]
        }
      });
      
      categoria = resultadoIA.categoria || "outro";
      console.log('[EMAIL_WEBHOOK] Categoria IA:', categoria);
    } catch (errIA) {
      console.error('[EMAIL_WEBHOOK] Erro IA categorização:', errIA.message);
      // Continuar mesmo se IA falhar
    }

    // CRIAR TICKET AUTOMATICAMENTE - ISOLAMENTO MULTITENANT GARANTIDO
    const ano = new Date().getFullYear();
    
    // CRÍTICO: Sempre filtrar por clinica_id para evitar vazamento
    const ticketsExistentes = await base44.asServiceRole.entities.Ticket.filter({ 
      clinica_id: config.clinica_id 
    });
    const numeroSequencial = String(ticketsExistentes.length + 1).padStart(4, '0');
    
    console.log(`📊 Clínica ${config.clinica_id} tem ${ticketsExistentes.length} tickets existentes`);

    // Auto-associar contato existente
    const emailRemetente = emailData.from.match(/<(.+)>/)?.[1] || emailData.from;
    const nomeRemetente = emailData.from.split('<')[0].trim() || emailRemetente;
    
    // Buscar contato por email principal ou dentro do array emails[]
    const contatosExistentes = await base44.asServiceRole.entities.Contato.filter({ 
      clinica_id: config.clinica_id
    });
    
    const contatoExistente = contatosExistentes.find(c => 
      c.email === emailRemetente || 
      c.emails?.some(e => e.email === emailRemetente)
    );

    if (!contatoExistente) {
      await base44.asServiceRole.entities.Contato.create({
        clinica_id: config.clinica_id,
        nome_completo: nomeRemetente,
        emails: [{ email: emailRemetente, tipo: 'pessoal', principal: true }],
        tipo_contato: "lead",
        status: "prospecto",
        origem_lead: "email"
      });
    }

    // CRIAÇÃO DE TICKET COM VALIDAÇÃO DUPLA DE clinica_id
    const ticket = await base44.asServiceRole.entities.Ticket.create({
      clinica_id: config.clinica_id, // CRITICAL: Sempre da config validada
      numero_ticket: `#${ano}-${numeroSequencial}`,
      assunto: emailData.subject || '[Sem assunto]',
      status: 'aberto',
      prioridade: 'media',
      canal: 'email',
      solicitante_nome: nomeRemetente,
      solicitante_email: emailRemetente,
      categoria: categoria
    });
    
    // AUDITORIA: Registrar criação de ticket via webhook
    await base44.asServiceRole.entities.LogAuditoria.create({
      clinica_id: config.clinica_id,
      tipo_operacao: 'create',
      entidade: 'Ticket',
      entidade_id: ticket.id,
      usuario_email: 'system_webhook',
      detalhes: {
        origem: 'email_webhook',
        alias: emailDest,
        remetente: emailRemetente,
        subject: emailData.subject
      }
    }).catch(() => {}); // Não bloquear se LogAuditoria falhar

    // EXTRAÇÃO ROBUSTA de conteúdo (SendGrid Inbound Parse)
    let conteudoEmail = '';
    
    // 1. Priorizar 'text' (plain text)
    if (emailData.text && emailData.text.trim().length > 0) {
      conteudoEmail = emailData.text.trim();
      console.log('[WEBHOOK] ✅ Extraído de TEXT:', conteudoEmail.length, 'chars');
    }
    // 2. Fallback: HTML (limpar tags)
    else if (emailData.html && emailData.html.trim().length > 0) {
      conteudoEmail = emailData.html
        .replace(/<style[^>]*>.*?<\/style>/gis, '')
        .replace(/<script[^>]*>.*?<\/script>/gis, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 5000);
      console.log('[WEBHOOK] ⚠️ Extraído de HTML (fallback):', conteudoEmail.length, 'chars');
    }
    // 3. Último fallback: criar mensagem de debug
    else {
      conteudoEmail = `[EMAIL RECEBIDO - Conteúdo não disponível]\n\n` +
                      `Assunto: ${emailData.subject || 'N/A'}\n` +
                      `De: ${emailData.from || 'N/A'}\n` +
                      `Para: ${emailData.to || 'N/A'}\n\n` +
                      `DEBUG: text=${!!emailData.text} (${emailData.text?.length || 0}), ` +
                      `html=${!!emailData.html} (${emailData.html?.length || 0})\n\n` +
                      `RAW TEXT: ${JSON.stringify(emailData.text || '').substring(0, 200)}\n` +
                      `RAW HTML: ${JSON.stringify(emailData.html || '').substring(0, 200)}`;
      console.log('[WEBHOOK] ❌ SEM CONTEÚDO - gerando debug');
    }
    
    console.log('[WEBHOOK] Conteúdo final (primeiros 300 chars):', conteudoEmail.substring(0, 300));

    // Extrair headers completos do email + THREADING
    // SendGrid envia headers via form-data ou JSON
    const rawHeaders = emailData.headers || {};
    
    const emailHeaders = {
      from: emailData.from,
      to: emailData.to,
      cc: emailData.cc || rawHeaders.cc || null,
      subject: emailData.subject,
      date: rawHeaders.date || emailData.date || new Date().toISOString(),
      message_id: rawHeaders['message-id'] || rawHeaders.messageId || `<${Date.now()}@conectaclinica.com.br>`,
      in_reply_to: rawHeaders['in-reply-to'] || rawHeaders.inReplyTo || null,
      references: rawHeaders.references || null,
      spf: rawHeaders['received-spf'] || rawHeaders.spf || null,
      dkim: rawHeaders['dkim-signature'] || rawHeaders.dkim || null,
      raw_headers: rawHeaders // Guardar tudo para debug
    };
    
    console.log('[HEADERS]', JSON.stringify(emailHeaders, null, 2));

    // MENSAGEM COM ISOLAMENTO MULTITENANT GARANTIDO
    await base44.asServiceRole.entities.MensagemTicket.create({
      ticket_id: ticket.id,
      clinica_id: config.clinica_id, // CRITICAL: Sempre da config validada
      remetente_tipo: 'cliente',
      remetente_nome: ticket.solicitante_nome,
      remetente_email: ticket.solicitante_email,
      conteudo: conteudoEmail,
      conteudo_html: emailData.html || null,
      email_headers: emailHeaders,
      origem: 'email'
    });
    
    console.log(`✅ Mensagem criada - ticket=${ticket.id}, clinica=${config.clinica_id}`);

    // CRIAR NOTIFICAÇÃO para responsável ou toda equipe
    const notificarUsers = [];
    if (ticket.atribuido_a) {
      notificarUsers.push(ticket.atribuido_a);
    } else {
      // Notificar todos da equipe
      const todosUsuarios = await base44.asServiceRole.entities.User.list();
      const equipeClinica = todosUsuarios.filter(u => u.clinica_id === config.clinica_id);
      notificarUsers.push(...equipeClinica.map(u => u.id));
    }

    for (const userId of notificarUsers) {
      await base44.asServiceRole.entities.Notificacao.create({
        clinica_id: config.clinica_id,
        user_id: userId,
        tipo: 'novo_email',
        titulo: '📧 Novo email recebido',
        mensagem: `${ticket.solicitante_nome}: ${emailData.subject}`,
        ticket_id: ticket.id,
        link: `/Atendimento?ticket=${ticket.id}`,
        prioridade: 'media'
      });
    }

    // ROTEAMENTO INTELIGENTE
    try {
      await base44.asServiceRole.functions.invoke('roteamentoInteligente', {
        ticket_id: ticket.id,
        conteudo_inicial: emailData.text || emailData.subject
      });
    } catch (roteamentoError) {
      console.warn('[EMAIL_WEBHOOK] Roteamento falhou:', roteamentoError);
    }

    console.log('[EMAIL_WEBHOOK] Ticket criado:', ticket.numero_ticket);

    return Response.json({ 
      success: true, 
      ticket_id: ticket.id,
      ticket_numero: ticket.numero_ticket
    });

  } catch (error) {
    console.error('[EMAIL_WEBHOOK] Erro:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});