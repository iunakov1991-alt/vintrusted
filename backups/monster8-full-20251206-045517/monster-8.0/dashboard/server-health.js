/**
 * Health Check API для MONSTER 8.0
 * Проверяет состояние всех компонентов системы
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const app = express();
const PORT = process.env.MONSTER8_HEALTH_PORT || 3002;
const ROOT_DIR = path.resolve(__dirname, '..', '..');

// ============================================================
// УТИЛИТЫ
// ============================================================

function checkOrchestrator() {
  try {
    const result = execSync('pgrep -f "monster8_orchestrator.sh"', { encoding: 'utf8', timeout: 2000 });
    const pid = result.trim();
    if (pid) {
      return { status: 'running', pid: parseInt(pid) };
    }
  } catch {
    // Процесс не найден
  }
  return { status: 'stopped', pid: null };
}

function checkBatch() {
  const batchStatusPath = path.join(ROOT_DIR, 'tmp', 'batch-status.json');
  try {
    if (fs.existsSync(batchStatusPath)) {
      const status = JSON.parse(fs.readFileSync(batchStatusPath, 'utf8'));
      return {
        status: status.inProgress ? 'running' : 'idle',
        current: status.current || 0,
        total: status.total || 0,
        lastUpdate: status.lastUpdate || null
      };
    }
  } catch {
    // Игнорируем ошибки
  }
  return { status: 'idle', current: 0, total: 0 };
}

function checkBPG() {
  const bpgDonePath = path.join(ROOT_DIR, 'tmp', 'bpg.done');
  const tmpDir = path.join(ROOT_DIR, 'tmp');
  let blocks = 0;
  
  try {
    if (fs.existsSync(tmpDir)) {
      const files = fs.readdirSync(tmpDir);
      blocks = files.filter(f => f.endsWith('.blocks.json')).length;
    }
  } catch {
    // Игнорируем ошибки
  }
  
  return {
    status: fs.existsSync(bpgDonePath) ? 'ready' : 'preparing',
    blocks
  };
}

function checkCache() {
  const cachePath = path.join(ROOT_DIR, 'data', 'seo', 'ai-cache.jsonl');
  try {
    if (fs.existsSync(cachePath)) {
      const stats = fs.statSync(cachePath);
      const lines = fs.readFileSync(cachePath, 'utf8').split('\n').filter(Boolean).length;
      return {
        status: 'ok',
        size: lines,
        fileSize: stats.size,
        lastModified: stats.mtime.toISOString()
      };
    }
  } catch {
    // Игнорируем ошибки
  }
  return { status: 'missing', size: 0 };
}

function checkDisk() {
  try {
    const result = execSync('df -h . | tail -1', { encoding: 'utf8', timeout: 2000 });
    const parts = result.trim().split(/\s+/);
    const used = parseInt(parts[4]?.replace('%', '') || '0');
    const free = 100 - used;
    
    let status = 'ok';
    if (free < 10) status = 'critical';
    else if (free < 20) status = 'warning';
    
    return {
      status,
      free: `${free}%`,
      used: `${used}%`,
      total: parts[1],
      available: parts[3]
    };
  } catch {
    return { status: 'unknown', free: 'N/A' };
  }
}

function checkLearningStrategy() {
  const strategyPath = path.join(ROOT_DIR, 'data', 'seo', 'ai-training', 'learned-strategy.json');
  try {
    if (fs.existsSync(strategyPath)) {
      const stats = fs.statSync(strategyPath);
      const strategy = JSON.parse(fs.readFileSync(strategyPath, 'utf8'));
      return {
        status: 'ok',
        lastUpdated: strategy.lastUpdated || stats.mtime.toISOString(),
        hasCorePrinciples: !!strategy.core_principles,
        hasContentStrategy: !!strategy.content_strategy
      };
    }
  } catch {
    // Игнорируем ошибки
  }
  return { status: 'missing' };
}

// ============================================================
// API ENDPOINTS
// ============================================================

/**
 * GET /health
 * Полная проверка здоровья системы
 */
app.get('/health', (req, res) => {
  const orchestrator = checkOrchestrator();
  const batch = checkBatch();
  const bpg = checkBPG();
  const cache = checkCache();
  const disk = checkDisk();
  const learning = checkLearningStrategy();
  
  // Определяем общий статус
  let overallStatus = 'healthy';
  if (orchestrator.status === 'stopped' && batch.status === 'idle') {
    overallStatus = 'idle'; // Система не работает, но это нормально
  } else if (disk.status === 'critical' || cache.status === 'missing') {
    overallStatus = 'degraded';
  } else if (orchestrator.status === 'stopped' && batch.status === 'running') {
    overallStatus = 'degraded'; // Батч работает без оркестратора
  }
  
  res.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    components: {
      orchestrator,
      batch,
      bpg,
      cache,
      disk,
      learning
    }
  });
});

/**
 * GET /health/liveness
 * Простая проверка живости (для Kubernetes)
 */
app.get('/health/liveness', (req, res) => {
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
});

/**
 * GET /health/readiness
 * Проверка готовности (для Kubernetes)
 */
app.get('/health/readiness', (req, res) => {
  const cache = checkCache();
  const disk = checkDisk();
  
  if (cache.status === 'ok' && disk.status !== 'critical') {
    res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
  } else {
    res.status(503).json({ status: 'not ready', timestamp: new Date().toISOString() });
  }
});

// ============================================================
// ЗАПУСК
// ============================================================

app.listen(PORT, () => {
  console.log(`[Health Check] Server running on http://localhost:${PORT}`);
  console.log(`[Health Check] Endpoints:`);
  console.log(`  GET /health - Full health check`);
  console.log(`  GET /health/liveness - Liveness probe`);
  console.log(`  GET /health/readiness - Readiness probe`);
});

module.exports = app;
