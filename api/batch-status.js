/**
 * API endpoint для обновления статуса партии
 * Использует Upstash Redis для постоянного хранения статуса
 */

const { Redis } = require('@upstash/redis');

const STATUS_KEY = 'batch-status';

// Функция для получения Redis клиента (инициализируем внутри функции, а не на уровне модуля)
function getRedis() {
  // Проверяем переменные окружения (поддерживаем оба варианта: UPSTASH_REDIS_* и KV_*)
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  
  // Логируем для диагностики (без секретов)
  console.log('[Batch Status] Checking Redis config:', {
    hasUrl: !!url,
    hasToken: !!token,
    urlLength: url ? url.length : 0,
    tokenLength: token ? token.length : 0,
    usingKV: !!process.env.KV_REST_API_URL,
    usingUpstash: !!process.env.UPSTASH_REDIS_REST_URL
  });
  
  if (!url || !token) {
    console.warn('[Batch Status] Redis env vars missing:', {
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ? 'present' : 'missing',
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ? 'present' : 'missing',
      KV_REST_API_URL: process.env.KV_REST_API_URL ? 'present' : 'missing',
      KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN ? 'present' : 'missing'
    });
    return null; // Redis не настроен
  }
  
  try {
    // Используем ручную инициализацию (более надежно, чем fromEnv)
    const redis = new Redis({
      url: url,
      token: token,
    });
    console.log('[Batch Status] Redis client created successfully');
    return redis;
  } catch (initErr) {
    console.error('[Batch Status] Redis init error:', initErr.message, initErr.stack);
    return null;
  }
}

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    // GET - получить текущий статус
    if (req.method === 'GET') {
      try {
        // Получаем Redis клиент
        const redis = getRedis();
        
        // Проверяем, настроен ли Redis
        if (!redis) {
          console.warn('[Batch Status] Upstash Redis not configured');
          return res.json({
            success: true,
            status: {
              current: 0,
              total: 0,
              completed: 0,
              failed: 0,
              inProgress: false,
              lastUpdate: Date.now(),
              error: 'Upstash Redis not configured. Please install Upstash from Vercel Marketplace.'
            }
          });
        }

        // Читаем статус из Upstash Redis
        const status = await redis.get(STATUS_KEY);
        
        if (status) {
          console.log('[Batch Status] Status read from Redis');
          return res.json({
            success: true,
            status
          });
        } else {
          // Если статуса нет, возвращаем пустой
          console.log('[Batch Status] No status in Redis, returning empty');
          return res.json({
            success: true,
            status: {
              current: 0,
              total: 0,
              completed: 0,
              failed: 0,
              inProgress: false,
              lastUpdate: Date.now()
            }
          });
        }
      } catch (redisErr) {
        console.error('[Batch Status] Redis error:', redisErr);
        // Fallback: возвращаем пустой статус если Redis недоступен
        return res.json({
          success: true,
          status: {
            current: 0,
            total: 0,
            completed: 0,
            failed: 0,
            inProgress: false,
            lastUpdate: Date.now(),
            error: `Redis error: ${redisErr.message}`
          }
        });
      }
    }
    
    // POST - обновить статус (только с авторизацией)
    if (req.method === 'POST') {
      // Простая авторизация через токен
      const authToken = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
      const expectedToken = process.env.BATCH_STATUS_TOKEN || 'default-token-change-me';
      
      if (authToken !== expectedToken) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized. Provide BATCH_STATUS_TOKEN in Authorization header or ?token= query param.'
        });
      }
      
      const status = req.body;
      
      // Валидация
      if (!status || typeof status !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'Invalid status object'
        });
      }

      // Получаем Redis клиент
      const redis = getRedis();
      
      // Проверяем, настроен ли Redis
      if (!redis) {
        return res.status(500).json({
          success: false,
          error: 'Upstash Redis not configured. Please install Upstash from Vercel Marketplace and redeploy.'
        });
      }
      
      // Сохраняем статус в Upstash Redis
      const statusToSave = {
        current: status.current || 0,
        total: status.total || 0,
        completed: status.completed || 0,
        failed: status.failed || 0,
        inProgress: status.inProgress !== undefined ? status.inProgress : false,
        lastUpdate: Date.now(),
        ...status
      };
      
      try {
        // Сохраняем в Redis (без TTL - храним постоянно)
        await redis.set(STATUS_KEY, statusToSave);
        console.log('[Batch Status] Status saved to Redis');
        
        return res.json({
          success: true,
          message: 'Status updated',
          status: statusToSave
        });
      } catch (redisErr) {
        console.error('[Batch Status] Redis save error:', redisErr);
        return res.status(500).json({
          success: false,
          error: `Failed to save status to Redis: ${redisErr.message}`
        });
      }
    }
    
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
    
  } catch (err) {
    console.error('[Batch Status API] Error:', err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
