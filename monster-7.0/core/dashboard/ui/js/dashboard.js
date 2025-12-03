/**
 * Monster 7.0 Dashboard - Ready to Use
 */

const API_BASE = '/api';
const socket = io();

// State
let isRunning = false;
let currentTasks = [];
let lastResults = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeDashboard();
    setupEventListeners();
    setupWebSocket();
    setupNavigation();
    restoreState(); // Восстановление состояния после перезагрузки
    startStatusUpdates();
    loadModules();
    loadLogs();
});

function initializeDashboard() {
    updateStatus('ready', 'Готов');
    showToast('Дашборд загружен', 'success');
}

/**
 * Восстановление состояния после перезагрузки страницы
 */
async function restoreState() {
    try {
        const response = await fetch(`${API_BASE}/status`);
        const data = await response.json();
        
        // Восстановление статуса запуска
        if (data.isRunning) {
            isRunning = true;
            updateStatus('running', 'Выполняется...');
            showToast('Восстановлено: генератор работает', 'info');
        } else {
            isRunning = false;
            updateStatus('ready', 'Готов');
        }
        
        // Восстановление задач
        try {
            const tasksResponse = await fetch(`${API_BASE}/tasks`);
            const tasksData = await tasksResponse.json();
            if (tasksData.tasks && tasksData.tasks.length > 0) {
                currentTasks = tasksData.tasks;
                updateTasks();
                
                // Восстановление прогресса
                const activeTasks = tasksData.tasks.filter(t => t.status === 'running');
                if (activeTasks.length > 0) {
                    const progressContainer = document.getElementById('progress-steps');
                    const emptyState = progressContainer.querySelector('.empty-state');
                    if (emptyState) emptyState.remove();
                    
                    activeTasks.forEach(task => {
                        updateProgressStep({
                            step: task.module || '?',
                            name: task.module || 'Неизвестный модуль'
                        });
                    });
                }
            }
        } catch (error) {
            console.warn('Не удалось восстановить задачи:', error);
        }
        
        // Восстановление статистики страниц
        updatePageStats();
        
    } catch (error) {
        console.error('Ошибка восстановления состояния:', error);
    }
}

function setupEventListeners() {
    document.getElementById('btn-start').addEventListener('click', handleStart);
    document.getElementById('btn-rebuild').addEventListener('click', () => runModule('strategyGenerator', { action: 'rebuild' }));
    document.getElementById('btn-learn').addEventListener('click', () => runModule('performanceLearner', { action: 'learn' }));
    document.getElementById('btn-evolve').addEventListener('click', () => runModule('evolutionEngine', { action: 'evolve' }));
    document.getElementById('btn-repair').addEventListener('click', () => runModule('trizRepair', { action: 'repair' }));
    document.getElementById('btn-update').addEventListener('click', () => runModule('libraryScanner', { action: 'update' }));
    document.getElementById('btn-init-knowledge').addEventListener('click', handleInitKnowledge);
    document.getElementById('btn-export').addEventListener('click', handleExportReport);
    document.getElementById('btn-stop').addEventListener('click', handleStop);
    document.getElementById('btn-submit-feedback').addEventListener('click', handleSubmitFeedback);
    setupMaterialsUpload();
}

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabs = document.querySelectorAll('.tab-content');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = item.dataset.tab;
            
            navItems.forEach(ni => ni.classList.remove('active'));
            item.classList.add('active');
            
            tabs.forEach(t => t.classList.remove('active'));
            document.getElementById(`${tab}-tab`).classList.add('active');
        });
    });
}

function setupWebSocket() {
    socket.on('connect', () => {
        console.log('WebSocket подключен');
        // После подключения восстанавливаем состояние
        restoreState();
    });
    
    socket.on('disconnect', () => {
        console.log('WebSocket отключен');
        showToast('Соединение потеряно. Переподключение...', 'warning');
    });

    socket.on('task:started', (task) => {
        addTask(task);
        updateTasks();
        showToast(`Задача запущена: ${task.module}`, 'info');
    });

    socket.on('task:running', (task) => {
        updateTask(task);
        updateTasks();
        updateProgress(task);
    });

    socket.on('task:completed', (task) => {
        updateTask(task);
        updateTasks();
        showToast(`Задача завершена: ${task.module}`, 'success');
    });

    socket.on('task:failed', (task) => {
        updateTask(task);
        updateTasks();
        showToast(`Задача провалена: ${task.module}`, 'error');
    });

    socket.on('cycle:step', (step) => {
        updateProgressStep(step);
    });

    socket.on('cycle:completed', (results) => {
        isRunning = false;
        updateStatus('ready', 'Завершено');
        showResults(results);
        showQuestions(results.questions || []);
        showToast('Цикл успешно завершен!', 'success');
    });

    socket.on('cycle:failed', (error) => {
        isRunning = false;
        updateStatus('error', 'Ошибка');
        showToast('Цикл завершился с ошибкой', 'error');
    });
}

async function handleStart() {
    if (isRunning) {
        showToast('Генератор уже запущен!', 'warning');
        return;
    }

    isRunning = true;
    updateStatus('running', 'Выполняется...');
    clearResults();

    try {
        const response = await fetch(`${API_BASE}/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fromDashboard: true })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error);
        }

        showToast('Цикл успешно запущен!', 'success');
    } catch (error) {
        showToast(`Ошибка: ${error.message}`, 'error');
        isRunning = false;
        updateStatus('error', 'Ошибка');
    }
}

async function handleStop() {
    try {
        await fetch(`${API_BASE}/stop`, { method: 'POST' });
        isRunning = false;
        updateStatus('ready', 'Остановлено');
        showToast('Все задачи остановлены', 'info');
    } catch (error) {
        showToast(`Ошибка: ${error.message}`, 'error');
    }
}

async function handleInitKnowledge() {
    try {
        showToast('Инициализация базы знаний...', 'info');
        const response = await fetch(`${API_BASE}/init-knowledge`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error);
        }

        showToast('База знаний успешно инициализирована!', 'success');
    } catch (error) {
        showToast(`Ошибка: ${error.message}`, 'error');
    }
}

async function handleExportReport() {
    if (!lastResults) {
        showToast('Нет результатов для экспорта', 'warning');
        return;
    }

    const format = prompt('Формат экспорта (json/html/markdown):', 'json');
    if (!format) return;

    try {
        const response = await fetch(`${API_BASE}/export-report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                results: lastResults,
                format
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error);
        }

        showToast(`Report exported to: ${data.path}`, 'success');
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
}

async function runModule(moduleName, params = {}) {
    try {
        const response = await fetch(`${API_BASE}/module/${moduleName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...params, fromDashboard: true })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error);
        }

        showToast(`Модуль ${moduleName} выполнен`, 'success');
    } catch (error) {
        showToast(`Ошибка: ${error.message}`, 'error');
    }
}

async function handleSubmitFeedback() {
    const answer = document.getElementById('feedback-answer').value;
    const question = document.querySelector('.question.active')?.dataset.question;

    if (!answer || !question) {
        showToast('Пожалуйста, введите ответ', 'warning');
        return;
    }

    try {
        await fetch(`${API_BASE}/feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question,
                answer,
                context: {}
            })
        });

        document.getElementById('feedback-answer').value = '';
        document.getElementById('feedback-form').style.display = 'none';
        showToast('Обратная связь успешно отправлена!', 'success');
    } catch (error) {
        showToast(`Ошибка: ${error.message}`, 'error');
    }
}

function updateStatus(status, text) {
    const dot = document.getElementById('status-dot');
    const textEl = document.getElementById('status-text');

    dot.className = `status-dot ${status}`;
    textEl.textContent = text;
}

function updateProgressStep(step) {
    const container = document.getElementById('progress-steps');
    
    const emptyState = container.querySelector('.empty-state');
    if (emptyState) emptyState.remove();

    const stepEl = document.createElement('div');
    stepEl.className = 'step active';
    stepEl.innerHTML = `
        <div class="step-icon">${step.step}</div>
        <div class="step-text">${step.name}</div>
        <div class="step-status">Выполняется...</div>
    `;
    container.appendChild(stepEl);
    container.scrollTop = container.scrollHeight;
}

function addTask(task) {
    currentTasks.push(task);
}

function updateTask(task) {
    const index = currentTasks.findIndex(t => t.id === task.id);
    if (index !== -1) {
        currentTasks[index] = task;
    }
}

function updateTasks() {
    const running = currentTasks.filter(t => t.status === 'running').length;
    const completed = currentTasks.filter(t => t.status === 'completed').length;
    const failed = currentTasks.filter(t => t.status === 'failed').length;

    document.getElementById('metric-tasks').textContent = running;
    document.getElementById('tasks-completed').textContent = completed;
    document.getElementById('tasks-failed').textContent = failed;
    document.getElementById('header-tasks').textContent = running;
}

async function startStatusUpdates() {
    // Обновление статистики страниц сразу
    updatePageStats();
    
    setInterval(async () => {
        try {
            const response = await fetch(`${API_BASE}/status`);
            const data = await response.json();

            // Memory
            const memoryPercent = data.memory.percent;
            document.getElementById('progress-memory').style.width = `${memoryPercent}%`;
            document.getElementById('progress-memory-text').textContent = `${memoryPercent}%`;
            document.getElementById('metric-memory').textContent = `${data.memory.used} MB`;
            
            // Page Stats
            if (data.pages) {
                updatePageStatsData(data.pages);
            }
            document.getElementById('header-memory').textContent = `${memoryPercent}%`;

            // CPU
            const cpuPercent = data.performance ? 
                Math.min(100, (data.performance.cpuUser + data.performance.cpuSystem) * 10) :
                Math.min(100, memoryPercent + 10);
            document.getElementById('progress-cpu').style.width = `${cpuPercent}%`;
            document.getElementById('progress-cpu-text').textContent = `${cpuPercent}%`;
            document.getElementById('metric-cpu').textContent = `${cpuPercent}%`;
            document.getElementById('header-cpu').textContent = `${cpuPercent}%`;

        } catch (error) {
            console.error('Status update error:', error);
        }
    }, 2000);
    
    // Обновление статистики страниц каждые 10 секунд
    setInterval(updatePageStats, 10000);
    
    // Первоначальная загрузка статистики
    updatePageStats();
}

/**
 * Обновление статистики страниц
 */
async function updatePageStats() {
    try {
        const response = await fetch(`${API_BASE}/page-stats`);
        const data = await response.json();
        updatePageStatsData(data);
    } catch (error) {
        console.error('Error updating page stats:', error);
    }
}

/**
 * Обновление данных статистики страниц в UI
 */
function updatePageStatsData(stats) {
    if (!stats) return;
    
    // Сгенерировано страниц
    const generated = stats.totalGenerated || 0;
    const generatedEl = document.getElementById('metric-generated');
    if (generatedEl) generatedEl.textContent = generated;
    
    // Опубликовано страниц
    const published = stats.totalPublished || 0;
    const publishedEl = document.getElementById('metric-published');
    if (publishedEl) publishedEl.textContent = published;
    
    // Качество страниц
    const quality = stats.averageQuality || 0;
    const qualityPercent = Math.round(quality * 100);
    const qualityEl = document.getElementById('metric-quality');
    const qualityProgressEl = document.getElementById('progress-quality');
    const qualityTextEl = document.getElementById('progress-quality-text');
    
    if (qualityEl) qualityEl.textContent = `${qualityPercent}%`;
    if (qualityProgressEl) qualityProgressEl.style.width = `${qualityPercent}%`;
    if (qualityTextEl) qualityTextEl.textContent = `${qualityPercent}%`;
    
    // Проиндексировано Google
    const indexed = stats.indexedByGoogle || 0;
    const indexedEl = document.getElementById('metric-indexed');
    if (indexedEl) indexedEl.textContent = indexed;
    
    // Обновление тренда индексации
    const indexedTrend = document.getElementById('indexed-trend');
    if (indexedTrend) {
        if (indexed > 0 && generated > 0) {
            const indexedPercent = Math.round((indexed / generated) * 100);
            indexedTrend.textContent = `${indexedPercent}% от сгенерированных`;
        } else {
            indexedTrend.textContent = 'Google';
        }
    }
}

function showResults(results) {
    lastResults = results;
    const container = document.getElementById('results-content');
    
    const emptyState = container.querySelector('.empty-state');
    if (emptyState) emptyState.remove();
    
    let html = '<div class="results-summary">';
    
    if (results.semanticMap?.result) {
        const sm = results.semanticMap.result;
        html += `<div class="result-section">
            <h3>Семантическая карта</h3>
            <p><strong>Темы:</strong> ${sm.themes?.length || 0}</p>
            <p><strong>Кластеры:</strong> ${sm.clusters?.length || 0}</p>
            <p><strong>Ключевые слова:</strong> ${sm.keywords?.length || 0}</p>
            <p><strong>Покрытие:</strong> ${sm.coverage?.overall || 0}%</p>
        </div>`;
    }
    
    if (results.strategy?.result) {
        const st = results.strategy.result;
        html += `<div class="result-section">
            <h3>Стратегия</h3>
            <p><strong>Целевые страницы:</strong> ${st.targetPages || 0}</p>
            <p><strong>Приоритеты:</strong> ${st.priorities?.length || 0}</p>
            <p><strong>Кластеры:</strong> ${st.clusters?.length || 0}</p>
        </div>`;
    }
    
    if (results.content?.result) {
        const ct = results.content.result;
        html += `<div class="result-section">
            <h3>Генерация контента</h3>
            <p><strong>Сгенерировано:</strong> ${ct.stats?.generated || 0}</p>
            <p><strong>Из кеша:</strong> ${ct.stats?.cached || 0}</p>
            <p><strong>Ошибок:</strong> ${ct.stats?.errors || 0}</p>
        </div>`;
    }
    
    html += '</div>';
    html += `<details style="margin-top: 20px;"><summary style="cursor: pointer; color: var(--primary);">Полные результаты (JSON)</summary><pre style="margin-top: 10px; padding: 15px; background: var(--bg-hover); border-radius: 8px; overflow-x: auto;">${JSON.stringify(results, null, 2)}</pre></details>`;
    
    container.innerHTML = html;
}

function showQuestions(questions) {
    const container = document.getElementById('feedback-questions');
    
    if (questions.length === 0) {
        container.innerHTML = '<div class="empty-state"><span class="empty-icon">❓</span><span class="empty-text">Нет вопросов</span></div>';
        return;
    }
    
    container.innerHTML = '';
    
    questions.forEach((q, index) => {
        const questionEl = document.createElement('div');
        questionEl.className = 'question';
        questionEl.dataset.question = q.question;
        questionEl.innerHTML = `
            <div class="question-header">
                <span class="question-priority ${q.priority}">${q.priority}</span>
                <span>${q.type}</span>
            </div>
            <div class="question-text">${q.question}</div>
            ${q.context?.suggestions ? `
                <div class="question-suggestions">
                    <strong>Предложения:</strong>
                    <ul>
                        ${q.context.suggestions.map(s => `<li>${s}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            <button class="btn btn-primary" onclick="answerQuestion(${index})" style="margin-top: 12px;">
                <span>Answer</span>
            </button>
        `;
        container.appendChild(questionEl);
    });
}

function answerQuestion(index) {
    const questions = document.querySelectorAll('.question');
    const question = questions[index];
    
    if (question) {
        questions.forEach(q => q.classList.remove('active'));
        question.classList.add('active');
        document.getElementById('feedback-answer').value = '';
        document.getElementById('feedback-form').style.display = 'block';
        document.getElementById('feedback-answer').focus();
    }
}

function clearResults() {
    document.getElementById('results-content').innerHTML = '<div class="empty-state"><span class="empty-icon">📊</span><span class="empty-text">Нет результатов. Нажмите СТАРТ для начала.</span></div>';
    document.getElementById('progress-steps').innerHTML = '<div class="empty-state"><span class="empty-icon">📭</span><span class="empty-text">Нет активных задач</span></div>';
    currentTasks = [];
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ'
    };
    
    toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${message}</span>`;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

async function loadModules() {
    const modules = [
        { name: 'Семантический сканер', id: 'semanticScanner', icon: '🔍' },
        { name: 'Генератор стратегии', id: 'strategyGenerator', icon: '♟' },
        { name: 'Движок промптов', id: 'promptEngine', icon: '🎯' },
        { name: 'Движок эволюции', id: 'evolutionEngine', icon: '🧬' },
        { name: 'TRIZ ремонт', id: 'trizRepair', icon: '🔧' },
        { name: 'Сканер библиотек', id: 'libraryScanner', icon: '📚' },
        { name: 'AI база знаний', id: 'aiKnowledgeCore', icon: '🧠' },
        { name: 'Обучающий модуль', id: 'performanceLearner', icon: '🎓' },
        { name: 'Генератор контента', id: 'contentGenerator', icon: '📝' }
    ];
    
    const container = document.getElementById('modules-grid');
    container.innerHTML = modules.map(module => `
        <div class="module-card">
            <div class="module-header">
                <div class="module-name">
                    <span>${module.icon}</span>
                    <span>${module.name}</span>
                </div>
                <span class="module-status">Включен</span>
            </div>
            <div style="margin-top: 8px; color: var(--text-muted); font-size: 0.85rem;">
                ID: ${module.id}
            </div>
        </div>
    `).join('');
}

async function loadLogs() {
    try {
        const response = await fetch(`${API_BASE}/logs?limit=50`);
        const data = await response.json();
        
        const container = document.getElementById('logs-content');
        if (data.logs && data.logs.length > 0) {
            container.innerHTML = data.logs.map(log => `
                <div class="log-entry log-${log.level.toLowerCase()}">
                    <span class="log-time">${new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span class="log-level">${log.level}</span>
                    <span class="log-module">[${log.module}]</span>
                    <span class="log-message">${log.message}</span>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div class="empty-state"><span class="empty-icon">📋</span><span class="empty-text">Логов пока нет</span></div>';
        }
    } catch (error) {
        console.error('Error loading logs:', error);
    }
}

// ============================================
// LEARNING MATERIALS UPLOAD
// ============================================

let selectedFiles = [];

function setupMaterialsUpload() {
    const fileInput = document.getElementById('material-files');
    const dropzone = document.querySelector('.file-upload-dropzone');
    const submitBtn = document.getElementById('btn-submit-materials');
    const clearBtn = document.getElementById('btn-clear-materials');
    
    // File input change
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });
    
    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });
    
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files);
        handleFiles(files);
    });
    
    // Submit button
    submitBtn.addEventListener('click', handleSubmitMaterials);
    
    // Clear button
    clearBtn.addEventListener('click', handleClearMaterials);
}

function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    handleFiles(files);
}

function handleFiles(files) {
    const validFiles = files.filter(file => {
        const ext = file.name.split('.').pop().toLowerCase();
        const allowed = ['txt', 'md', 'pdf', 'doc', 'docx', 'json', 'csv'];
        return allowed.includes(ext);
    });
    
    if (validFiles.length !== files.length) {
        showToast('Некоторые файлы пропущены (неподдерживаемый формат)', 'warning');
    }
    
    selectedFiles = [...selectedFiles, ...validFiles];
    updateFileList();
}

function updateFileList() {
    const fileList = document.getElementById('file-list');
    
    if (selectedFiles.length === 0) {
        fileList.innerHTML = '';
        return;
    }
    
    fileList.innerHTML = selectedFiles.map((file, index) => {
        const size = formatFileSize(file.size);
        const icon = getFileIcon(file.name);
        return `
            <div class="file-item">
                <div class="file-item-info">
                    <span class="file-item-icon">${icon}</span>
                    <span class="file-item-name">${file.name}</span>
                    <span class="file-item-size">${size}</span>
                </div>
                <button class="file-item-remove" onclick="removeFile(${index})" title="Remove">✕</button>
            </div>
        `;
    }).join('');
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    updateFileList();
    
    // Update file input
    const fileInput = document.getElementById('material-files');
    const dt = new DataTransfer();
    selectedFiles.forEach(file => dt.items.add(file));
    fileInput.files = dt.files;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
        'txt': '📄',
        'md': '📝',
        'pdf': '📕',
        'doc': '📘',
        'docx': '📘',
        'json': '📋',
        'csv': '📊'
    };
    return icons[ext] || '📎';
}

async function handleSubmitMaterials() {
    const textInput = document.getElementById('material-text').value.trim();
    const statusDiv = document.getElementById('materials-status');
    
    if (!textInput && selectedFiles.length === 0) {
        showToast('Пожалуйста, введите текст или прикрепите файлы', 'warning');
        return;
    }
    
    // Show loading status
    statusDiv.style.display = 'block';
    statusDiv.className = 'materials-status info';
    statusDiv.textContent = 'Обработка материалов...';
    
    try {
        const formData = new FormData();
        
        // Add text
        if (textInput) {
            formData.append('text', textInput);
        }
        
        // Add files
        selectedFiles.forEach((file, index) => {
            formData.append(`files`, file);
        });
        
        const response = await fetch(`${API_BASE}/learn-materials`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            statusDiv.className = 'materials-status success';
            statusDiv.textContent = `✅ Успешно обработано ${result.processed || 0} материалов. AI обучается...`;
            showToast('Материалы успешно отправлены!', 'success');
            
            // Clear form after success
            setTimeout(() => {
                handleClearMaterials();
            }, 2000);
        } else {
            throw new Error(result.error || 'Не удалось обработать материалы');
        }
    } catch (error) {
        statusDiv.className = 'materials-status error';
        statusDiv.textContent = `❌ Ошибка: ${error.message}`;
        showToast('Не удалось отправить материалы', 'error');
    }
}

function handleClearMaterials() {
    document.getElementById('material-text').value = '';
    selectedFiles = [];
    updateFileList();
    
    // Clear file input
    const fileInput = document.getElementById('material-files');
    fileInput.value = '';
    
    // Hide status
    document.getElementById('materials-status').style.display = 'none';
}

// Make removeFile available globally
window.removeFile = removeFile;

window.answerQuestion = answerQuestion;
