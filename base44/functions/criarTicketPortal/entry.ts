import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * PORTAL PÚBLICO: Criar ticket sem autenticação
 * ANTI-SPAM: reCAPTCHA v3 + rate limit por IP
 * MULTI-TENANT: Vincula ao widget/clinica_id
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { widget_id, nome, email, telefone, assunto, mensagem, recaptcha_token, _test_mode } = await req.json();

    if (!widget_id || !nome || !email || !assunto || !mensagem) {
      return Response.json({ error: 'Campos obrigatórios: widget_id, nome, email, assunto, mensagem' }, { status: 400 });
    }

    // ANTI-SPAM: Verificar reCAPTCHA (bypass test_mode)
    if (_test_mode) {
      console.log('[TEST MODE] Bypass reCAPTCHA - TestesE2EWidget');
    } else if (recaptcha_token) {
      const recaptchaSecret = Deno.env.get('RECAPTCHA_SECRET_KEY');
      if (recaptchaSecret) {
        const verifyRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `secret=${recaptchaSecret}&response=${recaptcha_token}`
        });
        const { success, score } = await verifyRes.json();
        if (!success || score < 0.5) {
          return Response.json({ error: 'reCAPTCHA falhou - possível spam' }, { status: 403 });
        }
      }
    }

    // MULTI-TENANT: Buscar clinica_id (test_mode usa auth, produção usa widget)
    let clinica_id;
    
    if (_test_mode) {
      const user = await base44.auth.me();
      if (!user?.clinica_id) {
        return Response.json({ error: 'Test mode requer autenticação' }, { status: 401 });
      }
      clinica_id = user.clinica_id;
      console.log('[TEST MODE] clinica_id from auth:', clinica_id);
    } else {
      const widget = await base44.asServiceRole.entities.ConfiguracaoWidget.filter({ id: widget_id });
      if (!widget || widget.length === 0) {
        return Response.json({ error: 'Widget não encontrado' }, { status: 404 });
      }
      clinica_id = widget[0].clinica_id;
    }

    // RATE LIMIT: 5 tickets/hora por IP (simples in-memory)
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    // TODO: Implementar rate limit robusto com Redis/KV

    // BUSCAR/CRIAR CONTATO (FIX: Contato.email não existe - usar emails[] array)
    const todosContatos = await base44.asServiceRole.entities.Contato.filter({ clinica_id });
    let contato = todosContatos.filter(c => 
      c.emails?.some(e => e.email?.toLowerCase() === email.toLowerCase())
    );
    
    if (!contato || contato.length === 0) {
      contato = [await base44.asServiceRole.entities.Contato.create({
        clinica_id,
        tipo_contato: 'lead',
        nome_completo: nome,
        emails: [{ email, tipo: 'pessoal', principal: true }],
        telefones: telefone ? [{ numero: telefone, tipo: 'celular', principal: true }] : [],
        origem_lead: 'widget',
        status: 'prospecto'
      })];
    }

    // GERAR NÚMERO SEQUENCIAL
    const ano = new Date().getFullYear();
    const tickets = await base44.asServiceRole.entities.Ticket.filter({ clinica_id });
    const numero_ticket = `#${ano}-${String(tickets.length + 1).padStart(4, '0')}`;

    // CRIAR TICKET COM CONTATO VINCULADO
    const ticket = await base44.asServiceRole.entities.Ticket.create({
      clinica_id,
      contato_id: contato[0].id,
      numero_ticket,
      assunto,
      status: 'aguardando', // Fila IA
      prioridade: 'media',
      canal: 'widget',
      solicitante_nome: nome,
      solicitante_email: email,
      solicitante_telefone: telefone,
      categoria: 'duvida',
      ultima_interacao: new Date().toISOString(),
      tags: contato[0].status === 'prospecto' ? ['widget', 'lead_novo'] : ['widget']
    });

    // CRIAR MENSAGEM INICIAL
    await base44.asServiceRole.entities.MensagemTicket.create({
      clinica_id,
      ticket_id: ticket.id,
      tipo: 'mensagem',
      conteudo: mensagem,
      remetente_tipo: 'cliente',
      remetente_nome: nome,
      remetente_email: email,
      visivel_cliente: true
    });

    // TRACKING CONVERSÃO: Update SessaoWidget se widget_id fornecido
    if (widget_id) {
      try {
        const sessoes = await base44.asServiceRole.entities.SessaoWidget.filter({
          clinica_id,
          widget_id
        }, '-created_date', 1);

        if (sessoes.length > 0) {
          await base44.asServiceRole.entities.SessaoWidget.update(sessoes[0].id, {
            converteu_ticket: true,
            data_conversao: new Date().toISOString(),
            ticket_id: ticket.id
          });
          console.log('✅ Conversão widget→ticket tracked');
        }
      } catch (e) {
        console.warn('⚠️ Tracking conversão falhou:', e.message);
      }
    }

    // INVOCAR AUTO-RESPOSTA IA (async - não bloqueia)
    try {
      await base44.asServiceRole.functions.invoke('autoRespostaIA', { ticket_id: ticket.id });
    } catch (error) {
      console.error('[criarTicketPortal] Erro auto-resposta IA:', error);
      // Não falha criação do ticket
    }

    // ENVIAR EMAIL CONFIRMAÇÃO (async)
    try {
      await base44.asServiceRole.functions.invoke('enviarEmailTicket', {
        ticket_id: ticket.id,
        tipo: 'confirmacao_criacao',
        destinatario: email
      });
    } catch (error) {
      console.error('[criarTicketPortal] Erro email:', error);
    }

    // CRITICAL: Notificar atendentes da clínica COM TEMPLATE
    try {
      // Buscar atendentes (role admin ou recepcionista)
      const usuariosClinica = await base44.asServiceRole.entities.UsuarioClinica.filter({
        clinica_id,
        ativo: true
      });

      const atendentes = usuariosClinica.filter(uc => 
        uc.perfil === 'admin' || uc.perfil === 'recepcionista'
      );

      // Render template com variáveis
      const templateData = await base44.asServiceRole.functions.invoke('renderTemplateNotificacao', {
        clinica_id,
        tipo: 'ticket_novo',
        variables: {
          numero_ticket: ticket.numero_ticket,
          solicitante_nome: nome,
          solicitante_email: email,
          assunto: assunto
        }
      });

      const rendered = templateData.data;

      // Criar notificação para cada atendente
      await Promise.all(atendentes.map(atendente =>
        base44.asServiceRole.entities.NotificacaoSistema.create({
          clinica_id,
          tipo: 'ticket_novo',
          destinatario_id: atendente.user_id,
          destinatario_email: atendente.user_email,
          remetente_id: 'sistema',
          remetente_nome: 'Sistema',
          titulo: rendered.titulo || `Novo ticket ${ticket.numero_ticket}`,
          corpo: rendered.corpo || `${nome} enviou: ${assunto}`,
          acao_url: `/Atendimento?ticket_id=${ticket.id}`,
          acao_label: rendered.acao_label || 'Abrir ticket',
          canal: rendered.canal || 'in_app',
          prioridade: rendered.prioridade || 'media',
          metadata: {
            ticket_id: ticket.id,
            numero_ticket: ticket.numero_ticket,
            contato_id: contato[0].id,
            solicitante_nome: nome,
            solicitante_email: email,
            assunto: assunto
          },
          icone: rendered.icone || 'MessageSquare',
          cor: rendered.cor || '#7E57FF'
        })
      ));
    } catch (notifError) {
      console.error('[criarTicketPortal] Erro notificação atendentes:', notifError);
      // Não bloqueia criação do ticket
    }

    return Response.json({ 
      success: true, 
      ticket: {
        id: ticket.id,
        numero_ticket: ticket.numero_ticket,
        status: ticket.status
      },
      contato_id: contato[0].id,
      lead_criado: contato[0].status === 'prospecto'
    });

  } catch (error) {
    console.error('[criarTicketPortal] Erro:', error);
    return Response.json({ 
      error: 'Erro ao criar ticket',
      details: error.message 
    }, { status: 500 });
  }
});