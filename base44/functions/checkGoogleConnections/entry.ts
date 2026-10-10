import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * CHECK GOOGLE CONNECTIONS - Verifica quais serviços Google estão conectados
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !user.clinica_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Buscar configurações salvas
    const configs = await base44.asServiceRole.entities.ConfiguracaoIntegracaoGoogle.filter({
      clinica_id: user.clinica_id
    });

    const connections = {};

    for (const config of configs) {
      connections[config.service_id] = {
        connected: !!config.access_token_encrypted,
        last_sync: config.last_sync,
        dashboard_url: getDashboardUrl(config.service_id),
        scopes: config.scopes || []
      };
    }

    return Response.json({ connections });
  } catch (error) {
    console.error('[checkGoogleConnections] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function getDashboardUrl(serviceId) {
  const urls = {
    drive: 'https://drive.google.com',
    calendar: 'https://calendar.google.com',
    meet: 'https://meet.google.com',
    tasks: 'https://tasks.google.com',
    docs: 'https://docs.google.com',
    sheets: 'https://sheets.google.com',
    business: 'https://business.google.com'
  };
  return urls[serviceId] || 'https://google.com';
}