/**
 * MONSTER 8.0 Dashboard - Frontend
 */

// Определяем базовый URL API (для Vercel или локального сервера)
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
  ? '' 
  : '/dashboard';

// Инициализируем Socket.IO с правильным URL
let socket;
try {
  socket = io(API_BASE || window.location.origin);
} catch (e) {
  console.error('[Dashboard] Socket.IO initialization error:', e);
  // Fallback: создаем заглушку для socket
  socket = {
    on: () => {},
    emit: () => {},
    connect: () => {},
    disconnect: () => {}
  };
}

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
  // Поддерживаем многострочные сообщения
  if (message.includes('\n')) {
    toast.style.whiteSpace = 'pre-line';
    toast.style.maxWidth = '500px';
    toast.style.fontSize = '13px';
  }
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // Увеличиваем время показа для информационных сообщений с командами
  const displayTime = (type === 'info' && message.includes('\n')) ? 10000 : 3000;
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, displayTime);
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
  const pagesCanvas = document.getElementById('pages-chart');
  if (!pagesCanvas) {
    console.warn('[Dashboard] Pages chart canvas not found');
    return;
  }
  const pagesCtx = pagesCanvas.getContext('2d');
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
  // На Vercel Socket.IO не работает (нет WebSocket сервера)
  if (API_BASE === '/dashboard' || window.location.hostname !== 'localhost') {
    console.log('[Dashboard] Socket.IO disabled on Vercel - using polling instead');
    updateStatus('connected', 'Подключено (polling)');
    // Используем обычный polling вместо WebSocket
    setInterval(() => {
      loadStatus(false).catch(() => {});
    }, 5000);
    return;
  }
  
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 10;
  
  if (!socket || typeof socket.on !== 'function') {
    console.warn('[Dashboard] Socket.IO not available');
    return;
  }
  
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
        if (socket && typeof socket.connect === 'function') {
          socket.connect();
        }
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
  const btnShowStrategyTree = document.getElementById('btn-show-strategy-tree');
  const strategyTreeClose = document.getElementById('strategy-tree-close');
  
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
  
  // Кнопка дерева стратегии (может быть в двух местах)
  if (btnShowStrategyTree) {
    console.log('[Dashboard] Strategy tree button found, adding listener');
    btnShowStrategyTree.addEventListener('click', (e) => {
      console.log('[Dashboard] Strategy tree button clicked');
      e.preventDefault();
      e.stopPropagation();
      try {
        showStrategyTreeModal();
      } catch (err) {
        console.error('[Dashboard] Error showing strategy tree modal:', err);
        alert('Ошибка открытия дерева стратегии: ' + err.message);
      }
    });
  } else {
    console.warn('[Dashboard] Strategy tree button NOT found via getElementById!');
  }
  
  // Также ищем кнопку через querySelector (на случай, если она в другом месте)
  const btnAlt = document.querySelector('#btn-show-strategy-tree');
  if (btnAlt && btnAlt !== btnShowStrategyTree) {
    console.log('[Dashboard] Found additional strategy tree button via querySelector');
    btnAlt.addEventListener('click', (e) => {
      console.log('[Dashboard] Strategy tree button clicked (alt)');
      e.preventDefault();
      e.stopPropagation();
      try {
        showStrategyTreeModal();
      } catch (err) {
        console.error('[Dashboard] Error showing strategy tree modal (alt):', err);
        alert('Ошибка открытия дерева стратегии: ' + err.message);
      }
    });
  }
  
  if (strategyTreeClose) {
    strategyTreeClose.addEventListener('click', (e) => {
      e.preventDefault();
      closeStrategyTreeModal();
    });
  }
  
  // Закрытие модального окна по клику вне его
  const strategyTreeModal = document.getElementById('strategy-tree-modal');
  if (strategyTreeModal) {
    strategyTreeModal.addEventListener('click', (e) => {
      if (e.target === strategyTreeModal) {
        closeStrategyTreeModal();
      }
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
      // Показываем информацию о запуске
      if (data.command) {
        // Если есть команда для локального запуска, показываем её
        addLog('info', `Оркестратор: ${data.message}`);
        addLog('info', `Команда: ${data.command}`);
        showInfo(`Оркестратор должен быть запущен локально:\n\n${data.command}\n\n${data.note || ''}`);
      } else {
        // Если оркестратор запущен на сервере
        addLog('info', 'Оркестратор запущен');
        updateOrchestratorStatus(true, data.pid);
        showSuccess('Оркестратор успешно запущен');
      }
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
  const priorityEl = document.getElementById('learning-priority');
  if (!input || !priorityEl) {
    console.error('[Dashboard] Learning form elements not found');
    return;
  }
  const priority = priorityEl.value;
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
    typeof loadBatchHistory === 'function' ? loadBatchHistory() : Promise.resolve()
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
    // На Vercel нет локального оркестратора, возвращаем дефолтный статус
    if (API_BASE === '/dashboard' || (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')) {
      const defaultStatus = { isRunning: false, pid: null };
      setCached('orchestrator', defaultStatus);
      updateOrchestratorStatus(false, null);
      return defaultStatus;
    }
    
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
    // На Vercel возвращаем дефолтный статус
    const defaultStatus = { isRunning: false, pid: null };
    updateOrchestratorStatus(false, null);
    return defaultStatus;
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
  
  const pagesEn = document.getElementById('pages-en');
  const pagesEs = document.getElementById('pages-es');
  const pagesTotal = document.getElementById('pages-total');
  const pagesEnDeployed = document.getElementById('pages-en-deployed');
  const pagesEsDeployed = document.getElementById('pages-es-deployed');
  const pagesTotalDeployed = document.getElementById('pages-total-deployed');
  
  if (pagesEn) pagesEn.textContent = enPages;
  if (pagesEs) pagesEs.textContent = esPages;
  if (pagesTotal) pagesTotal.textContent = totalPages;
  if (pagesEnDeployed) pagesEnDeployed.textContent = `Задеплоено: ${enDeployed}`;
  if (pagesEsDeployed) pagesEsDeployed.textContent = `Задеплоено: ${esDeployed}`;
  if (pagesTotalDeployed) pagesTotalDeployed.textContent = `Задеплоено: ${totalDeployed}`;
  
  // Pages Chart
  if (pagesChart) {
    pagesChart.data.labels = ['Английский', 'Испанский'];
    pagesChart.data.datasets[0].data = [enPages, esPages];
    pagesChart.update();
  }
  
  // Batch Progress - всегда отображаем, даже если партия не запущена
  const batch = data.batch || {};
  const isRunning = batch.inProgress || false;
  const current = batch.current || 0;
  const total = batch.total || 0;
  const completed = batch.completed || 0;
  const failed = batch.failed || 0;
  
  const batchStatus = document.getElementById('batch-status');
  const batchCurrent = document.getElementById('batch-current');
  const batchCompleted = document.getElementById('batch-completed');
  const batchFailed = document.getElementById('batch-failed');
  const batchProgressFill = document.getElementById('batch-progress-fill');
  const batchProgressText = document.getElementById('batch-progress-text');
  
  // Обновляем статус
  if (batchStatus) {
    if (isRunning) {
      batchStatus.textContent = '🟢 Выполняется';
      batchStatus.style.color = 'var(--accent-success)';
    } else if (total > 0 && completed === total) {
      batchStatus.textContent = '✅ Завершена';
      batchStatus.style.color = 'var(--accent-success)';
    } else if (total > 0) {
      batchStatus.textContent = '⏸ Остановлена';
      batchStatus.style.color = 'var(--accent-warning)';
    } else {
      batchStatus.textContent = '⏳ Ожидает';
      batchStatus.style.color = 'var(--text-secondary)';
    }
  }
  
  // Обновляем текущую позицию
  if (batchCurrent) {
    if (total > 0) {
      batchCurrent.textContent = `${current} / ${total}`;
    } else {
      batchCurrent.textContent = '-';
    }
  }
  
  // Обновляем статистику
  if (batchCompleted) batchCompleted.textContent = completed;
  if (batchFailed) batchFailed.textContent = failed;
  
  // Обновляем прогресс-бар
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  if (batchProgressFill) {
    batchProgressFill.style.width = `${progress}%`;
    // Цвет прогресс-бара зависит от статуса
    if (isRunning) {
      batchProgressFill.style.background = 'linear-gradient(90deg, var(--accent-primary), #60a5fa)';
    } else if (total > 0 && completed === total) {
      batchProgressFill.style.background = 'linear-gradient(90deg, var(--accent-success), #34d399)';
    } else {
      batchProgressFill.style.background = 'linear-gradient(90deg, var(--accent-warning), #fbbf24)';
    }
  }
  if (batchProgressText) {
    if (total > 0) {
      batchProgressText.textContent = `${completed} / ${total} (${progress}%)`;
    } else {
      batchProgressText.textContent = 'Партия не запущена';
    }
  }
  
  // Deploy Progress
  const deployProgress = totalPages > 0 ? Math.round((totalDeployed / totalPages) * 100) : 0;
  const deployCreated = document.getElementById('deploy-created');
  const deployDeployed = document.getElementById('deploy-deployed');
  const deployPending = document.getElementById('deploy-pending');
  const deployProgressFill = document.getElementById('deploy-progress-fill');
  const deployProgressText = document.getElementById('deploy-progress-text');
  
  if (deployCreated) deployCreated.textContent = totalPages;
  if (deployDeployed) deployDeployed.textContent = totalDeployed;
  if (deployPending) deployPending.textContent = totalPages - totalDeployed;
  if (deployProgressFill) deployProgressFill.style.width = `${deployProgress}%`;
  if (deployProgressText) deployProgressText.textContent = `${totalDeployed} / ${totalPages} (${deployProgress}%)`;
  
  // BPG
  const bpgBlocks = document.getElementById('bpg-blocks');
  const bpgReady = document.getElementById('bpg-ready');
  const bpgProgress = document.getElementById('bpg-progress');
  
  if (bpgBlocks) bpgBlocks.textContent = data.bpg?.blocks || 0;
  if (bpgReady) bpgReady.textContent = data.bpg?.ready ? 'Готово' : 'Подготовка';
  const bpgProgressValue = data.bpg?.blocks > 0 ? Math.min(100, (data.bpg.blocks / 50) * 100) : 0;
  if (bpgProgress) bpgProgress.style.width = `${bpgProgressValue}%`;
  
  // Strategy
  if (data.strategy) {
    const langPhase = document.getElementById('lang-phase');
    const lengthMode = document.getElementById('length-mode');
    const enThreshold = document.getElementById('en-threshold');
    
    if (langPhase) langPhase.textContent = data.strategy.languagePhase || '-';
    if (lengthMode) lengthMode.textContent = data.strategy.lengthMode || '-';
    if (enThreshold) enThreshold.textContent = data.strategy.enThreshold || '-';
  }
  
  // Schedule - обновляем расписание следующей партии
  if (data.schedule && data.schedule.nextBatch) {
    updateSchedule(data.schedule.nextBatch);
    updateNextBatchPreview(data.schedule.nextBatch);
    startCountdown(data.schedule.nextBatch);
  } else {
    updateSchedule(null);
    stopCountdown();
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
  const orchestratorStatus = document.getElementById('orchestrator-status');
  const orchestratorPid = document.getElementById('orchestrator-pid');
  const startBtn = document.getElementById('btn-start');
  const stopBtn = document.getElementById('btn-stop');
  
  if (orchestratorStatus) orchestratorStatus.textContent = isRunning ? 'Работает' : 'Остановлен';
  if (orchestratorPid) orchestratorPid.textContent = pid || '-';
  if (startBtn) startBtn.disabled = isRunning;
  if (stopBtn) stopBtn.disabled = !isRunning;
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
  // На Vercel Service Worker не нужен (нет офлайн режима)
  if (API_BASE === '/dashboard' || window.location.hostname !== 'localhost') {
    return;
  }
  
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

// Socket event for batch completion (только для локального сервера)
if (socket && typeof socket.on === 'function') {
  socket.on('batch:completed', (data) => {
    showSuccess(`Партия ${data.batchId} завершена. Следующая партия запланирована.`);
    loadBatchSchedule();
    if (typeof loadBatchHistory === 'function') {
      loadBatchHistory();
    }
  });
}

// ============================================================
// BATCH SCHEDULE & COUNTDOWN
// ============================================================

let countdownInterval = null;

async function loadBatchSchedule() {
  try {
    const response = await fetch(`${API_BASE}/api/batch/schedule`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    if (data.success && data.nextBatch) {
      updateSchedule(data.nextBatch);
      updateNextBatchPreview(data.nextBatch);
      startCountdown(data.nextBatch);
    } else {
      // Нет запланированных партий
      updateSchedule(null);
      stopCountdown();
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
  const timeStr = scheduledTime.toLocaleString('ru-RU', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  document.getElementById('next-batch-time').textContent = timeStr;
  document.getElementById('next-batch-pages').textContent = nextBatch.estimatedPages || '-';
  document.getElementById('next-batch-lang').textContent = (nextBatch.language || 'en').toUpperCase();
  document.getElementById('next-batch-duration').textContent = `${nextBatch.estimatedDuration || 0} мин`;
  
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

async function updateNextBatchPreview(nextBatch) {
  if (!nextBatch) {
    document.getElementById('next-batch-preview').style.display = 'none';
    return;
  }
  
  try {
    // Получаем превью следующей партии
    const response = await fetch(`${API_BASE}/api/batch/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.preview) {
        const preview = data.preview;
        const previewContent = document.getElementById('next-batch-preview-content');
        
        previewContent.innerHTML = `
          <div class="preview-line"><strong>Страниц:</strong> ${preview.estimatedPages}</div>
          <div class="preview-line"><strong>Язык:</strong> ${(preview.language || 'en').toUpperCase()}</div>
          <div class="preview-line"><strong>Длительность:</strong> ${preview.estimatedDuration} минут</div>
          ${preview.topics?.states?.length > 0 ? `<div class="preview-line"><strong>Штаты:</strong> ${preview.topics.states.join(', ')}</div>` : ''}
          ${preview.topics?.zones?.length > 0 ? `<div class="preview-line"><strong>Зоны:</strong> ${preview.topics.zones.join(', ')}</div>` : ''}
          ${preview.topics?.formats?.length > 0 ? `<div class="preview-line"><strong>Форматы:</strong> ${preview.topics.formats.join(', ')}</div>` : ''}
        `;
        
        document.getElementById('next-batch-preview').style.display = 'block';
      }
    }
  } catch (err) {
    console.error('Error loading next batch preview:', err);
  }
}

function startCountdown(nextBatch) {
  if (!nextBatch || !nextBatch.scheduledAt) {
    stopCountdown();
    return;
  }
  
  stopCountdown(); // Останавливаем предыдущий отсчет
  
  const countdownEl = document.getElementById('countdown-timer');
  const containerEl = document.getElementById('countdown-container');
  
  if (!countdownEl || !containerEl) return;
  
  containerEl.style.display = 'block';
  
  function updateCountdown() {
    const now = new Date();
    const scheduledTime = new Date(nextBatch.scheduledAt);
    const diff = scheduledTime - now;
    
    if (diff <= 0) {
      countdownEl.textContent = 'Партия должна быть запущена';
      stopCountdown();
      loadBatchSchedule(); // Перезагружаем расписание
      return;
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    let countdownText = '';
    if (days > 0) {
      countdownText = `${days}д ${hours}ч ${minutes}м ${seconds}с`;
    } else if (hours > 0) {
      countdownText = `${hours}ч ${minutes}м ${seconds}с`;
    } else if (minutes > 0) {
      countdownText = `${minutes}м ${seconds}с`;
    } else {
      countdownText = `${seconds}с`;
    }
    
    countdownEl.textContent = countdownText;
  }
  
  updateCountdown();
  countdownInterval = setInterval(updateCountdown, 1000);
}

function stopCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  const containerEl = document.getElementById('countdown-container');
  if (containerEl) {
    containerEl.style.display = 'none';
  }
}

// ============================================================
// STRATEGY TREE
// ============================================================

async function loadStrategyTree() {
  console.log('[Dashboard] loadStrategyTree called');
  const container = document.getElementById('strategy-tree-container');
  if (!container) {
    console.error('[Dashboard] Strategy tree container NOT found!');
    return;
  }
  
  console.log('[Dashboard] Loading strategy tree...');
  container.innerHTML = '<div class="tree-loading">Загрузка дерева стратегии...</div>';
  
  try {
    console.log('[Dashboard] Fetching /api/strategy/tree');
    const response = await fetch(`${API_BASE}/api/strategy/tree`);
    console.log('[Dashboard] Response status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('[Dashboard] Tree data received:', data);
    if (data.success && data.tree) {
      renderStrategyTree(data.tree);
    } else {
      console.error('[Dashboard] Invalid tree data:', data);
      container.innerHTML = '<div class="tree-error">Ошибка загрузки дерева стратегии</div>';
    }
  } catch (err) {
    console.error('[Dashboard] Error loading strategy tree:', err);
    container.innerHTML = `<div class="tree-error">Ошибка: ${err.message}</div>`;
  }
}

function renderStrategyTree(treeData) {
  const container = document.getElementById('strategy-tree-container');
  if (!container) return;
  
  const { tree, totalTopics, totalCreatedPages, totalPossiblePages } = treeData;
  const progressPercent = totalPossiblePages > 0 ? Math.round((totalCreatedPages / totalPossiblePages) * 100) : 0;
  
  let html = `
    <div class="tree-stats">
      <div class="tree-stat"><strong>Всего тем:</strong> ${totalTopics}</div>
      <div class="tree-stat"><strong>Создано страниц:</strong> ${totalCreatedPages} / ${totalPossiblePages}</div>
      <div class="tree-stat"><strong>Прогресс:</strong> ${progressPercent}%</div>
      <div class="tree-stat"><strong>Зон:</strong> ${Object.keys(tree).length}</div>
    </div>
    <div class="tree-content">
  `;
  
  Object.keys(tree).forEach(zoneKey => {
    const zone = tree[zoneKey];
    const zoneProgress = zone.totalPages > 0 ? Math.round((zone.createdPages / zone.totalPages) * 100) : 0;
    
    html += `<div class="tree-zone">
      <div class="tree-zone-header">
        <span class="tree-icon">📁</span>
        <span class="tree-label">${zone.name || zoneKey}</span>
        <span class="tree-progress">${zone.createdPages}/${zone.totalPages} (${zoneProgress}%)</span>
      </div>
      <div class="tree-progress-bar">
        <div class="tree-progress-fill" style="width: ${zoneProgress}%"></div>
      </div>
      <div class="tree-zone-content">`;
    
    Object.keys(zone.states).forEach(stateKey => {
      const state = zone.states[stateKey];
      const stateProgress = state.totalPages > 0 ? Math.round((state.createdPages / state.totalPages) * 100) : 0;
      
      html += `<div class="tree-state">
        <div class="tree-state-header">
          <span class="tree-icon">🗺️</span>
          <span class="tree-label">${state.name || stateKey}</span>
          <span class="tree-progress">${state.createdPages}/${state.totalPages} (${stateProgress}%)</span>
        </div>
        <div class="tree-progress-bar">
          <div class="tree-progress-fill" style="width: ${stateProgress}%"></div>
        </div>
        <div class="tree-state-content">`;
      
      Object.keys(state.topics).forEach(topicKey => {
        const topic = state.topics[topicKey];
        const topicProgress = topic.totalPages > 0 ? Math.round((topic.createdPages / topic.totalPages) * 100) : 0;
        
        html += `<div class="tree-topic-item">
          <div class="tree-topic-header">
            <span class="tree-icon">📝</span>
            <span class="tree-label">${topic.name || topicKey}</span>
            <span class="tree-progress">${topic.createdPages}/${topic.totalPages} (${topicProgress}%)</span>
          </div>
          <div class="tree-progress-bar">
            <div class="tree-progress-fill" style="width: ${topicProgress}%"></div>
          </div>
          <div class="tree-topic-content">`;
        
        Object.keys(topic.formats).forEach(formatKey => {
          const format = topic.formats[formatKey];
          const formatProgress = format.totalPages > 0 ? Math.round((format.createdPages / format.totalPages) * 100) : 0;
          
          html += `<div class="tree-format">
            <div class="tree-format-header">
              <span class="tree-icon">📄</span>
              <span class="tree-label">${format.name || formatKey}</span>
              <span class="tree-progress">${format.createdPages}/${format.totalPages} (${formatProgress}%)</span>
            </div>
            <div class="tree-progress-bar">
              <div class="tree-progress-fill" style="width: ${formatProgress}%"></div>
            </div>
            <div class="tree-format-content">`;
          
          Object.keys(format.languages).forEach(langKey => {
            const lang = format.languages[langKey];
            const langProgress = lang.totalPages > 0 ? Math.round((lang.createdPages / lang.totalPages) * 100) : 0;
            
            html += `<div class="tree-language">
              <div class="tree-language-header">
                <span class="tree-icon">🌐</span>
                <span class="tree-label">${lang.name || langKey.toUpperCase()}</span>
                <span class="tree-progress">${lang.createdPages}/${lang.totalPages} (${langProgress}%)</span>
              </div>
              <div class="tree-progress-bar">
                <div class="tree-progress-fill" style="width: ${langProgress}%"></div>
              </div>
              <div class="tree-pages">`;
            
            lang.pages.forEach(page => {
              const pageProgress = page.total > 0 ? Math.round((page.created / page.total) * 100) : 0;
              const pageClass = page.created > 0 ? 'page-created' : 'page-pending';
              const pageIcon = page.created > 0 ? '✅' : '⏳';
              
              html += `<div class="tree-page ${pageClass}">
                <span class="page-icon">${pageIcon}</span>
                <span class="page-id">${page.topic_id || page.title || 'Unknown'}</span>
                <span class="page-progress">${page.created}/${page.total}</span>
              </div>`;
            });
            
            html += `</div></div>`;
          });
          
          html += `</div></div>`;
        });
        
        html += `</div></div>`;
      });
      
      html += `</div></div>`;
    });
    
    html += `</div></div>`;
  });
  
  html += `</div></div>`;
  container.innerHTML = html;
}

function showStrategyTreeModal() {
  console.log('[Dashboard] showStrategyTreeModal called');
  const modal = document.getElementById('strategy-tree-modal');
  console.log('[Dashboard] Modal element:', modal);
  if (modal) {
    console.log('[Dashboard] Showing modal');
    modal.style.display = 'flex';
    loadStrategyTree();
  } else {
    console.error('[Dashboard] Strategy tree modal NOT found!');
    alert('Модальное окно дерева стратегии не найдено. Проверьте HTML.');
  }
}

function closeStrategyTreeModal() {
  const modal = document.getElementById('strategy-tree-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// ============================================================
// BATCH HISTORY
// ============================================================

async function loadBatchHistory() {
  try {
    const limitEl = document.getElementById('history-limit');
    const limit = limitEl ? limitEl.value : '20';
    const response = await fetch(`${API_BASE}/api/batch/history?limit=${limit}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    if (data.success) {
      renderBatchHistory(data.batches || []);
    }
  } catch (err) {
    console.error('[Dashboard] Error loading batch history:', err);
    const container = document.getElementById('batch-history-list');
    if (container) {
      container.innerHTML = '<div class="history-loading">Ошибка загрузки истории</div>';
    }
  }
}

function renderBatchHistory(batches) {
  const container = document.getElementById('batch-history-list');
  if (!container) return;
  
  if (!batches || batches.length === 0) {
    container.innerHTML = '<div class="history-loading">Истории партий пока нет</div>';
    return;
  }
  
  container.innerHTML = batches.map(batch => {
    const completedAt = batch.completedAt ? new Date(batch.completedAt).toLocaleString('ru-RU') : '-';
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

// ============================================================
// BATCH PREVIEW MODAL
// ============================================================

async function showBatchPreview() {
  console.log('[Dashboard] showBatchPreview called');
  const modal = document.getElementById('batch-preview-modal');
  if (!modal) {
    console.error('[Dashboard] Batch preview modal not found');
    showError('Модальное окно превью не найдено');
    return;
  }
  
  try {
    // Показываем модальное окно
    modal.style.display = 'flex';
    
    // Загружаем превью партии
    const response = await fetch(`${API_BASE}/api/batch/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    if (data.success && data.preview) {
      const preview = data.preview;
      
      // Заполняем превью данными
      const previewPages = document.getElementById('preview-pages');
      const previewLang = document.getElementById('preview-lang');
      const previewDuration = document.getElementById('preview-duration');
      const previewStates = document.getElementById('preview-states');
      const previewZones = document.getElementById('preview-zones');
      const previewFormats = document.getElementById('preview-formats');
      const previewAutoDeploy = document.getElementById('preview-auto-deploy');
      
      // Правильный маппинг полей из preview
      const pages = preview.estimatedPages || preview.expectedPages || preview.pages || 0;
      const language = preview.language || 'en';
      const duration = preview.estimatedDuration || preview.expectedDuration || preview.duration || '-';
      const states = preview.topics?.states || preview.states || [];
      const zones = preview.topics?.zones || preview.zones || [];
      const formats = preview.topics?.formats || preview.formats || [];
      const autoDeploy = preview.autoDeploy !== false;
      
      if (previewPages) previewPages.textContent = pages > 0 ? pages.toLocaleString() : '-';
      if (previewLang) previewLang.textContent = language.toUpperCase();
      if (previewDuration) previewDuration.textContent = duration !== '-' ? `${duration} мин` : '-';
      if (previewStates) previewStates.textContent = Array.isArray(states) && states.length > 0 ? states.join(', ') : '-';
      if (previewZones) previewZones.textContent = Array.isArray(zones) && zones.length > 0 ? zones.join(', ') : '-';
      if (previewFormats) previewFormats.textContent = Array.isArray(formats) && formats.length > 0 ? formats.join(', ') : '-';
      if (previewAutoDeploy) previewAutoDeploy.textContent = autoDeploy ? 'Да' : 'Нет';
      
      console.log('[Dashboard] Batch preview loaded:', preview);
    } else {
      throw new Error(data.error || 'Не удалось загрузить превью');
    }
  } catch (err) {
    console.error('[Dashboard] Error loading batch preview:', err);
    showError(`Не удалось загрузить превью партии: ${err.message}`);
    
    // Заполняем дефолтными значениями
    const previewPages = document.getElementById('preview-pages');
    const previewLang = document.getElementById('preview-lang');
    if (previewPages) previewPages.textContent = 'Загрузка...';
    if (previewLang) previewLang.textContent = 'EN';
  }
}

function closeBatchPreview() {
  console.log('[Dashboard] closeBatchPreview called');
  const modal = document.getElementById('batch-preview-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

async function confirmBatchStart() {
  console.log('[Dashboard] confirmBatchStart called');
  try {
    const btn = document.getElementById('btn-confirm-batch');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Запуск...';
    }
    
    // Отправляем запрос на запуск партии
    const response = await fetch(`${API_BASE}/api/batch/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('[Dashboard] Batch start response:', data);
    
    if (data.success) {
      // Проверяем, запущена ли партия через GitHub Actions
      if (data.workflow) {
        addLog('info', `Партия запущена через GitHub Actions (${data.workflow.phase}/${data.workflow.length})`);
        showSuccess(`✅ Партия запущена через GitHub Actions!\n\nПроверьте прогресс:\n${data.githubUrl || 'https://github.com/iunakov1991-alt/vintrusted/actions'}`);
        closeBatchPreview();
        
        // Обновляем статус через несколько секунд (GitHub Actions нужно время для старта)
        setTimeout(() => {
          loadStatus(true);
          loadBatchSchedule();
        }, 3000);
      } else if (data.command) {
        // Локальный запуск
        addLog('info', 'Партия требует локального запуска');
        const message = `Партия не может быть запущена автоматически на Vercel.\n\n${(data.instructions || []).join('\n')}\n\nКоманда:\n${data.command}`;
        showInfo(message);
        closeBatchPreview();
      } else {
        // Обычный успех
        addLog('info', 'Партия запущена');
        showSuccess(data.message || 'Партия успешно запущена');
        closeBatchPreview();
        
        // Обновляем статус
        setTimeout(() => {
          loadStatus(true);
          loadBatchSchedule();
        }, 1000);
      }
    } else {
      throw new Error(data.error || 'Не удалось запустить партию');
    }
  } catch (err) {
    console.error('[Dashboard] Error starting batch:', err);
    addLog('error', `Ошибка запуска партии: ${err.message}`);
    showError(`Не удалось запустить партию: ${err.message}`);
  } finally {
    const btn = document.getElementById('btn-confirm-batch');
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Подтвердить и запустить';
    }
  }
}

