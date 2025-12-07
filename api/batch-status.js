/**
 * API endpoint для обновления статуса партии
 * Используется GitHub Actions для отправки статуса напрямую на Vercel
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
// Используем /tmp для Vercel serverless functions (единственное место где можно писать)
const STATUS_FILE = process.env.VERCEL ? '/tmp/batch-status.json' : path.join(ROOT_DIR, 'tmp', 'batch-status.json');

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
      
      // Создаем директорию если не существует (только если не /tmp)
      if (!STATUS_FILE.startsWith('/tmp')) {
        const dir = path.dirname(STATUS_FILE);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      }
      
      // Сохраняем статус
      const statusToSave = {
        current: status.current || 0,
        total: status.total || 0,
        completed: status.completed || 0,
        failed: status.failed || 0,
        inProgress: status.inProgress !== undefined ? status.inProgress : false,
        lastUpdate: Date.now(),
        ...status
      };
      
      fs.writeFileSync(STATUS_FILE, JSON.stringify(statusToSave, null, 2));
      
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
