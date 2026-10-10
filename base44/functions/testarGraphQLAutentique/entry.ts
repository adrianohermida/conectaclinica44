import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conector_id, query } = await req.json();
    
    // Buscar configuração do conector
    let conector;
    if (conector_id) {
      conector = await base44.asServiceRole.entities.ConectorAutentique.filter({ id: conector_id });
      conector = conector[0];
    }

    const apiKey = Deno.env.get('AUTHENTIQUE_API_KEY');
    const startTime = Date.now();

    const response = await fetch('https://api.autentique.com.br/v2/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    });

    const latencia_ms = Date.now() - startTime;

    if (!response.ok) {
      const error = await response.text();
      return Response.json({ 
        error: `Autentique API error: ${error}`,
        latencia_ms
      }, { status: response.status });
    }

    const result = await response.json();
    
    // Adicionar metadados úteis
    return Response.json({
      ...result,
      latencia_ms,
      conector_usado: conector?.nome || 'Default',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Test GraphQL Error]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});