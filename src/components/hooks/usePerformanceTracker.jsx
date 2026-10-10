import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";

/**
 * usePerformanceTracker - Coleta automática de métricas
 * Instrumenta página e envia para backend
 * 
 * USO: Adicionar em TODAS as páginas críticas
 */
export function usePerformanceTracker(endpoint) {
  const startTime = useRef(performance.now());
  const sent = useRef(false);

  useEffect(() => {
    const collectMetrics = async () => {
      if (sent.current) return;
      sent.current = true;

      try {
        const user = await base44.auth.me().catch(() => null);
        
        // Tempo de renderização
        const renderTime = performance.now() - startTime.current;
        
        // Navigation Timing API
        const perfData = performance.getEntriesByType('navigation')[0];
        const paintEntries = performance.getEntriesByType('paint');
        
        const metrics = {
          endpoint,
          clinica_id: user?.clinica_id || null,
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
        };

        // Latência total
        if (perfData) {
          await base44.entities.MetricaPerformance.create({
            ...metrics,
            metrica_tipo: 'latencia',
            valor: perfData.loadEventEnd - perfData.fetchStart,
          }).catch(() => {});
        }

        // Tempo de render
        await base44.entities.MetricaPerformance.create({
          ...metrics,
          metrica_tipo: 'render',
          valor: renderTime,
        }).catch(() => {});

        // FCP (First Contentful Paint)
        const fcp = paintEntries.find(e => e.name === 'first-contentful-paint');
        if (fcp) {
          await base44.entities.MetricaPerformance.create({
            ...metrics,
            metrica_tipo: 'latencia',
            valor: fcp.startTime,
          }).catch(() => {});
        }

      } catch (e) {
        // Registrar erro de coleta
        console.error('[PerfTracker] Erro:', e);
      }
    };

    // Coletar após página estabilizar
    const timer = setTimeout(collectMetrics, 2000);
    return () => clearTimeout(timer);
  }, [endpoint]);

  // Error boundary tracking
  useEffect(() => {
    const handleError = async (event) => {
      try {
        const user = await base44.auth.me().catch(() => null);
        await base44.entities.MetricaPerformance.create({
          endpoint,
          clinica_id: user?.clinica_id || null,
          metrica_tipo: 'erro',
          valor: 1,
          timestamp: new Date().toISOString(),
          erro_msg: event.message,
          stack_trace: event.error?.stack,
        }).catch(() => {});
      } catch (e) {
        // Silently fail
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, [endpoint]);
}

export default usePerformanceTracker;