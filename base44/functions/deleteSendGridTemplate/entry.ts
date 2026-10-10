import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Deleta um Dynamic Template
 * DELETE /v3/templates/{template_id}
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

    const { template_id } = await req.json();

    if (!template_id) {
      return Response.json({ error: 'Template ID required' }, { status: 400 });
    }

    const response = await fetch(`https://api.sendgrid.com/v3/templates/${template_id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      return Response.json({ 
        error: error.errors?.[0]?.message || 'Failed to delete template' 
      }, { status: response.status });
    }

    console.log(`[SendGrid] Template deleted: ${template_id}`);

    return Response.json({
      success: true,
      template_id
    });

  } catch (error) {
    console.error('[SendGrid Delete] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});