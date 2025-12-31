const fs = require('fs');
const path = require('path');

/**
 * API endpoint для обслуживания SEO страниц VIN
 * Множественные fallback механизмы для исключения 404
 */
module.exports = async (req, res) => {
  try {
    // Получаем параметры из query или из URL path
    let vin = req.query.vin;
    let state = req.query.state;
    
    // Если параметры не в query, пытаемся извлечь из URL
    if (!vin || !state) {
      const urlMatch = req.url.match(/\/vin\/([A-HJ-NPR-Z0-9]{17})\/([a-zA-Z-]+)/);
      if (urlMatch) {
        vin = urlMatch[1];
        state = urlMatch[2];
      }
    }
    
    // Если все еще нет параметров, пытаемся извлечь из path
    if (!vin || !state) {
      const pathMatch = req.url.match(/\/vin\/([A-HJ-NPR-Z0-9]{17})\/([a-zA-Z-]+)/);
      if (pathMatch) {
        vin = pathMatch[1];
        state = pathMatch[2];
      }
    }
    
    if (!vin || !state) {
      console.error('[SEO-VIN-PAGE] Missing parameters:', { url: req.url, query: req.query });
      return res.status(400).json({ error: 'VIN and state are required' });
    }
    
    // Нормализация state (убираем trailing slash, приводим к lowercase)
    state = state.toLowerCase().replace(/\/$/, '');
    
    // Валидация VIN (17 символов, только допустимые символы)
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
      console.error('[SEO-VIN-PAGE] Invalid VIN format:', vin);
      return res.status(400).json({ error: 'Invalid VIN format' });
    }
    
    // Валидация state (только буквы и дефисы)
    if (!/^[a-zA-Z-]+$/.test(state)) {
      console.error('[SEO-VIN-PAGE] Invalid state format:', state);
      return res.status(400).json({ error: 'Invalid state format' });
    }
    
    // Множественные пути поиска файла
    const possiblePaths = [
      // Основной путь
      path.join(process.cwd(), 'public', 'vin', vin, state, 'index.html'),
      // Альтернативный путь (если state с заглавной)
      path.join(process.cwd(), 'public', 'vin', vin, state.charAt(0).toUpperCase() + state.slice(1), 'index.html'),
      // Путь с .vercel/output (для Vercel builds)
      path.join(process.cwd(), '.vercel', 'output', 'static', 'vin', vin, state, 'index.html'),
      // Путь из корня проекта (fallback)
      path.join(process.cwd(), 'vin', vin, state, 'index.html'),
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
          console.error('[SEO-VIN-PAGE] Empty HTML file:', filePath);
          // Fallback на генерацию базовой страницы
          return sendFallbackPage(res, vin, state);
        }
        
        // Успешный ответ
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
        res.setHeader('X-Served-From', 'file-system');
        res.setHeader('X-File-Path', foundPath.replace(process.cwd(), ''));
    res.status(200).send(html);
        return;
      } catch (readError) {
        console.error('[SEO-VIN-PAGE] Error reading file:', readError.message, filePath);
        // Fallback на генерацию базовой страницы
        return sendFallbackPage(res, vin, state);
      }
    }
    
    // Файл не найден - генерируем fallback страницу
    console.warn('[SEO-VIN-PAGE] File not found, generating fallback:', { vin, state, triedPaths: possiblePaths });
    return sendFallbackPage(res, vin, state);
    
  } catch (error) {
    console.error('[SEO-VIN-PAGE] Unexpected error:', error);
    // В крайнем случае - возвращаем базовую страницу
    const vin = req.query.vin || req.url.match(/\/vin\/([A-HJ-NPR-Z0-9]{17})/)?.[1] || 'UNKNOWN';
    const state = req.query.state || req.url.match(/\/vin\/[A-HJ-NPR-Z0-9]{17}\/([a-zA-Z-]+)/)?.[1] || 'state';
    return sendFallbackPage(res, vin, state);
  }
};

/**
 * Генерация fallback страницы, если файл не найден
 * Это гарантирует, что пользователь всегда получит контент, даже если файл не существует
 */
function sendFallbackPage(res, vin, state) {
  const stateLabel = state.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
  
  const fallbackHTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>VIN Check for ${vin} in ${stateLabel} – Full Report</title>
  <meta name="description" content="Instant VIN check for ${vin} in ${stateLabel}. Review ownership, accident and title history before you buy." />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <link rel="canonical" href="https://vintrusted.com/vin/${vin}/${state}/" />
  <link rel="stylesheet" href="/css/seo-absolute.css" />
</head>
<body>
  <div class="seo-page">
    <header class="seo-header">
      <div class="seo-header-content">
        <img src="/logo-vin-trust.png" alt="VIN TRUST" class="seo-logo" />
        <div class="seo-header-descriptor">Trusted VIN reports with instant access to vehicle history, accidents, and ownership records</div>
      </div>
    </header>
    
    <section class="seo-hero">
      <div class="seo-container">
        <span class="seo-hero-vin">${vin}</span>
        <div class="seo-hero-meta">${stateLabel}</div>
        <p class="seo-hero-summary">Complete VIN history report for ${vin} in ${stateLabel}. Get detailed information about title, accidents, ownership, and more.</p>
        <a href="/checkout?vin=${vin}" class="seo-hero-cta">Get Full Report</a>
      </div>
    </section>
    
    <section class="seo-key-facts seo-section">
      <div class="seo-container">
        <div class="seo-key-fact-card">
          <div class="seo-key-fact-icon">📋</div>
          <div class="seo-key-fact-label">VIN</div>
          <div class="seo-key-fact-value">${vin}</div>
        </div>
        <div class="seo-key-fact-card">
          <div class="seo-key-fact-icon">🚗</div>
          <div class="seo-key-fact-label">State</div>
          <div class="seo-key-fact-value">${stateLabel}</div>
        </div>
      </div>
    </section>
    
    <section class="seo-section">
      <div class="seo-container">
        <h2>VIN Report Information</h2>
        <p>A comprehensive VIN report provides crucial information about a vehicle's history, helping buyers make informed decisions. This report aggregates data from multiple sources including state DMV records, insurance databases, and auction listings.</p>
        <p><strong>Why check a VIN?</strong> A VIN check helps you understand the vehicle's accident history, ownership records, title status, and potential fraud risks before making a purchase decision.</p>
        <a href="/checkout?vin=${vin}" class="seo-hero-cta">Get Full Detailed Report</a>
      </div>
    </section>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300'); // Короче кеш для fallback
  res.setHeader('X-Served-From', 'fallback');
  res.status(200).send(fallbackHTML);
}
