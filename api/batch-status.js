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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Только GET - чтение статуса
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use GET to read status.'
    });
  }
  
  try {
    const current = await getCurrentBatch();
    const last = await getLastBatch();
    
    return res.json({
      success: true,
      current: current || null,
      last: last || null
    });
  } catch (err) {
    console.error('[Batch Status API] Error:', err);
    
    // Если KV не настроен, возвращаем null вместо ошибки
    if (err.message === 'KV not configured') {
      return res.json({
        success: true,
        current: null,
        last: null,
        error: 'KV not configured'
      });
    }
    
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
