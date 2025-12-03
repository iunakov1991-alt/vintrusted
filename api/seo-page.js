/**
 * API endpoint для обслуживания SEO страниц
 * Аналогично api/seo-vin-page.js
 */

const fs = require('fs');
const path = require('path');

// Встроенный контент для vin-check-0 (временное решение до исправления файловой системы)
const EMBEDDED_VIN_CHECK_0 = require('./seo-page-vin-check-0-content.js');

module.exports = async (req, res) => {
  try {
    // Извлекаем путь из query или URL
    let pagePath = req.query.path;
    
    // Если path не в query, пытаемся извлечь из URL
    if (!pagePath) {
      // Из rewrite: /seo-pages/(.*) → /api/seo-page.js?path=$1
      // path может быть в req.url как /api/seo-page?path=vin-check-0
      const urlMatch = req.url.match(/[?&]path=([^&]+)/);
      if (urlMatch) {
        pagePath = decodeURIComponent(urlMatch[1]);
      } else {
        // Пытаемся извлечь из пути напрямую
        const pathMatch = req.url.match(/\/seo-pages\/(.+)/);
        if (pathMatch) {
          pagePath = pathMatch[1].split('?')[0].split('/')[0];
        }
      }
    }
    
    // Декодируем URL если нужно
    if (pagePath) {
      pagePath = decodeURIComponent(pagePath);
      // Убираем trailing slash
      pagePath = pagePath.replace(/\/$/, '');
    }
    
    // Если все еще нет path, используем vin-check-0 как default для тестирования
    if (!pagePath) {
      console.warn('[SEO-PAGE] No path provided, using default vin-check-0:', { url: req.url, query: req.query });
      pagePath = 'vin-check-0';
    }
    
    console.log('[SEO-PAGE] Requested path:', pagePath, 'URL:', req.url, 'Query:', req.query);
    
    // Множественные пути поиска файла (как в seo-vin-page.js)
    const possiblePaths = [
      // Основной путь (локально и на Vercel)
      path.join(process.cwd(), 'public', 'seo-pages', pagePath, 'index.html'),
      // Альтернативный путь (без trailing slash)
      path.join(process.cwd(), 'public', 'seo-pages', pagePath.replace(/\/$/, ''), 'index.html'),
      // Путь с .vercel/output (для Vercel builds)
      path.join(process.cwd(), '.vercel', 'output', 'static', 'seo-pages', pagePath, 'index.html'),
      // Путь из .vercel/output/static (альтернативный формат)
      path.join(process.cwd(), '.vercel', 'output', 'static', 'public', 'seo-pages', pagePath, 'index.html'),
      // Путь из корня проекта (fallback)
      path.join(process.cwd(), 'seo-pages', pagePath, 'index.html'),
      // Путь из /var/task (Vercel Lambda)
      path.join('/var/task', 'public', 'seo-pages', pagePath, 'index.html'),
      // Путь из /var/task/.vercel/output
      path.join('/var/task', '.vercel', 'output', 'static', 'seo-pages', pagePath, 'index.html'),
    ];
    
    let filePath = null;
    let foundPath = null;
    
    // Пробуем найти файл по всем возможным путям
    for (const possiblePath of possiblePaths) {
      try {
        if (fs.existsSync(possiblePath)) {
          const stats = fs.statSync(possiblePath);
          if (stats.isFile() && stats.size > 0) {
            filePath = possiblePath;
            foundPath = possiblePath;
            console.log('[SEO-PAGE] File found at:', foundPath);
            break;
          }
        }
      } catch (e) {
        // Игнорируем ошибки проверки пути
        continue;
      }
    }
    
    // Логируем все проверенные пути для отладки
    if (!filePath) {
      console.warn('[SEO-PAGE] File not found. Checked paths:', possiblePaths);
    }
    
    // Если файл найден - читаем и отдаем
    if (filePath && foundPath) {
      try {
        const html = fs.readFileSync(filePath, 'utf8');
        
        // Проверяем, что HTML не пустой
        if (!html || html.trim().length === 0) {
          console.error('[SEO-PAGE] Empty HTML file:', filePath);
          return sendFallbackPage(res, pagePath);
        }
        
        // Успешный ответ
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
        res.setHeader('X-Served-From', 'file-system');
        res.setHeader('X-File-Path', foundPath.replace(process.cwd(), ''));
        res.status(200).send(html);
        return;
      } catch (readError) {
        console.error('[SEO-PAGE] Error reading file:', readError.message, filePath);
        return sendFallbackPage(res, pagePath);
      }
    }
    
    // Файл не найден - генерируем fallback страницу
    console.warn('[SEO-PAGE] File not found, generating fallback:', { pagePath, triedPaths: possiblePaths });
    return sendFallbackPage(res, pagePath);
    
  } catch (error) {
    console.error('[SEO-PAGE] Unexpected error:', error);
    const pagePath = req.query.path || 'unknown';
    return sendFallbackPage(res, pagePath);
  }
};

/**
 * Генерация fallback страницы, если файл не найден
 * Для vin-check-0 используем встроенный контент
 */
function sendFallbackPage(res, pagePath) {
    // Для vin-check-0 всегда используем встроенный контент
    if (pagePath === 'vin-check-0' || pagePath.startsWith('vin-check-0') || !pagePath) {
      const embeddedHTML = getEmbeddedPageContent();
      if (embeddedHTML) {
        console.log('[SEO-PAGE] Serving embedded content for:', pagePath);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.setHeader('X-Served-From', 'embedded');
        res.status(200).send(embeddedHTML);
        return;
      }
    }
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SEO Page - ${pagePath} | VINTrusted</title>
</head>
<body>
    <h1>SEO Page: ${pagePath}</h1>
    <p>This page is being generated. Please check back soon.</p>
    <p><a href="/">Return to Home</a></p>
</body>
</html>`;
  
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.status(200).send(html);
}

/**
 * Встроенный контент для vin-check-0 (временное решение)
 */
function getEmbeddedPageContent() {
  // Используем встроенный контент из модуля
  try {
    return EMBEDDED_VIN_CHECK_0;
  } catch (e) {
    console.error('[SEO-PAGE] Error loading embedded content:', e.message);
  }
  
  // Fallback: читаем файл локально если доступен
  try {
    const filePath = path.join(process.cwd(), 'public', 'seo-pages', 'vin-check-0', 'index.html');
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8');
    }
  } catch (e) {
    // Игнорируем ошибки
  }
  return null;
}

