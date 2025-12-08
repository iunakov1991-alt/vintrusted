/**
 * MONSTER 8.0 Dashboard - Полноценный пульт управления
 * 
 * Встроенный HTML дашборд для управления партиями генерации контента.
 * Полностью интегрирован с KV Batch Store и GitHub Actions.
 */

const path = require('path');
const kvBatchStorePath = path.join(__dirname, '..', 'lib', 'kvBatchStore');
const { getCurrentBatch, getLastBatch } = require(kvBatchStorePath);

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MONSTER 8.0 - Пульт управления</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
      color: #333;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
    }

    .header {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      backdrop-filter: blur(10px);
    }

    .header h1 {
      font-size: 32px;
      font-weight: 700;
      color: #667eea;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header .subtitle {
      color: #666;
      font-size: 14px;
    }

    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 24px;
    }

    @media (max-width: 1024px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }

    .card {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      backdrop-filter: blur(10px);
    }

    .card h2 {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 16px;
      color: #333;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .status-queued {
      background: #fef3c7;
      color: #92400e;
    }

    .status-running {
      background: #dbeafe;
      color: #1e40af;
      animation: pulse 2s infinite;
    }

    .status-success {
      background: #d1fae5;
      color: #065f46;
    }

    .status-failed {
      background: #fee2e2;
      color: #991b1b;
    }

    .status-stopped {
      background: #e5e7eb;
      color: #374151;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    .batch-info {
      margin-bottom: 16px;
    }

    .batch-info.empty {
      text-align: center;
      padding: 40px;
      color: #999;
      font-style: italic;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }

    .info-row:last-child {
      border-bottom: none;
    }

    .info-label {
      color: #666;
      font-size: 14px;
    }

    .info-value {
      font-weight: 600;
      color: #333;
      font-size: 14px;
    }

    .progress-bar {
      width: 100%;
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
      margin: 12px 0;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      transition: width 0.3s ease;
      border-radius: 4px;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #333;
      font-size: 14px;
    }

    .form-group select,
    .form-group input {
      width: 100%;
      padding: 12px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 14px;
      transition: border-color 0.2s;
    }

    .form-group select:focus,
    .form-group input:focus {
      outline: none;
      border-color: #667eea;
    }

    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .btn-danger {
      background: #ef4444;
      color: white;
    }

    .btn-danger:hover:not(:disabled) {
      background: #dc2626;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .alert {
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 16px;
      font-size: 14px;
    }

    .alert-error {
      background: #fee2e2;
      color: #991b1b;
      border-left: 4px solid #ef4444;
    }

    .alert-success {
      background: #d1fae5;
      color: #065f46;
      border-left: 4px solid #10b981;
    }

    .alert-info {
      background: #dbeafe;
      color: #1e40af;
      border-left: 4px solid #3b82f6;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 12px;
      margin-top: 16px;
    }

    .stat-card {
      background: #f9fafb;
      padding: 12px;
      border-radius: 8px;
      text-align: center;
    }

    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: #667eea;
    }

    .stat-label {
      font-size: 12px;
      color: #666;
      margin-top: 4px;
    }

    .loading {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid #fff;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .timestamp {
      font-size: 12px;
      color: #999;
    }

    .notes {
      background: #f9fafb;
      padding: 12px;
      border-radius: 8px;
      font-size: 13px;
      color: #666;
      margin-top: 12px;
      max-height: 100px;
      overflow-y: auto;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎯 MONSTER 8.0 - Пульт управления</h1>
      <div class="subtitle">Управление партиями генерации контента</div>
    </div>

    <div id="alerts"></div>

    <div class="grid">
      <!-- Текущая партия -->
      <div class="card">
        <h2>📊 Текущая партия</h2>
        <div id="current-batch" class="batch-info empty">
          Нет активной партии
        </div>
      </div>

      <!-- Последняя партия -->
      <div class="card">
        <h2>📋 Последняя партия</h2>
        <div id="last-batch" class="batch-info empty">
          Нет завершенных партий
        </div>
      </div>
    </div>

    <!-- Управление -->
    <div class="card">
      <h2>🚀 Управление партиями</h2>
      <form id="start-form">
        <div class="form-group">
          <label>Фаза языка</label>
          <select id="phase" name="phase" required>
            <option value="auto">Авто (рекомендуется)</option>
            <option value="en_only">Только английский</option>
            <option value="mixed">Смешанная</option>
            <option value="es_focus">Фокус на испанский</option>
          </select>
        </div>
        <div class="form-group">
          <label>Длина статей</label>
          <select id="length" name="length" required>
            <option value="auto">Авто (рекомендуется)</option>
            <option value="short">Короткие</option>
            <option value="long">Длинные</option>
          </select>
        </div>
        <div style="display: flex; gap: 12px;">
          <button type="submit" class="btn btn-primary" id="start-btn">
            🚀 Запустить партию
          </button>
          <button type="button" class="btn btn-danger" id="stop-btn" disabled>
            🛑 Остановить партию
          </button>
        </div>
      </form>
    </div>
  </div>

  <script>
    const API_BASE = '/api/monster';
    let statusInterval = null;
    let currentBatchId = null;

    // Инициализация
    document.addEventListener('DOMContentLoaded', () => {
      updateStatus();
      startStatusPolling();

      document.getElementById('start-form').addEventListener('submit', handleStart);
      document.getElementById('stop-btn').addEventListener('click', handleStop);
    });

    // Обновление статуса
    async function updateStatus() {
      try {
        const response = await fetch(API_BASE + '/status');
        const data = await response.json();

        if (data.success) {
          updateUI(data.current, data.last);
        } else {
          showAlert('error', 'Ошибка загрузки статуса: ' + (data.error || 'Неизвестная ошибка'));
        }
      } catch (err) {
        console.error('Ошибка обновления статуса:', err);
        showAlert('error', 'Ошибка подключения к API');
      }
    }

    // Обновление UI
    function updateUI(current, last) {
      const currentEl = document.getElementById('current-batch');
      const lastEl = document.getElementById('last-batch');
      const stopBtn = document.getElementById('stop-btn');

      // Текущая партия
      if (current) {
        currentBatchId = current.id;
        currentEl.className = 'batch-info';
        currentEl.innerHTML = renderBatchInfo(current, true);
        stopBtn.disabled = current.status === 'success' || current.status === 'failed' || current.status === 'stopped';
      } else {
        currentBatchId = null;
        currentEl.className = 'batch-info empty';
        currentEl.textContent = 'Нет активной партии';
        stopBtn.disabled = true;
      }

      // Последняя партия
      if (last) {
        lastEl.className = 'batch-info';
        lastEl.innerHTML = renderBatchInfo(last, false);
      } else {
        lastEl.className = 'batch-info empty';
        lastEl.textContent = 'Нет завершенных партий';
      }
    }

    // Рендер информации о партии
    function renderBatchInfo(batch, isCurrent) {
      const statusClass = \`status-\${batch.status}\`;
      const statusLabel = getStatusLabel(batch.status);
      const progress = batch.topicsPlanned > 0 
        ? Math.round((batch.topicsDone / batch.topicsPlanned) * 100) 
        : 0;

      let html = \`
        <div class="info-row">
          <span class="info-label">ID:</span>
          <span class="info-value">\${batch.id}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Статус:</span>
          <span class="status-badge \${statusClass}">\${statusLabel}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Фаза:</span>
          <span class="info-value">\${batch.phase || 'auto'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Длина:</span>
          <span class="info-value">\${batch.length || 'auto'}</span>
        </div>
      \`;

      if (isCurrent && batch.status === 'running') {
        html += \`
          <div class="info-row">
            <span class="info-label">Прогресс:</span>
            <span class="info-value">\${batch.topicsDone} / \${batch.topicsPlanned}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: \${progress}%"></div>
          </div>
        \`;
      }

      if (batch.topicsDone > 0 || batch.fatalErrors > 0) {
        html += \`
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">\${batch.topicsDone || 0}</div>
              <div class="stat-label">Обработано</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">\${batch.htmlGenerated || 0}</div>
              <div class="stat-label">HTML создано</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">\${batch.fatalErrors || 0}</div>
              <div class="stat-label">Ошибки</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">\${batch.majorWarnings || 0}</div>
              <div class="stat-label">Предупреждения</div>
            </div>
          </div>
        \`;
      }

      if (batch.startedAt) {
        html += \`
          <div class="info-row">
            <span class="info-label">Запущена:</span>
            <span class="info-value timestamp">\${formatDate(batch.startedAt)}</span>
          </div>
        \`;
      }

      if (batch.finishedAt) {
        html += \`
          <div class="info-row">
            <span class="info-label">Завершена:</span>
            <span class="info-value timestamp">\${formatDate(batch.finishedAt)}</span>
          </div>
        \`;
      }

      if (batch.notes) {
        html += \`<div class="notes">\${batch.notes}</div>\`;
      }

      return html;
    }

    // Получение метки статуса
    function getStatusLabel(status) {
      const labels = {
        queued: 'В очереди',
        running: 'Выполняется',
        success: 'Успешно',
        failed: 'Ошибка',
        stopped: 'Остановлена'
      };
      return labels[status] || status;
    }

    // Форматирование даты
    function formatDate(isoString) {
      if (!isoString) return '-';
      const date = new Date(isoString);
      return date.toLocaleString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    }

    // Запуск партии
    async function handleStart(e) {
      e.preventDefault();
      
      const phase = document.getElementById('phase').value;
      const length = document.getElementById('length').value;
      const btn = document.getElementById('start-btn');
      
      btn.disabled = true;
      btn.innerHTML = '<span class="loading"></span> Запуск...';

      try {
        const response = await fetch(API_BASE + '/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phase, length })
        });

        const data = await response.json();

        if (data.success) {
          showAlert('success', 'Партия успешно запущена! ID: ' + data.id);
          updateStatus();
        } else {
          showAlert('error', 'Ошибка запуска: ' + (data.error || data.message || 'Неизвестная ошибка'));
        }
      } catch (err) {
        showAlert('error', 'Ошибка подключения: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = '🚀 Запустить партию';
      }
    }

    // Остановка партии
    async function handleStop() {
      if (!currentBatchId) return;

      const btn = document.getElementById('stop-btn');
      btn.disabled = true;
      btn.innerHTML = '<span class="loading"></span> Остановка...';

      try {
        const response = await fetch(API_BASE + '/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: currentBatchId })
        });

        const data = await response.json();

        if (data.success) {
          showAlert('success', 'Запрос на остановку отправлен');
          updateStatus();
        } else {
          showAlert('error', 'Ошибка остановки: ' + (data.error || 'Неизвестная ошибка'));
        }
      } catch (err) {
        showAlert('error', 'Ошибка подключения: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = '🛑 Остановить партию';
      }
    }

    // Показ алерта
    function showAlert(type, message) {
      const alertsEl = document.getElementById('alerts');
      const alert = document.createElement('div');
      alert.className = \`alert alert-\${type}\`;
      alert.textContent = message;
      alertsEl.appendChild(alert);

      setTimeout(() => {
        alert.remove();
      }, 5000);
    }

    // Автообновление статуса
    function startStatusPolling() {
      statusInterval = setInterval(updateStatus, 5000); // Каждые 5 секунд
    }

    // Остановка автообновления при уходе со страницы
    window.addEventListener('beforeunload', () => {
      if (statusInterval) {
        clearInterval(statusInterval);
      }
    });
  </script>
</body>
</html>`;

module.exports = async (req, res) => {
  try {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(DASHBOARD_HTML);
  } catch (err) {
    console.error('[Monster Dashboard] Error:', err);
    return res.status(500).send('Internal Server Error');
  }
};
