/**
 * KV Batch Store - единое хранилище статуса партий MONSTER 8.0
 * Использует Upstash Redis (через переменные KV_REST_API_* или UPSTASH_REDIS_*)
 * 
 * Ключи:
 *   monster8:batch:current - текущая активная партия
 *   monster8:batch:last    - последняя завершенная партия
 *   monster8:batch:<id>    - архив партии по ID
 */

const { Redis } = require('@upstash/redis');

const KEY_CURRENT = 'monster8:batch:current';
const KEY_LAST = 'monster8:batch:last';

/**
 * Получить Redis клиент
 */
function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  
  if (!url || !token) {
    return null;
  }
  
  try {
    return new Redis({
      url: url,
      token: token,
    });
  } catch (err) {
    console.error('[KV Batch Store] Redis init error:', err.message);
    return null;
  }
}

/**
 * Получить текущую активную партию
 * @returns {Promise<Object|null>}
 */
async function getCurrentBatch() {
  const redis = getRedis();
  if (!redis) {
    throw new Error('KV not configured');
  }
  
  try {
    const batch = await redis.get(KEY_CURRENT);
    return batch || null;
  } catch (err) {
    console.error('[KV Batch Store] Error getting current batch:', err);
    throw err;
  }
}

/**
 * Установить текущую активную партию
 * @param {Object} batch - объект статуса партии
 * @returns {Promise<void>}
 */
async function setCurrentBatch(batch) {
  const redis = getRedis();
  if (!redis) {
    throw new Error('KV not configured');
  }
  
  if (!batch || typeof batch !== 'object') {
    throw new Error('Invalid batch object');
  }
  
  // Обновляем updatedAt
  batch.updatedAt = new Date().toISOString();

   // Обеспечиваем совместимость: batchId и id всегда синхронизированы
   if (batch.id && !batch.batchId) {
     batch.batchId = batch.id;
   }
   if (batch.batchId && !batch.id) {
     batch.id = batch.batchId;
   }
  
  try {
    await redis.set(KEY_CURRENT, batch);
  } catch (err) {
    console.error('[KV Batch Store] Error setting current batch:', err);
    throw err;
  }
}

/**
 * Очистить текущую активную партию
 * @returns {Promise<void>}
 */
async function clearCurrentBatch() {
  const redis = getRedis();
  if (!redis) {
    throw new Error('KV not configured');
  }
  
  try {
    await redis.del(KEY_CURRENT);
  } catch (err) {
    console.error('[KV Batch Store] Error clearing current batch:', err);
    throw err;
  }
}

/**
 * Получить последнюю завершенную партию
 * @returns {Promise<Object|null>}
 */
async function getLastBatch() {
  const redis = getRedis();
  if (!redis) {
    throw new Error('KV not configured');
  }
  
  try {
    const batch = await redis.get(KEY_LAST);
    return batch || null;
  } catch (err) {
    console.error('[KV Batch Store] Error getting last batch:', err);
    throw err;
  }
}

/**
 * Установить последнюю завершенную партию
 * @param {Object} batch - объект статуса партии
 * @returns {Promise<void>}
 */
async function setLastBatch(batch) {
  const redis = getRedis();
  if (!redis) {
    throw new Error('KV not configured');
  }
  
  if (!batch || typeof batch !== 'object') {
    throw new Error('Invalid batch object');
  }
  
  try {
    await redis.set(KEY_LAST, batch);
  } catch (err) {
    console.error('[KV Batch Store] Error setting last batch:', err);
    throw err;
  }
}

/**
 * Архивировать партию (сохранить по ID)
 * @param {Object} batch - объект статуса партии
 * @returns {Promise<void>}
 */
async function archiveBatch(batch) {
  const redis = getRedis();
  if (!redis) {
    throw new Error('KV not configured');
  }
  
  if (!batch || typeof batch !== 'object' || !batch.id) {
    throw new Error('Invalid batch object or missing id');
  }
  
  const archiveKey = `monster8:batch:${batch.id}`;
  
  try {
    await redis.set(archiveKey, batch);
  } catch (err) {
    console.error('[KV Batch Store] Error archiving batch:', err);
    throw err;
  }
}

/**
 * Создать новый объект статуса партии
 * @param {Object} params - параметры партии
 * @returns {Object}
 */
function createBatchStatus(params = {}) {
  const now = new Date().toISOString();
  const id = params.id || `${now.replace(/[:.]/g, '-')}_${params.phase || 'auto'}_${params.length || 'auto'}`;
  
  return {
    id,
    phase: params.phase || 'auto',
    mode: params.mode || 'prod',
    length: params.length || 'auto',
    status: params.status || 'queued',
    runner: params.runner || 'github_actions',
    startedAt: params.startedAt || now,
    updatedAt: now,
    finishedAt: null,
    
    topicsPlanned: params.topicsPlanned || 0,
    topicsDone: params.topicsDone || 0,
    htmlGenerated: params.htmlGenerated || 0,
    fatalErrors: params.fatalErrors || 0,
    majorWarnings: params.majorWarnings || 0,
    
    llmCalls: params.llmCalls || 0,
    avgLatencyMs: params.avgLatencyMs || 0,
    
    selfHealRuns: params.selfHealRuns || 0,
    stopRequested: params.stopRequested || false,
    
    notes: params.notes || '',
    rlSummary: params.rlSummary || null,
    
    failedTopics: params.failedTopics || [],
  };
}

module.exports = {
  getCurrentBatch,
  setCurrentBatch,
  clearCurrentBatch,
  getLastBatch,
  setLastBatch,
  archiveBatch,
  createBatchStatus,
};
