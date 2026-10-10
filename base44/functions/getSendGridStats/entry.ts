import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * GET SENDGRID STATS - Busca estatísticas REAIS da API
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
    if (!SENDGRID_API_KEY) {
      return Response.json({ summary: { requests: 0, delivered: 0, opens: 0, clicks: 0 } });
    }

    // Últimos 7 dias
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const res = await fetch(
      `https://api.sendgrid.com/v3/stats?start_date=${startDate}&end_date=${endDate}&aggregated_by=day`,
      { headers: { Authorization: `Bearer ${SENDGRID_API_KEY}` } }
    );

    if (!res.ok) {
      return Response.json({ summary: { requests: 0, delivered: 0, opens: 0, clicks: 0 } });
    }

    const data = await res.json();
    
    // Agregar totais
    const summary = data.reduce((acc, day) => {
      const stats = day.stats[0]?.metrics || {};
      return {
        requests: acc.requests + (stats.requests || 0),
        delivered: acc.delivered + (stats.delivered || 0),
        opens: acc.opens + (stats.unique_opens || 0),
        clicks: acc.clicks + (stats.unique_clicks || 0)
      };
    }, { requests: 0, delivered: 0, opens: 0, clicks: 0 });

    // Calcular taxas
    summary.delivery_rate = summary.requests > 0 
      ? ((summary.delivered / summary.requests) * 100).toFixed(1) 
      : 0;
    summary.open_rate = summary.delivered > 0 
      ? ((summary.opens / summary.delivered) * 100).toFixed(1) 
      : 0;
    summary.click_rate = summary.opens > 0 
      ? ((summary.clicks / summary.opens) * 100).toFixed(1) 
      : 0;

    return Response.json({ summary, daily: data });

  } catch (error) {
    return Response.json({ 
      summary: { requests: 0, delivered: 0, opens: 0, clicks: 0 },
      error: error.message 
    }, { status: 500 });
  }
});