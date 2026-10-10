import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * HEALTH CHECK SENDGRID - Teste real de conectividade
 * Testa: API key, domínios verificados, senders, templates
 */
Deno.serve(async (req) => {
  const startTime = Date.now();
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.role === 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
    if (!SENDGRID_API_KEY) {
      return Response.json({ 
        status: 'error',
        error: 'SENDGRID_API_KEY não configurado' 
      }, { status: 500 });
    }

    const results = { tests: [], status: 'success', latencia_total_ms: 0 };

    // TEST 1: API Key válida
    try {
      const res = await fetch('https://api.sendgrid.com/v3/user/profile', {
        headers: { Authorization: `Bearer ${SENDGRID_API_KEY}` }
      });
      
      if (res.ok) {
        const profile = await res.json();
        results.tests.push({
          nome: 'API Key',
          status: 'pass',
          detalhes: `Conta: ${profile.username}`
        });
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (error) {
      results.tests.push({
        nome: 'API Key',
        status: 'fail',
        erro: error.message
      });
      results.status = 'error';
    }

    // TEST 2: Domínios autenticados
    try {
      const res = await fetch('https://api.sendgrid.com/v3/whitelabel/domains', {
        headers: { Authorization: `Bearer ${SENDGRID_API_KEY}` }
      });
      
      if (res.ok) {
        const domains = await res.json();
        const verificados = domains.filter(d => d.valid === true);
        results.tests.push({
          nome: 'Domínios Autenticados',
          status: verificados.length > 0 ? 'pass' : 'warning',
          detalhes: `${verificados.length} domínios verificados`
        });
      }
    } catch (error) {
      results.tests.push({
        nome: 'Domínios Autenticados',
        status: 'fail',
        erro: error.message
      });
    }

    // TEST 3: Verified Senders
    try {
      const res = await fetch('https://api.sendgrid.com/v3/verified_senders', {
        headers: { Authorization: `Bearer ${SENDGRID_API_KEY}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        const verificados = data.results?.filter(s => s.verified === true) || [];
        results.tests.push({
          nome: 'Senders Verificados',
          status: verificados.length > 0 ? 'pass' : 'warning',
          detalhes: `${verificados.length} senders verificados`
        });
      }
    } catch (error) {
      results.tests.push({
        nome: 'Senders Verificados',
        status: 'fail',
        erro: error.message
      });
    }

    // TEST 4: Templates disponíveis
    try {
      const res = await fetch('https://api.sendgrid.com/v3/templates?generations=dynamic&page_size=10', {
        headers: { Authorization: `Bearer ${SENDGRID_API_KEY}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        results.tests.push({
          nome: 'Templates',
          status: 'pass',
          detalhes: `${data.result?.length || 0} templates disponíveis`
        });
      }
    } catch (error) {
      results.tests.push({
        nome: 'Templates',
        status: 'fail',
        erro: error.message
      });
    }

    // TEST 5: Auditoria funcionando
    try {
      const logs = await base44.asServiceRole.entities.SendGridAuditoria.list('-created_date', 5);
      results.tests.push({
        nome: 'Auditoria SendGrid',
        status: logs.length > 0 ? 'pass' : 'warning',
        detalhes: logs.length > 0 ? `${logs.length} envios auditados` : 'Nenhum email auditado ainda'
      });
    } catch (error) {
      results.tests.push({
        nome: 'Auditoria SendGrid',
        status: 'fail',
        erro: error.message
      });
    }

    // TEST 6: Envio real de teste
    const { testar_envio } = await req.json().catch(() => ({ testar_envio: false }));
    
    if (testar_envio) {
      try {
        const emailTeste = {
          personalizations: [{
            to: [{ email: user.email }],
            subject: '[TESTE] Health Check SendGrid'
          }],
          from: { 
            email: 'noreply@conectaclinica.com.br', 
            name: 'ConectaClínica Health Check' 
          },
          content: [{
            type: 'text/html',
            value: '<h2>✅ SendGrid Funcionando</h2><p>Este é um email de teste automático.</p>'
          }]
        };

        const envioRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SENDGRID_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(emailTeste)
        });

        results.tests.push({
          nome: 'Envio Real de Teste',
          status: envioRes.ok ? 'pass' : 'fail',
          detalhes: envioRes.ok ? `Email enviado para ${user.email}` : `HTTP ${envioRes.status}`
        });

        if (!envioRes.ok) results.status = 'error';
      } catch (error) {
        results.tests.push({
          nome: 'Envio Real de Teste',
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