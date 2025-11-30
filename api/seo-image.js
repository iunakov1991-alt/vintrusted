const fs = require('fs');
const path = require('path');

/**
 * API endpoint для обслуживания SEO изображений
 * Читает SVG файлы из public/seo/images/clusters/
 */
module.exports = async (req, res) => {
  try {
    // Извлекаем путь к файлу из URL
    // URL: /seo/images/clusters/california-toyota-vin_check-hero.svg
    // Путь: public/seo/images/clusters/california-toyota-vin_check-hero.svg
    const urlPath = req.url.replace('/seo/images/clusters/', '');
    const fileName = urlPath.split('?')[0]; // Убираем query параметры
    
    // Валидация имени файла (только SVG, только безопасные символы)
    if (!fileName.endsWith('.svg') || !/^[a-zA-Z0-9_-]+\.svg$/.test(fileName)) {
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

