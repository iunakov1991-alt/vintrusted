const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Build Coordinator
 * Разбивает большой билд на параллельные подбилды для ускорения
 * TRIZ Принцип 13 (Наоборот): вместо одного большого - несколько маленьких
 */
class BuildCoordinator {
  constructor(config) {
    this.config = config;
    this.buildScript = path.join(__dirname, '../seo-master-build.js');
    this.maxParallelBuilds = 5; // 5 параллельных билдов
  }

  /**
   * Разделение штатов на батчи для параллельных билдов
   */
  splitStatesIntoBatches(states) {
    const batches = [];
    const batchSize = Math.ceil(states.length / this.maxParallelBuilds);
    
    for (let i = 0; i < states.length; i += batchSize) {
      batches.push(states.slice(i, i + batchSize));
    }
    
    return batches;
  }

  /**
   * Запуск одного подбилда с фильтрацией по штатам
   */
  async runSubBuild(batchIndex, stateSlugs, totalBatches) {
    return new Promise((resolve, reject) => {
      log('COORDINATOR', `Starting sub-build ${batchIndex + 1}/${totalBatches} for states: ${stateSlugs.join(', ')}`);
      
      const env = {
        ...process.env,
        SEO_BUILD_BATCH: batchIndex + 1,
        SEO_BUILD_STATES: stateSlugs.join(','),
        SEO_BUILD_TOTAL_BATCHES: totalBatches.toString()
      };
      
      const startTime = Date.now();
      const child = spawn('node', [this.buildScript], {
        env,
        stdio: ['inherit', 'pipe', 'pipe'],
        cwd: process.cwd()
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
        process.stdout.write(`[BUILD-${batchIndex + 1}] ${data}`);
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
        process.stderr.write(`[BUILD-${batchIndex + 1}] ${data}`);
      });
      
      child.on('close', (code) => {
        const duration = Date.now() - startTime;
        if (code === 0) {
          log('COORDINATOR', `Sub-build ${batchIndex + 1}/${totalBatches} completed in ${Math.round(duration / 1000)}s`);
          resolve({ batchIndex, stateSlugs, duration, success: true });
        } else {
          log('COORDINATOR', `Sub-build ${batchIndex + 1}/${totalBatches} failed with code ${code}`);
          reject({ batchIndex, stateSlugs, duration, success: false, code, stderr });
        }
      });
      
      child.on('error', (err) => {
        log('COORDINATOR', `Sub-build ${batchIndex + 1}/${totalBatches} error: ${err.message}`);
        reject({ batchIndex, stateSlugs, error: err });
      });
    });
  }

  /**
   * Запуск всех параллельных билдов
   */
  async runParallelBuilds() {
    // Загружаем seeds для получения списка штатов
    const seedsPath = path.join(process.cwd(), 'data/seo/url-seeds.json');
    let seeds = { states: [] };
    
    try {
      if (fs.existsSync(seedsPath)) {
        seeds = JSON.parse(fs.readFileSync(seedsPath, 'utf8'));
      }
    } catch (e) {
      log('COORDINATOR', `Error loading seeds: ${e.message}`);
    }
    
    const states = seeds.states || [];
    if (states.length === 0) {
      log('COORDINATOR', 'No states found, running single build');
      return this.runSingleBuild();
    }
    
    // Разделяем штаты на батчи
    const stateBatches = this.splitStatesIntoBatches(states);
    log('COORDINATOR', `Splitting ${states.length} states into ${stateBatches.length} parallel builds`);
    
    // Запускаем все билды параллельно
    const startTime = Date.now();
    const buildPromises = stateBatches.map((batch, index) => {
      const stateSlugs = batch.map(s => typeof s === 'string' ? s : s.slug);
      return this.runSubBuild(index, stateSlugs, stateBatches.length);
    });
    
    try {
      const results = await Promise.allSettled(buildPromises);
      const duration = Date.now() - startTime;
      
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
      
      log('COORDINATOR', `All builds completed: ${successful} successful, ${failed} failed, total time: ${Math.round(duration / 1000)}s`);
      
      // Объединяем sitemaps после всех билдов
      await this.mergeSitemaps();
      
      return {
        totalBatches: stateBatches.length,
        successful,
        failed,
        duration,
        results: results.map((r, i) => ({
          batch: i + 1,
          status: r.status,
          value: r.status === 'fulfilled' ? r.value : r.reason
        }))
      };
    } catch (e) {
      log('COORDINATOR', `Error in parallel builds: ${e.message}`);
      throw e;
    }
  }

  /**
   * Запуск одиночного билда (fallback)
   */
  async runSingleBuild() {
    return new Promise((resolve, reject) => {
      log('COORDINATOR', 'Running single build (no parallelization)');
      const child = spawn('node', [this.buildScript], {
        env: process.env,
        stdio: 'inherit',
        cwd: process.cwd()
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          reject({ success: false, code });
        }
      });
      
      child.on('error', (err) => {
        reject({ error: err });
      });
    });
  }

  /**
   * Объединение sitemaps от всех билдов
   */
  async mergeSitemaps() {
    log('COORDINATOR', 'Merging sitemaps from all builds...');
    // TODO: Реализовать объединение sitemaps
    // Пока просто логируем
  }
}

module.exports = { BuildCoordinator };

