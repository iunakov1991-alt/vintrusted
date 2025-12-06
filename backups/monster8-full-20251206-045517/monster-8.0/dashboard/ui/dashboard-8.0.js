/**
 * MONSTER 8.0 Dashboard - Frontend
 */

const API_BASE = '';
const socket = io();

let strategyChart = null;
let pagesChart = null;
let logs = [];

// ============================================================
// КЭШИРОВАНИЕ API
// ============================================================

const apiCache = {
  data: {},
  timestamps: {},
  ttl: {
    status: 5000,      // 5 секунд
    pages: 5000,       // 5 секунд
    bpg: 10000,        // 10 секунд
    strategy: 30000,   // 30 секунд
    orchestrator: 5000  // 5 секунд
  }
};

function getCached(key) {
  const cached = apiCache.data[key];
  const timestamp = apiCache.timestamps[key];
  const ttl = apiCache.ttl[key] || 5000;
  
  if (cached && timestamp && (Date.now() - timestamp) < ttl) {
    return cached;
  }
  return null;
}

function setCached(key, data) {
  apiCache.data[key] = data;
  apiCache.timestamps[key] = Date.now();
}

// ============================================================
// УМНЫЕ ОБНОВЛЕНИЯ
// ============================================================

let lastStatus = null;
let updateIntervals = {
  pages: null,
  bpg: null,
  strategy: null,
  orchestrator: null
};

function hasChanged(newData, oldData) {
  if (!oldData) return true;
  
  // Сравниваем только важные поля
  return (
    newData.pages?.en !== oldData.pages?.en ||
    newData.pages?.es !== oldData.pages?.es ||
    newData.bpg?.blocks !== oldData.bpg?.blocks ||
    newData.bpg?.ready !== oldData.bpg?.ready ||
    newData.orchestrator?.isRunning !== oldData.orchestrator?.isRunning ||
    newData.strategy?.languagePhase !== oldData.strategy?.languagePhase ||
    newData.strategy?.lengthMode !== oldData.strategy?.lengthMode
  );
}

// ============================================================
// ИНДИКАТОРЫ ЗАГРУЗКИ
// ============================================================

function showLoading(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.classList.add('loading');
    element.style.opacity = '0.6';
  }
}

function hideLoading(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.classList.remove('loading');
    element.style.opacity = '1';
  }
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showError(message) {
  showToast(message, 'error');
}

function showSuccess(message) {
  showToast(message, 'success');
}

function showInfo(message) {
  showToast(message, 'info');
}

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('[Dashboard] DOM loaded, initializing...');
  
  // Загружаем данные из localStorage для офлайн режима
  loadOfflineData();
  
  // Инициализируем контролы ПЕРВЫМИ (чтобы кнопки работали сразу)
  try {
    initializeControls();
    console.log('[Dashboard] Controls initialized');
  } catch (err) {
    console.error('[Dashboard] Error initializing controls:', err);
  }
  
  initializeCharts();
  initializeSocket();
  loadInitialData();
  startAutoRefresh();
  
  // Регистрируем Service Worker для офлайн режима
  registerServiceWorker();
  
  console.log('[Dashboard] Initialization complete');
});

// ============================================================
// CHARTS
// ============================================================

function initializeCharts() {
  // Strategy Chart
  const strategyCtx = document.getElementById('strategy-chart').getContext('2d');
  strategyChart = new Chart(strategyCtx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'EN Страниц',
        data: [],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4
      }, {
        label: 'ES Страниц',
        data: [],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#e4e7eb' } }
      },
      scales: {
        x: { ticks: { color: '#9ca3af' }, grid: { color: '#2d3748' } },
        y: { ticks: { color: '#9ca3af' }, grid: { color: '#2d3748' } }
      }
    }
  });

  // Pages Chart
  const pagesCtx = document.getElementById('pages-chart').getContext('2d');
  pagesChart = new Chart(pagesCtx, {
    type: 'doughnut',
    data: {
      labels: ['English', 'Spanish'],
      datasets: [{
        data: [0, 0],
        backgroundColor: ['#3b82f6', '#10b981']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#e4e7eb' } }
      }
    }
  });
}

// ============================================================
// SOCKET.IO
// ============================================================

function initializeSocket() {
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 10;
  
  socket.on('connect', () => {
    updateStatus('connected', 'Подключено');
    reconnectAttempts = 0;
    showSuccess('Подключено к серверу');
    console.log('[Socket] Connected');
    // При подключении загружаем свежие данные
    loadStatus(true);
    loadOrchestratorStatus(true);
  });

  socket.on('disconnect', () => {
    updateStatus('disconnected', 'Отключено');
    console.log('[Socket] Disconnected');
    showError('Соединение потеряно. Переподключение...');
    
    // Автоматическое переподключение с exponential backoff
    if (reconnectAttempts < maxReconnectAttempts) {
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
      reconnectAttempts++;
      setTimeout(() => {
        console.log(`[Socket] Reconnecting (attempt ${reconnectAttempts})...`);
        socket.connect();
      }, delay);
    } else {
      showError('Не удалось переподключиться. Обновите страницу.');
    }
  });

  socket.on('connect_error', (err) => {
    console.error('[Socket] Connection error:', err);
    updateStatus('disconnected', 'Ошибка подключения');
  });

  socket.on('status:update', (data) => {
    // WebSocket события всегда актуальны - обновляем напрямую
    // Инвалидируем кэш и обновляем UI
    setCached('status', data);
    updateDashboard(data);
    lastStatus = data;
  });

  socket.on('log', (data) => {
    addLog(data.type, data.message);
  });

  socket.on('orchestrator:stopped', (data) => {
    updateOrchestratorStatus(false, null);
    addLog('info', 'Оркестратор остановлен');
    showInfo('Оркестратор остановлен');
    // Инвалидируем кэш
    apiCache.timestamps['orchestrator'] = 0;
    apiCache.timestamps['status'] = 0;
  });
}

// ============================================================
// CONTROLS
// ============================================================

function initializeControls() {
  console.log('[Dashboard] Initializing controls...');
  
  // Проверяем наличие элементов перед добавлением обработчиков
  const btnStart = document.getElementById('btn-start');
  const btnStop = document.getElementById('btn-stop');
  const btnStartBatch = document.getElementById('btn-start-batch');
  const btnClearLogs = document.getElementById('btn-clear-logs');
  const logFilter = document.getElementById('log-filter');
  const btnSubmitIdea = document.getElementById('btn-submit-idea');
  const btnRefreshHistory = document.getElementById('btn-refresh-history');
  const historyLimit = document.getElementById('history-limit');
  const modalClose = document.getElementById('modal-close');
  const btnCancelBatch = document.getElementById('btn-cancel-batch');
  const btnConfirmBatch = document.getElementById('btn-confirm-batch');
  
  if (!btnStart || !btnStop) {
    console.error('[Dashboard] Critical buttons not found!');
    return;
  }
  
  // Основные кнопки оркестратора
  btnStart.addEventListener('click', (e) => {
    console.log('[Dashboard] Start button clicked');
    e.preventDefault();
    startOrchestrator();
  });
  
  btnStop.addEventListener('click', (e) => {
    console.log('[Dashboard] Stop button clicked');
    e.preventDefault();
    stopOrchestrator();
  });
  
  // Кнопка запуска партии
  if (btnStartBatch) {
    btnStartBatch.addEventListener('click', (e) => {
      console.log('[Dashboard] Start batch button clicked');
      e.preventDefault();
      showBatchPreview();
    });
  }
  
  // Логи
  if (btnClearLogs) {
    btnClearLogs.addEventListener('click', (e) => {
      e.preventDefault();
      clearLogs();
    });
  }
  
  if (logFilter) {
    logFilter.addEventListener('change', filterLogs);
  }
  
  // Идеи для обучения
  if (btnSubmitIdea) {
    btnSubmitIdea.addEventListener('click', (e) => {
      e.preventDefault();
      submitLearningIdea();
    });
  }
  
  // История партий
  if (btnRefreshHistory) {
    btnRefreshHistory.addEventListener('click', (e) => {
      e.preventDefault();
      loadBatchHistory();
    });
  }
  
  if (historyLimit) {
    historyLimit.addEventListener('change', loadBatchHistory);
  }
  
  // Модальное окно превью
  if (modalClose) {
    modalClose.addEventListener('click', (e) => {
      e.preventDefault();
      closeBatchPreview();
    });
  }
  
  if (btnCancelBatch) {
    btnCancelBatch.addEventListener('click', (e) => {
      e.preventDefault();
      closeBatchPreview();
    });
  }
  
  if (btnConfirmBatch) {
    btnConfirmBatch.addEventListener('click', (e) => {
      e.preventDefault();
      confirmBatchStart();
    });
  }
  
  console.log('[Dashboard] All controls initialized successfully');
}

async function startOrchestrator() {
  console.log('[Dashboard] startOrchestrator called');
  try {
    const btn = document.getElementById('btn-start');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Запуск...';
    }
    
    console.log('[Dashboard] Sending request to /api/orchestrator/start');
    const response = await fetch(`${API_BASE}/api/orchestrator/start`, { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('[Dashboard] Response status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Dashboard] Response error:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('[Dashboard] Response data:', data);
    
    if (data.success) {
      addLog('info', 'Оркестратор запущен');
      updateOrchestratorStatus(true, data.pid);
      showSuccess('Оркестратор успешно запущен');
      // Инвалидируем кэш
      apiCache.timestamps['orchestrator'] = 0;
      apiCache.timestamps['status'] = 0;
    } else {
      throw new Error(data.message || 'Не удалось запустить оркестратор');
    }
  } catch (err) {
    console.error('[Dashboard] Error in startOrchestrator:', err);
    addLog('error', `Ошибка запуска оркестратора: ${err.message}`);
    showError(`Не удалось запустить оркестратор: ${err.message}`);
  } finally {
    const btn = document.getElementById('btn-start');
    if (btn) {
      btn.disabled = false;
      btn.textContent = '▶ Запустить';
    }
  }
}

async function stopOrchestrator() {
  console.log('[Dashboard] stopOrchestrator called');
  try {
    const btn = document.getElementById('btn-stop');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Остановка...';
    }
    
    console.log('[Dashboard] Sending request to /api/orchestrator/stop');
    const response = await fetch(`${API_BASE}/api/orchestrator/stop`, { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('[Dashboard] Response status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Dashboard] Response error:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('[Dashboard] Response data:', data);
    
    if (data.success) {
      addLog('info', 'Оркестратор остановлен');
      updateOrchestratorStatus(false, null);
      showSuccess('Оркестратор успешно остановлен');
      // Инвалидируем кэш
      apiCache.timestamps['orchestrator'] = 0;
      apiCache.timestamps['status'] = 0;
    } else {
      throw new Error(data.message || 'Не удалось остановить оркестратор');
    }
  } catch (err) {
    console.error('[Dashboard] Error in stopOrchestrator:', err);
    addLog('error', `Ошибка остановки оркестратора: ${err.message}`);
    showError(`Не удалось остановить оркестратор: ${err.message}`);
  } finally {
    const btn = document.getElementById('btn-stop');
    if (btn) {
      btn.disabled = false;
      btn.textContent = '⏹ Остановить';
    }
  }
}

async function submitLearningIdea() {
  const input = document.getElementById('learning-input');
  const priority = document.getElementById('learning-priority').value;
  const idea = input.value.trim();
  
  if (!idea) {
    showError('Пожалуйста, введите идею');
    return;
  }

  try {
    showLoading('btn-submit-idea');
    const response = await fetch(`${API_BASE}/api/learning-ideas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idea, priority })
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    if (data.success) {
      input.value = '';
      addLog('info', 'Идея для обучения отправлена');
      showSuccess('Идея успешно отправлена');
      loadLearningIdeas();
    } else {
      throw new Error(data.error || 'Не удалось отправить идею');
    }
  } catch (err) {
    addLog('error', `Ошибка отправки идеи: ${err.message}`);
    showError(`Не удалось отправить идею: ${err.message}`);
  } finally {
    hideLoading('btn-submit-idea');
  }
}

// ============================================================
// DATA LOADING
// ============================================================

async function loadInitialData() {
  await Promise.all([
    loadStatus(),
    loadOrchestratorStatus(),
    loadLogs(),
    loadLearningIdeas(),
    loadBatchSchedule(),
    loadBatchHistory()
  ]);
}

async function loadStatus(force = false) {
  // Проверяем кэш
  if (!force) {
    const cached = getCached('status');
    if (cached) {
      if (hasChanged(cached, lastStatus)) {
        updateDashboard(cached);
        lastStatus = cached;
      }
      return cached;
    }
  }
  
  try {
    showLoading('status-indicator');
    const response = await fetch(`${API_BASE}/api/status`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    if (data.success) {
      setCached('status', data);
      if (hasChanged(data, lastStatus)) {
        updateDashboard(data);
        lastStatus = data;
      }
      hideLoading('status-indicator');
      return data;
    } else {
      throw new Error(data.error || 'Не удалось загрузить статус');
    }
  } catch (err) {
    hideLoading('status-indicator');
    console.error('Error loading status:', err);
    showError(`Не удалось загрузить статус: ${err.message}`);
    // Возвращаем кэш при ошибке
    const cached = getCached('status');
    if (cached) return cached;
    throw err;
  }
}

async function loadOrchestratorStatus(force = false) {
  if (!force) {
    const cached = getCached('orchestrator');
    if (cached) {
      updateOrchestratorStatus(cached.isRunning, cached.pid);
      return cached;
    }
  }
  
  try {
    const response = await fetch(`${API_BASE}/api/orchestrator/status`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    if (data.success) {
      setCached('orchestrator', data);
      updateOrchestratorStatus(data.isRunning, data.pid);
      return data;
    } else {
      throw new Error(data.error || 'Не удалось загрузить статус оркестратора');
    }
  } catch (err) {
    console.error('Error loading orchestrator status:', err);
    // Возвращаем кэш при ошибке
    const cached = getCached('orchestrator');
    if (cached) {
      updateOrchestratorStatus(cached.isRunning, cached.pid);
      return cached;
    }
    throw err;
  }
}

async function loadLogs() {
  try {
    const response = await fetch(`${API_BASE}/api/logs?lines=100`);
    const data = await response.json();
    if (data.success) {
      logs = data.logs;
      renderLogs();
    }
  } catch (err) {
    console.error('Error loading logs:', err);
  }
}

async function loadLearningIdeas() {
  try {
    const response = await fetch(`${API_BASE}/api/learning-ideas`);
    const data = await response.json();
    if (data.success) {
      renderLearningIdeas(data.ideas);
    }
  } catch (err) {
    console.error('Error loading learning ideas:', err);
  }
}

// ============================================================
// UI UPDATES
// ============================================================

function updateDashboard(data) {
  // Pages
  const enPages = data.pages?.en || 0;
  const esPages = data.pages?.es || 0;
  const totalPages = data.pages?.total || 0;
  const enDeployed = data.pages?.deployed?.en || enPages;
  const esDeployed = data.pages?.deployed?.es || esPages;
  const totalDeployed = data.pages?.deployed?.total || totalPages;
  
  document.getElementById('pages-en').textContent = enPages;
  document.getElementById('pages-es').textContent = esPages;
  document.getElementById('pages-total').textContent = totalPages;
  document.getElementById('pages-en-deployed').textContent = `Задеплоено: ${enDeployed}`;
  document.getElementById('pages-es-deployed').textContent = `Задеплоено: ${esDeployed}`;
  document.getElementById('pages-total-deployed').textContent = `Задеплоено: ${totalDeployed}`;
  
  // Pages Chart
  if (pagesChart) {
    pagesChart.data.labels = ['Английский', 'Испанский'];
    pagesChart.data.datasets[0].data = [enPages, esPages];
    pagesChart.update();
  }
  
  // Batch Progress
  if (data.batch) {
    const batch = data.batch;
    const isRunning = batch.inProgress || false;
    const current = batch.current || 0;
    const total = batch.total || 0;
    const completed = batch.completed || 0;
    const failed = batch.failed || 0;
    
    document.getElementById('batch-status').textContent = isRunning ? 'Выполняется' : 'Ожидает';
    document.getElementById('batch-current').textContent = current > 0 ? `${current} / ${total}` : '-';
    document.getElementById('batch-completed').textContent = completed;
    document.getElementById('batch-failed').textContent = failed;
    
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    document.getElementById('batch-progress-fill').style.width = `${progress}%`;
    document.getElementById('batch-progress-text').textContent = `${completed} / ${total} (${progress}%)`;
  }
  
  // Deploy Progress
  const deployProgress = totalPages > 0 ? Math.round((totalDeployed / totalPages) * 100) : 0;
  document.getElementById('deploy-created').textContent = totalPages;
  document.getElementById('deploy-deployed').textContent = totalDeployed;
  document.getElementById('deploy-pending').textContent = totalPages - totalDeployed;
  document.getElementById('deploy-progress-fill').style.width = `${deployProgress}%`;
  document.getElementById('deploy-progress-text').textContent = `${totalDeployed} / ${totalPages} (${deployProgress}%)`;
  
  // BPG
  document.getElementById('bpg-blocks').textContent = data.bpg?.blocks || 0;
  document.getElementById('bpg-ready').textContent = data.bpg?.ready ? 'Готово' : 'Подготовка';
  const bpgProgress = data.bpg?.blocks > 0 ? Math.min(100, (data.bpg.blocks / 50) * 100) : 0;
  document.getElementById('bpg-progress').style.width = `${bpgProgress}%`;
  
  // Strategy
  if (data.strategy) {
    document.getElementById('lang-phase').textContent = data.strategy.languagePhase || '-';
    document.getElementById('length-mode').textContent = data.strategy.lengthMode || '-';
    document.getElementById('en-threshold').textContent = data.strategy.enThreshold || '-';
  }
  
  // Strategy Chart - update with time series
  if (strategyChart && data.pages) {
    const now = new Date().toLocaleTimeString();
    strategyChart.data.labels.push(now);
    strategyChart.data.datasets[0].data.push(enPages);
    strategyChart.data.datasets[1].data.push(esPages);
    
    // Keep only last 20 points
    if (strategyChart.data.labels.length > 20) {
      strategyChart.data.labels.shift();
      strategyChart.data.datasets[0].data.shift();
      strategyChart.data.datasets[1].data.shift();
    }
    
    strategyChart.update('none');
  }
  
  // Schedule
  if (data.schedule?.nextBatch) {
    updateSchedule(data.schedule.nextBatch);
  }
  
  // Сохраняем в localStorage для офлайн режима
  try {
    localStorage.setItem('dashboard_last_status', JSON.stringify({
      ...data,
      timestamp: Date.now()
    }));
  } catch (err) {
    // Игнорируем ошибки localStorage
  }
}

function updateOrchestratorStatus(isRunning, pid) {
  document.getElementById('orchestrator-status').textContent = isRunning ? 'Работает' : 'Остановлен';
  document.getElementById('orchestrator-pid').textContent = pid || '-';
  
  const startBtn = document.getElementById('btn-start');
  const stopBtn = document.getElementById('btn-stop');
  
  startBtn.disabled = isRunning;
  stopBtn.disabled = !isRunning;
}

function updateStatus(status, text) {
  const indicator = document.getElementById('status-indicator');
  const statusText = document.getElementById('status-text');
  
  indicator.className = `status-indicator ${status}`;
  statusText.textContent = text;
}

function addLog(type, message) {
  const time = new Date().toLocaleTimeString();
  logs.push({ time, type, message });
  
  // Keep only last 500 logs
  if (logs.length > 500) {
    logs.shift();
  }
  
  renderLogs();
}

function renderLogs() {
  const container = document.getElementById('logs-container');
  const filter = document.getElementById('log-filter').value;
  
  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(log => log.type === filter);
  
  container.innerHTML = filteredLogs.slice(-100).map(log => {
    const typeClass = log.type === 'stderr' ? 'error' : log.type === 'stdout' ? 'info' : log.type;
    return `<div class="log-entry ${typeClass}">
      <span class="log-time">${log.time}</span>
      ${escapeHtml(log.message)}
    </div>`;
  }).join('');
  
  container.scrollTop = container.scrollHeight;
}

function clearLogs() {
  logs = [];
  renderLogs();
}

function filterLogs() {
  renderLogs();
}

function renderLearningIdeas(ideas) {
  const container = document.getElementById('learning-ideas-list');
  
  if (!ideas || ideas.length === 0) {
    container.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 1rem;">Идей пока нет</div>';
    return;
  }
  
  const priorityText = {
    'low': 'Низкий',
    'medium': 'Средний',
    'high': 'Высокий'
  };
  
  container.innerHTML = ideas.slice(0, 10).map(idea => {
    const time = new Date(idea.timestamp).toLocaleString('ru-RU');
    return `<div class="learning-idea-item priority-${idea.priority}">
      <div class="learning-idea-header">
        <span class="learning-idea-priority">${priorityText[idea.priority] || idea.priority}</span>
        <span class="learning-idea-time">${time}</span>
      </div>
      <div class="learning-idea-text">${escapeHtml(idea.idea)}</div>
    </div>`;
  }).join('');
}

// ============================================================
// UTILITIES
// ============================================================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================================
// ОФЛАЙН РЕЖИМ
// ============================================================

function loadOfflineData() {
  try {
    const cached = localStorage.getItem('dashboard_last_status');
    if (cached) {
      const data = JSON.parse(cached);
      const age = Date.now() - (data.timestamp || 0);
      // Используем кэш если он не старше 5 минут
      if (age < 5 * 60 * 1000) {
        console.log('[Dashboard] Loading cached data (offline mode)');
        updateDashboard(data);
        showInfo('Используются кэшированные данные (офлайн режим)');
      }
    }
  } catch (err) {
    console.error('[Dashboard] Error loading offline data:', err);
  }
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw-dashboard.js')
      .then(reg => {
        console.log('[Dashboard] Service Worker registered');
      })
      .catch(err => {
        console.warn('[Dashboard] Service Worker registration failed:', err);
      });
  }
}

function startAutoRefresh() {
  // Умные обновления с разными интервалами
  // Страницы и статус: каждые 5 секунд
  updateIntervals.pages = setInterval(() => {
    loadStatus(false).catch(() => {
      // При ошибке сети используем офлайн данные
      loadOfflineData();
    });
  }, 5000);
  
  // BPG: каждые 10 секунд
  updateIntervals.bpg = setInterval(async () => {
    try {
      const cached = getCached('bpg');
      if (!cached) {
        const response = await fetch(`${API_BASE}/api/bpg`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setCached('bpg', data);
            // Обновляем только если изменилось
            const lastBpg = apiCache.data['lastBpg'];
            if (!lastBpg || data.blocks !== lastBpg.blocks || data.ready !== lastBpg.ready) {
              document.getElementById('bpg-blocks').textContent = data.blocks || 0;
              document.getElementById('bpg-ready').textContent = data.ready ? 'Готово' : 'Подготовка';
              const bpgProgress = data.blocks > 0 ? Math.min(100, (data.blocks / 50) * 100) : 0;
              document.getElementById('bpg-progress').style.width = `${bpgProgress}%`;
              apiCache.data['lastBpg'] = data;
            }
          }
        }
      }
    } catch (err) {
      console.error('Error loading BPG:', err);
    }
  }, 10000);
  
  // Стратегия: каждые 30 секунд
  updateIntervals.strategy = setInterval(async () => {
    try {
      const cached = getCached('strategy');
      if (!cached) {
        const response = await fetch(`${API_BASE}/api/strategy`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setCached('strategy', data);
            // Обновляем только если изменилось
            const lastStrategy = apiCache.data['lastStrategy'];
            if (!lastStrategy || 
                data.languagePhase !== lastStrategy.languagePhase ||
                data.lengthMode !== lastStrategy.lengthMode) {
              document.getElementById('lang-phase').textContent = data.languagePhase || '-';
              document.getElementById('length-mode').textContent = data.lengthMode || '-';
              apiCache.data['lastStrategy'] = data;
            }
          }
        }
      }
    } catch (err) {
      console.error('Error loading strategy:', err);
    }
  }, 30000);
  
  // Оркестратор: каждые 5 секунд
  updateIntervals.orchestrator = setInterval(() => {
    loadOrchestratorStatus(false);
  }, 5000);
}

// Socket event for learning ideas
socket.on('learning-idea:added', () => {
  loadLearningIdeas();
});

// Socket event for batch completion
socket.on('batch:completed', (data) => {
  showSuccess(`Партия ${data.batchId} завершена. Следующая партия запланирована.`);
  loadBatchSchedule();
  loadBatchHistory();
});

// ============================================================
// BATCH SCHEDULE & PREVIEW
// ============================================================

async function loadBatchSchedule() {
  try {
    const response = await fetch(`${API_BASE}/api/batch/schedule`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    if (data.success && data.nextBatch) {
      updateSchedule(data.nextBatch);
    }
  } catch (err) {
    console.error('Error loading batch schedule:', err);
  }
}

function updateSchedule(nextBatch) {
  if (!nextBatch) {
    document.getElementById('next-batch-time').textContent = 'Нет запланированных партий';
    document.getElementById('next-batch-pages').textContent = '-';
    document.getElementById('next-batch-lang').textContent = '-';
    document.getElementById('next-batch-duration').textContent = '-';
    document.getElementById('reminder-text').textContent = '';
    return;
  }
  
  const scheduledTime = new Date(nextBatch.scheduledAt);
  const now = new Date();
  const timeUntil = scheduledTime - now;
  
  // Форматируем время
  const timeStr = scheduledTime.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  document.getElementById('next-batch-time').textContent = timeStr;
  document.getElementById('next-batch-pages').textContent = nextBatch.estimatedPages || '-';
  document.getElementById('next-batch-lang').textContent = (nextBatch.language || 'en').toUpperCase();
  document.getElementById('next-batch-duration').textContent = `${nextBatch.estimatedDuration || 0} min`;
  
  // Напоминание
  const hoursUntil = Math.floor(timeUntil / (1000 * 60 * 60));
  const minutesUntil = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60));
  
  let reminderText = '';
  if (timeUntil < 0) {
    reminderText = '⚠️ Просрочено';
  } else if (hoursUntil < 1) {
    reminderText = `⏰ Запуск через ${minutesUntil} ${minutesUntil === 1 ? 'минуту' : minutesUntil < 5 ? 'минуты' : 'минут'}`;
  } else if (hoursUntil < 24) {
    reminderText = `⏰ Запуск через ${hoursUntil} ${hoursUntil === 1 ? 'час' : hoursUntil < 5 ? 'часа' : 'часов'}`;
  } else {
    const daysUntil = Math.floor(hoursUntil / 24);
    reminderText = `📅 Запуск через ${daysUntil} ${daysUntil === 1 ? 'день' : daysUntil < 5 ? 'дня' : 'дней'}`;
  }
  
  document.getElementById('reminder-text').textContent = reminderText;
}

async function showBatchPreview() {
  console.log('[Dashboard] showBatchPreview called');
  try {
    const btn = document.getElementById('btn-start-batch');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Загрузка...';
    }
    
    console.log('[Dashboard] Sending request to /api/batch/preview');
    const response = await fetch(`${API_BASE}/api/batch/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    console.log('[Dashboard] Response status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Dashboard] Response error:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('[Dashboard] Preview data:', data);
    
    if (data.success && data.preview) {
      const preview = data.preview;
      
      const previewPages = document.getElementById('preview-pages');
      const previewLang = document.getElementById('preview-lang');
      const previewDuration = document.getElementById('preview-duration');
      const previewStates = document.getElementById('preview-states');
      const previewZones = document.getElementById('preview-zones');
      const previewFormats = document.getElementById('preview-formats');
      const previewAutoDeploy = document.getElementById('preview-auto-deploy');
      
      if (previewPages) previewPages.textContent = preview.estimatedPages;
      if (previewLang) previewLang.textContent = (preview.language || 'en').toUpperCase();
      if (previewDuration) previewDuration.textContent = `${preview.estimatedDuration} минут`;
      if (previewStates) previewStates.textContent = preview.topics?.states?.join(', ') || '-';
      if (previewZones) previewZones.textContent = preview.topics?.zones?.join(', ') || '-';
      if (previewFormats) previewFormats.textContent = preview.topics?.formats?.join(', ') || '-';
      if (previewAutoDeploy) previewAutoDeploy.textContent = preview.autoDeploy ? 'Да' : 'Нет';
      
      // Сохраняем превью для подтверждения
      window.currentBatchPreview = preview;
      
      // Показываем модальное окно
      const modal = document.getElementById('batch-preview-modal');
      if (modal) {
        modal.style.display = 'flex';
        console.log('[Dashboard] Preview modal shown');
      } else {
        console.error('[Dashboard] Modal not found!');
      }
    } else {
      throw new Error(data.error || 'Не удалось получить превью');
    }
  } catch (err) {
    console.error('[Dashboard] Error in showBatchPreview:', err);
    showError(`Не удалось создать превью: ${err.message}`);
  } finally {
    const btn = document.getElementById('btn-start-batch');
    if (btn) {
      btn.disabled = false;
      btn.textContent = '🚀 Запустить партию';
    }
  }
}

function closeBatchPreview() {
  document.getElementById('batch-preview-modal').style.display = 'none';
  window.currentBatchPreview = null;
}

async function confirmBatchStart() {
  if (!window.currentBatchPreview) {
    showError('Превью недоступно');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/api/batch/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        preview: window.currentBatchPreview
      })
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    if (data.success) {
      showSuccess('Партия успешно запущена');
      closeBatchPreview();
      // Здесь можно запустить оркестратор или другую логику
      addLog('info', 'Партия запущена из превью');
    } else {
      throw new Error(data.error || 'Не удалось запустить партию');
    }
  } catch (err) {
    showError(`Не удалось запустить партию: ${err.message}`);
  }
}

// ============================================================
// BATCH HISTORY
// ============================================================

async function loadBatchHistory() {
  try {
    const limit = document.getElementById('history-limit').value;
    const response = await fetch(`${API_BASE}/api/batch/history?limit=${limit}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    if (data.success) {
      renderBatchHistory(data.batches);
    }
  } catch (err) {
    console.error('Error loading batch history:', err);
    document.getElementById('batch-history-list').innerHTML = 
      '<div class="history-loading">Ошибка загрузки истории</div>';
  }
}

function renderBatchHistory(batches) {
  const container = document.getElementById('batch-history-list');
  
  if (!batches || batches.length === 0) {
    container.innerHTML = '<div class="history-loading">Истории партий пока нет</div>';
    return;
  }
  
  container.innerHTML = batches.map(batch => {
    const completedAt = batch.completedAt ? new Date(batch.completedAt).toLocaleString() : '-';
    const status = batch.status || 'unknown';
    const pagesGenerated = batch.result?.pagesGenerated || batch.pagesGenerated || 0;
    const pagesDeployed = batch.result?.pagesDeployed || batch.pagesDeployed || 0;
    const language = (batch.language || 'en').toUpperCase();
    
    const statusText = {
      'completed': 'Завершена',
      'scheduled': 'Запланирована',
      'failed': 'Ошибка',
      'running': 'Выполняется'
    }[status] || status;
    
    return `<div class="history-item status-${status}">
      <div class="history-item-header">
        <span class="history-batch-id">Партия #${batch.batchNumber || '-'}</span>
        <span class="history-status">${statusText}</span>
      </div>
      <div class="history-item-details">
        <div class="history-detail">
          <span class="label">Язык:</span>
          <span class="value">${language}</span>
        </div>
        <div class="history-detail">
          <span class="label">Страниц:</span>
          <span class="value">${pagesGenerated} создано, ${pagesDeployed} задеплоено</span>
        </div>
        <div class="history-detail">
          <span class="label">Завершена:</span>
          <span class="value">${completedAt}</span>
        </div>
      </div>
    </div>`;
  }).join('');
}

