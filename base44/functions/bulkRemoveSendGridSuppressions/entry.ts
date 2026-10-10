import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Remove múltiplos emails da lista de supressão em paralelo
 * Suporta bounces e spam reports
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

    const { items } = await req.json(); // [{ email, type }, ...]

    if (!items || !Array.isArray(items)) {
      return Response.json({ error: 'Items array required' }, { status: 400 });
    }

    console.log(`[SendGrid] Bulk removing ${items.length} suppressions...`);

    // Remove em paralelo
    const results = await Promise.allSettled(
      items.map(({ email, type }) => {
        const endpoint = type === 'spam_report'
          ? `https://api.sendgrid.com/v3/suppression/spam_reports/${email}`
          : `https://api.sendgrid.com/v3/suppression/bounces/${email}`;

        return fetch(endpoint, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
      })
    );

    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`[SendGrid] Bulk remove: ${succeeded} OK, ${failed} failed`);

    return Response.json({
      success: true,
      total: items.length,
      succeeded,
      failed
    });

  } catch (error) {
    console.error('[SendGrid] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});