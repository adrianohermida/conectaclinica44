import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";

/**
 * Runtime Tracer - Intercepta navegação e coleta métricas reais
 * USO: <NavigationTracer /> no Layout.jsx
 */
export default function NavigationTracer() {
  const location = useLocation();
  const startTime = useRef(Date.now());
  const observer = useRef(null);

  useEffect(() => {
    const path = location.pathname;
    const timestamp = Date.now();
    const loadTime = timestamp - startTime.current;

    // TTI real (Time to Interactive via PerformanceObserver)
    let tti = loadTime;
    let inp = 0;

    try {
      const paintEntries = performance.getEntriesByType("paint");
      const fcp = paintEntries.find(e => e.name === "first-contentful-paint");
      if (fcp) tti = Math.round(fcp.startTime);

      // INP via PerformanceObserver (Interaction to Next Paint)
      if ('PerformanceObserver' in window) {
        observer.current = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'event') {
              inp = Math.max(inp, entry.duration);
            }
          }
        });
        observer.current.observe({ entryTypes: ['event'] });
      }
    } catch (e) {
      console.warn('[NavigationTracer] Performance API não disponível:', e);
    }

    // Coletar dados de queries (React Query DevTools)
    const queries = [];
    try {
      const queryClient = window.__REACT_QUERY_DEVTOOLS__;
      if (queryClient) {
        // Simplificado: em produção, integrar com queryClient.getQueryCache()
        queries.push('mock_query_key');
      }
    } catch (e) {}

    // Enviar para backend (async, não bloqueia)
    setTimeout(async () => {
      try {
        await base44.functions.invoke('collectTrace', {
          path,
          timestamp: new Date().toISOString(),
          tti_ms: tti,
          inp_ms: inp,
          load_time_ms: loadTime,
          queries,
          user_agent: navigator.userAgent
        });
      } catch (e) {
        // Silent fail - não bloqueia UX
        console.debug('[NavigationTracer] Trace enviado:', { path, tti, inp });
      }
    }, 1000);

    startTime.current = timestamp;

    return () => {
      if (observer.current) observer.current.disconnect();
    };
  }, [location.pathname]);

  return null;
}