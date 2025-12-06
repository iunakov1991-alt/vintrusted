#!/usr/bin/env node

/**
 * Выборочный анализ качества страниц для самообучения
 * Используется после генерации каждой партии
 * 
 * Выбирает страницы по разным направлениям:
 * - Разные штаты
 * - Разные языки (EN/ES)
 * - Разные типы тем
 * - Разные уровни вложенности
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const SEMANTIC_PAGES_DIR = path.join(ROOT_DIR, 'public', 'semantic-pages');
const ANALYSIS_SCRIPT = path.join(ROOT_DIR, 'scripts', 'analyze_page_quality_for_learning.js');

/**
 * Сканирует директорию semantic-pages и находит все сгенерированные страницы
 */
function findGeneratedPages(maxAge = 3600000) { // 1 час по умолчанию
  const pages = [];
  const now = Date.now();
  
  if (!fs.existsSync(SEMANTIC_PAGES_DIR)) {
    return pages;
  }
  
  function walkDir(dir, segments = []) {
    if (!fs.existsSync(dir)) return;
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        walkDir(fullPath, [...segments, entry.name]);
      } else if (entry.name === 'index.html') {
        const stats = fs.statSync(fullPath);
        const age = now - stats.mtimeMs;
        
        // Только недавно созданные страницы (в пределах maxAge)
        if (age <= maxAge) {
          const urlSegments = [...segments];
          const lang = urlSegments[0] === 'en' || urlSegments[0] === 'es' ? urlSegments[0] : 'en';
          
          pages.push({
            filePath: fullPath,
            url: `/${urlSegments.join('/')}/`,
            lang,
            segments: urlSegments,
            state: extractState(urlSegments),
            topicType: extractTopicType(urlSegments),
            depth: urlSegments.length,
            mtime: stats.mtimeMs
          });
        }
      }
    }
  }
  
  walkDir(SEMANTIC_PAGES_DIR);
  return pages;
}

/**
 * Извлекает штат из сегментов URL
 */
function extractState(segments) {
  const stateIndex = segments.findIndex(s => 
    ['az', 'ca', 'tx', 'fl', 'ny', 'il', 'pa', 'oh', 'ga', 'nc'].includes(s.toLowerCase())
  );
  return stateIndex >= 0 ? segments[stateIndex].toUpperCase() : null;
}

/**
 * Извлекает тип темы из сегментов URL
 */
function extractTopicType(segments) {
  const topicTypes = ['dmv-titles', 'vin-check', 'accident-history', 'title-types', 'registration'];
  for (const type of topicTypes) {
    if (segments.some(s => s.includes(type))) {
      return type;
    }
  }
  return 'other';
}

/**
 * Выбирает страницы для анализа по разным направлениям
 */
function selectPagesForAnalysis(pages, targetCount = 10) {
  if (pages.length === 0) return [];
  if (pages.length <= targetCount) return pages;
  
  const selected = [];
  const used = new Set();
  
  // Группируем по направлениям
  const byLang = {};
  const byState = {};
  const byTopicType = {};
  const byDepth = {};
  
  pages.forEach(page => {
    if (!byLang[page.lang]) byLang[page.lang] = [];
    byLang[page.lang].push(page);
    
    if (page.state) {
      if (!byState[page.state]) byState[page.state] = [];
      byState[page.state].push(page);
    }
    
    if (!byTopicType[page.topicType]) byTopicType[page.topicType] = [];
    byTopicType[page.topicType].push(page);
    
    if (!byDepth[page.depth]) byDepth[page.depth] = [];
    byDepth[page.depth].push(page);
  });
  
  // Стратегия выбора:
  // 1. По одному из каждого языка
  // 2. По одному из каждого штата (если есть)
  // 3. По одному из каждого типа темы
  // 4. По одному из каждого уровня глубины
  // 5. Остальные случайно
  
  // 1. Языки
  Object.keys(byLang).forEach(lang => {
    const candidates = byLang[lang].filter(p => !used.has(p.filePath));
    if (candidates.length > 0) {
      const selectedPage = candidates[Math.floor(Math.random() * candidates.length)];
      selected.push(selectedPage);
      used.add(selectedPage.filePath);
    }
  });
  
  // 2. Штаты
  Object.keys(byState).forEach(state => {
    if (selected.length >= targetCount) return;
    const candidates = byState[state].filter(p => !used.has(p.filePath));
    if (candidates.length > 0) {
      const selectedPage = candidates[Math.floor(Math.random() * candidates.length)];
      selected.push(selectedPage);
      used.add(selectedPage.filePath);
    }
  });
  
  // 3. Типы тем
  Object.keys(byTopicType).forEach(topicType => {
    if (selected.length >= targetCount) return;
    const candidates = byTopicType[topicType].filter(p => !used.has(p.filePath));
    if (candidates.length > 0) {
      const selectedPage = candidates[Math.floor(Math.random() * candidates.length)];
      selected.push(selectedPage);
      used.add(selectedPage.filePath);
    }
  });
  
  // 4. Уровни глубины
  Object.keys(byDepth).sort((a, b) => a - b).forEach(depth => {
    if (selected.length >= targetCount) return;
    const candidates = byDepth[depth].filter(p => !used.has(p.filePath));
    if (candidates.length > 0) {
      const selectedPage = candidates[Math.floor(Math.random() * candidates.length)];
      selected.push(selectedPage);
      used.add(selectedPage.filePath);
    }
  });
  
  // 5. Остальные случайно до достижения targetCount
  const remaining = pages.filter(p => !used.has(p.filePath));
  while (selected.length < targetCount && remaining.length > 0) {
    const randomIndex = Math.floor(Math.random() * remaining.length);
    const selectedPage = remaining.splice(randomIndex, 1)[0];
    selected.push(selectedPage);
    used.add(selectedPage.filePath);
  }
  
  return selected.slice(0, targetCount);
}

/**
 * Анализирует одну страницу
 */
function analyzePage(pagePath) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [ANALYSIS_SCRIPT, pagePath], {
      cwd: ROOT_DIR,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        // Пытаемся извлечь score из вывода
        const scoreMatch = stdout.match(/ОБЩИЙ SCORE:\s+([\d.]+)%/);
        const score = scoreMatch ? parseFloat(scoreMatch[1]) : null;
        resolve({ success: true, score, output: stdout });
      } else {
        reject({ success: false, error: stderr, code });
      }
    });
    
    child.on('error', (err) => {
      reject({ success: false, error: err.message });
    });
  });
}

/**
 * Основная функция анализа батча
 */
async function analyzeBatch(batchResults, options = {}) {
  const {
    maxAge = 3600000, // 1 час
    targetCount = 10, // Количество страниц для анализа
    minPagesForAnalysis = 5 // Минимум страниц в батче для запуска анализа
  } = options;
  
  console.log('\n[QUALITY-ANALYSIS] ========================================');
  console.log('[QUALITY-ANALYSIS] Starting batch quality analysis...');
  
  // Если успешно сгенерировано меньше минимума, пропускаем анализ
  const successCount = batchResults.filter(r => r.success).length;
  if (successCount < minPagesForAnalysis) {
    console.log(`[QUALITY-ANALYSIS] Skipping analysis: only ${successCount} pages generated (minimum: ${minPagesForAnalysis})`);
    return { analyzed: 0, skipped: true };
  }
  
  // Находим все недавно созданные страницы
  console.log(`[QUALITY-ANALYSIS] Scanning for recently generated pages (max age: ${maxAge / 1000}s)...`);
  const allPages = findGeneratedPages(maxAge);
  console.log(`[QUALITY-ANALYSIS] Found ${allPages.length} recently generated pages`);
  
  if (allPages.length === 0) {
    console.log('[QUALITY-ANALYSIS] No pages found for analysis');
    return { analyzed: 0, skipped: true };
  }
  
  // Выбираем страницы для анализа
  const selectedPages = selectPagesForAnalysis(allPages, targetCount);
  console.log(`[QUALITY-ANALYSIS] Selected ${selectedPages.length} pages for analysis:`);
  
  selectedPages.forEach((page, idx) => {
    console.log(`  ${idx + 1}. ${page.url} (${page.lang}, ${page.state || 'N/A'}, ${page.topicType})`);
  });
  
  // Анализируем выбранные страницы
  const analysisResults = [];
  const analysisStart = Date.now();
  
  for (let i = 0; i < selectedPages.length; i++) {
    const page = selectedPages[i];
    console.log(`\n[QUALITY-ANALYSIS] [${i + 1}/${selectedPages.length}] Analyzing: ${page.url}`);
    
    try {
      const result = await analyzePage(page.filePath);
      analysisResults.push({
        page,
        ...result
      });
      console.log(`[QUALITY-ANALYSIS] ✅ Score: ${result.score ? result.score.toFixed(1) + '%' : 'N/A'}`);
    } catch (err) {
      console.error(`[QUALITY-ANALYSIS] ❌ Failed: ${err.error || err.message}`);
      analysisResults.push({
        page,
        success: false,
        error: err.error || err.message
      });
    }
  }
  
  const analysisDuration = ((Date.now() - analysisStart) / 1000).toFixed(1);
  const successful = analysisResults.filter(r => r.success).length;
  const avgScore = analysisResults
    .filter(r => r.success && r.score !== null)
    .reduce((sum, r) => sum + r.score, 0) / successful || 0;
  
  console.log(`\n[QUALITY-ANALYSIS] ========================================`);
  console.log(`[QUALITY-ANALYSIS] Analysis completed in ${analysisDuration}s`);
  console.log(`[QUALITY-ANALYSIS] Analyzed: ${successful}/${selectedPages.length} pages`);
  if (avgScore > 0) {
    console.log(`[QUALITY-ANALYSIS] Average score: ${avgScore.toFixed(1)}%`);
  }
  console.log(`[QUALITY-ANALYSIS] ========================================\n`);
  
  // Сохраняем результаты анализа батча
  const batchAnalysisPath = path.join(ROOT_DIR, 'data', 'seo', 'quality-analysis', 'batch-analysis.jsonl');
  fs.mkdirSync(path.dirname(batchAnalysisPath), { recursive: true });
  
  const batchAnalysis = {
    timestamp: new Date().toISOString(),
    totalPages: allPages.length,
    selectedPages: selectedPages.length,
    analyzedPages: successful,
    avgScore,
    pages: analysisResults.map(r => ({
      url: r.page.url,
      lang: r.page.lang,
      state: r.page.state,
      topicType: r.page.topicType,
      score: r.score,
      success: r.success
    }))
  };
  
  fs.appendFileSync(batchAnalysisPath, JSON.stringify(batchAnalysis) + '\n', 'utf8');
  
  return {
    analyzed: successful,
    total: selectedPages.length,
    avgScore,
    results: analysisResults
  };
}

// Если запущен напрямую
if (require.main === module) {
  const args = process.argv.slice(2);
  const maxAge = args.includes('--max-age') 
    ? parseInt(args[args.indexOf('--max-age') + 1], 10) * 1000 
    : 3600000;
  const targetCount = args.includes('--target-count')
    ? parseInt(args[args.indexOf('--target-count') + 1], 10)
    : 10;
  
  // Создаем фиктивные результаты батча (для тестирования)
  analyzeBatch([], { maxAge, targetCount })
    .then(result => {
      console.log('\n✅ Batch analysis completed');
      process.exit(0);
    })
    .catch(err => {
      console.error('\n❌ Batch analysis failed:', err);
      process.exit(1);
    });
}

module.exports = { analyzeBatch, findGeneratedPages, selectPagesForAnalysis };

