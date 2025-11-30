const fs = require('fs');
const path = require('path');
const { log, error } = require('./logger');
const { SEOMasterPipeline } = require('./orchestration/seo-master-pipeline');
const { URLFactory } = require('./orchestration/url-factory');
const { LayoutEngine } = require('./dom/layout-engine');
const { TemplateEngine } = require('./dom/template-engine');
const { UniquenessEngine } = require('./uniqueness-engine');
const { BaselineBlocks } = require('./content/baseline-blocks');
const { AIAugmentation } = require('./content/ai-augmentation');
const { ClusterEngine } = require('./clusters/cluster-engine');
const { QualityEngine } = require('./quality/quality-engine');
const { WeightEngine } = require('./ltr/weight-engine');
const { StaticArchitecture } = require('./platform/static-architecture');
const { SitemapEngine } = require('./sitemap/sitemap-engine');
const { InternalLinksEngine } = require('./links/internal-links-engine');

/**
 * SEO MONSTER 6.0: Master Build
 * Полная интеграция всех модулей
 */
async function main() {
  const startedAt = new Date().toISOString();
  const startMs = Date.now();

  log('MASTER', 'Starting SEO MONSTER 6.0 build');

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
    const layoutEngine = new LayoutEngine(config);
    const templateEngine = new TemplateEngine(config);
    const uniquenessEngine = new UniquenessEngine(config);
    const baselineBlocks = new BaselineBlocks();
    const aiAugmentation = new AIAugmentation(config);
    const clusterEngine = new ClusterEngine();
    const qualityEngine = new QualityEngine(config);
    const weightEngine = new WeightEngine();
    const staticArch = new StaticArchitecture(config);
    const sitemapEngine = new SitemapEngine(config);
    const internalLinksEngine = new InternalLinksEngine(config);

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

    // Этап 8: Генерация sitemaps
    pipeline.registerStage('sitemap-generation', async (ctx) => {
      log('STAGE', 'Sitemap Generation');
      sitemapEngine.writeSitemaps(ctx.acceptedPages, config);
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
    log('MASTER', 'SEO MONSTER 6.0 build completed', {
      duration: `${duration}ms`,
      pagesGenerated: result.pages.length,
      pagesAccepted: result.acceptedPages.length,
      avgQuality: result.avgQuality?.toFixed(3),
      clusters: result.clusters?.length || 0
    });

  } catch (e) {
    error('MASTER', 'Build failed', e);
    process.exit(1);
  }
}

main().catch((e) => {
  error('MASTER', 'Fatal error', e);
  process.exit(1);
});
