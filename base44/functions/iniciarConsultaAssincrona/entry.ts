import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { service, parameters, context } = await req.json();

    if (!service || !parameters) {
      return Response.json({ 
        error: 'Parâmetros obrigatórios: service, parameters' 
      }, { status: 400 });
    }

    const apiToken = Deno.env.get('INFOSIMPLES_API_KEY');
    if (!apiToken) {
      return Response.json({ 
        error: 'INFOSIMPLES_API_KEY não configurado' 
      }, { status: 500 });
    }

    // Preparar parâmetros
    const params = new URLSearchParams({
      token: apiToken,
      timeout: '3600', // 1 hora
      ...parameters
    });

    if (context) {
      params.append('context', context);
    }

    // Iniciar consulta assíncrona
    const response = await fetch(
      `https://api.infosimples.com/api-async/v2/${service}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
      }
    );

    const resultado = await response.json();

    if (resultado.status === 'error') {
      return Response.json({
        success: false,
        error: resultado.message || 'Erro ao iniciar consulta assíncrona',
        resultado: resultado
      }, { status: 200 });
    }

    return Response.json({
      success: true,
      request_id: resultado.request_id,
      status: resultado.status,
      service: resultado.service,
      requested_at: resultado.requested_at,
      time_limit: resultado.time_limit,
      resultado: resultado
    });

  } catch (error) {
    console.error('Erro ao iniciar consulta assíncrona:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});