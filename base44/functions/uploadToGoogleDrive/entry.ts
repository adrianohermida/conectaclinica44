import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * UPLOAD TO GOOGLE DRIVE - Escape hatch para clientes >10GB
 * Scope: drive.file (apenas arquivos criados pelo app)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const titulo = formData.get('titulo') || file.name;
    const pasta_id = formData.get('pasta_id');

    if (!file) {
      return Response.json({ error: 'Arquivo obrigatório' }, { status: 400 });
    }

    // Obter access token do Google Drive da configuração salva
    const configs = await base44.asServiceRole.entities.ConfiguracaoIntegracaoGoogle.filter({
      clinica_id: user.clinica_id,
      service_id: 'drive',
      ativo: true
    });

    if (configs.length === 0) {
      return Response.json({ 
        error: 'Google Drive não conectado',
        action: 'authorize_drive'
      }, { status: 403 });
    }

    let accessToken = configs[0].access_token_encrypted;

    // Verificar se token expirou
    if (new Date(configs[0].expires_at) < new Date()) {
      // Renovar token
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          refresh_token: configs[0].refresh_token_encrypted,
          client_id: Deno.env.get('GOOGLE_CLIENT_ID'),
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET'),
          grant_type: 'refresh_token'
        })
      });

      if (!refreshResponse.ok) {
        throw new Error('Falha ao renovar token do Google Drive');
      }

      const tokens = await refreshResponse.json();
      accessToken = tokens.access_token;

      // Atualizar token no banco
      await base44.asServiceRole.entities.ConfiguracaoIntegracaoGoogle.update(configs[0].id, {
        access_token_encrypted: accessToken,
        expires_at: new Date(Date.now() + (tokens.expires_in * 1000)).toISOString()
      });
    }

    // Upload para Google Drive
    const fileBuffer = await file.arrayBuffer();
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    // SANITIZAÇÃO: Rastreabilidade de origem via metadata
    const metadata = {
      name: titulo,
      mimeType: file.type,
      appProperties: {
        clinica_id: user.clinica_id,
        uploaded_by: user.email,
        source: 'conectaclinica'
      }
    };

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${file.type}\r\n\r\n` +
      new TextDecoder().decode(fileBuffer) +
      closeDelimiter;

    const driveResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartRequestBody
    });

    if (!driveResponse.ok) {
      const errorText = await driveResponse.text();
      console.error('[Google Drive] Erro:', errorText);
      return Response.json({ error: 'Erro no upload para Drive' }, { status: 500 });
    }

    const driveFile = await driveResponse.json();

    // Tornar arquivo acessível via link
    await fetch(`https://www.googleapis.com/drive/v3/files/${driveFile.id}/permissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone'
      })
    });

    const file_url = `https://drive.google.com/file/d/${driveFile.id}/view`;

    return Response.json({
      file_url,
      drive_file_id: driveFile.id,
      storage_provider: 'google_drive',
      tamanho_bytes: file.size
    });
  } catch (error) {
    console.error('[uploadToGoogleDrive] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});