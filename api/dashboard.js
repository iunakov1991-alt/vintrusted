/**
 * MONSTER 8.0 Dashboard API для Vercel
 * Serverless функция для дашборда
 */

const path = require('path');
const fs = require('fs');

const ROOT_DIR = path.resolve(__dirname, '..');

// Динамическая загрузка модулей (для Vercel)
let buildStrategyTree, batchScheduler;

try {
  const strategyTreeModule = require('../scripts/build_strategy_tree');
  buildStrategyTree = strategyTreeModule.buildStrategyTree;
} catch (e) {
  console.error('Error loading build_strategy_tree:', e);
  buildStrategyTree = () => ({ tree: {}, totalTopics: 0, totalCreatedPages: 0, totalPossiblePages: 0, zones: 0 });
}

try {
  batchScheduler = require('../scripts/batch_scheduler');
} catch (e) {
  console.error('Error loading batch_scheduler:', e);
  batchScheduler = {
    generateBatchPreview: () => ({}),
    getNextScheduledBatch: () => null,
    getBatchHistory: () => []
  };
}

// Вспомогательные функции для подсчета страниц
function countPages(lang) {
  const pagesDir = path.join(ROOT_DIR, 'public', 'semantic-pages', lang);
  if (!fs.existsSync(pagesDir)) return 0;
  
  let count = 0;
  function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.name === 'index.html') {
        count++;
      }
    }
  }
  walkDir(pagesDir);
  return count;
}

function countDeployedPages(lang) {
  const deployStatusPath = path.join(ROOT_DIR, 'tmp', 'deploy-status.json');
  if (!fs.existsSync(deployStatusPath)) return 0;
  
  try {
    const status = JSON.parse(fs.readFileSync(deployStatusPath, 'utf8'));
    if (status.pages && Array.isArray(status.pages)) {
      return status.pages.filter(p => {
        const path = p.path || '';
        return lang === 'en' ? path.includes('/en/') : path.includes('/es/');
      }).length;
    }
  } catch (e) {
    // Игнорируем ошибки
  }
  return 0;
}

function countBPGBlocks() {
  const bpgDir = path.join(ROOT_DIR, 'tmp', 'bpg');
  if (!fs.existsSync(bpgDir)) return 0;
  
  try {
    const files = fs.readdirSync(bpgDir);
    return files.filter(f => f.endsWith('.json')).length;
  } catch (e) {
    return 0;
  }
}

function getLanguagePhase(enPages, esPages) {
  const EN_THRESHOLD = 100;
  if (enPages < EN_THRESHOLD) return 'en_only';
  return 'es_phase';
}

function getLengthMode() {
  const hour = new Date().getHours();
  if (hour >= 9 && hour < 21) return 'long';
  return 'short';
}

function getBatchProgress() {
  const batchStatusPath = path.join(ROOT_DIR, 'tmp', 'batch-status.json');
  if (!fs.existsSync(batchStatusPath)) {
    return { current: 0, total: 0, completed: 0, failed: 0, inProgress: false };
  }
  
  try {
    return JSON.parse(fs.readFileSync(batchStatusPath, 'utf8'));
  } catch (e) {
    return { current: 0, total: 0, completed: 0, failed: 0, inProgress: false };
  }
}

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Получаем путь из query параметра или из URL
  let urlPath = req.query.path || '';
  // Если путь не передан, пытаемся извлечь из URL
  if (!urlPath && req.url) {
    const urlMatch = req.url.match(/\/dashboard\/(.*)$/);
    if (urlMatch) urlPath = urlMatch[1];
  }
  
  const pathParts = urlPath ? urlPath.split('/').filter(Boolean) : [];
  
  console.log('[Dashboard API] Request:', req.method, req.url, 'path:', urlPath, 'parts:', pathParts);
  
  try {
    // Главная страница дашборда
    if (pathParts.length === 0 || pathParts[0] === '' || pathParts[0] === 'index-8.0.html') {
      const indexPath = path.join(__dirname, '..', 'monster-8.0', 'dashboard', 'ui', 'index-8.0.html');
      if (fs.existsSync(indexPath)) {
        let html = fs.readFileSync(indexPath, 'utf8');
        // Заменяем пути к статическим файлам для Vercel
        html = html.replace(/href="dashboard-8.0\.css"/g, 'href="/dashboard/dashboard-8.0.css"');
        html = html.replace(/src="dashboard-8.0\.js"/g, 'src="/dashboard/dashboard-8.0.js"');
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(html);
      }
      return res.status(404).json({ error: 'Dashboard not found' });
    }
    
    // API endpoints
    if (pathParts[0] === 'api' || urlPath.startsWith('api/')) {
      // Нормализуем путь - убираем 'api' если есть
      const apiParts = urlPath.startsWith('api/') 
        ? urlPath.replace('api/', '').split('/').filter(Boolean)
        : pathParts.slice(1);
      const endpoint = apiParts[0];
      
      // GET /api/status
      if (endpoint === 'status' && req.method === 'GET') {
        const enPages = countPages('en');
        const esPages = countPages('es');
        const enDeployed = countDeployedPages('en');
        const esDeployed = countDeployedPages('es');
        const bpgBlocks = countBPGBlocks();
        const langPhase = getLanguagePhase(enPages, esPages);
        const lengthMode = getLengthMode();
        const batchProgress = getBatchProgress();
        const nextBatch = batchScheduler.getNextScheduledBatch();
        
        return res.json({
          success: true,
          timestamp: Date.now(),
          pages: {
            en: enPages,
            es: esPages,
            total: enPages + esPages,
            deployed: {
              en: enDeployed,
              es: esDeployed,
              total: enDeployed + esDeployed
            }
          },
          batch: batchProgress,
          bpg: {
            blocks: bpgBlocks,
            ready: fs.existsSync(path.join(ROOT_DIR, 'tmp', 'bpg.done'))
          },
          orchestrator: {
            isRunning: false,
            pid: null
          },
          strategy: {
            languagePhase: langPhase,
            lengthMode: lengthMode,
            enThreshold: 100,
            esHardMin: 50
          },
          schedule: {
            nextBatch
          }
        });
      }
      
      // GET /api/strategy/tree
      if ((endpoint === 'strategy' && pathParts[2] === 'tree') || pathParts.join('/') === 'api/strategy/tree' && req.method === 'GET') {
        try {
          const tree = buildStrategyTree();
          return res.json({
            success: true,
            tree
          });
        } catch (err) {
          console.error('[Dashboard API] Error building strategy tree:', err);
          return res.status(500).json({
            success: false,
            error: err.message
          });
        }
      }
      
      // POST /api/batch/preview
      if (endpoint === 'batch' && pathParts[2] === 'preview' && req.method === 'POST') {
        const params = req.body || {};
        const preview = batchScheduler.generateBatchPreview(params);
        return res.json({
          success: true,
          preview
        });
      }
      
      // GET /api/batch/schedule
      if (endpoint === 'batch' && pathParts[2] === 'schedule' && req.method === 'GET') {
        const nextBatch = batchScheduler.getNextScheduledBatch();
        return res.json({
          success: true,
          nextBatch
        });
      }
      
      // GET /api/batch/history
      if (endpoint === 'batch' && pathParts[2] === 'history' && req.method === 'GET') {
        const limit = parseInt(req.query.limit || '20', 10);
        const batches = batchScheduler.getBatchHistory(limit);
        return res.json({
          success: true,
          batches
        });
      }
      
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    
    // Static files (CSS, JS)
    if (pathParts[0] === 'dashboard-8.0.js' || pathParts[0] === 'dashboard-8.0.css') {
      const filePath = path.join(__dirname, '..', 'monster-8.0', 'dashboard', 'ui', pathParts[0]);
      if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        // Для JS файла заменяем API_BASE для работы на Vercel
        if (pathParts[0] === 'dashboard-8.0.js') {
          content = content.replace(
            /const API_BASE = .*?;/,
            `const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? '' : '/dashboard';`
          );
        }
        const contentType = pathParts[0].endsWith('.js') ? 'application/javascript' : 'text/css';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.status(200).send(content);
      }
    }
    
    return res.status(404).json({ error: 'Not found' });
  } catch (err) {
    console.error('[Dashboard API] Error:', err);
    return res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
};
