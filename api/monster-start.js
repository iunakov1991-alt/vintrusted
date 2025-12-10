/**
 * MONSTER 8.0 Start API (локальный раннер)
 * Создает одну активную партию в KV со статусом queued и runner=local.
 */

const path = require('path');
const kvBatchStorePath = path.join(__dirname, '..', 'lib', 'kvBatchStore');
const { getCurrentBatch, setCurrentBatch, createBatchStatus } = require(kvBatchStorePath);

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
      ok: false,
      error: 'Method not allowed. Use POST.'
    });
  }

  try {
    // Блокируем, если есть активная партия
    let current;
    try {
      current = await getCurrentBatch();
      if (current && (current.status === 'running' || current.status === 'queued')) {
        console.warn('[Monster Start API] batch_already_running', {
          id: current.id || current.batchId,
          status: current.status,
        });
        return res.status(409).json({
          ok: false,
          reason: 'batch_already_running',
          message: `Партия уже запущена (status: ${current.status}, id: ${current.id || current.batchId})`
        });
      }
    } catch (err) {
      console.warn('[Monster Start API] Could not check current batch:', err.message);
    }

    // Параметры запуска
    const body = req.body || {};
    const forcePhase = body.phase || 'auto';
    const forceLength = body.length || 'auto';

    // Создаем queued партию под локальный раннер
    const newBatch = createBatchStatus({
      phase: forcePhase,
      length: forceLength,
      status: 'queued',
      runner: 'local'
    });

    await setCurrentBatch(newBatch);

    return res.status(200).json({
      ok: true,
      batchId: newBatch.batchId || newBatch.id,
      status: newBatch.status,
      runner: newBatch.runner,
    });
  } catch (err) {
    console.error('[Monster Start API] Error:', err);
    return res.status(500).json({
      ok: false,
      error: err.message || 'Internal server error'
    });
  }
};
