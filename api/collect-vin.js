const { VINCollector } = require('./_lib/vin-collector');

/**
 * SEO MONSTER 6.0: VIN Collection API
 * Сбор VIN кодов для обучения AI
 * ТРИЗ: Максимальное использование ресурсов
 */
module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { vin, type, page, metadata } = req.body || {};

    if (!vin || vin.length !== 17) {
      return res.status(400).json({ error: 'Valid VIN is required' });
    }

    const collector = new VINCollector();

    if (type === 'paid') {
      // Оплаченный VIN (обычно вызывается из webhook)
      await collector.savePaidVIN(vin, {
        page,
        ...metadata
      });
    } else {
      // Неоплаченный VIN (просмотр страницы)
      await collector.saveUnpaidVIN(vin, {
        page,
        userAgent: req.headers['user-agent'],
        referer: req.headers['referer'],
        ...metadata
      });
    }

    return res.status(200).json({ success: true, vin });
  } catch (error) {
    console.error('VIN collection error:', error);
    return res.status(500).json({ error: error.message });
  }
};


