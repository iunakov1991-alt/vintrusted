const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  try {
    // В Vercel rewrite параметры доступны через req.query
    // /vin/:vin/:state -> req.query.vin и req.query.state
    let vin = req.query.vin;
    let state = req.query.state;
    
    // Если параметры не в query, пытаемся извлечь из req.url
    if (!vin || !state) {
      const urlPath = req.url || '';
      const parts = urlPath.split('/').filter(Boolean);
      
      // Ищем /vin в пути
      const vinIdx = parts.indexOf('vin');
      if (vinIdx !== -1 && vinIdx + 1 < parts.length) {
        vin = vin || parts[vinIdx + 1];
        state = state || parts[vinIdx + 2] || '';
      }
    }
    
    if (!vin || vin.length !== 17) {
      return res.status(404).send('Invalid VIN');
    }
    
    if (!state) {
      return res.status(404).send('State required');
    }
    
    // Путь к файлу
    const filePath = path.join(process.cwd(), 'public/seo/pages/vin', vin, state, 'index.html');
    
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.status(200).send(content);
    }
    
    // Если файл не существует, возвращаем 404
    return res.status(404).send('Page not found');
    
  } catch (error) {
    console.error('Error serving SEO page:', error);
    return res.status(500).send('Internal server error');
  }
};

