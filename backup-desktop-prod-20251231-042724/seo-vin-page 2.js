const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
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

  const filePath = path.join(process.cwd(), 'public', 'vin', vin, state, 'index.html');

  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Page not found' });
    }

    const html = fs.readFileSync(filePath, 'utf8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    return res.status(200).send(html);
  } catch (error) {
    console.error('Error reading SEO page:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

