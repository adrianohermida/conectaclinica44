import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Remove email da lista de supressão (bounce ou spam report)
 * DELETE /v3/suppression/{type}/{email}
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = Deno.env.get('SENDGRID_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'SendGrid API key not configured' }, { status: 500 });
    }

    const { email, type } = await req.json();

    if (!email || !type) {
      return Response.json({ error: 'Email and type required' }, { status: 400 });
    }

    const endpoint = type === 'spam_report'
      ? `https://api.sendgrid.com/v3/suppression/spam_reports/${email}`
      : `https://api.sendgrid.com/v3/suppression/bounces/${email}`;

    const response = await fetch(endpoint, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      return Response.json({ 
        success: false,
        error: error.errors?.[0]?.message || 'Failed to remove suppression' 
      }, { status: response.status });
    }

    console.log(`[SendGrid] Removed ${type}: ${email}`);

    return Response.json({
      success: true,
      email,
      type
    });

  } catch (error) {
    console.error('[SendGrid] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});