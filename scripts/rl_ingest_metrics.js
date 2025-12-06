const fs = require("fs");
const path = require("path");

function loadJson(relativePath, fallback = {}) {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8"));
  } catch (err) {
    return fallback;
  }
}

function ingestQualityErrors() {
  const logFile = path.join(__dirname, "..", "data", "quality_logs", "quality_errors.jsonl");
  if (!fs.existsSync(logFile)) {
    return [];
  }
  
  const lines = fs.readFileSync(logFile, "utf8")
    .split("\n")
    .filter(line => line.trim())
    .map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        return null;
      }
    })
    .filter(Boolean);
  
  return lines;
}

function aggregateMetrics(errors) {
  const aggregates = {
    zones: {},
    article_types: {},
    audience_segments: {},
    languages: {},
    blocks: {},
    states: {}
  };
  
  let totalErrors = 0;
  let fatalCount = 0;
  let majorCount = 0;
  
  errors.forEach(error => {
    totalErrors++;
    if (error.severity === "FATAL") fatalCount++;
    if (error.severity === "MAJOR") majorCount++;
    
    // Агрегация по зонам
    if (error.zone) {
      if (!aggregates.zones[error.zone]) {
        aggregates.zones[error.zone] = { total: 0, fatal: 0, major: 0 };
      }
      aggregates.zones[error.zone].total++;
      if (error.severity === "FATAL") aggregates.zones[error.zone].fatal++;
      if (error.severity === "MAJOR") aggregates.zones[error.zone].major++;
    }
    
    // Агрегация по типам статей
    if (error.article_type) {
      if (!aggregates.article_types[error.article_type]) {
        aggregates.article_types[error.article_type] = { total: 0, fatal: 0, major: 0 };
      }
      aggregates.article_types[error.article_type].total++;
      if (error.severity === "FATAL") aggregates.article_types[error.article_type].fatal++;
      if (error.severity === "MAJOR") aggregates.article_types[error.article_type].major++;
    }
    
    // Агрегация по аудиториям
    if (error.audience_segment) {
      if (!aggregates.audience_segments[error.audience_segment]) {
        aggregates.audience_segments[error.audience_segment] = { total: 0, fatal: 0, major: 0 };
      }
      aggregates.audience_segments[error.audience_segment].total++;
      if (error.severity === "FATAL") aggregates.audience_segments[error.audience_segment].fatal++;
      if (error.severity === "MAJOR") aggregates.audience_segments[error.audience_segment].major++;
    }
    
    // Агрегация по языкам
    if (error.language) {
      if (!aggregates.languages[error.language]) {
        aggregates.languages[error.language] = { total: 0, fatal: 0, major: 0 };
      }
      aggregates.languages[error.language].total++;
      if (error.severity === "FATAL") aggregates.languages[error.language].fatal++;
      if (error.severity === "MAJOR") aggregates.languages[error.language].major++;
    }
    
    // Агрегация по блокам
    if (error.block_id) {
      if (!aggregates.blocks[error.block_id]) {
        aggregates.blocks[error.block_id] = { total: 0, fatal: 0, major: 0 };
      }
      aggregates.blocks[error.block_id].total++;
      if (error.severity === "FATAL") aggregates.blocks[error.block_id].fatal++;
      if (error.severity === "MAJOR") aggregates.blocks[error.block_id].major++;
    }
  });
  
  return {
    total_errors: totalErrors,
    fatal_count: fatalCount,
    major_count: majorCount,
    error_rate: totalErrors > 0 ? (fatalCount + majorCount) / totalErrors : 0,
    aggregates
  };
}

function main() {
  const outPath = path.join(__dirname, "..", "data", "rl_aggregates.json");
  
  // Загружаем ошибки качества
  const errors = ingestQualityErrors();
  
  // Агрегируем метрики
  const metrics = aggregateMetrics(errors);
  
  // Загружаем существующие агрегаты
  const existing = loadJson("data/rl_aggregates.json", {
    updated_at: null,
    records: [],
    aggregates: {}
  });
  
  // Обновляем агрегаты
  const aggregate = {
    updated_at: new Date().toISOString(),
    last_ingest_count: errors.length,
    metrics,
    aggregates: metrics.aggregates,
    recent_errors: errors.slice(-50) // Последние 50 ошибок для анализа
  };
  
  fs.writeFileSync(outPath, JSON.stringify(aggregate, null, 2));
  console.error(`[RL] metrics ingested → ${outPath}`);
  console.error(`[RL] Total errors: ${metrics.total_errors}, Fatal: ${metrics.fatal_count}, Major: ${metrics.major_count}`);
  console.error(`[RL] Error rate: ${(metrics.error_rate * 100).toFixed(1)}%`);
}

if (require.main === module) {
  main();
}

module.exports = { ingestQualityErrors, aggregateMetrics };
