/**
 * Structured Logging Service
 * Logs estruturados para observabilidade
 * 
 * Formato: { timestamp, level, message, context, userId, sessionId }
 * Facilita análise, filtros e alertas
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  CRITICAL: 4
};

class LogService {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.buffer = [];
    this.maxBufferSize = 100;
    this.flushInterval = 30000; // 30s
    
    // Auto-flush periódico
    if (typeof window !== 'undefined') {
      setInterval(() => this.flush(), this.flushInterval);
    }
  }

  generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cria log estruturado
   */
  createLog(level, message, context = {}) {
    const log = {
      timestamp: new Date().toISOString(),
      level: Object.keys(LOG_LEVELS)[level],
      message,
      context: {
        ...context,
        sessionId: this.sessionId,
        url: typeof window !== 'undefined' ? window.location.href : null,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null
      },
      userId: this.getCurrentUserId()
    };

    return log;
  }

  getCurrentUserId() {
    if (typeof window !== 'undefined') {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        return user.id || user.email || 'anonymous';
      } catch {
        return 'anonymous';
      }
    }
    return 'anonymous';
  }

  /**
   * Adiciona log ao buffer
   */
  addToBuffer(log) {
    this.buffer.push(log);
    
    // Console output no dev
    if (import.meta.env.DEV) {
      const style = this.getConsoleStyle(log.level);
      console.log(`[${log.level}]`, log.message, log.context);
    }

    // Flush se buffer cheio
    if (this.buffer.length >= this.maxBufferSize) {
      this.flush();
    }

    // Log crítico: flush imediato
    if (log.level === 'CRITICAL' || log.level === 'ERROR') {
      this.flush();
    }
  }

  getConsoleStyle(level) {
    const styles = {
      DEBUG: 'color: gray',
      INFO: 'color: blue',
      WARN: 'color: orange',
      ERROR: 'color: red',
      CRITICAL: 'background: red; color: white; font-weight: bold'
    };
    return styles[level] || '';
  }

  /**
   * Envia logs para backend (batch)
   */
  async flush() {
    if (this.buffer.length === 0) return;

    const logsToSend = [...this.buffer];
    this.buffer = [];

    try {
      // TODO: Enviar para endpoint de logs estruturados
      // await fetch('/api/logs', { method: 'POST', body: JSON.stringify(logsToSend) });
      
      // Temporário: armazenar localmente para debug
      if (typeof window !== 'undefined' && import.meta.env.DEV) {
        const existing = JSON.parse(localStorage.getItem('app_logs') || '[]');
        const updated = [...existing, ...logsToSend].slice(-500); // Últimos 500
        localStorage.setItem('app_logs', JSON.stringify(updated));
      }
    } catch (error) {
      console.error('Failed to flush logs:', error);
    }
  }

  // Public API
  debug(message, context) {
    this.addToBuffer(this.createLog(LOG_LEVELS.DEBUG, message, context));
  }

  info(message, context) {
    this.addToBuffer(this.createLog(LOG_LEVELS.INFO, message, context));
  }

  warn(message, context) {
    this.addToBuffer(this.createLog(LOG_LEVELS.WARN, message, context));
  }

  error(message, context) {
    this.addToBuffer(this.createLog(LOG_LEVELS.ERROR, message, { ...context, stack: new Error().stack }));
  }

  critical(message, context) {
    this.addToBuffer(this.createLog(LOG_LEVELS.CRITICAL, message, { ...context, stack: new Error().stack }));
  }

  /**
   * Métricas de performance
   */
  logPerformance(operation, durationMs, metadata = {}) {
    const log = {
      type: 'performance',
      operation,
      duration_ms: durationMs,
      threshold_exceeded: durationMs > 1000,
      ...metadata
    };
    
    if (durationMs > 1000) {
      this.warn(`Slow operation: ${operation}`, log);
    } else {
      this.debug(`Performance: ${operation}`, log);
    }
  }

  /**
   * Track user actions
   */
  logUserAction(action, details = {}) {
    this.info(`User action: ${action}`, { type: 'user_action', action, ...details });
  }
}

// Singleton
export const logger = new LogService();

// Capturar erros globais
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    logger.error('Global error caught', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error?.toString()
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled promise rejection', {
      reason: event.reason?.toString(),
      promise: event.promise
    });
  });
}