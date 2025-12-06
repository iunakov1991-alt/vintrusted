#!/usr/bin/env node
/**
 * Watchdog для оркестратора MONSTER 8.0
 * Автоматически перезапускает оркестратор при сбое
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const ORCHESTRATOR_SCRIPT = path.join(ROOT_DIR, 'monster8_orchestrator.sh');
const CHECK_INTERVAL = 30000; // 30 секунд
const MAX_RESTARTS = 5; // Максимум перезапусков за час
const RESTART_WINDOW = 3600000; // 1 час

let restartCount = 0;
let restartWindowStart = Date.now();
let orchestratorProcess = null;
let isShuttingDown = false;

function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[WATCHDOG] ${timestamp} ${message}`);
  
  // Логируем в файл
  const logPath = path.join(ROOT_DIR, 'logs', 'watchdog.log');
  fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`);
}

function checkOrchestrator() {
  return new Promise((resolve) => {
    const checkProcess = spawn('pgrep', ['-f', 'monster8_orchestrator.sh'], {
      stdio: 'pipe',
      timeout: 2000
    });
    
    checkProcess.on('close', (code) => {
      resolve(code === 0);
    });
    
    checkProcess.on('error', () => {
      resolve(false);
    });
  });
}

function startOrchestrator() {
  if (isShuttingDown) return;
  
  log('Starting orchestrator...');
  
  orchestratorProcess = spawn('bash', [ORCHESTRATOR_SCRIPT], {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    detached: false
  });
  
  orchestratorProcess.on('exit', (code, signal) => {
    if (isShuttingDown) return;
    
    log(`Orchestrator exited with code ${code}, signal ${signal}`);
    
    // Проверяем лимит перезапусков
    const now = Date.now();
    if (now - restartWindowStart > RESTART_WINDOW) {
      restartCount = 0;
      restartWindowStart = now;
    }
    
    if (restartCount >= MAX_RESTARTS) {
      log(`ERROR: Max restarts (${MAX_RESTARTS}) reached in last hour. Stopping watchdog.`);
      process.exit(1);
    }
    
    restartCount++;
    log(`Restarting orchestrator (attempt ${restartCount}/${MAX_RESTARTS})...`);
    
    // Перезапускаем через 5 секунд
    setTimeout(() => {
      if (!isShuttingDown) {
        startOrchestrator();
      }
    }, 5000);
  });
  
  orchestratorProcess.on('error', (err) => {
    log(`ERROR: Failed to start orchestrator: ${err.message}`);
  });
}

async function monitor() {
  log('Watchdog started');
  
  // Проверяем каждые CHECK_INTERVAL миллисекунд
  setInterval(async () => {
    if (isShuttingDown) return;
    
    const isRunning = await checkOrchestrator();
    
    if (!isRunning && orchestratorProcess === null) {
      log('Orchestrator not running, starting...');
      startOrchestrator();
    } else if (!isRunning && orchestratorProcess && orchestratorProcess.killed) {
      log('Orchestrator process died, will restart on next check');
      orchestratorProcess = null;
    }
  }, CHECK_INTERVAL);
  
  // Начальный запуск
  const isRunning = await checkOrchestrator();
  if (!isRunning) {
    startOrchestrator();
  } else {
    log('Orchestrator already running');
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  log('Received SIGINT, shutting down gracefully...');
  isShuttingDown = true;
  
  if (orchestratorProcess) {
    orchestratorProcess.kill('SIGTERM');
    setTimeout(() => {
      if (orchestratorProcess && !orchestratorProcess.killed) {
        orchestratorProcess.kill('SIGKILL');
      }
      process.exit(0);
    }, 5000);
  } else {
    process.exit(0);
  }
});

process.on('SIGTERM', () => {
  log('Received SIGTERM, shutting down gracefully...');
  isShuttingDown = true;
  
  if (orchestratorProcess) {
    orchestratorProcess.kill('SIGTERM');
    setTimeout(() => {
      if (orchestratorProcess && !orchestratorProcess.killed) {
        orchestratorProcess.kill('SIGKILL');
      }
      process.exit(0);
    }, 5000);
  } else {
    process.exit(0);
  }
});

// Запуск
monitor().catch(err => {
  log(`FATAL ERROR: ${err.message}`);
  process.exit(1);
});
