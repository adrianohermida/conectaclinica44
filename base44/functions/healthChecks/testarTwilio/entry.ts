import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * HEALTH CHECK TWILIO - Teste real de conectividade WhatsApp
 * Testa: Account SID, Auth Token, número configurado, mensagens enviadas
 */
Deno.serve(async (req) => {
  const startTime = Date.now();
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.role === 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    const FROM_NUMBER = Deno.env.get('TWILIO_WHATSAPP_NUMBER');

    const results = { tests: [], status: 'success', latencia_total_ms: 0 };

    // TEST 1: Credenciais configuradas
    results.tests.push({
      nome: 'Credenciais',
      status: (ACCOUNT_SID && AUTH_TOKEN && FROM_NUMBER) ? 'pass' : 'fail',
      detalhes: `SID: ${ACCOUNT_SID ? '✓' : '✗'}, Token: ${AUTH_TOKEN ? '✓' : '✗'}, Number: ${FROM_NUMBER ? '✓' : '✗'}`
    });

    if (!ACCOUNT_SID || !AUTH_TOKEN) {
      results.status = 'error';
      results.latencia_total_ms = Date.now() - startTime;
      return Response.json(results);
    }

    // TEST 2: Validar account (API call real)
    try {
      const accountRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}.json`,
        {
          headers: {
            'Authorization': 'Basic ' + btoa(`${ACCOUNT_SID}:${AUTH_TOKEN}`)
          }
        }
      );

      if (accountRes.ok) {
        const account = await accountRes.json();
        results.tests.push({
          nome: 'Account Twilio',
          status: 'pass',
          detalhes: `Status: ${account.status}, Tipo: ${account.type}`
        });
      } else {
        throw new Error(`HTTP ${accountRes.status}`);
      }
    } catch (error) {
      results.tests.push({
        nome: 'Account Twilio',
        status: 'fail',
        erro: error.message
      });
      results.status = 'error';
    }

    // TEST 3: Últimas mensagens enviadas
    try {
      const messagesRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json?PageSize=10`,
        {
          headers: {
            'Authorization': 'Basic ' + btoa(`${ACCOUNT_SID}:${AUTH_TOKEN}`)
          }
        }
      );

      if (messagesRes.ok) {
        const data = await messagesRes.json();
        const whatsappMsgs = data.messages?.filter(m => m.from?.includes('whatsapp')) || [];
        results.tests.push({
          nome: 'Mensagens WhatsApp',
          status: 'pass',
          detalhes: `${whatsappMsgs.length} mensagens encontradas`
        });
      }
    } catch (error) {
      results.tests.push({
        nome: 'Mensagens WhatsApp',
        status: 'fail',
        erro: error.message
      });
    }

    // TEST 4: Webhook configurado
    try {
      const webhookUrl = `https://${req.headers.get('host')}/api/functions/whatsapp/webhook`;
      results.tests.push({
        nome: 'Webhook URL',
        status: 'info',
        detalhes: webhookUrl
      });
    } catch (error) {
      results.tests.push({
        nome: 'Webhook URL',
        status: 'fail',
        erro: error.message
      });
    }

    // TEST 5: Auditoria funcionando
    try {
      const consumos = await base44.asServiceRole.entities.ConsumoRecurso.filter({
        recurso: 'whatsapp_mensagem_recebida'
      }, '-created_date', 5);
      
      results.tests.push({
        nome: 'Auditoria Twilio',
        status: consumos.length > 0 ? 'pass' : 'warning',
        detalhes: consumos.length > 0 ? `${consumos.length} mensagens auditadas` : 'Nenhuma mensagem auditada ainda'
      });
    } catch (error) {
      results.tests.push({
        nome: 'Auditoria Twilio',
        status: 'fail',
        erro: error.message
      });
    }

    // TEST 6: Envio real (se solicitado)
    const { testar_envio, numero_destino } = await req.json().catch(() => ({}));
    
    if (testar_envio && numero_destino) {
      try {
        const params = new URLSearchParams({
          To: `whatsapp:${numero_destino}`,
          From: `whatsapp:${FROM_NUMBER}`,
          Body: '✅ Teste de conectividade Twilio - ConectaClínica'
        });

        const sendRes = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': 'Basic ' + btoa(`${ACCOUNT_SID}:${AUTH_TOKEN}`),
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params.toString()
          }
        );

        if (sendRes.ok) {
          const msg = await sendRes.json();
          results.tests.push({
            nome: 'Envio Real WhatsApp',
            status: 'pass',
            detalhes: `Mensagem ${msg.sid} enviada para ${numero_destino}`
          });
        } else {
          const error = await sendRes.text();
          throw new Error(error);
        }
      } catch (error) {
        results.tests.push({
          nome: 'Envio Real WhatsApp',
          status: 'fail',
          erro: error.message
        });
        results.status = 'error';
      }
    }

    results.latencia_total_ms = Date.now() - startTime;
    results.timestamp = new Date().toISOString();

    return Response.json(results);

  } catch (error) {
    return Response.json({ 
      status: 'error',
      error: error.message,
      latencia_total_ms: Date.now() - startTime
    }, { status: 500 });
  }
});