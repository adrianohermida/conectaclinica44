import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Google PageSpeed Insights API v5
 * Mede Core Web Vitals REAIS em production
 * 
 * CRITICAL: Só funciona em URLs públicas (não localhost)
 * Sem API key: 25 req/dia por IP
 * Com API key: 25,000 req/dia
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Qualquer usuário autenticado pode usar
    // PageSpeed só funciona em production de qualquer forma

    const { url, strategy = 'mobile' } = await req.json();

    if (!url) {
      return Response.json({ error: 'URL required' }, { status: 400 });
    }

    // Validar URL pública
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      return Response.json({ 
        error: 'PageSpeed só funciona em URLs públicas (production)', 
        hint: 'Deploy o app e use a URL real'
      }, { status: 400 });
    }

    const apiKey = Deno.env.get('PAGESPEED_API_KEY');
    
    // Build URL - Corrigido conforme documentação v5
    const params = new URLSearchParams({
      url: url,
      strategy: strategy.toUpperCase(), // 'MOBILE' or 'DESKTOP' (uppercase obrigatório)
      category: 'PERFORMANCE' // Uppercase conforme enum
    });

    if (apiKey) {
      params.append('key', apiKey);
    }

    const apiUrl = `https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`;

    console.log('[PageSpeed] Analyzing:', url, 'strategy:', strategy);

    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('[PageSpeed] API Error:', errorData);
      return Response.json({ 
        error: errorData.error?.message || 'PageSpeed API failed',
        details: errorData 
      }, { status: response.status });
    }

    const data = await response.json();

    // Extract Core Web Vitals
    const lighthouseResult = data.lighthouseResult;
    const audits = lighthouseResult.audits;

    const coreWebVitals = {
      // Field Data (Real User Metrics - 28 dias)
      fieldData: data.loadingExperience?.metrics || null,
      
      // Lab Data (Lighthouse simulado)
      labData: {
        fcp: audits['first-contentful-paint']?.numericValue || 0,
        lcp: audits['largest-contentful-paint']?.numericValue || 0,
        cls: audits['cumulative-layout-shift']?.numericValue || 0,
        tti: audits['interactive']?.numericValue || 0,
        tbt: audits['total-blocking-time']?.numericValue || 0,
        speedIndex: audits['speed-index']?.numericValue || 0
      },

      // Performance Score (0-100)
      performanceScore: lighthouseResult.categories.performance.score * 100,

      // Opportunities (sugestões de otimização)
      opportunities: lighthouseResult.audits ? Object.values(lighthouseResult.audits)
        .filter(audit => audit.details?.type === 'opportunity' && audit.score < 1)
        .map(audit => ({
          title: audit.title,
          description: audit.description,
          score: audit.score,
          savings: audit.numericValue || 0
        }))
        .slice(0, 5) : [],

      // Diagnostics
      diagnostics: {
        mainThreadTime: audits['mainthread-work-breakdown']?.numericValue || 0,
        bootupTime: audits['bootup-time']?.numericValue || 0,
        resourceSummary: audits['resource-summary']?.details?.items || []
      },

      // URL analisada
      analyzedUrl: data.id,
      strategy: strategy,
      timestamp: new Date().toISOString()
    };

    console.log('[PageSpeed] Success:', {
      score: coreWebVitals.performanceScore,
      lcp: Math.round(coreWebVitals.labData.lcp),
      fcp: Math.round(coreWebVitals.labData.fcp)
    });

    return Response.json({
      success: true,
      data: coreWebVitals,
      raw: data // Full response para debug
    });

  } catch (error) {
    console.error('[PageSpeed] Error:', error);
    return Response.json({ 
      error: error.message,
      hint: 'Verificar: 1) URL é pública? 2) PageSpeed API habilitada? 3) API key válida?'
    }, { status: 500 });
  }
});