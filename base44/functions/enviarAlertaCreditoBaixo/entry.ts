import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * PROATIVO: Envia email quando crédito IA < 20%
 * Chamado via mutation do MeuConsumoWidget quando detecta deficit
 * Input: { clinica_id }
 * Output: { success, email_sent }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !user.clinica_id) {
      return Response.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { clinica_id } = await req.json();

    if (clinica_id !== user.clinica_id && user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // 1. Buscar crédito atual
    const creditos = await base44.asServiceRole.entities.CreditoIA.filter({ clinica_id });
    if (creditos.length === 0) {
      return Response.json({ error: 'Crédito IA não encontrado' }, { status: 404 });
    }

    const credito = creditos[0];
    const saldoAtual = credito.saldo || 0;
    const limiteInicial = credito.limite_creditos || 100;
    const percentualRestante = (saldoAtual / limiteInicial) * 100;

    if (percentualRestante >= 20) {
      return Response.json({ 
        success: false, 
        message: 'Saldo ainda acima de 20% - email não enviado'
      });
    }

    // 2. Buscar clínica e admin emails
    const clinicas = await base44.asServiceRole.entities.Clinica.filter({ id: clinica_id });
    const clinica = clinicas[0];

    const usuarios = await base44.asServiceRole.entities.User.filter({
      clinica_id,
      role: 'admin'
    });

    if (usuarios.length === 0) {
      return Response.json({ error: 'Nenhum admin encontrado' }, { status: 404 });
    }

    // 3. Calcular projeção dias restantes
    const consumos = await base44.asServiceRole.entities.ConsumoWidgetIA.filter({
      clinica_id,
      created_date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() }
    });

    const totalConsumido30d = consumos.reduce((sum, c) => sum + (c.creditos_consumidos || 0), 0);
    const mediaDia = totalConsumido30d / 30;
    const diasRestantes = mediaDia > 0 ? Math.floor(saldoAtual / mediaDia) : 999;

    // 4. Enviar email para todos admins
    const emailPromises = usuarios.map(admin => 
      base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'ConectaClínica - Alerta de Créditos',
        to: admin.email,
        subject: `⚠️ Créditos IA Baixos - ${clinica.nome || 'Clínica'}`,
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #fef2f2; border-left: 4px solid #ea4335; padding: 20px; margin-bottom: 20px;">
              <h2 style="color: #991b1b; margin: 0 0 10px 0;">⚠️ Créditos IA Criticamente Baixos</h2>
              <p style="color: #7f1d1d; margin: 0;">Seu saldo de créditos IA está abaixo de 20%</p>
            </div>
            
            <div style="background: #ffffff; padding: 20px; border: 1px solid #e8eaed; border-radius: 8px;">
              <h3 style="color: #202124; margin-top: 0;">📊 Status Atual:</h3>
              <ul style="color: #5f6368;">
                <li><strong>Saldo Atual:</strong> ${saldoAtual.toFixed(3)} créditos</li>
                <li><strong>Percentual Restante:</strong> ${percentualRestante.toFixed(1)}%</li>
                <li><strong>Consumo Médio:</strong> ${mediaDia.toFixed(3)} créditos/dia</li>
                <li><strong>Projeção:</strong> ${diasRestantes} dias restantes</li>
              </ul>

              <div style="background: #fef9e5; border: 1px solid #fbbc04; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #956802; margin: 0; font-size: 14px;">
                  💡 <strong>Recomendação:</strong> Recarregue seus créditos agora para evitar interrupção do serviço de IA.
                </p>
              </div>

              <a href="https://conectaclinica.com.br/MeuConsumoWidget" 
                 style="display: inline-block; background: #7E57FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 10px;">
                🔋 Recarregar Créditos
              </a>
            </div>

            <p style="color: #80868b; font-size: 12px; margin-top: 20px; text-align: center;">
              Este é um alerta automático do sistema ConectaClínica
            </p>
          </div>
        `
      })
    );

    await Promise.all(emailPromises);

    // 5. Log auditoria
    await base44.asServiceRole.entities.LogAuditoria.create({
      clinica_id,
      user_id: user.id,
      acao: 'alerta_credito_baixo_enviado',
      detalhes: `Email enviado para ${usuarios.length} admins - Saldo: ${saldoAtual.toFixed(3)} (${percentualRestante.toFixed(1)}%)`,
      categoria: 'ia'
    });

    console.log(`[AlertaCreditoBaixo] ✅ Email enviado - Clínica: ${clinica_id}, Admins: ${usuarios.length}`);

    return Response.json({ 
      success: true, 
      email_sent: usuarios.length,
      saldo_atual: saldoAtual,
      percentual_restante: percentualRestante,
      dias_restantes: diasRestantes
    });

  } catch (error) {
    console.error('[AlertaCreditoBaixo] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});