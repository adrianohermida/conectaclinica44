import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Mescla tickets duplicados em um único ticket MASTER
 * - Preserva TODAS as mensagens (MensagemTicket)
 * - Preserva TODAS as notas internas (NotaInterna)
 * - Marca tickets antigos como MERGED
 * - Registra auditoria completa
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!ticket_master_id || !tickets_duplicados_ids || tickets_duplicados_ids.length === 0) {
      return Response.json({ 
        error: 'ticket_master_id e tickets_duplicados_ids obrigatórios' 
      }, { status: 400 });
    }

    // 1. Buscar ticket master
    const ticketMaster = await base44.asServiceRole.entities.Ticket
      .filter({ id: ticket_master_id })
      .then(t => t[0]);

    if (!ticketMaster) {
      return Response.json({ error: 'Ticket master não encontrado' }, { status: 404 });
    }

    // 2. Buscar tickets duplicados
    const ticketsDuplicados = await base44.asServiceRole.entities.Ticket
      .filter({ id: { $in: tickets_duplicados_ids } });

    if (ticketsDuplicados.length === 0) {
      return Response.json({ error: 'Nenhum ticket duplicado encontrado' }, { status: 404 });
    }

    // VALIDAÇÃO MULTI-TENANT CRÍTICA
    const todasClinicas = [ticketMaster.clinica_id, ...ticketsDuplicados.map(t => t.clinica_id)];
    const clinicasUnicas = [...new Set(todasClinicas)];
    
    if (clinicasUnicas.length > 1) {
      return Response.json({ 
        error: 'SECURITY: Não é possível mesclar tickets de clínicas diferentes' 
      }, { status: 403 });
    }
    
    if (user.role !== 'admin' && clinicasUnicas[0] !== user.clinica_id) {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // 3. Migrar mensagens dos tickets duplicados para o master
    for (const ticketDup of ticketsDuplicados) {
      const mensagens = await base44.asServiceRole.entities.MensagemTicket
        .filter({ ticket_id: ticketDup.id });

      for (const msg of mensagens) {
        await base44.asServiceRole.entities.MensagemTicket.update(msg.id, {
          ticket_id: ticket_master_id
        });
      }

      // Migrar notas internas
      const notas = await base44.asServiceRole.entities.NotaInterna
        .filter({ ticket_id: ticketDup.id });

      for (const nota of notas) {
        await base44.asServiceRole.entities.NotaInterna.update(nota.id, {
          ticket_id: ticket_master_id
        });
      }
    }

    // 4. Adicionar nota no ticket master sobre o merge
    await base44.asServiceRole.entities.NotaInterna.create({
      clinica_id: ticketMaster.clinica_id,
      ticket_id: ticket_master_id,
      autor_id: user.id,
      autor_nome: user.full_name,
      tipo: 'alerta',
      conteudo: `🔗 MERGE: Mesclado com ${ticketsDuplicados.length} ticket(s) duplicado(s):\n${
        ticketsDuplicados.map(t => `- ${t.numero_ticket} (${t.assunto})`).join('\n')
      }\nMotivo: ${motivo || 'Duplicata detectada'}`,
      visivel_apenas_equipe: true
    });

    // 5. Atualizar tickets duplicados para status MERGED (fechado)
    for (const ticketDup of ticketsDuplicados) {
      await base44.asServiceRole.entities.Ticket.update(ticketDup.id, {
        status: 'fechado',
        tags: [...(ticketDup.tags || []), 'merged', `merged_to_${ticket_master_id}`],
        data_fechamento: new Date().toISOString()
      });

      // Adicionar nota no ticket duplicado
      await base44.asServiceRole.entities.NotaInterna.create({
        clinica_id: ticketDup.clinica_id,
        ticket_id: ticketDup.id,
        autor_id: user.id,
        autor_nome: user.full_name,
        tipo: 'alerta',
        conteudo: `🔗 Ticket mesclado com ${ticketMaster.numero_ticket}. Todo o histórico foi transferido.`,
        visivel_apenas_equipe: true
      });
    }

    // 6. Log auditoria
    await base44.asServiceRole.entities.LogAuditoria.create({
      clinica_id: ticketMaster.clinica_id,
      usuario_id: user.id,
      usuario_nome: user.full_name,
      acao: 'merge_tickets',
      entidade: 'Ticket',
      entidade_id: ticket_master_id,
      detalhes: {
        tickets_merged: tickets_duplicados_ids,
        motivo,
        mensagens_migradas: ticketsDuplicados.length,
        timestamp: new Date().toISOString()
      }
    }).catch(() => {}); // Falhar silenciosamente se LogAuditoria não existir

    return Response.json({
      success: true,
      ticket_master_id,
      tickets_merged: ticketsDuplicados.length,
      mensagens_migradas: ticketsDuplicados.reduce((acc, t) => acc + (t.mensagens?.length || 0), 0)
    });

  } catch (error) {
    console.error('[Merge Tickets] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});