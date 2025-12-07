/**
 * API endpoint для batch-dashboard
 * Отдает HTML страницу дашборда
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

// Пробуем загрузить HTML из файла, если не получится - используем встроенный
let dashboardHTML = null;

function loadDashboardHTML() {
  if (dashboardHTML) return dashboardHTML;
  
  const possiblePaths = [
    path.join(ROOT_DIR, 'batch-dashboard.html'),
    path.join(ROOT_DIR, 'public', 'batch-dashboard.html'),
    path.join(ROOT_DIR, '.vercel', 'output', 'static', 'batch-dashboard.html'),
    path.join('/var/task', 'batch-dashboard.html'),
    path.join('/var/task', 'public', 'batch-dashboard.html')
  ];

  for (const filePath of possiblePaths) {
    try {
      if (fs.existsSync(filePath)) {
        dashboardHTML = fs.readFileSync(filePath, 'utf8');
        console.log('[Batch Dashboard] Loaded from:', filePath);
        return dashboardHTML;
      }
    } catch (err) {
      // Продолжаем поиск
    }
  }
  
  // Если файл не найден, используем встроенный HTML (будет загружен из public/batch-dashboard.html)
  console.warn('[Batch Dashboard] File not found, will try to read from public/');
  return null;
}

module.exports = async (req, res) => {
  try {
    let html = loadDashboardHTML();
    
    // Если не загрузили, пробуем еще раз прочитать файл
    if (!html) {
      try {
        const publicPath = path.join(ROOT_DIR, 'public', 'batch-dashboard.html');
        if (fs.existsSync(publicPath)) {
          html = fs.readFileSync(publicPath, 'utf8');
          dashboardHTML = html;
        }
      } catch (err) {
        console.error('[Batch Dashboard] Cannot read file:', err.message);
      }
    }
    
    // Если все еще нет HTML, возвращаем ошибку
    if (!html) {
      return res.status(404).json({
        error: 'Dashboard file not found',
        message: 'Please ensure public/batch-dashboard.html exists'
      });
    }
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (err) {
    console.error('[Batch Dashboard] Error:', err);
    return res.status(500).json({
      error: err.message
    });
  }
};
