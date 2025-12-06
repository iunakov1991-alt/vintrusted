#!/usr/bin/env node
/**
 * Сортировка тем по приоритету (горячести для ниши)
 * Использует config/topic-priority.json для определения приоритетов
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const PRIORITY_CONFIG = path.join(ROOT_DIR, 'config', 'topic-priority.json');

function loadPriorityConfig() {
  try {
    if (fs.existsSync(PRIORITY_CONFIG)) {
      return JSON.parse(fs.readFileSync(PRIORITY_CONFIG, 'utf8'));
    }
  } catch (err) {
    console.error('[SORT] Error loading priority config:', err.message);
  }
  
  // Дефолтные приоритеты
  return {
    state_priority: {},
    zone_priority: { "dmv_titles": 10 },
    type_priority: { "dmv_state_guide": 10 },
    format_variant_priority: { "checklist": 10 },
    language_priority: { "en": 10, "es": 8 },
    audience_priority: { "us_general": 10 }
  };
}

function calculateTopicPriority(topic, priorityConfig) {
  let score = 0;
  const dims = topic.dimensions || {};
  
  // Приоритет штата (0-10)
  const state = dims.state || '';
  const statePriority = priorityConfig.state_priority?.[state] || 5;
  score += statePriority * 0.3; // 30% веса
  
  // Приоритет зоны (0-10)
  const zone = topic.zone || '';
  const zonePriority = priorityConfig.zone_priority?.[zone] || 5;
  score += zonePriority * 0.25; // 25% веса
  
  // Приоритет типа (0-10)
  const type = topic.type || '';
  const typePriority = priorityConfig.type_priority?.[type] || 5;
  score += typePriority * 0.2; // 20% веса
  
  // Приоритет формата (0-10)
  const format = dims.format_variant || '';
  const formatPriority = priorityConfig.format_variant_priority?.[format] || 5;
  score += formatPriority * 0.1; // 10% веса
  
  // Приоритет языка (0-10)
  const lang = topic.language || 'en';
  const langPriority = priorityConfig.language_priority?.[lang] || 5;
  score += langPriority * 0.1; // 10% веса
  
  // Приоритет аудитории (0-10)
  const audience = topic.audience_segment || topic.audience || 'us_general';
  const audiencePriority = priorityConfig.audience_priority?.[audience] || 5;
  score += audiencePriority * 0.05; // 5% веса
  
  return score;
}

function sortTopicsByPriority(queue, priorityConfig) {
  // Загружаем темы и вычисляем приоритеты
  const topicsWithPriority = queue.map(entry => {
    const topicFile = entry.topic_file || entry.path || entry.topicFile;
    let topic = {};
    let priority = 0;
    
    try {
      const topicPath = path.isAbsolute(topicFile) 
        ? topicFile 
        : path.join(ROOT_DIR, topicFile);
      
      if (fs.existsSync(topicPath)) {
        topic = JSON.parse(fs.readFileSync(topicPath, 'utf8'));
        priority = calculateTopicPriority(topic, priorityConfig);
      }
    } catch (err) {
      console.warn(`[SORT] Failed to load topic ${topicFile}:`, err.message);
    }
    
    return {
      ...entry,
      priority,
      topic
    };
  });
  
  // Сортируем по приоритету (высокий → низкий)
  topicsWithPriority.sort((a, b) => b.priority - a.priority);
  
  return topicsWithPriority.map(({ priority, topic, ...entry }) => entry);
}

function main() {
  const args = process.argv.slice(2);
  const queuePath = args.find(arg => arg.startsWith('--queue='))?.split('=')[1] || 'data/topics_queue.json';
  const outputPath = args.find(arg => arg.startsWith('--output='))?.split('=')[1] || queuePath;
  
  const fullQueuePath = path.isAbsolute(queuePath) 
    ? queuePath 
    : path.join(ROOT_DIR, queuePath);
  
  if (!fs.existsSync(fullQueuePath)) {
    console.error(`[SORT] Queue file not found: ${fullQueuePath}`);
    process.exit(1);
  }
  
  const priorityConfig = loadPriorityConfig();
  const queue = JSON.parse(fs.readFileSync(fullQueuePath, 'utf8'));
  
  console.log(`[SORT] Sorting ${queue.length} topics by priority...`);
  
  const sorted = sortTopicsByPriority(queue, priorityConfig);
  
  const fullOutputPath = path.isAbsolute(outputPath)
    ? outputPath
    : path.join(ROOT_DIR, outputPath);
  
  fs.writeFileSync(fullOutputPath, JSON.stringify(sorted, null, 2) + '\n');
  
  console.log(`[SORT] ✅ Sorted and saved to: ${fullOutputPath}`);
  console.log(`[SORT] Top 5 priorities:`);
  sorted.slice(0, 5).forEach((entry, i) => {
    const topicFile = entry.topic_file || entry.path || entry.topicFile;
    console.log(`  ${i + 1}. ${topicFile}`);
  });
}

if (require.main === module) {
  main();
}

module.exports = { sortTopicsByPriority, calculateTopicPriority };

