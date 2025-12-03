/**
 * API endpoint для обслуживания SEO страниц
 * Аналогично api/seo-vin-page.js
 */

const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  try {
    // Извлекаем путь из query или URL
    const pagePath = req.query.path || req.url.replace('/api/seo-page?path=', '').replace('/api/seo-page/', '');
    
    if (!pagePath) {
      return res.status(400).json({ error: 'Page path is required' });
    }
    
    // Множественные пути поиска файла
    const possiblePaths = [
      // Основной путь
      path.join(process.cwd(), 'public', 'seo-pages', pagePath, 'index.html'),
      // Альтернативный путь (без trailing slash)
      path.join(process.cwd(), 'public', 'seo-pages', pagePath.replace(/\/$/, ''), 'index.html'),
      // Путь с .vercel/output (для Vercel builds)
      path.join(process.cwd(), '.vercel', 'output', 'static', 'seo-pages', pagePath, 'index.html'),
      // Путь из корня проекта (fallback)
      path.join(process.cwd(), 'seo-pages', pagePath, 'index.html'),
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
            break;
          }
        }
      } catch (e) {
        // Игнорируем ошибки проверки пути
        continue;
      }
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
 */
function sendFallbackPage(res, pagePath) {
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

