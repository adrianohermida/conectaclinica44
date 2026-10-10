import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * DEPRECATED: Use gov/consultarCertidao.js com cache
 * Mantido para compatibilidade - delegar para wrapper
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cnpj, cpf, birthdate } = await req.json();

    // DELEGAR para wrapper com cache
    const resultado = await base44.asServiceRole.functions.invoke('gov/consultarCertidao', {
      tipo: 'receita_federal',
      cnpj,
      cpf,
      birthdate
    });

    return Response.json(resultado.data);

  } catch (error) {
    console.error('Erro na função obterCertidaoReceitaFederal:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});