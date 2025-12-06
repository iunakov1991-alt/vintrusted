const fs = require("fs");
const path = require("path");

function loadJson(relativePath, fallback = {}) {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8"));
  } catch (err) {
    return fallback;
  }
}

function calculateWeight(errorRate, baseWeight = 1.0) {
  // Если error_rate = 0 (нет ошибок) → weight = 1.1 (увеличиваем)
  // Если error_rate = 0.5 (50% ошибок) → weight = 0.9 (уменьшаем)
  // Если error_rate = 1.0 (100% ошибок) → weight = 0.7 (сильно уменьшаем)
  
  if (errorRate === 0) return baseWeight * 1.1; // Успешные типы получают бонус
  if (errorRate < 0.1) return baseWeight * 1.05; // Почти нет ошибок
  if (errorRate < 0.2) return baseWeight; // Норма
  if (errorRate < 0.4) return baseWeight * 0.95; // Есть проблемы
  if (errorRate < 0.6) return baseWeight * 0.9; // Много проблем
  return baseWeight * 0.8; // Критические проблемы
}

function updateStrategyFromMetrics(metrics, currentStrategy) {
  const updated = {
    version: currentStrategy.version || "1.0",
    updated_at: new Date().toISOString(),
    article_type_weights: { ...(currentStrategy.article_type_weights || {}) },
    audience_weights: { ...(currentStrategy.audience_weights || {}) },
    language_weights: { ...(currentStrategy.language_weights || {}) },
    zone_priority: { ...(currentStrategy.zone_priority || {}) },
    block_weights: { ...(currentStrategy.block_weights || {}) },
    last_update_source: "quality_errors",
    notes: "Updated from quality error analysis"
  };
  
  const aggs = metrics.aggregates || {};
  
  // Обновляем веса типов статей
  Object.entries(aggs.article_types || {}).forEach(([type, stats]) => {
    const total = stats.total || 0;
    if (total === 0) return;
    
    const errorRate = (stats.fatal + stats.major) / total;
    const currentWeight = updated.article_type_weights[type] || 1.0;
    updated.article_type_weights[type] = calculateWeight(errorRate, currentWeight);
  });
  
  // Обновляем веса аудиторий
  Object.entries(aggs.audience_segments || {}).forEach(([aud, stats]) => {
    const total = stats.total || 0;
    if (total === 0) return;
    
    const errorRate = (stats.fatal + stats.major) / total;
    const currentWeight = updated.audience_weights[aud] || 1.0;
    updated.audience_weights[aud] = calculateWeight(errorRate, currentWeight);
  });
  
  // Обновляем веса языков
  Object.entries(aggs.languages || {}).forEach(([lang, stats]) => {
    const total = stats.total || 0;
    if (total === 0) return;
    
    const errorRate = (stats.fatal + stats.major) / total;
    const currentWeight = updated.language_weights[lang] || 1.0;
    updated.language_weights[lang] = calculateWeight(errorRate, currentWeight);
  });
  
  // Обновляем приоритеты зон
  Object.entries(aggs.zones || {}).forEach(([zone, stats]) => {
    const total = stats.total || 0;
    if (total === 0) return;
    
    const errorRate = (stats.fatal + stats.major) / total;
    const currentWeight = updated.zone_priority[zone] || 1.0;
    updated.zone_priority[zone] = calculateWeight(errorRate, currentWeight);
  });
  
  // Обновляем веса блоков
  Object.entries(aggs.blocks || {}).forEach(([blockId, stats]) => {
    const total = stats.total || 0;
    if (total === 0) return;
    
    const errorRate = (stats.fatal + stats.major) / total;
    const currentWeight = updated.block_weights[blockId] || 1.0;
    updated.block_weights[blockId] = calculateWeight(errorRate, currentWeight);
  });
  
  return updated;
}

function main() {
  const strategyPath = path.join(__dirname, "..", "config", "learned_strategy.json");
  const aggregatesPath = path.join(__dirname, "..", "data", "rl_aggregates.json");
  
  // Загружаем текущую стратегию
  const currentStrategy = loadJson("config/learned_strategy.json", {
    version: "1.0",
    article_type_weights: {},
    audience_weights: {},
    language_weights: {},
    zone_priority: {},
    block_weights: {}
  });
  
  // Загружаем метрики
  const aggregates = loadJson("data/rl_aggregates.json", {
    metrics: { aggregates: {} }
  });
  
  if (!aggregates.metrics || Object.keys(aggregates.metrics.aggregates || {}).length === 0) {
    console.error(`[RL] No metrics found, keeping current strategy`);
    return;
  }
  
  // Обновляем стратегию на основе метрик
  const updatedStrategy = updateStrategyFromMetrics(aggregates.metrics, currentStrategy);
  
  // Сохраняем обновлённую стратегию
  fs.writeFileSync(strategyPath, JSON.stringify(updatedStrategy, null, 2));
  
  console.error(`[RL] strategy updated → ${strategyPath}`);
  console.error(`[RL] Article types: ${Object.keys(updatedStrategy.article_type_weights).length}`);
  console.error(`[RL] Languages: ${Object.keys(updatedStrategy.language_weights).length}`);
  console.error(`[RL] Audiences: ${Object.keys(updatedStrategy.audience_weights).length}`);
  
  // Показываем изменения весов
  const changes = [];
  Object.entries(updatedStrategy.article_type_weights).forEach(([type, weight]) => {
    const oldWeight = currentStrategy.article_type_weights?.[type] || 1.0;
    if (Math.abs(weight - oldWeight) > 0.01) {
      changes.push(`${type}: ${oldWeight.toFixed(2)} → ${weight.toFixed(2)}`);
    }
  });
  
  if (changes.length > 0) {
    console.error(`[RL] Weight changes:`);
    changes.slice(0, 10).forEach(change => console.error(`  - ${change}`));
  }
}

if (require.main === module) {
  main();
}

module.exports = { updateStrategyFromMetrics, calculateWeight };
