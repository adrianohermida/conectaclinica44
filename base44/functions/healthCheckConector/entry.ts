import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { conector_id } = await req.json();

    if (!conector_id) {
      return Response.json({ error: 'conector_id é obrigatório' }, { status: 400 });
    }

    // Buscar o conector
    const conector = await base44.asServiceRole.entities.Conector.filter({ id: conector_id });
    
    if (!conector || conector.length === 0) {
      return Response.json({ error: 'Conector não encontrado' }, { status: 404 });
    }

    const conn = conector[0];

    // Tentar fazer uma requisição básica ao endpoint
    const startTime = Date.now();
    let status = 'online';
    let statusCode = 0;
    let responseTime = 0;
    let errorMessage = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), (conn.timeout_segundos || 30) * 1000);

      const response = await fetch(conn.endpoint_base, {
        method: 'GET',
        headers: conn.headers_padrao || {},
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      statusCode = response.status;
      responseTime = Date.now() - startTime;

      // Considerar sucesso se não for erro de servidor ou cliente crítico
      if (statusCode >= 200 && statusCode < 500) {
        status = 'online';
      } else {
        status = 'offline';
        errorMessage = `HTTP ${statusCode}`;
      }

    } catch (error) {
      responseTime = Date.now() - startTime;
      status = 'offline';
      
      if (error.name === 'AbortError') {
        errorMessage = 'Timeout';
      } else {
        errorMessage = error.message;
      }
    }

    // Salvar resultado do health check
    await base44.asServiceRole.entities.TesteAPI.create({
      conector_id: conn.id,
      conector_nome: conn.nome,
      tipo_teste: 'health_check',
      parametros_enviados: { endpoint: conn.endpoint_base },
      resposta_recebida: { status, statusCode, responseTime, errorMessage },
      status_http: statusCode,
      sucesso: status === 'online',
      tempo_resposta_ms: responseTime,
      erro_mensagem: errorMessage,
      ambiente: 'production'
    });

    return Response.json({
      success: true,
      conector_id: conn.id,
      conector_nome: conn.nome,
      status,
      statusCode,
      responseTime,
      errorMessage,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro no health check:', error);
    return Response.json({ 
      error: 'Erro ao executar health check',
      details: error.message 
    }, { status: 500 });
  }
});