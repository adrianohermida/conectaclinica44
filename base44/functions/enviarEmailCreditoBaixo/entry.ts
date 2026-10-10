import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { enviarEmailSendGrid } from './services/emailService.js';

/**
 * Alerta: Créditos IA abaixo de 10%
 * Input: { clinica_id, saldo_atual, percentual }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { clinica_id, saldo_atual, percentual } = await req.json();

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
    const clinicas = await base44.asServiceRole.entities.Clinica.filter({ id: clinica_id });
    const clinica = clinicas[0];

    // Calcular dias restantes (estimativa 10 msgs/dia)
    const diasRestantes = Math.floor(saldo_atual / 10);

    // Link recarga
    const linkRecarga = `https://app.conectaclinica.com.br/RecargaCreditos`;

    await enviarEmailSendGrid({
      base44,
      clinica_id,
      template_tipo: 'credito_baixo',
      destinatario: admin.email,
      vars: {
        nome_admin: admin.full_name || admin.email,
        clinica_nome: clinica.nome,
        saldo_atual: saldo_atual || 0,
        percentual: Math.round(percentual || 0),
        dias_restantes: diasRestantes,
        link_recarga: linkRecarga,
        valor_recarga: 'R$ 900,00 (100 créditos)'
      }
    });

    console.log(`[CreditoBaixo] Email enviado para ${admin.email}, saldo: ${saldo_atual}`);

    return Response.json({ success: true });

  } catch (error) {
    console.error('[CreditoBaixo] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});