import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Cria um novo Dynamic Template no SendGrid
 * POST /v3/templates
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

    const { name, generation = 'dynamic' } = await req.json();

    if (!name) {
      return Response.json({ error: 'Template name required' }, { status: 400 });
    }

    const response = await fetch('https://api.sendgrid.com/v3/templates', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, generation })
    });

    if (!response.ok) {
      const error = await response.json();
      return Response.json({ 
        error: error.errors?.[0]?.message || 'Failed to create template' 
      }, { status: response.status });
    }

    const template = await response.json();

    console.log(`[SendGrid] Template created: ${template.id}`);

    return Response.json({
      success: true,
      template
    });

  } catch (error) {
    console.error('[SendGrid Template] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});