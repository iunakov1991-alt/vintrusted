const fs = require('fs');
const path = require('path');
const { log, error } = require('../logger');
const { AIAugmentation } = require('../content/ai-augmentation');
const { AITrainingPipeline } = require('../ai/ai-training-pipeline');
const { ArticleGeneratorV6 } = require('./article-generator-v6');
const { OptimizedArticleAnalyzer } = require('./optimized-article-analyzer');
const { ArticleQualityUtils } = require('./article-quality-utils');
const config = require('../../../data/seo/config.json');

/**
 * СИСТЕМА САМООБУЧЕНИЯ - Цикл обучения на основе генерации статей
 * 
 * Процесс:
 * 1. Генерирует статью БЕЗ обучения (базовая версия)
 * 2. Применяет обучение на этой статье
 * 3. Обновляет стратегию на основе результатов
 * 4. Регенерирует статью с учетом обучения
 * 5. Повторяет 10 раз
 * 6. Создает страницу сравнения всех версий
 */

class SelfLearningLoop {
  constructor(config) {
    this.config = config;
    this.aiAugmentation = new AIAugmentation(config);
    this.aiTraining = new AITrainingPipeline(config);
    this.articleGeneratorV6 = new ArticleGeneratorV6(this.aiAugmentation, config);
    this.optimizedAnalyzer = new OptimizedArticleAnalyzer(this.aiAugmentation, config);
    this.versions = [];
    this.outputDir = path.join(process.cwd(), 'public/learning-loop');
    this.comparisonPath = path.join(this.outputDir, 'comparison.html');
    
    // Включаем Ollama если доступен
    if (process.env.USE_LOCAL_AI !== '0' && process.env.USE_LOCAL_AI !== 'false') {
      process.env.USE_LOCAL_AI = '1'; // Включаем Ollama для версии 6
    }
    
    // Создаем директорию для версий
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Генерация статьи БЕЗ обучения (базовая версия)
   */
  async generateArticleWithoutTraining(iteration) {
    log('SELF-LEARNING', `Generating article v${iteration} WITHOUT training...`);
    
    // Создаем новый экземпляр AIAugmentation без стратегии
    const { AIAugmentation } = require('../content/ai-augmentation');
    const aiAugmentationNoTraining = new AIAugmentation(this.config);
    // Принудительно отключаем стратегию
    aiAugmentationNoTraining.aiStrategy = null;
    
    try {
      const context = {
        make: 'Toyota',
        model: 'Camry',
        year: '2018',
        stateSlug: 'california',
        stateLabel: 'California',
        intent: 'vin_check',
        lang: 'en',
        vin: '4T1BF1FK3FU123456'
      };

      // TRIZ ПРИНЦИП: Дробление - разделяем генерацию на 3 части для лучшего качества
      log('SELF-LEARNING', `Generating article WITHOUT training in 3 parts...`);
      
      // Часть 1: VIN Decoder + NMVTIS + Технические детали (без обучения - упрощенная версия)
      const part1Prompt = `Write the first part of a technical VIN check guide for ${context.year} ${context.make} ${context.model} in ${context.stateLabel}.

Use FACTUAL, TECHNICAL style (no literary language).

PART 1 must include:
1. Brief introduction (2-3 sentences): Direct statement about VIN check importance
2. VIN Decoder: 17-character structure, position meanings, ${context.year} ${context.make} ${context.model}-specific codes (engine codes, plant codes)
3. NMVTIS explanation: Primary data source, providers, state DMV integration
4. Technical specs: Engine options for ${context.year} ${context.make} ${context.model}, VIN position 8 identifies engine
5. CTA: "Check this ${context.year} ${context.make} ${context.model} VIN now"

Write 500-600 words. Technical, factual tone.`;
      
      log('SELF-LEARNING', `Generating Part 1/3 (without training)...`);
      const part1 = await aiAugmentationNoTraining.generateText(part1Prompt, {
        lang: context.lang,
        intent: context.intent,
        maxTokens: 1200,
        timeout: 120000,
        make: context.make,
        year: context.year,
        stateSlug: context.stateSlug
      });
      
      // Часть 2: Recalls + Common Problems + Таблицы (без обучения - упрощенная версия)
      const part2Prompt = `Write the second part of a technical VIN check guide for ${context.year} ${context.make} ${context.model} in ${context.stateLabel}.

Use FACTUAL, TECHNICAL style. Include tables in markdown format.

PART 2 must include:
1. Recalls for ${context.year} ${context.make} ${context.model}: Fuel pump, brake assist, TSS sensor, A/C evaporator. Format as table.
2. Common Problems: Fuel pump failures, brake issues, TSS failures, A/C leaks, transmission hesitation, hybrid battery (if applicable)
3. Comparison Tables (markdown):
   - Title Brand Types (Clean, Salvage, Rebuilt, Flood, Lemon) with CA definitions
   - Clean vs Salvage prices in CA (by mileage)
   - Accident Severity Tiers (Minor, Moderate, Severe, Total Loss)
4. How to Read Report: 7-step guide
5. Red Flags: Branded title, severe accidents, odometer rollback, frequent ownership, unreleased liens, open recalls, rental/fleet use

Write 800-1000 words. Include all tables.`;

      log('SELF-LEARNING', `Generating Part 2/3 (without training)...`);
      let part2 = await aiAugmentationNoTraining.generateText(part2Prompt, {
        lang: context.lang,
        intent: context.intent,
        maxTokens: 2000,
        timeout: 120000,
        make: context.make,
        year: context.year,
        stateSlug: context.stateSlug
      });
      
      // TRIZ: Retry для части 2, если использован fallback
      if (part2 && part2.includes('This section provides general')) {
        log('SELF-LEARNING', `Part 2 failed, retrying with shorter prompt...`);
        const part2RetryPrompt = `Write part 2: recalls, common problems, comparison tables, red flags. 600 words. Include markdown tables.`;
        part2 = await aiAugmentationNoTraining.generateText(part2RetryPrompt, {
          lang: context.lang,
          intent: context.intent,
          maxTokens: 1500,
          timeout: 120000,
          make: context.make,
          year: context.year,
          stateSlug: context.stateSlug
        });
      }
      
      // Часть 3: CA-специфика + Checklist + CTA (без обучения - упрощенная версия)
      const part3Prompt = `Write the final part of a technical VIN check guide for ${context.year} ${context.make} ${context.model} in ${context.stateLabel}.

Use FACTUAL, TECHNICAL style. Include specific CA DMV forms and processes.

PART 3 must include:
1. California-Specific:
   - Smog Check: STAR stations, biennial schedule, exceptions
   - Revived Salvage: Brake & Lamp inspection, CHP verification, REG 343
   - Odometer Disclosure: REG 51, exemptions
   - Title Pathway: REG 262 (transfer), REG 227 (duplicate), revived salvage, flood title
   - Emissions patterns for ${context.year} ${context.make} ${context.model}
   - CA theft hotspots: LA County, SF Bay, San Bernardino
2. Market Value Ranges in CA: Clean title, salvage, rebuilt (by mileage)
3. How to Get Report: NMVTIS providers, commercial providers, free options
4. Actionable Checklist: 11-item pre-purchase checklist (numbered)
5. Legal Citations: CA Vehicle Code, Lemon Law, odometer disclosure
6. Final CTA: "Run Full VIN Report" with value proposition

Write 700-900 words. Include form numbers and legal requirements.`;

      log('SELF-LEARNING', `Generating Part 3/3 (without training)...`);
      const part3 = await aiAugmentationNoTraining.generateText(part3Prompt, {
        lang: context.lang,
        intent: context.intent,
        maxTokens: 1800,
        timeout: 120000,
        make: context.make,
        year: context.year,
        stateSlug: context.stateSlug
      });
      
      // TRIZ: Объединяем части в полную статью
      const aiText = `${part1}\n\n${part2}\n\n${part3}`;
      log('SELF-LEARNING', `Article assembled from 3 parts. Total length: ${aiText.length} chars`);

      const article = {
        iteration,
        version: `v${iteration}`,
        title: `VIN Check Guide for ${context.year} ${context.make} ${context.model} in ${context.stateLabel}`,
        h1: `Complete VIN Check Guide: ${context.year} ${context.make} ${context.model} in ${context.stateLabel}`,
        content: aiText,
        wordCount: ArticleQualityUtils.countWords(aiText),
        qualityScore: ArticleQualityUtils.calculateBasicQualityScore(aiText),
        trained: false,
        timestamp: new Date().toISOString()
      };

      return article;
    } catch (e) {
      error('SELF-LEARNING', `Error generating article without training: ${e.message}`);
      throw e;
    }
  }

  /**
   * Генерация статьи С обучением (версия 6: 12-14 блоков)
   */
  async generateArticleWithTraining(iteration) {
    log('SELF-LEARNING', `Generating article v${iteration} WITH training (V6: 12-14 blocks)...`);
    
    // Убеждаемся, что стратегия загружена
    // Если стратегии нет, запускаем обучение
    if (!this.aiAugmentation.aiStrategy) {
      log('SELF-LEARNING', 'No strategy found, training AI first...');
      await this.aiTraining.train();
      this.aiAugmentation.loadAITrainingStrategy();
    } else {
      // Перезагружаем стратегию на случай обновлений
      this.aiAugmentation.loadAITrainingStrategy();
    }
    
    const context = {
      make: 'Toyota',
      model: 'Camry',
      year: '2018',
      stateSlug: 'california',
      stateLabel: 'California',
      intent: 'vin_check',
      lang: 'en',
      vin: '4T1BF1FK3FU123456'
    };

    // ВЕРСИЯ 6: Генерация через ArticleGeneratorV6 (12-14 блоков, Ollama + DeepSeek)
    log('SELF-LEARNING', `Generating V6 article with 12-14 blocks (Ollama + DeepSeek)...`);
    
    try {
      const articleV6 = await this.articleGeneratorV6.generateArticle(context);
      
      // Добавляем метаданные для self-learning
      const article = {
        iteration,
        version: `v${iteration}`,
        title: articleV6.title,
        h1: articleV6.h1,
        content: articleV6.content,
        wordCount: articleV6.wordCount,
        qualityScore: ArticleQualityUtils.calculateBasicQualityScore(articleV6.content),
        trained: true,
        timestamp: new Date().toISOString(),
        blocks: articleV6.blocks,
        blocksDetail: articleV6.blocksDetail
      };

      return article;
    } catch (e) {
      error('SELF-LEARNING', `V6 generation error: ${e.message}, falling back to 3-part generation`);
      // Fallback на старую генерацию по 3 частям
      return await this.generateArticleWithTrainingLegacy(iteration, context);
    }
  }

  /**
   * Legacy генерация по 3 частям (fallback)
   */
  async generateArticleWithTrainingLegacy(iteration, context) {
    log('SELF-LEARNING', `Using legacy 3-part generation...`);
    
    // TRIZ ПРИНЦИП: Дробление - разделяем генерацию на 3 части для лучшего качества
    log('SELF-LEARNING', `Generating article in 3 parts for better quality...`);
    
    // Часть 1: VIN Decoder + NMVTIS + Технические детали + CTA
    const part1Prompt = `Write the first part of a technical VIN check guide for ${context.year} ${context.make} ${context.model} in ${context.stateLabel}.

CRITICAL REQUIREMENTS:
- Use FACTUAL, TECHNICAL style (no literary flourishes)
- Focus on actionable, scannable content
- Include specific data and technical details

PART 1 must include:

1. **Brief Introduction (2-3 sentences max)**: Direct statement about VIN check importance for ${context.year} ${context.make} ${context.model} in ${context.stateLabel}. NO literary language.

2. **VIN Decoder Block for ${context.year} ${context.make} ${context.model}**:
   - Explain 17-character VIN structure
   - Decode position meanings (WMI, VDS, VIS)
   - ${context.year} ${context.make} ${context.model}-specific VIN codes:
     * Engine codes: 2.5L A25A-FKS (non-hybrid), 2.5L hybrid, 3.5L 2GR-FKS (V6)
     * Plant codes for ${context.year} Camry
     * Model year identifier (position 10)
   - Example VIN breakdown: ${context.vin || '4T1BF1FK3FU123456'}
   - Format as structured list or table

3. **NMVTIS (National Motor Vehicle Title Information System)**:
   - Explain NMVTIS as primary data source
   - List NMVTIS data providers
   - Explain how VIN reports aggregate NMVTIS data
   - Mention state DMV integration

4. **Technical Specifications for ${context.year} ${context.make} ${context.model}**:
   - Engine options: 2.5L A25A-FKS (4-cylinder), 2.5L hybrid, 3.5L 2GR-FKS (V6)
   - VIN position 8 identifies engine type
   - Production locations
   - Typical VIN patterns

5. **CTA Block**: "Check this ${context.year} ${context.make} ${context.model} VIN now" with brief value proposition.

Write 500-600 words. Use technical, factual tone. NO metaphors, NO literary language.`;
    
    log('SELF-LEARNING', `Generating Part 1/3...`);
    const part1 = await this.aiAugmentation.generateText(part1Prompt, {
      lang: context.lang,
      intent: context.intent,
      maxTokens: 1200,
      timeout: 120000,
      make: context.make,
      year: context.year,
      stateSlug: context.stateSlug
    });
    
    // Часть 2: Recalls + Common Problems + Таблицы + Red Flags
    const part2Prompt = `Write the second part of a technical VIN check guide for ${context.year} ${context.make} ${context.model} in ${context.stateLabel}.

CRITICAL REQUIREMENTS:
- Use FACTUAL, TECHNICAL style
- Include tables in markdown format
- Focus on ${context.year} ${context.make} ${context.model}-specific data

PART 2 must include:

1. **Recalls for ${context.year} ${context.make} ${context.model} (Full List)**:
   - Fuel pump recall (NHTSA campaign number if available)
   - Brake assist vacuum pump issues
   - TSS (Toyota Safety Sense) sensor failures
   - A/C evaporator leaks
   - Any other ${context.year}-specific recalls
   - Format as table: | Recall | Component | Status | Action Required |
   - Explain how to verify recall completion via VIN

2. **Common Problems for ${context.year} ${context.make} ${context.model}**:
   - Fuel pump failure patterns
   - Brake assist vacuum pump issues
   - TSS sensor failures
   - A/C evaporator leaks
   - Early transmission hesitation cases
   - Hybrid battery longevity (if applicable)
   - Typical mileage bands: 80-160k for CA fleet use
   - Format as structured list with technical details

3. **Comparison Tables** (markdown format):
   
   Table 1: Title Brand Types (with CA definitions)
   | Title Brand | CA Definition | Impact on Value | Insurance |
   |------------|---------------|-----------------|-----------|
   | Clean | No branded history | Full value | Standard |
   | Salvage | Total loss claim | 40-60% reduction | Limited |
   | Rebuilt | Salvage + inspection | 30-50% reduction | Limited |
   | Flood | Water damage | 50-70% reduction | Difficult |
   | Lemon Law | Buyback | 20-40% reduction | Standard |
   
   Table 2: Clean vs Salvage ${context.year} ${context.make} ${context.model} Prices in CA
   | Condition | Mileage Range | CA Market Value | Notes |
   |-----------|---------------|------------------|-------|
   | Clean Title | 50-80k | $X,XXX-$X,XXX | Standard range |
   | Clean Title | 80-120k | $X,XXX-$X,XXX | High mileage |
   | Salvage Title | 50-80k | $X,XXX-$X,XXX | 40-60% below clean |
   | Rebuilt Title | 50-80k | $X,XXX-$X,XXX | 30-50% below clean |
   
   Table 3: Accident Severity Tiers
   | Severity | Damage Type | Airbag Deployment | Frame Damage | Value Impact |
   |----------|-------------|-------------------|--------------|-------------|
   | Minor | Cosmetic | No | No | 5-10% |
   | Moderate | Body panels | Possible | No | 15-25% |
   | Severe | Structural | Yes | Yes | 30-50% |
   | Total Loss | Extensive | Yes | Yes | 60-80% |

4. **How to Read a Vehicle History Report: Step-by-Step Guide**:
   - Step 1: Verify VIN matches vehicle
   - Step 2: Check title brand and history
   - Step 3: Analyze accident timeline
   - Step 4: Verify odometer consistency
   - Step 5: Review ownership patterns
   - Step 6: Check recall completion status
   - Step 7: Verify lien release
   - Format as numbered list (7 steps)

5. **Major Red Flags to Watch For**:
   - Branded title (salvage, flood, lemon)
   - Severe accident with frame damage
   - Odometer rollback/discrepancy
   - Frequent ownership changes (4+ owners in 3 years)
   - Unreleased liens
   - Open safety recalls
   - Rental/fleet use indicators
   - Format as bullet list with technical explanations

Write 800-1000 words. Use technical, factual tone. Include all tables in markdown format.`;
    
    log('SELF-LEARNING', `Generating Part 2/3...`);
    let part2 = await this.aiAugmentation.generateText(part2Prompt, {
      lang: context.lang,
      intent: context.intent,
      maxTokens: 2000,
      timeout: 120000,
      make: context.make,
      year: context.year,
      stateSlug: context.stateSlug
    });
    
    // TRIZ: Retry для части 2, если использован fallback
    if (part2 && part2.includes('This section provides general')) {
      log('SELF-LEARNING', `Part 2 failed, retrying with shorter prompt...`);
      const part2RetryPrompt = `Write part 2: recalls, common problems, comparison tables, red flags. 600 words. Include markdown tables.`;
      part2 = await this.aiAugmentation.generateText(part2RetryPrompt, {
        lang: context.lang,
        intent: context.intent,
        maxTokens: 1500,
        timeout: 120000,
        make: context.make,
        year: context.year,
        stateSlug: context.stateSlug
      });
    }
    
    // Часть 3: CA-специфика + DMV Pathways + Market Value + Checklist + CTA
    const part3Prompt = `Write the final part of a technical VIN check guide for ${context.year} ${context.make} ${context.model} in ${context.stateLabel}.

CRITICAL REQUIREMENTS:
- Use FACTUAL, TECHNICAL style
- Include specific CA DMV forms and processes
- Focus on actionable, legal information

PART 3 must include:

1. **California-Specific Considerations** (detailed):
   
   **Smog Check Requirements**:
   - STAR stations (Test-Only vs Test-and-Repair)
   - Biennial schedule (every 2 years for vehicles 6+ years old)
   - Exceptions (new vehicles, transfers)
   - Smog certificate validity period
   - How VIN reports show smog history
   
   **Revived Salvage Process**:
   - Brake & Lamp inspection requirement
   - CHP (California Highway Patrol) verification
   - REG 343 form
   - Inspection stations
   - Timeline and costs
   
   **Odometer Disclosure**:
   - REG 51 form requirements
   - Exemptions for older vehicles (10+ years)
   - Penalties for false disclosure
   - How VIN reports verify odometer accuracy
   
   **Title Pathway (CA DMV)**:
   - Transfer process (REG 262)
   - Duplicate title (REG 227)
   - Revived salvage title process
   - Flood title requirements
   - Lemon Law Buyback disclosure (must be on title)
   
   **Emissions & Smog Fail Patterns**:
   - Common failure reasons for ${context.year} ${context.make} ${context.model}
   - OBD-II readiness requirements
   - Visual inspection items
   - Retest procedures
   
   **Real CA Theft Hotspots**:
   - LA County (highest rate)
   - SF Bay Area
   - San Bernardino County
   - How VIN reports show theft/recovery history

2. **${context.year} ${context.make} ${context.model} Market Value Ranges in CA**:
   - Clean title: $X,XXX-$X,XXX (by mileage bands)
   - Salvage title: $X,XXX-$X,XXX (40-60% below clean)
   - Rebuilt title: $X,XXX-$X,XXX (30-50% below clean)
   - Factors: mileage, condition, location, trim level
   - Format as structured data or table

3. **How to Get a VIN Report**:
   - NMVTIS providers
   - Commercial providers (Carfax, AutoCheck, EpicVIN)
   - Free options (NICB VINCheck)
   - What data each source provides
   - Cost comparison

4. **Actionable Pre-Purchase Checklist**:
   Format as numbered checklist:
   - [ ] Verify VIN matches vehicle and paperwork
   - [ ] Check title brand (clean, salvage, rebuilt, flood, lemon)
   - [ ] Review accident history (severity, airbag deployment, frame damage)
   - [ ] Verify odometer consistency (no rollback)
   - [ ] Check ownership history (number of owners, duration)
   - [ ] Verify all recalls completed (especially fuel pump, brake assist)
   - [ ] Check for unreleased liens
   - [ ] Verify smog certificate (CA requirement)
   - [ ] Review theft records
   - [ ] Cross-reference with physical inspection
   - [ ] Verify CA DMV forms (REG 51, REG 262 if applicable)

5. **Legal Citations**:
   - CA Vehicle Code sections (if relevant)
   - Lemon Law disclosure requirements
   - Odometer disclosure law
   - Title transfer requirements

6. **Final CTA Block**:
   - "Run Full VIN Report for ${context.year} ${context.make} ${context.model}"
   - Value proposition: NMVTIS data, CA-specific checks, recall verification
   - Mobile-responsive CTA

Write 700-900 words. Use technical, factual tone. Include specific form numbers, processes, and legal requirements. NO literary language.`;
    
    log('SELF-LEARNING', `Generating Part 3/3...`);
    const part3 = await this.aiAugmentation.generateText(part3Prompt, {
      lang: context.lang,
      intent: context.intent,
      maxTokens: 1800,
      timeout: 120000,
      make: context.make,
      year: context.year,
      stateSlug: context.stateSlug
    });
    
    // TRIZ: Объединяем части в полную статью
    const aiText = `${part1}\n\n${part2}\n\n${part3}`;
    log('SELF-LEARNING', `Article assembled from 3 parts. Total length: ${aiText.length} chars`);

    const article = {
      iteration,
      version: `v${iteration}`,
      title: `VIN Check Guide for ${context.year} ${context.make} ${context.model} in ${context.stateLabel}`,
      h1: `Complete VIN Check Guide: ${context.year} ${context.make} ${context.model} in ${context.stateLabel}`,
      content: aiText,
      wordCount: ArticleQualityUtils.countWords(aiText),
      qualityScore: ArticleQualityUtils.calculateBasicQualityScore(aiText),
      trained: true,
      timestamp: new Date().toISOString()
    };

    return article;
  }

  /**
   * MONSTER 7.x FACT-LOCK: Строгая валидация качества перед обучением
   * Обучение включается ТОЛЬКО если все параметры на 100% отлично
   */
  validateQualityForTraining(article) {
    const validation = {
      passed: true,
      errors: [],
      warnings: [],
      score: 0
    };
    
    // 1. Проверка качества контента (должно быть >= 0.95)
    const qualityScore = article.qualityScore || ArticleQualityUtils.calculateBasicQualityScore(article.content);
    if (qualityScore < 0.95) {
      validation.passed = false;
      validation.errors.push(`Quality score ${(qualityScore * 100).toFixed(1)}% is below 95% threshold`);
    }
    
    // 2. Проверка количества слов (должно быть >= 2000)
    const wordCount = article.wordCount || ArticleQualityUtils.countWords(article.content);
    if (wordCount < 2000) {
      validation.passed = false;
      validation.errors.push(`Word count ${wordCount} is below 2000 threshold`);
    }
    
    // 3. Проверка структуры (должна быть хорошая структура)
    const hasStructure = ArticleQualityUtils.hasGoodStructure(article.content);
    if (!hasStructure) {
      validation.passed = false;
      validation.errors.push('Article lacks proper structure');
    }
    
    // 4. Проверка экспертного тона
    const hasExpertTone = ArticleQualityUtils.hasExpertTone(article.content);
    if (!hasExpertTone) {
      validation.passed = false;
      validation.errors.push('Article lacks expert tone');
    }
    
    // 5. Проверка практических советов
    const hasActionableAdvice = ArticleQualityUtils.hasActionableAdvice(article.content);
    if (!hasActionableAdvice) {
      validation.passed = false;
      validation.errors.push('Article lacks actionable advice');
    }
    
    // 6. Проверка семантического покрытия
    const coversSemanticTiers = ArticleQualityUtils.coversSemanticTiers(article.content);
    if (!coversSemanticTiers) {
      validation.passed = false;
      validation.errors.push('Article does not cover semantic tiers');
    }
    
    // 7. Проверка на обрывы и незавершенные предложения
    const incompletePatterns = [
      /which may compromise$/i,
      /This is a primary\.$/i,
      /by moving it through states with different\.$/i,
      /meaning the physical title\.$/i,
      /or underlying\.$/i,
      /Always verify recall status using$/i,
      /How accurate is the reported number of previous\.$/i,
      /\b(to|for|with|including|such as|indicating|suggesting|because|due to|involving)\s*$/i
    ];
    
    const hasIncompleteSentences = incompletePatterns.some(pattern => pattern.test(article.content));
    if (hasIncompleteSentences) {
      validation.passed = false;
      validation.errors.push('Article contains incomplete sentences or cut-off phrases');
    }
    
    // 8. Проверка наличия всех обязательных блоков (для V6)
    if (article.blocks && article.blocks.length > 0) {
      const requiredBlocks = ['hero', 'key_facts', 'vin_decoder', 'nmvtis', 'state_specific', 
                              'accident_intelligence', 'fraud_patterns', 'buyer_guide', 'faq', 'cta'];
      const presentBlocks = article.blocks.map(b => b.type);
      const missingBlocks = requiredBlocks.filter(block => !presentBlocks.includes(block));
      
      if (missingBlocks.length > 0) {
        validation.passed = false;
        validation.errors.push(`Missing required blocks: ${missingBlocks.join(', ')}`);
      }
      
      // Проверка что все блоки валидны
      const invalidBlocks = article.blocks.filter(b => b.status !== 'VALID');
      if (invalidBlocks.length > 0) {
        validation.passed = false;
        validation.errors.push(`${invalidBlocks.length} blocks failed validation`);
      }
    }
    
    // Вычисляем общий score
    validation.score = qualityScore;
    
    return validation;
  }

  /**
   * Применение обучения на статье и обновление стратегии
   * ОПТИМИЗИРОВАНО: Использует OptimizedArticleAnalyzer для глубокого анализа
   * MONSTER 7.x FACT-LOCK: Строгая валидация качества перед обучением
   */
  async applyTrainingAndUpdate(article) {
    log('SELF-LEARNING', `Applying training and updating strategy for ${article.version}...`);
    
    // MONSTER 7.x FACT-LOCK: Строгая валидация качества
    const qualityValidation = this.validateQualityForTraining(article);
    
    if (!qualityValidation.passed) {
      log('SELF-LEARNING', `⚠️  Quality validation FAILED for ${article.version}. Training SKIPPED.`);
      log('SELF-LEARNING', `Errors: ${qualityValidation.errors.join('; ')}`);
      return {
        trainingApplied: false,
        reason: 'quality_validation_failed',
        errors: qualityValidation.errors,
        warnings: qualityValidation.warnings,
        qualityScore: qualityValidation.score
      };
    }
    
    log('SELF-LEARNING', `✅ Quality validation PASSED for ${article.version} (score: ${(qualityValidation.score * 100).toFixed(1)}%). Proceeding with training.`);
    
    // ОПТИМИЗАЦИЯ: Используем оптимизированный анализатор
    let optimizedAnalysis = null;
    try {
      optimizedAnalysis = await this.optimizedAnalyzer.analyzeArticle(article);
      log('SELF-LEARNING', `Optimized analysis complete: score ${optimizedAnalysis.qualityScore.toFixed(2)}, ${optimizedAnalysis.blockCount} blocks analyzed`);
    } catch (e) {
      error('SELF-LEARNING', `Optimized analysis failed: ${e.message}, using fallback`);
    }
    
    // Fallback: базовый анализ (если оптимизированный не сработал)
    const fallbackAnalysis = {
      wordCount: article.wordCount || ArticleQualityUtils.countWords(article.content),
      qualityScore: article.qualityScore || ArticleQualityUtils.calculateBasicQualityScore(article.content),
      hasStructure: ArticleQualityUtils.hasGoodStructure(article.content),
      hasExpertTone: ArticleQualityUtils.hasExpertTone(article.content),
      hasActionableAdvice: ArticleQualityUtils.hasActionableAdvice(article.content),
      coversSemanticTiers: ArticleQualityUtils.coversSemanticTiers(article.content)
    };

    // Используем оптимизированный анализ, если доступен
    const analysis = optimizedAnalysis ? {
      wordCount: optimizedAnalysis.wordCount,
      qualityScore: optimizedAnalysis.qualityScore,
      blockCount: optimizedAnalysis.blockCount,
      averageBlockScore: optimizedAnalysis.averageBlockScore,
      blockAnalysis: optimizedAnalysis.blockAnalysis,
      hasStructure: ArticleQualityUtils.hasGoodStructure(article.content),
      hasExpertTone: ArticleQualityUtils.hasExpertTone(article.content),
      hasActionableAdvice: ArticleQualityUtils.hasActionableAdvice(article.content),
      coversSemanticTiers: ArticleQualityUtils.coversSemanticTiers(article.content),
      optimized: true
    } : {
      ...fallbackAnalysis,
      optimized: false
    };

    // Генерируем улучшения на основе анализа
    const improvements = optimizedAnalysis && optimizedAnalysis.blockAnalysis?.recommendations
      ? this.generateImprovementsFromOptimized(optimizedAnalysis)
      : ArticleQualityUtils.suggestBasicImprovements(analysis);

    // Обновляем стратегию на основе анализа
    const results = {
      articleVersion: article.version,
      analysis,
      improvements: improvements,
      blockAnalysis: optimizedAnalysis?.blockAnalysis || null
    };

    // Обновляем стратегию через AI Training Pipeline
    await this.aiTraining.updateStrategyFromResults(results);

    return {
      trainingApplied: true,
      analysis,
      improvements: improvements,
      blockAnalysis: optimizedAnalysis?.blockAnalysis || null,
      qualityScore: analysis.qualityScore
    };
  }

  /**
   * Генерация улучшений на основе оптимизированного анализа
   */
  generateImprovementsFromOptimized(optimizedAnalysis) {
    const improvements = [];
    const blockAnalysis = optimizedAnalysis.blockAnalysis;

    // Улучшения по слабым блокам
    if (blockAnalysis.weakestBlock) {
      const weakest = blockAnalysis.weakestBlock;
      improvements.push(
        `Improve ${weakest.blockType} block (score: ${weakest.analysis.score.toFixed(2)}): ${weakest.analysis.issues.join(', ')}`
      );
    }

    // Улучшения по рекомендациям
    if (blockAnalysis.recommendations) {
      blockAnalysis.recommendations.forEach(rec => {
        if (rec.priority === 'high') {
          improvements.push(`${rec.message}: ${rec.blocks?.map(b => b.type).join(', ') || ''}`);
        }
      });
    }

    // Улучшения по недостающим элементам
    const missingElements = blockAnalysis.recommendations
      ?.find(r => r.type === 'missing_elements');
    if (missingElements && missingElements.elements.length > 0) {
      improvements.push(`Add missing elements: ${missingElements.elements.slice(0, 3).join(', ')}`);
    }

    // Общие улучшения
    if (optimizedAnalysis.averageBlockScore < 0.8) {
      improvements.push(`Increase overall block quality (current: ${optimizedAnalysis.averageBlockScore.toFixed(2)})`);
    }

    if (optimizedAnalysis.blockCount < 12) {
      improvements.push(`Increase block count to 12-14 (current: ${optimizedAnalysis.blockCount})`);
    }

    return improvements.length > 0 ? improvements : ['Maintain current quality standards'];
  }

  /**
   * Сохранение версии статьи
   */
  async saveArticleVersion(article) {
    const filename = `article-${article.version}.html`;
    const filepath = path.join(this.outputDir, filename);
    
    const html = this.renderArticleHTML(article);
    fs.writeFileSync(filepath, html, 'utf8');
    
    // Сохраняем метаданные
    const metadata = {
      ...article,
      filepath: `/learning-loop/${filename}`,
      url: `/learning-loop/${filename}`
    };
    
    this.versions.push(metadata);
    
    log('SELF-LEARNING', `Saved article ${article.version} to ${filepath}`);
    return metadata;
  }

  /**
   * Основной цикл обучения (10 итераций)
   */
  async runLearningLoop(iterations = 10) {
    log('SELF-LEARNING', `Starting learning loop with ${iterations} iterations...`);
    
    // Итерация 0: Генерация БЕЗ обучения
    log('SELF-LEARNING', '=== ITERATION 0: Generating article WITHOUT training ===');
    const articleV0 = await this.generateArticleWithoutTraining(0);
    await this.saveArticleVersion(articleV0);
    
    // Итерации 1-10: С обучением и улучшением
    for (let i = 1; i <= iterations; i++) {
      log('SELF-LEARNING', `=== ITERATION ${i}: Generating article WITH training ===`);
      
      // Генерируем статью с обучением
      const article = await this.generateArticleWithTraining(i);
      
      // Применяем обучение и обновляем стратегию
      const trainingResult = await this.applyTrainingAndUpdate(article);
      article.trainingResult = trainingResult;
      
      // Сохраняем версию
      await this.saveArticleVersion(article);
      
      log('SELF-LEARNING', `Iteration ${i} complete. Quality score: ${article.qualityScore.toFixed(2)}`);
    }
    
    // Создаем страницу сравнения
    await this.createComparisonPage();
    
    log('SELF-LEARNING', `Learning loop complete! Generated ${this.versions.length} versions.`);
    return this.versions;
  }

  /**
   * Создание страницы сравнения всех версий
   */
  async createComparisonPage() {
    log('SELF-LEARNING', 'Creating comparison page...');
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Self-Learning Loop - Article Evolution Comparison</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #f5f5f5;
            padding: 40px 20px;
            line-height: 1.6;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        h1 {
            font-size: 2.5rem;
            color: #111827;
            margin-bottom: 10px;
            text-align: center;
        }
        .subtitle {
            text-align: center;
            color: #6b7280;
            margin-bottom: 40px;
            font-size: 1.1rem;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .stat-card h3 {
            font-size: 0.9rem;
            color: #6b7280;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .stat-value {
            font-size: 2rem;
            font-weight: 700;
            color: #111827;
        }
        .versions-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .version-card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: transform 0.2s, box-shadow 0.2s;
            cursor: pointer;
        }
        .version-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .version-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 15px;
            border-bottom: 2px solid #e5e7eb;
        }
        .version-number {
            font-size: 1.5rem;
            font-weight: 700;
            color: #111827;
        }
        .version-badge {
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
        }
        .badge-untrained {
            background: #fee2e2;
            color: #991b1b;
        }
        .badge-trained {
            background: #d1fae5;
            color: #065f46;
        }
        .badge-excellent {
            background: #dbeafe;
            color: #1e40af;
        }
        .quality-score {
            font-size: 1.2rem;
            font-weight: 700;
            margin: 10px 0;
        }
        .score-low { color: #dc2626; }
        .score-medium { color: #f59e0b; }
        .score-high { color: #10b981; }
        .score-excellent { color: #3b82f6; }
        .version-metrics {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 15px;
            font-size: 0.9rem;
        }
        .metric {
            display: flex;
            justify-content: space-between;
        }
        .metric-label {
            color: #6b7280;
        }
        .metric-value {
            font-weight: 600;
            color: #111827;
        }
        .version-link {
            display: block;
            margin-top: 15px;
            padding: 10px;
            background: #111827;
            color: white;
            text-align: center;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            transition: background 0.2s;
        }
        .version-link:hover {
            background: #1f2937;
        }
        .comparison-section {
            background: white;
            border-radius: 8px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .comparison-section h2 {
            font-size: 1.8rem;
            color: #111827;
            margin-bottom: 20px;
        }
        .progress-bar {
            width: 100%;
            height: 30px;
            background: #e5e7eb;
            border-radius: 15px;
            overflow: hidden;
            margin: 20px 0;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #10b981 0%, #3b82f6 100%);
            transition: width 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
            font-size: 0.9rem;
        }
        .gradient-indicator {
            display: flex;
            justify-content: space-between;
            margin-top: 10px;
            font-size: 0.85rem;
            color: #6b7280;
        }
        .gradient-indicator span {
            padding: 4px 8px;
            border-radius: 4px;
        }
        .gradient-0 { background: #fee2e2; color: #991b1b; }
        .gradient-1-3 { background: #fef3c7; color: #92400e; }
        .gradient-4-6 { background: #dbeafe; color: #1e40af; }
        .gradient-7-9 { background: #d1fae5; color: #065f46; }
        .gradient-10 { background: #ddd6fe; color: #5b21b6; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🤖 Self-Learning Loop</h1>
        <p class="subtitle">Evolution of AI-Generated Article Through 10 Training Iterations</p>
        
        <div class="stats-grid">
            <div class="stat-card">
                <h3>Total Versions</h3>
                <div class="stat-value">${this.versions.length}</div>
            </div>
            <div class="stat-card">
                <h3>Initial Quality</h3>
                <div class="stat-value">${(this.versions[0]?.qualityScore || 0).toFixed(2)}</div>
            </div>
            <div class="stat-card">
                <h3>Final Quality</h3>
                <div class="stat-value">${(this.versions[this.versions.length - 1]?.qualityScore || 0).toFixed(2)}</div>
            </div>
            <div class="stat-card">
                <h3>Improvement</h3>
                <div class="stat-value">+${((this.versions[this.versions.length - 1]?.qualityScore || 0) - (this.versions[0]?.qualityScore || 0)).toFixed(2)}</div>
            </div>
        </div>

        <div class="comparison-section">
            <h2>📊 Quality Score Evolution</h2>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${((this.versions[this.versions.length - 1]?.qualityScore || 0) / 1.0 * 100)}%">
                    ${((this.versions[this.versions.length - 1]?.qualityScore || 0) * 100).toFixed(1)}%
                </div>
            </div>
            <div class="gradient-indicator">
                <span class="gradient-0">v0: Untrained</span>
                <span class="gradient-1-3">v1-3: Learning</span>
                <span class="gradient-4-6">v4-6: Improving</span>
                <span class="gradient-7-9">v7-9: Advanced</span>
                <span class="gradient-10">v10: Master</span>
            </div>
        </div>

        <div class="comparison-section">
            <h2>📚 All Article Versions</h2>
            <div class="versions-grid">
                ${this.versions.map((version, index) => {
                  const scoreClass = version.qualityScore < 0.5 ? 'score-low' :
                                   version.qualityScore < 0.7 ? 'score-medium' :
                                   version.qualityScore < 0.9 ? 'score-high' : 'score-excellent';
                  const badgeClass = version.trained ? (version.qualityScore > 0.9 ? 'badge-excellent' : 'badge-trained') : 'badge-untrained';
                  const badgeText = version.trained ? (version.qualityScore > 0.9 ? 'Excellent' : 'Trained') : 'Untrained';
                  
                  return `
                    <div class="version-card">
                        <div class="version-header">
                            <span class="version-number">${version.version}</span>
                            <span class="version-badge ${badgeClass}">${badgeText}</span>
                        </div>
                        <div class="quality-score ${scoreClass}">
                            Quality: ${(version.qualityScore * 100).toFixed(1)}%
                        </div>
                        <div class="version-metrics">
                            <div class="metric">
                                <span class="metric-label">Words:</span>
                                <span class="metric-value">${version.wordCount}</span>
                            </div>
                            <div class="metric">
                                <span class="metric-label">Iteration:</span>
                                <span class="metric-value">#${version.iteration}</span>
                            </div>
                        </div>
                        <a href="${version.url}" class="version-link" target="_blank">View Article →</a>
                    </div>
                  `;
                }).join('')}
            </div>
        </div>

        <div class="comparison-section">
            <h2>🔄 Learning Progress</h2>
            <p style="color: #6b7280; margin-bottom: 20px;">
                Watch how the AI improves article quality through iterative training and strategy updates.
            </p>
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px;">
                <h3 style="margin-bottom: 15px; color: #111827;">Key Improvements:</h3>
                <ul style="list-style: none; padding: 0;">
                    <li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">✅ Better structure and organization</li>
                    <li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">✅ More expert tone and authority</li>
                    <li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">✅ Actionable advice and checklists</li>
                    <li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">✅ Better semantic coverage</li>
                    <li style="padding: 8px 0;">✅ Improved readability and flow</li>
                </ul>
            </div>
        </div>
    </div>
</body>
</html>`;

    fs.writeFileSync(this.comparisonPath, html, 'utf8');
    log('SELF-LEARNING', `Comparison page created at ${this.comparisonPath}`);
  }

  /**
   * Подсчет слов (делегируется в ArticleQualityUtils)
   * @deprecated Используйте ArticleQualityUtils.countWords()
   */
  countWords(text) {
    return ArticleQualityUtils.countWords(text);
  }

  /**
   * Конвертация markdown-подобного текста в HTML
   */
  markdownToHTML(text) {
    let html = text;
    
    // Заголовки
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    
    // Списки
    html = html.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
    
    // Жирный текст
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // Параграфы
    html = html.split('\n\n').map(para => {
      para = para.trim();
      if (!para) return '';
      if (para.startsWith('<')) return para; // Уже HTML
      return `<p>${para}</p>`;
    }).join('\n');
    
    return html;
  }

  /**
   * Рендеринг HTML статьи
   */
  renderArticleHTML(article) {
    const contentHTML = this.markdownToHTML(article.content);
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${article.title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 900px;
            margin: 0 auto;
            padding: 40px 20px;
            line-height: 1.8;
            color: #374151;
            background: #f9fafb;
        }
        .article-container {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .version-badge {
            display: inline-block;
            padding: 6px 14px;
            border-radius: 16px;
            font-size: 0.8rem;
            font-weight: 600;
            margin-bottom: 20px;
            ${article.trained ? 'background: #d1fae5; color: #065f46;' : 'background: #fee2e2; color: #991b1b;'}
        }
        h1 {
            font-size: 2.5rem;
            color: #111827;
            margin-bottom: 20px;
            line-height: 1.2;
        }
        .meta {
            color: #6b7280;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e5e7eb;
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
        }
        .meta-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .meta-item strong {
            color: #111827;
        }
        .content {
            font-size: 1.1rem;
            line-height: 1.8;
            color: #374151;
        }
        .content h1 {
            font-size: 2rem;
            color: #111827;
            margin-top: 40px;
            margin-bottom: 20px;
        }
        .content h2 {
            font-size: 1.75rem;
            color: #111827;
            margin-top: 35px;
            margin-bottom: 18px;
        }
        .content h3 {
            font-size: 1.4rem;
            color: #374151;
            margin-top: 28px;
            margin-bottom: 14px;
        }
        .content p {
            margin-bottom: 20px;
        }
        .content ul, .content ol {
            margin-bottom: 25px;
            padding-left: 30px;
        }
        .content li {
            margin-bottom: 10px;
        }
        .content strong {
            color: #111827;
            font-weight: 600;
        }
        .back-link {
            display: inline-block;
            margin-top: 40px;
            padding: 12px 24px;
            background: #111827;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            transition: background 0.2s;
        }
        .back-link:hover {
            background: #1f2937;
        }
    </style>
</head>
<body>
    <div class="article-container">
        <span class="version-badge">${article.trained ? '✅ Trained' : '❌ Untrained'} - ${article.version}</span>
        <h1>${article.h1}</h1>
        <div class="meta">
            <div class="meta-item">
                <strong>Quality Score:</strong> <span style="color: ${article.qualityScore > 0.8 ? '#10b981' : article.qualityScore > 0.6 ? '#f59e0b' : '#dc2626'}; font-weight: 700;">${(article.qualityScore * 100).toFixed(1)}%</span>
            </div>
            <div class="meta-item">
                <strong>Word Count:</strong> ${article.wordCount.toLocaleString()}
            </div>
            <div class="meta-item">
                <strong>Iteration:</strong> #${article.iteration}
            </div>
        </div>
        <div class="content">
            ${contentHTML}
        </div>
        <a href="/learning-loop/comparison.html" class="back-link">← Back to Comparison</a>
    </div>
</body>
</html>`;
  }
}

module.exports = { SelfLearningLoop };

