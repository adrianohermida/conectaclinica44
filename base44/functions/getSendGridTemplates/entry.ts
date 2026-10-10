import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * SendGrid Dynamic Templates API
 * GET /v3/templates - Lista templates VISUAIS
 * Diferentes de templates de resposta locais (texto)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = Deno.env.get('SENDGRID_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'SendGrid API key not configured' }, { status: 500 });
    }

    const { page_size = 100, generations = 'legacy,dynamic' } = await req.json().catch(() => ({}));

    const params = new URLSearchParams({ 
      page_size: String(page_size),
      generations 
    });

    const response = await fetch(
      `https://api.sendgrid.com/v3/templates?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return Response.json({ 
        error: error.errors?.[0]?.message || 'Failed to fetch templates' 
      }, { status: response.status });
    }

    const data = await response.json();

    return Response.json({
      success: true,
      templates: data.result || data.templates || [],
      metadata: data.metadata || {}
    });

  } catch (error) {
    console.error('[SendGrid Templates] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});