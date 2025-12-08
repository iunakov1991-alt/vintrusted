/**
 * API endpoint для получения статуса партий MONSTER 8.0
 * Использует KV Batch Store для чтения current и last
 */

const path = require('path');
const kvBatchStorePath = path.join(__dirname, '..', 'lib', 'kvBatchStore');
const { getCurrentBatch, getLastBatch } = require(kvBatchStorePath);

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
