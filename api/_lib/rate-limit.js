import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';

// ═══════════════════════════════════════════════════════════════════════
// RATE LIMITING CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════
// Защита от DDoS, abuse, email enumeration, credit card testing

// Строгий лимит для checkout (защита от card testing/carding)
const checkoutLimiter = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(10, '60 s'), // 10 requests per minute
  analytics: true,
  prefix: '@upstash/ratelimit:checkout',
});

// Средний лимит для quota operations (защита от abuse)
const quotaLimiter = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(20, '60 s'), // 20 requests per minute
  analytics: true,
  prefix: '@upstash/ratelimit:quota',
});

// Либеральный лимит для read operations (защита от enumeration)
const readLimiter = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(30, '60 s'), // 30 requests per minute
  analytics: true,
  prefix: '@upstash/ratelimit:read',
});

// Очень строгий лимит для ClearVin API (защита от quota exhaustion)
const clearvinLimiter = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(5, '60 s'), // 5 requests per minute
  analytics: true,
  prefix: '@upstash/ratelimit:clearvin',
});

/**
 * Rate limit middleware для Vercel Functions
 * @param {Request} req - Vercel request object
 * @param {string} type - Тип лимита: 'checkout', 'quota', 'read', 'clearvin'
 * @returns {Promise<{success: boolean, limit?: number, remaining?: number, reset?: number}>}
 */
export async function checkRateLimit(req, type = 'read') {
  try {
    // Получаем IP адрес (с fallback для различных deployment scenarios)
    const ip = 
      req.headers['x-forwarded-for']?.split(',')[0].trim() ||
      req.headers['x-real-ip'] ||
      req.socket?.remoteAddress ||
      'unknown';

    // Выбираем соответствующий лимитер
    let limiter;
    switch (type) {
      case 'checkout':
        limiter = checkoutLimiter;
        break;
      case 'quota':
        limiter = quotaLimiter;
        break;
      case 'clearvin':
        limiter = clearvinLimiter;
        break;
      case 'read':
      default:
        limiter = readLimiter;
        break;
    }

    // Проверяем лимит
    const { success, limit, remaining, reset } = await limiter.limit(ip);

    if (!success) {
      console.log(`[RATE-LIMIT] ❌ Blocked: IP=${ip.substring(0, 20)}..., type=${type}, remaining=0, reset=${new Date(reset).toISOString()}`);
      return {
        success: false,
        limit,
        remaining: 0,
        reset,
        ip: ip.substring(0, 20) + '...', // Partial IP for logging
      };
    }

    // Предупреждение если близко к лимиту
    if (remaining < 3) {
      console.log(`[RATE-LIMIT] ⚠️  Warning: IP=${ip.substring(0, 20)}..., type=${type}, remaining=${remaining}`);
    }

    return {
      success: true,
      limit,
      remaining,
      reset,
    };

  } catch (error) {
    console.error('[RATE-LIMIT] Error checking rate limit:', error);
    // Fail open: если rate limiter сломался - пропускаем запрос
    // Альтернатива: fail closed (return { success: false })
    return { success: true };
  }
}

/**
 * Helper для отправки 429 Too Many Requests response
 * @param {Response} res - Vercel response object
 * @param {Object} rateLimitResult - Результат от checkRateLimit
 */
export function sendRateLimitError(res, rateLimitResult) {
  const resetDate = rateLimitResult.reset ? new Date(rateLimitResult.reset) : null;
  const retryAfter = resetDate ? Math.ceil((resetDate - Date.now()) / 1000) : 60;

  res.setHeader('X-RateLimit-Limit', rateLimitResult.limit || 30);
  res.setHeader('X-RateLimit-Remaining', 0);
  res.setHeader('X-RateLimit-Reset', resetDate ? resetDate.toISOString() : '');
  res.setHeader('Retry-After', retryAfter);

  return res.status(429).json({
    error: 'Too many requests',
    message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
    retry_after: retryAfter,
    reset_at: resetDate ? resetDate.toISOString() : null,
  });
}

/**
 * Decorator для автоматического rate limiting на API endpoints
 * @param {Function} handler - Vercel function handler
 * @param {string} type - Тип лимита
 */
export function withRateLimit(handler, type = 'read') {
  return async (req, res) => {
    // Пропускаем OPTIONS requests (CORS preflight)
    if (req.method === 'OPTIONS') {
      return handler(req, res);
    }

    // Проверяем rate limit
    const rateLimitCheck = await checkRateLimit(req, type);

    if (!rateLimitCheck.success) {
      return sendRateLimitError(res, rateLimitCheck);
    }

    // Добавляем rate limit headers к ответу
    res.setHeader('X-RateLimit-Limit', rateLimitCheck.limit || 30);
    res.setHeader('X-RateLimit-Remaining', rateLimitCheck.remaining || 0);
    if (rateLimitCheck.reset) {
      res.setHeader('X-RateLimit-Reset', new Date(rateLimitCheck.reset).toISOString());
    }

    // Вызываем оригинальный handler
    return handler(req, res);
  };
}

// Export для прямого использования
export default {
  checkRateLimit,
  sendRateLimitError,
  withRateLimit,
};
