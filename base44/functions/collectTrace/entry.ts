import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);

    const trace = await req.json();

    // Atualizar RouteNode com métricas reais
    const nodes = await base44.asServiceRole.entities.RouteNode.filter({ path: trace.path });
    
    if (nodes.length > 0) {
      const node = nodes[0];
      
      // Agregar erros
      let errorScore = node.score_error || 0;
      if (trace.event_type === 'error') {
        errorScore = errorScore + 1;
      }
      
      const updated = await base44.asServiceRole.entities.RouteNode.update(node.id, {
        tti_ms: trace.tti_ms || node.tti_ms,
        inp_ms: trace.inp_ms || node.inp_ms,
        visits_30d: (node.visits_30d || 0) + 1,
        score_perf: trace.tti_ms ? (trace.tti_ms < 2000 ? 90 : trace.tti_ms < 3000 ? 70 : 50) : node.score_perf,
        score_error: errorScore
      });

      return Response.json({ 
        success: true, 
        updated: updated.id,
        event_type: trace.event_type,
        error_aggregated: trace.event_type === 'error'
      });
    }

    return Response.json({ success: true, skipped: 'node_not_found' });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});