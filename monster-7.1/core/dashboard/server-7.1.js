/**
 * MONSTER 7.1 — DASHBOARD SERVER
 * 
 * Обновлённый сервер для поддержки батчей и паузы/возобновления.
 * Использует MonsterOrchestratorCore и TaskQueue.
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const MonsterOrchestratorCore = require('../orchestrator-core');
const config = require('../../../config/monster-7.1.config.json');
const { getLogger } = require('../../../monster-7.0/core/utils/logger');
const SystemMonitor = require('../../../monster-7.0/core/utils/monitor');

const app = express();
const PORT = process.env.MONSTER_PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'ui')));
app.use('/monster-ui', express.static(path.join(__dirname, 'ui')));

// Публикация SEO страниц
const publicPath = path.join(process.cwd(), 'public');
app.use('/seo-pages', express.static(path.join(publicPath, 'seo-pages')));
app.use(express.static(publicPath));

// Инициализация логгера и монитора
const logger = getLogger(config);
const monitor = new SystemMonitor(config);

// Инициализация оркестратора Monster 7.1
const orchestrator = new MonsterOrchestratorCore(config);

// Запуск мониторинга
monitor.start(5000);

// События оркестратора → WebSocket (для real-time обновлений)
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
  cors: { origin: '*' }
});

// Подключение событий оркестратора к WebSocket
orchestrator.on('cycle:started', () => {
  io.emit('cycle:started');
});

orchestrator.on('cycle:step', (step) => {
  io.emit('cycle:step', step);
});

orchestrator.on('cycle:completed', (results) => {
  io.emit('cycle:completed', results);
});

orchestrator.on('error', (error) => {
  io.emit('error', error);
});

// События TaskQueue
orchestrator.on('task:added', (data) => {
  io.emit('task:added', data);
});

orchestrator.on('task:started', (data) => {
  io.emit('task:started', data);
});

orchestrator.on('task:completed', (data) => {
  io.emit('task:completed', data);
});

orchestrator.on('task:failed', (data) => {
  io.emit('task:failed', data);
});

orchestrator.on('queue:started', () => {
  io.emit('queue:started');
});

orchestrator.on('queue:completed', (data) => {
  io.emit('queue:completed', data);
});

orchestrator.on('queue:paused', (data) => {
  io.emit('queue:paused', data);
});

orchestrator.on('queue:resumed', (data) => {
  io.emit('queue:resumed', data);
});

// API Routes

/**
 * GET /api/status
 * Статус системы
 */
app.get('/api/status', async (req, res) => {
  try {
    const metrics = monitor.getCurrentMetrics();
    const status = orchestrator.getStatus();
    
    // Получение статистики страниц
    let pageStats = null;
    try {
            const PageStats = require('../../../monster-7.0/core/utils/page-stats');
      const pageStatsInstance = new PageStats();
      pageStats = pageStatsInstance.getDashboardStats();
    } catch (error) {
      logger.warn('API', 'Failed to get page stats', { error: error.message });
    }
    
    res.json({
      status: 'running',
      memory: metrics.memory,
      tasks: status.queue || {},
      performance: metrics.performance,
      isRunning: status.isRunning,
      timestamp: metrics.timestamp,
      pages: pageStats
    });
  } catch (error) {
    logger.error('API', 'Error getting status', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/batch/status
 * Статус батча (очереди задач)
 */
app.get('/api/batch/status', (req, res) => {
  try {
    const status = orchestrator.getStatus();
    res.json({
      ...status.queue,
      isRunning: status.isRunning
    });
  } catch (error) {
    logger.error('API', 'Error getting batch status', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/batch/start
 * Запуск полного цикла с батчами
 */
app.post('/api/batch/start', async (req, res) => {
  try {
    if (orchestrator.isRunning) {
      return res.status(400).json({ error: 'Monster is already running' });
    }

    const results = await orchestrator.startFullCycle({
      ...req.body,
      fromDashboard: true
    });

    res.json({ success: true, results });
  } catch (error) {
    logger.error('API', 'Error starting batch', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/batch/pause
 * Пауза обработки батча
 */
app.post('/api/batch/pause', (req, res) => {
  try {
    orchestrator.pause();
    res.json({ success: true, message: 'Batch paused' });
  } catch (error) {
    logger.error('API', 'Error pausing batch', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/batch/resume
 * Возобновление обработки батча
 */
app.post('/api/batch/resume', (req, res) => {
  try {
    orchestrator.resume();
    res.json({ success: true, message: 'Batch resumed' });
  } catch (error) {
    logger.error('API', 'Error resuming batch', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/stop
 * Остановка обработки
 */
app.post('/api/stop', (req, res) => {
  try {
    orchestrator.stop();
    res.json({ success: true, message: 'Monster stopped' });
  } catch (error) {
    logger.error('API', 'Error stopping', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/metrics
 * История метрик
 */
app.get('/api/metrics', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const history = monitor.getMetricsHistory(limit);
    const statistics = monitor.getStatistics();
    
    res.json({
      history,
      statistics,
      current: monitor.getCurrentMetrics()
    });
  } catch (error) {
    logger.error('API', 'Error getting metrics', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/logs
 * Последние логи
 */
app.get('/api/logs', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const logs = logger.getRecentLogs(limit);
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/init
 * Инициализация системы
 */
app.post('/api/init', async (req, res) => {
  try {
    await orchestrator.initialize();
    res.json({ success: true, message: 'Monster 7.1 initialized' });
  } catch (error) {
    logger.error('API', 'Error initializing', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Инициализация при запуске
(async () => {
  try {
    await orchestrator.initialize();
    logger.info('SERVER', 'Monster 7.1 initialized');
  } catch (error) {
    logger.error('SERVER', 'Failed to initialize Monster 7.1', { error: error.message });
  }
})();

// Запуск сервера
server.listen(PORT, () => {
  logger.info('SERVER', `Monster 7.1 Dashboard running on http://localhost:${PORT}`);
  console.log(`\n🚀 Monster 7.1 Dashboard запущен на http://localhost:${PORT}`);
  console.log(`📊 Откройте в браузере: http://localhost:${PORT}/monster-ui\n`);
});

module.exports = { app, server, orchestrator };

