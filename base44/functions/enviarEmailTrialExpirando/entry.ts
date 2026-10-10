import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { enviarEmailSendGrid } from './services/emailService.js';

/**
 * Email 3 dias antes trial expirar
 * Input: { clinica_id, dias_restantes }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { clinica_id, dias_restantes } = await req.json();

    if (!clinica_id) {
      return Response.json({ error: 'clinica_id obrigatório' }, { status: 400 });
    }

    // Buscar admin
    const admins = await base44.asServiceRole.entities.User.filter({ 
      clinica_id,
      role: 'admin'
    });

    if (admins.length === 0) {
      return Response.json({ error: 'Admin não encontrado' }, { status: 404 });
    }

    const admin = admins[0];

    // Buscar clínica
    const clinicas = await base44.asServiceRole.entities.Clinica.filter({ id: clinica_id });
    const clinica = clinicas[0];

    // Link upgrade
    const linkUpgrade = `https://app.conectaclinica.com.br/GerenciarAssinatura?action=upgrade`;

    await enviarEmailSendGrid({
      base44,
      clinica_id,
      template_tipo: 'trial_expirando',
      destinatario: admin.email,
      vars: {
        nome_admin: admin.full_name || admin.email,
        clinica_nome: clinica.nome,
        dias_restantes: dias_restantes || 3,
        link_upgrade: linkUpgrade,
        planos_disponiveis: 'Starter (R$97), Profissional (R$297), Enterprise (R$497)'
      }
    });

    console.log(`[TrialExpira] Email enviado para ${admin.email}, dias: ${dias_restantes}`);

    return Response.json({ success: true });

  } catch (error) {
    console.error('[TrialExpira] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});