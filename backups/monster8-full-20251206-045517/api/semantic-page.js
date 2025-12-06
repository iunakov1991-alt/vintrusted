/**
 * API endpoint для semantic-pages (MONSTER 8.0)
 * Fallback если статический файл не найден
 */

const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  // Получаем параметры из query или URL
  let lang = req.query.lang;
  let pagePath = req.query.path;
  
  // Если нет в query, пытаемся извлечь из URL
  if (!lang || !pagePath) {
    const url = req.url || req.path || '';
    const match = url.match(/^\/(en|es)\/(.+)$/);
    if (match) {
      lang = match[1];
      pagePath = match[2].replace(/\/$/, '');
    }
  }
  
  if (!lang || !pagePath) {
    console.error('[SEMANTIC-PAGE] Invalid path format:', { url: req.url, query: req.query });
    return res.status(404).json({ error: 'Invalid path format', url: req.url, query: req.query });
  }
  
  pagePath = pagePath.replace(/\/$/, ''); // Убираем trailing slash
  
  console.log('[SEMANTIC-PAGE] Request:', { lang, pagePath, url: req.url, query: req.query });
  
  // Множественные пути поиска файла (как в seo-page.js)
  const possiblePaths = [
    // Основной путь (локально и на Vercel)
    path.join(process.cwd(), 'public', 'semantic-pages', lang, pagePath, 'index.html'),
    // Альтернативный путь (без trailing slash)
    path.join(process.cwd(), 'public', 'semantic-pages', lang, pagePath.replace(/\/$/, ''), 'index.html'),
    // Путь с .vercel/output (для Vercel builds)
    path.join(process.cwd(), '.vercel', 'output', 'static', 'public', 'semantic-pages', lang, pagePath, 'index.html'),
    // Путь из /var/task (Vercel Lambda)
    path.join('/var/task', 'public', 'semantic-pages', lang, pagePath, 'index.html'),
    // Путь из /var/task/.vercel/output
    path.join('/var/task', '.vercel', 'output', 'static', 'public', 'semantic-pages', lang, pagePath, 'index.html'),
  ];
  
  let filePath = null;
  let foundPath = null;
  
  // Пробуем найти файл по всем возможным путям
  console.log('[SEMANTIC-PAGE] Searching in paths:', possiblePaths.length);
  for (const possiblePath of possiblePaths) {
    try {
      if (fs.existsSync(possiblePath)) {
        const stats = fs.statSync(possiblePath);
        if (stats.isFile() && stats.size > 0) {
          filePath = possiblePath;
          foundPath = possiblePath;
          console.log('[SEMANTIC-PAGE] File found:', foundPath);
          break;
        } else {
          console.log('[SEMANTIC-PAGE] File exists but invalid:', possiblePath, 'size:', stats.size);
        }
      }
    } catch (e) {
      console.log('[SEMANTIC-PAGE] Error checking path:', possiblePath, e.message);
      continue;
    }
  }
  
  if (!filePath) {
    console.warn('[SEMANTIC-PAGE] File not found in any path:', { lang, pagePath, cwd: process.cwd() });
  }
  
  // Если файл найден - отдаем его
  if (filePath && foundPath) {
    try {
      const html = fs.readFileSync(filePath, 'utf8');
      
      if (!html || html.trim().length === 0) {
        console.error('[SEMANTIC-PAGE] Empty HTML file:', filePath);
        return res.status(404).json({
          error: 'Empty file',
          path: `/${lang}/${pagePath}`
        });
      }
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
      res.setHeader('X-Served-From', 'api-fallback');
      res.setHeader('X-File-Path', foundPath.replace(process.cwd(), ''));
      res.status(200).send(html);
      return;
    } catch (readError) {
      console.error('[SEMANTIC-PAGE] Error reading file:', readError.message, filePath);
    }
  }
  
  // Файл не найден - возвращаем 404
  console.warn('[SEMANTIC-PAGE] File not found:', { lang, pagePath, triedPaths: possiblePaths });
  res.status(404).json({
    error: 'Page not found',
    path: `/${lang}/${pagePath}`,
    message: 'This page has not been generated yet. Please check back later.',
    lang,
    pagePath
  });
};

