import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * ROTEAMENTO INTELIGENTE: Decide se ticket vai para IA ou humano
 * HARD BLOCK: Valida créditos ANTES de invocar autoRespostaIA
 * COMPLIANCE: Registra consumo widget para analytics
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { ticket_id, conteudo_inicial } = await req.json();

    if (!ticket_id) {
      return Response.json({ error: 'ticket_id obrigatório' }, { status: 400 });
    }

    // BUSCAR TICKET
    const tickets = await base44.asServiceRole.entities.Ticket.filter({ id: ticket_id });
    if (!tickets || tickets.length === 0) {
      return Response.json({ error: 'Ticket não encontrado' }, { status: 404 });
    }
    const ticket = tickets[0];

    // CRITICAL P0: Validar créditos ANTES de invocar IA
    const creditos = await base44.asServiceRole.entities.CreditoIA.filter({ 
      clinica_id: ticket.clinica_id 
    });
    
    const saldo = creditos.length > 0 ? creditos[0].saldo_creditos : 0;
    
    if (saldo < 1) {
      console.warn(`[ROTEAMENTO] Créditos insuficientes - saldo: ${saldo}`);
      
      // FALLBACK: Ticket vai para atendimento humano
      await base44.asServiceRole.entities.Ticket.update(ticket.id, {
        status: 'aberto',
        assignee_id: null,
        observacoes: `⚠️ IA bloqueada - Créditos insuficientes (saldo: ${saldo})`
      });
      
      // NOTIFICAR ADMIN: Créditos esgotados
      const admins = await base44.asServiceRole.entities.UsuarioClinica.filter({
        clinica_id: ticket.clinica_id,
        perfil: 'admin',
        ativo: true
      }) || [];
      
      for (const admin of admins) {
        await base44.asServiceRole.entities.NotificacaoSistema.create({
          clinica_id: ticket.clinica_id,
          tipo: 'credito_baixo',
          destinatario_id: admin.user_id,
          destinatario_email: admin.user_email,
          titulo: '🚨 Widget Bloqueado - Sem Créditos IA',
          corpo: `Ticket ${ticket.numero_ticket} aguardando atendimento. Saldo: ${saldo} créditos. Recarregue agora!`,
          acao_url: '/RecargaCreditos',
          prioridade: 'urgente'
        });
      }
      
      return Response.json({ 
        rota: 'humano', 
        reason: 'creditos_insuficientes',
        saldo_restante: saldo
      });
    }

    // HEURÍSTICA: Decisão IA vs Humano
    const palavrasUrgencia = ['urgente', 'emergência', 'agora', 'socorro'];
    const temUrgencia = palavrasUrgencia.some(p => conteudo_inicial.toLowerCase().includes(p));
    
    if (temUrgencia) {
      // ROTA: Humano (urgência médica)
      await base44.asServiceRole.entities.Ticket.update(ticket.id, {
        status: 'aberto',
        prioridade: 'urgente',
        assignee_id: null
      });
      
      return Response.json({ rota: 'humano', reason: 'urgencia_detectada' });
    }

    // ROTA: IA (query simples) + COBRANÇA
    await base44.asServiceRole.entities.Ticket.update(ticket.id, {
      status: 'aguardando'
    });

    // INVOCAR AUTO-RESPOSTA IA (cobra 1 crédito internamente)
    const response = await base44.asServiceRole.functions.invoke('autoRespostaIA', {
      ticket_id: ticket.id
    });

    // REGISTRAR CONSUMO WIDGET (analytics)
    await base44.asServiceRole.entities.ConsumoWidgetIA.create({
      clinica_id: ticket.clinica_id,
      ticket_id: ticket.id,
      tipo_interacao: 'auto_resposta',
      creditos_consumidos: 1,
      sucesso: response.data?.success || false,
      metadata: {
        tempo_resposta_ms: response.data?.tempo_resposta_ms,
        conversation_id: response.data?.conversation_id
      }
    });

    return Response.json({ 
      rota: 'ia', 
      resposta: response.data,
      creditos_cobrados: 1,
      saldo_restante: saldo - 1
    });

  } catch (error) {
    console.error('[ROTEAMENTO] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});