import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * TESTE E2E: Simula recebimento de email via webhook
 * Valida: Email → Ticket → Clinica correta
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const { to, from, subject, text, html } = await req.json();
    
    if (!to || !from) {
      return Response.json({ error: 'to, from obrigatórios' }, { status: 400 });
    }

    console.log('[testarRecebimentoEmail] 🧪 Iniciando teste:', { to, from });

    // Simular payload SendGrid Inbound Parse
    const formData = new FormData();
    formData.append('to', to);
    formData.append('from', from);
    formData.append('subject', subject || 'Teste E2E');
    formData.append('text', text || 'Corpo do email de teste');
    formData.append('html', html || text || '<p>Corpo do email de teste</p>');
    formData.append('SPF', 'pass'); // Simular SPF OK
    formData.append('DKIM', 'pass');

    // Chamar webhook
    const webhookUrl = `${Deno.env.get('BASE44_BASE_URL')}/api/apps/${Deno.env.get('BASE44_APP_ID')}/functions/webhookReceberEmail?token=${Deno.env.get('SENDGRID_WEBHOOK_VALIDATION_TOKEN')}`;
    
    console.log('[testarRecebimentoEmail] 📤 Chamando webhook:', webhookUrl);
    
    const webhookRes = await fetch(webhookUrl, {
      method: 'POST',
      body: formData
    });

    const webhookData = await webhookRes.json();
    
    console.log('[testarRecebimentoEmail] 📥 Resposta webhook:', webhookData);

    if (!webhookRes.ok) {
      return Response.json({
        success: false,
        error: 'Webhook falhou',
        webhook_response: webhookData,
        status: webhookRes.status
      });
    }

    // Validar ticket criado
    if (webhookData.ticket_id) {
      const tickets = await base44.asServiceRole.entities.Ticket.filter({
        id: webhookData.ticket_id
      });
      
      const ticket = tickets[0];
      
      if (!ticket) {
        return Response.json({
          success: false,
          error: 'Ticket não encontrado após criação',
          ticket_id: webhookData.ticket_id
        });
      }

      // Buscar clínica
      const clinicas = await base44.asServiceRole.entities.Clinica.filter({
        id: ticket.clinica_id
      });
      
      const clinica = clinicas[0];

      return Response.json({
        success: true,
        ticket: {
          id: ticket.id,
          numero: ticket.numero_ticket,
          status: ticket.status,
          clinica_id: ticket.clinica_id,
          clinica_nome: clinica?.nome
        },
        webhook_response: webhookData
      });
    }

    return Response.json({
      success: true,
      webhook_response: webhookData
    });

  } catch (error) {
    console.error('[testarRecebimentoEmail] ❌ Erro:', error);
    return Response.json({ 
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});