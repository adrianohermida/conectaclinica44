import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Cria agente via API direta do Base44
 * ADMIN ONLY
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Validar admin
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { agentConfig } = await req.json();

    if (!agentConfig || !agentConfig.name) {
      return Response.json({ error: 'agentConfig com name obrigatório' }, { status: 400 });
    }

    console.log('[criarAgenteProgramaticamente] Criando agente:', agentConfig.name);

    const appId = Deno.env.get('BASE44_APP_ID');
    const apiKey = Deno.env.get('BASE44_API_KEY');
    let baseUrl = Deno.env.get('BASE44_BASE_URL') || 'https://base44.app';
    if (!baseUrl.startsWith('http')) baseUrl = `https://${baseUrl}`;

    if (!appId || !apiKey) {
      return Response.json({ error: 'BASE44_APP_ID ou BASE44_API_KEY não configurados' }, { status: 500 });
    }

    // POST direto para API do Base44
    const response = await fetch(`${baseUrl}/api/apps/${appId}/agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(agentConfig)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[criarAgenteProgramaticamente] Erro API:', error);
      return Response.json({ 
        error: 'Falha ao criar agente',
        details: error,
        status: response.status
      }, { status: response.status });
    }

    const agentCriado = await response.json();
    console.log('[criarAgenteProgramaticamente] Agente criado com sucesso:', agentCriado.id || agentCriado.name);

    return Response.json({ 
      success: true,
      agent: agentCriado,
      message: `Agente ${agentConfig.name} criado com sucesso!`
    });

  } catch (error) {
    console.error('[criarAgenteProgramaticamente] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});