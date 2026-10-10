import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { request_id } = await req.json();

    if (!request_id) {
      return Response.json({ 
        error: 'request_id obrigatório' 
      }, { status: 400 });
    }

    const apiToken = Deno.env.get('INFOSIMPLES_API_KEY');
    if (!apiToken) {
      return Response.json({ 
        error: 'INFOSIMPLES_API_KEY não configurado' 
      }, { status: 500 });
    }

    // Consultar status
    const params = new URLSearchParams({
      token: apiToken,
      request_id: request_id
    });

    const response = await fetch(
      `https://api.infosimples.com/api-async/v2/show?${params.toString()}`,
      {
        method: 'GET'
      }
    );

    const resultado = await response.json();

    return Response.json({
      success: true,
      request_id: resultado.request_id,
      status: resultado.status,
      finished: resultado.status === 'finished',
      finished_at: resultado.finished_at,
      response: resultado.response,
      resultado: resultado
    });

  } catch (error) {
    console.error('Erro ao verificar consulta assíncrona:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});