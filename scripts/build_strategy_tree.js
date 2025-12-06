#!/usr/bin/env node
/**
 * Построение дерева стратегии для MONSTER 8.0
 * Показывает все темы в порядке приоритетов с подсветкой пройденного пути
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TOPICS_DIR = path.join(ROOT, 'data');
const PRIORITY_CONFIG = path.join(ROOT, 'config', 'topic-priority.json');
const SEMANTIC_CORE = path.join(ROOT, 'config', 'semantic_core.json');
const BATCH_HISTORY = path.join(ROOT, 'data', 'batch-history.json');
const DEPLOY_STATUS = path.join(ROOT, 'tmp', 'deploy-status.json');

/**
 * Загружает конфигурацию приоритетов
 */
function loadPriorityConfig() {
  if (fs.existsSync(PRIORITY_CONFIG)) {
    try {
      return JSON.parse(fs.readFileSync(PRIORITY_CONFIG, 'utf8'));
    } catch (e) {
      console.error(`Error loading priority config: ${e.message}`);
    }
  }
  return {};
}

/**
 * Загружает семантическое ядро
 */
function loadSemanticCore() {
  if (fs.existsSync(SEMANTIC_CORE)) {
    try {
      return JSON.parse(fs.readFileSync(SEMANTIC_CORE, 'utf8'));
    } catch (e) {
      console.error(`Error loading semantic core: ${e.message}`);
    }
  }
  return {};
}

/**
 * Загружает историю партий
 */
function loadBatchHistory() {
  if (fs.existsSync(BATCH_HISTORY)) {
    try {
      return JSON.parse(fs.readFileSync(BATCH_HISTORY, 'utf8'));
    } catch (e) {
      // История может отсутствовать
    }
  }
  return { batches: [] };
}

/**
 * Загружает список задеплоенных страниц
 */
function loadDeployedPages() {
  const deployed = new Set();
  
  // Из deploy-status.json
  if (fs.existsSync(DEPLOY_STATUS)) {
    try {
      const status = JSON.parse(fs.readFileSync(DEPLOY_STATUS, 'utf8'));
      if (status.pages && Array.isArray(status.pages)) {
        status.pages.forEach(page => {
          if (page.path) deployed.add(page.path);
        });
      }
    } catch (e) {
      // Игнорируем ошибки
    }
  }
  
  // Из истории партий
  const history = loadBatchHistory();
  history.batches.forEach(batch => {
    if (batch.result && batch.result.pagesDeployed) {
      // Можно добавить логику извлечения путей из результата
    }
  });
  
  return deployed;
}

/**
 * Загружает все темы
 */
function loadAllTopics() {
  const topics = [];
  
  // Ищем все topic*.json файлы
  const files = fs.readdirSync(TOPICS_DIR).filter(f => f.startsWith('topic.') && f.endsWith('.json'));
  
  files.forEach(file => {
    try {
      const filePath = path.join(TOPICS_DIR, file);
      const topic = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      topics.push({
        ...topic,
        file: file,
        filePath: filePath
      });
    } catch (e) {
      console.error(`Error loading topic ${file}: ${e.message}`);
    }
  });
  
  return topics;
}

/**
 * Вычисляет приоритет темы
 */
function calculateTopicPriority(topic, priorityConfig) {
  let priority = 0;
  
  // Приоритет зоны
  const zone = topic.zone || '';
  if (priorityConfig.zone_priority && priorityConfig.zone_priority[zone]) {
    priority += priorityConfig.zone_priority[zone] * 1000;
  }
  
  // Приоритет штата
  const state = topic.dimensions?.state || '';
  if (priorityConfig.state_priority && priorityConfig.state_priority[state]) {
    priority += priorityConfig.state_priority[state] * 100;
  }
  
  // Приоритет формата
  const format = topic.dimensions?.format_variant || '';
  if (priorityConfig.format_variant_priority && priorityConfig.format_variant_priority[format]) {
    priority += priorityConfig.format_variant_priority[format] * 10;
  }
  
  // Приоритет языка
  const lang = topic.language || topic.dimensions?.language || '';
  if (priorityConfig.language_priority && priorityConfig.language_priority[lang]) {
    priority += priorityConfig.language_priority[lang];
  }
  
  return priority;
}

/**
 * Подсчитывает созданные страницы для темы
 */
function countPagesForTopic(topic, semanticPagesDir) {
  const zone = topic.zone || '';
  const state = topic.dimensions?.state || '';
  const format = topic.dimensions?.format_variant || '';
  const lang = topic.language || topic.dimensions?.language || 'en';
  
  if (!zone || !state || !format) return { created: 0, total: 0 };
  
  // Путь к страницам: public/semantic-pages/{lang}/{zone}/{state}/{topic}/{format}/
  const topicName = topic.dimensions?.dmv_topic || 'title_types';
  const pagePath = path.join(semanticPagesDir, lang, zone, state.toLowerCase(), topicName, format);
  
  let created = 0;
  if (fs.existsSync(pagePath)) {
    const indexPath = path.join(pagePath, 'index.html');
    if (fs.existsSync(indexPath)) {
      created = 1;
    }
  }
  
  // Вычисляем возможное количество страниц для темы
  // Для DMV: обычно 1 страница на комбинацию state + topic + format + language
  // Но может быть больше, если есть варианты (например, разные audience_segments)
  const audienceSegments = topic.dimensions?.audience_segment ? [topic.dimensions.audience_segment] : ['us_general'];
  const total = audienceSegments.length; // Обычно 1, но может быть больше
  
  return { created, total };
}

/**
 * Строит дерево стратегии с прогрессом проработки
 */
function buildStrategyTree() {
  const priorityConfig = loadPriorityConfig();
  const semanticCore = loadSemanticCore();
  const topics = loadAllTopics();
  const semanticPagesDir = path.join(ROOT, 'public', 'semantic-pages');
  
  // Вычисляем приоритеты и сортируем
  const topicsWithPriority = topics.map(topic => ({
    ...topic,
    priority: calculateTopicPriority(topic, priorityConfig)
  })).sort((a, b) => b.priority - a.priority);
  
  // Строим дерево: zone -> state -> topic -> format -> language
  const tree = {};
  
  topicsWithPriority.forEach(topic => {
    const zone = topic.zone || 'unknown';
    const state = topic.dimensions?.state || 'all';
    const topicName = topic.dimensions?.dmv_topic || topic.dimensions?.topic || 'unknown';
    const format = topic.dimensions?.format_variant || 'unknown';
    const lang = topic.language || topic.dimensions?.language || 'unknown';
    
    if (!tree[zone]) {
      tree[zone] = {
        name: semanticCore.zones?.find(z => z.id === zone)?.label || zone,
        states: {},
        priority: priorityConfig.zone_priority?.[zone] || 0,
        totalPages: 0,
        createdPages: 0
      };
    }
    
    if (!tree[zone].states[state]) {
      tree[zone].states[state] = {
        name: state,
        topics: {},
        priority: priorityConfig.state_priority?.[state] || 0,
        totalPages: 0,
        createdPages: 0
      };
    }
    
    if (!tree[zone].states[state].topics[topicName]) {
      tree[zone].states[state].topics[topicName] = {
        name: topicName,
        formats: {},
        totalPages: 0,
        createdPages: 0
      };
    }
    
    if (!tree[zone].states[state].topics[topicName].formats[format]) {
      tree[zone].states[state].topics[topicName].formats[format] = {
        name: format,
        languages: {},
        totalPages: 0,
        createdPages: 0
      };
    }
    
    if (!tree[zone].states[state].topics[topicName].formats[format].languages[lang]) {
      tree[zone].states[state].topics[topicName].formats[format].languages[lang] = {
        name: lang,
        pages: [],
        totalPages: 0,
        createdPages: 0
      };
    }
    
    // Подсчитываем страницы для этой темы
    const pageCount = countPagesForTopic(topic, semanticPagesDir);
    
    tree[zone].states[state].topics[topicName].formats[format].languages[lang].pages.push({
      topic_id: topic.topic_id || topic.file?.replace('topic.', '').replace('.json', ''),
      title: topic.title || topic.topic_id,
      priority: topic.priority,
      created: pageCount.created,
      total: pageCount.total,
      file: topic.file
    });
    
    // Обновляем счетчики
    tree[zone].states[state].topics[topicName].formats[format].languages[lang].createdPages += pageCount.created;
    tree[zone].states[state].topics[topicName].formats[format].languages[lang].totalPages += pageCount.total;
    
    tree[zone].states[state].topics[topicName].formats[format].createdPages += pageCount.created;
    tree[zone].states[state].topics[topicName].formats[format].totalPages += pageCount.total;
    
    tree[zone].states[state].topics[topicName].createdPages += pageCount.created;
    tree[zone].states[state].topics[topicName].totalPages += pageCount.total;
    
    tree[zone].states[state].createdPages += pageCount.created;
    tree[zone].states[state].totalPages += pageCount.total;
    
    tree[zone].createdPages += pageCount.created;
    tree[zone].totalPages += pageCount.total;
  });
  
  // Сортируем дерево по приоритетам
  const sortedTree = {};
  Object.keys(tree).sort((a, b) => tree[b].priority - tree[a].priority).forEach(zone => {
    sortedTree[zone] = {
      ...tree[zone],
      states: {}
    };
    
    Object.keys(tree[zone].states).sort((a, b) => 
      tree[zone].states[b].priority - tree[zone].states[a].priority
    ).forEach(state => {
      sortedTree[zone].states[state] = {
        ...tree[zone].states[state],
        topics: {}
      };
      
      Object.keys(tree[zone].states[state].topics).sort().forEach(topicName => {
        sortedTree[zone].states[state].topics[topicName] = {
          ...tree[zone].states[state].topics[topicName],
          formats: {}
        };
        
        Object.keys(tree[zone].states[state].topics[topicName].formats).sort((a, b) =>
          (tree[zone].states[state].topics[topicName].formats[b].priority || 0) - 
          (tree[zone].states[state].topics[topicName].formats[a].priority || 0)
        ).forEach(format => {
          sortedTree[zone].states[state].topics[topicName].formats[format] = {
            ...tree[zone].states[state].topics[topicName].formats[format],
            languages: {}
          };
          
          Object.keys(tree[zone].states[state].topics[topicName].formats[format].languages).sort((a, b) =>
            (tree[zone].states[state].topics[topicName].formats[format].languages[b].priority || 0) - 
            (tree[zone].states[state].topics[topicName].formats[format].languages[a].priority || 0)
          ).forEach(lang => {
            sortedTree[zone].states[state].topics[topicName].formats[format].languages[lang] = {
              ...tree[zone].states[state].topics[topicName].formats[format].languages[lang],
              pages: tree[zone].states[state].topics[topicName].formats[format].languages[lang].pages.sort((a, b) => 
                (b.priority || 0) - (a.priority || 0)
              )
            };
          });
        });
      });
    });
  });
  
  // Подсчитываем общую статистику
  let totalCreated = 0;
  let totalPossible = 0;
  Object.values(sortedTree).forEach(zone => {
    totalCreated += zone.createdPages || 0;
    totalPossible += zone.totalPages || 0;
  });
  
  return {
    tree: sortedTree,
    totalTopics: topics.length,
    totalCreatedPages: totalCreated,
    totalPossiblePages: totalPossible,
    zones: Object.keys(sortedTree).length
  };
}

// Если запущен как скрипт
if (require.main === module) {
  const tree = buildStrategyTree();
  console.log(JSON.stringify(tree, null, 2));
}

module.exports = { buildStrategyTree, loadAllTopics, loadDeployedPages };
