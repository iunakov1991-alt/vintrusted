# 📊 MONSTER 7.1 — ПОЛНАЯ СТРУКТУРА И БИЛД

**Версия:** Monster 7.1 (Phi-3 TRIZ Edition)  
**Дата:** 2025-12-03  
**Платформа:** MacBook Air M1 8GB

---

## 📈 СТАТИСТИКА

### Файлы:
- **Всего JavaScript файлов:** 13
- **Модулей ядра:** 6
- **Утилит:** 2
- **Dashboard компонентов:** 3
- **Тестовых файлов:** 1
- **Конфигурационных файлов:** 1

### Модули:
- **Core модули:** 6 (все включены)
- **Extensions модули:** 4 (все отключены)
- **AI Knowledge Core:** 1 (включен)

---

## 📁 СТРУКТУРА ФАЙЛОВ

```
monster-7.1/
├── core/
│   ├── orchestrator-core.js          [ГЛАВНЫЙ БИЛД] (383 строки)
│   ├── ai-knowledge-core/
│   │   └── knowledge-core-light.js  (лёгкий AI Knowledge Core)
│   ├── modules/
│   │   ├── semantic-scanner-simple.js        [A] Упрощённый сканер
│   │   ├── strategy-generator-basic.js       [B] Базовый генератор стратегий
│   │   ├── prompt-engine-phi3.js             [C] Промпты под Phi-3
│   │   ├── content-generator-sectioned.js    [Генератор по секциям]
│   │   ├── content-generator-sectioned-optimized.js [Оптимизированный генератор]
│   │   └── quality-score-minimal.js         [Оценка качества]
│   ├── utils/
│   │   ├── task-queue.js            (Очередь задач с батчами)
│   │   └── section-cache.js         (Кэш секций)
│   └── dashboard/
│       ├── server-7.1.js            (Express сервер + WebSocket)
│       └── ui/
│           ├── index-7.1.html        (HTML интерфейс)
│           └── dashboard-7.1.js      (Frontend JS)
├── test/
│   └── generate-single-page.js      (Тестовый скрипт)
└── config/
    └── monster-7.1.config.json      (Конфигурация)
```

---

## 🎯 МОДУЛИ ЯДРА (CORE)

### 1. [A] Semantic Scanner (semantic-scanner-simple.js)
**Статус:** ✅ Включен  
**Функция:** Сканирование ниши, построение Semantic Map  
**Тип:** Упрощённый

### 2. [B] Strategy Generator (strategy-generator-basic.js)
**Статус:** ✅ Включен  
**Функция:** Генерация стратегии до 1000 страниц  
**Тип:** Базовый

### 3. [C] Prompt Engine (prompt-engine-phi3.js)
**Статус:** ✅ Включен  
**Функция:** Генерация промптов оптимизированных под Phi-3  
**Тип:** Phi-3 оптимизированный

### 4. Content Generator (content-generator-sectioned.js)
**Статус:** ✅ Включен  
**Функция:** Генерация контента по секциям (принцип "Дробление")  
**Тип:** По секциям  
**Альтернатива:** content-generator-sectioned-optimized.js (с параллелизацией и кэшем)

### 5. Quality Score (quality-score-minimal.js)
**Статус:** ✅ Включен  
**Функция:** Минимальная оценка качества страниц  
**Тип:** Минимальный

### 6. AI Knowledge Core (knowledge-core-light.js)
**Статус:** ✅ Включен  
**Функция:** Лёгкий AI Knowledge Core с подгрузкой знаний по теме  
**Тип:** Лёгкий  
**Модель:** phi3

---

## 🔧 УТИЛИТЫ (UTILS)

### 1. Task Queue (task-queue.js)
**Функция:** Очередь задач с батчами, паузой/возобновлением  
**События:**
- `task:added`
- `task:started`
- `task:completed`
- `task:failed`
- `queue:started`
- `queue:completed`
- `queue:paused`
- `queue:resumed`
- `queue:stopped`
- `queue:cleared`
- `batch:added`

### 2. Section Cache (section-cache.js)
**Функция:** Кэширование секций для оптимизации

---

## 🎨 DASHBOARD

### 1. Server (server-7.1.js)
**Тип:** Express + WebSocket  
**Порт:** 3000  
**API Endpoints:**
- `GET /api/status` - Статус системы
- `GET /api/batch/status` - Статус батча
- `POST /api/batch/start` - Запуск батча
- `POST /api/batch/pause` - Пауза
- `POST /api/batch/resume` - Возобновление
- `POST /api/stop` - Остановка
- `GET /api/metrics` - Метрики
- `GET /api/logs` - Логи
- `POST /api/init` - Инициализация

### 2. UI (dashboard-7.1.js + index-7.1.html)
**Функция:** Frontend интерфейс для управления

---

## 🔌 EXTENSIONS (ОПЦИОНАЛЬНЫЕ)

### 1. TRIZ Repair (triz-repair-light.js)
**Статус:** ❌ Отключен  
**Тип:** Лёгкий

### 2. Evolution Engine (evolution-engine-light.js)
**Статус:** ❌ Отключен  
**Тип:** Лёгкий

### 3. Performance Learner (performance-learner-light.js)
**Статус:** ❌ Отключен  
**Тип:** Лёгкий

### 4. Library Scanner
**Статус:** ❌ Отключен

---

## ⚙️ КОНФИГУРАЦИЯ

### Phi-3 Profile:
```json
{
  "maxInputTokens": 500,
  "maxOutputTokens": 1000,
  "callsPerPage": 15,
  "timeout": 60000
}
```

### Batches:
```json
{
  "maxPagesPerRun": 20,
  "pauseEnabled": true,
  "resumeEnabled": true
}
```

### M1 Limits:
```json
{
  "maxMemory": 6144,
  "maxConcurrency": 2,
  "memoryThreshold": 0.85
}
```

---

## 🚀 ПОЛНЫЙ ТЕКСТ БИЛДА (orchestrator-core.js)

```javascript
/**
 * MONSTER 7.1 — CORE ORCHESTRATOR
 * 
 * ТРИЗ-принцип "ОТДЕЛЕНИЕ":
 * - Только ЯДРО модулей (core)
 * - Надстройки (extensions) опциональны
 * - Интеграция TaskQueue для батчей
 * - Интеграция SectionedContentGenerator
 */

const EventEmitter = require('events');
const path = require('path');
const TaskQueue = require('./utils/task-queue');

class MonsterOrchestratorCore extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.modules = {};
    this.taskQueue = null;
    this.isRunning = false;
    
    // M1 оптимизация
    this.m1Limits = config.m1Limits || {
      maxMemory: 6 * 1024 * 1024 * 1024,
      maxConcurrency: 2,
      memoryThreshold: 0.85
    };
  }

  /**
   * Инициализация только ЯДРА модулей
   */
  async initialize() {
    try {
      // [A] Semantic Scanner (упрощённый)
      if (this.config.modules.core.semanticScanner.enabled) {
        const SemanticScanner = require('./modules/semantic-scanner-simple');
        this.modules.semanticScanner = new SemanticScanner(this.config);
      }

      // [B] Strategy Generator (базовый)
      if (this.config.modules.core.strategyGenerator.enabled) {
        const StrategyGenerator = require('./modules/strategy-generator-basic');
        this.modules.strategyGenerator = new StrategyGenerator(this.config);
      }

      // [C] Prompt Engine (под Phi-3)
      if (this.config.modules.core.promptEngine.enabled) {
        const PromptEngine = require('./modules/prompt-engine-phi3');
        this.modules.promptEngine = new PromptEngine(this.config);
      }

      // Content Generator (по секциям) - используем оптимизированную версию если доступна
      if (this.config.modules.core.contentGenerator.enabled) {
        // Проверяем, есть ли оптимизированная версия
        try {
          const OptimizedSectionedContentGenerator = require('./modules/content-generator-sectioned-optimized');
          this.modules.contentGenerator = new OptimizedSectionedContentGenerator(this.config);
          console.log('[ORCHESTRATOR] Using optimized content generator (parallel + cache)');
        } catch (error) {
          // Fallback на базовую версию
          const SectionedContentGenerator = require('./modules/content-generator-sectioned');
          this.modules.contentGenerator = new SectionedContentGenerator(this.config);
          console.log('[ORCHESTRATOR] Using standard content generator');
        }
      }

      // Quality Score (минимальный)
      if (this.config.modules.core.qualityScore.enabled) {
        const QualityScore = require('./modules/quality-score-minimal');
        this.modules.qualityScore = new QualityScore(this.config);
      }

      // AI Knowledge Core (лёгкий)
      if (this.config.modules.aiKnowledgeCore.enabled) {
        const LightKnowledgeCore = require('./ai-knowledge-core/knowledge-core-light');
        this.modules.knowledgeCore = new LightKnowledgeCore(this.config);
        await this.modules.knowledgeCore.initialize();
      }

      // Task Queue для батчей
      this.taskQueue = new TaskQueue(this.config);
      this.setupTaskQueueEvents();

      // НАДСТРОЙКИ (опционально)
      if (this.config.modules.extensions.trizRepair.enabled) {
        try {
          const TRIZRepair = require('./modules/triz-repair-light');
          this.modules.trizRepair = new TRIZRepair(this.config);
        } catch (error) {
          console.warn('[ORCHESTRATOR] TRIZ Repair module not available:', error.message);
        }
      }

      if (this.config.modules.extensions.evolutionEngine.enabled) {
        try {
          const EvolutionEngine = require('./modules/evolution-engine-light');
          this.modules.evolutionEngine = new EvolutionEngine(this.config);
        } catch (error) {
          console.warn('[ORCHESTRATOR] Evolution Engine module not available:', error.message);
        }
      }

      if (this.config.modules.extensions.performanceLearner.enabled) {
        try {
          const PerformanceLearner = require('./modules/performance-learner-light');
          this.modules.performanceLearner = new PerformanceLearner(this.config);
        } catch (error) {
          console.warn('[ORCHESTRATOR] Performance Learner module not available:', error.message);
        }
      }

      this.emit('initialized');
      return true;
    } catch (error) {
      this.emit('error', { module: 'orchestrator', error: error.message });
      throw error;
    }
  }

  /**
   * Настройка событий TaskQueue
   */
  setupTaskQueueEvents() {
    this.taskQueue.on('task:added', (data) => {
      this.emit('task:added', data);
    });

    this.taskQueue.on('task:started', (data) => {
      this.emit('task:started', data);
    });

    this.taskQueue.on('task:completed', (data) => {
      this.emit('task:completed', data);
    });

    this.taskQueue.on('task:failed', (data) => {
      this.emit('task:failed', data);
    });

    this.taskQueue.on('queue:completed', (data) => {
      this.isRunning = false;
      this.emit('queue:completed', data);
    });

    this.taskQueue.on('queue:paused', (data) => {
      this.emit('queue:paused', data);
    });

    this.taskQueue.on('queue:resumed', (data) => {
      this.emit('queue:resumed', data);
    });

    this.taskQueue.on('queue:stopped', (data) => {
      this.emit('queue:stopped', data);
    });

    this.taskQueue.on('queue:cleared', () => {
      this.emit('queue:cleared');
    });

    this.taskQueue.on('batch:added', (data) => {
      this.emit('batch:added', data);
    });
  }

  /**
   * Полный цикл запуска (START в Dashboard)
   */
  async startFullCycle(params = {}) {
    if (this.isRunning) {
      throw new Error('Monster is already running');
    }

    this.isRunning = true;
    this.emit('cycle:started');

    try {
      const results = {};

      // 1. Semantic Scanner (упрощённый)
      this.emit('cycle:step', { step: 1, name: 'Semantic Scanner' });
      results.semanticMap = await this.runModule('semanticScanner', {
        ...params,
        fromDashboard: true
      });

      // 2. Strategy Generator (базовый)
      this.emit('cycle:step', { step: 2, name: 'Strategy Generator' });
      results.strategy = await this.runModule('strategyGenerator', {
        semanticMap: results.semanticMap?.result,
        ...params,
        fromDashboard: true
      });

      // 3. Prompt Engine (под Phi-3)
      this.emit('cycle:step', { step: 3, name: 'Prompt Engine' });
      results.prompts = await this.runModule('promptEngine', {
        strategy: results.strategy?.result,
        ...params,
        fromDashboard: true
      });

      // 4. Генерация страниц через TaskQueue (батчи)
      this.emit('cycle:step', { step: 4, name: 'Content Generator (Batches)' });
      await this.generatePagesInBatches(results.strategy?.result, results.prompts?.result, params);

      // 5. Quality Score (минимальный)
      this.emit('cycle:step', { step: 5, name: 'Quality Score' });
      if (this.modules.qualityScore) {
        results.quality = await this.runModule('qualityScore', {
          ...results,
          ...params,
          fromDashboard: true
        });
      }

      this.emit('cycle:completed', results);
      return results;
    } catch (error) {
      this.isRunning = false;
      this.emit('error', { module: 'orchestrator', error: error.message });
      throw error;
    }
  }

  /**
   * Генерация страниц батчами через TaskQueue
   */
  async generatePagesInBatches(strategy, prompts, params) {
    if (!strategy || !strategy.priorities) {
      throw new Error('Strategy is required for content generation');
    }

    const priorities = strategy.priorities || [];
    const maxPagesPerRun = this.config.batches?.maxPagesPerRun || 20;
    
    // Ограничиваем количество страниц для батча
    const limitedPriorities = priorities.slice(0, maxPagesPerRun);

    // Создаём задачи для очереди
    const tasks = limitedPriorities.map((priority, index) => ({
      type: 'generatePage',
      priority,
      index,
      context: {
        theme: priority.theme || priority.type,
        intent: priority.intent || priority.type,
        keywords: priority.keywords || []
      }
    }));

    // Добавляем батч в очередь
    this.taskQueue.addBatch(tasks);

    // Переопределяем executeTask для генерации страниц
    this.taskQueue.executeTask = async (task) => {
      if (task.type === 'generatePage') {
        return await this.generateSinglePage(task, prompts);
      }
      throw new Error(`Unknown task type: ${task.type}`);
    };

    // Запускаем обработку очереди
    await this.taskQueue.processQueue();
  }

  /**
   * Генерация одной страницы
   */
  async generateSinglePage(task, prompts) {
    const { priority, context } = task;

    if (!this.modules.contentGenerator) {
      throw new Error('ContentGenerator not initialized');
    }

    // Генерация страницы по секциям
    const page = await this.modules.contentGenerator.generatePage(priority, context);

    // Сохранение страницы
    const slug = this.generateSlug(context.theme, task.index);
    const saved = await this.modules.contentGenerator.savePage(page, slug);

    return {
      page: saved,
      qualityScore: page.qualityScore,
      wordCount: page.wordCount
    };
  }

  /**
   * Генерация slug для страницы
   */
  generateSlug(theme, index) {
    const slug = theme
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return `${slug}-${index}`;
  }

  /**
   * Запуск модуля
   */
  async runModule(moduleName, params = {}) {
    if (!this.modules[moduleName]) {
      throw new Error(`Module ${moduleName} not initialized`);
    }

    try {
      const result = await this.modules[moduleName].execute(params);
      return { module: moduleName, result };
    } catch (error) {
      this.emit('error', { module: moduleName, error: error.message });
      throw error;
    }
  }

  /**
   * Пауза обработки
   */
  pause() {
    if (this.taskQueue) {
      this.taskQueue.pause();
    }
  }

  /**
   * Возобновление обработки
   */
  resume() {
    if (this.taskQueue) {
      this.taskQueue.resume();
    }
  }

  /**
   * Остановка обработки
   */
  stop() {
    if (this.taskQueue) {
      this.taskQueue.stop();
    }
    this.isRunning = false;
  }

  /**
   * Получение статуса
   */
  getStatus() {
    const queueStatus = this.taskQueue ? this.taskQueue.getStatus() : null;
    
    return {
      isRunning: this.isRunning,
      queue: queueStatus,
      modules: Object.keys(this.modules).filter(key => this.modules[key] !== null)
    };
  }

  /**
   * Проверка памяти (M1 оптимизация)
   */
  checkMemory() {
    const usage = process.memoryUsage();
    const used = usage.heapUsed;
    const percent = used / this.m1Limits.maxMemory;

    if (percent > this.m1Limits.memoryThreshold) {
      if (global.gc) {
        global.gc();
      }
      return false;
    }

    return true;
  }
}

module.exports = MonsterOrchestratorCore;
```

---

## 📊 ИТОГОВАЯ СТАТИСТИКА

### Модули:
- **Core модули:** 6 (все включены)
- **Extensions модули:** 4 (все отключены)
- **Утилиты:** 2
- **Dashboard компоненты:** 3
- **AI Knowledge Core:** 1

### Строки кода:
- **orchestrator-core.js:** 383 строки
- **Всего файлов:** 13

### События:
- **TaskQueue событий:** 11
- **Orchestrator событий:** 11

### API Endpoints:
- **Dashboard API:** 8 endpoints

---

**Дата создания:** 2025-12-03  
**Версия:** Monster 7.1 (Phi-3 TRIZ Edition)






