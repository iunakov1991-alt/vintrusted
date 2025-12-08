/**
 * API endpoint для остановки текущей партии
 * Устанавливает флаг stopRequested в current batch
 */

const path = require('path');
const kvBatchStorePath = path.join(__dirname, '..', '..', 'lib', 'kvBatchStore');
const { getCurrentBatch, setCurrentBatch } = require(kvBatchStorePath);

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST to stop batch.'
    });
  }

  try {
    const current = await getCurrentBatch();
    
    if (!current) {
      return res.status(404).json({
        success: false,
        error: 'no_running_batch',
        message: 'Нет активной партии для остановки'
      });
    }

    if (current.status !== 'running' && current.status !== 'queued') {
      return res.status(400).json({
        success: false,
        error: 'batch_not_running',
        message: `Партия не запущена (текущий статус: ${current.status})`
      });
    }

    // Устанавливаем флаг остановки
    current.stopRequested = true;
    current.notes = (current.notes || '') + (current.notes ? ' | ' : '') + 
      `Stop requested at ${new Date().toISOString()}`;
    
    await setCurrentBatch(current);

    return res.json({
      success: true,
      message: 'Запрос на остановку партии отправлен',
      id: current.id,
      stopRequested: true
    });
  } catch (err) {
    console.error('[Batch Runner Stop] Error:', err);
    
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
};
