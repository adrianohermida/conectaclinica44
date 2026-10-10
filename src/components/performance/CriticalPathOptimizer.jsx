/**
 * Critical Path Optimizer
 * 
 * Estratégia para FCP < 1.5s:
 * 1. Inline CSS crítico no <head>
 * 2. Defer scripts não essenciais
 * 3. Preload fonts e assets críticos
 * 4. Resource hints (preconnect, dns-prefetch)
 */

export const inlineCriticalCSS = () => {
  // CSS mínimo para primeira renderização (skeleton + header)
  return `
    <style id="critical-css">
      *{box-sizing:border-box;margin:0;padding:0}
      body{
        font-family:-apple-system,sans-serif;
        background:#F4F7FA;
        color:#202124;
        overflow-x:hidden;
      }
      .skeleton{
        background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);
        background-size:200% 100%;
        animation:shimmer 1.5s infinite;
      }
      @keyframes shimmer{
        0%{background-position:200% 0}
        100%{background-position:-200% 0}
      }
      .critical-header{
        height:64px;
        background:#fff;
        border-bottom:1px solid #e8eaed;
        display:flex;
        align-items:center;
        padding:0 16px;
      }
    </style>
  `;
};

export const resourceHints = () => {
  return `
    <!-- DNS Prefetch para APIs externas -->
    <link rel="dns-prefetch" href="https://base44.app" />
    
    <!-- Preconnect para Base44 API (CRITICAL) -->
    <link rel="preconnect" href="https://base44.app" crossorigin />
    
    <!-- Preload de fonts críticos (se houver) -->
    <link rel="preload" href="/fonts/dm-sans.woff2" as="font" type="font/woff2" crossorigin />
  `;
};

export const deferNonCriticalScripts = () => {
  return {
    analytics: 'defer',
    chatWidget: 'defer',
    notificationCenter: 'defer',
    serviceWorker: 'defer'
  };
};

/**
 * Priority Loading Strategy
 * 
 * CRITICAL (FCP): Header + Skeleton
 * HIGH (LCP): Conteúdo principal + Hero
 * MEDIUM: Sidebar + Navigation
 * LOW: Footer + Chat + Notifications
 */
export const loadingPriority = {
  critical: ['header', 'skeleton', 'auth'],
  high: ['main-content', 'hero', 'dashboard-stats'],
  medium: ['sidebar', 'navigation', 'breadcrumbs'],
  low: ['footer', 'chat-widget', 'notifications', 'analytics']
};