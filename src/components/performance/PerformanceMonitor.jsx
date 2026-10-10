import { useEffect } from 'react';
import { logger } from '@/components/services/logService';

/**
 * Monitor de Performance - Mede Web Vitals + operações críticas
 * Objetivo: P95 < 200ms, LCP < 2.5s, FID < 100ms, CLS < 0.1
 */
export default function PerformanceMonitor() {
  useEffect(() => {
    // 1. Web Vitals
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        const lcp = lastEntry.renderTime || lastEntry.loadTime;
        
        logger.logPerformance('LCP', lcp, { 
          element: lastEntry.element?.tagName,
          url: lastEntry.url 
        });
        
        if (lcp > 2500) {
          logger.warn('LCP threshold exceeded', { lcp, threshold: 2500 });
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          const fid = entry.processingStart - entry.startTime;
          logger.logPerformance('FID', fid, { eventType: entry.name });
          
          if (fid > 100) {
            logger.warn('FID threshold exceeded', { fid, threshold: 100 });
          }
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // Cumulative Layout Shift
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        logger.logPerformance('CLS', clsValue);
        
        if (clsValue > 0.1) {
          logger.warn('CLS threshold exceeded', { cls: clsValue, threshold: 0.1 });
        }
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    }

    // 2. Navigation Timing
    if (window.performance && window.performance.timing) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const timing = window.performance.timing;
          const metrics = {
            dns: timing.domainLookupEnd - timing.domainLookupStart,
            tcp: timing.connectEnd - timing.connectStart,
            request: timing.responseStart - timing.requestStart,
            response: timing.responseEnd - timing.responseStart,
            dom: timing.domContentLoadedEventEnd - timing.domLoading,
            load: timing.loadEventEnd - timing.navigationStart,
            total: timing.loadEventEnd - timing.fetchStart
          };
          
          logger.info('Page load metrics', metrics);
          
          if (metrics.total > 3000) {
            logger.warn('Slow page load', metrics);
          }
        }, 0);
      });
    }

    // 3. Memory usage (se disponível)
    if ('memory' in performance) {
      const checkMemory = () => {
        const memory = performance.memory;
        const usedMB = memory.usedJSHeapSize / 1048576;
        const totalMB = memory.totalJSHeapSize / 1048576;
        const limitMB = memory.jsHeapSizeLimit / 1048576;
        
        logger.debug('Memory usage', {
          used_mb: usedMB.toFixed(2),
          total_mb: totalMB.toFixed(2),
          limit_mb: limitMB.toFixed(2),
          usage_pct: ((usedMB / limitMB) * 100).toFixed(2)
        });
        
        if (usedMB > limitMB * 0.8) {
          logger.warn('High memory usage', { used_mb: usedMB, limit_mb: limitMB });
        }
      };
      
      checkMemory();
      const memoryInterval = setInterval(checkMemory, 60000); // A cada minuto
      
      return () => clearInterval(memoryInterval);
    }
  }, []);

  return null;
}

/**
 * HOC para medir performance de componentes
 */
export function withPerformanceTracking(Component, componentName) {
  return function PerformanceTrackedComponent(props) {
    useEffect(() => {
      const startTime = performance.now();
      
      return () => {
        const duration = performance.now() - startTime;
        logger.logPerformance(`Component: ${componentName}`, duration, {
          type: 'component_render'
        });
      };
    }, []);

    return <Component {...props} />;
  };
}

/**
 * Hook para medir operações assíncronas
 */
export function usePerformanceTracker(operationName) {
  return {
    start: () => {
      const startTime = performance.now();
      return () => {
        const duration = performance.now() - startTime;
        logger.logPerformance(operationName, duration);
        return duration;
      };
    }
  };
}