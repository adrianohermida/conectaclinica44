import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * CRON DIÁRIO: Alerta clínicas com deficit créditos
 * Envia email SuperAdmin quando clínica tem saldo <20%
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // 1. Buscar todos créditos IA
    const creditos = await base44.asServiceRole.entities.CreditoIA.list();

    const alertas = [];

    for (const credito of creditos) {
      const percentualSaldo = (credito.saldo / credito.saldo_total) * 100;

      // Deficit: saldo <20%
      if (percentualSaldo < 20 && credito.saldo > 0) {
        alertas.push({
          clinica_id: credito.clinica_id,
          saldo: credito.saldo,
          saldo_total: credito.saldo_total,
          percentual: percentualSaldo,
          status: percentualSaldo < 5 ? 'CRÍTICO' : 'ALERTA'
        });

        // Email para admin da clínica
        try {
          const users = await base44.asServiceRole.entities.User.filter({
            role: 'admin'
          });

          const clinicaUser = users.find(u => u.clinica_id === credito.clinica_id);

          if (clinicaUser?.email) {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: clinicaUser.email,
              subject: `🚨 ALERTA: Créditos IA em ${percentualSaldo.toFixed(0)}%`,
              body: `
Olá,

Seu saldo de créditos IA está crítico:

📊 Saldo atual: ${credito.saldo.toFixed(2)} créditos
📉 Percentual: ${percentualSaldo.toFixed(1)}%
⏰ Situação: ${percentualSaldo < 5 ? 'CRÍTICO - Recarregue HOJE' : 'BAIXO - Recarregar em breve'}

Sem créditos, a Auto-Resposta IA será desativada automaticamente.

👉 Recarregue agora: https://app.conectaclinica.com.br/MeuConsumoWidget

Atenciosamente,
Sistema ConectaClínica
              `
            });
          }
        } catch (emailError) {
          console.error('[AlertaDeficit] Erro enviar email:', emailError);
        }
      }
    }

    // 2. Email consolidado para SuperAdmin
    if (alertas.length > 0) {
      const emailBody = `
RELATÓRIO DIÁRIO: CLÍNICAS EM DEFICIT

Total alertas: ${alertas.length}

${alertas.map(a => `
• Clínica: ${a.clinica_id.substring(0, 12)}
  Saldo: ${a.saldo.toFixed(2)} / ${a.saldo_total.toFixed(2)} (${a.percentual.toFixed(1)}%)
  Status: ${a.status}
`).join('\n')}

Ação necessária: Monitorar receita vs. consumo, contatar clínicas críticas.
      `;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: 'contato@aetherlab.com.br',
        subject: `🚨 ${alertas.length} clínicas em deficit de créditos`,
        body: emailBody
      });
    }

    console.log(`[AlertaDeficit] ✅ Processado - ${alertas.length} alertas enviados`);

    return Response.json({ 
      success: true,
      alertas_enviados: alertas.length,
      detalhes: alertas
    });

  } catch (error) {
    console.error('[AlertaDeficit] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});