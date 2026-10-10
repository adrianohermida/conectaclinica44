import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * WEBHOOK: Recebe emails via SendGrid Inbound Parse → Cria tickets automaticamente
 * Chamado pelo SendGrid quando email chega em *@conectaclinica.com.br
 * 
 * SECURITY: Inbound Parse NÃO suporta HMAC. Validação alternativa:
 * - Rate limiting por IP (10 req/min)
 * - Validação SPF/DKIM via headers
 * - Verificação de alias ativo no sistema
 * 
 * Payload: multipart/form-data com campos:
 * - to: destinatário (ex: clinica-abc123@conectaclinica.com.br)
 * - from: remetente (ex: paciente@gmail.com)
 * - subject: assunto
 * - text: corpo texto plano
 * - html: corpo HTML
 * - attachments: número de anexos
 */

// ⚠️ CRITICAL WARNING: Rate limiting em memória local = VULNERÁVEL
// TODO P0: Migrar para Redis/KV distribuído ou usar Cloudflare Rate Limiting
// PROBLEMA: Map() local perde tudo ao reiniciar função (cold start)
// ATACANTE: pode spammar forçando cold starts = bypass completo
// MITIGAÇÃO ATUAL: SendGrid IP whitelist + SPF/DKIM validation (layer 2)
const rateLimitCache = new Map();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minuto
const RATE_LIMIT_MAX_REQUESTS_PER_IP = 20;
const RATE_LIMIT_MAX_REQUESTS_GLOBAL = 100;

Deno.serve(async (req) => {
  try {
    // SECURITY 1: Validar token secreto (query param)
    const url = new URL(req.url);
    const tokenParam = url.searchParams.get('token');
    const VALIDATION_TOKEN = Deno.env.get('SENDGRID_WEBHOOK_VERIFICATION_KEY');
    
    if (VALIDATION_TOKEN && tokenParam !== VALIDATION_TOKEN) {
      console.error('[webhookReceberEmail] ❌ SECURITY: Token inválido', { 
        expected: VALIDATION_TOKEN?.substring(0, 8) + '...', 
        received: tokenParam?.substring(0, 8) + '...' 
      });
      return Response.json({ 
        success: false, 
        error: 'Unauthorized - invalid token' 
      }, { status: 401 });
    }

    // SECURITY 2: Rate limiting GLOBAL + por IP
    const clientIP = req.headers.get('cf-connecting-ip') || 
                     req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    
    const now = Date.now();
    
    // Rate limit GLOBAL (100/min)
    const globalKey = 'ratelimit:global';
    if (!rateLimitCache.has(globalKey)) {
      rateLimitCache.set(globalKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    } else {
      const globalLimiter = rateLimitCache.get(globalKey);
      
      if (now > globalLimiter.resetAt) {
        rateLimitCache.set(globalKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
      } else {
        globalLimiter.count++;
        
        if (globalLimiter.count > RATE_LIMIT_MAX_REQUESTS_GLOBAL) {
          console.error('[webhookReceberEmail] ❌ SECURITY: Global rate limit exceeded', { count: globalLimiter.count });
          return Response.json({ 
            success: false, 
            error: 'Global rate limit exceeded - system under attack' 
          }, { status: 429 });
        }
      }
    }
    
    // Rate limit POR IP (20/min)
    const ipKey = `ratelimit:${clientIP}`;
    
    if (!rateLimitCache.has(ipKey)) {
      rateLimitCache.set(ipKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    } else {
      const limiter = rateLimitCache.get(ipKey);
      
      if (now > limiter.resetAt) {
        rateLimitCache.set(ipKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
      } else {
        limiter.count++;
        
        if (limiter.count > RATE_LIMIT_MAX_REQUESTS_PER_IP) {
          console.error('[webhookReceberEmail] ❌ SECURITY: IP rate limit exceeded', { ip: clientIP, count: limiter.count });
          return Response.json({ 
            success: false, 
            error: 'Too many requests from this IP' 
          }, { status: 429 });
        }
      }
    }

    // Parse multipart form data
    const formData = await req.formData();

    const to = formData.get('to');
    const from = formData.get('from');
    const subject = formData.get('subject') || 'Sem assunto';
    const text = formData.get('text') || '';
    const html = formData.get('html') || '';
    const envelope = formData.get('envelope');

    // SECURITY: Validar headers SPF/DKIM (SendGrid adiciona quando spam_check ativo)
    const spfResult = formData.get('SPF') || req.headers.get('X-SPF-Result');
    const dkimResult = formData.get('DKIM') || req.headers.get('X-DKIM-Result');

    console.log('═══════════════════════════════════════════════════');
    console.log('[webhookReceberEmail] 🚀 WEBHOOK CHAMADO!');
    console.log('[webhookReceberEmail] 📬 Email recebido:', { to, from, subject, spf: spfResult, dkim: dkimResult, ip: clientIP });
    console.log('[webhookReceberEmail] 📋 FormData keys:', Array.from(formData.keys()));
    console.log('[webhookReceberEmail] 🌐 Headers:', Object.fromEntries(req.headers.entries()));
    console.log('═══════════════════════════════════════════════════');

    // SECURITY 3: Validar SPF/DKIM - BLOQUEAR se falhar
    if (spfResult && spfResult.toLowerCase() === 'fail') {
      console.error('[webhookReceberEmail] ❌ SECURITY: SPF validation failed - BLOCKED', { 
        from, 
        to,
        spf: spfResult,
        ip: clientIP 
      });
      
      // Registrar tentativa de spoofing
      const base44 = createClientFromRequest(req);
      try {
        await base44.asServiceRole.functions.invoke('registrarIncidente', {
          modulo: 'email',
          severidade: 'alto',
          tipo_erro: 'spf_fail_blocked',
          mensagem_erro: `Email bloqueado - SPF failed: ${from} → ${to}`,
          contexto: { from, to, spf: spfResult, dkim: dkimResult, ip: clientIP }
        });
      } catch {}
      
      return Response.json({ 
        success: false, 
        error: 'Email rejected - SPF validation failed' 
      }, { status: 403 });
    }
    
    // WARN: DKIM fail (não bloqueia, mas loga)
    if (dkimResult && dkimResult.toLowerCase() === 'fail') {
      console.warn('[webhookReceberEmail] ⚠️ SECURITY: DKIM failed (não bloqueado)', { from, dkim: dkimResult });
    }

    // Extrair email do alias (ex: clinica-abc123@conectaclinica.com.br)
    const aliasEmail = to?.toLowerCase();
    
    if (!aliasEmail) {
      console.error('[webhookReceberEmail] ❌ Campo "to" vazio!');
      return Response.json({ success: false, error: 'Campo "to" não encontrado' }, { status: 400 });
    }

    // CRÍTICO: Extrair domínio do email (prevenclin.com.br, conectaclinica.com.br, etc)
    const dominio = aliasEmail.split('@')[1];
    console.log('[webhookReceberEmail] 🔍 Domínio extraído:', dominio);

    // Buscar configuração por DOMÍNIO (dkim_domain) OU alias
    const base44 = createClientFromRequest(req);
    
    // Buscar 1: Por alias exato
    let configs = await base44.asServiceRole.entities.ConfiguracaoEmail.filter({
      alias_recebimento: aliasEmail,
      ativo: true
    });
    
    // Buscar 2: Por domínio configurado (prevenclin.com.br)
    if (configs.length === 0) {
      console.log('[webhookReceberEmail] 🔄 Tentando buscar por dkim_domain:', dominio);
      configs = await base44.asServiceRole.entities.ConfiguracaoEmail.filter({
        dkim_domain: dominio,
        provedor: 'dominio_proprio'
      });
      
      // GAP 3: Se encontrou mas Inbound Parse não configurado, configurar AGORA
      if (configs.length > 0 && !configs[0].inbound_parse_configurado) {
        console.log('[webhookReceberEmail] ⚙️ AUTO-FIX: Configurando Inbound Parse para domínio próprio');
        try {
          const webhookUrl = `${Deno.env.get('BASE44_BASE_URL')}/api/apps/${Deno.env.get('BASE44_APP_ID')}/functions/webhookReceberEmail?token=${Deno.env.get('SENDGRID_WEBHOOK_VALIDATION_TOKEN')}`;
          const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
          
          const inboundRes = await fetch('https://api.sendgrid.com/v3/user/webhooks/parse/settings', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${SENDGRID_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              hostname: dominio,
              url: webhookUrl,
              spam_check: true,
              send_raw: false
            })
          });
          
          if (inboundRes.ok) {
            await base44.asServiceRole.entities.ConfiguracaoEmail.update(configs[0].id, {
              inbound_parse_configurado: true
            });
            console.log('[webhookReceberEmail] ✅ Inbound Parse auto-configurado para:', dominio);
          }
        } catch (error) {
          console.error('[webhookReceberEmail] ❌ Erro ao auto-configurar Inbound Parse:', error);
        }
      }
    }
    
    // Buscar 3: FALLBACK conectaclinica.com.br (ALIAS-BASED ROUTING)
    if (configs.length === 0 && dominio === 'conectaclinica.com.br') {
      console.log('[webhookReceberEmail] 🔄 FALLBACK alias-based routing');
      const todasConfigs = await base44.asServiceRole.entities.ConfiguracaoEmail.filter({
        ativo: true
      });
      
      // GAP 3 FIX: Parser robusto para alias com ticket ID (slug+ticket@conectaclinica)
      const localPart = aliasEmail.split('@')[0];
      const [slugBase] = localPart.split('+'); // Remove ticket ID se houver
      
      // Match por alias exato OU slug base
      configs = todasConfigs.filter(c => 
        c.alias_recebimento === aliasEmail ||
        c.alias_recebimento?.startsWith(`${slugBase}@`)
      );
      
      console.log('[webhookReceberEmail] 📊 Alias match:', {
        alias: aliasEmail,
        slugBase,
        found: configs.length,
        clinicas: configs.map(c => c.clinica_id)
      });
    }

    // AUDIT: Registrar tentativa de recebimento (DEBUG crítico)
    await base44.asServiceRole.entities.LogAuditoria.create({
      clinica_id: configs[0]?.clinica_id || null,
      tipo_operacao: 'webhook_email_recebido',
      usuario_id: 'system',
      usuario_email: 'webhook@sendgrid',
      entidade_afetada: 'EmailRecebido',
      detalhes: {
        from: fromEmail,
        to: aliasEmail,
        subject,
        dominio,
        configs_found: configs.length,
        estrategia: configs.length > 0 ? 'encontrado' : 'nenhuma_config'
      },
      sucesso: configs.length > 0
    }).catch(() => {});

    if (configs.length === 0) {
      console.error('[webhookReceberEmail] ❌ NENHUMA CONFIG para:', { to: aliasEmail, dominio });
      
      // DEBUG BRUTAL: Log TODAS as configs
      const todasConfigs = await base44.asServiceRole.entities.ConfiguracaoEmail.list();
      console.log('[webhookReceberEmail] 📊 CONFIGS EXISTENTES:', 
        todasConfigs.map(c => ({ 
          clinica: c.clinica_id?.substring(0,8), 
          alias: c.alias_recebimento, 
          domain: c.dkim_domain,
          status: c.dkim_status,
          ativo: c.ativo 
        }))
      );
      
      // Registrar email não processado para debug
      try {
        await base44.asServiceRole.entities.EmailRecebido.create({
          clinica_id: null,
          from_email: from,
          to_email: aliasEmail,
          subject: subject,
          body_text: text,
          body_html: html,
          processed: false,
          error_message: `Nenhuma config encontrada para: ${aliasEmail} (domínio: ${dominio})`
        });
      } catch {}
      
      return Response.json({ 
        success: false, 
        error: 'Config não encontrada',
        debug: {
          to: aliasEmail,
          dominio,
          configs_totais: todasConfigs.length
        }
      }, { status: 404 });
    }

    const config = configs[0];
    const clinicaId = config.clinica_id;
    console.log('[webhookReceberEmail] ✅ Config encontrada:', { id: config.id, clinica: clinicaId, alias: config.alias_recebimento });

    // Extrair email limpo (remover +tags, normalizar)
    const fromEmail = from.toLowerCase().trim();
    
    // Buscar ou criar contato - CORRIGIDO: usar emails[] array
    let contato;
    const todosContatos = await base44.asServiceRole.entities.Contato.filter({
      clinica_id: clinicaId
    });
    
    // Buscar por email dentro do array emails[]
    const contatoExistente = todosContatos.find(c => 
      c.emails?.some(e => e.email?.toLowerCase() === fromEmail)
    );

    if (contatoExistente) {
      contato = contatoExistente;
      console.log('[webhookReceberEmail] Contato encontrado:', contato.id);
    } else {
      // Criar novo contato
      const nomeParts = from.split('@')[0].split(/[._-]/);
      const nomeCompleto = nomeParts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
      
      contato = await base44.asServiceRole.entities.Contato.create({
        clinica_id: clinicaId,
        nome_completo: nomeCompleto,
        emails: [{ email: fromEmail, tipo: 'pessoal', principal: true }],
        tipo_contato: 'lead',
        status: 'prospecto',
        origem_lead: 'email_inbound'
      });
      
      console.log('[webhookReceberEmail] Novo contato criado:', contato.id);
    }

    // Gerar numero_ticket sequencial
    const ano = new Date().getFullYear();
    const ticketsAno = await base44.asServiceRole.entities.Ticket.filter({
      clinica_id: clinicaId
    });
    const ticketsDoAno = ticketsAno.filter(t => t.numero_ticket?.startsWith(`#${ano}-`));
    const proximoNumero = ticketsDoAno.length + 1;
    const numeroTicket = `#${ano}-${String(proximoNumero).padStart(4, '0')}`;

    // Criar ticket
    const ticket = await base44.asServiceRole.entities.Ticket.create({
      clinica_id: clinicaId,
      contato_id: contato.id,
      numero_ticket: numeroTicket,
      assunto: subject,
      status: 'aberto',
      prioridade: 'media',
      canal: 'email',
      solicitante_nome: contato.nome_completo,
      solicitante_email: from,
      categoria: 'duvida',
      ultima_interacao: new Date().toISOString()
    });

    console.log('[webhookReceberEmail] Ticket criado:', ticket.id, numeroTicket);

    // 🔍 CRÍTICO: Detectar RESPOSTA a ticket existente (threading)
    const messageId = formData.get('Message-ID');
    const inReplyTo = formData.get('In-Reply-To');
    const references = formData.get('References');
    
    // Tentar encontrar ticket existente por:
    // 1. Número do ticket no subject (#2025-0002)
    // 2. In-Reply-To header
    // 3. Contato + subject similar
    let ticketExistente = null;
    
    const matchNumero = subject.match(/#(\d{4}-\d{4})/);
    if (matchNumero) {
      const numeroTicketOriginal = `#${matchNumero[1]}`;
      const ticketsExistentes = await base44.asServiceRole.entities.Ticket.filter({
        clinica_id: clinicaId,
        numero_ticket: numeroTicketOriginal
      });
      ticketExistente = ticketsExistentes[0];
      
      if (ticketExistente) {
        console.log('[webhookReceberEmail] 🔗 RESPOSTA detectada - vinculando a ticket:', numeroTicketOriginal);
      }
    }
    
    // Se encontrou ticket existente = ADICIONAR MENSAGEM (não criar ticket novo)
    const ticketFinal = ticketExistente || ticket;
    
    // Criar mensagem inicial/resposta
    console.log('[webhookReceberEmail] 💬 Criando mensagem no ticket:', ticketFinal.numero_ticket);
    
    try {
      await base44.asServiceRole.entities.MensagemTicket.create({
        ticket_id: ticketFinal.id,
        clinica_id: clinicaId,
        remetente_tipo: 'cliente',
        remetente_nome: contato.nome_completo,
        remetente_email: from,
        conteudo: text || subject,
        conteudo_html: html || text || subject,
        email_headers: {
          from: from,
          to: aliasEmail,
          subject: subject,
          message_id: messageId,
          in_reply_to: inReplyTo,
          references: references,
          date: formData.get('Date') || new Date().toISOString()
        }
      });
      
      // ATUALIZAR última_interacao e status do ticket
      if (ticketExistente) {
        await base44.asServiceRole.entities.Ticket.update(ticketExistente.id, {
          ultima_interacao: new Date().toISOString(),
          status: ticketExistente.status === 'resolvido' ? 'aberto' : ticketExistente.status
        });
      }
    } catch (msgError) {
      console.warn('[webhookReceberEmail] ⚠️ Erro ao criar mensagem:', msgError.message);
      // Não bloqueia - ticket já foi criado
    }

    console.log('[webhookReceberEmail] Mensagem criada para ticket:', ticket.id);

    // Salvar referência do email original (usa ticketFinal = existente ou novo)
    await base44.asServiceRole.entities.EmailRecebido.create({
      clinica_id: clinicaId,
      config_email_id: config.id,
      ticket_id: ticketFinal.id,
      from_email: from,
      to_email: aliasEmail,
      subject: subject,
      body_text: text,
      body_html: html,
      raw_envelope: envelope || null,
      processed: true
    });

    console.log('[webhookReceberEmail] ✅ EmailRecebido registrado');
    
    // Enviar confirmação APENAS para tickets NOVOS (não respostas)
    if (config.enviar_confirmacao_automatica && !ticketExistente) {
      console.log('[webhookReceberEmail] 📤 Enviando confirmação automática');
      try {
        await base44.asServiceRole.functions.invoke('enviarEmailTicket', {
          ticket_id: ticket.id,
          tipo: 'confirmacao_criacao',
          destinatario: from
        });
      } catch (error) {
        console.warn('[webhookReceberEmail] Erro ao enviar confirmação:', error);
      }
    }
    
    // CRITICAL: Notificar equipe sobre RESPOSTAS (threading)
    if (ticketExistente && ticketExistente.atribuido_a) {
      await base44.asServiceRole.entities.Notificacao.create({
        clinica_id: clinicaId,
        user_id: ticketExistente.atribuido_a,
        tipo: 'resposta_ticket',
        titulo: '💬 Cliente respondeu ticket',
        mensagem: `${from}: ${subject.substring(0, 60)}...`,
        ticket_id: ticketExistente.id,
        link: `/Helpdesk?ticket=${ticketExistente.id}`,
        prioridade: ticketExistente.prioridade || 'media'
      }).catch(() => {});
    }

    console.log('[webhookReceberEmail] ✅ Processado:', ticketExistente ? `Resposta adicionada a ${ticketExistente.numero_ticket}` : `Ticket criado ${numeroTicket}`);

    return Response.json({
      success: true,
      ticket_id: ticketFinal.id,
      numero_ticket: ticketFinal.numero_ticket,
      tipo: ticketExistente ? 'resposta' : 'novo'
    });
  } catch (error) {
    console.error('[webhookReceberEmail] Erro crítico:', error);
    
    // Registrar incidente
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.functions.invoke('registrarIncidente', {
        modulo: 'email',
        severidade: 'critico',
        tipo_erro: 'webhook_email_falhou',
        mensagem_erro: error.message,
        stack_trace: error.stack,
        contexto: {
          to: req.headers.get('to'),
          from: req.headers.get('from')
        }
      });
    } catch {}

    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});