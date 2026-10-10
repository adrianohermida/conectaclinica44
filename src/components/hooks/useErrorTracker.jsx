import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * useErrorTracker - Hook para capturar erros via ErrorBoundary
 * Integra com collectTrace para agregação por rota
 */
export function useErrorTracker(componentName) {
  useEffect(() => {
    const handleError = (error, errorInfo) => {
      // Dev only
      if (!import.meta.env.DEV) return;

      const trace = {
        event_type: 'error',
        path: window.location.pathname,
        component: componentName,
        error_message: error?.message || 'Unknown error',
        error_stack: error?.stack || errorInfo?.componentStack || '',
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent
      };

      // Enviar trace
      base44.functions.invoke('collectTrace', trace).catch(() => {});

      // Log local
      console.error(`[ErrorTracker] ${componentName}:`, error, errorInfo);
    };

    // Listener global de erros não capturados
    const errorHandler = (event) => {
      handleError(event.error, { componentStack: event.error?.stack || '' });
    };

    window.addEventListener('error', errorHandler);
    
    return () => window.removeEventListener('error', errorHandler);
  }, [componentName]);

  return null;
}