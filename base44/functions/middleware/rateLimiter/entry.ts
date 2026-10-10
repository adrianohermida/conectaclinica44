/**
 * RATE LIMITER - Deno KV Store
 * Limita requests por IP para prevenir spam/DDoS
 * 
 * REGRAS:
 * - 100 requests / minuto / IP (padrão)
 * - 429 Too Many Requests quando exceder
 * - Headers informativos (X-RateLimit-*)
 */

const KV_PREFIX = 'ratelimit';
const DEFAULT_LIMIT = 100;
const WINDOW_MS = 60 * 1000; // 1 minuto

/**
 * Middleware rate limiting
 * @param {Request} req - Request object
 * @param {number} limit - Max requests por janela (default: 100)
 * @returns {Response|null} - null se permitido, Response se bloqueado
 */
export async function checkRateLimit(req, limit = DEFAULT_LIMIT) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
               req.headers.get('cf-connecting-ip') || 
               'unknown';
    
    if (ip === 'unknown') {
      console.warn('[RateLimit] IP desconhecido, permitindo');
      return null;
    }

    const kv = await Deno.openKv();
    const key = [KV_PREFIX, ip, Date.now().toString().slice(0, -4)]; // Janela de 1min
    
    const entry = await kv.get(key);
    const currentCount = entry.value || 0;
    
    if (currentCount >= limit) {
      console.warn(`[RateLimit] ❌ BLOQUEADO: ${ip} excedeu ${limit} req/min`);
      
      return Response.json({
        error: 'Too Many Requests',
        message: `Limite de ${limit} requests por minuto excedido`,
        retry_after: 60
      }, {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': (Date.now() + WINDOW_MS).toString(),
          'Retry-After': '60'
        }
      });
    }
    
    // Incrementar contador
    await kv.set(key, currentCount + 1, { expireIn: WINDOW_MS });
    
    // Headers informativos
    const remaining = limit - currentCount - 1;
    const resetTime = Date.now() + WINDOW_MS;
    
    return {
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': resetTime.toString()
      }
    };
    
  } catch (error) {
    console.error('[RateLimit] Erro KV Store:', error.message);
    // FAIL OPEN: permitir request em caso de erro no KV
    return null;
  }
}

/**
 * Aplicar rate limit em handler
 * @param {Function} handler - Handler original
 * @param {number} limit - Limite customizado (opcional)
 * @returns {Function} - Handler com rate limit
 */
export function withRateLimit(handler, limit = DEFAULT_LIMIT) {
  return async (req) => {
    const rateLimitCheck = await checkRateLimit(req, limit);
    
    if (rateLimitCheck?.status === 429) {
      return rateLimitCheck; // Bloqueado
    }
    
    const response = await handler(req);
    
    // Adicionar headers rate limit na resposta
    if (rateLimitCheck?.headers) {
      Object.entries(rateLimitCheck.headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
    }
    
    return response;
  };
}