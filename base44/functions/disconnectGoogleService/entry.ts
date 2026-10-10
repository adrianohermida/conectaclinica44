import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * DISCONNECT GOOGLE SERVICE - Remove autorização de um serviço Google
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !user.clinica_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { service } = await req.json();

    if (!service) {
      return Response.json({ error: 'Serviço não especificado' }, { status: 400 });
    }

    // Buscar configuração
    const configs = await base44.asServiceRole.entities.ConfiguracaoIntegracaoGoogle.filter({
      clinica_id: user.clinica_id,
      service_id: service
    });

    if (configs.length === 0) {
      return Response.json({ error: 'Serviço não conectado' }, { status: 404 });
    }

    // Revogar no Google (opcional - tokens expiram automaticamente)
    const config = configs[0];
    if (config.access_token_encrypted) {
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${config.access_token_encrypted}`, {
          method: 'POST'
        });
      } catch (err) {
        console.warn('[disconnectGoogleService] Revogação falhou (token pode já estar expirado):', err.message);
      }
    }

    // Deletar configuração
    await base44.asServiceRole.entities.ConfiguracaoIntegracaoGoogle.delete(config.id);

    return Response.json({ success: true, service });
  } catch (error) {
    console.error('[disconnectGoogleService] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});