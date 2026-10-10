import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_uri } = await req.json();

    // Gerar signed URL com expiração de 1h
    const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri,
      expires_in: 3600
    });

    return Response.json({ 
      success: true,
      signed_url
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});