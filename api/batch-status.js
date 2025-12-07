/**
 * API endpoint для обновления статуса партии
 * Используется GitHub Actions для отправки статуса напрямую на Vercel
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
// В Vercel serverless функциях можно писать только в /tmp
// Используем /tmp для записи, но читаем из разных мест
const STATUS_FILE = '/tmp/batch-status.json';
const LOCAL_STATUS_FILE = path.join(ROOT_DIR, 'tmp', 'batch-status.json');

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
      // Пробуем разные пути для tmp
      const possiblePaths = [
        '/tmp/batch-status.json',  // Vercel serverless functions
        path.join(ROOT_DIR, 'tmp', 'batch-status.json'),  // Локально
        path.join('/var/task', 'tmp', 'batch-status.json')  // Fallback
      ];
      
      let status = {
        current: 0,
        total: 0,
        completed: 0,
        failed: 0,
        inProgress: false
      };
      
      // Пробуем найти файл по всем возможным путям
      for (const statusFile of possiblePaths) {
        if (fs.existsSync(statusFile)) {
          try {
            status = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
            break;
          } catch (e) {
            console.error('[Batch Status] Error reading from', statusFile, ':', e);
          }
        }
      }
      
      return res.json({
        success: true,
        status
      });
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
      
      // Сохраняем статус в /tmp (единственное место где можно писать в Vercel)
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
        // Пробуем записать в /tmp (Vercel)
        fs.writeFileSync(STATUS_FILE, JSON.stringify(statusToSave, null, 2));
        console.log('[Batch Status] Status saved to:', STATUS_FILE);
      } catch (tmpErr) {
        // Fallback для локальной разработки
        console.warn('[Batch Status] Failed to write to /tmp, trying local:', tmpErr.message);
        try {
          const dir = path.dirname(LOCAL_STATUS_FILE);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(LOCAL_STATUS_FILE, JSON.stringify(statusToSave, null, 2));
          console.log('[Batch Status] Status saved to:', LOCAL_STATUS_FILE);
        } catch (localErr) {
          console.error('[Batch Status] Failed to write to both paths:', localErr.message);
          return res.status(500).json({
            success: false,
            error: `Failed to save status: ${localErr.message}`
          });
        }
      }
      
      return res.json({
        success: true,
        message: 'Status updated',
        status: statusToSave
      });
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
