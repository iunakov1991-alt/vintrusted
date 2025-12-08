/**
 * MONSTER 8.0 Internal Status Update API
 * 
 * Используется ТОЛЬКО для обновления статуса из GitHub Actions.
 * НЕ для внешних пользователей!
 * 
 * Защищено токеном MONSTER_INTERNAL_SECRET.
 */

const path = require('path');
const kvBatchStorePath = path.join(__dirname, '..', 'lib', 'kvBatchStore');
const { getCurrentBatch, setCurrentBatch, setLastBatch, archiveBatch, clearCurrentBatch } = require(kvBatchStorePath);

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
  const expectedSecret = process.env.MONSTER_INTERNAL_SECRET || process.env.BATCH_STATUS_TOKEN;

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
  const { id, patch } = req.body || {};

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: id'
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
    let current = await getCurrentBatch();

    // Если текущей партии нет - создаем минимальный объект, чтобы можно было принудительно финализировать/очистить
    if (!current) {
      current = {
        id,
        status: 'queued',
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        topicsPlanned: 0,
        topicsDone: 0,
        htmlGenerated: 0,
        fatalErrors: 0,
        notes: 'created via batch-status-update (no current batch found)'
      };
      await setCurrentBatch(current);
    }

    if (current.id !== id) {
      return res.status(400).json({
        success: false,
        error: `Batch ID mismatch. Current: ${current.id}, Requested: ${id}`
      });
    }

    // 🔄 ОБНОВЛЯЕМ СТАТУС
    const updated = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString()
    };

    console.log('[Status Update API] Updating batch:', {
      id: updated.id,
      status: updated.status,
      topicsDone: updated.topicsDone,
      fatalErrors: updated.fatalErrors
    });

    // Проверяем, финальный ли это статус
    const isFinal = ['success', 'failed', 'stopped'].includes(updated.status);

    if (isFinal) {
      // Финальный статус → перемещаем в last, архивируем, очищаем current
      updated.finishedAt = updated.finishedAt || new Date().toISOString();
      
      await setLastBatch(updated);
      await archiveBatch(updated);
      await clearCurrentBatch();

      console.log('[Status Update API] Batch finalized:', {
        id: updated.id,
        status: updated.status,
        topicsDone: updated.topicsDone,
        duration: updated.finishedAt && updated.startedAt 
          ? Math.round((new Date(updated.finishedAt) - new Date(updated.startedAt)) / 1000) + 's'
          : 'unknown'
      });

      return res.json({
        success: true,
        message: 'Batch finalized and moved to archive',
        status: updated,
        final: true
      });
    } else {
      // Промежуточное обновление → просто обновляем current
      await setCurrentBatch(updated);

      return res.json({
        success: true,
        message: 'Batch status updated',
        status: updated,
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
