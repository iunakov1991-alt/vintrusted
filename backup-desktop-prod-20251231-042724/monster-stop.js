/**
 * MONSTER 8.0 Stop API
 * Остановка текущей партии
 */

const path = require('path');
const kvBatchStorePath = path.join(__dirname, '..', 'lib', 'kvBatchStore');
const { getCurrentBatch, setCurrentBatch } = require(kvBatchStorePath);

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.'
    });
  }

  try {
    const current = await getCurrentBatch();

    if (!current) {
      return res.status(404).json({
        success: false,
        error: 'Нет активной партии для остановки'
      });
    }

    if (current.status !== 'running' && current.status !== 'queued') {
      return res.status(400).json({
        success: false,
        error: `Партия не может быть остановлена (текущий статус: ${current.status})`
      });
    }

    current.stopRequested = true;
    current.notes = (current.notes || '') + (current.notes ? ' | ' : '') + `Stop requested at ${new Date().toISOString()}`;
    await setCurrentBatch(current);

    return res.json({
      success: true,
      message: 'Запрос на остановку партии отправлен',
      id: current.id,
      stopRequested: true
    });
  } catch (err) {
    console.error('[Monster Stop API] Error:', err);

    if (err.message === 'KV not configured') {
      return res.status(500).json({
        success: false,
        error: 'KV not configured. Add Upstash Redis to Vercel project.'
      });
    }

    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
};
