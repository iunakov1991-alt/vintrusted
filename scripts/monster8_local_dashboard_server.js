/**
 * MONSTER 8.0 — Локальный дашборд без внешних сервисов
 * HTTP API + простой HTML на http://localhost:3030/dashboard
 *
 * Хранение состояния: data/local_batch_state.json
 * Логи батчей: logs/local_batch_<id>.log
 *
 * Запуск: npm run monster:dashboard:local
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// TRIZ: Adaptive Worker Manager (optional, commented out if not available)
// const AdaptiveWorkerManager = require('./adaptive-worker-manager');

const PORT = process.env.MONSTER_LOCAL_PORT || 3030;
const STATE_FILE = path.join(__dirname, '..', 'data', 'local_batch_state.json');
const LOGS_DIR = path.join(__dirname, '..', 'logs');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

let currentChildProcess = null;

// ========================================
// PHASE DETECTION & STRATEGY
// ========================================

/**
 * Определяет текущую фазу на основе количества страниц на проде
 * 
 * ОБНОВЛЕННАЯ СТРАТЕГИЯ (без VIN-landing, цель ~0.8-1M):
 * 
 * PHASE 1 — DMV CORE (EN only)         : 0 - 5,000 страниц
 * PHASE 2 — DMV FULL (EN+ES)           : 5,000 - 20,000
 * PHASE 3 — BRAND/MODEL (EN+ES)        : 20,000 - 200,000
 * PHASE 4 — FRAUD/DAMAGE (EN+ES, 10%)  : 200,000 - 400,000
 * PHASE 5 — FRAUD FULL (EN+ES, 100%)   : 400,000+
 */
function detectCurrentPhase() {
  const semanticDir = path.join(PUBLIC_DIR, 'semantic-pages');
  
  let totalPages = 0;
  let enCount = 0;
  let esCount = 0;
  
  try {
    if (fs.existsSync(semanticDir)) {
      totalPages = countHTMLFiles(semanticDir);
      
      const enDir = path.join(semanticDir, 'en');
      const esDir = path.join(semanticDir, 'es');
      
      if (fs.existsSync(enDir)) {
        enCount = countHTMLFiles(enDir);
      }
      if (fs.existsSync(esDir)) {
        esCount = countHTMLFiles(esDir);
      }
    }
  } catch (err) {
    console.warn('[phase-detection] Failed to count pages:', err.message);
  }
  
  let phase = 'PHASE1_DMV_CORE';
  let phaseDesc = 'DMV Core (EN only, основные штаты)';
  
  if (totalPages >= 400000) {
    phase = 'PHASE5_FRAUD_FULL';
    phaseDesc = 'Fraud/Damage FULL (полное развертывание до 1M)';
  } else if (totalPages >= 200000) {
    phase = 'PHASE4_FRAUD_PARTIAL';
    phaseDesc = 'Fraud/Damage Partial (горячие комбинации, 10%)';
  } else if (totalPages >= 20000) {
    phase = 'PHASE3_BRAND_MODEL';
    phaseDesc = 'Brand/Model (EN+ES, топ-бренды)';
  } else if (totalPages >= 5000) {
    phase = 'PHASE2_DMV_FULL';
    phaseDesc = 'DMV Full (EN+ES, все 50 штатов)';
  }
  
  return { phase, phaseDesc, totalPages, enCount, esCount };
}

function countHTMLFiles(dir) {
  let count = 0;
  function walk(d) {
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name === 'index.html') {
        count++;
      }
    }
  }
  walk(dir);
  return count;
}

/**
 * Генерирует очередь топиков в соответствии с текущей фазой
 * СТРОГО следует стратегии: Phase 1 = ТОЛЬКО EN, никаких ES!
 */
function generatePhaseQueue(phaseInfo) {
  const { phase, phaseDesc, totalPages, enCount, esCount } = phaseInfo;
  const queueFile = path.join(__dirname, '..', 'data', 'topics_queue.json');
  
  console.log(`[phase-strategy] Current phase: ${phase} (${phaseDesc})`);
  console.log(`[phase-strategy] Total: ${totalPages}, EN: ${enCount}, ES: ${esCount}`);
  
  // Определяем параметры генерации по фазе
  let language = 'en';
  let zones = ['dmv_titles'];
  let states = ['CA', 'TX', 'FL', 'NY', 'AZ', 'NV'];
  let formats = ['checklist', 'guide'];
  let targetCount = 20;
  let allowES = false;
  
  switch (phase) {
    case 'PHASE1_DMV_CORE':
      // СТРОГО ТОЛЬКО EN!
      language = 'en';
      allowES = false;
      zones = ['dmv_titles', 'vin_identity'];
      states = ['CA', 'TX', 'FL', 'NY', 'AZ', 'NV'];
      formats = ['checklist', 'guide'];
      targetCount = totalPages < 100 ? 30 : 20;
      console.log(`[phase-strategy] Phase 1: EN ONLY (строго!), target ${targetCount} pages`);
      break;
      
    case 'PHASE2_DMV_FULL':
      // EN приоритет, но ES разрешен
      allowES = true;
      language = (enCount > esCount * 2) ? 'es' : 'en';
      zones = ['dmv_titles', 'vin_identity'];
      states = null; // все 50 штатов
      formats = ['checklist', 'guide', 'step_by_step'];
      targetCount = 25;
      console.log(`[phase-strategy] Phase 2: DMV Full, language=${language}, target ${targetCount} pages`);
      break;
      
    case 'PHASE3_BRAND_MODEL':
      allowES = true;
      language = (enCount > esCount * 1.5) ? 'es' : 'en';
      zones = ['dmv_titles', 'vin_identity', 'brand_model', 'auctions'];
      states = null;
      formats = ['checklist', 'guide', 'step_by_step', 'faq'];
      targetCount = 30;
      console.log(`[phase-strategy] Phase 3: Brand/Model, language=${language}, target ${targetCount} pages`);
      break;
      
    case 'PHASE4_FRAUD_PARTIAL':
      allowES = true;
      language = (enCount > esCount * 1.2) ? 'es' : 'en';
      zones = ['fraud_damage', 'used_fraud', 'dmv_titles'];
      states = null;
      formats = ['checklist', 'guide', 'buyer_guide', 'inspection_guide'];
      targetCount = 35;
      console.log(`[phase-strategy] Phase 4: Fraud Partial, language=${language}, target ${targetCount} pages`);
      break;
      
    case 'PHASE5_FRAUD_FULL':
      allowES = true;
      language = (enCount > esCount) ? 'es' : 'en';
      zones = null; // все зоны
      states = null;
      formats = null; // все форматы
      targetCount = 40;
      console.log(`[phase-strategy] Phase 5: Fraud Full, language=${language}, target ${targetCount} pages`);
      break;
  }
  
  // Генерируем очередь с СТРОГОЙ фильтрацией
  const dataDir = path.join(__dirname, '..', 'data');
  const allTopics = fs.readdirSync(dataDir)
    .filter(f => f.startsWith('topic.') && f.endsWith('.json'))
    .map(f => path.join(dataDir, f));
  
  // Рандомизируем порядок для разнообразия
  const shuffled = allTopics.sort(() => Math.random() - 0.5);
  
  const queue = [];
  for (const topicFile of shuffled) {
    if (queue.length >= targetCount) break;
    
    try {
      const topic = JSON.parse(fs.readFileSync(topicFile, 'utf8'));
      
      // СТРОГАЯ фильтрация по языку
      if (!topic.language) {
        console.warn(`[phase-strategy] Skipping topic without language: ${topicFile}`);
        continue;
      }
      
      // Phase 1: СТРОГО ТОЛЬКО EN, никаких ES!
      if (phase === 'PHASE1_DMV_CORE' && topic.language !== 'en') {
        console.log(`[phase-strategy] Phase 1: Skipping ES topic: ${path.basename(topicFile)}`);
        continue;
      }
      
      // Для других фаз: фильтруем по выбранному языку
      if (topic.language !== language) continue;
      
      // Фильтрация по зоне
      if (zones && !zones.includes(topic.zone)) continue;
      
      // Фильтрация по штату (если указано)
      if (states && topic.dimensions && topic.dimensions.state) {
        if (!states.includes(topic.dimensions.state)) continue;
      }
      
      // Фильтрация по формату
      if (formats && topic.dimensions && topic.dimensions.format_variant) {
        if (!formats.includes(topic.dimensions.format_variant)) continue;
      }
      
      queue.push({ topic_file: topicFile });
    } catch (err) {
      console.warn(`[phase-strategy] Failed to parse topic: ${topicFile}`, err.message);
    }
  }
  
  console.log(`[phase-strategy] Generated queue: ${queue.length} topics (target: ${targetCount}, language: ${language})`);
  
  // Сохраняем очередь
  fs.writeFileSync(queueFile, JSON.stringify(queue, null, 2));
  
  return { queue, targetCount, language, phase, allowES };
}

function ensureStateFile() {
  if (!fs.existsSync(STATE_FILE)) {
    const initState = { current: null, history: [] };
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(initState, null, 2));
  }
}

function ensureLogsDir() {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

function loadState() {
  ensureStateFile();
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[local-dashboard] Failed to read state, resetting', err.message);
    const initState = { current: null, history: [] };
    fs.writeFileSync(STATE_FILE, JSON.stringify(initState, null, 2));
    return initState;
  }
}

function saveState(state) {
  ensureStateFile();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function updateCurrent(patch) {
  const state = loadState();
  if (!state.current) return null;
  state.current = { ...state.current, ...patch, updatedAt: new Date().toISOString() };
  
  // Вычисляем прогресс и оставшееся время
  if (state.current.topicsPlanned > 0 && state.current.topicsDone !== undefined) {
    state.current.progress = Math.round((state.current.topicsDone / state.current.topicsPlanned) * 100);
    
    // Оценка оставшегося времени на основе среднего времени на топик
    if (state.current.topicsDone > 0 && state.current.startedAt) {
      const elapsed = Date.now() - new Date(state.current.startedAt).getTime();
      const avgTimePerTopic = elapsed / state.current.topicsDone;
      const remaining = state.current.topicsPlanned - state.current.topicsDone;
      state.current.estimatedTimeLeft = Math.round((avgTimePerTopic * remaining) / 1000); // в секундах
    }
  }
  
  saveState(state);
  return state.current;
}

function startNewBatchRecord(payload) {
  const id = new Date().toISOString().replace(/[:.]/g, '-');
  const record = {
    id,
    phase: payload.phase,
    length: payload.length,
    language: payload.language || null,
    status: 'running',
    startedAt: new Date().toISOString(),
    finishedAt: null,
    pid: null,
    topicsPlanned: payload.topicsPlanned || null,
    topicsDone: 0,
    lastError: null,
    autoRestart: payload.autoRestart || false,  // Add autoRestart flag
  };
  const state = loadState();
  state.current = record;
  saveState(state);
  return record;
}

/**
 * Анализирует сгенерированные страницы: считает слова, собирает ссылки
 * Сначала пытается прочитать пути из tmp/batch-html-paths.json,
 * если не найдено - ищет по файловой системе
 */
function analyzeBatchPages(batchId, batchStartTime) {
  const results = {
    totalWords: 0,
    avgWords: 0,
    pageCount: 0,
    pages: []
  };
  
  try {
    // Пытаемся прочитать пути из файла, созданного оркестратором
    const htmlPathsFile = path.join(__dirname, '..', 'tmp', 'batch-html-paths.json');
    let htmlPaths = [];
    
    if (fs.existsSync(htmlPathsFile)) {
      try {
        htmlPaths = JSON.parse(fs.readFileSync(htmlPathsFile, 'utf8'));
        console.log(`[batch-analysis] Found ${htmlPaths.length} HTML paths from orchestrator`);
        
        // Удаляем файл после чтения
        fs.unlinkSync(htmlPathsFile);
      } catch (err) {
        console.warn('[batch-analysis] Failed to read HTML paths file:', err.message);
      }
    }
    
    // Если есть пути из оркестратора - используем их
    if (htmlPaths.length > 0) {
      for (const htmlPath of htmlPaths) {
        const fullPath = path.join(PUBLIC_DIR, htmlPath.replace(/^\//, ''), 'index.html');
        
        if (fs.existsSync(fullPath)) {
          try {
            const stats = fs.statSync(fullPath);
            const html = fs.readFileSync(fullPath, 'utf8');
            const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            const words = text.split(/\s+/).filter(w => w.length > 0).length;
            
            results.pages.push({
              path: htmlPath,
              words,
              created: stats.mtime.toISOString()
            });
            results.totalWords += words;
            results.pageCount++;
          } catch (err) {
            console.warn(`[batch-analysis] Failed to analyze ${fullPath}:`, err.message);
          }
        }
      }
    } else {
      // Fallback: ищем по файловой системе
      console.log('[batch-analysis] No HTML paths from orchestrator, falling back to filesystem search');
      
      const searchFrom = batchStartTime ? new Date(batchStartTime).getTime() - 60000 : Date.now() - 15 * 60 * 1000;
      const searchDirs = [
        path.join(PUBLIC_DIR, 'semantic-pages'),
        path.join(PUBLIC_DIR, 'seo-pages'),
        path.join(PUBLIC_DIR, 'random-articles')
      ];
      
      function walkDir(dir, depth = 0) {
        if (depth > 5) return;
        if (!fs.existsSync(dir)) return;
        
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walkDir(fullPath, depth + 1);
          } else if (entry.isFile() && entry.name === 'index.html') {
            try {
              const stats = fs.statSync(fullPath);
              if (stats.mtimeMs >= searchFrom) {
                const html = fs.readFileSync(fullPath, 'utf8');
                const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                const words = text.split(/\s+/).filter(w => w.length > 0).length;
                const relativePath = fullPath.replace(PUBLIC_DIR, '').replace(/\/index\.html$/, '');
                
                results.pages.push({
                  path: relativePath,
                  words,
                  created: stats.mtime.toISOString()
                });
                results.totalWords += words;
                results.pageCount++;
              }
            } catch (err) {
              // Пропускаем файлы с ошибками
            }
          }
        }
      }
      
      for (const dir of searchDirs) {
        walkDir(dir);
      }
    }
    
    if (results.pageCount > 0) {
      results.avgWords = Math.round(results.totalWords / results.pageCount);
    }
    
    console.log(`[batch-analysis] Found ${results.pageCount} pages, avg ${results.avgWords} words, total ${results.totalWords} words`);
  } catch (err) {
    console.error('[batch-analysis] Failed to analyze pages:', err.message);
  }
  
  return results;
}

function finalizeCurrentBatch(conclusion, extra = {}) {
  const state = loadState();
  if (!state.current) return;
  
  // Анализируем страницы если батч успешен
  let analysis = null;
  if (conclusion === 'success') {
    analysis = analyzeBatchPages(state.current.id, state.current.startedAt);
  }
  
  const finished = {
    ...state.current,
    status: conclusion,
    finishedAt: new Date().toISOString(),
    ...extra,
    ...(analysis ? {
      avgWords: analysis.avgWords,
      totalWords: analysis.totalWords,
      pagesGenerated: analysis.pageCount,
      samplePages: analysis.pages.slice(0, 5) // Первые 5 страниц
    } : {})
  };
  
  state.history = [finished, ...(state.history || [])].slice(0, 20);
  state.current = null;
  saveState(state);
  
  console.log(`[finalize] Batch ${finished.id} finalized: ${conclusion}, pages: ${finished.pagesGenerated || 0}, avgWords: ${finished.avgWords || 0}`);
  
  return finished;
}

ensureStateFile();
ensureLogsDir();

const app = express();
app.use(cors({ origin: [/^http:\/\/localhost(:\d+)?$/] }));
app.use(express.json());

app.get('/api/local-status', async (req, res) => {
  const state = loadState();
  const phaseInfo = detectCurrentPhase();
  
  // Получаем количество страниц на production
  let productionPages = { total: 0, en: 0, es: 0 };
  try {
    const https = require('https');
    productionPages = await new Promise((resolve) => {
      const options = {
        hostname: 'vintrusted.com',
        path: '/api/seo-pages-count',
        method: 'GET',
        timeout: 3000
      };
      
      const req = https.request(options, (response) => {
        let data = '';
        response.on('data', (chunk) => { data += chunk; });
        response.on('end', () => {
          try {
            const result = JSON.parse(data);
            resolve({
              total: result.total || 0,
              en: result.en || 0,
              es: result.es || 0
            });
          } catch (e) {
            // Fallback: используем локальные данные
            resolve({
              total: phaseInfo.totalPages || 0,
              en: phaseInfo.enCount || 0,
              es: phaseInfo.esCount || 0
            });
          }
        });
      });
      
      req.on('error', () => {
        // Fallback: используем локальные данные
        resolve({
          total: phaseInfo.totalPages || 0,
          en: phaseInfo.enCount || 0,
          es: phaseInfo.esCount || 0
        });
      });
      req.on('timeout', () => {
        req.destroy();
        resolve({
          total: phaseInfo.totalPages || 0,
          en: phaseInfo.enCount || 0,
          es: phaseInfo.esCount || 0
        });
      });
      
      req.end();
    });
  } catch (err) {
    console.warn('[production-stats] Failed to fetch:', err.message);
    productionPages = {
      total: phaseInfo.totalPages || 0,
      en: phaseInfo.enCount || 0,
      es: phaseInfo.esCount || 0
    };
  }
  
  res.json({ 
    ok: true, 
    current: state.current, 
    history: state.history || [],
    phase: phaseInfo,
    production: productionPages
  });
});

// TRIZ: Создать Adaptive Worker Manager (disabled - module not available)
// const workerManager = new AdaptiveWorkerManager({
//   minWorkers: 3,
//   maxWorkers: 5,
//   targetCPU: 80,
//   targetMemory: 80,
//   checkInterval: 10000
// });
const workerManager = null;

app.post('/api/local-start', async (req, res) => {
  const {
    phase = 'auto',
    length = 'auto',
    deployStrategy = 'batch',
    deployEveryPages = 10,
    deployEveryMinutes = 15,
    deployMinRemainingTime = 5,
    hybrid = false,
    deepseekWorkers = 5,
    ollamaWorkers = 3
  } = req.body || {};

  const state = loadState();
  if (state.current && state.current.status === 'running') {
    return res.status(409).json({ ok: false, error: 'batch_already_running' });
  }

  // TRIZ: Warmup перед батчем (disabled)
  console.log('[DASHBOARD] 🔥 Starting batch...');
  // await workerManager.warmup();

  // TRIZ: Запустить адаптивный мониторинг (disabled)
  // workerManager.startMonitoring();

  // Определяем текущую фазу и генерируем очередь
  const phaseInfo = detectCurrentPhase();
  const queueInfo = generatePhaseQueue(phaseInfo);

  const record = startNewBatchRecord({
    phase: queueInfo.phase,
    length: length,
    topicsPlanned: queueInfo.queue.length,
    language: queueInfo.language,
    deployStrategy: deployStrategy
  });

  const logFile = path.join(LOGS_DIR, `local_batch_${record.id}.log`);
  const out = fs.createWriteStream(logFile, { flags: 'a' });

  // Логируем стратегию
  out.write(`[PHASE-STRATEGY] Phase: ${queueInfo.phase}\n`);
  out.write(`[PHASE-STRATEGY] Language: ${queueInfo.language}\n`);
  out.write(`[PHASE-STRATEGY] EN pages: ${phaseInfo.enCount}, ES pages: ${phaseInfo.esCount}\n`);
  out.write(`[PHASE-STRATEGY] Target: ${queueInfo.targetCount} topics, Generated: ${queueInfo.queue.length}\n`);
  out.write(`[DEPLOY-STRATEGY] Strategy: ${deployStrategy}\n`);
  if (deployStrategy !== 'batch') {
    out.write(`[DEPLOY-STRATEGY] Config: every ${deployEveryPages} pages or ${deployEveryMinutes} minutes\n`);
  }
  out.write(`\n`);

  // Гибридный режим: DeepSeek + Ollama
  // TRIZ: Получить оптимальное количество workers
  const optimalWorkers = 2; // Reduced to 2 workers (DeepSeek rate limits)
  console.log(`[DASHBOARD] 🎯 Using ${optimalWorkers} workers (adaptive)`);

  const args = [
    path.join(__dirname, 'build_topics_batch_parallel.js'),
    '--length', length,
    '--workers', String(optimalWorkers)
  ];

  const envVars = {
    ...process.env,
    BATCH_ID: record.id,
    DEPLOY_STRATEGY: deployStrategy,
    DEPLOY_EVERY_PAGES: String(deployEveryPages),
    DEPLOY_EVERY_MINUTES: String(deployEveryMinutes),
    DEPLOY_MIN_REMAINING_TIME: String(deployMinRemainingTime)
  };

  if (hybrid) {
    // Гибридный режим
    args.push('--hybrid');
    args.push('--deepseek-workers', String(deepseekWorkers));
    args.push('--ollama-workers', String(ollamaWorkers));
    out.write(`[HYBRID] Mode: ${deepseekWorkers} DeepSeek + ${ollamaWorkers} Ollama = ${deepseekWorkers + ollamaWorkers} total\n`);
  } else {
    // ИСПРАВЛЕНО: Только DeepSeek (стабильно!)
    args.push('--mode', 'deepseek');
    args.push('--qa-mode', 'deepseek');
    envVars.LLM_GEN_MODE = 'deepseek';
    envVars.LLM_QA_MODE = 'deepseek';
    envVars.AI_PROVIDER_PRIMARY = 'deepseek';
    out.write(`[MODE] DeepSeek only (recommended)\n`);
  }
  
  const child = spawn('node', args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: envVars
  });

  currentChildProcess = child;
  updateCurrent({ pid: child.pid });

  child.stdout.on('data', chunk => out.write(chunk));
  child.stderr.on('data', chunk => out.write(chunk));

  child.on('exit', (code) => {
    out.write(`\n[EXIT] code=${code}\n`);
    out.end();
    finalizeCurrentBatch(code === 0 ? 'success' : 'failed', {
      lastError: code === 0 ? null : `exit code ${code}`
    });
    currentChildProcess = null;
  });

  child.on('error', (err) => {
    out.write(`\n[ERROR] ${err.message}\n`);
    out.end();
    finalizeCurrentBatch('failed', { lastError: err.message });
    currentChildProcess = null;
  });

  return res.json({ ok: true, id: record.id, phase: queueInfo.phase, topics: queueInfo.queue.length });
});

/**
 * 24/7 AUTO MODE - Непрерывная генерация с автоперезапуском
 */
let autoRestart24_7 = false;
let restart24_7Config = null;

app.post('/api/start-24-7', async (req, res) => {
  const {
    phase = 'auto',
    length = 'auto',
    hybrid = false,
    deepseekWorkers = 5,
    ollamaWorkers = 3
  } = req.body || {};

  console.log('[24/7 MODE] 🚀 Starting 24/7 AUTO MODE...');
  
  const state = loadState();
  if (state.current && state.current.status === 'running') {
    return res.status(409).json({ ok: false, error: 'batch_already_running' });
  }

  // Enable auto-restart
  autoRestart24_7 = true;
  restart24_7Config = {
    phase,
    length,
    hybrid,
    deepseekWorkers,
    ollamaWorkers
  };
  
  // Start batch with auto-restart enabled
  const deployStrategy = 'smart';
  const deployEveryPages = 10;
  const deployEveryMinutes = 15;
  const deployMinRemainingTime = 5;

  const phaseInfo = detectCurrentPhase();
  const queueInfo = generatePhaseQueue(phaseInfo);

  const record = startNewBatchRecord({
    phase: queueInfo.phase,
    length: length,
    topicsPlanned: queueInfo.queue.length,
    language: queueInfo.language,
    deployStrategy: deployStrategy,
    autoRestart: true  // KEY: Mark this batch as auto-restart
  });

  const logFile = path.join(LOGS_DIR, `local_batch_${record.id}.log`);
  const out = fs.createWriteStream(logFile, { flags: 'a' });

  out.write(`[24/7 MODE] 🚀 AUTO RESTART ENABLED\n`);
  out.write(`[PHASE-STRATEGY] Phase: ${queueInfo.phase}\n`);
  out.write(`[DEPLOY-STRATEGY] Strategy: ${deployStrategy}\n`);

  const optimalWorkers = 6;
  const args = [
    path.join(__dirname, 'build_topics_batch_parallel.js'),
    '--length', length,
    '--workers', String(optimalWorkers)
  ];

  const envVars = {
    ...process.env,
    BATCH_ID: record.id,
    DEPLOY_STRATEGY: deployStrategy,
    DEPLOY_EVERY_PAGES: String(deployEveryPages),
    DEPLOY_EVERY_MINUTES: String(deployEveryMinutes),
    DEPLOY_MIN_REMAINING_TIME: String(deployMinRemainingTime)
  };

  if (hybrid) {
    args.push('--hybrid');
    args.push('--deepseek-workers', String(deepseekWorkers));
    args.push('--ollama-workers', String(ollamaWorkers));
    out.write(`[HYBRID] ${deepseekWorkers} DeepSeek + ${ollamaWorkers} Ollama\n`);
  } else {
    args.push('--mode', 'deepseek');
    args.push('--qa-mode', 'deepseek');
    envVars.LLM_GEN_MODE = 'deepseek';
    envVars.LLM_QA_MODE = 'deepseek';
    envVars.AI_PROVIDER_PRIMARY = 'deepseek';
    out.write(`[MODE] DeepSeek only\n`);
  }

  const child = spawn('node', args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: envVars
  });

  currentChildProcess = child;
  updateCurrent({ pid: child.pid });

  child.stdout.on('data', chunk => out.write(chunk));
  child.stderr.on('data', chunk => out.write(chunk));

  child.on('exit', (code) => {
    out.write(`\n[EXIT] code=${code}\n`);
    out.end();
    finalizeCurrentBatch(code === 0 ? 'success' : 'failed', {
      lastError: code === 0 ? null : `exit code ${code}`
    });
    currentChildProcess = null;
    
    // AUTO-RESTART if enabled
    if (autoRestart24_7 && restart24_7Config) {
      console.log('[24/7 MODE] ⏱️ Batch completed. Restarting in 10 seconds...');
      setTimeout(() => {
        if (autoRestart24_7) {
          console.log('[24/7 MODE] 🔄 Auto-restarting...');
          const http = require('http');
          const postData = JSON.stringify(restart24_7Config);
          const options = {
            hostname: 'localhost',
            port: PORT,
            path: '/api/start-24-7',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData)
            }
          };
          const req = http.request(options);
          req.write(postData);
          req.end();
        }
      }, 10000);
    }
  });

  child.on('error', (err) => {
    out.write(`\n[ERROR] ${err.message}\n`);
    out.end();
    finalizeCurrentBatch('failed', { lastError: err.message });
    currentChildProcess = null;
  });

  res.json({
    ok: true,
    mode: '24/7',
    autoRestart: true,
    id: record.id,
    phase: queueInfo.phase,
    topics: queueInfo.queue.length,
    pid: child.pid,
    message: '24/7 AUTO MODE STARTED! Batches will restart automatically.'
  });
});

app.post('/api/stop-24-7', (req, res) => {
  console.log('[24/7 MODE] 🛑 Stopping 24/7 AUTO MODE...');
  autoRestart24_7 = false;
  restart24_7Config = null;
  res.json({ ok: true, stopped: true, message: '24/7 AUTO MODE STOPPED. Current batch will finish.' });
});

app.post('/api/local-stop', (req, res) => {
  const state = loadState();
  if (!state.current || state.current.status !== 'running') {
    return res.json({ ok: true, message: 'nothing_to_stop' });
  }

  const child = currentChildProcess;
  if (child && !child.killed) {
    child.kill('SIGTERM');
    setTimeout(() => {
      if (!child.killed) child.kill('SIGKILL');
    }, 5000);
  }

  // Also stop 24/7 mode
  autoRestart24_7 = false;
  restart24_7Config = null;

  finalizeCurrentBatch('stopped');
  currentChildProcess = null;
  return res.json({ ok: true, message: 'stopped' });
});

/**
 * Обновление прогресса батча (вызывается из оркестратора)
 */
app.post('/api/local-progress', (req, res) => {
  const { topicsDone } = req.body || {};
  if (topicsDone === undefined) {
    return res.status(400).json({ ok: false, error: 'missing topicsDone' });
  }
  
  const updated = updateCurrent({ topicsDone });
  if (!updated) {
    return res.status(404).json({ ok: false, error: 'no current batch' });
  }
  
  return res.json({ ok: true, progress: updated.progress, estimatedTimeLeft: updated.estimatedTimeLeft });
});

app.get('/api/local-log', (req, res) => {
  const id = req.query.id;
  const lines = Math.max(1, Math.min(1000, parseInt(req.query.lines, 10) || 200));
  if (!id) return res.status(400).json({ ok: false, error: 'missing id' });
  const logFile = path.join(LOGS_DIR, `local_batch_${id}.log`);
  if (!fs.existsSync(logFile)) return res.status(404).json({ ok: false, error: 'not_found' });
  const content = fs.readFileSync(logFile, 'utf8').split('\n');
  const tail = content.slice(-lines).join('\n');
  return res.json({ ok: true, id, lines: tail.split('\n').length, log: tail });
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'local-batch-dashboard.html'));
});

// Generate hub pages endpoint
app.post('/api/generate-hubs', (req, res) => {
  console.log('[API] Generating hub pages...');
  try {
    const { main: generateHubs } = require('./generate-hub-pages.js');
    generateHubs();
    res.json({ 
      ok: true, 
      message: 'Hub pages generated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[API] Hub generation failed:', err.message);
    res.status(500).json({ 
      ok: false, 
      error: err.message 
    });
  }
});

// ========================================
// QUALITY CHECK & DEPLOY
// ========================================

/**
 * Проверка качества батча
 */
app.post('/api/local-quality-check', async (req, res) => {
  const { batchId } = req.body || {};
  if (!batchId) return res.status(400).json({ ok: false, error: 'missing batchId' });
  
  const state = loadState();
  const batch = state.history.find(b => b.id === batchId);
  if (!batch) return res.status(404).json({ ok: false, error: 'batch not found' });
  
  console.log(`[quality-check] Starting quality check for batch ${batchId}`);
  
  try {
    // Запускаем проверку качества (если есть скрипт)
    const qualityScript = path.join(__dirname, 'batch_quality_analysis.js');
    
    if (!fs.existsSync(qualityScript)) {
      return res.json({ 
        ok: true, 
        quality: 'unknown',
        message: 'Quality script not found, manual review required',
        canDeploy: false
      });
    }
    
    // Простая проверка: если есть страницы и avgWords > 500 - качество ОК
    const minWords = 500;
    const hasPages = batch.pagesGenerated > 0;
    const goodWordCount = batch.avgWords >= minWords;
    
    const quality = hasPages && goodWordCount ? 'good' : 'needs_review';
    const canDeploy = quality === 'good';
    
    console.log(`[quality-check] Batch ${batchId}: quality=${quality}, canDeploy=${canDeploy}`);
    
    return res.json({
      ok: true,
      quality,
      canDeploy,
      stats: {
        pages: batch.pagesGenerated,
        avgWords: batch.avgWords,
        minWords
      },
      message: canDeploy 
        ? `Quality check passed: ${batch.pagesGenerated} pages, avg ${batch.avgWords} words`
        : `Quality check failed: avg words ${batch.avgWords} < ${minWords}`
    });
  } catch (err) {
    console.error('[quality-check] Error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * Деплой батча (после проверки качества)
 */
app.post('/api/local-deploy', async (req, res) => {
  const { batchId, force = false, type = 'final', pagesDeployed = 0, totalDeployed = 0 } = req.body || {};
  if (!batchId) return res.status(400).json({ ok: false, error: 'missing batchId' });

  const state = loadState();
  
  // Ищем батч в истории ИЛИ в current (если еще не финализирован)
  let batch = state.history.find(b => b.id === batchId);
  if (!batch && state.current && state.current.id === batchId) {
    // Батч еще не финализирован, ждем немного
    console.log(`[deploy] Batch ${batchId} not in history yet, waiting for finalization...`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Перечитываем state
    const updatedState = loadState();
    batch = updatedState.history.find(b => b.id === batchId);
    
    if (!batch) {
      // Все еще нет - используем данные из current
      console.log(`[deploy] Using current batch data for ${batchId}`);
      batch = updatedState.current || { id: batchId, pagesGenerated: 0, avgWords: 0 };
    }
  }
  
  if (!batch) {
    return res.status(404).json({ ok: false, error: 'batch not found' });
  }
  
  const deployType = type === 'incremental' ? 'incremental' : 'final';
  console.log(`[deploy] Starting ${deployType} deploy for batch ${batchId}, force=${force}`);
  if (deployType === 'incremental') {
    console.log(`[deploy] Incremental: ${pagesDeployed} pages (total deployed: ${totalDeployed})`);
  }
  
  try {
    // Проверка качества перед деплоем (если не force)
    if (!force) {
      const minWords = 500;
      const hasPages = batch.pagesGenerated > 0;
      const goodWordCount = batch.avgWords >= minWords;
      
      if (!hasPages || !goodWordCount) {
        return res.status(400).json({
          ok: false,
          error: 'quality_check_failed',
          message: `Quality check failed: ${batch.pagesGenerated} pages, avg ${batch.avgWords} words (min ${minWords})`
        });
      }
    }
    
    // Запускаем деплой через vercel CLI
    const deployLog = path.join(LOGS_DIR, `deploy_${batchId}.log`);
    const out = fs.createWriteStream(deployLog, { flags: 'a' });
    
    out.write(`[DEPLOY] Starting ${deployType} deploy for batch ${batchId}\n`);
    out.write(`[DEPLOY] Pages: ${batch.pagesGenerated}, Avg words: ${batch.avgWords}\n`);
    if (deployType === 'incremental') {
      out.write(`[DEPLOY] Incremental: ${pagesDeployed} pages (total: ${totalDeployed})\n`);
    }
    out.write(`\n`);
    
    const deployChild = spawn('vercel', ['--prod', '--yes'], {
      cwd: path.join(__dirname, '..'),
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    deployChild.stdout.on('data', chunk => out.write(chunk));
    deployChild.stderr.on('data', chunk => out.write(chunk));
    
    deployChild.on('exit', (code) => {
      out.write(`\n[DEPLOY] Exit code: ${code}\n`);
      out.end();
      
      // Обновляем статус батча
      const updatedState = loadState();
      const historyIdx = updatedState.history.findIndex(b => b.id === batchId);
      if (historyIdx !== -1) {
        // Для incremental деплоя не перезаписываем deployed, только обновляем
        if (deployType === 'final' || !updatedState.history[historyIdx].deployed) {
          updatedState.history[historyIdx].deployed = code === 0;
          updatedState.history[historyIdx].deployedAt = new Date().toISOString();
        }
        
        // Добавляем информацию о деплое
        if (!updatedState.history[historyIdx].deploys) {
          updatedState.history[historyIdx].deploys = [];
        }
        updatedState.history[historyIdx].deploys.push({
          type: deployType,
          success: code === 0,
          timestamp: new Date().toISOString(),
          pagesDeployed: deployType === 'incremental' ? pagesDeployed : batch.pagesGenerated
        });
        
        saveState(updatedState);
      }
      
      console.log(`[deploy] Batch ${batchId} ${deployType} deploy finished with code ${code}`);
    });
    
    return res.json({
      ok: true,
      message: `${deployType} deploy started`,
      batchId,
      type: deployType,
      logFile: `deploy_${batchId}.log`
    });
  } catch (err) {
    console.error('[deploy] Error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Serve static files from public/
app.use(express.static(path.join(__dirname, '..', 'public')));

app.listen(PORT, () => {
  console.log(`[local-dashboard] listening on http://localhost:${PORT}`);
});

