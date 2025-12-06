#!/usr/bin/env node
/**
 * MONSTER 8.0 — DASHBOARD SERVER
 * 
 * Полнофункциональный дашборд для управления MONSTER 8.0:
 * - Визуализация стратегии и выполнения
 * - Управление оркестратором (запуск/стоп)
 * - Статистика страниц (прод + BPG)
 * - Логи в реальном времени
 * - Поле для идей самообучения
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*' }
});

const PORT = process.env.MONSTER8_DASHBOARD_PORT || 3001;
const ROOT_DIR = path.resolve(__dirname, '../..');

// Импорт планировщика партий
const batchScheduler = require(path.join(ROOT_DIR, 'scripts', 'batch_scheduler'));

// Middleware
app.use(cors());
app.use(express.json());

// Root route - must be before static files
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'ui', 'index-8.0.html');
  if (!fs.existsSync(indexPath)) {
    return res.status(404).send('Dashboard file not found');
  }
  res.sendFile(indexPath);
});

// Static files
app.use(express.static(path.join(__dirname, 'ui')));

// Service Worker
app.get('/sw-dashboard.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'ui', 'sw-dashboard.js'));
});

// ============================================================
// УТИЛИТЫ
// ============================================================

function countPages(lang) {
  const dir = path.join(ROOT_DIR, 'public', 'semantic-pages', lang);
  if (!fs.existsSync(dir)) return 0;
  try {
    const files = fs.readdirSync(dir, { recursive: true });
    return files.filter(f => f === 'index.html' || f.endsWith('/index.html')).length;
  } catch {
    return 0;
  }
}

function countDeployedPages(lang) {
  // Проверяем через файл статуса деплоя
  const deployStatusPath = path.join(ROOT_DIR, 'tmp', 'deploy-status.json');
  try {
    if (fs.existsSync(deployStatusPath)) {
      const status = JSON.parse(fs.readFileSync(deployStatusPath, 'utf8'));
      const langStatus = status[lang];
      if (langStatus && langStatus.deployed !== undefined) {
        return langStatus.deployed;
      }
    }
  } catch {
    // Игнорируем ошибки
  }
  // Если нет статуса, считаем что все созданные = задеплоены
  return countPages(lang);
}

function getBatchProgress() {
  const batchStatusPath = path.join(ROOT_DIR, 'tmp', 'batch-status.json');
  try {
    if (fs.existsSync(batchStatusPath)) {
      return JSON.parse(fs.readFileSync(batchStatusPath, 'utf8'));
    }
  } catch {
    // Игнорируем ошибки
  }
  return {
    current: 0,
    total: 0,
    completed: 0,
    failed: 0,
    inProgress: false
  };
}

function countBPGBlocks() {
  const tmpDir = path.join(ROOT_DIR, 'tmp');
  if (!fs.existsSync(tmpDir)) return 0;
  try {
    const files = fs.readdirSync(tmpDir);
    return files.filter(f => f.endsWith('.blocks.json')).length;
  } catch {
    return 0;
  }
}

function getOrchestratorStatus() {
  return new Promise((resolve) => {
    exec('pgrep -f "monster8_orchestrator.sh"', (err, stdout) => {
      resolve({
        isRunning: !err && stdout.trim().length > 0,
        pid: stdout.trim() || null
      });
    });
  });
}

function readLogFile(filePath, lines = 100) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const content = fs.readFileSync(filePath, 'utf8');
    const allLines = content.split('\n').filter(l => l.trim());
    return allLines.slice(-lines);
  } catch {
    return [];
  }
}

function getLanguagePhase(enPages, esPages) {
  const EN_THRESHOLD = parseInt(process.env.EN_THRESHOLD_FOR_ES || '100', 10);
  const ES_HARD_MIN = parseInt(process.env.ES_HARD_MIN || '50', 10);
  
  if (enPages < EN_THRESHOLD) return 'en_only';
  if (esPages < ES_HARD_MIN) return 'mixed';
  return 'es_focus';
}

function getLengthMode() {
  const hour = new Date().getHours();
  const NIGHT_START = parseInt(process.env.NIGHT_START_HOUR || '22', 10);
  const NIGHT_END = parseInt(process.env.NIGHT_END_HOUR || '6', 10);
  
  if (hour >= NIGHT_START || hour < NIGHT_END) return 'long';
  return 'short';
}

// ============================================================
// API ENDPOINTS
// ============================================================

/**
 * GET /api/status
 * Полный статус системы
 */
app.get('/api/status', async (req, res) => {
  try {
    const enPages = countPages('en');
    const esPages = countPages('es');
    const enDeployed = countDeployedPages('en');
    const esDeployed = countDeployedPages('es');
    const bpgBlocks = countBPGBlocks();
    const orchestratorStatus = await getOrchestratorStatus();
    const langPhase = getLanguagePhase(enPages, esPages);
    const lengthMode = getLengthMode();
    const batchProgress = getBatchProgress();
    
    res.json({
      success: true,
      timestamp: Date.now(),
      pages: {
        en: enPages,
        es: esPages,
        total: enPages + esPages,
        deployed: {
          en: enDeployed,
          es: esDeployed,
          total: enDeployed + esDeployed
        }
      },
      batch: batchProgress,
      bpg: {
        blocks: bpgBlocks,
        ready: fs.existsSync(path.join(ROOT_DIR, 'tmp', 'bpg.done'))
      },
      orchestrator: orchestratorStatus,
      strategy: {
        languagePhase: langPhase,
        lengthMode: lengthMode,
        enThreshold: parseInt(process.env.EN_THRESHOLD_FOR_ES || '100', 10),
        esHardMin: parseInt(process.env.ES_HARD_MIN || '50', 10)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/pages
 * Статистика страниц
 */
app.get('/api/pages', (req, res) => {
  try {
    const enPages = countPages('en');
    const esPages = countPages('es');
    
    res.json({
      success: true,
      en: enPages,
      es: esPages,
      total: enPages + esPages,
      timestamp: Date.now()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/bpg
 * Статус BPG (Background Prep)
 */
app.get('/api/bpg', (req, res) => {
  try {
    const blocks = countBPGBlocks();
    const ready = fs.existsSync(path.join(ROOT_DIR, 'tmp', 'bpg.done'));
    const logPath = path.join(ROOT_DIR, 'tmp', 'bpg.log');
    const logs = readLogFile(logPath, 50);
    
    res.json({
      success: true,
      blocks,
      ready,
      logs: logs.slice(-20),
      timestamp: Date.now()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/logs
 * Логи оркестратора
 */
app.get('/api/logs', (req, res) => {
  try {
    const logPath = path.join(ROOT_DIR, 'logs', 'orchestrator.log');
    const lines = parseInt(req.query.lines || '100', 10);
    const logs = readLogFile(logPath, lines);
    
    res.json({
      success: true,
      logs,
      count: logs.length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/orchestrator/start
 * Запуск оркестратора
 */
app.post('/api/orchestrator/start', async (req, res) => {
  try {
    const status = await getOrchestratorStatus();
    if (status.isRunning) {
      return res.json({ success: false, message: 'Orchestrator already running' });
    }
    
    const orchestratorPath = path.join(ROOT_DIR, 'monster8_orchestrator.sh');
    const logPath = path.join(ROOT_DIR, 'logs', 'orchestrator.log');
    
    // Запускаем в фоне
    const child = spawn('bash', [orchestratorPath], {
      cwd: ROOT_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true
    });
    
    child.stdout.on('data', (data) => {
      io.emit('log', { type: 'stdout', message: data.toString() });
    });
    
    child.stderr.on('data', (data) => {
      io.emit('log', { type: 'stderr', message: data.toString() });
    });
    
    child.on('close', (code) => {
      io.emit('orchestrator:stopped', { code });
    });
    
    child.unref();
    
    res.json({ success: true, message: 'Orchestrator started', pid: child.pid });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/orchestrator/stop
 * Остановка оркестратора
 */
app.post('/api/orchestrator/stop', async (req, res) => {
  try {
    const status = await getOrchestratorStatus();
    if (!status.isRunning) {
      return res.json({ success: false, message: 'Orchestrator not running' });
    }
    
    exec(`pkill -f "monster8_orchestrator.sh"`, (err) => {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
      io.emit('orchestrator:stopped', { manual: true });
      res.json({ success: true, message: 'Orchestrator stopped' });
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/orchestrator/status
 * Статус оркестратора
 */
app.get('/api/orchestrator/status', async (req, res) => {
  try {
    const status = await getOrchestratorStatus();
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/strategy
 * Текущая стратегия
 */
app.get('/api/strategy', (req, res) => {
  try {
    const enPages = countPages('en');
    const esPages = countPages('es');
    const langPhase = getLanguagePhase(enPages, esPages);
    const lengthMode = getLengthMode();
    
    res.json({
      success: true,
      languagePhase: langPhase,
      lengthMode: lengthMode,
      pages: { en: enPages, es: esPages },
      thresholds: {
        enThreshold: parseInt(process.env.EN_THRESHOLD_FOR_ES || '100', 10),
        esHardMin: parseInt(process.env.ES_HARD_MIN || '50', 10)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/learning-ideas
 * Сохранение идей для самообучения
 */
app.post('/api/learning-ideas', (req, res) => {
  try {
    const { idea, priority = 'medium' } = req.body;
    if (!idea || !idea.trim()) {
      return res.status(400).json({ success: false, error: 'Idea is required' });
    }
    
    const ideasPath = path.join(ROOT_DIR, 'data', 'learning-ideas.jsonl');
    const entry = {
      timestamp: Date.now(),
      idea: idea.trim(),
      priority,
      status: 'pending'
    };
    
    fs.appendFileSync(ideasPath, JSON.stringify(entry) + '\n');
    
    io.emit('learning-idea:added', entry);
    res.json({ success: true, entry });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/learning-ideas
 * Получить список идей
 */
app.get('/api/learning-ideas', (req, res) => {
  try {
    const ideasPath = path.join(ROOT_DIR, 'data', 'learning-ideas.jsonl');
    const ideas = readLogFile(ideasPath, 1000)
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .reverse();
    
    res.json({ success: true, ideas });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  try {
    const enPages = countPages('en');
    const esPages = countPages('es');
    const bpgBlocks = countBPGBlocks();
    const orchestratorStatus = getOrchestratorStatus();
    const batchProgress = getBatchProgress();
    
    // Определяем статус
    let status = 'healthy';
    if (batchProgress.failed > batchProgress.completed * 0.1) {
      status = 'degraded'; // >10% ошибок
    }
    
    res.json({
      status,
      timestamp: Date.now(),
      components: {
        orchestrator: orchestratorStatus,
        batch: batchProgress,
        pages: { en: enPages, es: esPages, total: enPages + esPages },
        bpg: { blocks: bpgBlocks }
      }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

/**
 * GET /api/batch/schedule
 * Получить расписание партий
 */
app.get('/api/batch/schedule', (req, res) => {
  try {
    const nextBatch = batchScheduler.getNextScheduledBatch();
    const schedule = batchScheduler.loadSchedule();
    
    res.json({
      success: true,
      nextBatch,
      upcoming: schedule.scheduled
        .filter(b => b.status === 'scheduled')
        .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
        .slice(0, 10) // Следующие 10 партий
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/batch/history
 * Получить историю партий
 */
app.get('/api/batch/history', (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '20', 10);
    const history = batchScheduler.getBatchHistory(limit);
    
    res.json({
      success: true,
      batches: history,
      count: history.length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/batch/preview
 * Генерация превью партии
 */
app.post('/api/batch/preview', (req, res) => {
  try {
    const params = req.body || {};
    const preview = batchScheduler.generateBatchPreview(params);
    
    res.json({
      success: true,
      preview
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/batch/complete
 * Отметить партию как завершенную (вызывается после успешного деплоя)
 */
app.post('/api/batch/complete', (req, res) => {
  try {
    const { batchId, result } = req.body;
    
    if (!batchId) {
      return res.status(400).json({ success: false, error: 'batchId is required' });
    }
    
    batchScheduler.markBatchCompleted(batchId, result || {});
    
    // Планируем следующую партию автоматически
    const nextBatch = batchScheduler.scheduleNextBatch({
      batchNumber: result?.batchNumber || 1,
      language: result?.language || 'en',
      pagesGenerated: result?.pagesGenerated || 0,
      pagesDeployed: result?.pagesDeployed || 0
    });
    
    io.emit('batch:completed', { batchId, nextBatch });
    
    res.json({
      success: true,
      nextBatch
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/batch/start
 * Запуск партии с превью
 */
app.post('/api/batch/start', async (req, res) => {
  try {
    const { preview, params } = req.body;
    
    // Генерируем превью если не передан
    const batchPreview = preview || batchScheduler.generateBatchPreview(params || {});
    
    // Здесь можно добавить логику запуска партии через оркестратор
    // Пока возвращаем превью
    
    res.json({
      success: true,
      preview: batchPreview,
      message: 'Batch preview generated. Use orchestrator to start actual batch.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// WEBSOCKET
// ============================================================

io.on('connection', (socket) => {
  console.log('[Dashboard] Client connected');
  
  socket.on('disconnect', () => {
    console.log('[Dashboard] Client disconnected');
  });
});

// Автоматическое обновление статуса каждые 2 секунды
setInterval(async () => {
  try {
    const enPages = countPages('en');
    const esPages = countPages('es');
    const enDeployed = countDeployedPages('en');
    const esDeployed = countDeployedPages('es');
    const bpgBlocks = countBPGBlocks();
    const orchestratorStatus = await getOrchestratorStatus();
    const langPhase = getLanguagePhase(enPages, esPages);
    const lengthMode = getLengthMode();
    const batchProgress = getBatchProgress();
    const nextBatch = batchScheduler.getNextScheduledBatch();
    
    io.emit('status:update', {
      pages: { 
        en: enPages, 
        es: esPages, 
        total: enPages + esPages,
        deployed: {
          en: enDeployed,
          es: esDeployed,
          total: enDeployed + esDeployed
        }
      },
      batch: batchProgress,
      bpg: { blocks: bpgBlocks, ready: fs.existsSync(path.join(ROOT_DIR, 'tmp', 'bpg.done')) },
      orchestrator: orchestratorStatus,
      strategy: { languagePhase: langPhase, lengthMode },
      schedule: { nextBatch }
    });
  } catch (err) {
    console.error('[Dashboard] Error updating status:', err);
  }
}, 2000);

// ============================================================
// ЗАПУСК СЕРВЕРА
// ============================================================

// Создаем необходимые директории
const dirs = [
  path.join(ROOT_DIR, 'logs'),
  path.join(ROOT_DIR, 'tmp'),
  path.join(ROOT_DIR, 'data')
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

server.listen(PORT, () => {
  console.log(`[Dashboard] MONSTER 8.0 Dashboard running on http://localhost:${PORT}`);
  console.log(`[Dashboard] Open http://localhost:${PORT} in your browser`);
});

