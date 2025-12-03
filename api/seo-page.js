/**
 * API endpoint для обслуживания SEO страниц
 * Аналогично api/seo-vin-page.js
 */

const fs = require('fs');
const path = require('path');

// Встроенный HTML контент для vin-check-0 (встроен прямо здесь для надежности)
const EMBEDDED_VIN_CHECK_0_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Complete Guide to VIN Checks - Vehicle History Report | VINTrusted</title>
    <meta name="description" content="Learn everything about VIN checks in vehicle history reports. Get comprehensive information and make informed decisions.">
    <link rel="canonical" href="https://vintrusted.com/seo-pages/vin-check-0/">
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800;900&family=DM+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
*{margin:0;padding:0;box-sizing:border-box}:root{--color-bg:#0f0f0f;--color-text:#fff;--color-text-secondary:#ccc;--color-accent:#3B82F6;--color-border:rgba(255,255,255,.1);--font-family:'Manrope','DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}body{font-family:var(--font-family);color:var(--color-text);background:var(--color-bg);line-height:1.6;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}.seo-header{position:relative;width:100%;background:rgba(15,15,15,.95);backdrop-filter:blur(10px);border-bottom:1px solid var(--color-border);z-index:1000}.seo-header-content{max-width:1200px;margin:0 auto;padding:20px;display:flex;justify-content:space-between;align-items:center}.seo-logo-link{display:flex;align-items:center;text-decoration:none}.seo-logo{height:40px;width:auto}.seo-nav{display:flex;gap:30px}.seo-nav a{color:var(--color-text);text-decoration:none;font-weight:500;transition:color .3s}.seo-nav a:hover{color:var(--color-accent)}.seo-language-selector{display:flex;gap:10px}.seo-language-selector a{color:var(--color-text-secondary);text-decoration:none;padding:5px 10px;border-radius:4px;transition:all .3s}.seo-language-selector a.active{color:var(--color-accent);background:rgba(59,130,246,.1)}.seo-hero-section{position:relative;width:100%;height:400px;overflow:hidden;display:flex;align-items:center;justify-content:center}.seo-hero-background{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;opacity:.3}.seo-hero-overlay{position:absolute;top:0;left:0;width:100%;height:100%;background:linear-gradient(180deg,rgba(15,15,15,.8) 0%,rgba(15,15,15,.95) 100%)}.seo-hero-content{position:relative;z-index:2;text-align:center;max-width:800px;padding:0 20px}.seo-hero-title{font-size:48px;font-weight:800;margin-bottom:20px;color:var(--color-text)}.seo-hero-subtitle{font-size:20px;color:var(--color-text-secondary);line-height:1.6}.seo-main{max-width:1200px;margin:0 auto;padding:60px 20px}.seo-article{background:rgba(255,255,255,.02);border-radius:12px;padding:40px;border:1px solid var(--color-border)}.seo-article h2{font-size:32px;font-weight:600;margin-top:40px;margin-bottom:20px;color:var(--color-text)}.seo-article h3{font-size:22px;font-weight:600;margin-top:30px;margin-bottom:15px;color:var(--color-text)}.seo-article p{font-size:16px;line-height:1.8;margin-bottom:20px;color:var(--color-text-secondary)}.seo-article ul,.seo-article ol{margin:20px 0;padding-left:30px}.seo-article li{font-size:16px;line-height:1.8;margin-bottom:10px;color:var(--color-text-secondary)}.seo-faq{margin-top:40px}.seo-faq-item{background:rgba(255,255,255,.03);border:1px solid var(--color-border);border-radius:8px;padding:20px;margin-bottom:15px}.seo-faq-question{font-size:18px;font-weight:600;margin-bottom:10px;color:var(--color-text)}.seo-faq-answer{font-size:16px;line-height:1.8;color:var(--color-text-secondary)}.seo-footer{background:rgba(15,15,15,.95);border-top:1px solid var(--color-border);padding:40px 20px;text-align:center;margin-top:60px}.seo-footer p{color:var(--color-text-secondary);margin-bottom:10px}@media (max-width:768px){.seo-hero-title{font-size:32px}.seo-hero-subtitle{font-size:18px}.seo-main{padding:40px 15px}.seo-article{padding:30px 20px}}
    </style>
</head>
<body>
    <header class="seo-header">
        <div class="seo-header-content">
            <a href="/" class="seo-logo-link">
                <img src="/images/logo-vin-trust.png" alt="VIN TRUST" class="seo-logo">
            </a>
            <nav class="seo-nav">
                <a href="/">Home</a>
                <a href="/vin-check">VIN Check</a>
                <a href="/about-us">About Us</a>
                <a href="/contact">Contact</a>
            </nav>
            <div class="seo-language-selector">
                <a href="#" class="active">EN</a>
                <a href="#">DE</a>
            </div>
        </div>
    </header>

    <section class="seo-hero-section">
        <img src="/auction-background.png" alt="Background" class="seo-hero-background">
        <div class="seo-hero-overlay"></div>
        <div class="seo-hero-content">
            <h1 class="seo-hero-title">Complete Guide to VIN Checks</h1>
            <p class="seo-hero-subtitle">Learn everything about VIN checks in vehicle history reports. Get comprehensive information and make informed decisions.</p>
        </div>
    </section>

    <main class="seo-main">
        <div class="seo-container">
            <article class="seo-article">
                <section>
                    <h2>Introduction</h2>
                    <p>This comprehensive guide covers everything you need to know about VIN checks in vehicle history reports. Understanding VIN checks is essential for making informed decisions when purchasing or evaluating a vehicle. Whether you're a buyer, seller, or dealer, having accurate information about a vehicle's VIN check can help you avoid costly mistakes and ensure transparency in transactions.</p>
                </section>

                <section>
                    <h2>What is a VIN Check?</h2>
                    <p>A VIN check is a critical component of vehicle history reports that provides valuable information about a vehicle's past. This data is collected from various sources including state DMV records, insurance companies, repair facilities, and other authorized entities. Understanding what a VIN check means and how it impacts a vehicle's value and safety is crucial for anyone involved in vehicle transactions.</p>
                    <ul>
                        <li>Definition and scope of VIN check data</li>
                        <li>Sources of VIN check information</li>
                        <li>Why VIN checks matter in vehicle evaluation</li>
                        <li>How VIN checks affect vehicle value and safety</li>
                    </ul>
                </section>

                <section>
                    <h2>Key Information About VIN Checks</h2>
                    <p>When evaluating VIN check data, there are several key factors to consider. First, it's important to understand the timeline and frequency of VIN check events. This information can help you identify patterns and potential concerns. Second, the severity and nature of VIN check incidents should be carefully examined. Not all VIN check entries are equal, and understanding the context is crucial.</p>
                </section>

                <div class="seo-faq">
                    <h2>Frequently Asked Questions</h2>
                    <div class="seo-faq-item">
                        <div class="seo-faq-question">What is a VIN check?</div>
                        <div class="seo-faq-answer">A VIN check is a comprehensive vehicle history report that provides detailed information about a vehicle's past, including accidents, ownership history, title status, and more.</div>
                    </div>
                    <div class="seo-faq-item">
                        <div class="seo-faq-question">How do I perform a VIN check?</div>
                        <div class="seo-faq-answer">You can perform a VIN check by entering the vehicle's 17-character VIN number into our VIN check tool. The report will be generated instantly.</div>
                    </div>
                    <div class="seo-faq-item">
                        <div class="seo-faq-question">What information is included in a VIN check?</div>
                        <div class="seo-faq-answer">A VIN check includes information about accidents, title history, ownership records, mileage readings, and other important vehicle details.</div>
                    </div>
                </div>
            </article>
        </div>
    </main>

    <footer class="seo-footer">
        <p>&copy; 2024 VINTrusted. All rights reserved.</p>
        <p>Your trusted source for vehicle history reports.</p>
    </footer>
</body>
</html>`;

/**
 * Встроенный контент для vin-check-0 (временное решение)
 */
function getEmbeddedPageContent() {
  // Используем встроенный HTML контент
  return EMBEDDED_VIN_CHECK_0_HTML;
}

module.exports = async (req, res) => {
  // Логируем все входящие данные для отладки
  console.log('[SEO-PAGE] Request received:', {
    url: req.url,
    query: req.query,
    method: req.method,
    headers: req.headers
  });
  
  // Извлекаем путь из query или URL
  let pagePath = req.query.path;
  
  // Если path не в query, пытаемся извлечь из URL
  if (!pagePath) {
    // Из rewrite: /seo-pages/(.*) → /api/seo-page.js?path=$1
    const urlMatch = req.url.match(/[?&]path=([^&]+)/);
    if (urlMatch) {
      pagePath = decodeURIComponent(urlMatch[1]);
    } else {
      // Пытаемся извлечь из самого URL
      const pathMatch = req.url.match(/\/seo-pages\/(.+)/);
      if (pathMatch) {
        pagePath = pathMatch[1].split('?')[0];
      }
    }
  }
  
  if (pagePath) {
    try {
      pagePath = decodeURIComponent(pagePath).replace(/\/$/, '');
    } catch (e) {
      // Если decodeURIComponent не работает, просто убираем trailing slash
      pagePath = pagePath.replace(/\/$/, '');
    }
  }
  
  if (!pagePath || pagePath === '') {
    pagePath = 'vin-check-0';
  }
  
  console.log('[SEO-PAGE] Extracted path:', pagePath);
  
  // Для vin-check-0 всегда используем встроенный контент
  if (pagePath === 'vin-check-0' || pagePath.startsWith('vin-check-0')) {
    try {
      const embeddedHTML = getEmbeddedPageContent();
      if (embeddedHTML) {
        console.log('[SEO-PAGE] Serving embedded content for:', pagePath);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.setHeader('X-Served-From', 'embedded');
        res.status(200).send(embeddedHTML);
        return;
      }
    } catch (e) {
      console.error('[SEO-PAGE] Error serving embedded content:', e.message);
      // Продолжаем к fallback
    }
  }
  
  // Fallback на поиск файла в файловой системе
  try {
    
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

