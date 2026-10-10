import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * GOOGLE OAUTH CALLBACK - Recebe código OAuth e troca por tokens
 */
Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      return new Response(`
        <html>
          <body>
            <h1>Autorização cancelada</h1>
            <p>Você cancelou a conexão com o Google.</p>
            <a href="/IntegracaoGoogle">Voltar</a>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    if (!code || !state) {
      return Response.json({ error: 'Parâmetros inválidos' }, { status: 400 });
    }

    const stateData = JSON.parse(state);
    const { service, clinica_id } = stateData;

    // Trocar código por tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: Deno.env.get('GOOGLE_CLIENT_ID'),
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET'),
        redirect_uri: url.origin + '/oauth/google/callback',
        grant_type: 'authorization_code'
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[googleOAuthCallback] Token error:', errorText);
      throw new Error('Falha ao obter tokens do Google');
    }

    const tokens = await tokenResponse.json();

    // Salvar tokens criptografados no banco
    const base44 = createClientFromRequest(req);
    
    await base44.asServiceRole.entities.ConfiguracaoIntegracaoGoogle.create({
      clinica_id,
      service_id: service,
      access_token_encrypted: tokens.access_token, // TODO: criptografar
      refresh_token_encrypted: tokens.refresh_token, // TODO: criptografar
      expires_at: new Date(Date.now() + (tokens.expires_in * 1000)).toISOString(),
      scopes: tokens.scope.split(' '),
      last_sync: new Date().toISOString()
    });

    return new Response(`
      <html>
        <head>
          <style>
            body { font-family: -apple-system, sans-serif; text-align: center; padding: 50px; }
            .success { color: #34a853; font-size: 48px; }
            h1 { color: #202124; }
            a { color: #4285f4; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="success">✓</div>
          <h1>Conectado com sucesso!</h1>
          <p>Serviço <strong>${service}</strong> autorizado.</p>
          <a href="/IntegracaoGoogle">← Voltar para Integrações</a>
          <script>
            setTimeout(() => window.location.href = '/IntegracaoGoogle', 2000);
          </script>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  } catch (error) {
    console.error('[googleOAuthCallback] Erro:', error);
    return new Response(`
      <html>
        <body>
          <h1>Erro na autorização</h1>
          <p>${error.message}</p>
          <a href="/IntegracaoGoogle">Tentar novamente</a>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' },
      status: 500
    });
  }
});