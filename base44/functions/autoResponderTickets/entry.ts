import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * CRON JOB: Auto-responde tickets aguardando há >5min
 * Trigger: A cada 5 minutos via cron
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Buscar tickets aguardando há >5min (baseado em ultima_interacao)
    const cincominAtrás = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const ticketsAguardando = await base44.asServiceRole.entities.Ticket.filter({
      status: 'aguardando',
      ultima_interacao: { $lt: cincominAtrás }
    }, '-ultima_interacao', 10);

    console.log(`[AutoResponder] ${ticketsAguardando.length} tickets aguardando >5min`);

    const resultados = [];

    for (const ticket of ticketsAguardando) {
      try {
        // Verificar se clínica tem IA ativa
        const agentes = await base44.asServiceRole.entities.AgenteIAClinica.filter({
          clinica_id: ticket.clinica_id,
          ativo: true
        });

        if (!agentes.length) {
          console.log(`[AutoResponder] Clínica ${ticket.clinica_id} sem IA ativa`);
          continue;
        }

        // Processar com IA (modo automático)
        const response = await fetch(`${Deno.env.get('BASE44_BASE_URL')}/functions/processarTicketComIA`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.get('Authorization')
          },
          body: JSON.stringify({
            ticket_id: ticket.id,
            modo: 'automatico',
            forcar_resposta: true
          })
        });

        const resultado = await response.json();
        
        resultados.push({
          ticket_id: ticket.id,
          numero_ticket: ticket.numero_ticket,
          success: resultado.success,
          erro: resultado.error || null
        });

        console.log(`[AutoResponder] Ticket #${ticket.numero_ticket}: ${resultado.success ? '✅' : '❌'}`);

      } catch (error) {
        console.error(`[AutoResponder] Erro ticket ${ticket.id}:`, error);
        resultados.push({
          ticket_id: ticket.id,
          success: false,
          erro: error.message
        });
      }
    }

    return Response.json({
      success: true,
      processados: resultados.length,
      detalhes: resultados
    });

  } catch (error) {
    console.error('[AutoResponder] Erro fatal:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});