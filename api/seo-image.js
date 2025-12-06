const fs = require('fs');
const path = require('path');

/**
 * API endpoint для обслуживания SEO изображений
 * Читает SVG файлы из public/seo/images/clusters/
 */
module.exports = async (req, res) => {
  try {
    // Извлекаем путь к файлу из URL или query параметра
    // URL: /seo/images/clusters/california-toyota-vin_check-hero.svg
    // Rewrite: /seo/images/clusters/:file* → /api/seo-image.js
    let fileName = req.query.file;
    
    // Если file не в query, пытаемся извлечь из URL
    if (!fileName) {
      const urlPath = req.url.replace('/seo/images/clusters/', '').split('?')[0];
      fileName = urlPath;
    }
    
    // Убираем возможные слеши в начале
    fileName = fileName.replace(/^\//, '').split('?')[0];
    
    // Валидация имени файла (только SVG, только безопасные символы)
    if (!fileName || !fileName.endsWith('.svg') || !/^[a-zA-Z0-9_.-]+\.svg$/.test(fileName)) {
      return res.status(400).json({ error: 'Invalid file name' });
    }
    
    // Путь к файлу
    const filePath = path.join(process.cwd(), 'public', 'seo', 'images', 'clusters', fileName);
    
    // Проверка существования файла
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    // Чтение и отправка SVG
    const svg = fs.readFileSync(filePath, 'utf8');
    
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.status(200).send(svg);
    
  } catch (error) {
    console.error('Error serving SEO image:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

