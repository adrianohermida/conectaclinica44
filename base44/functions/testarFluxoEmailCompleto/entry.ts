import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * TESTE BRUTAL: Simula recebimento de email como se SendGrid tivesse chamado
 * OBJETIVO: Validar se o webhook funciona PERFEITAMENTE quando chamado
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Apenas admin' }, { status: 403 });
    }

    console.log('🧪 TESTE: Simulando email recebido pelo SendGrid Inbound Parse');

    // Simular FormData do SendGrid
    const formData = new FormData();
    formData.append('to', 'prevenclin@conectaclinica.com.br');
    formData.append('from', 'teste@gmail.com');
    formData.append('subject', '[TESTE] Email de teste do diagnóstico');
    formData.append('text', 'Este é um email de teste para validar o fluxo de recebimento.');
    formData.append('html', '<p>Este é um email de teste para validar o fluxo de recebimento.</p>');

    // Chamar o webhook DIRETAMENTE (URL CORRETA: base44.app)
    const webhookUrl = `https://base44.app/api/apps/${Deno.env.get('BASE44_APP_ID')}/functions/webhookReceberEmail?token=${Deno.env.get('SENDGRID_WEBHOOK_VERIFICATION_KEY')}`;
    
    console.log('📞 Chamando webhook:', webhookUrl);

    const webhookRes = await fetch(webhookUrl, {
      method: 'POST',
      body: formData
    });

    const webhookText = await webhookRes.text();
    let webhookData;
    try {
      webhookData = JSON.parse(webhookText);
    } catch {
      webhookData = { raw: webhookText };
    }

    console.log('📥 Resposta webhook:', webhookRes.status, webhookData);

    // Verificar se EmailRecebido foi criado
    const emailsRecebidos = await base44.asServiceRole.entities.EmailRecebido.list('-created_date', 1);
    const ultimoEmail = emailsRecebidos[0];

    // Verificar se Ticket foi criado
    const ticketsRecentes = await base44.asServiceRole.entities.Ticket.list('-created_date', 1);
    const ultimoTicket = ticketsRecentes[0];

    const resultado = {
      etapa_1_webhook_chamado: true,
      etapa_2_webhook_status: webhookRes.status,
      etapa_2_webhook_ok: webhookRes.ok,
      etapa_3_webhook_response: webhookData,
      etapa_4_email_persistido: ultimoEmail?.from_email === 'teste@gmail.com',
      etapa_5_ticket_criado: ultimoTicket?.canal === 'email' && 
                              ultimoTicket?.created_date > new Date(Date.now() - 10000).toISOString(),
      
      diagnostico: webhookRes.ok ? 
        '✅ WEBHOOK FUNCIONA PERFEITAMENTE. Problema é SendGrid NÃO está chamando.' :
        `❌ WEBHOOK FALHA quando chamado. Erro: ${webhookRes.status}`,
      
      proxima_acao: webhookRes.ok ?
        'Verificar no SendGrid → Settings → Inbound Parse → Test Your Integration' :
        'Corrigir webhook antes de continuar'
    };

    console.log('\n═══════════════════════════════════');
    console.log('RESULTADO DO TESTE:');
    console.log(JSON.stringify(resultado, null, 2));
    console.log('═══════════════════════════════════\n');

    return Response.json(resultado);

  } catch (error) {
    console.error('Erro no teste:', error);
    return Response.json({ 
      error: error.message, 
      stack: error.stack,
      diagnostico: 'ERRO CRÍTICO no teste - webhook pode estar quebrado'
    }, { status: 500 });
  }
});