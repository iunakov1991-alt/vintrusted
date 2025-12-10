#!/usr/bin/env node
/**
 * Smart Hybrid Deploy Manager
 * 
 * Управляет инкрементальными деплоями на основе умной логики:
 * - Деплой каждые N страниц
 * - Деплой каждые M минут
 * - Пропуск деплоя если батч почти завершён
 * - Проверка наличия изменений перед деплоем
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SmartDeployManager {
  constructor(config = {}) {
    this.config = {
      strategy: config.strategy || 'batch', // 'batch', 'incremental', 'smart'
      everyPages: config.everyPages || 10,
      everyMinutes: config.everyMinutes || 15,
      minRemainingTime: config.minRemainingTime || 5, // минут
      enabled: config.enabled !== false,
      batchId: config.batchId || null,
      totalPages: config.totalPages || 0,
      avgTimePerPage: config.avgTimePerPage || 90 // секунд
    };
    
    this.state = {
      pagesSinceLastDeploy: 0,
      lastDeployTime: Date.now(),
      totalDeployed: 0,
      deploysCount: 0,
      completedPages: 0
    };
    
    this.rootDir = path.resolve(__dirname, '..');
    this.logPrefix = '[SMART-DEPLOY]';
  }
  
  /**
   * Проверить нужен ли деплой сейчас
   */
  shouldDeploy() {
    if (!this.config.enabled) {
      return false;
    }
    
    // Batch strategy - деплоим только в конце
    if (this.config.strategy === 'batch') {
      return false;
    }
    
    // Incremental strategy - деплоим каждый раз
    if (this.config.strategy === 'incremental') {
      return this.state.pagesSinceLastDeploy > 0;
    }
    
    // Smart strategy - умная логика
    if (this.config.strategy === 'smart') {
      return this._shouldDeploySmart();
    }
    
    return false;
  }
  
  /**
   * Умная логика определения необходимости деплоя
   */
  _shouldDeploySmart() {
    const remaining = this.config.totalPages - this.state.completedPages;
    const estimatedTimeLeft = (remaining * this.config.avgTimePerPage) / 60; // в минутах
    
    // Пропускаем если батч почти завершён
    if (estimatedTimeLeft < this.config.minRemainingTime) {
      this.log(`Skipping deploy (${estimatedTimeLeft.toFixed(1)} min left, threshold: ${this.config.minRemainingTime} min)`);
      return false;
    }
    
    // Проверяем триггеры
    const pagesTrigger = this.state.pagesSinceLastDeploy >= this.config.everyPages;
    const timeTrigger = (Date.now() - this.state.lastDeployTime) > (this.config.everyMinutes * 60 * 1000);
    
    if (pagesTrigger) {
      this.log(`Pages trigger: ${this.state.pagesSinceLastDeploy} >= ${this.config.everyPages}`);
      return true;
    }
    
    if (timeTrigger) {
      const minutesSinceLast = ((Date.now() - this.state.lastDeployTime) / 60000).toFixed(1);
      this.log(`Time trigger: ${minutesSinceLast} min >= ${this.config.everyMinutes} min`);
      return true;
    }
    
    return false;
  }
  
  /**
   * Проверить есть ли изменения для деплоя
   */
  hasChanges() {
    try {
      const status = execSync('git status --porcelain', { 
        cwd: this.rootDir,
        encoding: 'utf8'
      });
      
      // Проверяем есть ли изменения в semantic-pages
      const hasSemanticChanges = status.includes('public/semantic-pages/');
      
      if (!hasSemanticChanges) {
        this.log('No changes in semantic-pages, skipping deploy');
      }
      
      return hasSemanticChanges;
    } catch (err) {
      this.log(`Error checking git status: ${err.message}`);
      return false;
    }
  }
  
  /**
   * Выполнить деплой
   */
  async deploy(type = 'incremental') {
    if (!this.hasChanges()) {
      this.log('No changes detected, skipping deploy');
      return { success: false, reason: 'no_changes' };
    }
    
    this.log(`Starting ${type} deploy (batch: ${this.config.batchId})`);
    
    try {
      // Отправляем запрос на локальный дашборд
      const http = require('http');
      const postData = JSON.stringify({
        batchId: this.config.batchId,
        type: type,
        pagesDeployed: this.state.pagesSinceLastDeploy,
        totalDeployed: this.state.totalDeployed + this.state.pagesSinceLastDeploy
      });
      
      const result = await new Promise((resolve, reject) => {
        const req = http.request({
          hostname: 'localhost',
          port: 3030,
          path: '/api/local-deploy',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          }
        }, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            if (res.statusCode === 200) {
              try {
                resolve(JSON.parse(data));
              } catch (err) {
                resolve({ success: true, data });
              }
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            }
          });
        });
        
        req.on('error', reject);
        req.setTimeout(120000, () => { // 2 минуты таймаут
          req.destroy();
          reject(new Error('Deploy timeout'));
        });
        
        req.write(postData);
        req.end();
      });
      
      // Обновляем состояние
      this.state.totalDeployed += this.state.pagesSinceLastDeploy;
      this.state.pagesSinceLastDeploy = 0;
      this.state.lastDeployTime = Date.now();
      this.state.deploysCount++;
      
      this.log(`Deploy completed successfully (${this.state.deploysCount} total deploys)`);
      
      return { success: true, result };
    } catch (err) {
      this.log(`Deploy failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }
  
  /**
   * Уведомить о завершении страницы
   */
  onPageCompleted() {
    this.state.completedPages++;
    this.state.pagesSinceLastDeploy++;
    
    this.log(`Page completed (${this.state.completedPages}/${this.config.totalPages}, ${this.state.pagesSinceLastDeploy} since last deploy)`);
  }
  
  /**
   * Проверить и выполнить деплой если нужно
   */
  async checkAndDeploy() {
    if (this.shouldDeploy()) {
      this.log(`Triggering incremental deploy (${this.state.pagesSinceLastDeploy} pages ready)`);
      return await this.deploy('incremental');
    }
    
    return { success: false, reason: 'not_needed' };
  }
  
  /**
   * Финальный деплой в конце батча
   */
  async finalDeploy() {
    if (this.state.pagesSinceLastDeploy === 0) {
      this.log('No pages to deploy (all already deployed incrementally)');
      return { success: true, reason: 'already_deployed' };
    }
    
    this.log(`Final deploy (${this.state.pagesSinceLastDeploy} remaining pages)`);
    return await this.deploy('final');
  }
  
  /**
   * Получить статистику
   */
  getStats() {
    return {
      strategy: this.config.strategy,
      totalDeployed: this.state.totalDeployed,
      deploysCount: this.state.deploysCount,
      pagesSinceLastDeploy: this.state.pagesSinceLastDeploy,
      completedPages: this.state.completedPages,
      totalPages: this.config.totalPages,
      progress: this.config.totalPages > 0 
        ? Math.round((this.state.completedPages / this.config.totalPages) * 100)
        : 0
    };
  }
  
  /**
   * Логирование
   */
  log(message) {
    console.log(`${this.logPrefix} ${message}`);
  }
}

module.exports = SmartDeployManager;

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (command === 'test') {
    // Тестовый режим
    const manager = new SmartDeployManager({
      strategy: 'smart',
      everyPages: 5,
      everyMinutes: 2,
      totalPages: 30,
      batchId: 'test-batch',
      enabled: true
    });
    
    console.log('Testing Smart Deploy Manager...\n');
    
    // Симулируем генерацию страниц
    for (let i = 1; i <= 30; i++) {
      manager.onPageCompleted();
      
      if (manager.shouldDeploy()) {
        console.log(`\n>>> Would deploy now (page ${i})\n`);
        manager.state.pagesSinceLastDeploy = 0;
        manager.state.lastDeployTime = Date.now();
      }
      
      // Симулируем задержку
      if (i % 5 === 0) {
        console.log(`Progress: ${i}/30 pages\n`);
      }
    }
    
    console.log('\nFinal stats:', manager.getStats());
  } else {
    console.log('Usage: node smart-deploy-manager.js test');
  }
}
