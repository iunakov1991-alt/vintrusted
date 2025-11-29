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
    
    // Путь к файлу
    const filePath = path.join(process.cwd(), 'public/seo/pages/vin', vin, state, 'index.html');
    
    console.log('SEO Page API:', { url: req.url, vin, state, filePath, exists: fs.existsSync(filePath), cwd: process.cwd() });
    
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      console.log('SEO Page API: File served successfully', { vin, state });
      return res.status(200).send(content);
    }
    
    // Если файл не существует, возвращаем 404
    console.log('SEO Page API: File not found', { filePath, cwd: process.cwd() });
    return res.status(404).send('Page not found');
    
  } catch (error) {
    console.error('Error serving SEO page:', error);
    return res.status(500).send('Internal server error');
  }
};

