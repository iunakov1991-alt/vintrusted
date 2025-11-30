const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

/**
 * SEO Dashboard API
 * Получение статистики, запуск билда, рекомендации
 */
module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const action = req.query.action || req.body?.action || 'stats';

  try {
    switch (action) {
      case 'stats':
        return await getStats(req, res);
      case 'build':
        return await triggerBuild(req, res);
      case 'recommendations':
        return await getRecommendations(req, res);
      default:
        return res.status(400).json({ error: 'Unknown action' });
    }
  } catch (error) {
    console.error('Dashboard API error:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Получение статистики
 */
async function getStats(req, res) {
  const dashboardPath = path.join(process.cwd(), 'public', 'internal', 'seo-dashboard.json');
  const rlStatePath = path.join(process.cwd(), 'data', 'seo', 'rl-state.json');
  const configPath = path.join(process.cwd(), 'data', 'seo', 'config.json');

  let dashboard = {};
  let rlState = {};
  let config = {};

  // Загрузка данных
  if (fs.existsSync(dashboardPath)) {
    dashboard = JSON.parse(fs.readFileSync(dashboardPath, 'utf8'));
  }

  if (fs.existsSync(rlStatePath)) {
    rlState = JSON.parse(fs.readFileSync(rlStatePath, 'utf8'));
  }

  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }

  // Подсчет страниц
  const vinDir = path.join(process.cwd(), 'public', 'vin');
  let totalPages = 0;
  let pagesByState = {};
  
  if (fs.existsSync(vinDir)) {
    const states = fs.readdirSync(vinDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory());
    
    for (const state of states) {
      const statePath = path.join(vinDir, state.name);
      const vins = fs.readdirSync(statePath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory());
      
      for (const vin of vins) {
        const vinPath = path.join(statePath, vin.name);
        const indexFile = path.join(vinPath, 'index.html');
        if (fs.existsSync(indexFile)) {
          totalPages++;
          pagesByState[state.name] = (pagesByState[state.name] || 0) + 1;
        }
      }
    }
  }

  // Последний билд
  const lastBuild = dashboard.lastBuild || {};
  const avgQuality = lastBuild.avgQuality || 0;
  const acceptedPages = lastBuild.pagesAccepted || 0;
  const totalGenerated = lastBuild.pagesGenerated || 0;
  const rejectedPages = totalGenerated - acceptedPages;

  // Топ 10 страниц (по качеству)
  const topPages = (dashboard.topPages || []).slice(0, 10);

  // Рекомендации
  const recommendations = generateRecommendations(dashboard, rlState, config, {
    totalPages,
    avgQuality,
    acceptedPages,
    rejectedPages
  });

  // Оптимальное расписание
  const schedule = calculateOptimalSchedule(dashboard, config);

  return res.json({
    stats: {
      totalPages,
      pagesByState,
      lastBuild: {
        timestamp: lastBuild.timestamp,
        pagesGenerated: totalGenerated,
        pagesAccepted: acceptedPages,
        pagesRejected: rejectedPages,
        avgQuality: avgQuality.toFixed(3),
        qualityBreakdown: lastBuild.qualityBreakdown || {}
      },
      topPages,
      rlState: {
        intents: Object.keys(rlState.intentWeights || {}).length,
        languages: Object.keys(rlState.languageWeights || {}).length,
        layouts: Object.keys(rlState.layoutWeights || {}).length,
        lastUpdated: rlState.lastUpdated
      }
    },
    recommendations,
    schedule,
    config: {
      targetPages: config.targetPagesPerBuild || 10000,
      minQuality: config.minQualityScore || 0.70,
      semanticWeight: config.semanticRequirements?.semanticWeightInQuality || 0.20
    }
  });
}

/**
 * Запуск билда
 */
async function triggerBuild(req, res) {
  // Проверка, не запущен ли уже билд
  const lockFile = path.join(process.cwd(), '.seo-build-running.lock');
  if (fs.existsSync(lockFile)) {
    return res.status(429).json({ 
      error: 'Build already in progress',
      message: 'Пожалуйста, подождите. Билд уже запущен.'
    });
  }

  // Создаем lock файл
  fs.writeFileSync(lockFile, JSON.stringify({ 
    timestamp: Date.now(),
    pid: process.pid
  }), 'utf8');

  // Запускаем билд в фоне
  const buildScript = path.join(process.cwd(), 'scripts', 'seo', 'seo-master-build.js');
  
  exec(`node ${buildScript}`, (error, stdout, stderr) => {
    // Удаляем lock после завершения
    if (fs.existsSync(lockFile)) {
      fs.unlinkSync(lockFile);
    }
    
    if (error) {
      console.error('Build error:', error);
    }
  });

  return res.json({ 
    success: true,
    message: 'Билд запущен! Статистика обновится через несколько минут.',
    estimatedTime: '2-5 минут'
  });
}

/**
 * Получение рекомендаций
 */
function getRecommendations(req, res) {
  const dashboardPath = path.join(process.cwd(), 'public', 'internal', 'seo-dashboard.json');
  const rlStatePath = path.join(process.cwd(), 'data', 'seo', 'rl-state.json');
  
  let dashboard = {};
  let rlState = {};
  
  if (fs.existsSync(dashboardPath)) {
    dashboard = JSON.parse(fs.readFileSync(dashboardPath, 'utf8'));
  }
  
  if (fs.existsSync(rlStatePath)) {
    rlState = JSON.parse(fs.readFileSync(rlStatePath, 'utf8'));
  }

  const recommendations = generateRecommendations(dashboard, rlState, {}, {});
  
  return res.json({ recommendations });
}

/**
 * Генерация рекомендаций
 */
function generateRecommendations(dashboard, rlState, config, stats) {
  const recommendations = [];
  const warnings = [];
  const suggestions = [];

  // Анализ качества
  if (stats.avgQuality < 0.75) {
    warnings.push({
      type: 'quality',
      level: 'warning',
      title: 'Среднее качество ниже оптимального',
      message: `Текущее качество: ${(stats.avgQuality * 100).toFixed(1)}%. Рекомендуется: 75%+.`,
      action: 'Проверьте Semantic Score и убедитесь, что Tier 1 темы покрыты в контенте.'
    });
  } else {
    suggestions.push({
      type: 'quality',
      level: 'success',
      title: 'Отличное качество!',
      message: `Качество: ${(stats.avgQuality * 100).toFixed(1)}% - отличный результат!`
    });
  }

  // Анализ отклоненных страниц
  const rejectionRate = stats.totalGenerated > 0 
    ? (stats.rejectedPages / stats.totalGenerated) * 100 
    : 0;
  
  if (rejectionRate > 20) {
    warnings.push({
      type: 'rejection',
      level: 'warning',
      title: 'Высокий процент отклоненных страниц',
      message: `Отклонено: ${rejectionRate.toFixed(1)}% страниц.`,
      action: 'Проверьте minQualityScore в config.json или улучшите baseline контент.'
    });
  }

  // Анализ RL state
  if (!rlState.lastUpdated || (Date.now() - new Date(rlState.lastUpdated).getTime()) > 7 * 24 * 60 * 60 * 1000) {
    suggestions.push({
      type: 'rl-state',
      level: 'info',
      title: 'RL state не обновлялся более недели',
      message: 'Рекомендуется запустить билд для обновления весов обучения.',
      action: 'Нажмите "Запустить билд" для обновления.'
    });
  }

  // Анализ метрик
  const hasGSCData = dashboard.gscStats?.urlsWithData > 0;
  const hasGAData = dashboard.externalStats?.urlsWithBounceRate > 0;

  if (!hasGSCData && !hasGAData) {
    suggestions.push({
      type: 'metrics',
      level: 'info',
      title: 'Нет данных из GSC/GA',
      message: 'Импорт метрик из Google Search Console и Google Analytics улучшит обучение системы.',
      action: 'Используйте утилиты импорта или настройте автоматический импорт через GitHub Actions.'
    });
  } else if (hasGSCData || hasGAData) {
    suggestions.push({
      type: 'metrics',
      level: 'success',
      title: 'Метрики импортированы',
      message: hasGSCData && hasGAData 
        ? 'GSC и GA данные доступны - система использует продвинутое обучение!'
        : hasGSCData 
          ? 'GSC данные доступны'
          : 'GA данные доступны'
    });
  }

  // Анализ количества страниц
  if (stats.totalPages < 100) {
    suggestions.push({
      type: 'volume',
      level: 'info',
      title: 'Мало страниц для эффективного обучения',
      message: `Текущее количество: ${stats.totalPages}. Для лучшего обучения рекомендуется 100+ страниц.`,
      action: 'Запустите билд для генерации большего количества страниц.'
    });
  }

  // Анализ layout весов
  const layouts = rlState.layoutWeights || {};
  const layoutEntries = Object.entries(layouts);
  if (layoutEntries.length > 0) {
    const bestLayout = layoutEntries.sort((a, b) => b[1] - a[1])[0];
    const worstLayout = layoutEntries.sort((a, b) => a[1] - b[1])[0];
    
    if (bestLayout[1] - worstLayout[1] > 0.1) {
      suggestions.push({
        type: 'layout',
        level: 'info',
        title: 'Обнаружены лучшие layout\'ы',
        message: `Layout "${bestLayout[0]}" показывает лучшие результаты (вес: ${bestLayout[1].toFixed(3)}).`,
        action: 'Система автоматически предпочитает лучшие layout\'ы.'
      });
    }
  }

  // Пожелания от машины
  const machineWishes = [];
  
  if (stats.avgQuality > 0.85) {
    machineWishes.push({
      type: 'praise',
      message: '🎉 Отличная работа! Качество контента на высоком уровне.'
    });
  }
  
  if (hasGSCData && hasGAData) {
    machineWishes.push({
      type: 'praise',
      message: '📊 Продвинутое обучение активно - система учится на реальных метриках!'
    });
  }
  
  if (stats.totalPages > 1000) {
    machineWishes.push({
      type: 'praise',
      message: `🚀 Отличный объем: ${stats.totalPages} страниц! Система имеет много данных для обучения.`
    });
  }

  return {
    warnings,
    suggestions,
    machineWishes,
    summary: {
      totalWarnings: warnings.length,
      totalSuggestions: suggestions.length,
      totalWishes: machineWishes.length
    }
  };
}

/**
 * Расчет оптимального расписания
 */
function calculateOptimalSchedule(dashboard, config) {
  const lastBuild = dashboard.lastBuild || {};
  const lastBuildTime = lastBuild.timestamp ? new Date(lastBuild.timestamp) : null;
  
  const now = new Date();
  const hoursSinceLastBuild = lastBuildTime 
    ? (now - lastBuildTime) / (1000 * 60 * 60)
    : null;

  // Рекомендации по расписанию
  const recommendations = [];
  
  if (!lastBuildTime || hoursSinceLastBuild > 168) { // 7 дней
    recommendations.push({
      type: 'urgent',
      message: 'Рекомендуется запустить билд - прошло более недели с последнего билда.',
      nextRun: 'Сейчас'
    });
  } else if (hoursSinceLastBuild > 72) { // 3 дня
    recommendations.push({
      type: 'suggested',
      message: 'Можно запустить билд для обновления контента.',
      nextRun: 'В ближайшие дни'
    });
  } else {
    recommendations.push({
      type: 'optimal',
      message: 'Билд недавно запускался. Оптимальная частота: раз в неделю.',
      nextRun: `Через ${Math.ceil(168 - hoursSinceLastBuild)} часов`
    });
  }

  // Оптимальное время для билда (на основе нагрузки)
  const optimalTimes = [
    { time: '02:00 UTC', reason: 'Низкая нагрузка, лучшее время для больших билдов' },
    { time: '14:00 UTC', reason: 'Рабочее время, можно мониторить процесс' }
  ];

  return {
    lastBuild: lastBuildTime ? lastBuildTime.toISOString() : null,
    hoursSinceLastBuild: hoursSinceLastBuild ? Math.floor(hoursSinceLastBuild) : null,
    recommendations,
    optimalTimes,
    suggestedFrequency: 'Раз в неделю (для обновления весов обучения)',
    maxFrequency: 'Раз в день (если нужны частые обновления)'
  };
}

