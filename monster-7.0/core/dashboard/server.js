/**
 * MONSTER 7.0 — DASHBOARD SERVER
 * 
 * Единственная точка входа для запуска всех модулей.
 * Запрещает прямые CLI команды.
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const MonsterOrchestrator = require('../orchestrator');
const config = require('../../../config/monster.config.json');
const { getLogger } = require('../utils/logger');
const SystemMonitor = require('../utils/monitor');
const FileProcessor = require('../utils/file-processor');

const app = express();
const PORT = process.env.MONSTER_PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'ui')));

// Multer для загрузки файлов
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ['.txt', '.md', '.pdf', '.json', '.csv', '.doc', '.docx'];
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} not allowed`));
    }
  }
});

// Инициализация File Processor
const fileProcessor = new FileProcessor();

// Публикация SEO страниц
const publicPath = path.join(process.cwd(), 'public');
app.use('/seo-pages', express.static(path.join(publicPath, 'seo-pages')));
app.use(express.static(publicPath));

// Инициализация логгера и монитора
const logger = getLogger(config);
const monitor = new SystemMonitor(config);

// Инициализация оркестратора
const orchestrator = new MonsterOrchestrator(config);

// Запуск мониторинга
monitor.start(5000); // Обновление каждые 5 секунд

// События оркестратора → WebSocket (для real-time обновлений)
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
  cors: { origin: '*' }
});

// Подключение событий оркестратора к WebSocket
orchestrator.on('task:started', (task) => {
  io.emit('task:started', task);
});

orchestrator.on('task:running', (task) => {
  io.emit('task:running', task);
});

orchestrator.on('task:completed', (task) => {
  io.emit('task:completed', task);
});

orchestrator.on('task:failed', (task) => {
  io.emit('task:failed', task);
});

orchestrator.on('cycle:step', (step) => {
  io.emit('cycle:step', step);
});

orchestrator.on('cycle:completed', (results) => {
  io.emit('cycle:completed', results);
});

orchestrator.on('cycle:failed', (error) => {
  io.emit('cycle:failed', error);
});

// API Routes

/**
 * GET /api/status
 * Статус системы
 */
app.get('/api/status', async (req, res) => {
  try {
    const metrics = monitor.getCurrentMetrics();
    const tasks = orchestrator.getAllTasks();
    
    // Получение статистики страниц
    let pageStats = null;
    try {
      const PageStats = require('../utils/page-stats');
      const pageStatsInstance = new PageStats();
      pageStats = pageStatsInstance.getDashboardStats();
    } catch (error) {
      logger.warn('API', 'Failed to get page stats', { error: error.message });
    }
    
    res.json({
      status: 'running',
      memory: metrics.memory,
      tasks: {
        total: tasks.length,
        running: tasks.filter(t => t.status === 'running').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        failed: tasks.filter(t => t.status === 'failed').length,
        ...metrics.tasks
      },
      performance: metrics.performance,
      isRunning: orchestrator.isRunning,
      timestamp: metrics.timestamp,
      pages: pageStats
    });
  } catch (error) {
    logger.error('API', 'Error getting status', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/page-stats
 * Статистика страниц
 */
app.get('/api/page-stats', (req, res) => {
  try {
    const PageStats = require('../utils/page-stats');
    const pageStats = new PageStats();
    const stats = pageStats.getDashboardStats();
    res.json(stats);
  } catch (error) {
    logger.error('API', 'Error getting page stats', { error: error.message });
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
 * POST /api/start
 * Запуск полного цикла (START в Dashboard)
 */
app.post('/api/start', async (req, res) => {
  try {
    if (orchestrator.isRunning) {
      return res.status(400).json({ error: 'Monster is already running' });
    }

    const results = await orchestrator.startFullCycle({
      ...req.body,
      fromDashboard: true // Обязательный флаг
    });

    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/module/:moduleName
 * Запуск отдельного модуля
 */
app.post('/api/module/:moduleName', async (req, res) => {
  try {
    const { moduleName } = req.params;
    const { taskId, result } = await orchestrator.runModule(moduleName, {
      ...req.body,
      fromDashboard: true // Обязательный флаг
    });

    res.json({ taskId, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tasks
 * Получение всех задач
 */
app.get('/api/tasks', (req, res) => {
  try {
    const tasks = orchestrator.getAllTasks();
    res.json({ tasks });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/task/:taskId
 * Статус конкретной задачи
 */
app.get('/api/task/:taskId', (req, res) => {
  try {
    const { taskId } = req.params;
    const task = orchestrator.getTaskStatus(taskId);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ task });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/stop
 * Остановка всех задач
 */
app.post('/api/stop', async (req, res) => {
  try {
    await orchestrator.stop();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/init-knowledge
 * Инициализация базы знаний
 */
app.post('/api/init-knowledge', async (req, res) => {
  try {
    const KnowledgeLoader = require('../ai-knowledge-core/knowledge-loader');
    const loader = new KnowledgeLoader(config);
    const result = await loader.loadAll();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/init-knowledge
 * Инициализация базы знаний
 */
app.post('/api/init-knowledge', async (req, res) => {
  try {
    const KnowledgeLoader = require('../ai-knowledge-core/knowledge-loader');
    const loader = new KnowledgeLoader(config);
    const result = await loader.loadAll();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/export-report
 * Экспорт отчета
 */
app.post('/api/export-report', async (req, res) => {
  try {
    const { results, format = 'json' } = req.body;
    const report = await orchestrator.modules.reportGenerator.execute({
      results,
      format
    });
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/reports
 * Список отчетов
 */
app.get('/api/reports', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const reportsPath = path.join(process.cwd(), 'data/reports');
    
    if (!fs.existsSync(reportsPath)) {
      return res.json({ reports: [] });
    }

    const files = fs.readdirSync(reportsPath)
      .filter(f => f.startsWith('report_') && f.endsWith('.json'))
      .map(f => {
        const filePath = path.join(reportsPath, f);
        const stats = fs.statSync(filePath);
        return {
          name: f,
          path: filePath,
          size: stats.size,
          created: stats.birthtime
        };
      })
      .sort((a, b) => b.created - a.created);

    res.json({ reports: files });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/feedback
 * Human-in-the-loop обратная связь
 */
app.post('/api/feedback', async (req, res) => {
  try {
    const { question, answer, context } = req.body;
    
    // Сохранение обратной связи
    const fs = require('fs');
    const feedbackPath = path.join(__dirname, '../../../data/feedback/feedback.jsonl');
    const feedback = {
      timestamp: new Date().toISOString(),
      question,
      answer,
      context
    };
    
    fs.appendFileSync(feedbackPath, JSON.stringify(feedback) + '\n');
    
    // Передача в AI Knowledge Core для обучения
    await orchestrator.modules.aiKnowledgeCore.learnFromFeedback(feedback);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/learn-materials
 * Загрузка материалов для обучения AI
 */
app.post('/api/learn-materials', upload.array('files', 10), async (req, res) => {
  try {
    const text = req.body.text || '';
    const files = req.files || [];
    
    if (!text && files.length === 0) {
      return res.status(400).json({ error: 'Please provide text or files' });
    }
    
    const processedMaterials = [];
    
    // Обработка текста
    if (text) {
      processedMaterials.push({
        type: 'text',
        content: text,
        source: 'user-input',
        timestamp: new Date().toISOString()
      });
    }
    
    // Обработка файлов
    if (files.length > 0) {
      const fileResults = await fileProcessor.processFiles(files);
      
      for (const result of fileResults) {
        if (result.processed && result.content) {
          processedMaterials.push({
            type: result.type,
            filename: result.filename,
            content: result.content,
            source: 'file-upload',
            timestamp: new Date().toISOString()
          });
        }
      }
    }
    
    // Сохранение в AI Knowledge Core
    const saved = await orchestrator.modules.aiKnowledgeCore.learnFromMaterials(processedMaterials);
    
    logger.info('LEARN-MATERIALS', `Processed ${processedMaterials.length} materials`, {
      text: !!text,
      files: files.length,
      saved
    });
    
    res.json({
      success: true,
      processed: processedMaterials.length,
      saved,
      materials: processedMaterials.map(m => ({
        type: m.type,
        filename: m.filename,
        size: m.content?.length || 0
      }))
    });
  } catch (error) {
    logger.error('LEARN-MATERIALS', 'Error processing materials', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /monster-ui
 * Главная страница дашборда
 */
app.get('/monster-ui', (req, res) => {
  res.sendFile(path.join(__dirname, 'ui', 'index.html'));
});

// Инициализация
async function start() {
  try {
    await orchestrator.initialize();
    console.log('✅ Monster Orchestrator initialized');
    
    server.listen(PORT, () => {
      console.log(`🚀 Monster 7.0 Dashboard running on http://localhost:${PORT}/monster-ui`);
      console.log(`📊 API available at http://localhost:${PORT}/api`);
      console.log(`⚠️  Direct CLI commands are DISABLED. Use Dashboard only!`);
    });
  } catch (error) {
    console.error('❌ Failed to start Monster:', error);
    process.exit(1);
  }
}

// Запуск
if (require.main === module) {
  start();
}

module.exports = { app, server, orchestrator };

