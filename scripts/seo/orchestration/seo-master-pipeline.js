const fs = require('fs');
const path = require('path');
const { log, error } = require('../logger');
const { StaticArchitecture } = require('../platform/static-architecture');

/**
 * SEO MONSTER 6.0: Master Pipeline
 * Главный оркестратор всех этапов генерации
 */
class SEOMasterPipeline {
  constructor() {
    this.configPath = path.join(process.cwd(), 'data/seo/config.json');
    this.config = this.loadConfig();
    this.staticArch = new StaticArchitecture(this.config);
    this.stages = [];
  }

  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      }
    } catch (e) {
      error('PIPELINE', 'Config load error', e);
    }
    return {
      targetPagesPerBuild: 10000,
      minQualityScore: 0.75,
      languages: ['en', 'es']
    };
  }

  /**
   * Регистрация этапа пайплайна
   */
  registerStage(name, handler) {
    this.stages.push({ name, handler });
    log('PIPELINE', `Stage registered: ${name}`);
  }

  /**
   * Выполнение пайплайна
   */
  async execute() {
    const startedAt = new Date().toISOString();
    const startMs = Date.now();
    
    log('PIPELINE', 'Starting SEO MONSTER 6.0 pipeline', {
      stages: this.stages.length,
      targetPages: this.config.targetPagesPerBuild
    });

    const context = {
      config: this.config,
      startedAt,
      startMs,
      pages: [],
      metrics: {}
    };

    try {
      // Выполняем все этапы последовательно
      for (const stage of this.stages) {
        log('PIPELINE', `Executing stage: ${stage.name}`);
        const stageStart = Date.now();
        
        await stage.handler(context);
        
        const stageDuration = Date.now() - stageStart;
        log('PIPELINE', `Stage completed: ${stage.name}`, {
          duration: `${stageDuration}ms`
        });
      }

      const duration = Date.now() - startMs;
      log('PIPELINE', 'Pipeline completed', {
        duration: `${duration}ms`,
        pagesGenerated: context.pages.length
      });

      return context;
    } catch (e) {
      error('PIPELINE', 'Pipeline execution failed', e);
      throw e;
    }
  }
}

module.exports = { SEOMasterPipeline };

