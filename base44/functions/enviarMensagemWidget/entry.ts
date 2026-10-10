import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Envia mensagem via widget de chat
 * Cria ticket automaticamente na primeira mensagem
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { clinica_id, session_id, nome, email, telefone, assunto, conteudo } = await req.json();

    // CRÍTICO: clinica_id DEVE vir do payload (widget passa explicitamente)
    if (!clinica_id) {
      return Response.json({ 
        error: 'clinica_id obrigatório no payload' 
      }, { status: 400 });
    }

    // VALIDAÇÃO ANTI-SPOOFING: Verificar se clínica existe
    const clinicas = await base44.asServiceRole.entities.Clinica.list();
    const clinica = clinicas.find(c => c.id === clinica_id);

    if (!clinica) {
      return Response.json({ 
        error: 'Clínica inválida' 
      }, { status: 403 });
    }

    // OPCIONAL: Origin header como validação secundária (não primária)
    const origin = req.headers.get('origin') || req.headers.get('referer');
    if (origin && clinica.subdomain) {
      const requestDomain = new URL(origin).hostname;
      if (requestDomain !== clinica.subdomain && !requestDomain.includes('base44.com')) {
        console.warn(`⚠️ Origin mismatch: ${requestDomain} != ${clinica.subdomain}`);
        // Não bloqueia, apenas loga (permite localhost e base44.com)
      }
    }

    if (!session_id || !conteudo) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    console.log('[WIDGET] Mensagem recebida:', { session_id, nome, clinica_id });

    // Buscar ticket existente para esta sessão
    let tickets = await base44.asServiceRole.entities.Ticket.filter({ 
      tags: session_id,
      clinica_id 
    });

    let ticket;
    if (tickets.length === 0) {
      // Criar novo ticket
      const ano = new Date().getFullYear();
      const countTickets = await base44.asServiceRole.entities.Ticket.filter({ clinica_id });
      const numeroSequencial = String(countTickets.length + 1).padStart(4, '0');

      ticket = await base44.asServiceRole.entities.Ticket.create({
        clinica_id,
        numero_ticket: `#${ano}-${numeroSequencial}`,
        assunto: assunto || `Chat Widget - ${nome || 'Visitante'}`,
        status: 'aberto',
        prioridade: 'media',
        canal: 'widget',
        solicitante_nome: nome || 'Visitante',
        solicitante_email: email || '',
        solicitante_telefone: telefone || '',
        categoria: 'duvida',
        tags: [session_id, 'widget', email ? 'identificado' : 'anonimo']
      });

      console.log('[WIDGET] Ticket criado:', ticket.numero_ticket);
    } else {
      ticket = tickets[0];
    }

    // Salvar mensagem do cliente
    const novaMensagem = await base44.asServiceRole.entities.MensagemTicket.create({
      ticket_id: ticket.id,
      clinica_id,
      remetente_tipo: 'cliente',
      remetente_nome: nome || 'Visitante',
      remetente_email: email || '',
      conteudo
    });

    // NOTIFICAR equipe (via backend function)
    try {
      await base44.asServiceRole.functions.invoke('notificarNovoTicket', {
        ticket_id: ticket.id,
        clinica_id
      });
    } catch (notifError) {
      console.error('[WIDGET] Erro notificação:', notifError);
    }

    // Atualizar status do ticket se estava resolvido
    if (ticket.status === 'resolvido' || ticket.status === 'fechado') {
      await base44.asServiceRole.entities.Ticket.update(ticket.id, { status: 'aberto' });
    }

    // CRITICAL P0: Validar créditos ANTES de invocar IA
    const configWidget = await base44.asServiceRole.entities.ConfiguracaoWidget.filter({ 
      clinica_id 
    });
    
    const iaAtiva = configWidget.length > 0 && configWidget[0].ia_ativa;
    
    if (iaAtiva) {
      // Verificar créditos antes de auto-resposta
      const creditos = await base44.asServiceRole.entities.CreditoIA.filter({ clinica_id });
      const saldo = creditos.length > 0 ? creditos[0].saldo_creditos : 0;
      
      if (saldo < 1) {
        console.warn(`[WIDGET] Créditos insuficientes clinica ${clinica_id} - saldo: ${saldo}`);
        // NÃO invocar IA - ticket fica aguardando atendimento humano
      } else {
        // ROTEAMENTO INTELIGENTE (IA primeiro) - COM COBRANÇA
        try {
          await base44.asServiceRole.functions.invoke('roteamentoInteligente', {
            ticket_id: ticket.id,
            conteudo_inicial: conteudo
          });
        } catch (roteamentoError) {
          console.error('[WIDGET] Erro roteamento:', roteamentoError);
        }
      }
    }

    return Response.json({ 
      success: true,
      ticket_id: ticket.id,
      ticket_numero: ticket.numero_ticket
    });

  } catch (error) {
    console.error('[WIDGET] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});