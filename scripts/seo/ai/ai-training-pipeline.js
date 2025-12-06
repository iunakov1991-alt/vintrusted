const fs = require('fs');
const path = require('path');
const { log, error } = require('../logger');
const { AIAugmentation } = require('../content/ai-augmentation');

/**
 * SEO-AI TRAINING PIPELINE — 2025 EDITION
 * 
 * Цель: Дать встроенному AI минимальный, но необходимый набор знаний,
 * который соответствует текущим алгоритмам Google (после всех апдейтов 2023–2025),
 * включая HCU rollback, AI-content tolerance и новое поведение Crawl Budget.
 * 
 * КРИТИЧНО: AI должна найти свой максимально эффективный и прибыльный путь,
 * а не следовать готовым шаблонам.
 */
class AITrainingPipeline {
  constructor(config) {
    this.config = config;
    this.trainingDataPath = path.join(process.cwd(), 'data/seo/ai-training');
    this.knowledgeBasePath = path.join(this.trainingDataPath, 'knowledge-base.jsonl');
    this.strategyPath = path.join(this.trainingDataPath, 'learned-strategy.json');
    this.aiAugmentation = new AIAugmentation(config);
    
    // Создаем директорию если не существует
    if (!fs.existsSync(this.trainingDataPath)) {
      fs.mkdirSync(this.trainingDataPath, { recursive: true });
    }
  }

  /**
   * ФАЗА 1: CORE FOUNDATIONS
   * Только официальная документация Google
   */
  async ingestCoreFoundations() {
    const sources = [
      'https://developers.google.com/search/docs/essentials',
      'https://developers.google.com/search/docs/fundamentals/seo',
      'https://developers.google.com/search/docs/fundamentals/ai-overview',
      'https://developers.google.com/search/docs/crawling-indexing/how-search-works',
      'https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview',
      'https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt',
      'https://developers.google.com/search/docs/appearance/structured-data',
      'https://developers.google.com/search/docs/appearance/snippets',
      'https://developers.google.com/search/docs/monitor-debug/search-console-insights'
    ];

    log('AI-TRAINING', 'Ingesting Core Foundations (Google official docs)');
    
    // Сохраняем источники для будущего ингеста
    // В реальности здесь будет веб-скрапинг или API запросы
    const knowledge = {
      phase: 'core-foundations',
      sources: sources,
      ingestedAt: new Date().toISOString(),
      type: 'official-google-docs',
      note: 'Core SEO principles from Google official documentation'
    };

    this.appendKnowledge(knowledge);
    return knowledge;
  }

  /**
   * ФАЗА 2: ENTITY GRAPH SEO
   * Для построения собственного графа сущностей
   */
  async ingestEntityGraph() {
    const sources = [
      'https://schema.org/Vehicle',
      'https://schema.org/Car',
      'https://schema.org/Product',
      'https://schema.org/Organization',
      'https://schema.org/Dataset',
      'https://schema.org/FAQPage'
    ];

    log('AI-TRAINING', 'Ingesting Entity Graph (Schema.org)');
    
    const knowledge = {
      phase: 'entity-graph',
      sources: sources,
      ingestedAt: new Date().toISOString(),
      type: 'schema-org',
      note: 'Entity graph structure for brand → model → year → VIN hierarchy'
    };

    this.appendKnowledge(knowledge);
    return knowledge;
  }

  /**
   * ФАЗА 3: INDUSTRY / VIN SOURCES
   * Реальная автомобильная структура США
   */
  async ingestIndustrySources() {
    const sources = [
      'https://www.nhtsa.gov/',
      'https://www.iihs.org/',
      'https://www.kbb.com/',
      'https://www.autotrader.com/car-news',
      'https://www.epa.gov/greenvehicles'
    ];

    log('AI-TRAINING', 'Ingesting Industry Sources (US automotive structure)');
    
    const knowledge = {
      phase: 'industry-sources',
      sources: sources,
      ingestedAt: new Date().toISOString(),
      type: 'industry-primary-sources',
      note: 'Primary automotive industry sources for VIN context'
    };

    this.appendKnowledge(knowledge);
    return knowledge;
  }

  /**
   * ФАЗА 4: TECHNICAL SEO 2025
   * Только то, что Google прямо признаёт значимым
   */
  async ingestTechnicalSEO() {
    const sources = [
      'https://web.dev/articles/metrics',
      'https://web.dev/articles/vitals',
      'https://web.dev/articles/cwv-lcp',
      'https://web.dev/articles/cwv-cls',
      'https://web.dev/articles/cwv-fid',
      'https://developer.chrome.com/blog/new-metrics-2024/'
    ];

    log('AI-TRAINING', 'Ingesting Technical SEO 2025 (Core Web Vitals)');
    
    const knowledge = {
      phase: 'technical-seo',
      sources: sources,
      ingestedAt: new Date().toISOString(),
      type: 'core-web-vitals',
      note: 'Technical SEO metrics that Google directly recognizes as significant'
    };

    this.appendKnowledge(knowledge);
    return knowledge;
  }

  /**
   * ФАЗА 5: LARGE-SITE CRAWL MANAGEMENT
   * Современные рекомендации Google для больших сайтов
   */
  async ingestLargeSiteManagement() {
    const sources = [
      'https://developers.google.com/search/docs/crawling-indexing/large-websites',
      'https://developers.google.com/search/docs/crawling-indexing/googlebot',
      'https://developers.google.com/search/docs/appearance/site-moves'
    ];

    log('AI-TRAINING', 'Ingesting Large-Site Crawl Management');
    
    const knowledge = {
      phase: 'large-site-management',
      sources: sources,
      ingestedAt: new Date().toISOString(),
      type: 'crawl-budget',
      note: 'Google recommendations for large websites (10k–10M+ pages)'
    };

    this.appendKnowledge(knowledge);
    return knowledge;
  }

  /**
   * ФАЗА 6: USER INTENT MODELLING
   * Единственная не-Google зона, только структурные данные
   */
  async ingestUserIntent() {
    const sources = [
      'https://ahrefs.com/blog/search-intent/',
      'https://moz.com/learn/seo/search-intent'
    ];

    log('AI-TRAINING', 'Ingesting User Intent Modelling (structural data only)');
    
    const knowledge = {
      phase: 'user-intent',
      sources: sources,
      ingestedAt: new Date().toISOString(),
      type: 'search-intent-structure',
      note: 'User intent modeling - structural data only, no opinions or hacks'
    };

    this.appendKnowledge(knowledge);
    return knowledge;
  }

  /**
   * Ингестирование данных из файла JSONL
   */
  async ingestFromJSONL(filePath) {
    try {
      const fullPath = path.join(process.cwd(), filePath);
      
      if (!fs.existsSync(fullPath)) {
        log('AI-TRAINING', `File not found: ${fullPath}`);
        return;
      }
      
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const item = JSON.parse(line);
          const knowledge = {
            phase: item.type || 'general',
            source: item.source || '',
            title: item.title || '',
            content: item.content || '',
            ingestedAt: new Date().toISOString(),
            type: item.type || 'external-docs',
            note: `GA4/GTM/GSC documentation: ${item.title || item.source}`
          };
          this.appendKnowledge(knowledge);
        } catch (e) {
          log('AI-TRAINING', `Error parsing JSONL line: ${e.message}`);
        }
      }
      
      log('AI-TRAINING', `Ingested ${lines.length} items from ${filePath}`);
    } catch (e) {
      log('AI-TRAINING', `Error ingesting from JSONL: ${e.message}`);
    }
  }

  /**
   * ФАЗА 7.7: REFERENCE ARTICLES TRAINING
   * Обучение на эталонных статьях разного качества (VЧ, СЧ, НЧ)
   * ТРИЗ: Использование ресурсов - эталонные примеры для обучения
   */
  async ingestReferenceArticles() {
    const referenceArticlesPath = path.join(this.trainingDataPath, 'reference-articles');
    
    if (!fs.existsSync(referenceArticlesPath)) {
      log('AI-TRAINING', 'Reference articles directory not found, skipping');
      return null;
    }

    try {
      const articles = {
        highVolume: null,
        midVolume: null,
        lowVolume: null,
        badExamples: null,
        variability: null
      };

      // Загружаем эталонные статьи
      const highVolumePath = path.join(referenceArticlesPath, 'high-volume-california-vin.json');
      const midVolumePath = path.join(referenceArticlesPath, 'mid-volume-toyota-camry.json');
      const lowVolumePath = path.join(referenceArticlesPath, 'low-volume-odometer-verification.json');
      const badExamplesPath = path.join(referenceArticlesPath, 'bad-examples.json');
      const variabilityPath = path.join(referenceArticlesPath, 'variability-system.json');

      if (fs.existsSync(highVolumePath)) {
        articles.highVolume = JSON.parse(fs.readFileSync(highVolumePath, 'utf8'));
      }
      if (fs.existsSync(midVolumePath)) {
        articles.midVolume = JSON.parse(fs.readFileSync(midVolumePath, 'utf8'));
      }
      if (fs.existsSync(lowVolumePath)) {
        articles.lowVolume = JSON.parse(fs.readFileSync(lowVolumePath, 'utf8'));
      }
      if (fs.existsSync(badExamplesPath)) {
        articles.badExamples = JSON.parse(fs.readFileSync(badExamplesPath, 'utf8'));
      }
      if (fs.existsSync(variabilityPath)) {
        articles.variability = JSON.parse(fs.readFileSync(variabilityPath, 'utf8'));
      }

      // Сохраняем в knowledge base
      const knowledge = {
        phase: 'reference-articles',
        type: 'quality-examples',
        ingestedAt: new Date().toISOString(),
        articles: articles,
        note: 'Reference articles for training: high-volume, mid-volume, low-volume examples, bad examples, and variability system'
      };

      this.appendKnowledge(knowledge);
      
      log('AI-TRAINING', `Reference articles ingested: ${Object.keys(articles).filter(k => articles[k]).length} files`);
      return articles;
    } catch (e) {
      log('AI-TRAINING', `Error ingesting reference articles: ${e.message}`);
      return null;
    }
  }

  /**
   * ФАЗА 7.10: TRIZ PRINCIPLES
   * Обучение на основах ТРИЗ (противоречия, ИКР, приемы, применение)
   * ТРИЗ: Понимание системы - AI понимает, почему система устроена так, а не иначе
   */
  async ingestTRIZPrinciples() {
    const trizPrinciplesPath = path.join(this.trainingDataPath, 'triz-principles.json');
    
    if (!fs.existsSync(trizPrinciplesPath)) {
      log('AI-TRAINING', 'TRIZ Principles file not found, skipping');
      return null;
    }

    try {
      const trizPrinciples = JSON.parse(fs.readFileSync(trizPrinciplesPath, 'utf8'));

      // Сохраняем в knowledge base
      const knowledge = {
        phase: 'triz-principles',
        type: 'system-principles',
        ingestedAt: new Date().toISOString(),
        principles: trizPrinciples,
        note: 'TRIZ Principles: contradictions, IKR, techniques, resolved contradictions, and system understanding'
      };

      this.appendKnowledge(knowledge);
      
      log('AI-TRAINING', `TRIZ Principles ingested: ${trizPrinciples.triz_techniques.length} techniques, ${trizPrinciples.resolved_contradictions.length} contradictions`);
      return trizPrinciples;
    } catch (e) {
      log('AI-TRAINING', `Error ingesting TRIZ Principles: ${e.message}`);
      return null;
    }
  }

  /**
   * ФАЗА 7.9: BUYER GUIDE KNOWLEDGE PACK
   * Обучение на Buyer Guide Knowledge Pack (тон, семантика, структура, примеры)
   * ТРИЗ: Использование ресурсов - систематизированные знания для buyer guides
   */
  async ingestBuyerGuideKnowledge() {
    const knowledgeBasePath = path.join(process.cwd(), 'monster-7.0/knowledge');
    
    if (!fs.existsSync(knowledgeBasePath)) {
      log('AI-TRAINING', 'Buyer Guide Knowledge Pack directory not found, skipping');
      return null;
    }

    try {
      const buyerGuideKnowledge = {
        vibration: null,
        semantic: {
          tier1: null,
          tier2: null,
          tier3: null
        },
        buyerGuides: {
          topics: null,
          structure: null,
          examples: null,
          policies: null
        },
        seo: {
          google: null,
          structuredData: null
        },
        domain: {
          vinCore: null,
          titlesAndStates: null,
          californiaRisks: null,
          fraudPatterns: null
        },
        competitors: null,
        triz: null
      };

      // Загружаем Vibration (тон)
      const toneCorePath = path.join(knowledgeBasePath, 'vibration/tone_core.txt');
      if (fs.existsSync(toneCorePath)) {
        buyerGuideKnowledge.vibration = fs.readFileSync(toneCorePath, 'utf8');
      }

      // Загружаем Semantic Tier 1
      const tier1Path = path.join(knowledgeBasePath, 'semantic/tier1/core.txt');
      if (fs.existsSync(tier1Path)) {
        buyerGuideKnowledge.semantic.tier1 = fs.readFileSync(tier1Path, 'utf8');
      }

      // Загружаем Semantic Tier 2
      const tier2Path = path.join(knowledgeBasePath, 'semantic/tier2/analytic.txt');
      if (fs.existsSync(tier2Path)) {
        buyerGuideKnowledge.semantic.tier2 = fs.readFileSync(tier2Path, 'utf8');
      }

      // Загружаем Semantic Tier 3
      const tier3Path = path.join(knowledgeBasePath, 'semantic/tier3/context.txt');
      if (fs.existsSync(tier3Path)) {
        buyerGuideKnowledge.semantic.tier3 = fs.readFileSync(tier3Path, 'utf8');
      }

      // Загружаем Buyer Guide Topics
      const topicsPath = path.join(knowledgeBasePath, 'buyer-guides/topics/core_topics.txt');
      if (fs.existsSync(topicsPath)) {
        buyerGuideKnowledge.buyerGuides.topics = fs.readFileSync(topicsPath, 'utf8');
      }

      // Загружаем Buyer Guide Structure (JSON)
      const structurePath = path.join(knowledgeBasePath, 'buyer-guides/structure/buyer_guide_structure.json');
      if (fs.existsSync(structurePath)) {
        buyerGuideKnowledge.buyerGuides.structure = JSON.parse(fs.readFileSync(structurePath, 'utf8'));
      }

      // Загружаем Golden Example
      const examplePath = path.join(knowledgeBasePath, 'buyer-guides/examples/golden_example_accord_2018.md');
      if (fs.existsSync(examplePath)) {
        buyerGuideKnowledge.buyerGuides.examples = fs.readFileSync(examplePath, 'utf8');
      }

      // Загружаем Writing Rules
      const rulesPath = path.join(knowledgeBasePath, 'buyer-guides/policies/writing_rules.md');
      if (fs.existsSync(rulesPath)) {
        buyerGuideKnowledge.buyerGuides.policies = fs.readFileSync(rulesPath, 'utf8');
      }

      // Загружаем SEO знания (v2)
      const seoGooglePath = path.join(knowledgeBasePath, 'seo/google/search_essentials_summary.md');
      if (fs.existsSync(seoGooglePath)) {
        buyerGuideKnowledge.seo.google = fs.readFileSync(seoGooglePath, 'utf8');
      }

      const seoStructuredPath = path.join(knowledgeBasePath, 'seo/structured_data/overview.md');
      if (fs.existsSync(seoStructuredPath)) {
        buyerGuideKnowledge.seo.structuredData = fs.readFileSync(seoStructuredPath, 'utf8');
      }

      // Загружаем Domain знания (v2)
      const vinCorePath = path.join(knowledgeBasePath, 'domain/vin_core.md');
      if (fs.existsSync(vinCorePath)) {
        buyerGuideKnowledge.domain.vinCore = fs.readFileSync(vinCorePath, 'utf8');
      }

      const titlesPath = path.join(knowledgeBasePath, 'domain/titles_and_states.md');
      if (fs.existsSync(titlesPath)) {
        buyerGuideKnowledge.domain.titlesAndStates = fs.readFileSync(titlesPath, 'utf8');
      }

      const californiaPath = path.join(knowledgeBasePath, 'domain/california_risks.md');
      if (fs.existsSync(californiaPath)) {
        buyerGuideKnowledge.domain.californiaRisks = fs.readFileSync(californiaPath, 'utf8');
      }

      const fraudPath = path.join(knowledgeBasePath, 'domain/fraud_patterns.md');
      if (fs.existsSync(fraudPath)) {
        buyerGuideKnowledge.domain.fraudPatterns = fs.readFileSync(fraudPath, 'utf8');
      }

      // Загружаем Competitor analysis (v2)
      const competitorsPath = path.join(knowledgeBasePath, 'competitors/how_to_learn_from_competitors.md');
      if (fs.existsSync(competitorsPath)) {
        buyerGuideKnowledge.competitors = fs.readFileSync(competitorsPath, 'utf8');
      }

      // Загружаем TRIZ для buyer guides (v2)
      const trizPath = path.join(knowledgeBasePath, 'triz/monster_buyer_guide_triz.md');
      if (fs.existsSync(trizPath)) {
        buyerGuideKnowledge.triz = fs.readFileSync(trizPath, 'utf8');
      }

      // Сохраняем в knowledge base
      const knowledge = {
        phase: 'buyer-guide-knowledge-pack',
        type: 'buyer-guide-system',
        ingestedAt: new Date().toISOString(),
        knowledge: buyerGuideKnowledge,
        note: 'Buyer Guide Knowledge Pack v2: vibration (tone), semantic tiers (1-3), buyer guide structure, golden example, writing rules, SEO knowledge, domain knowledge (VIN/titles/California/fraud), competitor analysis, and TRIZ principles'
      };

      this.appendKnowledge(knowledge);
      
      const loadedCount = [
        buyerGuideKnowledge.vibration,
        buyerGuideKnowledge.semantic.tier1,
        buyerGuideKnowledge.semantic.tier2,
        buyerGuideKnowledge.semantic.tier3,
        buyerGuideKnowledge.buyerGuides.topics,
        buyerGuideKnowledge.buyerGuides.structure,
        buyerGuideKnowledge.buyerGuides.examples,
        buyerGuideKnowledge.buyerGuides.policies,
        buyerGuideKnowledge.seo.google,
        buyerGuideKnowledge.seo.structuredData,
        buyerGuideKnowledge.domain.vinCore,
        buyerGuideKnowledge.domain.titlesAndStates,
        buyerGuideKnowledge.domain.californiaRisks,
        buyerGuideKnowledge.domain.fraudPatterns,
        buyerGuideKnowledge.competitors,
        buyerGuideKnowledge.triz
      ].filter(Boolean).length;
      
      log('AI-TRAINING', `Buyer Guide Knowledge Pack ingested: ${loadedCount} components`);
      return buyerGuideKnowledge;
    } catch (e) {
      log('AI-TRAINING', `Error ingesting Buyer Guide Knowledge Pack: ${e.message}`);
      return null;
    }
  }

  /**
   * ФАЗА 7.6: VIN REPORT SAMPLE TRAINING
   * Обучение на основе реального VIN отчета (образец)
   * ТРИЗ: Максимальное использование ресурсов - извлекаем максимум из образца
   */
  async ingestVINReportSample() {
    const { VINReportTrainingIntegration } = require('./vin-report-training-integration');
    const integration = new VINReportTrainingIntegration(this.config);
    
    // Ищем PDF файлы с VIN отчетами
    const reportPaths = [
      path.join(process.cwd(), 'VIN-Report-5TDYK3DC8DS290235.pdf'),
      path.join(process.cwd(), 'data/VIN-Report-5TDYK3DC8DS290235.pdf'),
      path.join(process.cwd(), 'public/VIN-Report-5TDYK3DC8DS290235.pdf'),
      path.join(process.cwd(), 'docs/VIN-Report-5TDYK3DC8DS290235.pdf')
    ];
    
    for (const reportPath of reportPaths) {
      if (fs.existsSync(reportPath)) {
        log('AI-TRAINING', `Found VIN report sample: ${reportPath}`);
        try {
          const result = await integration.trainFromReport(reportPath);
          log('AI-TRAINING', `VIN report training completed: ${result.recommendations.length} recommendations`);
          
          // Сохраняем рекомендации в knowledge base
          const knowledge = {
            phase: 'vin-report-sample',
            type: 'real-report-structure',
            ingestedAt: new Date().toISOString(),
            source: reportPath,
            recommendations: result.recommendations,
            extractedData: result.extractedData,
            note: 'Real VIN report structure and style extracted for AI training (competitor brands removed)'
          };
          this.appendKnowledge(knowledge);
          
          return result;
        } catch (e) {
          log('AI-TRAINING', `Error training from VIN report: ${e.message}`);
        }
        break;
      }
    }
    
    log('AI-TRAINING', 'No VIN report sample found, skipping VIN report training');
    return null;
  }

  /**
   * ФАЗА 7: INTERNAL MACHINE LEARNING INPUTS
   * Автоматические логи, на которых модель учится ПОСЛЕ появления трафика
   */
  async ingestInternalMetrics() {
    const logFiles = [
      './logs/crawl_status.json',
      './logs/ranking_top_pages.json',
      './logs/gsc_queries.json',
      './logs/gsc_clicks.json',
      './logs/template_performance.json',
      './logs/ctr_by_template.json',
      './logs/bounce_rates.json',
      './logs/ai-regeneration-wins.json'
    ];

    log('AI-TRAINING', 'Ingesting Internal Machine Learning Inputs');
    
    const metrics = {};
    for (const logFile of logFiles) {
      const fullPath = path.join(process.cwd(), logFile);
      if (fs.existsSync(fullPath)) {
        try {
          const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
          metrics[logFile] = data;
        } catch (e) {
          log('AI-TRAINING', `Error reading ${logFile}: ${e.message}`);
        }
      }
    }

    const knowledge = {
      phase: 'internal-metrics',
      sources: logFiles,
      ingestedAt: new Date().toISOString(),
      type: 'internal-performance-data',
      metrics: metrics,
      note: 'Automatic logs for model learning after traffic appears'
    };

    this.appendKnowledge(knowledge);
    return knowledge;
  }

  /**
   * Сохранение знаний в базу
   */
  appendKnowledge(knowledge) {
    try {
      fs.appendFileSync(
        this.knowledgeBasePath,
        JSON.stringify(knowledge) + '\n'
      );
    } catch (e) {
      error('AI-TRAINING', `Error appending knowledge: ${e.message}`);
    }
  }

  /**
   * Загрузка базы знаний
   */
  loadKnowledgeBase() {
    const knowledge = [];
    if (fs.existsSync(this.knowledgeBasePath)) {
      try {
        const lines = fs.readFileSync(this.knowledgeBasePath, 'utf8')
          .split('\n')
          .filter(Boolean);
        for (const line of lines) {
          try {
            knowledge.push(JSON.parse(line));
          } catch (e) {
            // Skip invalid lines
          }
        }
      } catch (e) {
        error('AI-TRAINING', `Error loading knowledge base: ${e.message}`);
      }
    }
    return knowledge;
  }

  /**
   * КРИТИЧНО: AI вырабатывает свою стратегию на основе знаний
   * Не даем готовые решения, только знания - AI сама находит путь
   */
  async developStrategy() {
    log('AI-TRAINING', 'AI developing its own strategy based on knowledge base');
    
    const knowledgeBase = this.loadKnowledgeBase();
    
    // Промпт для AI: найди свой максимально эффективный путь
    const strategyPrompt = `You are an advanced SEO AI system that has been trained on official Google documentation and industry sources.

KNOWLEDGE BASE:
${JSON.stringify(knowledgeBase, null, 2)}

YOUR TASK:
Based on this knowledge, develop YOUR OWN strategy for maximizing SEO effectiveness and profitability for a VIN check website.

CRITICAL REQUIREMENTS:
1. You must find YOUR OWN path - do not follow templates or "best practices" blindly
2. Focus on what actually works based on the official Google documentation
3. Consider the specific context: VIN check pages, automotive industry, large-scale generation
4. Develop a strategy that maximizes traffic AND conversions
5. Be creative and innovative - find unique approaches that work for this specific use case

OUTPUT:
Provide a JSON strategy with:
- core_principles: Your core SEO principles based on Google docs
- content_strategy: How you will generate content
- technical_strategy: Technical SEO approach
- entity_graph_strategy: How to build the entity graph (brand → model → year → VIN)
- crawl_budget_strategy: How to manage crawl budget for large scale
- learning_strategy: How you will learn and adapt from results
- unique_approaches: Your unique innovative approaches

Remember: You must find YOUR OWN path, not copy existing strategies.`;

    try {
      // Используем DeepSeek для стратегии (экономия Groq)
      const strategyText = await this.aiAugmentation.generateText(strategyPrompt, {
        lang: 'en',
        intent: 'strategy_development',
        maxTokens: 2000
      });

      // Парсим стратегию из ответа AI
      const strategy = this.parseStrategyFromAI(strategyText);
      
      // Сохраняем стратегию
      this.saveStrategy(strategy);
      
      log('AI-TRAINING', 'AI strategy developed and saved');
      return strategy;
    } catch (e) {
      error('AI-TRAINING', `Error developing strategy: ${e.message}`);
      return this.getFallbackStrategy();
    }
  }

  /**
   * Парсинг стратегии из ответа AI
   */
  parseStrategyFromAI(aiResponse) {
    try {
      // Пытаемся найти JSON в ответе
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Если JSON не найден, создаем структуру из текста
      return {
        core_principles: this.extractSection(aiResponse, 'core_principles'),
        content_strategy: this.extractSection(aiResponse, 'content_strategy'),
        technical_strategy: this.extractSection(aiResponse, 'technical_strategy'),
        entity_graph_strategy: this.extractSection(aiResponse, 'entity_graph_strategy'),
        crawl_budget_strategy: this.extractSection(aiResponse, 'crawl_budget_strategy'),
        learning_strategy: this.extractSection(aiResponse, 'learning_strategy'),
        unique_approaches: this.extractSection(aiResponse, 'unique_approaches'),
        raw_response: aiResponse,
        developedAt: new Date().toISOString()
      };
    } catch (e) {
      log('AI-TRAINING', `Error parsing strategy: ${e.message}`);
      return this.getFallbackStrategy();
    }
  }

  /**
   * Извлечение секции из текста
   */
  extractSection(text, sectionName) {
    const regex = new RegExp(`${sectionName}[\\s:]*([^\\n]+(?:\\n(?!\\w+:)[^\\n]+)*)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
  }

  /**
   * Сохранение стратегии
   */
  saveStrategy(strategy) {
    try {
      fs.writeFileSync(
        this.strategyPath,
        JSON.stringify(strategy, null, 2),
        'utf8'
      );
    } catch (e) {
      error('AI-TRAINING', `Error saving strategy: ${e.message}`);
    }
  }

  /**
   * Загрузка стратегии
   */
  loadStrategy() {
    if (fs.existsSync(this.strategyPath)) {
      try {
        return JSON.parse(fs.readFileSync(this.strategyPath, 'utf8'));
      } catch (e) {
        error('AI-TRAINING', `Error loading strategy: ${e.message}`);
      }
    }
    return this.getFallbackStrategy();
  }

  /**
   * Fallback стратегия (минимальная, если AI не смогла выработать)
   */
  getFallbackStrategy() {
    return {
      core_principles: [
        'Follow Google official documentation',
        'Focus on quality content',
        'Build entity graph structure',
        'Optimize for Core Web Vitals'
      ],
      content_strategy: 'Generate high-quality, unique content for each VIN',
      technical_strategy: 'Optimize for Core Web Vitals and mobile-first indexing',
      entity_graph_strategy: 'Build hierarchical structure: brand → model → year → VIN',
      crawl_budget_strategy: 'Use sitemaps and robots.txt efficiently',
      learning_strategy: 'Learn from GSC data and internal metrics',
      unique_approaches: [],
      isFallback: true,
      developedAt: new Date().toISOString()
    };
  }

  /**
   * Полный цикл обучения
   */
  async train() {
    log('AI-TRAINING', 'Starting AI training pipeline');
    
    try {
      // Фаза 1-6: Ингест знаний
      await this.ingestCoreFoundations();
      await this.ingestEntityGraph();
      await this.ingestIndustrySources();
      await this.ingestTechnicalSEO();
      await this.ingestLargeSiteManagement();
      await this.ingestUserIntent();
      
      // Фаза 7.5: GA4/GTM/GSC документация
      const ga4GtmDocsPath = path.join(this.trainingDataPath, 'ga4-gtm-search-console-docs.jsonl');
      if (fs.existsSync(ga4GtmDocsPath)) {
        log('AI-TRAINING', 'Ingesting GA4/GTM/GSC documentation');
        await this.ingestFromJSONL('data/seo/ai-training/ga4-gtm-search-console-docs.jsonl');
      }
      
      // Фаза 7.6: VIN Report Training (реальный образец отчета)
      await this.ingestVINReportSample();
      
      // Фаза 7.7: Reference Articles Training (эталонные статьи VЧ/СЧ/НЧ)
      await this.ingestReferenceArticles();
      
      // Фаза 7.8: VIN Collection Training (оплаченные и неоплаченные VIN коды)
      // ТРИЗ: Максимальное использование ресурсов - каждый VIN становится источником обучения
      try {
        const { VINCollectionTraining } = require('./vin-collection-training');
        const vinCollectionTraining = new VINCollectionTraining(this.config);
        await vinCollectionTraining.trainFromCollectedVINs();
        log('AI-TRAINING', 'VIN Collection Training completed');
      } catch (e) {
        log('AI-TRAINING', `VIN Collection Training error: ${e.message}`);
        // Не прерываем обучение, если VIN Collection Training не удался
      }
      
      // Фаза 7.9: Buyer Guide Knowledge Pack (тон, семантика, структура, примеры)
      // ТРИЗ: Использование ресурсов - систематизированные знания для buyer guides
      await this.ingestBuyerGuideKnowledge();
      
      // Фаза 7.10: TRIZ Principles (основы ТРИЗ для понимания системы)
      // ТРИЗ: Понимание системы - AI понимает, почему система устроена так, а не иначе
      await this.ingestTRIZPrinciples();
      
      // Фаза 7: Внутренние метрики (только если есть трафик)
      const hasTraffic = this.checkIfHasTraffic();
      if (hasTraffic) {
        await this.ingestInternalMetrics();
      }
      
      // КРИТИЧНО: AI вырабатывает свою стратегию
      const strategy = await this.developStrategy();
      
      log('AI-TRAINING', 'AI training pipeline completed');
      return strategy;
    } catch (e) {
      error('AI-TRAINING', `Training pipeline error: ${e.message}`);
      return this.getFallbackStrategy();
    }
  }

  /**
   * Проверка наличия трафика
   */
  checkIfHasTraffic() {
    const gscPath = path.join(process.cwd(), 'logs/gsc_clicks.json');
    if (fs.existsSync(gscPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(gscPath, 'utf8'));
        return data.totalClicks > 0;
      } catch (e) {
        return false;
      }
    }
    return false;
  }

  /**
   * TRIZ ПРИНЦИП: Дробление + Ограничение
   * Обновление стратегии на основе новых данных (оптимизировано для длинных промптов)
   */
  async updateStrategyFromResults(results) {
    log('AI-TRAINING', 'Updating strategy based on new results');
    
    const currentStrategy = this.loadStrategy();
    const knowledgeBase = this.loadKnowledgeBase();
    
    // TRIZ: Ограничиваем размер данных для промпта
    const MAX_STRATEGY_LENGTH = 2000; // Максимум символов для стратегии
    const MAX_RESULTS_LENGTH = 1000;  // Максимум символов для результатов
    const MAX_KNOWLEDGE_LENGTH = 500; // Максимум символов для базы знаний
    
    // TRIZ: Компактная версия стратегии
    let strategyText = JSON.stringify(currentStrategy, null, 2);
    if (strategyText.length > MAX_STRATEGY_LENGTH) {
      // Берем только ключевые поля с безопасной обработкой типов
      const compactStrategy = {
        core_principles: typeof currentStrategy.core_principles === 'string' 
          ? currentStrategy.core_principles.substring(0, 500)
          : (Array.isArray(currentStrategy.core_principles)
              ? currentStrategy.core_principles.slice(0, 3)
              : JSON.stringify(currentStrategy.core_principles || {}).substring(0, 500)),
        content_strategy: typeof currentStrategy.content_strategy === 'string'
          ? currentStrategy.content_strategy.substring(0, 500)
          : JSON.stringify(currentStrategy.content_strategy || {}).substring(0, 500),
        unique_approaches: Array.isArray(currentStrategy.unique_approaches) 
          ? currentStrategy.unique_approaches.slice(0, 3)
          : (typeof currentStrategy.unique_approaches === 'string'
              ? currentStrategy.unique_approaches.substring(0, 500)
              : JSON.stringify(currentStrategy.unique_approaches || {}).substring(0, 500))
      };
      strategyText = JSON.stringify(compactStrategy, null, 2);
    }
    
    // TRIZ: Компактная версия результатов
    let resultsText = JSON.stringify(results, null, 2);
    if (resultsText.length > MAX_RESULTS_LENGTH) {
      // Берем только ключевые метрики
      const compactResults = {
        articleVersion: results.articleVersion,
        analysis: {
          qualityScore: results.analysis?.qualityScore,
          wordCount: results.analysis?.wordCount,
          hasStructure: results.analysis?.hasStructure
        },
        improvements: Array.isArray(results.improvements) 
          ? results.improvements.slice(0, 3)
          : results.improvements
      };
      resultsText = JSON.stringify(compactResults, null, 2);
    }
    
    // TRIZ: Компактная версия базы знаний (только последние записи)
    let knowledgeText = '';
    if (knowledgeBase.length > 0) {
      const recentKnowledge = knowledgeBase.slice(-5); // Только последние 5 записей
      knowledgeText = JSON.stringify(recentKnowledge, null, 2);
      if (knowledgeText.length > MAX_KNOWLEDGE_LENGTH) {
        knowledgeText = knowledgeText.substring(0, MAX_KNOWLEDGE_LENGTH) + '...';
      }
    }
    
    const updatePrompt = `You are an advanced SEO AI system. Update your strategy based on new results.

CURRENT STRATEGY (summary):
${strategyText}

NEW RESULTS (key metrics):
${resultsText}

${knowledgeText ? `RECENT KNOWLEDGE:\n${knowledgeText}\n` : ''}

TASK: Update strategy based on what worked. Focus on improvements.

OUTPUT: JSON strategy with core_principles, content_strategy, unique_approaches.`;

    // TRIZ: Проверяем длину промпта
    if (updatePrompt.length > 5000) {
      log('AI-TRAINING', `Prompt too long (${updatePrompt.length} chars), further truncating...`);
      // Дополнительное усечение
      const truncatedPrompt = updatePrompt.substring(0, 4000) + '\n[...truncated for API stability...]';
      return this.updateStrategyWithTruncatedPrompt(truncatedPrompt, results, currentStrategy);
    }

    try {
      const updatedStrategyText = await this.aiAugmentation.generateText(updatePrompt, {
        lang: 'en',
        intent: 'strategy_update',
        maxTokens: 1500, // Уменьшено для стабильности
        useCompactStrategy: true // Используем компактную стратегию
      });

      const updatedStrategy = this.parseStrategyFromAI(updatedStrategyText);
      updatedStrategy.lastUpdated = new Date().toISOString();
      updatedStrategy.basedOnResults = {
        articleVersion: results.articleVersion,
        qualityScore: results.analysis?.qualityScore
      };
      
      // TRIZ: Сохраняем только если стратегия валидна
      if (updatedStrategy && updatedStrategy.core_principles) {
        this.saveStrategy(updatedStrategy);
        log('AI-TRAINING', 'Strategy updated based on results');
      } else {
        log('AI-TRAINING', 'Strategy update failed, keeping current strategy');
      }
      
      return updatedStrategy || currentStrategy;
    } catch (e) {
      error('AI-TRAINING', `Error updating strategy: ${e.message}`);
      return currentStrategy;
    }
  }

  /**
   * TRIZ: Fallback метод для обновления с усеченным промптом
   */
  async updateStrategyWithTruncatedPrompt(truncatedPrompt, results, currentStrategy) {
    try {
      const updatedStrategyText = await this.aiAugmentation.generateText(truncatedPrompt, {
        lang: 'en',
        intent: 'strategy_update',
        maxTokens: 1000,
        useCompactStrategy: true
      });

      const updatedStrategy = this.parseStrategyFromAI(updatedStrategyText);
      updatedStrategy.lastUpdated = new Date().toISOString();
      updatedStrategy.basedOnResults = {
        articleVersion: results.articleVersion,
        qualityScore: results.analysis?.qualityScore
      };
      
      if (updatedStrategy && updatedStrategy.core_principles) {
        this.saveStrategy(updatedStrategy);
        log('AI-TRAINING', 'Strategy updated with truncated prompt');
      }
      
      return updatedStrategy || currentStrategy;
    } catch (e) {
      log('AI-TRAINING', `Truncated prompt update failed: ${e.message}, keeping current strategy`);
      return currentStrategy;
    }
  }
}

module.exports = { AITrainingPipeline };

