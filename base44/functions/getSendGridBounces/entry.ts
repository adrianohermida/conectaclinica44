import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * FASE 2: Suppressions - Bounces
 * Lista emails em bounce (hard/soft)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { start_time, end_time, email } = await req.json().catch(() => ({}));
    
    const apiKey = Deno.env.get('SENDGRID_API_KEY');
    
    if (!apiKey) {
      return Response.json({ error: 'SendGrid API Key não configurada' }, { status: 400 });
    }

    // Build query params
    const params = new URLSearchParams();
    if (start_time) params.append('start_time', start_time);
    if (end_time) params.append('end_time', end_time);
    if (email) params.append('email', email);

    // PARALLEL: Fetch bounces AND spam reports
    const [bouncesResponse, spamResponse] = await Promise.all([
      fetch(`https://api.sendgrid.com/v3/suppression/bounces?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      }),
      fetch(`https://api.sendgrid.com/v3/suppression/spam_reports?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      })
    ]);

    if (!bouncesResponse.ok) {
      const error = await bouncesResponse.text();
      return Response.json({ error: `SendGrid API error: ${error}` }, { status: bouncesResponse.status });
    }

    const bounces = await bouncesResponse.json();
    const spamReports = spamResponse.ok ? await spamResponse.json() : [];

    // Merge with type tagging
    const combined = [
      ...bounces.map(b => ({ ...b, suppression_type: 'bounce' })),
      ...spamReports.map(s => ({ ...s, suppression_type: 'spam_report' }))
    ];

    return Response.json({ 
      bounces: combined,
      stats: {
        total: combined.length,
        bounces: bounces.length,
        spam_reports: spamReports.length
      }
    });

  } catch (error) {
    console.error('getSendGridBounces error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});