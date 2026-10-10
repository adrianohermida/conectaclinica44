/**
 * Cache Service - Estratégia de cache multi-nível
 * Memory (React Query) + LocalStorage + API Edge
 * 
 * Objetivos:
 * - Reduzir latência P95 < 150ms
 * - Diminuir chamadas API em 70%
 * - TTL inteligente por tipo de dado
 */

const CACHE_STRATEGIES = {
  // Dados quase estáticos - 1 hora
  STATIC: { ttl: 60 * 60 * 1000, storage: 'local' },
  
  // Dados de referência - 30 min
  REFERENCE: { ttl: 30 * 60 * 1000, storage: 'local' },
  
  // Dados transacionais - 5 min
  TRANSACTIONAL: { ttl: 5 * 60 * 1000, storage: 'memory' },
  
  // Dados em tempo real - 1 min
  REALTIME: { ttl: 60 * 1000, storage: 'memory' }
};

class CacheService {
  constructor() {
    this.memoryCache = new Map();
  }

  /**
   * Gera chave de cache consistente
   */
  getCacheKey(namespace, params) {
    const sortedParams = JSON.stringify(params, Object.keys(params).sort());
    return `${namespace}:${sortedParams}`;
  }

  /**
   * Busca no cache (memory primeiro, depois localStorage)
   */
  get(key, strategy = CACHE_STRATEGIES.TRANSACTIONAL) {
    // 1. Verificar memory cache
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && Date.now() < memoryEntry.expiry) {
      return memoryEntry.data;
    }

    // 2. Verificar localStorage (se estratégia permitir)
    if (strategy.storage === 'local' && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const { data, expiry } = JSON.parse(stored);
          if (Date.now() < expiry) {
            // Promover para memory cache
            this.memoryCache.set(key, { data, expiry });
            return data;
          } else {
            localStorage.removeItem(key);
          }
        }
      } catch (e) {
        // Falha silenciosa
      }
    }

    return null;
  }

  /**
   * Armazena no cache
   */
  set(key, data, strategy = CACHE_STRATEGIES.TRANSACTIONAL) {
    const expiry = Date.now() + strategy.ttl;
    
    // 1. Memory cache sempre
    this.memoryCache.set(key, { data, expiry });

    // 2. localStorage se estratégia permitir
    if (strategy.storage === 'local' && typeof window !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify({ data, expiry }));
      } catch (e) {
        // Quota exceeded - limpar cache antigo
        this.clearExpired();
      }
    }
  }

  /**
   * Invalida cache por namespace ou padrão
   */
  invalidate(pattern) {
    // Memory cache
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(pattern)) {
        this.memoryCache.delete(key);
      }
    }

    // LocalStorage
    if (typeof window !== 'undefined') {
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith(pattern)) {
            localStorage.removeItem(key);
          }
        });
      } catch (e) {
        // Falha silenciosa
      }
    }
  }

  /**
   * Limpa entradas expiradas
   */
  clearExpired() {
    const now = Date.now();
    
    // Memory
    for (const [key, value] of this.memoryCache.entries()) {
      if (now >= value.expiry) {
        this.memoryCache.delete(key);
      }
    }

    // LocalStorage
    if (typeof window !== 'undefined') {
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          try {
            const stored = localStorage.getItem(key);
            if (stored) {
              const { expiry } = JSON.parse(stored);
              if (now >= expiry) {
                localStorage.removeItem(key);
              }
            }
          } catch (e) {
            // Remove entradas corrompidas
            localStorage.removeItem(key);
          }
        });
      } catch (e) {
        // Falha silenciosa
      }
    }
  }

  /**
   * Limpa todo o cache
   */
  clear() {
    this.memoryCache.clear();
    if (typeof window !== 'undefined') {
      try {
        const keys = Object.keys(localStorage).filter(k => k.includes(':'));
        keys.forEach(k => localStorage.removeItem(k));
      } catch (e) {
        // Falha silenciosa
      }
    }
  }
}

// Singleton
export const cacheService = new CacheService();
export { CACHE_STRATEGIES };

// Limpeza automática a cada 10 min
if (typeof window !== 'undefined') {
  setInterval(() => cacheService.clearExpired(), 10 * 60 * 1000);
}