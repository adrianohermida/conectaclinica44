import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cep } = await req.json();

    if (!cep) {
      return Response.json({ error: 'CEP obrigatório' }, { status: 400 });
    }

    // Validar formato: 8 dígitos numéricos
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) {
      return Response.json({ error: 'CEP deve ter 8 dígitos' }, { status: 400 });
    }

    // Consultar ViaCEP
    const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
    
    if (!response.ok) {
      return Response.json({ error: 'Erro ao consultar CEP' }, { status: response.status });
    }

    const data = await response.json();

    // CEP não encontrado
    if (data.erro) {
      return Response.json({ error: 'CEP não encontrado' }, { status: 404 });
    }

    // Retornar dados normalizados
    return Response.json({
      cep: data.cep,
      logradouro: data.logradouro,
      complemento: data.complemento,
      bairro: data.bairro,
      cidade: data.localidade,
      uf: data.uf,
      estado: data.estado,
      codigo_ibge: data.ibge,
      ddd: data.ddd
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});