import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * HEALTH CHECK AUTHENTIQUE - Teste real de conectividade
 * Testa: API key, organização, créditos disponíveis, documentos
 */
Deno.serve(async (req) => {
  const startTime = Date.now();
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.role === 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const API_KEY = Deno.env.get('AUTHENTIQUE_API_KEY');
    if (!API_KEY) {
      return Response.json({ 
        status: 'error',
        error: 'AUTHENTIQUE_API_KEY não configurado' 
      }, { status: 500 });
    }

    const results = { tests: [], status: 'success', latencia_total_ms: 0 };

    // TEST 1: GraphQL Query - Organization
    try {
      const query = `
        query {
          organization {
            id
            name
            status
          }
        }
      `;

      const graphqlRes = await fetch('https://api.authentique.com/graphql', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });

      if (graphqlRes.ok) {
        const data = await graphqlRes.json();
        if (data.data?.organization) {
          results.tests.push({
            nome: 'API Key',
            status: 'pass',
            detalhes: `Organização: ${data.data.organization.name}`
          });
        } else {
          throw new Error('Organização não encontrada');
        }
      } else {
        throw new Error(`HTTP ${graphqlRes.status}`);
      }
    } catch (error) {
      results.tests.push({
        nome: 'API Key',
        status: 'fail',
        erro: error.message
      });
      results.status = 'error';
    }

    // TEST 2: Listar documentos recentes
    try {
      const query = `
        query {
          documents(limit: 5) {
            total
            data {
              id
              name
              status
              created_at
            }
          }
        }
      `;

      const graphqlRes = await fetch('https://api.authentique.com/graphql', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });

      if (graphqlRes.ok) {
        const data = await graphqlRes.json();
        const total = data.data?.documents?.total || 0;
        results.tests.push({
          nome: 'Documentos',
          status: 'pass',
          detalhes: `${total} documentos na conta`
        });
      }
    } catch (error) {
      results.tests.push({
        nome: 'Documentos',
        status: 'fail',
        erro: error.message
      });
    }

    // TEST 3: Webhook configurado (verificar se URL está salva)
    try {
      const webhookUrl = `https://${req.headers.get('host')}/api/functions/authentique/webhook`;
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

    // TEST 4: Auditoria funcionando
    try {
      const logs = await base44.asServiceRole.entities.AssinaturaDigitalLog.list('-created_date', 5);
      results.tests.push({
        nome: 'Auditoria Authentique',
        status: logs.length > 0 ? 'pass' : 'warning',
        detalhes: logs.length > 0 ? `${logs.length} assinaturas auditadas` : 'Nenhuma assinatura ainda'
      });
    } catch (error) {
      results.tests.push({
        nome: 'Auditoria Authentique',
        status: 'fail',
        erro: error.message
      });
    }

    // TEST 5: Créditos disponíveis
    try {
      const creditos = await base44.asServiceRole.entities.CreditoAssinaturaDigital.list('-created_date', 1);
      if (creditos.length > 0) {
        results.tests.push({
          nome: 'Créditos Disponíveis',
          status: creditos[0].saldo_creditos > 0 ? 'pass' : 'warning',
          detalhes: `${creditos[0].saldo_creditos} créditos restantes`
        });
      } else {
        results.tests.push({
          nome: 'Créditos Disponíveis',
          status: 'warning',
          detalhes: 'Nenhum registro de créditos'
        });
      }
    } catch (error) {
      results.tests.push({
        nome: 'Créditos Disponíveis',
        status: 'fail',
        erro: error.message
      });
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