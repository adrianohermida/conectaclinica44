import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * REGISTRA ACESSO A DADOS SENSÍVEIS - AUDITORIA LGPD
 * Obrigatório chamar em TODA operação que toque dados de pacientes
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      entidade, 
      registro_id, 
      tipo_dado, 
      operacao, 
      justificativa 
    } = await req.json();

    // Validações brutais
    if (!entidade || !registro_id || !tipo_dado || !operacao) {
      return Response.json({ 
        error: 'Parâmetros obrigatórios: entidade, registro_id, tipo_dado, operacao' 
      }, { status: 400 });
    }

    // Justificativa obrigatória para dados de saúde
    if (tipo_dado === 'saude' && !justificativa) {
      return Response.json({ 
        error: 'Justificativa obrigatória para acesso a dados de saúde (Art. 11 LGPD)' 
      }, { status: 400 });
    }

    const ip = req.headers.get('x-forwarded-for') || 
                req.headers.get('x-real-ip') || 
                'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Registrar log
    await base44.asServiceRole.entities.LogAcessoDado.create({
      clinica_id: user.clinica_id || 'system',
      usuario_id: user.id,
      usuario_email: user.email,
      entidade,
      registro_id,
      tipo_dado,
      operacao,
      justificativa: justificativa || null,
      ip_origem: ip,
      user_agent: userAgent,
      sucesso: true,
      timestamp: new Date().toISOString()
    });

    return Response.json({ 
      status: 'logged',
      message: 'Acesso registrado com sucesso'
    });

  } catch (error) {
    // Log de falha
    try {
      const base44 = createClientFromRequest(req);
      const user = await base44.auth.me();
      await base44.asServiceRole.entities.LogAcessoDado.create({
        clinica_id: user?.clinica_id || 'system',
        usuario_id: user?.id || 'unknown',
        usuario_email: user?.email || 'unknown',
        entidade: 'unknown',
        registro_id: 'unknown',
        tipo_dado: 'identificacao',
        operacao: 'leitura',
        sucesso: false,
        motivo_falha: error.message,
        timestamp: new Date().toISOString()
      });
    } catch {}

    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});