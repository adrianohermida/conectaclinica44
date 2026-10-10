import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Trigger manual do aprendizado contínuo
 * Permite execução sob demanda pelo admin
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Apenas admins podem executar' }, { status: 401 });
    }

    console.log(`[MANUAL] Aprendizado iniciado por ${user.email}`);

    // Chamar função de cron diretamente
    const resultado = await base44.asServiceRole.functions.invoke('cronAprendizadoContinuo', {});

    return Response.json({
      success: true,
      executado_por: user.email,
      timestamp: new Date().toISOString(),
      resultado: resultado.data
    });

  } catch (error) {
    console.error('[MANUAL] Erro:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});