import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conector_id, parametros } = await req.json();

    if (!conector_id) {
      return Response.json({ error: 'conector_id é obrigatório' }, { status: 400 });
    }

    // Buscar configuração do conector
    const conector = await base44.entities.Conector.get(conector_id);

    if (!conector) {
      return Response.json({ error: 'Conector não encontrado' }, { status: 404 });
    }

    // Buscar secrets do conector
    const secrets = await base44.asServiceRole.entities.SecretConector.filter({
      conector_id: conector_id,
      ativo: true
    });

    // Preparar headers
    const headers = {
      'Content-Type': 'application/json',
      ...conector.headers_padrao
    };

    // Adicionar autenticação se necessário
    if (conector.requer_autenticacao && secrets.length > 0) {
      const apiKeySecret = secrets.find(s => s.chave === 'API_KEY' || s.chave.includes('KEY'));
      
      if (apiKeySecret) {
        const apiKey = atob(apiKeySecret.valor_criptografado);
        
        if (conector.tipo_autenticacao === 'api_key') {
          headers['x-api-key'] = apiKey;
        } else if (conector.tipo_autenticacao === 'bearer') {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }
      }
    }

    // Executar requisição
    const inicio = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), conector.timeout_segundos * 1000);

    try {
      const response = await fetch(conector.endpoint_base, {
        method: conector.metodo_http,
        headers: headers,
        body: conector.metodo_http !== 'GET' ? JSON.stringify(parametros) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      const tempoResposta = Date.now() - inicio;
      const data = await response.json();

      return Response.json({
        success: response.ok,
        status: response.status,
        data: data,
        tempo_resposta_ms: tempoResposta,
        headers: Object.fromEntries(response.headers.entries())
      });

    } catch (error) {
      clearTimeout(timeoutId);
      
      return Response.json({
        success: false,
        error: {
          message: error.message,
          type: error.name
        },
        tempo_resposta_ms: Date.now() - inicio
      });
    }

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});