const fs = require('fs');
const path = require('path');
const { log, error } = require('./logger');

// Загрузка переменных окружения из .env.local (для локальной разработки)
if (fs.existsSync(path.join(process.cwd(), '.env.local'))) {
  const envLocal = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
  envLocal.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      process.env[key] = value;
    }
  });
}
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
const { AITrainingPipeline } = require('./ai/ai-training-pipeline');
// ТРИЗ оптимизация: единые менеджеры
const { getConfigManager } = require('./utils/config-manager');
const { getErrorHandler } = require('./utils/error-handler');

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
    // ТРИЗ оптимизация: используем единый Config Manager
    const configManager = getConfigManager();
    const errorHandler = getErrorHandler({ debug: process.env.DEBUG === '1' });
    
    const config = errorHandler.wrapSync(
      () => configManager.getConfig(),
      { module: 'MASTER', operation: 'loadConfig', fallback: configManager.getDefaultConfig() }
    );

    const rlState = errorHandler.wrapSync(
      () => configManager.getRLState(),
      { module: 'MASTER', operation: 'loadRLState', fallback: configManager.getDefaultRLState() }
    );

    // ТРИЗ: Инициализация всех модулей
    const { ErrorIsolation } = require('./protection/error-isolation');
    const { MemoryMonitor } = require('./monitoring/memory-monitor');
    const { PerformanceProfiler } = require('./profiling/performance-profiler');
    const { SmartCacheInvalidation } = require('./cache/smart-cache-invalidation');
    const { ComputationCache } = require('./cache/computation-cache');
    const { BatchProcessor } = require('./optimization/batch-processor');
    const { TransparencyMode } = require('./transparency/transparency-mode');
    const { ProactivePreventionEngine } = require('./prevention/proactive-prevention-engine');
    const { ContradictionResolver } = require('./contradictions/contradiction-resolver');
    const { PatternBasedPrediction } = require('./patterns/pattern-based-prediction');
    const { ErrorIntelligence } = require('./intelligence/error-intelligence');
    const { SelfCleanupEngine } = require('./cleanup/self-cleanup-engine');
    const { SeededRandomnessManager } = require('./randomness/seeded-randomness-manager');
    const { AdaptiveComplexityManager } = require('./complexity/adaptive-complexity-manager');
    const { ContinuousQualityAssurance } = require('./quality/continuous-quality-assurance');
    const { SelfEvolutionEngine } = require('./evolution/self-evolution-engine');
    
    const errorIsolation = new ErrorIsolation(config);
    const memoryMonitor = new MemoryMonitor(config);
    const performanceProfiler = new PerformanceProfiler(config);
    const smartCacheInvalidation = new SmartCacheInvalidation(config);
    const computationCache = new ComputationCache(config);
    const batchProcessor = new BatchProcessor(config);
    const transparencyMode = new TransparencyMode(config);
    const proactivePrevention = new ProactivePreventionEngine(config);
    const contradictionResolver = new ContradictionResolver(config);
    const patternPrediction = new PatternBasedPrediction(config);
    const errorIntelligence = new ErrorIntelligence(config);
    const selfCleanup = new SelfCleanupEngine(config);
    const seededRandomness = new SeededRandomnessManager(config);
    const adaptiveComplexity = new AdaptiveComplexityManager(config);
    const continuousQA = new ContinuousQualityAssurance(config);
    const selfEvolution = new SelfEvolutionEngine(config);
    
    // Инициализация модулей
    memoryMonitor.start();
    selfCleanup.initializeDefaultRules();
    continuousQA.initializeDefaultChecks();
    
    // Решаем противоречия
    const resolvedContradictions = contradictionResolver.resolveAllContradictions();
    log('TRIZ', `Resolved ${resolvedContradictions.length} contradictions (6 basic + 25 new)`);

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
    const { ConversionTracker } = require('./analytics/conversion-tracker');
    const conversionTracker = new ConversionTracker(config);
    
    // SEO MONSTER 6.0: Новые модули из AI_SUGGESTIONS
    const { IncrementalBuildEngine } = require('./build/incremental-build-engine');
    const { RealtimeDashboardAPI } = require('./analytics/realtime-dashboard-api');
    const { SmartCanonicalEngine } = require('./links/smart-canonical-engine');
    const { PredictiveIndexingModel } = require('./prediction/predictive-indexing-model');
    const { ContentFreshnessTracker } = require('./content/content-freshness-tracker');
    const { AdaptiveLayoutSelection } = require('./layout/adaptive-layout-selection');
    const { MobileFirstValidator } = require('./validation/mobile-first-validator');
    const { InternalLinkOptimizer } = require('./links/internal-link-optimizer');
    const { ConversionFunnelTracker } = require('./analytics/conversion-funnel-tracker');
    const { KeywordClusteringEngine } = require('./keywords/keyword-clustering-engine');
    const { AutoRegenerationOnMetrics } = require('./regeneration/auto-regeneration-on-metrics');
    const { TrafficPredictionModel } = require('./prediction/traffic-prediction-model');
    const { VisualContentOptimizer } = require('./optimization/visual-content-optimizer');
    const { SearchIntentClassifier } = require('./intent/search-intent-classifier');
    const { CompetitiveAnalysisEngine } = require('./analysis/competitive-analysis-engine');
    const { SERPFeaturesOptimizer } = require('./serp/serp-features-optimizer');
    const { ContentVersioningEngine } = require('./testing/content-versioning-engine');
    const { LongtailExpansionEngine } = require('./keywords/longtail-expansion-engine');
    const { EnhancedStructuredData } = require('./structured-data/enhanced-structured-data');
    const { CoreWebVitalsOptimizer } = require('./performance/core-web-vitals-optimizer');
    const { MultilangSEOOptimizer } = require('./i18n/multilang-seo-optimizer');
    const { VoiceSearchOptimizer } = require('./voice/voice-search-optimizer');
    const { BacklinkOpportunityDetector } = require('./backlinks/backlink-opportunity-detector');
    const { ContentGapAnalyzer } = require('./analysis/content-gap-analyzer');
    const { UserBehaviorTracker } = require('./analytics/user-behavior-tracker');
    const { AutoFAQGenerator } = require('./content/auto-faq-generator');
    const { ContentDepthOptimizer } = require('./content/content-depth-optimizer');
    const { LocalSEOOptimizer } = require('./local/local-seo-optimizer');
    const { SitemapPrioritizer } = require('./sitemap/sitemap-prioritizer');
    const { ContentPerformanceAnalytics } = require('./analytics/content-performance-analytics');
    
    // Инициализация новых модулей
    const incrementalBuild = new IncrementalBuildEngine(config);
    const realtimeDashboard = new RealtimeDashboardAPI(config);
    const smartCanonical = new SmartCanonicalEngine(config);
    const predictiveIndexing = new PredictiveIndexingModel(config);
    const contentFreshness = new ContentFreshnessTracker(config);
    const adaptiveLayout = new AdaptiveLayoutSelection(config);
    const mobileValidator = new MobileFirstValidator(config);
    const internalLinkOptimizer = new InternalLinkOptimizer(config);
    const conversionFunnel = new ConversionFunnelTracker(config);
    const keywordClustering = new KeywordClusteringEngine(config);
    const autoRegeneration = new AutoRegenerationOnMetrics(config);
    const trafficPrediction = new TrafficPredictionModel(config);
    const visualOptimizer = new VisualContentOptimizer(config);
    const searchIntent = new SearchIntentClassifier(config);
    const competitiveAnalysis = new CompetitiveAnalysisEngine(config);
    const serpFeatures = new SERPFeaturesOptimizer(config);
    const contentVersioning = new ContentVersioningEngine(config);
    const longtailExpansion = new LongtailExpansionEngine(config);
    const enhancedStructuredData = new EnhancedStructuredData(config);
    const coreWebVitals = new CoreWebVitalsOptimizer(config);
    const multilangSEO = new MultilangSEOOptimizer(config);
    const voiceSearch = new VoiceSearchOptimizer(config);
    const backlinkDetector = new BacklinkOpportunityDetector(config);
    const contentGap = new ContentGapAnalyzer(config);
    const userBehavior = new UserBehaviorTracker(config);
    const autoFAQ = new AutoFAQGenerator(config);
    const contentDepth = new ContentDepthOptimizer(config);
    const localSEO = new LocalSEOOptimizer(config);
    const sitemapPrioritizer = new SitemapPrioritizer(config);
    const contentAnalytics = new ContentPerformanceAnalytics(config);

    // Этап 0: Pre-build check: диагностика и автоисправление
    // Этап 0.1: AI Training (если нужно или обновлена документация)
    const aiTraining = new AITrainingPipeline(config);
    const learnedStrategyPath = path.join(process.cwd(), 'data/seo/ai-training/learned-strategy.json');
    const ga4GtmDocsPath = path.join(process.cwd(), 'data/seo/ai-training/ga4-gtm-search-console-docs.jsonl');
    
    // Проверяем, нужно ли обновить обучение (если есть новые документы GA4/GTM/GSC)
    const needsRetraining = !fs.existsSync(learnedStrategyPath) || 
                           (fs.existsSync(ga4GtmDocsPath) && 
                            fs.existsSync(learnedStrategyPath) &&
                            fs.statSync(ga4GtmDocsPath).mtime > fs.statSync(learnedStrategyPath).mtime);
    
    if (needsRetraining) {
      log('STAGE', 'AI Training Pipeline (new or updated documentation)');
      try {
        await aiTraining.train();
        log('STAGE', 'AI training completed, strategy developed with GA4/GTM/GSC knowledge');
      } catch (e) {
        log('STAGE', `AI training error: ${e.message}, using fallback`);
      }
    } else {
      log('STAGE', 'AI Training - Using existing learned strategy');
    }

    pipeline.registerStage('pre-build-check', async (ctx) => {
      log('STAGE', 'Pre-Build Check');
      
      // ТРИЗ: Проактивное предотвращение проблем
      const buildHistory = new BuildHistory(config);
      const history = buildHistory.getRecentBuilds(10);
      const metrics = {
        totalPages: staticArch.countExistingPages(),
        buildHistory: history.map(h => ({
          avgQuality: h.avgQuality,
          duration: h.duration,
          errors: h.errors || 0
        }))
      };
      
      const prevention = await proactivePrevention.analyzeAndPrevent(metrics, history);
      if (prevention.preventedCount > 0) {
        log('PROACTIVE-PREVENTION', `Prevented ${prevention.preventedCount} issues before build`);
      }
      
      const canProceed = await autoRepair.preBuildCheck();
      if (!canProceed) {
        throw new Error('Pre-build check failed. Critical issues detected.');
      }
      const diagnosis = selfDiagnosis.diagnose();
      ctx.diagnosis = diagnosis;
      ctx.prevention = prevention;
      log('STAGE', `Pre-build check completed. Status: ${diagnosis.status}, Score: ${diagnosis.score}`);
    });

    // Этап 0.3: Seed Expansion (перед ai-decision)
    pipeline.registerStage('seed-expansion', async (ctx) => {
      log('STAGE', 'Seed Expansion');
      
      // Проверяем feature flag
      if (config.features && config.features.seedExpansion === false) {
        log('SEED-EXPANSION', 'Seed expansion disabled, skipping');
        return;
      }
      
      try {
        const { SeedExpansionEngine } = require('./seeds/seed-expansion-engine');
        const seedExpansionEngine = new SeedExpansionEngine(config);
        const result = await seedExpansionEngine.expandSeedsBeforeBuild();
        
        ctx.seedExpansionResult = result;
        
        // Обновляем urlFactory с новым seed-list
        if (result.expanded_seed_list) {
          urlFactory.updateSeeds(result.expanded_seed_list);
          log('SEED-EXPANSION', `Seeds updated: ${result.expanded_seed_list.states?.length || 0} states`);
        }
        
        // Обновляем config с AI рекомендацией
        if (result.recommended_build_volume) {
          config.targetPagesPerBuild = result.recommended_build_volume;
          log('SEED-EXPANSION', `AI recommended build volume: ${result.recommended_build_volume}`);
          log('SEED-EXPANSION', `Reasoning: ${result.reasoning}`);
          log('SEED-EXPANSION', `Strategy: Groq=${result.build_strategy.groq_pages}, DeepSeek=${result.build_strategy.deepseek_pages}, Cached=${result.build_strategy.cached_pages}`);
        }
      } catch (e) {
        log('SEED-EXPANSION', `Error: ${e.message}, using default seeds`);
        // Fallback: используем текущие seeds
      }
    });

    // Этап 0.5: AI Decision - определение количества страниц
    const { SEODecisionEngine } = require('./ai/seo-decision-engine');
    const decisionEngine = new SEODecisionEngine(config);
    let aiDecision = null;
    
    pipeline.registerStage('ai-decision', async (ctx) => {
      log('STAGE', 'AI Decision Engine');
      aiDecision = await decisionEngine.makeDecision();
      log('AI-DECISION', `AI decided: ${aiDecision.targetPages} pages, strategy: ${aiDecision.strategy}, confidence: ${aiDecision.confidence.toFixed(2)}`);
      log('AI-DECISION', `Reasoning: ${aiDecision.reasoning}`);
      
      // Временно обновляем config для этого билда
      const originalTarget = config.targetPagesPerBuild;
      config.targetPagesPerBuild = aiDecision.targetPages;
      ctx.aiDecision = aiDecision;
      ctx.originalTarget = originalTarget;
    });

    // Этап 1: Планирование URL
    pipeline.registerStage('url-planning', async (ctx) => {
      log('STAGE', 'URL Planning');
      const plan = urlFactory.buildUrlPlan();
      
      // Incremental Build: фильтруем страницы, которые нужно обновить
      if (config.features && config.features.incrementalBuild !== false) {
        const { needsUpdate, skip } = incrementalBuild.filterPagesForIncrementalBuild(plan);
        log('INCREMENTAL-BUILD', `Incremental build: ${needsUpdate.length} need update, ${skip.length} skip`);
        ctx.urlPlan = needsUpdate;
        ctx.skippedPages = skip;
      } else {
        ctx.urlPlan = plan;
      }
      ctx.pages = [];
    });

    // Этап 2: Генерация контента
    pipeline.registerStage('content-generation', async (ctx) => {
      log('STAGE', 'Content Generation');
      const concurrency = parseInt(process.env.SEO_BUILD_CONCURRENCY || '8', 10);
      
      async function generatePageContent(item, cachedAiText = null, maxTokensOverride = null) {
        // Baseline контент (baselineBlocks доступен из замыкания)
        const baseline = baselineBlocks.generateBaselineContent(item);
        
        // Формирование контекста страницы (нужно для промпта)
        const stateLabel = baselineBlocks.humanizeStateSlug(item.stateSlug);
        const makeUpper = (item.make || '').toUpperCase();
        
        // AI augmentation с Tier 1 семантическими требованиями
        const aiPrompt = `You are an expert automotive analyst writing an official DMV-style report combined with antifraud expertise and vehicle history analysis.

TONE & STYLE:
- Official document style (DMV × LegalTech × Expert Analyst)
- Professional, authoritative, analytical
- Not just informative — ANALYZE, WARN, TEACH, COMPARE, DRAW CONCLUSIONS
- Each VIN is a story, risk profile, state context, purchase logic, and legal nuance
- This is not just text — it's a professional micro-report

REQUIRED SEMANTIC COVERAGE (Tier 1 - all must be addressed naturally):
1. Vehicle Identity Core: VIN structure and decoding, model lineage, year-specific factory issues, typical mileage ranges, known recalls for this generation
2. Accident & Damage Intelligence: Most common accident types for this model, frame damage explanation, airbag deployment logic, salvage vs rebuilt vs junk title differences, state inspection rules
3. Ownership Logic: Ownership timeline analysis, high-risk ownership patterns, fleet vs rental vs personal use indicators, insurance claim probability
4. State-Specific Automotive Rules: Title transfer laws and procedures in ${stateLabel}, smog/emissions testing requirements, odometer fraud risk by state, rebuilt title procedures, flood-risk regions
5. Fraud Prevention: Fake VIN patterns and detection, auction fraud warning signs, mileage rollback techniques and detection, canceled insurance tricks, curbstoning warning signs

CONTEXT:
- Vehicle: ${item.year || ''} ${(item.make || '').toUpperCase()} in ${stateLabel}
- Intent: ${item.intent || 'vin_check'}
- State: ${stateLabel}

REQUIREMENTS:
1. Cover ALL Tier 1 semantic themes naturally in the content
2. Provide deep analysis, not just facts
3. Include warnings and risk assessments
4. Compare and contrast different scenarios
5. Give clear, actionable conclusions
6. Use expert terminology appropriately
7. Never fabricate specific accidents or records
8. Focus on patterns, probabilities, and professional insights

Write a comprehensive, expert-level analysis about "${item.intent}" that feels like an official report from a DMV analyst + antifraud specialist + automotive expert.`;
        
        // Используем кешированный текст если есть, иначе генерируем
        let aiText = cachedAiText;
        if (!aiText) {
          aiText = await aiAugmentation.generateText(aiPrompt, {
            lang: item.lang,
            intent: item.intent,
            maxTokens: maxTokensOverride || config.aiMaxTokens || 600,
            make: item.make,
            year: item.year,
            stateSlug: item.stateSlug
          });
        }

        // Adaptive H1 Switching
        let pageWithH1 = null;
        if (config.features && config.features.h1Variants !== false) {
          try {
            const { H1VariantsEngine } = require('./content/h1-variants-engine');
            const h1VariantsEngine = new H1VariantsEngine(config);
            pageWithH1 = h1VariantsEngine.enrichPageWithH1Variants({
              ...item,
              h1: `VIN report for ${item.year} ${makeUpper} in ${stateLabel}`,
              url: item.url,
              lang: item.lang,
              intent: item.intent,
              make: item.make,
              year: item.year,
              stateLabel: stateLabel
            });
          } catch (e) {
            log('H1-VARIANTS', `Error: ${e.message}, using default H1`);
            pageWithH1 = null;
          }
        }

        // Используем обогащенную страницу с H1 или оригинальную
        const enrichedItem = pageWithH1 || item;

        // Выбор layout (Adaptive Layout Selection)
        let layout;
        if (config.features && config.features.adaptiveLayout !== false) {
          layout = adaptiveLayout.selectBestLayout(enrichedItem, layoutEngine.getAvailableLayouts()) || 
                   layoutEngine.selectLayout(enrichedItem, rlState.layoutWeights);
        } else {
          layout = layoutEngine.selectLayout(enrichedItem, rlState.layoutWeights);
        }
        
        return {
          ...item,
          title: `VIN Check for ${item.year} ${makeUpper} in ${stateLabel} – Full Report`,
          description: `Instant VIN check for ${item.year} ${makeUpper} in ${stateLabel}. Review ownership, accident and title history before you buy.`,
          h1: enrichedItem.h1 || `VIN report for ${item.year} ${makeUpper} in ${stateLabel}`,
          intro: `This page explains how to read a VIN report for a ${item.year} ${makeUpper} registered in ${stateLabel}, and why a detailed history check is important before you commit to a purchase.`,
          stateLabel,
          ...baseline,
          aiText,
          layout,
          blocks: layout.blocks,
          h1Variants: enrichedItem.h1Variants // Сохраняем варианты если есть
        };
      }

      // ТРИЗ: Адаптивная сложность - получаем рекомендуемые параметры
      const complexityParams = adaptiveComplexity.getParameters('content_generation');
      const adaptiveConcurrency = adaptiveComplexity.getRecommendedConcurrency(concurrency);
      const adaptiveMaxTokens = adaptiveComplexity.getRecommendedMaxTokens(config.aiMaxTokens || 600);
      
      log('ADAPTIVE-COMPLEXITY', `Complexity: ${adaptiveComplexity.complexityLevel}, Concurrency: ${adaptiveConcurrency}, MaxTokens: ${adaptiveMaxTokens}`);
      
      // ТРИЗ: Генерация с Error Isolation, Memory Monitor, Cache, Batch
      const pages = [];
      const plan = ctx.urlPlan;
      
      // Проверяем память перед началом
      const memoryStats = memoryMonitor.getStats();
      if (memoryStats.current.usagePercent > 0.85) {
        log('MEMORY-MONITOR', 'Memory usage high, triggering cleanup');
        memoryMonitor.triggerCleanup();
      }
      
      // Генерация с адаптивной конкурентностью и Error Isolation
      const workers = [];
      const running = new Set();
      
      for (const item of plan) {
        // Проверяем память перед каждым батчем
        if (memoryMonitor.shouldLimitOperations()) {
          log('MEMORY-MONITOR', 'Memory limit reached, waiting...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          memoryMonitor.performCleanup();
        }
        
        if (running.size >= adaptiveConcurrency) {
          await Promise.race(running);
        }
        
        const promise = errorIsolation.isolateModuleAsync(
          'content-generation',
          async () => {
            // ТРИЗ: Computation Cache для AI вызовов
            const cacheKey = `ai-${item.lang}-${item.intent}-${item.make}-${item.year}-${item.stateSlug}`;
            
            // Проверяем кеш
            const cached = computationCache.get(cacheKey);
            if (cached) {
              log('COMPUTATION-CACHE', `Cache hit for ${item.url}`);
              return generatePageContent(item, cached.aiText);
            }
            
            // Генерируем с профилированием
            const page = await performanceProfiler.profileAsync('generate-page', async () => {
              return await generatePageContent(item, null, adaptiveMaxTokens);
            });
            
            return page;
          },
          () => {
            // Fallback: базовая страница без AI
            log('ERROR-ISOLATION', `Using fallback for ${item.url}`);
            return {
              ...item,
              title: `VIN Check for ${item.year} ${(item.make || '').toUpperCase()} in ${item.stateSlug}`,
              description: `VIN report for ${item.year} ${(item.make || '').toUpperCase()}`,
              h1: `VIN report for ${item.year} ${(item.make || '').toUpperCase()}`,
              aiText: '',
              baseline: baselineBlocks.generateBaselineContent(item)
            };
          }
        ).then(page => {
          running.delete(promise);
          if (page) {
            pages.push(page);
            
            // ТРИЗ: Pattern Prediction - предсказываем успешность
            const prediction = patternPrediction.predictSuccess(page);
            if (prediction.predicted) {
              log('PATTERN-PREDICTION', `Page ${item.url} predicted as successful (confidence: ${(prediction.confidence * 100).toFixed(1)}%)`);
            }
            
            // ТРИЗ: Transparency Mode - логируем решение
            transparencyMode.logDecision({
              type: 'page_generation',
              input: { url: item.url, intent: item.intent, make: item.make, year: item.year },
              output: { qualityScore: page.qualityScore || 0, hasAI: !!page.aiText },
              reasoning: `Generated page with ${prediction.predicted ? 'predicted success' : 'standard generation'}`,
              confidence: prediction.confidence || 0.5,
              context: { stateSlug: item.stateSlug, lang: item.lang }
            });
          }
        }).catch(err => {
          running.delete(promise);
          error('CONTENT-GEN', `Error generating page: ${err.message}`);
          
          // ТРИЗ: Error Intelligence - анализируем ошибку
          const analysis = errorIntelligence.analyzeError(err, {
            module: 'content-generation',
            operation: 'generatePageContent',
            url: item.url
          });
          
          if (analysis.solution) {
            log('ERROR-INTELLIGENCE', `Solution for error: ${analysis.solution.description}`);
          }
        });
        
        running.add(promise);
        workers.push(promise);
      }
      
      await Promise.all(workers);
      
      // ТРИЗ: Профилирование завершено
      const generationDuration = performanceProfiler.profiles.get('generate-page')?.times?.reduce((a, b) => a + b, 0) || 0;
      log('STAGE', `Generated ${pages.length} pages in ${generationDuration}ms`);
      
      ctx.pages = pages;
    });

    // Этап 2.5: Keyword Intelligence
    pipeline.registerStage('keyword-intelligence', async (ctx) => {
      log('STAGE', 'Keyword Intelligence');
      ctx.pages = ctx.pages.map(page => {
        // Извлечение ключевых слов
        const extracted = keywordExtractor.extractFromPage(page);
        const keywords = extracted.keywords || [];
        const phrases = extracted.phrases || [];
        
        // Выравнивание ключевых слов
        const aligned = keywordAligner.alignWithPage(page, extracted);
        
        // Умное встраивание ключевых слов
        const embedded = smartEmbedder.embedInPage(aligned, extracted);
        
        // Keyword Clustering & Topic Modeling
        if (config.features && config.features.keywordClustering !== false && Array.isArray(keywords) && keywords.length > 0) {
          // Преобразуем объекты ключевых слов в строки для кластеризации
          const keywordStrings = keywords.map(kw => typeof kw === 'string' ? kw : kw.word);
          const clusters = keywordClustering.clusterKeywords(keywordStrings);
          embedded.keywordClusters = clusters;
        }
        
        // Long-tail Keyword Expansion
        if (config.features && config.features.longtailExpansion !== false) {
          const longtailVariants = longtailExpansion.generateLongtailVariants(page.primaryKeyword || page.url);
          embedded.longtailKeywords = longtailVariants;
        }
        
        return { ...embedded, keywords: extracted };
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
        let localized = i18nEngine.localizePage(page);
        
        // Multi-language SEO Optimization
        if (config.features && config.features.multilangSEO !== false) {
          localized = multilangSEO.optimize(localized);
        }
        
        return localized;
      });
      log('STAGE', `Localized ${ctx.pages.length} pages`);
    });

    // Этап 2.8: Synonym-ecosystem (после i18n)
    pipeline.registerStage('synonym-enrichment', async (ctx) => {
      log('STAGE', 'Synonym Enrichment');
      
      // Проверяем feature flag
      if (config.features && config.features.synonyms === false) {
        log('SYNONYM', 'Synonyms disabled, skipping');
        return;
      }
      
      try {
        const { SynonymEngine } = require('./content/synonym-engine');
        const synonymEngine = new SynonymEngine(config);
        
        ctx.pages = ctx.pages.map(page => 
          synonymEngine.applySynonymsToPage(page)
        );
        
        log('STAGE', `Applied synonyms to ${ctx.pages.length} pages`);
      } catch (e) {
        log('SYNONYM', `Error: ${e.message}, skipping synonym enrichment`);
      }
    });

    // Этап 3: Рендеринг HTML
    pipeline.registerStage('html-rendering', async (ctx) => {
      log('STAGE', 'HTML Rendering');
      ctx.pages = ctx.pages.map(page => {
        // Проверяем наличие layout и его структуры, если нет - выбираем дефолтный
        if (!page.layout || !page.layout.blocks || !Array.isArray(page.layout.blocks)) {
          page.layout = layoutEngine.selectLayout(page, rlState.layoutWeights);
        }
        let html = templateEngine.renderPage(page, page.layout);
        
        // Search Intent Classification
        if (config.features && config.features.searchIntent !== false) {
          page = searchIntent.classifyAndOptimize(page);
        }
        
        // Auto FAQ Generation
        if (config.features && config.features.autoFAQ !== false) {
          page = autoFAQ.generate(page);
        }
        
        // Content Depth Optimization
        if (config.features && config.features.contentDepth !== false) {
          page = contentDepth.optimize(page);
        }
        
        // Voice Search Optimization
        if (config.features && config.features.voiceSearch !== false) {
          page = voiceSearch.optimize(page);
        }
        
        // SERP Features Optimization
        if (config.features && config.features.serpFeatures !== false) {
          page = serpFeatures.optimizePage(page);
        }
        
        // Enhanced Structured Data
        if (config.features && config.features.enhancedStructuredData !== false) {
          page = enhancedStructuredData.optimizePage(page);
        }
        
        // Visual Content Optimization
        if (config.features && config.features.visualOptimization !== false) {
          page = visualOptimizer.optimizePage(page);
          html = page.html || html;
        }
        
        // Core Web Vitals Optimization
        if (config.features && config.features.coreWebVitals !== false) {
          page = coreWebVitals.optimize(page);
        }
        
        // Local SEO Optimization
        if (config.features && config.features.localSEO !== false) {
          page = localSEO.optimize(page);
        }
        
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
      
      // Predictive Indexing Model
      if (config.features && config.features.predictiveIndexing !== false) {
        const prioritized = predictiveIndexing.prioritizePages(scored);
        log('PREDICTIVE-INDEXING', `High priority: ${prioritized.highPriority.length}, Medium: ${prioritized.mediumPriority.length}, Low: ${prioritized.lowPriority.length}`);
      }
      
      // Traffic Prediction Model
      if (config.features && config.features.trafficPrediction !== false) {
        const trafficPrioritized = trafficPrediction.prioritizePages(scored);
        log('TRAFFIC-PREDICTION', `High potential: ${trafficPrioritized.highPotential.length}, Medium: ${trafficPrioritized.mediumPotential.length}`);
      }
      
      // Content Performance Analytics
      if (config.features && config.features.contentAnalytics !== false) {
        scored.forEach(page => {
          contentAnalytics.analyze(page);
        });
      }
      
      ctx.pages = scored;
      ctx.acceptedPages = accepted;
      ctx.avgQuality = avgQuality;
    });

    // Этап 5.5: Structure Validation (Кузов - Structure)
    // Валидация выполняется после генерации HTML на этапе static-publishing

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

    // Этап 6.2: Генерация AI-изображений для кластеров (ОТКЛЮЧЕНО)
    // pipeline.registerStage('ai-images-generation', async (ctx) => {
    //   log('STAGE', 'AI Images Generation (non-blocking)');
    //   
    //   // Собираем уникальные кластеры
    //   const uniqueClusters = new Map();
    //   for (const page of ctx.acceptedPages) {
    //     const clusterId = `${page.stateSlug}-${page.make}-${page.intent}`;
    //     if (!uniqueClusters.has(clusterId)) {
    //       uniqueClusters.set(clusterId, {
    //         stateSlug: page.stateSlug,
    //         make: page.make,
    //         intent: page.intent
    //       });
    //     }
    //   }
    //   
    //   const clusters = Array.from(uniqueClusters.values());
    //   log('STAGE', `Found ${clusters.length} unique clusters for image generation`);
    //   
    //   // Генерируем изображения асинхронно (не блокируем билд)
    //   aiImageGenerator.generateImagesForClusters(clusters).catch(err => {
    //     error('AI-IMAGE', 'Failed to generate some images', err);
    //     // Не прерываем билд из-за ошибок генерации изображений
    //   });
    // });

    // Этап 6.5: Внутренние ссылки
    pipeline.registerStage('internal-links', async (ctx) => {
      log('STAGE', 'Internal Links');
      internalLinksEngine.attachInternalLinks(ctx.acceptedPages, clusterEngine);
      
      // Internal Link Optimization (PageRank-based)
      if (config.features && config.features.internalLinkOptimization !== false) {
        internalLinkOptimizer.calculatePageRank(ctx.acceptedPages);
        ctx.acceptedPages = ctx.acceptedPages.map(page => {
          const optimizedLinks = internalLinkOptimizer.optimizeLinks(page, ctx.acceptedPages);
          page.internalLinks = optimizedLinks;
          return page;
        });
      }
      
      // Smart Canonical Engine
      if (config.features && config.features.smartCanonical !== false) {
        ctx.acceptedPages = smartCanonical.processBatch(ctx.acceptedPages);
      }
      
      // Перерендер с внутренними ссылками (только если блока еще нет)
      ctx.acceptedPages = ctx.acceptedPages.map(page => {
        // Проверяем, нет ли уже блока internalLinks
        const hasInternalLinks = page.layout.blocks && page.layout.blocks.includes('internalLinks');
        const layoutWithLinks = {
          ...page.layout,
          blocks: hasInternalLinks 
            ? page.layout.blocks 
            : [...page.layout.blocks, 'internalLinks']
        };
        const html = templateEngine.renderPage(page, layoutWithLinks);
        return { ...page, html };
      });
    });

    // Этап 7: Публикация статических файлов
    pipeline.registerStage('static-publishing', async (ctx) => {
      log('STAGE', 'Static Publishing');
      let published = 0;
      
      // Mobile-First Validation (sample)
      if (config.features && config.features.mobileValidation !== false) {
        const sampleSize = Math.min(10, ctx.acceptedPages.length);
        const sample = ctx.acceptedPages.slice(0, sampleSize);
        const mobileValidation = mobileValidator.validateBatch(sample);
        log('MOBILE-VALIDATION', `Mobile validation: ${mobileValidation.summary.mobileFriendly}/${mobileValidation.summary.total} mobile-friendly`);
      }
      
      for (const page of ctx.acceptedPages) {
        try {
          // Генерируем HTML если еще не сгенерирован
          if (!page.html) {
            page.html = templateEngine.renderPage(page, page.layout || layoutEngine.selectLayout(page, rlState.layoutWeights));
          }
          
          // Content Freshness Tracker
          if (config.features && config.features.contentFreshness !== false) {
            contentFreshness.registerPage(page);
          }
          
          staticArch.writeStaticFile(page, page.html);
          published++;
          
          // Incremental Build: обновляем checksum
          if (config.features && config.features.incrementalBuild !== false) {
            incrementalBuild.updateChecksum(page);
          }
        } catch (e) {
          error('PUBLISH', `Failed to publish ${page.url}`, e);
        }
      }
      
      // Incremental Build: сохраняем checksums
      if (config.features && config.features.incrementalBuild !== false) {
        incrementalBuild.updateChecksumsBatch(ctx.acceptedPages);
        const stats = incrementalBuild.getStats();
        log('INCREMENTAL-BUILD', `Checksums saved: ${stats.totalChecksums} pages tracked`);
      }
      
      log('STAGE', `Published ${published} pages`);
      
      // ТРИЗ: Structure Validation после генерации HTML (Кузов - Structure)
      try {
        const { HTMLValidator } = require('./validation/html-validator');
        const { AccessibilityChecker } = require('./validation/accessibility-checker');
        const { CriticalCSSOptimizer } = require('./optimization/critical-css-optimizer');
        
        const htmlValidator = new HTMLValidator(config);
        const accessibilityChecker = new AccessibilityChecker(config);
        const cssOptimizer = new CriticalCSSOptimizer(config);
        
        const pagesWithHTML = ctx.acceptedPages.filter(p => p.html);
        if (pagesWithHTML.length > 0) {
          // Валидация HTML (выборочно, чтобы не замедлять билд)
          const sampleSize = Math.min(10, pagesWithHTML.length);
          const sample = pagesWithHTML.slice(0, sampleSize);
          
          const htmlValidation = htmlValidator.validateBatch(sample);
          log('HTML-VALIDATOR', `Validated ${htmlValidation.results.length} sample pages: ${htmlValidation.summary.valid} valid, avg score: ${htmlValidation.summary.avgScore.toFixed(2)}`);
          
          // Проверка accessibility (выборочно)
          const a11yCheck = accessibilityChecker.checkBatch(sample);
          log('ACCESSIBILITY', `Checked ${a11yCheck.results.length} sample pages: avg score ${a11yCheck.summary.avgScore.toFixed(2)}, levels: ${JSON.stringify(a11yCheck.summary.levelCounts)}`);
          
          // Оптимизация критического CSS (для всех страниц)
          const optimizedPages = cssOptimizer.optimizeBatch(ctx.acceptedPages);
          const optimizedCount = optimizedPages.filter(p => p.cssOptimized).length;
          log('CRITICAL-CSS', `Optimized CSS for ${optimizedCount}/${ctx.acceptedPages.length} pages`);
          
          // Обновляем страницы с оптимизированным HTML
          const optimizedMap = new Map(optimizedPages.map(p => [p.url, p]));
          ctx.acceptedPages = ctx.acceptedPages.map(page => {
            const optimized = optimizedMap.get(page.url);
            if (optimized && optimized.html) {
              return { ...page, html: optimized.html, cssOptimized: true };
            }
            return page;
          });
          
          ctx.htmlValidation = htmlValidation;
          ctx.accessibilityCheck = a11yCheck;
        }
      } catch (e) {
        log('STRUCTURE-VALIDATION', `Error during validation: ${e.message}, continuing`);
      }
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
      
      // Sitemap Prioritization
      let pagesForSitemap = ctx.acceptedPages;
      if (config.features && config.features.sitemapPrioritization !== false) {
        pagesForSitemap = sitemapPrioritizer.prioritize(ctx.acceptedPages);
        log('SITEMAP-PRIORITIZER', `Prioritized ${pagesForSitemap.length} pages for sitemap`);
      }
      
      sitemapEngine.writeSitemaps(pagesForSitemap, config);
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

    // Этап 8.7: Обогащение данными о конверсиях и предсказания
    pipeline.registerStage('conversion-enrichment', async (ctx) => {
      log('STAGE', 'Conversion Enrichment');
      ctx.acceptedPages = conversionTracker.enrichPagesWithConversions(ctx.acceptedPages);
      const stats = conversionTracker.getStatistics();
      log('STAGE', `Conversion data: ${stats.pagesWithConversions} pages with conversions, avg rate: ${(stats.avgConversionRate * 100).toFixed(2)}%`);
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
      aiDecision: aiDecision ? {
        targetPages: aiDecision.targetPages,
        strategy: aiDecision.strategy,
        confidence: aiDecision.confidence
      } : null,
      config: config
    };
    
    buildHistory.recordBuild(buildData);

    // Обновление производительности AI решения (обучение)
    if (aiDecision && aiDecision.timestamp) {
      decisionEngine.updatePerformance(aiDecision.timestamp, {
        pagesGenerated: result.pages.length,
        pagesAccepted: result.acceptedPages.length,
        avgQuality: result.avgQuality || 0
      });
    }

    // Восстановление оригинального target
    if (result.originalTarget !== undefined) {
      config.targetPagesPerBuild = result.originalTarget;
    }

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
