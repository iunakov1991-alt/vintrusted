// batch_scheduler.js
// Планировщик партий для MONSTER 8.0

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SCHEDULE_FILE = path.join(ROOT, 'data', 'batch-schedule.json');
const HISTORY_FILE = path.join(ROOT, 'data', 'batch-history.json');
const CONFIG_FILE = path.join(ROOT, 'config', 'batch-strategy.json');
const DEPLOY_STATUS_FILE = path.join(ROOT, 'tmp', 'deploy-status.json');

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
 * Получает количество страниц на проде
 */
function getDeployedPagesCount() {
  try {
    const deployStatusPath = path.join(ROOT, 'tmp', 'deploy-status.json');
    if (fs.existsSync(deployStatusPath)) {
      const status = JSON.parse(fs.readFileSync(deployStatusPath, 'utf8'));
      return status.total?.deployed || 0;
    }
  } catch (e) {
    // Игнорируем ошибки
  }
  return 0;
}

/**
 * Вычисляет параметры следующей партии
 */
function calculateNextBatchParams(lastBatch, strategy) {
  const now = new Date();
  const lastBatchTime = lastBatch ? new Date(lastBatch.completedAt) : new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  // Вычисляем интервал с момента последней партии
  const hoursSinceLastBatch = (now - lastBatchTime) / (1000 * 60 * 60);
  
  // Получаем количество страниц на проде
  const deployedPages = getDeployedPagesCount();
  
  // Определяем размер партии
  let batchSize = strategy.maxPagesPerBatch;
  if (strategy.batchSizeStrategy === 'adaptive') {
    // Адаптивный размер на основе времени с последней партии И количества страниц на проде
    
    // Базовый расчет по времени
    let timeBasedSize = strategy.maxPagesPerBatch;
    if (hoursSinceLastBatch < 12) {
      timeBasedSize = Math.floor(strategy.maxPagesPerBatch * 0.5);
    } else if (hoursSinceLastBatch < 24) {
      timeBasedSize = Math.floor(strategy.maxPagesPerBatch * 0.75);
    }
    
    // Корректировка на основе страниц на проде
    // Если на проде мало страниц (< 50), увеличиваем размер партии
    let productionMultiplier = 1.0;
    if (deployedPages < 10) {
      // Очень мало страниц - увеличиваем в 2 раза (но не больше максимума)
      productionMultiplier = 2.0;
    } else if (deployedPages < 50) {
      // Мало страниц - увеличиваем на 50%
      productionMultiplier = 1.5;
    } else if (deployedPages < 200) {
      // Среднее количество - нормальный размер
      productionMultiplier = 1.0;
    } else {
      // Много страниц - можно уменьшить
      productionMultiplier = 0.9;
    }
    
    batchSize = Math.min(
      strategy.maxPagesPerBatch,
      Math.floor(timeBasedSize * productionMultiplier)
    );
    
    // Минимум 5 страниц, даже если расчет дал меньше
    batchSize = Math.max(5, batchSize);
    
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
 * Загружает очередь тем
 */
function loadQueue() {
  const queuePath = path.join(ROOT, 'data', 'topics_queue.json');
  if (fs.existsSync(queuePath)) {
    try {
      return JSON.parse(fs.readFileSync(queuePath, 'utf8'));
    } catch (e) {
      log(`Error loading queue: ${e.message}`);
    }
  }
  return [];
}

/**
 * Извлекает информацию из очереди
 */
function extractQueueInfo(queue) {
  const states = new Set();
  const zones = new Set();
  const formats = new Set();
  const languages = new Set();
  
  queue.forEach(item => {
    const topicFile = item.topic_file || item.path || item.topicFile;
    if (!topicFile) return;
    
    // Извлекаем state (ищем в названии файла и в содержимом JSON)
    let state = null;
    
    // 1. Из названия файла
    const stateMatch = topicFile.match(/\b(ca|tx|fl|ny|az|il|pa|oh|ga|nc|mi|wa|co|va|ma|tn|in|mo|md|wi|mn|sc|al|la|ky|or|ok|ct|ia|ut|ar|ms|ks|nm|nv|wv|ne|id|hi|nh|me|ri|mt|de|sd|nd|ak|dc|vt|wy)\b/i);
    if (stateMatch) {
      state = stateMatch[1].toUpperCase();
    } else {
      // 2. Из содержимого JSON файла
      try {
        const topicPath = path.join(ROOT, topicFile);
        if (fs.existsSync(topicPath)) {
          const topicData = JSON.parse(fs.readFileSync(topicPath, 'utf8'));
          if (topicData.dimensions && topicData.dimensions.state) {
            state = topicData.dimensions.state.toUpperCase();
          } else if (topicData.state) {
            state = topicData.state.toUpperCase();
          }
        }
      } catch (e) {
        // Игнорируем ошибки
      }
    }
    
    if (state) states.add(state);
    
    // Извлекаем zone
    if (topicFile.includes('dmv') || topicFile.includes('title')) zones.add('dmv_titles');
    if (topicFile.includes('vin')) zones.add('vin_identity');
    if (topicFile.includes('accident')) zones.add('accident_history');
    if (topicFile.includes('recall')) zones.add('recall_info');
    
    // Извлекаем format
    if (topicFile.includes('checklist')) formats.add('checklist');
    if (topicFile.includes('guide')) formats.add('guide');
    if (topicFile.includes('step')) formats.add('step_by_step');
    if (topicFile.includes('comparison')) formats.add('comparison');
    
    // Извлекаем language
    if (topicFile.includes('_es_') || topicFile.includes('/es/')) languages.add('ES');
    if (topicFile.includes('_en_') || topicFile.includes('/en/') || !topicFile.includes('_es_')) languages.add('EN');
  });
  
  return {
    states: Array.from(states).sort(),
    zones: Array.from(zones).sort(),
    formats: Array.from(formats).sort(),
    languages: Array.from(languages).sort()
  };
}

/**
 * Генерирует превью партии
 */
function generateBatchPreview(params) {
  const strategy = loadStrategy();
  const history = loadHistory();
  const lastBatch = history.batches[history.batches.length - 1] || null;
  
  // Загружаем очередь для проверки реального количества
  const queue = loadQueue();
  const queueSize = Array.isArray(queue) ? queue.length : 0;
  
  // Используем адаптивную стратегию для расчета размера
  const batchParams = calculateNextBatchParams(lastBatch, strategy);
  let estimatedPages = batchParams.batchSize;
  
  // Ограничиваем реальным количеством в очереди
  if (queueSize > 0 && estimatedPages > queueSize) {
    estimatedPages = queueSize;
  }
  
  // Извлекаем информацию из очереди
  const queueInfo = extractQueueInfo(queue);
  
  // Определяем язык
  let language = params.language;
  if (!language) {
    if (lastBatch && lastBatch.language) {
      language = lastBatch.language === 'en' ? 'es' : 'en';
    } else {
      // Проверяем реальные темы в очереди (читаем JSON файлы)
      let enCount = 0;
      let esCount = 0;
      
      if (queueSize > 0) {
        queue.forEach(item => {
          const topicFile = item.topic_file || item.path || item.topicFile;
          if (!topicFile) return;
          
          try {
            const topicPath = path.join(ROOT, topicFile);
            if (fs.existsSync(topicPath)) {
              const topicData = JSON.parse(fs.readFileSync(topicPath, 'utf8'));
              const topicLang = (topicData.language || '').toLowerCase();
              if (topicLang === 'es' || topicLang === 'es-mx' || topicLang === 'es-us') {
                esCount++;
              } else {
                enCount++;
              }
            } else {
              // Fallback: по имени файла
              const file = topicFile.toLowerCase();
              if (file.includes('_es_') || file.includes('/es/') || file.includes('es_mx')) {
                esCount++;
              } else {
                enCount++;
              }
            }
          } catch (e) {
            // Fallback: по имени файла
            const file = (topicFile || '').toLowerCase();
            if (file.includes('_es_') || file.includes('/es/') || file.includes('es_mx')) {
              esCount++;
            } else {
              enCount++;
            }
          }
        });
        
        language = enCount >= esCount ? 'EN' : 'ES';
      } else {
        // Если очереди нет, используем стратегию
        const deployStatusPath = path.join(ROOT, 'tmp', 'deploy-status.json');
        let deployedPages = 0;
        if (fs.existsSync(deployStatusPath)) {
          try {
            const status = JSON.parse(fs.readFileSync(deployStatusPath, 'utf8'));
            deployedPages = status.total?.deployed || 0;
          } catch (e) {}
        }
        
        // Если на проде мало страниц, начинаем с EN (приоритет английскому)
        language = deployedPages < 100 ? 'en' : 'en'; // Всегда начинаем с EN
      }
    }
  }
  
  // Нормализуем язык (EN/ES) - приоритет английскому
  if (typeof language === 'string') {
    language = language.toLowerCase();
    if (language === 'en' || language === 'en-us') language = 'en';
    if (language === 'es' || language === 'es-us' || language === 'es-mx') language = 'es';
  } else {
    // По умолчанию английский
    language = 'en';
  }
  
  // Если очередь пустая, используем дефолтные значения из стратегии
  let finalStates = queueInfo.states.length > 0 ? queueInfo.states : (params.states || []);
  let finalZones = queueInfo.zones.length > 0 ? queueInfo.zones : (params.zones || []);
  let finalFormats = queueInfo.formats.length > 0 ? queueInfo.formats : (params.formats || []);
  
  // Если все пусто, используем дефолты из semantic_core.json
  if (finalStates.length === 0 && finalZones.length === 0 && finalFormats.length === 0) {
    // Загружаем дефолтные значения из конфига
    try {
      const semanticCorePath = path.join(ROOT, 'config', 'semantic_core.json');
      if (fs.existsSync(semanticCorePath)) {
        const semanticCore = JSON.parse(fs.readFileSync(semanticCorePath, 'utf8'));
        // Берем первые несколько штатов из списка
        const statesConfig = semanticCore.dimensions?.geo?.usa_states;
        if (statesConfig && typeof statesConfig === 'string' && statesConfig.includes('states_us.json')) {
          const statesPath = path.join(ROOT, 'config', 'states_us.json');
          if (fs.existsSync(statesPath)) {
            const statesData = JSON.parse(fs.readFileSync(statesPath, 'utf8'));
            finalStates = Array.isArray(statesData) ? statesData.slice(0, 10).map(s => s.code || s.abbr || s) : [];
          }
        }
        // Берем зоны
        if (semanticCore.zones && Array.isArray(semanticCore.zones)) {
          finalZones = semanticCore.zones.slice(0, 5).map(z => z.id || z);
        }
        // Берем форматы
        if (semanticCore.variation_formats && Array.isArray(semanticCore.variation_formats)) {
          finalFormats = semanticCore.variation_formats.slice(0, 3);
        }
      }
    } catch (e) {
      log(`Error loading defaults from semantic_core.json: ${e.message}`);
    }
  }
  
  const preview = {
    estimatedPages: estimatedPages || 0,
    expectedPages: estimatedPages || 0, // Дублируем для совместимости
    language: language,
    estimatedDuration: estimatedPages > 0 ? Math.ceil(estimatedPages * 2) : 0, // 2 минуты на страницу
    expectedDuration: estimatedPages > 0 ? Math.ceil(estimatedPages * 2) : 0, // Дублируем для совместимости
    topics: {
      states: finalStates,
      zones: finalZones,
      formats: finalFormats
    },
    // Также добавляем на верхний уровень для совместимости
    states: finalStates,
    zones: finalZones,
    formats: finalFormats,
    priority: 'high',
    autoDeploy: params.autoDeploy !== false,
    queueSize, // Добавляем информацию о реальном размере очереди
    note: queueSize > 0 && estimatedPages > queueSize ? `В очереди только ${queueSize} страниц, будет сгенерировано ${queueSize}` : null
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

