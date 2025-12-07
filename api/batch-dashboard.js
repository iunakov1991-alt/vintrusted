/**
 * API endpoint для batch-dashboard
 * Отдает HTML страницу дашборда (встроенный HTML)
 */

// Встроенный HTML дашборда
const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MONSTER 8.0 - Batch Runner</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #0a0e27 0%, #1a2332 100%);
      color: #e4e7eb;
      min-height: 100vh;
      padding: 20px;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .header {
      text-align: center;
      margin-bottom: 40px;
    }

    .header h1 {
      font-size: 2.5rem;
      background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 10px;
    }

    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 0.9rem;
      background: rgba(59, 130, 246, 0.2);
      border: 1px solid rgba(59, 130, 246, 0.5);
    }

    .status-badge.connected {
      background: rgba(16, 185, 129, 0.2);
      border-color: rgba(16, 185, 129, 0.5);
      color: #10b981;
    }

    .card {
      background: #1a2332;
      border: 1px solid #2d3748;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .card h2 {
      font-size: 1.5rem;
      margin-bottom: 20px;
      color: #e4e7eb;
    }

    .controls {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .control-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .control-group label {
      font-size: 0.9rem;
      color: #9ca3af;
    }

    .control-group select {
      padding: 10px;
      background: #252d3f;
      border: 1px solid #2d3748;
      border-radius: 8px;
      color: #e4e7eb;
      font-size: 1rem;
    }

    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-primary {
      background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
      color: white;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    .progress-section {
      margin-top: 24px;
    }

    .progress-info {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
      margin-bottom: 20px;
    }

    .progress-item {
      text-align: center;
    }

    .progress-item .label {
      font-size: 0.9rem;
      color: #9ca3af;
      margin-bottom: 8px;
    }

    .progress-item .value {
      font-size: 2rem;
      font-weight: 700;
      color: #3b82f6;
    }

    .progress-item .value.success {
      color: #10b981;
    }

    .progress-item .value.warning {
      color: #f59e0b;
    }

    .progress-bar-container {
      background: #252d3f;
      border-radius: 8px;
      height: 32px;
      overflow: hidden;
      margin-bottom: 12px;
      position: relative;
    }

    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #3b82f6 0%, #6366f1 100%);
      transition: width 0.3s ease;
      width: 0%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 0.9rem;
    }

    .progress-bar-fill.running::after {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
      animation: shimmer 2s infinite;
    }

    @keyframes shimmer {
      0% { left: -100%; }
      100% { left: 100%; }
    }

    .progress-text {
      text-align: center;
      color: #9ca3af;
      font-size: 0.9rem;
    }

    .logs {
      max-height: 400px;
      overflow-y: auto;
      background: #0a0e27;
      border-radius: 8px;
      padding: 16px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 0.85rem;
    }

    .log-entry {
      margin-bottom: 8px;
      padding: 4px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .log-entry:last-child {
      border-bottom: none;
    }

    .log-time {
      color: #6b7280;
      margin-right: 8px;
    }

    .log-info {
      color: #3b82f6;
    }

    .log-success {
      color: #10b981;
    }

    .log-error {
      color: #ef4444;
    }

    .alert {
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      display: none;
    }

    .alert.show {
      display: block;
    }

    .alert-success {
      background: rgba(16, 185, 129, 0.2);
      border: 1px solid rgba(16, 185, 129, 0.5);
      color: #10b981;
    }

    .alert-error {
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.5);
      color: #ef4444;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 MONSTER 8.0 Batch Runner</h1>
      <div class="status-badge" id="connection-status">Подключение...</div>
    </div>

    <div class="alert alert-success" id="alert-success"></div>
    <div class="alert alert-error" id="alert-error"></div>

    <div class="card">
      <h2>⚙️ Управление партиями</h2>
      
      <div class="controls">
        <div class="control-group">
          <label>Фаза языка:</label>
          <select id="phase-select">
            <option value="auto">Авто</option>
            <option value="en_only">Только EN</option>
            <option value="mixed">Смешанная</option>
            <option value="es_focus">Фокус на ES</option>
          </select>
        </div>
        
        <div class="control-group">
          <label>Режим длины:</label>
          <select id="length-select">
            <option value="auto">Авто</option>
            <option value="short">Короткие</option>
            <option value="long">Длинные</option>
          </select>
        </div>
      </div>

      <button class="btn btn-primary" id="start-btn" onclick="startBatch()">
        🚀 Запустить партию
      </button>
    </div>

    <div class="card">
      <h2>📊 Прогресс партии</h2>
      
      <div class="progress-section">
        <div class="progress-info">
          <div class="progress-item">
            <div class="label">Статус</div>
            <div class="value" id="status-value">-</div>
          </div>
          <div class="progress-item">
            <div class="label">Текущая</div>
            <div class="value" id="current-value">0</div>
          </div>
          <div class="progress-item">
            <div class="label">Завершено</div>
            <div class="value success" id="completed-value">0</div>
          </div>
          <div class="progress-item">
            <div class="label">Ошибок</div>
            <div class="value warning" id="failed-value">0</div>
          </div>
        </div>

        <div class="progress-bar-container">
          <div class="progress-bar-fill" id="progress-bar"></div>
        </div>
        <div class="progress-text" id="progress-text">Партия не запущена</div>
      </div>
    </div>

    <div class="card">
      <h2>📋 Логи</h2>
      <div class="logs" id="logs-container"></div>
    </div>
  </div>

  <script>
    const API_BASE = '/api/batch-runner';
    const STATUS_API = '/api/batch-status';
    let statusInterval = null;
    
    document.addEventListener('DOMContentLoaded', () => {
      addLog('info', 'Дашборд загружен');
      updateStatus();
      startStatusPolling();
    });

    async function updateStatus() {
      try {
        const response = await fetch(STATUS_API);
        const data = await response.json();
        
        if (data.success) {
          const status = data.status;
          updateUI(status);
        }
      } catch (err) {
        addLog('error', \`Ошибка обновления статуса: \${err.message}\`);
      }
    }

    function updateUI(status) {
      const statusValue = document.getElementById('status-value');
      if (status.inProgress) {
        statusValue.textContent = '🟢 Выполняется';
        statusValue.className = 'value success';
      } else if (status.total > 0 && status.completed === status.total) {
        statusValue.textContent = '✅ Завершена';
        statusValue.className = 'value success';
      } else if (status.total > 0) {
        statusValue.textContent = '⏸ Остановлена';
        statusValue.className = 'value warning';
      } else {
        statusValue.textContent = '⏳ Ожидает';
        statusValue.className = 'value';
      }

      document.getElementById('current-value').textContent = status.current || 0;
      document.getElementById('completed-value').textContent = status.completed || 0;
      document.getElementById('failed-value').textContent = status.failed || 0;

      const progress = status.total > 0 ? Math.round((status.completed / status.total) * 100) : 0;
      const progressBar = document.getElementById('progress-bar');
      progressBar.style.width = \`\${progress}%\`;
      
      if (status.inProgress) {
        progressBar.classList.add('running');
      } else {
        progressBar.classList.remove('running');
      }

      const progressText = document.getElementById('progress-text');
      if (status.total > 0) {
        progressText.textContent = \`\${status.completed} / \${status.total} (\${progress}%)\`;
      } else {
        progressText.textContent = 'Партия не запущена';
      }

      document.getElementById('connection-status').textContent = '✅ Подключено';
      document.getElementById('connection-status').classList.add('connected');
    }

    async function startBatch() {
      const btn = document.getElementById('start-btn');
      btn.disabled = true;
      btn.textContent = '⏳ Запуск...';

      const phase = document.getElementById('phase-select').value;
      const length = document.getElementById('length-select').value;

      addLog('info', \`Запуск партии: phase=\${phase}, length=\${length}\`);

      try {
        const response = await fetch(\`\${API_BASE}/start\`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            phase: phase,
            length: length
          })
        });

        const data = await response.json();

        if (data.success) {
          addLog('success', data.message);
          showAlert('success', data.message);
          updateStatus();
        } else {
          addLog('error', data.error || 'Не удалось запустить партию');
          showAlert('error', data.error || 'Не удалось запустить партию');
        }
      } catch (err) {
        addLog('error', \`Ошибка: \${err.message}\`);
        showAlert('error', \`Ошибка: \${err.message}\`);
      } finally {
        btn.disabled = false;
        btn.textContent = '🚀 Запустить партию';
      }
    }

    function addLog(type, message) {
      const logsContainer = document.getElementById('logs-container');
      const logEntry = document.createElement('div');
      logEntry.className = \`log-entry log-\${type}\`;
      
      const time = new Date().toLocaleTimeString();
      logEntry.innerHTML = \`<span class="log-time">[\${time}]</span><span class="log-\${type}">\${message}</span>\`;
      
      logsContainer.appendChild(logEntry);
      logsContainer.scrollTop = logsContainer.scrollHeight;
    }

    function showAlert(type, message) {
      const alert = document.getElementById(\`alert-\${type}\`);
      alert.textContent = message;
      alert.classList.add('show');
      
      setTimeout(() => {
        alert.classList.remove('show');
      }, 5000);
    }

    function startStatusPolling() {
      if (statusInterval) clearInterval(statusInterval);
      statusInterval = setInterval(updateStatus, 3000);
    }
  </script>
</body>
</html>`;

module.exports = async (req, res) => {
  try {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(DASHBOARD_HTML);
  } catch (err) {
    console.error('[Batch Dashboard] Error:', err);
    return res.status(500).json({
      error: err.message
    });
  }
};
