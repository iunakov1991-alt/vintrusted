const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  try {
    // Логирование для отладки - всегда логируем запрос
    console.log('SEO Page API called:', { 
      url: req.url, 
      method: req.method,
      query: req.query,
      headers: req.headers
    });
    
    // В Vercel rewrite, req.url содержит оригинальный путь запроса
    // Например: /vin/4T1BF1FK3FU123456/texas/
    const urlPath = req.url || '';
    const parts = urlPath.split('/').filter(Boolean);
    
    // Ищем /vin в пути
    const vinIdx = parts.indexOf('vin');
    if (vinIdx === -1 || vinIdx + 1 >= parts.length) {
      console.log('SEO Page API: VIN not found in URL', { urlPath, parts });
      return res.status(404).send('Not found - VIN not in URL');
    }
    
    const vin = parts[vinIdx + 1];
    const state = parts[vinIdx + 2] || '';
    
    if (!vin || vin.length !== 17) {
      console.log('SEO Page API: Invalid VIN', { vin, vinLength: vin ? vin.length : 0 });
      return res.status(404).send('Invalid VIN');
    }
    
    if (!state) {
      console.log('SEO Page API: State required', { vin });
      return res.status(404).send('State required');
    }
    
    // Пробуем несколько путей к файлу (для разных окружений Vercel)
    // На Vercel файлы из public/ могут быть в разных местах
    const cwd = process.cwd();
    const possiblePaths = [
      // Стандартный путь (локально и на Vercel)
      path.join(cwd, 'public/seo/pages/vin', vin, state, 'index.html'),
      // Альтернативный путь (если public/ не в корне)
      path.join(cwd, 'seo/pages/vin', vin, state, 'index.html'),
      // Путь относительно __dirname (если функция в другой директории)
      path.join(__dirname, '..', 'public/seo/pages/vin', vin, state, 'index.html'),
      // Vercel может использовать .vercel/output/static
      path.join(cwd, '.vercel/output/static/public/seo/pages/vin', vin, state, 'index.html'),
    ];
    
    let filePath = null;
    let content = null;
    
    console.log('SEO Page API: Searching for file:', { vin, state, cwd, __dirname });
    
    for (const testPath of possiblePaths) {
      try {
        console.log('SEO Page API: Trying path:', testPath);
        if (fs.existsSync(testPath)) {
          filePath = testPath;
          content = fs.readFileSync(testPath, 'utf8');
          console.log('SEO Page API: File found at:', filePath, 'size:', content.length);
          break;
        } else {
          console.log('SEO Page API: Path does not exist:', testPath);
        }
      } catch (err) {
        console.log('SEO Page API: Error checking path:', testPath, err.message);
      }
    }
    
    if (content) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      console.log('SEO Page API: File served successfully', { vin, state, filePath });
      return res.status(200).send(content);
    }
    
    // Если файл не найден ни по одному пути, возвращаем 404
    console.log('SEO Page API: File not found', { 
      vin, 
      state, 
      triedPaths: possiblePaths,
      cwd: process.cwd(),
      __dirname: __dirname
    });
    return res.status(404).send('Page not found');
    
  } catch (error) {
    console.error('Error serving SEO page:', error);
    return res.status(500).send('Internal server error');
  }
};

