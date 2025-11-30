const fs = require('fs');
const path = require('path');

/**
 * API endpoint для обслуживания SEO страниц VIN
 * Читает статические HTML файлы из public/vin/
 */
module.exports = async (req, res) => {
  try {
    const { vin, state } = req.query;
    
    if (!vin || !state) {
      return res.status(400).json({ error: 'VIN and state are required' });
    }
    
    // Валидация VIN (17 символов, только допустимые символы)
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
      return res.status(400).json({ error: 'Invalid VIN format' });
    }
    
    // Валидация state (только буквы и дефисы)
    if (!/^[a-zA-Z-]+$/.test(state)) {
      return res.status(400).json({ error: 'Invalid state format' });
    }
    
    // Путь к файлу
    const filePath = path.join(process.cwd(), 'public', 'vin', vin, state, 'index.html');
    
    // Проверка существования файла
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Page not found' });
    }
    
    // Чтение и отправка HTML
    const html = fs.readFileSync(filePath, 'utf8');
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.status(200).send(html);
    
  } catch (error) {
    console.error('Error serving VIN page:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

