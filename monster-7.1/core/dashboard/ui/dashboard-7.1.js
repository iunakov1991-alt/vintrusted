/**
 * Monster 7.1 Dashboard - Batch Support
 * 
 * Обновлённый дашборд с поддержкой батчей и паузы/возобновления.
 */

const API_BASE = '/api';
const socket = io();

// State
let isRunning = false;
let isPaused = false;
let batchStatus = {
  completed: 0,
  total: 0,
  failed: 0,
  current: null
};
let currentTasks = [];
let lastResults = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeDashboard();
    setupEventListeners();
    setupWebSocket();
    setupNavigation();
    restoreState();
    startStatusUpdates();
    startBatchStatusUpdates();
    loadLogs();
});

function initializeDashboard() {
    updateStatus('ready', 'Готов');
    updateBatchProgress();
    showToast('Monster 7.1 Dashboard загружен', 'success');
}

/**
 * Восстановление состояния после перезагрузки страницы
 */
async function restoreState() {
    try {
        const response = await fetch(`${API_BASE}/status`);
        const data = await response.json();
        
        if (data.isRunning) {
            isRunning = true;
            updateStatus('running', 'Выполняется...');
            showToast('Восстановлено: генератор работает', 'info');
        } else {
            isRunning = false;
            updateStatus('ready', 'Готов');
        }
        
        // Восстановление статуса батча
        try {
            const batchResponse = await fetch(`${API_BASE}/batch/status`);
            const batchData = await batchResponse.json();
            if (batchData) {
                batchStatus = {
                    completed: batchData.progress?.completed || 0,
                    total: batchData.progress?.total || 0,
                    failed: batchData.progress?.failed || 0,
                    current: batchData.progress?.current || null
                };
                isPaused = batchData.isPaused || false;
                updateBatchProgress();
                updatePauseButton();
            }
        } catch (error) {
            console.warn('Не удалось восстановить статус батча:', error);
        }
        
        updatePageStats();
        
    } catch (error) {
        console.error('Ошибка восстановления состояния:', error);
    }
}

function setupEventListeners() {
    document.getElementById('btn-start').addEventListener('click', handleStart);
    document.getElementById('btn-pause').addEventListener('click', handlePause);
    document.getElementById('btn-resume').addEventListener('click', handleResume);
    document.getElementById('btn-stop').addEventListener('click', handleStop);
    document.getElementById('btn-init-knowledge').addEventListener('click', handleInitKnowledge);
    document.getElementById('btn-export').addEventListener('click', handleExportReport);
}

function setupWebSocket() {
    socket.on('connect', () => {
        console.log('WebSocket connected');
        restoreState();
    });

    socket.on('cycle:started', () => {
        isRunning = true;
        isPaused = false;
        updateStatus('running', 'Выполняется...');
        batchStatus = { completed: 0, total: 0, failed: 0, current: null };
        updateBatchProgress();
        updatePauseButton();
        showToast('Цикл запущен', 'info');
    });

    socket.on('task:added', (data) => {
        batchStatus.total = data.total || batchStatus.total;
        updateBatchProgress();
    });

    socket.on('task:started', (data) => {
        batchStatus.current = data.task?.id || null;
        updateBatchProgress();
        updateCurrentTask(data.task);
    });

    socket.on('task:completed', (data) => {
        batchStatus.completed++;
        batchStatus.current = null;
        updateBatchProgress();
        showToast(`Задача завершена: ${data.task?.id || 'unknown'}`, 'success');
    });

    socket.on('task:failed', (data) => {
        batchStatus.failed++;
        batchStatus.current = null;
        updateBatchProgress();
        showToast(`Задача провалена: ${data.task?.id || 'unknown'}`, 'error');
    });

    socket.on('queue:started', () => {
        isRunning = true;
        isPaused = false;
        updateStatus('running', 'Обработка батча...');
        updatePauseButton();
    });

    socket.on('queue:completed', (data) => {
        isRunning = false;
        isPaused = false;
        updateStatus('ready', 'Завершено');
        batchStatus.current = null;
        updateBatchProgress();
        updatePauseButton();
        showToast(`Батч завершён! Завершено: ${data.progress?.completed || 0}, Провалено: ${data.progress?.failed || 0}`, 'success');
    });

    socket.on('queue:paused', (data) => {
        isPaused = true;
        updateStatus('paused', 'Приостановлено');
        updatePauseButton();
        showToast('Батч приостановлен', 'info');
    });

    socket.on('queue:resumed', (data) => {
        isPaused = false;
        updateStatus('running', 'Выполняется...');
        updatePauseButton();
        showToast('Батч возобновлён', 'info');
    });

    socket.on('cycle:completed', (results) => {
        isRunning = false;
        isPaused = false;
        updateStatus('ready', 'Завершено');
        lastResults = results;
        updateBatchProgress();
        updatePauseButton();
        showToast('Цикл успешно завершен!', 'success');
    });

    socket.on('error', (error) => {
        showToast(`Ошибка: ${error.error || error.message || 'Unknown'}`, 'error');
    });
}

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabs = document.querySelectorAll('.tab-content');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetTab = item.dataset.tab;
            
            navItems.forEach(ni => ni.classList.remove('active'));
            tabs.forEach(t => t.classList.remove('active'));
            
            item.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });
}

async function handleStart() {
    if (isRunning) {
        showToast('Генератор уже запущен!', 'warning');
        return;
    }

    isRunning = true;
    updateStatus('running', 'Запуск...');
    clearResults();

    try {
        const response = await fetch(`${API_BASE}/batch/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to start');
        }

        const data = await response.json();
        showToast('Генерация запущена', 'success');
    } catch (error) {
        isRunning = false;
        updateStatus('error', 'Ошибка');
        showToast(`Ошибка: ${error.message}`, 'error');
    }
}

async function handlePause() {
    try {
        const response = await fetch(`${API_BASE}/batch/pause`, {
            method: 'POST'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to pause');
        }

        isPaused = true;
        updatePauseButton();
        showToast('Батч приостановлен', 'info');
    } catch (error) {
        showToast(`Ошибка: ${error.message}`, 'error');
    }
}

async function handleResume() {
    try {
        const response = await fetch(`${API_BASE}/batch/resume`, {
            method: 'POST'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to resume');
        }

        isPaused = false;
        updatePauseButton();
        showToast('Батч возобновлён', 'info');
    } catch (error) {
        showToast(`Ошибка: ${error.message}`, 'error');
    }
}

async function handleStop() {
    try {
        const response = await fetch(`${API_BASE}/stop`, {
            method: 'POST'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to stop');
        }

        isRunning = false;
        isPaused = false;
        updateStatus('ready', 'Остановлено');
        updatePauseButton();
        batchStatus = { completed: 0, total: 0, failed: 0, current: null };
        updateBatchProgress();
        showToast('Все задачи остановлены', 'info');
    } catch (error) {
        showToast(`Ошибка: ${error.message}`, 'error');
    }
}

function updateStatus(status, text) {
    const statusEl = document.getElementById('status-indicator');
    const statusTextEl = document.getElementById('status-text');
    
    if (statusEl) {
        statusEl.className = `status-indicator status-${status}`;
    }
    if (statusTextEl) {
        statusTextEl.textContent = text;
    }
}

function updateBatchProgress() {
    const progressEl = document.getElementById('batch-progress');
    const progressBarEl = document.getElementById('batch-progress-bar');
    const progressTextEl = document.getElementById('batch-progress-text');
    const currentTaskEl = document.getElementById('current-task');
    
    if (batchStatus.total > 0) {
        const percent = Math.round((batchStatus.completed / batchStatus.total) * 100);
        
        if (progressEl) {
            progressEl.style.display = 'block';
        }
        
        if (progressBarEl) {
            progressBarEl.style.width = `${percent}%`;
        }
        
        if (progressTextEl) {
            progressTextEl.textContent = `${batchStatus.completed} / ${batchStatus.total} (${percent}%)`;
        }
        
        // Статистика
        const statsEl = document.getElementById('batch-stats');
        if (statsEl) {
            statsEl.innerHTML = `
                <div class="batch-stat">
                    <span class="batch-stat-label">Завершено:</span>
                    <span class="batch-stat-value">${batchStatus.completed}</span>
                </div>
                <div class="batch-stat">
                    <span class="batch-stat-label">Провалено:</span>
                    <span class="batch-stat-value error">${batchStatus.failed}</span>
                </div>
                <div class="batch-stat">
                    <span class="batch-stat-label">Осталось:</span>
                    <span class="batch-stat-value">${batchStatus.total - batchStatus.completed - batchStatus.failed}</span>
                </div>
            `;
        }
    } else {
        if (progressEl) {
            progressEl.style.display = 'none';
        }
    }
    
    // Текущая задача
    if (currentTaskEl) {
        if (batchStatus.current) {
            currentTaskEl.textContent = `Текущая задача: ${batchStatus.current}`;
            currentTaskEl.style.display = 'block';
        } else {
            currentTaskEl.style.display = 'none';
        }
    }
}

function updateCurrentTask(task) {
    const currentTaskEl = document.getElementById('current-task');
    if (currentTaskEl && task) {
        currentTaskEl.textContent = `Текущая задача: ${task.id || task.type || 'unknown'}`;
        currentTaskEl.style.display = 'block';
    }
}

function updatePauseButton() {
    const pauseBtn = document.getElementById('btn-pause');
    const resumeBtn = document.getElementById('btn-resume');
    
    if (pauseBtn) {
        pauseBtn.style.display = (isRunning && !isPaused) ? 'inline-block' : 'none';
    }
    
    if (resumeBtn) {
        resumeBtn.style.display = (isRunning && isPaused) ? 'inline-block' : 'none';
    }
}

function startStatusUpdates() {
    setInterval(async () => {
        try {
            const response = await fetch(`${API_BASE}/status`);
            const data = await response.json();
            
            // Обновление метрик
            if (data.memory) {
                const memoryPercent = Math.round(data.memory.percent || 0);
                const memoryEl = document.getElementById('progress-memory');
                const memoryTextEl = document.getElementById('progress-memory-text');
                if (memoryEl) memoryEl.style.width = `${memoryPercent}%`;
                if (memoryTextEl) memoryTextEl.textContent = `${memoryPercent}%`;
            }
            
            if (data.pages) {
                updatePageStatsData(data.pages);
            }
            
        } catch (error) {
            console.error('Status update error:', error);
        }
    }, 5000);
}

function startBatchStatusUpdates() {
    setInterval(async () => {
        if (isRunning) {
            try {
                const response = await fetch(`${API_BASE}/batch/status`);
                const data = await response.json();
                
                if (data.progress) {
                    batchStatus = {
                        completed: data.progress.completed || 0,
                        total: data.progress.total || 0,
                        failed: data.progress.failed || 0,
                        current: data.progress.current || null
                    };
                    isPaused = data.isPaused || false;
                    updateBatchProgress();
                    updatePauseButton();
                }
            } catch (error) {
                console.error('Batch status update error:', error);
            }
        }
    }, 2000);
}

function updatePageStatsData(pages) {
    const generatedEl = document.getElementById('metric-generated');
    const publishedEl = document.getElementById('metric-published');
    const qualityEl = document.getElementById('metric-quality');
    const indexedEl = document.getElementById('metric-indexed');
    
    if (generatedEl && pages.generated !== undefined) {
        generatedEl.textContent = pages.generated || 0;
    }
    if (publishedEl && pages.published !== undefined) {
        publishedEl.textContent = pages.published || 0;
    }
    if (qualityEl && pages.quality !== undefined) {
        const qualityPercent = Math.round(pages.quality * 100);
        qualityEl.textContent = `${qualityPercent}%`;
    }
    if (indexedEl && pages.indexed !== undefined) {
        indexedEl.textContent = pages.indexed || 0;
    }
}

async function updatePageStats() {
    try {
        const response = await fetch(`${API_BASE}/page-stats`);
        const data = await response.json();
        updatePageStatsData(data);
    } catch (error) {
        console.error('Failed to update page stats:', error);
    }
}

function clearResults() {
    batchStatus = { completed: 0, total: 0, failed: 0, current: null };
    updateBatchProgress();
}

async function handleInitKnowledge() {
    try {
        const response = await fetch(`${API_BASE}/init`, {
            method: 'POST'
        });
        const data = await response.json();
        showToast(data.message || 'Knowledge Core инициализирован', 'success');
    } catch (error) {
        showToast(`Ошибка: ${error.message}`, 'error');
    }
}

async function handleExportReport() {
    showToast('Экспорт отчёта (в разработке)', 'info');
}

function loadLogs() {
    // Загрузка логов при необходимости
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container') || document.body;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}





