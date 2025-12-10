#!/usr/bin/env node
/**
 * PARALLEL Batch builder for MONSTER 8.0 topics (TRIZ-optimized)
 * 
 * TRIZ принципы:
 * 1. Параллельность - генерируем несколько страниц одновременно
 * 2. Непрерывность - валидация и QA асинхронно
 * 3. Предварительное действие - кэшируем промпты и спецификации
 * 4. Динамичность - адаптивный пул воркеров
 * 
 * Usage:
 *   node scripts/build_topics_batch_parallel.js [--queue data/topics_queue.json] [--workers 5]
 */

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

function parseArgs(argv) {
  const args = {
    queue: "data/topics_queue.json",
    stopOnError: false,
    mode: null,
    qaMode: null,
    workers: 5, // Параллельных воркеров
    lengthMode: null,
    lang: null
  };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const next = argv[i + 1];
    if (key === "--queue" && next) {
      args.queue = next;
      i += 1;
    } else if (key === "--stop-on-error") {
      args.stopOnError = true;
    } else if (key === "--mode" && next) {
      args.mode = next;
      i += 1;
    } else if (key === "--qa-mode" && next) {
      args.qaMode = next;
      i += 1;
    } else if (key === "--workers" && next) {
      args.workers = parseInt(next, 10) || 5;
      i += 1;
    } else if (key === "--length-mode" && next) {
      args.lengthMode = next;
      i += 1;
    } else if (key === "--lang" && next) {
      args.lang = next;
      i += 1;
    }
  }
  return args;
}

function resolvePath(rootDir, target) {
  return path.isAbsolute(target) ? target : path.join(rootDir, target);
}

function loadQueue(queuePath) {
  if (!fs.existsSync(queuePath)) {
    throw new Error(`Queue file not found: ${queuePath}`);
  }
  const raw = fs.readFileSync(queuePath, "utf8").trim();
  if (!raw) return [];
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) {
    throw new Error("Queue file must contain an array");
  }
  
  // Сортируем по приоритету (горячести) если не отсортировано
  try {
    const { sortTopicsByPriority } = require('./sort_topics_by_priority.js');
    const priorityConfigPath = path.join(path.dirname(queuePath), '..', 'config', 'topic-priority.json');
    let priorityConfig = {};
    try {
      if (fs.existsSync(priorityConfigPath)) {
        priorityConfig = JSON.parse(fs.readFileSync(priorityConfigPath, 'utf8'));
      }
    } catch (err) {
      console.warn('[BATCH] Failed to load priority config, using default sorting');
    }
    
    return sortTopicsByPriority(data, priorityConfig);
  } catch (err) {
    console.warn('[BATCH] Failed to sort by priority, using original order:', err.message);
    return data;
  }
}

function buildPage(rootDir, topicFile, index, total, env, mode) {
  return new Promise((resolve, reject) => {
    const resolvedTopic = resolvePath(rootDir, topicFile);
    console.log(`[BATCH] [${index + 1}/${total}] Starting ${resolvedTopic}`);

    // Fast mode: используем существующие блоки, только validate + render
    let buildScript = `scripts/build_topic_page.sh ${JSON.stringify(resolvedTopic)}`;
    if (mode === "fast") {
      buildScript += " --skip-gen";
      console.log(`[BATCH] [${index + 1}/${total}] Fast mode: using existing blocks`);
    }

    const startTime = Date.now();
    const child = spawn("bash", ["-lc", buildScript], {
      cwd: rootDir,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      if (code === 0) {
        // Извлекаем путь к HTML из stdout
        let htmlPath = null;
        const match = stdout.match(/Page built → .*\/(public\/[^\s]+\.html)/);
        if (match) {
          htmlPath = '/' + match[1].replace('public/', '').replace('/index.html', '');
        }
        
        console.log(`[BATCH] [${index + 1}/${total}] ✅ Completed in ${duration}s → ${resolvedTopic}`);
        if (htmlPath) {
          console.log(`[BATCH] [${index + 1}/${total}] 📄 HTML: ${htmlPath}`);
        }
        resolve({ success: true, topic: resolvedTopic, duration, htmlPath });
      } else {
        console.error(`[BATCH] [${index + 1}/${total}] ❌ Failed (${duration}s) → ${resolvedTopic}`);
        console.error(stderr);
        reject({ success: false, topic: resolvedTopic, duration, code, stderr });
      }
    });

    child.on("error", (err) => {
      reject({ success: false, topic: resolvedTopic, error: err.message });
    });
  });
}

async function processQueueParallel(queue, rootDir, args) {
  const env = {};
  if (args.mode) env.LLM_GEN_MODE = args.mode;
  if (args.qaMode) env.LLM_QA_MODE = args.qaMode;
  if (args.lengthMode) env.LENGTH_MODE = args.lengthMode;

  // Загружаем env defaults
  const envFile = path.join(rootDir, "config", "monster8_env.json");
  if (fs.existsSync(envFile)) {
    const data = JSON.parse(fs.readFileSync(envFile, "utf8"));
    Object.entries(data).forEach(([key, value]) => {
      if (env[key] === undefined) {
        env[key] = String(value);
      }
    });
  }

  // Сохраняем статус батча для дашборда
  const batchStatusPath = path.join(rootDir, "tmp", "batch-status.json");
  
  // 🔄 ОБНОВЛЕНИЕ СТАТУСА ЧЕРЕЗ INTERNAL API
  // (вместо прямой записи в KV из GitHub Actions)
  const VERCEL_URL = process.env.VERCEL_URL || 'https://vintrusted.com';
  const INTERNAL_SECRET = process.env.MONSTER_INTERNAL_SECRET;
  let batchId = null;

  // Получаем batch ID из переменных окружения (передается из workflow)
  if (process.env.BATCH_ID) {
    batchId = process.env.BATCH_ID;
    console.log(`[BATCH] Using batch ID from env: ${batchId}`);
  }

  // Функция для обновления статуса через API
  async function updateStatusViaAPI(patch) {
    if (!batchId) {
      console.warn('[BATCH] No batch ID, skipping status update');
      return;
    }

    if (!INTERNAL_SECRET) {
      console.warn('[BATCH] No MONSTER_INTERNAL_SECRET, skipping status update');
      return;
    }

    try {
      const https = require('https');
      const url = require('url');
      
      const apiUrl = `${VERCEL_URL}/api/batch-status-update`;
      const postData = JSON.stringify({ id: batchId, patch });
      
      const parsedUrl = url.parse(apiUrl);
      const options = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MONSTER-SECRET': INTERNAL_SECRET,
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      await new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              console.log(`[BATCH] ✅ Status updated via API:`, patch.status || 'update');
              resolve();
            } else {
              console.error(`[BATCH] ❌ API update failed (${res.statusCode}):`, data);
              resolve(); // не бросаем ошибку, чтобы батч продолжился
            }
          });
        });

        req.on('error', (err) => {
          console.error('[BATCH] API request error:', err.message);
          resolve(); // не бросаем ошибку
        });

        req.write(postData);
        req.end();
      });
    } catch (err) {
      console.error('[BATCH] Failed to update status via API:', err.message);
    }
  }

  // 🚀 ПЕРЕВОДИМ ПАРТИЮ В RUNNING ПРИ СТАРТЕ
  await updateStatusViaAPI({
    status: 'running',
    startedAt: new Date().toISOString(),
    topicsPlanned: queue.length
  });
  
  // Функция для отправки статуса на Vercel API (если BATCH_STATUS_TOKEN настроен)
  async function pushStatusToAPI(status) {
    const vercelUrl = process.env.VERCEL_URL || process.env.VERCEL_URL || 'https://vintrusted.com';
    const batchStatusToken = process.env.BATCH_STATUS_TOKEN;
    
    if (!batchStatusToken) {
      return; // Тихо пропускаем, если токен не настроен
    }
    
    try {
      const https = require('https');
      const apiUrl = `${vercelUrl}/api/batch-status`;
      const postData = JSON.stringify(status);
      
      const url = new URL(apiUrl);
      const options = {
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${batchStatusToken}`
        }
      };
      
      return new Promise((resolve) => {
        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            if (res.statusCode === 200) {
              console.log('[BATCH] Status pushed to API');
            } else {
              console.warn(`[BATCH] API push failed: ${res.statusCode}`);
            }
            resolve();
          });
        });
        
        req.on('error', () => {
          // Тихо игнорируем ошибки сети
          resolve();
        });
        
        req.write(postData);
        req.end();
      });
    } catch (err) {
      // Тихо игнорируем ошибки
    }
  }
  
  async function updateBatchStatus(status) {
    const statusWithTimestamp = {
      ...status,
      lastUpdate: Date.now()
    };
    
    // Сохраняем локально (для совместимости)
    try {
      fs.mkdirSync(path.dirname(batchStatusPath), { recursive: true });
      fs.writeFileSync(batchStatusPath, JSON.stringify(statusWithTimestamp, null, 2));
    } catch (err) {
      // Игнорируем ошибки записи
    }
    
    // Отправляем на Vercel API (не блокируем выполнение, для обратной совместимости)
    pushStatusToAPI(statusWithTimestamp).catch(() => {
      // Тихо игнорируем ошибки
    });
  }
  
  // 🛑 ПРОВЕРКА ФЛАГА ОСТАНОВКИ
  async function checkStopRequested() {
    if (!batchId || !VERCEL_URL) return false;
    
    try {
      const https = require('https');
      const url = require('url');
      
      const apiUrl = `${VERCEL_URL}/api/batch-status`;
      const parsedUrl = url.parse(apiUrl);
      
      const response = await new Promise((resolve, reject) => {
        const req = https.get({
          hostname: parsedUrl.hostname,
          path: parsedUrl.path,
          headers: { 'Accept': 'application/json' }
        }, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (err) {
              resolve(null);
            }
          });
        });
        req.on('error', () => resolve(null));
        req.setTimeout(3000, () => {
          req.destroy();
          resolve(null);
        });
      });

      if (response && response.success && response.current) {
        return response.current.stopRequested === true;
      }
      return false;
    } catch (err) {
      console.warn('[BATCH] Failed to check stopRequested:', err.message);
      return false;
    }
  }

  const results = [];
  const workers = args.workers;
  const total = queue.length;
  
  // Инициализируем статус батча
  await updateBatchStatus({
    current: 0,
    total,
    completed: 0,
    failed: 0,
    inProgress: true
  });

  // TRIZ: Параллельная обработка с пулом воркеров
  const queueItems = queue.map((entry, index) => ({
    index: index + 1,
    topicFile: entry.topic_file || entry.path || entry.topicFile
  })).filter(item => {
    if (!item.topicFile) return false;
    
    // Фильтр по языку, если указан
    if (args.lang) {
      try {
        const topic = JSON.parse(fs.readFileSync(resolvePath(rootDir, item.topicFile), "utf8"));
        return topic.language === args.lang;
      } catch (err) {
        console.error(`[BATCH] Failed to read topic file: ${item.topicFile}`);
        return false;
      }
    }
    return true;
  });

  // Обрабатываем батчами по workers
  for (let i = 0; i < queueItems.length; i += workers) {
    // Проверяем флаг остановки
    if (await checkStopRequested()) {
      console.log(`[BATCH] 🛑 Stop requested for batch ${batchId}, gracefully stopping...`);
      
      // Финализируем партию как stopped
      await updateStatusViaAPI({
        status: 'stopped',
        finishedAt: new Date().toISOString(),
        notes: 'Остановлено пользователем'
      });
      
      process.exit(0); // выходим с 0, чтобы раннер не ставил failed
    }
    
    const batch = queueItems.slice(i, i + workers);
    const batchStart = Date.now();

    console.log(`\n[BATCH] Processing batch ${Math.floor(i / workers) + 1} (${batch.length} pages in parallel)...`);

    const promises = batch.map((item) => {
      return buildPage(rootDir, item.topicFile, item.index, total, env, args.mode)
        .catch(err => ({ ...err, index: item.index }));
    });

    const batchResults = await Promise.allSettled(promises);
    
    // Отправляем прогресс в локальный дашборд
    const topicsDone = i + batch.length;
    try {
      const { spawn } = require('child_process');
      spawn('node', [path.join(rootDir, 'scripts', 'report_progress.js'), String(topicsDone)], {
        stdio: 'ignore',
        detached: true
      }).unref();
    } catch (err) {
      // Игнорируем ошибки отправки прогресса
    }

    batchResults.forEach((result, idx) => {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        results.push({ success: false, topic: batch[idx].topicFile, error: result.reason });
        if (args.stopOnError) {
          console.error("[BATCH] stop-on-error enabled → aborting");
          process.exit(1);
        }
      }
    });
    
    // Обновляем статус после батча
    const completed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    await updateBatchStatus({
      current: Math.min(i + workers, total),
      total,
      completed,
      failed,
      inProgress: i + workers < queueItems.length
    });

    const batchDuration = ((Date.now() - batchStart) / 1000).toFixed(1);
    console.log(`[BATCH] Batch completed in ${batchDuration}s`);
  }

  return results;
}

function main() {
  const rootDir = path.resolve(__dirname, "..");
  const args = parseArgs(process.argv.slice(2));
  const queuePath = resolvePath(rootDir, args.queue);

  const queue = loadQueue(queuePath);
  if (queue.length === 0) {
    console.log(`[BATCH] Queue ${queuePath} is empty.`);
    // Создаем пустой статус, чтобы дашборд знал, что партия не запущена
    const batchStatusPath = path.join(rootDir, "tmp", "batch-status.json");
    try {
      fs.mkdirSync(path.dirname(batchStatusPath), { recursive: true });
      fs.writeFileSync(batchStatusPath, JSON.stringify({
        current: 0,
        total: 0,
        completed: 0,
        failed: 0,
        inProgress: false,
        error: "Queue is empty",
        lastUpdate: Date.now()
      }, null, 2));
      console.log(`[BATCH] Created empty batch-status.json (queue is empty)`);
    } catch (err) {
      console.error(`[BATCH] Failed to create batch-status.json: ${err.message}`);
    }
    return;
  }

  console.log(`[BATCH] Processing ${queue.length} topic(s) from ${queuePath}`);
  console.log(`[BATCH] Parallel workers: ${args.workers}`);
  console.log(`[BATCH] Mode: ${args.mode || "ensemble"}`);
  console.log(`[BATCH] QA Mode: ${args.qaMode || "deepseek"}`);
  if (args.lengthMode) console.log(`[BATCH] Length mode: ${args.lengthMode}`);
  if (args.lang) console.log(`[BATCH] Language filter: ${args.lang}`);

  const startTime = Date.now();

  processQueueParallel(queue, rootDir, args)
    .then(async (results) => {
      const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
      const success = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      const avgDuration = results.length > 0
        ? (results.reduce((sum, r) => sum + (r.duration || 0), 0) / results.length).toFixed(1)
        : 0;

      console.log(`\n[BATCH] ========================================`);
      console.log(`[BATCH] Completed in ${totalDuration}s`);
      console.log(`[BATCH] Success: ${success}, Failed: ${failed}`);
      console.log(`[BATCH] Average page time: ${avgDuration}s`);
      console.log(`[BATCH] Speedup: ${(queue.length * 2.0 / (totalDuration / 60)).toFixed(1)}x vs sequential`);
      console.log(`[BATCH] ========================================`);

      // Финальный статус батча
      const batchStatusPath = path.join(rootDir, "tmp", "batch-status.json");
      try {
        fs.writeFileSync(batchStatusPath, JSON.stringify({
          current: queue.length,
          total: queue.length,
          completed: success,
          failed,
          inProgress: false,
          lastUpdate: Date.now()
        }, null, 2));
      } catch (err) {
        // Игнорируем ошибки
      }
      
      // Сохраняем пути к HTML для дашборда
      const htmlPaths = results.filter(r => r.success && r.htmlPath).map(r => r.htmlPath);
      if (htmlPaths.length > 0) {
        const htmlPathsFile = path.join(rootDir, "tmp", "batch-html-paths.json");
        try {
          fs.writeFileSync(htmlPathsFile, JSON.stringify(htmlPaths, null, 2));
          console.log(`[BATCH] Saved ${htmlPaths.length} HTML paths to ${htmlPathsFile}`);
        } catch (err) {
          console.warn('[BATCH] Failed to save HTML paths:', err.message);
        }
      }

      // Выборочный анализ качества для самообучения (до деплоя)
      if (success > 0 && process.env.ENABLE_QUALITY_ANALYSIS !== "0") {
        console.log("\n[QUALITY-ANALYSIS] Starting quality analysis for self-learning...");
        try {
          const { analyzeBatch } = require('./batch_quality_analysis.js');
          const analysisOptions = {
            maxAge: 3600000, // 1 час
            targetCount: Math.min(10, Math.max(5, Math.floor(success * 0.2))), // 20% от успешных, минимум 5, максимум 10
            minPagesForAnalysis: 3
          };
          
          await analyzeBatch(results, analysisOptions);
          console.log("[QUALITY-ANALYSIS] ✅ Quality analysis completed");
        } catch (err) {
          console.error("[QUALITY-ANALYSIS] ⚠️  Analysis error (non-critical):", err.message);
        }
      }

      // Автоматический деплой после успешной генерации
      // Всегда деплоим если есть успешные страницы (без проверки AUTO_DEPLOY)
      if (success > 0) {
        console.log("\n[DEPLOY] Starting automatic deployment via dashboard API...");
        try {
          const http = require('http');
          
          // Получаем batchId из переменной окружения или создаем новый
          const batchId = process.env.BATCH_ID || new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5) + 'Z';
          
          console.log(`[DEPLOY] Batch ID: ${batchId}`);
          
          const postData = JSON.stringify({ 
            batchId,
            force: true // Пропускаем проверку качества для автодеплоя
          });
          
          // Делаем запрос полностью синхронным с промисом
          await new Promise((resolve, reject) => {
            const options = {
              hostname: 'localhost',
              port: 3030,
              path: '/api/local-deploy',
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
              },
              timeout: 5000
            };
            
            const req = http.request(options, (res) => {
              let data = '';
              res.on('data', (chunk) => { data += chunk; });
              res.on('end', () => {
                if (res.statusCode === 200) {
                  console.log("[DEPLOY] ✅ Deployment request accepted");
                  try {
                    const result = JSON.parse(data);
                    if (result.deployUrl) {
                      console.log(`[DEPLOY] 🌐 Will be live at: ${result.deployUrl}`);
                    }
                  } catch (e) {
                    // Игнорируем ошибки парсинга
                  }
                  resolve();
                } else {
                  console.error(`[DEPLOY] ⚠️  Deployment request failed with status ${res.statusCode}`);
                  resolve(); // Не блокируем выполнение
                }
              });
            });
            
            req.on('error', (err) => {
              console.error("[DEPLOY] ⚠️  Deployment error (non-critical):", err.message);
              resolve(); // Не блокируем выполнение
            });
            
            req.on('timeout', () => {
              console.error("[DEPLOY] ⚠️  Deployment request timeout");
              req.destroy();
              resolve(); // Не блокируем выполнение
            });
            
            req.write(postData);
            req.end();
          });
          
          console.log("[DEPLOY] Deployment initiated, check dashboard for progress");
        } catch (err) {
          console.error("[DEPLOY] ⚠️  Deployment error (non-critical):", err.message);
        }
      }

      if (failed > 0) process.exit(1);
    })
    .catch((err) => {
      console.error(`[BATCH] Fatal error: ${err.message}`);
      process.exit(1);
    });
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(`[BATCH] Fatal error: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { processQueueParallel };

