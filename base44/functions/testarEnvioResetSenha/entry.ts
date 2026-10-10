import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * TESTE: Enviar email reset senha REAL via SendGrid
 * Valida fluxo completo: emailService.js → TemplateSendGrid → SendGrid API
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Apenas SuperAdmin' }, { status: 401 });
    }

    const { email_teste } = await req.json();
    const emailDestino = email_teste || user.email;

    console.log(`[TesteResetSenha] Testando envio para: ${emailDestino}`);

    // Chamar enviarResetSenha (function real)
    const response = await base44.functions.invoke('enviarResetSenha', {
      email: emailDestino
    });

    console.log('[TesteResetSenha] Resultado:', response.data);

    if (response.data.success) {
      return Response.json({
        success: true,
        message: `✅ Email enviado com sucesso para ${emailDestino}`,
        detalhes: response.data
      });
    } else {
      throw new Error(response.data.error || 'Envio falhou');
    }

  } catch (error) {
    console.error('[TesteResetSenha] Erro:', error);
    return Response.json({ 
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});