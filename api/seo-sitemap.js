const fs = require('fs');
const path = require('path');

/**
 * API endpoint для обслуживания SEO sitemaps
 * Читает статические XML файлы из public/seo/sitemaps/
 */
module.exports = async (req, res) => {
  try {
    const file = req.query.file || 'sitemap-seo.xml';
    
    // Валидация имени файла (только буквы, цифры, дефисы, точки)
    if (!/^[a-zA-Z0-9._-]+\.xml$/.test(file)) {
      return res.status(400).json({ error: 'Invalid file name' });
    }
    
    // Путь к файлу
    const filePath = path.join(process.cwd(), 'public', 'seo', 'sitemaps', file);
    
    // Проверка существования файла
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Sitemap not found' });
    }
    
    // Чтение и отправка XML
    const xml = fs.readFileSync(filePath, 'utf8');
    
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.status(200).send(xml);
    
  } catch (error) {
    console.error('Error serving sitemap:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

