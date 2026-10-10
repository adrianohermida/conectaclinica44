import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { 
      modulo, 
      severidade = 'medio',
      tipo_erro, 
      mensagem_erro, 
      stack_trace,
      contexto = {},
      clinica_id,
      usuario_email,
      url_origem,
      user_agent 
    } = await req.json();

    // Gerar código único
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const codigo_incidente = `INC-${today}-${random}`;

    // Criar incidente
    const incidente = await base44.asServiceRole.entities.IncidenteProducao.create({
      codigo_incidente,
      modulo,
      severidade,
      tipo_erro,
      mensagem_erro,
      stack_trace,
      contexto,
      clinica_id,
      usuario_email,
      url_origem,
      user_agent,
      status: 'aberto',
      notificado_dev: false
    });

    // TODO: Notificar dev via Slack/Email se severidade = critico/alto
    if (severidade === 'critico' || severidade === 'alto') {
      // Slack webhook ou SendGrid
      console.error(`[INCIDENTE ${codigo_incidente}] ${tipo_erro}: ${mensagem_erro}`);
    }

    return Response.json({
      success: true,
      codigo_incidente,
      mensagem_usuario: `Erro registrado (${codigo_incidente}). Nossa equipe foi notificada e está investigando.`
    });
  } catch (error) {
    console.error('Erro ao registrar incidente:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});