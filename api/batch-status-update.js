/**
 * MONSTER 8.0 Internal Status Update API
 * Используется ТОЛЬКО воркером/оркестратором для обновления статуса.
 * Защищено токеном MONSTER_INTERNAL_SECRET.
 */

const path = require('path');
const kvBatchStorePath = path.join(__dirname, '..', 'lib', 'kvBatchStore');
const { getCurrentBatch, setCurrentBatch, setLastBatch, archiveBatch } = require(kvBatchStorePath);

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-MONSTER-SECRET');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.'
    });
  }

  // 🔒 ПРОВЕРКА СЕКРЕТА
  const secret = req.headers['x-monster-secret'];
  const expectedSecret = process.env.MONSTER_INTERNAL_SECRET;

  if (!secret || secret !== expectedSecret) {
    console.error('[Status Update API] Unauthorized attempt:', {
      hasSecret: !!secret,
      secretMatch: secret === expectedSecret
    });
    return res.status(401).json({
      success: false,
      error: 'Unauthorized. Provide X-MONSTER-SECRET header.'
    });
  }

  // Читаем body
  const { batchId, id, patch } = req.body || {};
  const incomingId = batchId || id;

  if (!incomingId) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: batchId'
    });
  }

  if (!patch || typeof patch !== 'object') {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: patch (object)'
    });
  }

  try {
    // Получаем текущую партию
    const current = await getCurrentBatch();

    if (!current) {
      return res.status(400).json({
        success: false,
        error: 'No current batch found'
      });
    }

    const currentId = current.batchId || current.id;
    if (currentId !== incomingId) {
      return res.status(400).json({
        success: false,
        error: `Batch ID mismatch. Current: ${currentId}, Requested: ${incomingId}`
      });
    }

    // 🔄 ОБНОВЛЯЕМ СТАТУС
    const now = new Date().toISOString();
    const updated = {
      ...current,
      ...patch,
      batchId: current.batchId || current.id,
      id: current.id || current.batchId,
      updatedAt: now,
    };

    // Если запустили running и не было startedAt — проставляем
    if (updated.status === 'running' && !updated.startedAt) {
      updated.startedAt = now;
    }

    console.log('[Status Update API] Updating batch:', {
      id: updated.batchId || updated.id,
      status: updated.status,
      topicsDone: updated.topicsDone,
      fatalErrors: updated.fatalErrors
    });

    // Проверяем, финальный ли это статус
    const isFinal = ['success', 'failed', 'stopped'].includes(updated.status);

    if (isFinal) {
      // Финальный статус → фиксируем finishedAt, записываем last и current оставляем финальным
      updated.finishedAt = updated.finishedAt || now;
      
      await setLastBatch(updated);
      await archiveBatch(updated);
      await setCurrentBatch(updated);

      console.log('[Status Update API] Batch finalized:', {
        id: updated.batchId || updated.id,
        status: updated.status,
        topicsDone: updated.topicsDone,
        duration: updated.finishedAt && updated.startedAt 
          ? Math.round((new Date(updated.finishedAt) - new Date(updated.startedAt)) / 1000) + 's'
          : 'unknown'
      });

      return res.json({
        success: true,
        message: 'Batch finalized',
        current: updated,
        final: true
      });
    } else {
      // Промежуточное обновление → просто обновляем current
      await setCurrentBatch(updated);

      return res.json({
        success: true,
        message: 'Batch status updated',
        current: updated,
        final: false
      });
    }
  } catch (err) {
    console.error('[Status Update API] Error:', err);

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
