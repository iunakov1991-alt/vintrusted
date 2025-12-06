// batch_scheduler.js
// Планировщик партий для MONSTER 8.0

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SCHEDULE_FILE = path.join(ROOT, 'data', 'batch-schedule.json');
const HISTORY_FILE = path.join(ROOT, 'data', 'batch-history.json');
const CONFIG_FILE = path.join(ROOT, 'config', 'batch-strategy.json');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function log(msg) {
  const now = new Date().toISOString();
  console.log(`[BATCH-SCHEDULER] ${now} - ${msg}`);
}

/**
 * Загружает стратегию планирования
 */
function loadStrategy() {
  const defaultStrategy = {
    minIntervalHours: 24, // Минимальный интервал между партиями
    maxPagesPerBatch: 100, // Максимальное количество страниц в партии
    preferredTimes: ['09:00', '15:00', '21:00'], // Предпочтительное время запуска
    batchSizeStrategy: 'adaptive', // 'fixed', 'adaptive', 'progressive'
    workingDaysOnly: false, // Только рабочие дни
    timezone: 'America/New_York'
  };

  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      return { ...defaultStrategy, ...config };
    } catch (e) {
      log(`Error loading strategy: ${e.message}, using defaults`);
    }
  }

  // Создаем файл с дефолтной стратегией
  ensureDir(path.dirname(CONFIG_FILE));
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultStrategy, null, 2), 'utf8');
  return defaultStrategy;
}

/**
 * Загружает историю партий
 */
function loadHistory() {
  if (fs.existsSync(HISTORY_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    } catch (e) {
      log(`Error loading history: ${e.message}`);
    }
  }
  return { batches: [] };
}

/**
 * Сохраняет историю партий
 */
function saveHistory(history) {
  ensureDir(path.dirname(HISTORY_FILE));
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
}

/**
 * Загружает расписание
 */
function loadSchedule() {
  if (fs.existsSync(SCHEDULE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf8'));
    } catch (e) {
      log(`Error loading schedule: ${e.message}`);
    }
  }
  return { scheduled: [] };
}

/**
 * Сохраняет расписание
 */
function saveSchedule(schedule) {
  ensureDir(path.dirname(SCHEDULE_FILE));
  fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(schedule, null, 2), 'utf8');
}

/**
 * Вычисляет параметры следующей партии
 */
function calculateNextBatchParams(lastBatch, strategy) {
  const now = new Date();
  const lastBatchTime = lastBatch ? new Date(lastBatch.completedAt) : new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  // Вычисляем интервал с момента последней партии
  const hoursSinceLastBatch = (now - lastBatchTime) / (1000 * 60 * 60);
  
  // Определяем размер партии
  let batchSize = strategy.maxPagesPerBatch;
  if (strategy.batchSizeStrategy === 'adaptive') {
    // Адаптивный размер на основе времени с последней партии
    if (hoursSinceLastBatch < 12) {
      batchSize = Math.floor(strategy.maxPagesPerBatch * 0.5);
    } else if (hoursSinceLastBatch < 24) {
      batchSize = Math.floor(strategy.maxPagesPerBatch * 0.75);
    }
  } else if (strategy.batchSizeStrategy === 'progressive') {
    // Прогрессивное увеличение
    const batchNumber = lastBatch ? lastBatch.batchNumber + 1 : 1;
    batchSize = Math.min(strategy.maxPagesPerBatch, 20 + (batchNumber * 10));
  }

  // Вычисляем время следующей партии
  const nextTime = calculateNextBatchTime(lastBatchTime, strategy);
  
  return {
    batchSize,
    scheduledAt: nextTime.toISOString(),
    estimatedDuration: Math.ceil(batchSize * 2), // Примерно 2 минуты на страницу
    language: lastBatch && lastBatch.language === 'en' ? 'es' : 'en' // Чередование языков
  };
}

/**
 * Вычисляет время следующей партии
 */
function calculateNextBatchTime(lastBatchTime, strategy) {
  const now = new Date();
  const minInterval = strategy.minIntervalHours * 60 * 60 * 1000;
  const earliestTime = new Date(lastBatchTime.getTime() + minInterval);
  
  // Если минимальный интервал еще не прошел, используем его
  if (earliestTime > now) {
    return findNearestPreferredTime(earliestTime, strategy.preferredTimes);
  }
  
  // Иначе ищем ближайшее предпочтительное время сегодня или завтра
  return findNearestPreferredTime(now, strategy.preferredTimes);
}

/**
 * Находит ближайшее предпочтительное время
 */
function findNearestPreferredTime(fromTime, preferredTimes) {
  const result = new Date(fromTime);
  const [currentHour, currentMinute] = [fromTime.getHours(), fromTime.getMinutes()];
  
  // Пробуем найти время сегодня
  for (const timeStr of preferredTimes) {
    const [hour, minute] = timeStr.split(':').map(Number);
    const candidate = new Date(fromTime);
    candidate.setHours(hour, minute, 0, 0);
    
    if (candidate > fromTime) {
      return candidate;
    }
  }
  
  // Если ничего не нашли сегодня, берем первое время завтра
  const [hour, minute] = preferredTimes[0].split(':').map(Number);
  const tomorrow = new Date(fromTime);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(hour, minute, 0, 0);
  return tomorrow;
}

/**
 * Планирует следующую партию после успешного деплоя
 */
function scheduleNextBatch(completedBatch) {
  const strategy = loadStrategy();
  const schedule = loadSchedule();
  const history = loadHistory();
  
  // Добавляем завершенную партию в историю
  history.batches.push({
    ...completedBatch,
    completedAt: new Date().toISOString(),
    status: 'completed'
  });
  
  // Ограничиваем историю последними 50 партиями
  if (history.batches.length > 50) {
    history.batches = history.batches.slice(-50);
  }
  saveHistory(history);
  
  // Вычисляем параметры следующей партии
  const nextBatchParams = calculateNextBatchParams(completedBatch, strategy);
  
  const nextBatch = {
    batchId: `batch-${Date.now()}`,
    batchNumber: (completedBatch?.batchNumber || 0) + 1,
    scheduledAt: nextBatchParams.scheduledAt,
    estimatedPages: nextBatchParams.batchSize,
    language: nextBatchParams.language,
    estimatedDuration: nextBatchParams.estimatedDuration,
    status: 'scheduled',
    createdAt: new Date().toISOString()
  };
  
  // Добавляем в расписание
  schedule.scheduled.push(nextBatch);
  
  // Удаляем старые завершенные расписания (старше 7 дней)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  schedule.scheduled = schedule.scheduled.filter(b => {
    const scheduledDate = new Date(b.scheduledAt);
    return scheduledDate > weekAgo || b.status === 'scheduled';
  });
  
  saveSchedule(schedule);
  
  log(`Next batch scheduled: ${nextBatch.batchId} at ${nextBatch.scheduledAt} (${nextBatch.estimatedPages} pages, ${nextBatch.language})`);
  
  return nextBatch;
}

/**
 * Получает ближайшую запланированную партию
 */
function getNextScheduledBatch() {
  const schedule = loadSchedule();
  const now = new Date();
  
  const upcoming = schedule.scheduled
    .filter(b => b.status === 'scheduled' && new Date(b.scheduledAt) > now)
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  
  return upcoming[0] || null;
}

/**
 * Получает историю партий
 */
function getBatchHistory(limit = 20) {
  const history = loadHistory();
  return history.batches.slice(-limit).reverse();
}

/**
 * Генерирует превью партии
 */
function generateBatchPreview(params) {
  const strategy = loadStrategy();
  const history = loadHistory();
  const lastBatch = history.batches[history.batches.length - 1] || null;
  
  const preview = {
    estimatedPages: params.batchSize || strategy.maxPagesPerBatch,
    language: params.language || (lastBatch && lastBatch.language === 'en' ? 'es' : 'en'),
    estimatedDuration: Math.ceil((params.batchSize || strategy.maxPagesPerBatch) * 2),
    topics: {
      states: params.states || ['CA', 'TX', 'FL', 'NY', 'AZ'],
      zones: params.zones || ['dmv_titles', 'vin_identity'],
      formats: params.formats || ['checklist', 'guide']
    },
    priority: 'high',
    autoDeploy: params.autoDeploy !== false
  };
  
  return preview;
}

/**
 * Отмечает партию как выполненную
 */
function markBatchCompleted(batchId, result) {
  const schedule = loadSchedule();
  const batch = schedule.scheduled.find(b => b.batchId === batchId);
  
  if (batch) {
    batch.status = 'completed';
    batch.completedAt = new Date().toISOString();
    batch.result = result;
    saveSchedule(schedule);
    
    // Планируем следующую партию
    scheduleNextBatch({
      batchNumber: batch.batchNumber,
      language: batch.language,
      pagesGenerated: result.pagesGenerated || 0,
      pagesDeployed: result.pagesDeployed || 0
    });
  }
}

module.exports = {
  scheduleNextBatch,
  getNextScheduledBatch,
  getBatchHistory,
  generateBatchPreview,
  markBatchCompleted,
  loadStrategy,
  loadSchedule,
  loadHistory
};
