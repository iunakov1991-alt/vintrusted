/**
 * API endpoint для получения статуса партий MONSTER 8.0
 * Использует KV Batch Store для чтения current и last
 */

const path = require('path');
const kvBatchStorePath = path.join(__dirname, '..', 'lib', 'kvBatchStore');
const { getCurrentBatch, getLastBatch, setCurrentBatch, createBatchStatus } = require(kvBatchStorePath);

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // GET - чтение статуса
  if (req.method === 'GET') {
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
  }
  
  // POST - обновление статуса (для GitHub Actions)
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

    try {
      // Получаем текущий статус или создаем новый
      let current = await getCurrentBatch();
      
      if (current) {
        // Обновляем существующий статус
        const updated = {
          ...current,
          topicsDone: status.completed || current.topicsDone || 0,
          htmlGenerated: status.completed || current.htmlGenerated || 0,
          fatalErrors: status.failed || current.fatalErrors || 0,
          status: status.inProgress ? 'running' : (status.failed > 0 ? 'failed' : 'success'),
          updatedAt: new Date().toISOString()
        };
        
        // Маппинг из старого формата
        if (status.current !== undefined) updated.topicsDone = status.current;
        if (status.total !== undefined) updated.topicsPlanned = status.total;
        if (status.completed !== undefined) updated.topicsDone = status.completed;
        if (status.failed !== undefined) updated.fatalErrors = status.failed;
        
        await setCurrentBatch(updated);
        
        // Если партия завершена, перемещаем в last
        if (!status.inProgress && (status.completed > 0 || status.failed > 0)) {
          const { setLastBatch, archiveBatch, clearCurrentBatch } = require(kvBatchStorePath);
          await setLastBatch(updated);
          await archiveBatch(updated);
          await clearCurrentBatch();
        }
        
        return res.json({
          success: true,
          message: 'Status updated',
          current: updated
        });
      } else {
        // Создаем новый статус из старого формата
        const newBatch = createBatchStatus({
          phase: status.phase || 'auto',
          length: status.length || 'auto',
          status: status.inProgress ? 'running' : (status.failed > 0 ? 'failed' : 'success'),
          topicsPlanned: status.total || 0,
          topicsDone: status.completed || status.current || 0,
          htmlGenerated: status.completed || 0,
          fatalErrors: status.failed || 0
        });
        
        await setCurrentBatch(newBatch);
        
        return res.json({
          success: true,
          message: 'Status created',
          current: newBatch
        });
      }
    } catch (err) {
      console.error('[Batch Status API] Error updating:', err);
      
      if (err.message === 'KV not configured') {
        return res.status(500).json({
          success: false,
          error: 'KV not configured'
        });
      }
      
      return res.status(500).json({
        success: false,
        error: err.message
      });
    }
  }
  
  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
};
