const fs = require('fs');
const path = require('path');
const { log, error } = require('./logger');
const { SEOMasterPipeline } = require('./orchestration/seo-master-pipeline');
const { URLFactory } = require('./orchestration/url-factory');
const { LayoutEngineAbsolute } = require('./dom/layout-engine-absolute');
const { TemplateEngineAbsolute } = require('./dom/template-engine-absolute');
const { AIImageGenerator } = require('./images/ai-image-generator');
const { UniquenessEngine } = require('./uniqueness-engine');
const { BaselineBlocks } = require('./content/baseline-blocks');
const { AIAugmentation } = require('./content/ai-augmentation');
const { ClusterEngine } = require('./clusters/cluster-engine');
const { QualityEngine } = require('./quality/quality-engine');
const { WeightEngine } = require('./ltr/weight-engine');
const { StaticArchitecture } = require('./platform/static-architecture');
const { SitemapEngine } = require('./sitemap/sitemap-engine');
const { InternalLinksEngine } = require('./links/internal-links-engine');
const { KeywordExtractor } = require('./keywords/keyword-extractor');
const { KeywordAligner } = require('./keywords/keyword-aligner');
const { SmartEmbedder } = require('./keywords/smart-embedder');
const { AutoOptimizer } = require('./content/auto-optimizer');
const { BuildHistory } = require('./analytics/build-history');
const { Dashboard } = require('./analytics/dashboard');
const { ForecastEngine } = require('./analytics/forecast-engine');
const { GSCIntegration } = require('./analytics/gsc-integration');
const { ExternalMetrics } = require('./analytics/external-metrics');
const { ABTestEngine } = require('./testing/ab-test-engine');
const { CrawlBudgetEngine } = require('./crawl/crawl-budget-engine');
const { SelfDiagnosis } = require('./health/self-diagnosis');
const { AutoRepair } = require('./health/auto-repair');
const { I18nEngine } = require('./i18n/i18n-engine');

/**
 * SEO MONSTER 6.0: Master Build
 * Полная интеграция всех модулей
 */
async function main() {
  // Защита от множественных запусков на Vercel
  // Используем переменную окружения Vercel для однократного запуска
  const buildId = process.env.VERCEL || process.env.VERCEL_DEPLOYMENT_ID || 'local';
  const lockFile = path.join(process.cwd(), `.seo-build-${buildId}.lock`);
  const lockTimeout = 60000; // 60 секунд
  
  // Проверяем, был ли уже запущен build для этого deployment
  if (fs.existsSync(lockFile)) {
    const lockData = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
    const lockAge = Date.now() - lockData.timestamp;
    
    if (lockAge < lockTimeout) {
      log('MASTER', `SEO build already completed for this deployment (lock age: ${lockAge}ms), skipping...`);
      return;
    } else {
      // Старый lock, удаляем
      fs.unlinkSync(lockFile);
      log('MASTER', 'Removed stale lock file');
    }
  }
  
  // Создаем lock файл
  fs.writeFileSync(lockFile, JSON.stringify({ 
    timestamp: Date.now(),
    pid: process.pid,
    buildId: buildId
  }), 'utf8');
  
  // Удаляем lock при завершении
  const cleanup = () => {
    if (fs.existsSync(lockFile)) {
      try {
        fs.unlinkSync(lockFile);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  };
  process.on('exit', cleanup);
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  
  const startedAt = new Date().toISOString();
  const startMs = Date.now();

  log('MASTER', `Starting SEO MONSTER 6.0 build (buildId: ${buildId})`);

  try {
    // Загрузка конфигурации
    const configPath = path.join(process.cwd(), 'data/seo/config.json');
    let config = {};
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }

    // Загрузка RL state
    const rlStatePath = path.join(process.cwd(), 'data/seo/rl-state.json');
    let rlState = {
      intentWeights: {},
      languageWeights: {},
      clusterScores: {},
      layoutWeights: {}
    };
    if (fs.existsSync(rlStatePath)) {
      rlState = JSON.parse(fs.readFileSync(rlStatePath, 'utf8'));
    }

    // Инициализация компонентов
    const pipeline = new SEOMasterPipeline();
    const urlFactory = new URLFactory(config, rlState);
    const layoutEngine = new LayoutEngineAbsolute(config);
    const templateEngine = new TemplateEngineAbsolute(config);
    const aiImageGenerator = new AIImageGenerator(config);
    const uniquenessEngine = new UniquenessEngine(config);
    const baselineBlocks = new BaselineBlocks();
    const aiAugmentation = new AIAugmentation(config);
    const clusterEngine = new ClusterEngine();
    const qualityEngine = new QualityEngine(config);
    const weightEngine = new WeightEngine();
    const staticArch = new StaticArchitecture(config);
    const sitemapEngine = new SitemapEngine(config);
    const internalLinksEngine = new InternalLinksEngine(config);
    const keywordExtractor = new KeywordExtractor(config);
    const keywordAligner = new KeywordAligner(config);
    const smartEmbedder = new SmartEmbedder(config);
    const autoOptimizer = new AutoOptimizer(config);
    const buildHistory = new BuildHistory(config);
    const dashboard = new Dashboard(config);
    const forecastEngine = new ForecastEngine(config);
    const gscIntegration = new GSCIntegration(config);
    const externalMetrics = new ExternalMetrics(config);
    const abTestEngine = new ABTestEngine(config);
    const crawlBudgetEngine = new CrawlBudgetEngine(config);
    const selfDiagnosis = new SelfDiagnosis(config);
    const autoRepair = new AutoRepair(config);
    const i18nEngine = new I18nEngine(config);

    // Этап 0: Pre-build check: диагностика и автоисправление
    pipeline.registerStage('pre-build-check', async (ctx) => {
      log('STAGE', 'Pre-Build Check');
      const canProceed = await autoRepair.preBuildCheck();
      if (!canProceed) {
        throw new Error('Pre-build check failed. Critical issues detected.');
      }
      const diagnosis = selfDiagnosis.diagnose();
      ctx.diagnosis = diagnosis;
      log('STAGE', `Pre-build check completed. Status: ${diagnosis.status}, Score: ${diagnosis.score}`);
    });

    // Этап 1: Планирование URL
    pipeline.registerStage('url-planning', async (ctx) => {
      log('STAGE', 'URL Planning');
      const plan = urlFactory.buildUrlPlan();
      ctx.urlPlan = plan;
      ctx.pages = [];
    });

    // Этап 2: Генерация контента
    pipeline.registerStage('content-generation', async (ctx) => {
      log('STAGE', 'Content Generation');
      const concurrency = parseInt(process.env.SEO_BUILD_CONCURRENCY || '8', 10);
      
      async function generatePageContent(item) {
        // Baseline контент
        const baseline = baselineBlocks.generateBaselineContent(item);
        
        // AI augmentation
        const aiPrompt = `Write a detailed but generic explanation about "${item.intent}" for a vehicle VIN report in ${baselineBlocks.humanizeStateSlug(item.stateSlug)}. Focus on why this check matters, what buyers should pay attention to, and how it fits into a full history report. Never fabricate specific accidents or records.`;
        const aiText = await aiAugmentation.generateText(aiPrompt, {
          lang: item.lang,
          intent: item.intent,
          maxTokens: config.aiMaxTokens || 800
        });

        // Выбор layout
        const layout = layoutEngine.selectLayout(item, rlState.layoutWeights);

        // Формирование контекста страницы
        const stateLabel = baselineBlocks.humanizeStateSlug(item.stateSlug);
        const makeUpper = (item.make || '').toUpperCase();
        
        return {
          ...item,
          title: `VIN Check for ${item.year} ${makeUpper} in ${stateLabel} – Full Report`,
          description: `Instant VIN check for ${item.year} ${makeUpper} in ${stateLabel}. Review ownership, accident and title history before you buy.`,
          h1: `VIN report for ${item.year} ${makeUpper} in ${stateLabel}`,
          intro: `This page explains how to read a VIN report for a ${item.year} ${makeUpper} registered in ${stateLabel}, and why a detailed history check is important before you commit to a purchase.`,
          stateLabel,
          ...baseline,
          aiText,
          layout,
          blocks: layout.blocks
        };
      }

      // Генерация с конкурентностью
      const pages = [];
      const plan = ctx.urlPlan;
      const limit = Math.min(concurrency, plan.length);
      
      for (let i = 0; i < plan.length; i += limit) {
        const batch = plan.slice(i, i + limit);
        const batchResults = await Promise.all(batch.map(generatePageContent));
        pages.push(...batchResults);
      }

      ctx.pages = pages;
      log('STAGE', `Generated ${pages.length} pages`);
    });

    // Этап 2.5: Keyword Intelligence
    pipeline.registerStage('keyword-intelligence', async (ctx) => {
      log('STAGE', 'Keyword Intelligence');
      ctx.pages = ctx.pages.map(page => {
        // Извлечение ключевых слов
        const keywords = keywordExtractor.extractFromPage(page);
        
        // Выравнивание ключевых слов
        const aligned = keywordAligner.alignWithPage(page, keywords);
        
        // Умное встраивание ключевых слов
        const embedded = smartEmbedder.embedInPage(aligned, keywords);
        
        return { ...embedded, keywords };
      });
      log('STAGE', `Keywords extracted and aligned for ${ctx.pages.length} pages`);
    });

    // Этап 2.6: Auto-Optimization
    pipeline.registerStage('auto-optimization', async (ctx) => {
      log('STAGE', 'Auto-Optimization');
      ctx.pages = ctx.pages.map(page => {
        return autoOptimizer.optimizePage(page, page.keywords);
      });
      log('STAGE', `Optimized ${ctx.pages.length} pages`);
    });

    // Этап 2.7: i18n Localization
    pipeline.registerStage('i18n-localization', async (ctx) => {
      log('STAGE', 'i18n Localization');
      ctx.pages = ctx.pages.map(page => {
        return i18nEngine.localizePage(page);
      });
      log('STAGE', `Localized ${ctx.pages.length} pages`);
    });

    // Этап 3: Рендеринг HTML
    pipeline.registerStage('html-rendering', async (ctx) => {
      log('STAGE', 'HTML Rendering');
      ctx.pages = ctx.pages.map(page => {
        const html = templateEngine.renderPage(page, page.layout);
        return { ...page, html };
      });
    });

    // Этап 4: Проверка уникальности
    pipeline.registerStage('uniqueness-validation', async (ctx) => {
      log('STAGE', 'Uniqueness Validation');
      uniquenessEngine.reset();
      
      ctx.pages = ctx.pages.map(page => {
        const uniqueness = uniquenessEngine.validateUniqueness(page);
        return { ...page, uniqueness };
      });

      const uniquePages = ctx.pages.filter(p => p.uniqueness.isUnique);
      log('STAGE', `Unique pages: ${uniquePages.length}/${ctx.pages.length}`);
      ctx.pages = uniquePages;
    });

    // Этап 5: Оценка качества
    pipeline.registerStage('quality-scoring', async (ctx) => {
      log('STAGE', 'Quality Scoring');
      const { scored, accepted, avgQuality } = qualityEngine.scorePages(ctx.pages);
      ctx.pages = scored;
      ctx.acceptedPages = accepted;
      ctx.avgQuality = avgQuality;
    });

    // Этап 6: Кластеризация
    pipeline.registerStage('clustering', async (ctx) => {
      log('STAGE', 'Clustering');
      ctx.acceptedPages.forEach(page => {
        clusterEngine.registerPage(page);
        clusterEngine.updateClusterMetrics(page.clusterId, {
          avgQuality: page.qualityScore
        });
      });
      ctx.clusters = clusterEngine.getAllClusters();
    });

    // Этап 6.2: Генерация AI-изображений для кластеров (неблокирующая)
    pipeline.registerStage('ai-images-generation', async (ctx) => {
      log('STAGE', 'AI Images Generation (non-blocking)');
      
      // Собираем уникальные кластеры
      const uniqueClusters = new Map();
      for (const page of ctx.acceptedPages) {
        const clusterId = `${page.stateSlug}-${page.make}-${page.intent}`;
        if (!uniqueClusters.has(clusterId)) {
          uniqueClusters.set(clusterId, {
            stateSlug: page.stateSlug,
            make: page.make,
            intent: page.intent
          });
        }
      }
      
      const clusters = Array.from(uniqueClusters.values());
      log('STAGE', `Found ${clusters.length} unique clusters for image generation`);
      
      // Генерируем изображения асинхронно (не блокируем билд)
      aiImageGenerator.generateImagesForClusters(clusters).catch(err => {
        error('AI-IMAGE', 'Failed to generate some images', err);
        // Не прерываем билд из-за ошибок генерации изображений
      });
    });

    // Этап 6.5: Внутренние ссылки
    pipeline.registerStage('internal-links', async (ctx) => {
      log('STAGE', 'Internal Links');
      internalLinksEngine.attachInternalLinks(ctx.acceptedPages, clusterEngine);
      
      // Перерендер с внутренними ссылками
      ctx.acceptedPages = ctx.acceptedPages.map(page => {
        const layoutWithLinks = {
          ...page.layout,
          blocks: [...page.layout.blocks, 'internalLinks']
        };
        const html = templateEngine.renderPage(page, layoutWithLinks);
        return { ...page, html };
      });
    });

    // Этап 7: Публикация статических файлов
    pipeline.registerStage('static-publishing', async (ctx) => {
      log('STAGE', 'Static Publishing');
      let published = 0;
      
      for (const page of ctx.acceptedPages) {
        try {
          staticArch.writeStaticFile(page, page.html);
          published++;
        } catch (e) {
          error('PUBLISH', `Failed to publish ${page.url}`, e);
        }
      }
      
      log('STAGE', `Published ${published} pages`);
    });

    // Этап 7.5: Crawl Budget Distribution
    pipeline.registerStage('crawl-budget', async (ctx) => {
      log('STAGE', 'Crawl Budget Distribution');
      const strategy = crawlBudgetEngine.generateCrawlStrategy(ctx.acceptedPages);
      ctx.crawlStrategy = strategy;
      log('STAGE', `Crawl budget distributed: ${strategy.selectedPages} pages`);
    });

    // Этап 8: Генерация sitemaps
    pipeline.registerStage('sitemap-generation', async (ctx) => {
      log('STAGE', 'Sitemap Generation');
      sitemapEngine.writeSitemaps(ctx.acceptedPages, config);
    });

    // Этап 8.5: Обогащение данными из GSC
    pipeline.registerStage('gsc-enrichment', async (ctx) => {
      log('STAGE', 'GSC Data Enrichment');
      ctx.acceptedPages = gscIntegration.enrichPagesWithGSCData(ctx.acceptedPages);
      const stats = gscIntegration.getStatistics();
      log('STAGE', `GSC stats: ${stats.urlsWithData} pages with data, avg CTR: ${stats.avgCTR.toFixed(2)}%`);
    });

    // Этап 8.6: Обогащение внешними метриками (аналитика)
    pipeline.registerStage('external-metrics-enrichment', async (ctx) => {
      log('STAGE', 'External Metrics Enrichment');
      ctx.acceptedPages = externalMetrics.enrichPagesWithMetrics(ctx.acceptedPages);
      const stats = externalMetrics.getStatistics();
      log('STAGE', `External metrics: ${stats.urlsWithBounceRate} pages with bounce rate, ${stats.urlsWithTimeOnPage} with time on page`);
    });

    // Этап 9: Обновление LTR весов
    pipeline.registerStage('ltr-update', async (ctx) => {
      log('STAGE', 'LTR Weight Update');
      const weights = weightEngine.updateWeights(ctx.acceptedPages);
      
      // Сохранение обновленного RL state
      const newRlState = {
        ...rlState,
        intentWeights: weightEngine.normalizeWeights(weights.intents),
        languageWeights: weightEngine.normalizeWeights(weights.languages),
        layoutWeights: weights.layouts,
        lastUpdated: new Date().toISOString()
      };
      
      const rlStateDir = path.dirname(rlStatePath);
      if (!fs.existsSync(rlStateDir)) {
        fs.mkdirSync(rlStateDir, { recursive: true });
      }
      fs.writeFileSync(rlStatePath, JSON.stringify(newRlState, null, 2));
      log('STAGE', 'RL state updated');
    });

    // Выполнение пайплайна
    const result = await pipeline.execute();

    const duration = Date.now() - startMs;
    
    // Запись истории билда
    const buildData = {
      buildId: buildId,
      pagesGenerated: result.pages.length,
      pagesAccepted: result.acceptedPages.length,
      avgQuality: result.avgQuality || 0,
      duration: duration,
      clusters: result.clusters?.length || 0,
      uniquePages: result.pages.length,
      aiEnabled: config.enableAI && (!!process.env.GROQ_API_KEY || !!process.env.DEEPSEEK_API_KEY),
      config: config
    };
    
    buildHistory.recordBuild(buildData);

    // Генерация дашборда
    const dashboardData = dashboard.generateDashboardData(buildData);
    dashboard.saveDashboard(dashboardData);

    // Генерация прогноза
    const forecast = forecastEngine.generateForecast(5);
    log('FORECAST', `Forecast generated for next 5 builds`);

    // Финальная диагностика
    const finalDiagnosis = selfDiagnosis.diagnose();
    log('DIAGNOSIS', `Final diagnosis: ${finalDiagnosis.status}, Score: ${finalDiagnosis.score}`);

    log('MASTER', 'SEO MONSTER 6.0 build completed', {
      duration: `${duration}ms`,
      pagesGenerated: result.pages.length,
      pagesAccepted: result.acceptedPages.length,
      avgQuality: result.avgQuality?.toFixed(3),
      clusters: result.clusters?.length || 0,
      healthScore: finalDiagnosis.score
    });

  } catch (e) {
    error('MASTER', 'Build failed', e);
    process.exit(1);
  }
}

main().catch((e) => {
  error('MASTER', 'Fatal error', e);
  // Удаляем lock при ошибке
  const buildId = process.env.VERCEL || process.env.VERCEL_DEPLOYMENT_ID || 'local';
  const lockFile = path.join(process.cwd(), `.seo-build-${buildId}.lock`);
  if (fs.existsSync(lockFile)) {
    try {
      fs.unlinkSync(lockFile);
    } catch (cleanupErr) {
      // Ignore cleanup errors
    }
  }
  process.exit(1);
});
