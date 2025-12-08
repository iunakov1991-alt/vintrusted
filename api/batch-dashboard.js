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
      max-width: 1400px;
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

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    }

    .btn-danger {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: white;
    }

    .btn-danger:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    .btn-group {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .status-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 20px;
    }

    .status-item {
      background: #252d3f;
      padding: 16px;
      border-radius: 8px;
      border: 1px solid #2d3748;
    }

    .status-item .label {
      font-size: 0.85rem;
      color: #9ca3af;
      margin-bottom: 8px;
    }

    .status-item .value {
      font-size: 1.5rem;
      font-weight: 700;
      color: #3b82f6;
    }

    .status-item .value.success {
      color: #10b981;
    }

    .status-item .value.warning {
      color: #f59e0b;
    }

    .status-item .value.error {
      color: #ef4444;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.85rem;
      font-weight: 600;
    }

    .status-badge.queued {
      background: rgba(59, 130, 246, 0.2);
      color: #3b82f6;
    }

    .status-badge.running {
      background: rgba(245, 158, 11, 0.2);
      color: #f59e0b;
    }

    .status-badge.success {
      background: rgba(16, 185, 129, 0.2);
      color: #10b981;
    }

    .status-badge.failed {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }

    .status-badge.stopped {
      background: rgba(107, 114, 128, 0.2);
      color: #9ca3af;
    }

    .batch-info {
      background: #252d3f;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 16px;
      border-left: 4px solid #3b82f6;
    }

    .batch-info.empty {
      border-left-color: #6b7280;
      color: #9ca3af;
      text-align: center;
      padding: 32px;
    }

    .batch-info h3 {
      font-size: 1.1rem;
      margin-bottom: 12px;
      color: #e4e7eb;
    }

    .batch-info .meta {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 12px;
      font-size: 0.9rem;
      color: #9ca3af;
    }

    .batch-info .meta-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .batch-info .meta-label {
      font-size: 0.8rem;
      color: #6b7280;
    }

    .batch-info .meta-value {
      color: #e4e7eb;
      font-weight: 500;
    }

    .progress-bar {
      background: #252d3f;
      border-radius: 8px;
      height: 32px;
      overflow: hidden;
      margin: 16px 0;
      position: relative;
    }

    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #3b82f6 0%, #6366f1 100%);
      transition: width 0.3s ease;
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

    .notes {
      margin-top: 12px;
      padding: 12px;
      background: #0a0e27;
      border-radius: 6px;
      font-size: 0.85rem;
      color: #9ca3af;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 MONSTER 8.0 Batch Runner</h1>
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

      <div class="btn-group">
        <button class="btn btn-primary" id="start-btn" onclick="startBatch()">
          🚀 Запустить партию
        </button>
        <button class="btn btn-danger" id="stop-btn" onclick="stopBatch()" disabled>
          ⏹ Остановить партию
        </button>
      </div>
    </div>

    <div class="card">
      <h2>📊 Текущая партия</h2>
      <div id="current-batch" class="batch-info empty">
        Нет активной партии
      </div>
    </div>

    <div class="card">
      <h2>📋 Последняя партия</h2>
      <div id="last-batch" class="batch-info empty">
        Нет завершенных партий
      </div>
    </div>
  </div>

  <script>
    const API_BASE = '/api/batch-runner';
    const STATUS_API = '/api/batch-status';
    let statusInterval = null;
    
    document.addEventListener('DOMContentLoaded', () => {
      updateStatus();
      startStatusPolling();
    });

    async function updateStatus() {
      try {
        const response = await fetch(STATUS_API);
        const data = await response.json();
        
        if (data.success) {
          updateUI(data.current, data.last);
        }
      } catch (err) {
        console.error('Ошибка обновления статуса:', err);
        showAlert('error', \`Ошибка: \${err.message}\`);
      }
    }

    function updateUI(current, last) {
      // Текущая партия
      const currentEl = document.getElementById('current-batch');
      if (current) {
        const progress = current.topicsPlanned > 0 
          ? Math.round((current.topicsDone / current.topicsPlanned) * 100) 
          : 0;
        
        currentEl.className = 'batch-info';
        currentEl.innerHTML = \`
          <h3>
            <span class="status-badge \${current.status}">\${getStatusLabel(current.status)}</span>
            <span style="margin-left: 12px; font-size: 0.9rem; color: #9ca3af;">ID: \${current.id}</span>
          </h3>
          <div class="meta">
            <div class="meta-item">
              <span class="meta-label">Фаза</span>
              <span class="meta-value">\${current.phase}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Длина</span>
              <span class="meta-value">\${current.length}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Запущено</span>
              <span class="meta-value">\${formatDate(current.startedAt)}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Обновлено</span>
              <span class="meta-value">\${formatDate(current.updatedAt)}</span>
            </div>
          </div>
          <div class="status-grid">
            <div class="status-item">
              <div class="label">Запланировано</div>
              <div class="value">\${current.topicsPlanned || 0}</div>
            </div>
            <div class="status-item">
              <div class="label">Выполнено</div>
              <div class="value success">\${current.topicsDone || 0}</div>
            </div>
            <div class="status-item">
              <div class="label">HTML сгенерировано</div>
              <div class="value success">\${current.htmlGenerated || 0}</div>
            </div>
            <div class="status-item">
              <div class="label">Фатальных ошибок</div>
              <div class="value \${current.fatalErrors > 0 ? 'error' : ''}">\${current.fatalErrors || 0}</div>
            </div>
            <div class="status-item">
              <div class="label">Предупреждений</div>
              <div class="value \${current.majorWarnings > 0 ? 'warning' : ''}">\${current.majorWarnings || 0}</div>
            </div>
            <div class="status-item">
              <div class="label">LLM вызовов</div>
              <div class="value">\${current.llmCalls || 0}</div>
            </div>
            <div class="status-item">
              <div class="label">Средняя задержка</div>
              <div class="value">\${current.avgLatencyMs || 0}ms</div>
            </div>
            <div class="status-item">
              <div class="label">Самолечение</div>
              <div class="value \${current.selfHealRuns > 0 ? 'warning' : ''}">\${current.selfHealRuns || 0}</div>
            </div>
          </div>
          <div class="progress-bar">
            <div class="progress-bar-fill \${current.status === 'running' ? 'running' : ''}" style="width: \${progress}%">
              \${progress}%
            </div>
          </div>
          \${current.notes ? \`<div class="notes">\${current.notes}</div>\` : ''}
          \${current.stopRequested ? '<div class="notes" style="color: #f59e0b;">⏹ Остановка запрошена...</div>' : ''}
        \`;
        
        // Кнопка остановки
        const stopBtn = document.getElementById('stop-btn');
        if (current.status === 'running' || current.status === 'queued') {
          stopBtn.disabled = false;
        } else {
          stopBtn.disabled = true;
        }
      } else {
        currentEl.className = 'batch-info empty';
        currentEl.textContent = 'Нет активной партии';
        document.getElementById('stop-btn').disabled = true;
      }

      // Последняя партия
      const lastEl = document.getElementById('last-batch');
      if (last) {
        lastEl.className = 'batch-info';
        lastEl.innerHTML = \`
          <h3>
            <span class="status-badge \${last.status}">\${getStatusLabel(last.status)}</span>
            <span style="margin-left: 12px; font-size: 0.9rem; color: #9ca3af;">ID: \${last.id}</span>
          </h3>
          <div class="meta">
            <div class="meta-item">
              <span class="meta-label">Фаза</span>
              <span class="meta-value">\${last.phase}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Завершено</span>
              <span class="meta-value">\${formatDate(last.finishedAt || last.updatedAt)}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Выполнено</span>
              <span class="meta-value">\${last.topicsDone || 0} / \${last.topicsPlanned || 0}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Ошибок</span>
              <span class="meta-value">\${last.fatalErrors || 0}</span>
            </div>
          </div>
        \`;
      } else {
        lastEl.className = 'batch-info empty';
        lastEl.textContent = 'Нет завершенных партий';
      }
    }

    function getStatusLabel(status) {
      const labels = {
        queued: '⏳ В очереди',
        running: '🟢 Выполняется',
        success: '✅ Успешно',
        failed: '❌ Ошибка',
        stopped: '⏹ Остановлена'
      };
      return labels[status] || status;
    }

    function formatDate(isoString) {
      if (!isoString) return '-';
      try {
        const date = new Date(isoString);
        return date.toLocaleString('ru-RU', { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit', 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      } catch (e) {
        return isoString;
      }
    }

    async function startBatch() {
      const btn = document.getElementById('start-btn');
      btn.disabled = true;
      btn.textContent = '⏳ Запуск...';

      const phase = document.getElementById('phase-select').value;
      const length = document.getElementById('length-select').value;

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
          showAlert('success', data.message || 'Партия запущена');
          updateStatus();
        } else {
          showAlert('error', data.error || 'Не удалось запустить партию');
        }
      } catch (err) {
        showAlert('error', \`Ошибка: \${err.message}\`);
      } finally {
        btn.disabled = false;
        btn.textContent = '🚀 Запустить партию';
      }
    }

    async function stopBatch() {
      const btn = document.getElementById('stop-btn');
      btn.disabled = true;
      btn.textContent = '⏳ Остановка...';

      try {
        const response = await fetch(\`\${API_BASE}/stop\`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();

        if (data.success) {
          showAlert('success', data.message || 'Запрос на остановку отправлен');
          updateStatus();
        } else {
          showAlert('error', data.error || 'Не удалось остановить партию');
        }
      } catch (err) {
        showAlert('error', \`Ошибка: \${err.message}\`);
      } finally {
        btn.disabled = false;
        btn.textContent = '⏹ Остановить партию';
      }
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
      statusInterval = setInterval(updateStatus, 10000); // Каждые 10 секунд
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
