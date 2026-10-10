import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * DIAGNÓSTICO: Validar se o token do secret bate com o esperado
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Apenas admin' }, { status: 403 });
    }

    const url = new URL(req.url);
    const tokenTeste = url.searchParams.get('token');
    const tokenSecret = Deno.env.get('SENDGRID_WEBHOOK_VERIFICATION_KEY');

    console.log('🔍 VALIDAÇÃO DE TOKEN:');
    console.log('Token do Secret (primeiros 88 chars):', tokenSecret?.substring(0, 190) + '...');
    console.log('Token Enviado (primeiros 88 chars):', tokenTeste?.substring(0, 190) + '...');
    console.log('São iguais?', tokenSecret === tokenTeste);
    console.log('Tamanho do secret:', tokenSecret?.length);
    console.log('Tamanho do enviado:', tokenTeste?.length);

    return Response.json({
      token_secret_existe: !!tokenSecret,
      token_secret_primeiros_50: tokenSecret?.substring(0, 190),
      token_enviado_primeiros_50: tokenTeste?.substring(0, 190),
      sao_iguais: tokenSecret === tokenTeste,
      tamanho_secret: tokenSecret?.length,
      tamanho_enviado: tokenTeste?.length,
      diagnostico: tokenSecret === tokenTeste 
        ? '✅ TOKEN CORRETO - problema é em outro lugar'
        : '❌ TOKEN ERRADO - atualize o secret SENDGRID_WEBHOOK_VERIFICATION_KEY'
    });

  } catch (error) {
    return Response.json({ 
      error: error.message, 
      stack: error.stack 
    }, { status: 500 });
  }
});