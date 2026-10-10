import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // BYPASS AUTH: Storage monitor não precisa validar usuário
    const docs = await base44.asServiceRole.entities.DocumentoCompliance.list("-created_date", 10000);
    const totalBytes = docs.reduce((sum, doc) => sum + (doc.tamanho_bytes || 0), 0);

    // USAR SECRETS EXISTENTES PARA MANAGEMENT API
    const BASE44_API_KEY = Deno.env.get("BASE44_API_KEY");
    const BASE44_APP_ID = Deno.env.get("BASE44_APP_ID");
    const BASE44_BASE_URL = Deno.env.get("BASE44_BASE_URL") || "https://base44.app";

    console.log('[Storage] Secrets disponíveis:', { 
      hasApiKey: !!BASE44_API_KEY, 
      hasAppId: !!BASE44_APP_ID,
      appId: BASE44_APP_ID 
    });

    // FALLBACK APENAS PARA CALCULAR BREAKDOWN
    const docs = await base44.asServiceRole.entities.DocumentoCompliance.list();
    const totalBytesCalculado = docs.reduce((sum, doc) => sum + (doc.tamanho_bytes || 0), 0);
    const breakdown = docs.reduce((acc, doc) => {
      const tipo = doc.tipo_arquivo || 'unknown';
      if (!acc[tipo]) acc[tipo] = { count: 0, bytes: 0 };
      acc[tipo].count++;
      acc[tipo].bytes += doc.tamanho_bytes || 0;
      return acc;
    }, {});

    if (!BASE44_API_KEY || !BASE44_APP_ID) {
      console.warn('[Storage] CRÍTICO: Secrets ausentes - usando apenas cálculo local');
      return Response.json({
        success: true,
        data: {
          total_bytes: totalBytesCalculado,
          total_files: docs.length,
          total_gb: (totalBytesCalculado / (1024 ** 3)).toFixed(2),
          breakdown,
          limite_gb: 5,
          percentual_uso: ((totalBytesCalculado / (5 * 1024 ** 3)) * 100).toFixed(2),
          fonte: '⚠️ APROXIMADO (secrets ausentes)',
          timestamp: new Date().toISOString()
        }
      });
    }

    // CHAMAR MANAGEMENT API REAL
    console.log('[Storage] Chamando Management API:', `${BASE44_BASE_URL}/api/management/apps/${BASE44_APP_ID}/storage`);
    
    const response = await fetch(`${BASE44_BASE_URL}/api/management/apps/${BASE44_APP_ID}/storage`, {
      headers: {
        'Authorization': `Bearer ${BASE44_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Storage] API Error:', { status: response.status, body: errorText });
      
      return Response.json({
        success: true,
        data: {
          total_bytes: totalBytesCalculado,
          total_files: docs.length,
          total_gb: (totalBytesCalculado / (1024 ** 3)).toFixed(2),
          breakdown,
          limite_gb: 5,
          percentual_uso: ((totalBytesCalculado / (5 * 1024 ** 3)) * 100).toFixed(2),
          fonte: `⚠️ APROXIMADO (API ${response.status})`,
          timestamp: new Date().toISOString(),
          warning: errorText
        }
      });
    }

    const realData = await response.json();
    console.log('[Storage] ✅ Management API respondeu:', realData);

    return Response.json({
      success: true,
      data: {
        total_bytes: realData.total_bytes || totalBytesCalculado,
        total_files: realData.total_files || docs.length,
        total_gb: realData.total_gb || (totalBytesCalculado / (1024 ** 3)).toFixed(2),
        breakdown: realData.breakdown || breakdown,
        limite_gb: realData.limite_gb || 5,
        percentual_uso: realData.percentual_uso || ((totalBytesCalculado / (5 * 1024 ** 3)) * 100).toFixed(2),
        fonte: realData.total_bytes ? '✅ Base44 Management API (REAL)' : '⚠️ APROXIMADO (API sem storage)',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[Storage] Error:', error);
    
    // FALLBACK FINAL: sempre retornar algo válido
    try {
      const base44Fallback = createClientFromRequest(req);
      const docs = await base44Fallback.asServiceRole.entities.DocumentoCompliance.list("-created_date", 10000);
      const totalBytes = docs.reduce((sum, doc) => sum + (doc.tamanho_bytes || 0), 0);
      
      return Response.json({
        success: true,
        data: {
          total_bytes: totalBytes,
          total_files: docs.length,
          total_gb: (totalBytes / (1024 ** 3)).toFixed(2),
          fonte: 'Fallback final após erro',
          timestamp: new Date().toISOString()
        }
      });
    } catch (fallbackError) {
      return Response.json({ 
        error: error.message,
        fallback_error: fallbackError.message
      }, { status: 500 });
    }
  }
});