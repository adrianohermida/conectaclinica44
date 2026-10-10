import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * 🔄 CRON DIÁRIO - Executa testes E2E e notifica se falhar
 * CONFIGURAR: Vercel Cron ou GitHub Actions scheduled
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Executar testes
    const testRes = await fetch(`${Deno.env.get('BASE44_BASE_URL')}/api/apps/${Deno.env.get('BASE44_APP_ID')}/functions/testeE2EIsolamentoCompleto`, {
      method: 'POST',
      headers: {
        'Authorization': req.headers.get('Authorization'),
        'Content-Type': 'application/json'
      },
      body: '{}'
    });

    const resultado = await testRes.json();

    // Se falhou, notificar admins
    if (resultado.failed > 0) {
      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
      
      const emailPromises = admins.map(admin => 
        base44.asServiceRole.integrations.Core.SendEmail({
          to: admin.email,
          subject: '🚨 E2E Tests FAILED - Ação Urgente',
          body: `
            <h2 style="color: #ea4335;">❌ Testes E2E Falharam</h2>
            <p><strong>Score:</strong> ${resultado.score}</p>
            <p><strong>Passaram:</strong> ${resultado.passed}</p>
            <p><strong>Falharam:</strong> ${resultado.failed}</p>
            <p><strong>Status:</strong> ${resultado.status}</p>
            
            <h3>Módulos com falha:</h3>
            <ul>
              ${resultado.suites.filter(s => s.failed > 0).map(s => 
                `<li><strong>${s.suite}:</strong> ${s.failed} teste(s) falharam</li>`
              ).join('')}
            </ul>
            
            <h3>Ações:</h3>
            <ul>
              ${resultado.recomendacoes.map(r => `<li>${r}</li>`).join('')}
            </ul>
            
            <p style="margin-top: 20px;">
              <a href="https://app.base44.com/apps/${Deno.env.get('BASE44_APP_ID')}/preview/TestesE2E" 
                 style="background: #7E57FF; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px;">
                Ver Detalhes
              </a>
            </p>
          `
        })
      );

      await Promise.all(emailPromises);

      return Response.json({
        success: true,
        test_result: resultado,
        notified: admins.length,
        message: `${admins.length} admin(s) notificados`
      });
    }

    return Response.json({
      success: true,
      test_result: resultado,
      message: 'Testes passaram - nenhuma notificação enviada'
    });
  } catch (error) {
    console.error('[cronE2EDaily] Erro:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});