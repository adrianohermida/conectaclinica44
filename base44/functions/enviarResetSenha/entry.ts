import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { enviarEmailSendGrid } from './services/emailService.js';
import { withRateLimit } from './middleware/rateLimiter.js';

/**
 * CRÍTICO: Envia email recuperação senha (magic link)
 * Input: { email }
 * Output: { success, token, expira_em }
 * RATE LIMIT: 20 requests/min/IP
 */
Deno.serve(withRateLimit(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email obrigatório' }, { status: 400 });
    }

    // 1. Verificar se user existe
    const users = await base44.asServiceRole.entities.User.filter({ email });
    if (users.length === 0) {
      // NÃO informar que email não existe (segurança)
      return Response.json({ 
        success: true, 
        message: 'Se o email existir, você receberá instruções'
      });
    }

    const user = users[0];

    // 2. Gerar token seguro (1h validade)
    const token = crypto.randomUUID();
    const expiraEm = new Date(Date.now() + 60 * 60 * 1000); // 1h

    // 3. Salvar token no user (campo temporário)
    await base44.asServiceRole.entities.User.update(user.id, {
      reset_token: token,
      reset_token_expira: expiraEm.toISOString()
    });

    // 4. Gerar link reset
    const origin = req.headers.get('origin') || 'https://app.conectaclinica.com.br';
    const linkReset = `${origin}/RecuperarSenha?token=${token}`;

    // 5. Enviar email via SendGrid
    await enviarEmailSendGrid({
      base44,
      clinica_id: user.clinica_id || 'global',
      template_tipo: 'reset_senha',
      destinatario: email,
      vars: {
        nome_usuario: user.full_name || email,
        link_reset: linkReset,
        validade: '1 hora',
        email_usuario: email
      }
    });

    console.log(`[ResetSenha] Token enviado para ${email}, expira: ${expiraEm}`);

    return Response.json({ 
      success: true,
      message: 'Email de recuperação enviado',
      expira_em: expiraEm.toISOString()
    });

  } catch (error) {
    console.error('[ResetSenha] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}, 20)); // 20 req/min (senha é sensível)