/**
 * MONSTER 7.0 — ОРКЕСТРАТОР
 * 
 * Управляет всеми модулями A-I через единый интерфейс.
 * Все запуски происходят ТОЛЬКО через Dashboard API.
 */

const EventEmitter = require('events');
const path = require('path');

class MonsterOrchestrator extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.modules = {};
    this.tasks = new Map();
    this.isRunning = false;
    
    // M1 оптимизация: ограничения памяти
    this.m1Limits = {
      maxMemory: 6 * 1024 * 1024 * 1024, // 6GB
      maxConcurrency: 4, // 4 параллельных задачи
      memoryThreshold: 0.85 // 85% использования памяти
    };
  }

  /**
   * Инициализация всех модулей
   */
  async initialize() {
    try {
      // [A] Semantic Scanner
      const SemanticScanner = require('./modules/semantic-scanner');
      this.modules.semanticScanner = new SemanticScanner(this.config);

      // [B] Strategy Generator
      const StrategyGenerator = require('./modules/strategy-generator');
      this.modules.strategyGenerator = new StrategyGenerator(this.config);

      // [C] Prompt Engine
      const PromptEngine = require('./modules/prompt-engine');
      this.modules.promptEngine = new PromptEngine(this.config);

      // [D] Evolution Engine
      const EvolutionEngine = require('./modules/evolution-engine');
      this.modules.evolutionEngine = new EvolutionEngine(this.config);

      // [E] TRIZ Repair
      const TRIZRepair = require('./modules/triz-repair');
      this.modules.trizRepair = new TRIZRepair(this.config);

      // [F] Library Scanner
      const LibraryScanner = require('./modules/library-scanner');
      this.modules.libraryScanner = new LibraryScanner(this.config);

      // [G] AI Knowledge Core
      const AIKnowledgeCore = require('./ai-knowledge-core/knowledge-core');
      this.modules.aiKnowledgeCore = new AIKnowledgeCore(this.config);

      // [I] Performance Learner
      const PerformanceLearner = require('./modules/performance-learner');
      this.modules.performanceLearner = new PerformanceLearner(this.config);

      // Self Questions Generator
      const SelfQuestionsGenerator = require('./modules/self-questions-generator');
      this.modules.selfQuestions = new SelfQuestionsGenerator(this.config);

      // Content Generator
      const ContentGenerator = require('./modules/content-generator');
      this.modules.contentGenerator = new ContentGenerator(this.config);

      // Report Generator
      const ReportGenerator = require('./modules/report-generator');
      this.modules.reportGenerator = new ReportGenerator(this.config);

      this.emit('initialized');
      return true;
    } catch (error) {
      this.emit('error', { module: 'orchestrator', error: error.message });
      throw error;
    }
  }

  /**
   * Проверка доступности памяти (M1 оптимизация)
   */
  checkMemory() {
    const usage = process.memoryUsage();
    const used = usage.heapUsed;
    const total = usage.heapTotal;
    const percent = used / this.m1Limits.maxMemory;

    if (percent > this.m1Limits.memoryThreshold) {
      // Критическое использование памяти
      if (global.gc) {
        global.gc();
      }
      return false; // Не запускать новые задачи
    }

    return true; // Можно запускать
  }

  /**
   * Запуск модуля через Dashboard API
   */
  async runModule(moduleName, params = {}) {
    // Проверка: запуск только через Dashboard
    if (!params.fromDashboard) {
      throw new Error(`Module ${moduleName} can only be run through Dashboard!`);
    }

    // Проверка памяти
    if (!this.checkMemory()) {
      throw new Error('Memory limit exceeded. Please wait for current tasks to complete.');
    }

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const task = {
      id: taskId,
      module: moduleName,
      params,
      status: 'pending',
      startTime: Date.now(),
      progress: 0
    };

    this.tasks.set(taskId, task);
    this.emit('task:started', task);

    try {
      const module = this.modules[moduleName];
      if (!module) {
        throw new Error(`Module ${moduleName} not found`);
      }

      // Обновление статуса
      task.status = 'running';
      this.emit('task:running', task);

      // Запуск модуля
      const result = await module.execute(params);

      // Успешное завершение
      task.status = 'completed';
      task.endTime = Date.now();
      task.duration = task.endTime - task.startTime;
      task.result = result;
      this.emit('task:completed', task);

      return { taskId, result };
    } catch (error) {
      // Ошибка
      task.status = 'failed';
      task.endTime = Date.now();
      task.duration = task.endTime - task.startTime;
      task.error = error.message;
      this.emit('task:failed', task);

      // TRIZ самопочинка
      await this.modules.trizRepair.repair(error, { module: moduleName, taskId });

      throw error;
    }
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

      // 1. Semantic Scanner
      this.emit('cycle:step', { step: 1, name: 'Semantic Scanner' });
      results.semanticMap = await this.runModule('semanticScanner', {
        ...params,
        fromDashboard: true
      });

      // 2. Strategy Generator
      this.emit('cycle:step', { step: 2, name: 'Strategy Generator' });
      results.strategy = await this.runModule('strategyGenerator', {
        semanticMap: results.semanticMap.result,
        ...params,
        fromDashboard: true
      });

      // 3. Prompt Engine
      this.emit('cycle:step', { step: 3, name: 'Prompt Engine' });
      results.prompts = await this.runModule('promptEngine', {
        strategy: results.strategy.result,
        ...params,
        fromDashboard: true
      });

      // 3.5. Content Generator
      this.emit('cycle:step', { step: 3.5, name: 'Content Generator' });
      results.content = await this.runModule('contentGenerator', {
        strategy: results.strategy,
        semanticMap: results.semanticMap,
        prompts: results.prompts,
        ...params,
        fromDashboard: true
      });

      // 4. Evolution Engine
      this.emit('cycle:step', { step: 4, name: 'Evolution Engine' });
      results.evolution = await this.runModule('evolutionEngine', {
        strategy: results.strategy.result,
        ...params,
        fromDashboard: true
      });

      // 5. TRIZ Repair
      this.emit('cycle:step', { step: 5, name: 'TRIZ Repair' });
      results.repair = await this.runModule('trizRepair', {
        ...results,
        ...params,
        fromDashboard: true
      });

      // 6. Library Scanner
      this.emit('cycle:step', { step: 6, name: 'Library Scanner' });
      results.libraries = await this.runModule('libraryScanner', {
        ...params,
        fromDashboard: true
      });

      // 7. Performance Learner
      this.emit('cycle:step', { step: 7, name: 'Performance Learner' });
      results.performance = await this.runModule('performanceLearner', {
        ...results,
        ...params,
        fromDashboard: true
      });

      // 8. Generate Self-Questions
      this.emit('cycle:step', { step: 8, name: 'Generating Questions' });
      if (this.modules.selfQuestions) {
        const questions = await this.modules.selfQuestions.generateQuestions(results);
        const explanations = await this.modules.selfQuestions.generateExplanations(results);
        results.questions = questions;
        results.explanations = explanations;
      }

      // 9. Generate Report
      this.emit('cycle:step', { step: 9, name: 'Generating Report' });
      if (this.modules.reportGenerator) {
        results.report = await this.runModule('reportGenerator', {
          results,
          format: 'json',
          ...params,
          fromDashboard: true
        });
      }

      this.isRunning = false;
      this.emit('cycle:completed', results);

      return results;
    } catch (error) {
      this.isRunning = false;
      this.emit('cycle:failed', error);
      throw error;
    }
  }

  /**
   * Получение статуса задачи
   */
  getTaskStatus(taskId) {
    return this.tasks.get(taskId) || null;
  }

  /**
   * Получение всех задач
   */
  getAllTasks() {
    return Array.from(this.tasks.values());
  }

  /**
   * Остановка всех задач
   */
  async stop() {
    this.isRunning = false;
    this.emit('stopped');
  }
}

module.exports = MonsterOrchestrator;

