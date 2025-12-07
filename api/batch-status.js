/**
 * API endpoint для обновления статуса партии
 * Использует Vercel KV для постоянного хранения статуса
 */

const { kv } = require('@vercel/kv');

const STATUS_KEY = 'batch-status';

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
        // Читаем статус из Vercel KV
        const status = await kv.get(STATUS_KEY);
        
        if (status) {
          console.log('[Batch Status] Status read from KV');
          return res.json({
            success: true,
            status
          });
        } else {
          // Если статуса нет, возвращаем пустой
          console.log('[Batch Status] No status in KV, returning empty');
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
      } catch (kvErr) {
        console.error('[Batch Status] KV error:', kvErr);
        // Fallback: возвращаем пустой статус если KV недоступен
        return res.json({
          success: true,
          status: {
            current: 0,
            total: 0,
            completed: 0,
            failed: 0,
            inProgress: false,
            lastUpdate: Date.now(),
            error: 'KV not available'
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
      
      // Сохраняем статус в Vercel KV
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
        // Сохраняем в KV с TTL 24 часа (опционально)
        await kv.set(STATUS_KEY, statusToSave);
        console.log('[Batch Status] Status saved to KV');
        
        return res.json({
          success: true,
          message: 'Status updated',
          status: statusToSave
        });
      } catch (kvErr) {
        console.error('[Batch Status] KV save error:', kvErr);
        return res.status(500).json({
          success: false,
          error: `Failed to save status to KV: ${kvErr.message}`
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
