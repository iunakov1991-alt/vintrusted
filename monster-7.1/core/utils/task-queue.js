/**
 * MONSTER 7.1 — TASK QUEUE
 * 
 * ТРИЗ-принцип "ДИНАМИЧНОСТЬ":
 * - Очередь задач с возможностью паузы/возобновления
 * - Батчи (maxPagesPerRun: 20-50 страниц за прогон)
 * - Прогресс-бар и статус в дашборде
 */

const EventEmitter = require('events');

class TaskQueue extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.maxPagesPerRun = config.batches?.maxPagesPerRun || 20;
    this.queue = [];
    this.currentTask = null;
    this.isPaused = false;
    this.isProcessing = false;
    this.progress = {
      completed: 0,
      total: 0,
      failed: 0,
      current: null
    };
  }

  /**
   * Добавление задачи в очередь
   */
  addTask(task) {
    this.queue.push({
      ...task,
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      createdAt: new Date()
    });
    this.progress.total++;
    this.emit('task:added', { task, total: this.progress.total });
  }

  /**
   * Добавление нескольких задач (батч)
   */
  addBatch(tasks) {
    const batchSize = Math.min(tasks.length, this.maxPagesPerRun);
    const batch = tasks.slice(0, batchSize);
    
    batch.forEach(task => this.addTask(task));
    
    this.emit('batch:added', {
      batchSize: batch.length,
      total: this.progress.total
    });

    return batch.length;
  }

  /**
   * Обработка очереди
   */
  async processQueue() {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    this.emit('queue:started');

    while (this.queue.length > 0 && !this.isPaused) {
      const task = this.queue.shift();
      this.currentTask = task;
      this.progress.current = task.id;

      try {
        this.emit('task:started', { task });
        task.status = 'processing';
        
        const result = await this.executeTask(task);
        
        task.status = 'completed';
        task.result = result;
        this.progress.completed++;
        
        this.emit('task:completed', { task, result });
      } catch (error) {
        task.status = 'failed';
        task.error = error.message;
        this.progress.failed++;
        
        this.emit('task:failed', { task, error });
      } finally {
        this.currentTask = null;
        this.progress.current = null;
      }
    }

    this.isProcessing = false;
    
    if (this.queue.length === 0) {
      this.emit('queue:completed', { progress: this.progress });
    } else if (this.isPaused) {
      this.emit('queue:paused', { progress: this.progress });
    }
  }

  /**
   * Выполнение задачи (переопределяется в наследниках)
   */
  async executeTask(task) {
    // Должен быть переопределён в наследниках
    throw new Error('executeTask must be implemented');
  }

  /**
   * Пауза обработки
   */
  pause() {
    this.isPaused = true;
    this.emit('queue:paused', { progress: this.progress });
  }

  /**
   * Возобновление обработки
   */
  resume() {
    this.isPaused = false;
    this.emit('queue:resumed', { progress: this.progress });
    this.processQueue();
  }

  /**
   * Остановка обработки
   */
  stop() {
    this.isPaused = true;
    this.queue = [];
    this.currentTask = null;
    this.isProcessing = false;
    this.emit('queue:stopped', { progress: this.progress });
  }

  /**
   * Получение статуса
   */
  getStatus() {
    return {
      isProcessing: this.isProcessing,
      isPaused: this.isPaused,
      queueLength: this.queue.length,
      currentTask: this.currentTask?.id || null,
      progress: { ...this.progress }
    };
  }

  /**
   * Очистка очереди
   */
  clear() {
    this.queue = [];
    this.currentTask = null;
    this.progress = {
      completed: 0,
      total: 0,
      failed: 0,
      current: null
    };
    this.emit('queue:cleared');
  }
}

module.exports = TaskQueue;











