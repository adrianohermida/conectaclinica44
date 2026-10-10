import { useEffect } from 'react';

/**
 * RedirectDebugger - Diagnóstico do problema de 33.6s em redirects
 * 
 * CRÍTICO: PageSpeed reportou múltiplos redirects consumindo 33.6s (50% do LCP mobile)
 * 
 * Causas prováveis:
 * 1. RouteGuard redirecionando auth → landing → dashboard
 * 2. Layout detectando página pública tarde demais
 * 3. Conflito entre auth states
 * 4. Base44 auth fazendo redirects internos
 */
export default function RedirectDebugger({ enabled = false }) {
  useEffect(() => {
    if (!enabled) return;

    const startTime = performance.now();
    const redirectChain = [];

    // Capturar redirects via Performance API
    const navigationEntry = performance.getEntriesByType('navigation')[0];
    
    if (navigationEntry) {
      console.group('🔍 REDIRECT DEBUGGER');
      console.log('URL atual:', window.location.href);
      console.log('Redirect count:', navigationEntry.redirectCount || 0);
      console.log('Redirect time:', Math.round(navigationEntry.redirectEnd - navigationEntry.redirectStart), 'ms');
      console.log('Type:', navigationEntry.type);
      console.log('Duration total:', Math.round(navigationEntry.duration), 'ms');
      console.groupEnd();

      // Log para ErrorLogger
      if (navigationEntry.redirectCount > 0) {
        console.error('⚠️ REDIRECT DETECTADO:', {
          count: navigationEntry.redirectCount,
          timeWasted: Math.round(navigationEntry.redirectEnd - navigationEntry.redirectStart),
          impacto: 'LCP atrasado significativamente'
        });
      }
    }

    // Monitorar history changes (SPA redirects)
    let historyLength = window.history.length;
    const checkHistory = setInterval(() => {
      if (window.history.length > historyLength) {
        console.warn('⚠️ History mudou:', {
          before: historyLength,
          after: window.history.length,
          url: window.location.pathname
        });
        historyLength = window.history.length;
      }
    }, 100);

    return () => {
      clearInterval(checkHistory);
    };
  }, [enabled]);

  return null;
}

/**
 * Recommendations para eliminar redirects:
 * 
 * 1. CRITICAL: Mover RouteGuard auth check para ANTES do Layout render
 *    - Evita carregar Layout → auth fail → redirect
 * 
 * 2. Páginas públicas devem ter auth check = false EXPLICITAMENTE
 *    - <RouteGuard requireAuth={false}> em Home
 * 
 * 3. Base44 auth.me() deve ter cache agressivo
 *    - staleTime: 15min para evitar re-checks
 * 
 * 4. Layout deve detectar public pages ANTES de qualquer render
 *    - Early return se isPublicPage
 * 
 * 5. NUNCA redirecionar dentro de useEffect
 *    - window.location.href = X cria full reload (caro)
 *    - Use <Navigate /> do react-router quando possível
 */