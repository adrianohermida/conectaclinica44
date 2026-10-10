import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * DIAGNÓSTICO: Verifica se agente existe antes de usar
 * ADMIN ONLY
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { agent_name } = await req.json();

    if (!agent_name) {
      return Response.json({ error: 'agent_name obrigatório' }, { status: 400 });
    }

    console.log(`[validarExistenciaAgente] Verificando: ${agent_name}`);

    const appId = Deno.env.get('BASE44_APP_ID');
    const apiKey = Deno.env.get('BASE44_API_KEY');
    let baseUrl = Deno.env.get('BASE44_BASE_URL') || 'https://base44.app';
    if (!baseUrl.startsWith('http')) baseUrl = `https://${baseUrl}`;

    if (!appId || !apiKey) {
      return Response.json({ error: 'Secrets não configurados' }, { status: 500 });
    }

    // GET /api/apps/{appId}/agents
    const response = await fetch(`${baseUrl}/api/apps/${appId}/agents`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      return Response.json({ 
        error: 'Falha ao listar agentes',
        details: error,
        status: response.status
      }, { status: response.status });
    }

    const agents = await response.json();
    const agenteExiste = agents.some(a => a.name === agent_name);

    console.log(`[validarExistenciaAgente] Agentes disponíveis:`, agents.map(a => a.name));
    console.log(`[validarExistenciaAgente] ${agent_name} existe:`, agenteExiste);

    return Response.json({ 
      existe: agenteExiste,
      agent_name,
      agentes_disponiveis: agents.map(a => a.name),
      total_agentes: agents.length
    });

  } catch (error) {
    console.error('[validarExistenciaAgente] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});