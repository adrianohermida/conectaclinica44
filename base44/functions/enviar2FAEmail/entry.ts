import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { enviarEmailSendGrid } from './services/emailService.js';

/**
 * CRÍTICO: Envia código 2FA por email
 * Input: { email }
 * Output: { success, codigo_hash }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email obrigatório' }, { status: 400 });
    }

    // 1. Verificar se user existe
    const users = await base44.asServiceRole.entities.User.filter({ email });
    if (users.length === 0) {
      return Response.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const user = users[0];

    // 2. Gerar código 6 dígitos
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expiraEm = new Date(Date.now() + 10 * 60 * 1000); // 10min

    // 3. Hash do código (não salvar plain)
    const encoder = new TextEncoder();
    const data = encoder.encode(codigo + user.id);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const codigoHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // 4. Salvar hash no user
    await base44.asServiceRole.entities.User.update(user.id, {
      twofa_codigo_hash: codigoHash,
      twofa_expira: expiraEm.toISOString()
    });

    // 5. Enviar email via SendGrid
    await enviarEmailSendGrid({
      base44,
      clinica_id: user.clinica_id || 'global',
      template_tipo: '2fa_codigo',
      destinatario: email,
      vars: {
        nome_usuario: user.full_name || email,
        codigo: codigo,
        validade_minutos: 10,
        email_usuario: email
      }
    });

    console.log(`[2FA] Código enviado para ${email}, expira: ${expiraEm}`);

    return Response.json({ 
      success: true,
      codigo_hash: codigoHash,
      expira_em: expiraEm.toISOString()
    });

  } catch (error) {
    console.error('[2FA] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});