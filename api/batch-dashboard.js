/**
 * API endpoint для batch-dashboard
 * Отдает HTML страницу дашборда
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

module.exports = async (req, res) => {
  try {
    // Пробуем найти файл в разных местах
    const possiblePaths = [
      path.join(ROOT_DIR, 'batch-dashboard.html'),
      path.join(ROOT_DIR, 'public', 'batch-dashboard.html'),
      path.join(ROOT_DIR, '.vercel', 'output', 'static', 'batch-dashboard.html'),
      path.join('/var/task', 'batch-dashboard.html'),
      path.join('/var/task', 'public', 'batch-dashboard.html')
    ];

    let html = null;
    let foundPath = null;

    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        html = fs.readFileSync(filePath, 'utf8');
        foundPath = filePath;
        break;
      }
    }

    if (!html) {
      console.error('[Batch Dashboard] File not found. Tried paths:', possiblePaths);
      return res.status(404).json({
        error: 'Dashboard file not found',
        triedPaths: possiblePaths
      });
    }

    console.log('[Batch Dashboard] Serving from:', foundPath);
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (err) {
    console.error('[Batch Dashboard] Error:', err);
    return res.status(500).json({
      error: err.message
    });
  }
};
