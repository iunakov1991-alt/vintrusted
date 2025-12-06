const { log, error } = require('../logger');
const { getReferenceArticlesLoader } = require('./reference-articles-loader');
const { ArticleValidator } = require('./article-validator');
const { ArticlePostProcessor } = require('./article-post-processor');
const { ArticleQualityUtils } = require('./article-quality-utils');
const { ArticleVariationEngine } = require('./article-variation-engine');
const { BlockSimilarityDetector } = require('./block-similarity-detector');
const { CircuitBreaker } = require('./circuit-breaker');
const { ParallelSemaphore } = require('./parallel-semaphore');
const { getCanonicalPromptsLoader } = require('./canonical-prompts-loader');
const { getFragmentCache } = require('./fragment-cache');
const { RuleEngineIntegration } = require('./rule-engine-integration');
const fs = require('fs');
const path = require('path');

/**
 * Генератор статей версии 6 (12-14 блоков, 2000-2600 слов)
 * Использует Ollama (primary) + DeepSeek (fallback) архитектуру
 */
class ArticleGeneratorV6 {
  constructor(aiAugmentation, config) {
    this.aiAugmentation = aiAugmentation;
    this.config = config;
    this.refLoader = getReferenceArticlesLoader();
    this.referenceArticles = this.refLoader.loadReferenceArticles();
    this.validator = new ArticleValidator();
    this.postProcessor = new ArticlePostProcessor();
    
    // ANTI-DUPLICATE: Вариационный движок и детектор схожести
    this.variationEngine = new ArticleVariationEngine(config);
    this.similarityDetector = new BlockSimilarityDetector();
    
    this.loadVINCanon();
    this.loadBlockConfig();
    
    // MONSTER 7.x FACT-LOCK: Загружаем эталонные данные и промпт-шаблон
    this.loadFactLockData();
    this.loadFactLockPrompt();
    
    // Circuit breakers для каждого провайдера
    this.circuitBreakers = {
      ollama: new CircuitBreaker({ providerName: 'ollama', threshold: 0.5, timeWindow: 60000 }),
      deepseek: new CircuitBreaker({ providerName: 'deepseek', threshold: 0.5, timeWindow: 60000 })
    };
    
    // Семафор для ограничения параллелизма (защита от перегрузки)
    const maxWorkers = parseInt(process.env.MAX_PARALLEL_WORKERS || '6', 10);
    this.semaphore = new ParallelSemaphore(maxWorkers);
    
    // Флаг для двухфазного pipeline (draft → refine)
    this.useDraftRefinePipeline = process.env.USE_DRAFT_REFINE_PIPELINE === '1' || 
                                   process.env.USE_DRAFT_REFINE_PIPELINE === 'true';
    
    // УЛУЧШЕНИЕ: Canonical-промпты из файлов
    this.canonicalPrompts = getCanonicalPromptsLoader();
    
    // УЛУЧШЕНИЕ: Кэш общих фрагментов
    this.fragmentCache = getFragmentCache();
    
    // MONSTER 7.x: Интеграция системы правил
    this.ruleEngine = new RuleEngineIntegration();
    
    // Создаем дефолтные промпты для всех блоков (если их нет)
    const allBlockTypes = [
      'hero', 'key_facts', 'vin_decoder', 'nmvtis',
      'deep_explanation', 'state_specific', 'accident_intelligence', 'fraud_patterns',
      'market_value', 'insurance_risk', 'buyer_guide', 'recalls_tsbs',
      'faq', 'internal_links', 'cta'
    ];
    this.canonicalPrompts.createDefaultPromptsForAllBlocks(allBlockTypes);
  }

  /**
   * Загрузка канонического VIN decoder template
   */
  loadVINCanon() {
    try {
      const canonPath = path.join(process.cwd(), 'data/seo/ai-training/vin-decoder-canon.json');
      if (fs.existsSync(canonPath)) {
        this.vinCanon = JSON.parse(fs.readFileSync(canonPath, 'utf8'));
        log('ARTICLE-GEN-V6', 'VIN canon template loaded');
      } else {
        this.vinCanon = null;
        log('ARTICLE-GEN-V6', 'VIN canon template not found, using defaults');
      }
    } catch (e) {
      error('ARTICLE-GEN-V6', `Error loading VIN canon: ${e.message}`);
      this.vinCanon = null;
    }
  }

  /**
   * УНИВЕРСАЛЬНОЕ: Декодирование WMI из VIN для определения производителя
   * Работает для любых машин, не только Toyota
   */
  decodeVINWMI(vin) {
    if (!vin || vin.length < 3) {
      return {
        wmi: 'XXX',
        position1: 'X',
        position2: 'X',
        position3: 'X',
        country: 'Unknown',
        manufacturer: 'Unknown',
        vehicleType: 'Unknown',
        manufacturerName: 'Unknown'
      };
    }

    const wmi = vin.substring(0, 3).toUpperCase();
    const pos1 = vin[0];
    const pos2 = vin[1];
    const pos3 = vin[2];

    // Маппинг позиции 1 (регион/страна)
    const countryMap = {
      '1': 'United States',
      '2': 'Canada',
      '3': 'Mexico',
      '4': 'United States',
      '5': 'United States',
      'J': 'Japan',
      'K': 'South Korea',
      'L': 'China',
      'S': 'United Kingdom',
      'W': 'Germany',
      'Z': 'Italy'
    };

    // Маппинг WMI к производителям (основные)
    const wmiToManufacturer = {
      '1HG': { name: 'Honda', country: 'United States' },
      '1HZ': { name: 'Honda', country: 'United States' },
      '19U': { name: 'Honda', country: 'United States' },
      '2HG': { name: 'Honda', country: 'Canada' },
      'JHM': { name: 'Honda', country: 'Japan' },
      '4T1': { name: 'Toyota', country: 'United States' },
      '4T3': { name: 'Toyota', country: 'United States' },
      '5TD': { name: 'Toyota', country: 'United States' },
      '5TE': { name: 'Toyota', country: 'United States' },
      'JTM': { name: 'Toyota', country: 'Japan' },
      '1FA': { name: 'Ford', country: 'United States' },
      '1FD': { name: 'Ford', country: 'United States' },
      '1FM': { name: 'Ford', country: 'United States' },
      '1FT': { name: 'Ford', country: 'United States' },
      '1GC': { name: 'General Motors', country: 'United States' },
      '1GM': { name: 'General Motors', country: 'United States' },
      '1G1': { name: 'Chevrolet', country: 'United States' },
      '1G2': { name: 'Pontiac', country: 'United States' },
      '1G3': { name: 'Oldsmobile', country: 'United States' },
      '1G4': { name: 'Buick', country: 'United States' },
      '1G6': { name: 'Cadillac', country: 'United States' },
      '1GK': { name: 'GMC', country: 'United States' },
      'KMH': { name: 'Hyundai', country: 'South Korea' },
      '5YJ': { name: 'Tesla', country: 'United States' },
      'WBA': { name: 'BMW', country: 'Germany' },
      'WDB': { name: 'Mercedes-Benz', country: 'Germany' },
      'WAU': { name: 'Audi', country: 'Germany' },
      'WVW': { name: 'Volkswagen', country: 'Germany' },
      'JS2': { name: 'Suzuki', country: 'Japan' },
      'SBM': { name: 'McLaren', country: 'United Kingdom' },
      'ZPA': { name: 'Pagani', country: 'Italy' },
      'JAL': { name: 'Isuzu', country: 'Japan' },
      '1D7': { name: 'Ram', country: 'United States' },
      '1N4': { name: 'Nissan', country: 'United States' },
      'JM1': { name: 'Mazda', country: 'Japan' },
      '4S3': { name: 'Subaru', country: 'United States' },
      '1VW': { name: 'Volkswagen', country: 'United States' },
      'JTH': { name: 'Lexus', country: 'Japan' },
      '1C4': { name: 'Jeep', country: 'United States' },
      '1GT': { name: 'GMC', country: 'United States' }
    };

    // Маппинг позиции 3 (тип транспортного средства)
    const vehicleTypeMap = {
      '1': 'Passenger Car',
      '2': 'Multipurpose Passenger Vehicle (MPV)',
      '3': 'Truck',
      '4': 'Truck',
      '5': 'Incomplete Vehicle',
      '7': 'Multipurpose Passenger Vehicle (MPV)',
      '8': 'Truck',
      '9': 'Truck'
    };

    const country = countryMap[pos1] || 'Unknown';
    const vehicleType = vehicleTypeMap[pos3] || 'Unknown';
    
    // Определяем производителя из WMI или из make если известен
    let manufacturerInfo = wmiToManufacturer[wmi];
    if (!manufacturerInfo) {
      // Если WMI не найден, пытаемся определить по позиции 2
      const pos2Map = {
        'H': 'Honda',
        'T': 'Toyota',
        'F': 'Ford',
        'G': 'General Motors',
        'C': 'Chrysler',
        'N': 'Nissan',
        'M': 'Mercury'
      };
      const manufacturerName = pos2Map[pos2] || 'Unknown';
      manufacturerInfo = { name: manufacturerName, country: country };
    }

    return {
      wmi: wmi,
      position1: pos1,
      position2: pos2,
      position3: pos3,
      country: country,
      manufacturer: pos2,
      vehicleType: vehicleType,
      manufacturerName: manufacturerInfo.name
    };
  }

  /**
   * УНИВЕРСАЛЬНОЕ: Декодирование года из VIN (позиция 10)
   */
  decodeVINYear(vin) {
    if (!vin || vin.length < 10) return null;
    const yearCode = vin[9].toUpperCase();
    
    const yearMap = {
      'A': 1980, 'B': 1981, 'C': 1982, 'D': 1983, 'E': 1984, 'F': 1985, 'G': 1986, 'H': 1987,
      'J': 1988, 'K': 1989, 'L': 1990, 'M': 1991, 'N': 1992, 'P': 1993, 'R': 1994, 'S': 1995,
      'T': 1996, 'V': 1997, 'W': 1998, 'X': 1999, 'Y': 2000,
      '1': 2001, '2': 2002, '3': 2003, '4': 2004, '5': 2005, '6': 2006, '7': 2007, '8': 2008, '9': 2009,
      'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014, 'F': 2015, 'G': 2016, 'H': 2017,
      'J': 2018, 'K': 2019, 'L': 2020, 'M': 2021, 'N': 2022, 'P': 2023, 'R': 2024, 'S': 2025
    };
    
    return yearMap[yearCode] || null;
  }

  /**
   * Загрузка конфигурации блоков из файла
   */
  loadBlockConfig() {
    try {
      const configPath = path.join(process.cwd(), 'data/seo/ai-training/block-config.json');
      if (fs.existsSync(configPath)) {
        this.blockConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        log('ARTICLE-GEN-V6', `Block configuration loaded: ${Object.keys(this.blockConfig.blocks || {}).length} blocks`);
      } else {
        this.blockConfig = null;
        log('ARTICLE-GEN-V6', 'Block configuration not found, using hardcoded defaults');
      }
    } catch (e) {
      error('ARTICLE-GEN-V6', `Error loading block config: ${e.message}`);
      this.blockConfig = null;
    }
  }

  /**
   * MONSTER 7.x FACT-LOCK: Загрузка эталонных данных (vehicles, states, invariants)
   */
  loadFactLockData() {
    try {
      const factsDir = path.join(process.cwd(), 'data/facts');
      
      const vehiclesPath = path.join(factsDir, 'vehicles.json');
      const statesPath = path.join(factsDir, 'states.json');
      const invariantsPath = path.join(factsDir, 'global_invariants.json');
      
      if (fs.existsSync(vehiclesPath)) {
        this.factLockVehicles = JSON.parse(fs.readFileSync(vehiclesPath, 'utf8'));
        log('ARTICLE-GEN-V6', `FACT-LOCK: Loaded ${Object.keys(this.factLockVehicles).length} vehicle specs`);
      } else {
        this.factLockVehicles = null;
        log('ARTICLE-GEN-V6', 'FACT-LOCK: vehicles.json not found, FACT-LOCK disabled');
      }
      
      if (fs.existsSync(statesPath)) {
        this.factLockStates = JSON.parse(fs.readFileSync(statesPath, 'utf8'));
        log('ARTICLE-GEN-V6', `FACT-LOCK: Loaded ${Object.keys(this.factLockStates).length} state specs`);
      } else {
        this.factLockStates = null;
        log('ARTICLE-GEN-V6', 'FACT-LOCK: states.json not found, FACT-LOCK disabled');
      }
      
      if (fs.existsSync(invariantsPath)) {
        this.factLockInvariants = JSON.parse(fs.readFileSync(invariantsPath, 'utf8'));
        log('ARTICLE-GEN-V6', 'FACT-LOCK: Loaded global invariants');
      } else {
        this.factLockInvariants = null;
        log('ARTICLE-GEN-V6', 'FACT-LOCK: global_invariants.json not found, FACT-LOCK disabled');
      }
    } catch (e) {
      error('ARTICLE-GEN-V6', `FACT-LOCK: Error loading fact data: ${e.message}`);
      this.factLockVehicles = null;
      this.factLockStates = null;
      this.factLockInvariants = null;
    }
  }

  /**
   * MONSTER 7.x FACT-LOCK: Загрузка промпт-шаблона
   */
  loadFactLockPrompt() {
    try {
      const promptPath = path.join(process.cwd(), 'data/seo/templates/factlock_prompt_header.txt');
      if (fs.existsSync(promptPath)) {
        this.factLockPromptHeader = fs.readFileSync(promptPath, 'utf8');
        log('ARTICLE-GEN-V6', 'FACT-LOCK: Prompt header loaded');
      } else {
        this.factLockPromptHeader = null;
        log('ARTICLE-GEN-V6', 'FACT-LOCK: factlock_prompt_header.txt not found');
      }
    } catch (e) {
      error('ARTICLE-GEN-V6', `FACT-LOCK: Error loading prompt header: ${e.message}`);
      this.factLockPromptHeader = null;
    }
  }

  /**
   * MONSTER 7.x FACT-LOCK: Построение или загрузка FACT-SHEET для конкретной страницы
   * УНИВЕРСАЛЬНОЕ: Использует fallback режим с декодированием VIN если данных нет в базе
   */
  buildOrLoadFactSheet(context) {
    const { make, model, year, stateLabel, stateSlug, vin } = context;
    
    // Проверяем наличие глобальных инвариантов (обязательны)
    if (!this.factLockInvariants) {
      log('ARTICLE-GEN-V6', 'FACT-LOCK: Global invariants not loaded, skipping FACT-SHEET');
      return null;
    }
    
    if (!vin || !make || !model || !year || !stateSlug) {
      log('ARTICLE-GEN-V6', 'FACT-LOCK: Missing required context data, skipping FACT-SHEET');
      return null;
    }
    
    // Валидация VIN длины
    if (vin.length !== this.factLockInvariants.vin_length) {
      error('ARTICLE-GEN-V6', `FACT-LOCK: Invalid VIN length ${vin.length}, expected ${this.factLockInvariants.vin_length}`);
      return null;
    }
    
    // Проверяем существующий FACT-SHEET
    const factsheetsDir = path.join(process.cwd(), 'data/factsheets');
    const factsheetPath = path.join(factsheetsDir, `${vin}.json`);
    
    if (fs.existsSync(factsheetPath)) {
      try {
        const factsheet = JSON.parse(fs.readFileSync(factsheetPath, 'utf8'));
        log('ARTICLE-GEN-V6', `FACT-LOCK: Loaded existing FACT-SHEET for VIN ${vin}`);
        return factsheet;
      } catch (e) {
        error('ARTICLE-GEN-V6', `FACT-LOCK: Error loading FACT-SHEET: ${e.message}`);
      }
    }
    
    // Строим новый FACT-SHEET
    try {
      const vehicleKey = `${model} ${year}`;
      let vehicleSpec = null;
      let stateSpec = null;
      
      // Пытаемся загрузить спецификацию автомобиля из базы
      if (this.factLockVehicles && this.factLockVehicles[vehicleKey]) {
        vehicleSpec = this.factLockVehicles[vehicleKey];
        log('ARTICLE-GEN-V6', `FACT-LOCK: Found vehicle spec in database for ${vehicleKey}`);
      } else {
        // FALLBACK: Используем декодирование VIN для базовых данных
        log('ARTICLE-GEN-V6', `FACT-LOCK: Vehicle spec not found for ${vehicleKey}, using VIN decoding fallback`);
        const vinData = this.decodeVINWMI(vin);
        const decodedYear = this.decodeVINYear(vin) || parseInt(year, 10);
        
        vehicleSpec = {
          wmi: [vin.substring(0, 3)],
          body: [vinData.vehicleType === 'Passenger Car' ? 'Sedan' : vinData.vehicleType],
          engines: [], // Пустой массив - LLM не должен изобретать
          safety_package: null, // Неизвестно - LLM должен говорить общее
          unibody_name: null // Неизвестно - LLM должен говорить общее
        };
      }
      
      // Пытаемся загрузить спецификацию штата из базы
      if (this.factLockStates && this.factLockStates[stateSlug]) {
        stateSpec = this.factLockStates[stateSlug];
        log('ARTICLE-GEN-V6', `FACT-LOCK: Found state spec in database for ${stateSlug}`);
      } else {
        // FALLBACK: Используем общие правила для штата
        log('ARTICLE-GEN-V6', `FACT-LOCK: State spec not found for ${stateSlug}, using generic fallback`);
        stateSpec = {
          title_system: 'title-holding', // Большинство штатов используют title-holding
          key_agencies: [`${stateSlug.charAt(0).toUpperCase() + stateSlug.slice(1)} DMV`],
          main_statutes: [`${stateSlug.charAt(0).toUpperCase() + stateSlug.slice(1)} Vehicle Code`],
          brands: ['Salvage', 'Rebuilt', 'Flood', 'Junk'], // Стандартные бренды
          inspection: 'State-required vehicle inspection',
          env_risks: ['Regional environmental risks']
        };
      }
      
      const factsheet = {
        vin,
        make,
        model,
        year: parseInt(year, 10),
        state: stateSlug,
        generated_at: new Date().toISOString(),
        source: vehicleSpec.wmi && vehicleSpec.wmi.length > 0 && vehicleSpec.wmi[0] === vin.substring(0, 3) 
          ? 'database' 
          : 'fallback_vin_decode',
        vin_facts: {
          length: this.factLockInvariants.vin_length,
          wmi_candidates: vehicleSpec.wmi || [vin.substring(0, 3)],
          known_engines: vehicleSpec.engines || [],
          body_types: vehicleSpec.body || [],
          safety_package: vehicleSpec.safety_package || null,
          unibody_name: vehicleSpec.unibody_name || null
        },
        state_facts: {
          title_system: stateSpec.title_system,
          key_agencies: stateSpec.key_agencies,
          main_statutes: stateSpec.main_statutes,
          brands: stateSpec.brands,
          inspection: stateSpec.inspection,
          env_risks: stateSpec.env_risks
        },
        global_invariants: {
          forbidden_claims: this.factLockInvariants.forbidden_claims,
          required_vin_positions: this.factLockInvariants.required_vin_positions
        }
      };
      
      // Сохраняем FACT-SHEET
      if (!fs.existsSync(factsheetsDir)) {
        fs.mkdirSync(factsheetsDir, { recursive: true });
      }
      fs.writeFileSync(factsheetPath, JSON.stringify(factsheet, null, 2));
      
      log('ARTICLE-GEN-V6', `FACT-LOCK: Generated FACT-SHEET for ${vehicleKey} in ${stateSlug} (source: ${factsheet.source})`);
      return factsheet;
    } catch (e) {
      error('ARTICLE-GEN-V6', `FACT-LOCK: Error building FACT-SHEET: ${e.message}`);
      return null;
    }
  }

  /**
   * Получение конфигурации блока (из файла или дефолтная)
   */
  getBlockConfig(blockType) {
    if (this.blockConfig && this.blockConfig.blocks && this.blockConfig.blocks[blockType]) {
      return this.blockConfig.blocks[blockType];
    }
    // Fallback на дефолтные значения
    return {
      wordCount: 200,
      provider: 'deepseek',
      priority: 1,
      dependencies: [],
      group: 'independent'
    };
  }

  /**
   * Группировка блоков по зависимостям для параллельной генерации
   */
  groupBlocksByDependencies(blockTypes) {
    const groups = [];
    const processed = new Set();
    const blockMap = new Map();
    
    // Создаем карту блоков
    blockTypes.forEach(blockType => {
      const config = this.getBlockConfig(blockType);
      blockMap.set(blockType, {
        type: blockType,
        config: config,
        dependencies: config.dependencies || []
      });
    });
    
    // Группируем по уровням зависимостей
    while (processed.size < blockTypes.length) {
      const currentGroup = [];
      
      blockMap.forEach((block, blockType) => {
        if (processed.has(blockType)) return;
        
        // Проверяем, все ли зависимости обработаны
        const allDependenciesMet = block.dependencies.every(dep => processed.has(dep));
        
        if (allDependenciesMet) {
          currentGroup.push(blockType);
          processed.add(blockType);
        }
      });
      
      if (currentGroup.length === 0) {
        // Если не можем найти независимые блоки, добавляем оставшиеся
        blockMap.forEach((block, blockType) => {
          if (!processed.has(blockType)) {
            currentGroup.push(blockType);
            processed.add(blockType);
          }
        });
      }
      
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
      } else {
        break;
      }
    }
    
    return groups;
  }

  /**
   * Получение reference статьи для блока
   */
  getReferenceForBlock(blockType) {
    const refMap = {
      hero: this.referenceArticles.highVolume?.hero,
      key_facts: this.referenceArticles.highVolume?.key_facts,
      deep_explanation: this.referenceArticles.highVolume?.structure?.deep_explanation,
      state_specific: this.referenceArticles.highVolume?.structure?.state_specific_insights,
      accident_intelligence: this.referenceArticles.highVolume?.structure?.accident_intelligence,
      fraud_patterns: this.referenceArticles.highVolume?.structure?.fraud_patterns,
      market_value: this.referenceArticles.highVolume?.structure?.market_value,
      insurance_risk: this.referenceArticles.highVolume?.structure?.insurance_risk,
      buyer_guide: this.referenceArticles.highVolume?.structure?.buyer_guide,
      faq: this.referenceArticles.highVolume?.structure?.faq,
      internal_links: this.referenceArticles.highVolume?.internal_links
    };
    return refMap[blockType] || null;
  }

  /**
   * Генерация полной статьи версии 6 (12-14 блоков)
   * УЛУЧШЕНИЕ: Параллельная генерация независимых блоков
   * ANTI-DUPLICATE: Полная система вариаций для избежания near-duplicate контента
   */
  async generateArticle(context) {
    const { make, model, year, stateLabel, stateSlug, vin } = context;
    const articleStartTime = Date.now();
    const allBlocks = [];

    // MONSTER 7.x FACT-LOCK: Строим или загружаем FACT-SHEET
    const factSheet = this.buildOrLoadFactSheet(context);
    if (factSheet) {
      log('ARTICLE-GEN-V6', `FACT-LOCK: FACT-SHEET ready for ${year} ${make} ${model} in ${stateSlug}`);
    }

    // ANTI-DUPLICATE: Выбираем структурный и стилистический варианты
    const structuralVariant = this.variationEngine.getRandomStructuralVariant();
    const styleVariant = this.variationEngine.getRandomStyleVariant();
    
    // ANTI-DUPLICATE: Получаем state-specific и model/year-specific boost данные
    const stateBoost = this.variationEngine.getStateBoost(stateSlug);
    const modelBoost = this.variationEngine.getModelBoost(year, make, model);
    
    // ANTI-DUPLICATE: Генерируем randomized depth roll для разных секций
    const depthRoll = Math.floor(Math.random() * 3); // 0, 1, или 2
    
    log('ARTICLE-GEN-V6', `Generating V6 article: ${year} ${make} ${model} in ${stateLabel} (15 blocks, parallel generation)`);
    log('ARTICLE-GEN-V6', `Structural variant: ${structuralVariant.variant}, Style: ${styleVariant.name}, Depth roll: ${depthRoll}`);
    if (stateBoost) log('ARTICLE-GEN-V6', `State boost applied for ${stateSlug}`);
    if (modelBoost) log('ARTICLE-GEN-V6', `Model/year boost applied for ${year} ${make} ${model}`);

    // ANTI-DUPLICATE: Используем порядок блоков из структурного варианта
    const blockTypes = structuralVariant.blockOrder;
    
    // ANTI-DUPLICATE: Сохраняем контекст вариаций для использования в блоках
    context.variationContext = {
      structuralVariant: structuralVariant.variant,
      styleVariant: styleVariant,
      stateBoost: stateBoost,
      modelBoost: modelBoost,
      depthRoll: depthRoll,
      factSheet: factSheet // MONSTER 7.x FACT-LOCK: Добавляем FACT-SHEET в контекст
    };

    // Группируем блоки по зависимостям
    const groups = this.groupBlocksByDependencies(blockTypes);
    log('ARTICLE-GEN-V6', `Block groups for parallel generation: ${groups.length} groups`);

    // Генерируем группы последовательно, блоки внутри группы - параллельно
    for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
      const group = groups[groupIndex];
      const groupStartTime = Date.now();
      
      log('ARTICLE-GEN-V6', `Generating group ${groupIndex + 1}/${groups.length} (${group.length} blocks in parallel)...`);

      // Параллельная генерация всех блоков в группе с семафором
      const groupBlocks = await Promise.all(
        group.map(async (blockType) => {
          const blockConfig = this.getBlockConfig(blockType);
          const reference = this.getReferenceForBlock(blockType);
          
          // ANTI-DUPLICATE: Используем randomized depth вместо фиксированного wordCount
          const randomizedDepth = this.variationEngine.getRandomizedDepth(blockType);
          const finalWordCount = randomizedDepth || blockConfig.wordCount || 300;
          
          // УЛУЧШЕНИЕ: Используем семафор для ограничения параллелизма
          return await this.semaphore.execute(async () => {
            // УЛУЧШЕНИЕ: Кэширование общих фрагментов (FAQ, state-specific)
            if (blockType === 'faq' || blockType === 'state_specific') {
              const cachedFragment = this.fragmentCache.get(blockType, context);
              if (cachedFragment) {
                log('ARTICLE-GEN-V6', `Using cached fragment for ${blockType}`);
                // Валидируем кэшированный фрагмент
                const endMarker = `[[END_BLOCK:${blockType}]]`;
                let content = cachedFragment;
                if (!content.includes(endMarker)) {
                  content = content.trim() + '\n\n' + endMarker;
                }
                const validation = this.validator.validateBlock(content, blockType);
                if (validation.valid) {
                  return {
                    type: blockType,
                    content: content,
                    provider: blockConfig.provider,
                    wordCount: this.countWords(cachedFragment),
                    status: 'VALID',
                    performanceMetrics: {
                      generationTime: 0,
                      retryCount: 0,
                      cacheHit: true,
                      providerUsed: 'fragment-cache',
                      fragmentCacheUsed: true
                    }
                  };
                } else {
                  log('ARTICLE-GEN-V6', `Cached fragment for ${blockType} failed validation, regenerating...`);
                }
              }
            }
            
            // ANTI-DUPLICATE: Проверяем схожесть с уже сгенерированными блоками
            const existingBlocks = allBlocks.filter(b => b.type === blockType);
            let result;
            let similarityCheckPassed = false;
            let maxAttempts = 3; // Максимум 3 попытки для избежания дубликатов
            
            for (let similarityAttempt = 0; similarityAttempt < maxAttempts && !similarityCheckPassed; similarityAttempt++) {
              // УЛУЧШЕНИЕ: Двухфазный pipeline (draft → refine) если включен
              if (this.useDraftRefinePipeline && blockConfig.provider === 'deepseek') {
                result = await this.generateBlockWithPipeline(blockType, context, {
                  provider: blockConfig.provider,
                  wordCount: finalWordCount,
                  reference: reference
                });
              } else {
                result = await this.generateBlock(blockType, context, {
                  provider: blockConfig.provider,
                  wordCount: finalWordCount,
                  reference: reference
                });
              }
              
              // ANTI-DUPLICATE: Проверяем схожесть только если блок валиден
              if (result.status === 'VALID' && existingBlocks.length > 0) {
                const similarityCheck = this.similarityDetector.checkAgainstExistingBlocks(
                  result,
                  existingBlocks
                );
                
                if (similarityCheck.isSimilar) {
                  log('ARTICLE-GEN-V6', `⚠️  Block ${blockType} too similar (${(similarityCheck.maxSimilarity * 100).toFixed(1)}%), regenerating... (attempt ${similarityAttempt + 1}/${maxAttempts})`);
                  // Продолжаем цикл для регенерации
                  continue;
                } else {
                  similarityCheckPassed = true;
                }
              } else {
                // Если блок невалиден или нет существующих блоков для сравнения, принимаем результат
                similarityCheckPassed = true;
              }
            }
            
            // Если не удалось избежать схожести после всех попыток, логируем предупреждение
            if (!similarityCheckPassed && result.status === 'VALID') {
              log('ARTICLE-GEN-V6', `⚠️  Block ${blockType} still similar after ${maxAttempts} attempts, using anyway`);
            }
            
            // Сохраняем в кэш фрагментов если это FAQ или state-specific
            if ((blockType === 'faq' || blockType === 'state_specific') && result.status === 'VALID') {
              const contentWithoutMarker = result.content.replace(/\[\[END_BLOCK:.*?\]\]/g, '').trim();
              this.fragmentCache.set(blockType, context, contentWithoutMarker);
            }
            
            return result;
          });
        })
      );

      const groupTime = Date.now() - groupStartTime;
      log('ARTICLE-GEN-V6', `Group ${groupIndex + 1} completed in ${(groupTime / 1000).toFixed(1)}s`);
      
      allBlocks.push(...groupBlocks);
    }

    const blocksGenerationTime = Date.now() - articleStartTime;
    log('ARTICLE-GEN-V6', `All blocks generated in ${(blocksGenerationTime / 1000).toFixed(1)}s (parallel mode)`);

    // MONSTER 7.x: Проверка общей длины статьи
    const lengthValidation = this.validator.validateArticleLength(allBlocks);
    if (lengthValidation.warnings.length > 0) {
      lengthValidation.warnings.forEach(w => log('ARTICLE-GEN-V6', `  WARNING: ${w}`));
    }
    log('ARTICLE-GEN-V6', `Total article length: ${lengthValidation.totalWords} words (target: 2000-2500)`);

    // ТРИЗ ПРОХОД 3: Pre-validation с автоисправлением перед финальной валидацией
    log('ARTICLE-GEN-V6', 'Running pre-validation with auto-repair...');
    const preValidatedBlocks = await Promise.all(allBlocks.map(async (block) => {
      // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Обрабатываем ВСЕ блоки с контентом, включая FAILED_VALIDATION
      if (!block.content || !block.content.trim()) {
        return block; // Пропускаем пустые блоки
      }
      
      // Обрабатываем блоки со статусом VALID, без статуса, или FAILED_VALIDATION
      if (block.status === 'VALID' || !block.status || block.status === 'FAILED_VALIDATION') {
        // Проверяем блок на скрытые проблемы
        const preCheck = this.validator.validateBlock(block.content, block.type);
        if (!preCheck.valid) {
          // Пытаемся исправить через post-processor (полная обработка)
          log('ARTICLE-GEN-V6', `🔧 Attempting to repair block ${block.type} (status: ${block.status || 'none'})...`);
          
          // Применяем полную обработку post-processor'а к блоку
          const blockArticle = {
            content: block.content,
            wordCount: block.wordCount || 0
          };
          const processedBlock = this.postProcessor.process(blockArticle, context);
          
          // Проверяем результат
          const repairedCheck = this.validator.validateBlock(processedBlock.content, block.type);
          if (repairedCheck.valid) {
            log('ARTICLE-GEN-V6', `✅ Pre-validated and repaired block ${block.type} (was ${block.status || 'none'})`);
            return {
              ...block,
              content: processedBlock.content,
              wordCount: processedBlock.wordCount,
              status: 'VALID',
              preRepaired: true,
              wasFailed: block.status === 'FAILED_VALIDATION'
            };
          } else {
            // Если не удалось исправить полностью, применяем базовые фиксы
            const basicRepaired = this.postProcessor.completeIncompleteWords(block.content);
            const basicCheck = this.validator.validateBlock(basicRepaired, block.type);
            if (basicCheck.valid) {
              log('ARTICLE-GEN-V6', `✅ Pre-validated and basic-repaired block ${block.type}`);
              return {
                ...block,
                content: basicRepaired,
                status: 'VALID',
                preRepaired: true,
                wasFailed: block.status === 'FAILED_VALIDATION'
              };
            } else {
              log('ARTICLE-GEN-V6', `⚠️  Block ${block.type} still has issues after repair attempts: ${repairedCheck.errors.join(', ')}`);
              // Помечаем для дальнейшей обработки в post-processor
              block.needsPostProcessing = true;
              block.validationErrors = repairedCheck.errors;
            }
          }
        } else if (block.status === 'FAILED_VALIDATION') {
          // Блок был помечен как FAILED_VALIDATION, но теперь проходит валидацию
          log('ARTICLE-GEN-V6', `✅ Block ${block.type} now passes validation (was FAILED_VALIDATION)`);
          return {
            ...block,
            status: 'VALID',
            preRepaired: true,
            wasFailed: true
          };
        }
      }
      return block;
    }));
    
    // Объединяем блоки (используем предварительно валидированные)
    let article = this.assembleArticle(preValidatedBlocks, context);
    
    // Валидация статьи
    log('ARTICLE-GEN-V6', 'Validating article...');
    // MONSTER 7.x: Передаем блоки в контекст для проверки через правила
    const validationContext = {
      ...context,
      blocks: preValidatedBlocks,
      stage: 'deep'
    };
    const validation = this.validator.validate(article, validationContext);
    
    if (!validation.valid) {
      error('ARTICLE-GEN-V6', `Article validation failed: ${validation.errorCount} errors, ${validation.warningCount} warnings`);
      validation.errors.forEach(err => error('ARTICLE-GEN-V6', `  ERROR: ${err}`));
      validation.warnings.forEach(warn => log('ARTICLE-GEN-V6', `  WARNING: ${warn}`));
      
      // Автофикс общих проблем
      log('ARTICLE-GEN-V6', 'Attempting auto-fix...');
      article.content = this.validator.autoFix(article.content);
      article.wordCount = this.countWords(article.content);
    } else {
      log('ARTICLE-GEN-V6', `Article validation passed: ${validation.warningCount} warnings`);
      validation.warnings.forEach(warn => log('ARTICLE-GEN-V6', `  WARNING: ${warn}`));
    }
    
    // Post-processing: финальная обработка для завершения обрывов
    log('ARTICLE-GEN-V6', 'Running post-processing...');
    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Передаем информацию о блоках в контекст для post-processor
    const postProcessorContext = {
      ...context,
      blocks: preValidatedBlocks, // Передаем блоки для информации о проблемных блоках
      failedBlocks: preValidatedBlocks.filter(b => b.status === 'FAILED_VALIDATION' || b.needsPostProcessing),
      stage: 'deep'
    };
    article = this.postProcessor.process(article, postProcessorContext);
    
    // КРИТИЧЕСКИЙ ФИКС: Завершаем известные обрывы после post-processing
    // Эти обрывы должны исправляться гарантированно
    if (article.content) {
      // Исправляем обрывы, сохраняя оригинальное форматирование списка
      article.content = article.content.replace(/\*\s+\*\*Odometer Reading Check:\*\*\s+The report displays a chronology of the vehicle's complete history and condition\./g, '*   **Odometer Reading Check:** The report displays a chronology of the vehicle\'s complete history and condition, tracking mileage readings from registration events, service records, and inspection reports.');
      article.content = article.content.replace(/\*\s+\*\*Service & Inspection Records:\*\*\s+Documented maintenance events and results of the vehicle's complete history and condition\./g, '*   **Service & Inspection Records:** Documented maintenance events and results of the vehicle\'s complete history and condition verification process.');
      // Дополнительные паттерны для случаев без форматирования списка
      article.content = article.content.replace(/The report displays a chronology of the vehicle's complete history and condition\.(?!.*tracking mileage)/g, 'The report displays a chronology of the vehicle\'s complete history and condition, tracking mileage readings from registration events, service records, and inspection reports.');
      article.content = article.content.replace(/Documented maintenance events and results of the vehicle's complete history and condition\.(?!.*verification process)/g, 'Documented maintenance events and results of the vehicle\'s complete history and condition verification process.');
      article.wordCount = this.countWords(article.content);
    }
    
    // Повторная валидация после post-processing
    const finalValidation = this.validator.validate(article, context);
    if (finalValidation.valid) {
      log('ARTICLE-GEN-V6', `✅ Article validation passed after post-processing`);
    } else {
      log('ARTICLE-GEN-V6', `⚠️  Article still has ${finalValidation.errorCount} errors after post-processing`);
      finalValidation.errors.forEach(err => log('ARTICLE-GEN-V6', `  ERROR: ${err}`));
    }
    
    // ANTI-DUPLICATE: Проверка uniqueness_score и lexical_variation
    log('ARTICLE-GEN-V6', 'Checking article uniqueness...');
    const uniquenessScore = this.similarityDetector.calculateUniquenessScore(article, []);
    const lexicalVariation = this.similarityDetector.calculateLexicalVariation(article, []);
    
    // ANTI-DUPLICATE: Минимальные требования для uniqueness (очень низкие, но важные)
    const minUniquenessScore = 0.35;
    const minLexicalVariation = 0.25;
    
    if (uniquenessScore < minUniquenessScore) {
      log('ARTICLE-GEN-V6', `⚠️  Article uniqueness score ${(uniquenessScore * 100).toFixed(1)}% is below minimum ${(minUniquenessScore * 100).toFixed(1)}%`);
    } else {
      log('ARTICLE-GEN-V6', `✅ Article uniqueness score: ${(uniquenessScore * 100).toFixed(1)}%`);
    }
    
    if (lexicalVariation < minLexicalVariation) {
      log('ARTICLE-GEN-V6', `⚠️  Article lexical variation ${(lexicalVariation * 100).toFixed(1)}% is below minimum ${(minLexicalVariation * 100).toFixed(1)}%`);
    } else {
      log('ARTICLE-GEN-V6', `✅ Article lexical variation: ${(lexicalVariation * 100).toFixed(1)}%`);
    }
    
    // Сохраняем метрики uniqueness в статье
    article.uniquenessScore = uniquenessScore;
    article.lexicalVariation = lexicalVariation;
    article.structuralVariant = structuralVariant.variant;
    article.styleVariant = styleVariant.name;
    
    log('ARTICLE-GEN-V6', `Article generated: ${article.wordCount} words, ${allBlocks.length} blocks`);
    
    // УЛУЧШЕНИЕ: Добавляем общие метрики производительности
    const articleTotalTime = Date.now() - articleStartTime;
    const performanceStats = this.calculatePerformanceStats(allBlocks, articleTotalTime);
    article.performanceStats = performanceStats;
    article.generationTime = articleTotalTime;
    
    // Логируем статистику Circuit Breaker
    Object.keys(this.circuitBreakers).forEach(provider => {
      const stats = this.circuitBreakers[provider].getStats();
      if (stats.totalRequests > 0) {
        log('ARTICLE-GEN-V6', `Circuit Breaker ${provider}: ${stats.state}, failure rate: ${(stats.failureRate * 100).toFixed(1)}%`);
      }
    });
    
    return article;
  }

  /**
   * УЛУЧШЕНИЕ: Экспоненциальный backoff для retry
   */
  getRetryDelay(attempt, errorType) {
    if (errorType === 'VALIDATION_ERROR') return 0; // Немедленный retry для валидации
    if (errorType === 'RATE_LIMIT') return 5000 * Math.pow(2, attempt - 1); // 5s, 10s, 20s
    if (errorType === 'TIMEOUT') return 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s
    return 500 * Math.pow(2, attempt - 1); // 500ms, 1s, 2s (экспоненциальный)
  }

  /**
   * MONSTER 7.x: Генерация одного блока с retry-логикой и валидацией
   * УЛУЧШЕНИЯ: Метрики производительности, Circuit Breaker, экспоненциальный backoff
   */
  async generateBlock(blockType, context, options = {}) {
    const { provider = 'deepseek', wordCount = 300, reference = null } = options;
    const { make, model, year, stateLabel, stateSlug, vin } = context;
    const blockStartTime = Date.now();

    // Убеждаемся, что wordCount положительный
    const safeWordCount = Math.max(50, Math.abs(wordCount || 300));
    const maxRetries = 2;

    // Circuit Breaker проверка
    const circuitBreaker = this.circuitBreakers[provider];
    if (!circuitBreaker.canExecute()) {
      error('ARTICLE-GEN-V6', `Block ${blockType}: Circuit breaker is OPEN for ${provider}, skipping`);
      return {
        type: blockType,
        content: '',
        provider: provider,
        wordCount: 0,
        status: 'CIRCUIT_BREAKER_OPEN',
        errors: [`Circuit breaker is OPEN for ${provider}`],
        performanceMetrics: {
          generationTime: 0,
          retryCount: 0,
          cacheHit: false,
          providerUsed: provider,
          circuitBreakerBlocked: true
        }
      };
    }

    let lastErrorType = 'UNKNOWN';
    let cacheHit = false;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      const prompt = this.buildBlockPrompt(blockType, context, { wordCount: safeWordCount, reference });

      log('ARTICLE-GEN-V6', `Generating ${blockType} block (${provider}, ${safeWordCount} words, attempt ${attempt}/${maxRetries + 1})...`);

      // MONSTER 7.x: Строгий контроль длины - 1.2 токена на слово (вместо 1.5)
      // Это заставит AI генерировать более точно по длине
      // Добавляем 50 токенов для маркера окончания (вместо 100)
      const baseTokens = Math.floor(safeWordCount * 1.2);
      const minTokens = 150;
      const maxTokens = Math.max(minTokens, baseTokens) + 50; // +50 токенов для маркера

      // УЛУЧШЕНИЕ: Streaming для больших блоков (>1000 токенов)
      const useStreaming = maxTokens > 1000;

      // MONSTER 7.x: При retry отключаем кеш для новой генерации
      const skipCache = attempt > 1;
      
      // Проверка кеша (для метрик)
      const cacheKey = this.aiAugmentation.hashKey(`${prompt}:en:vin_check:${make}:${year}:${stateSlug}`);
      cacheHit = !skipCache && this.aiAugmentation.cache && this.aiAugmentation.cache.has(cacheKey);
      
      let text;
      let generationError = null;
      
      try {
        text = await this.aiAugmentation.generateText(prompt, {
          lang: 'en',
          intent: 'vin_check',
          maxTokens: maxTokens,
          blockType: blockType,
          make,
          year,
          stateSlug,
          provider: provider,
          systemPrompt: this.getSystemPrompt(blockType, context), // ANTI-DUPLICATE: Передаем context для стилистических вариантов
          skipCache: skipCache, // Отключаем кеш при retry
          stream: useStreaming // УЛУЧШЕНИЕ: Streaming для больших блоков
        });

        // Успешная генерация - записываем в Circuit Breaker
        circuitBreaker.recordSuccess();
      } catch (error) {
        generationError = error;
        lastErrorType = error.message?.includes('timeout') ? 'TIMEOUT' : 
                      error.message?.includes('rate limit') ? 'RATE_LIMIT' : 'UNKNOWN';
        circuitBreaker.recordFailure(lastErrorType);
        
        if (attempt <= maxRetries) {
          const delay = this.getRetryDelay(attempt, lastErrorType);
          if (delay > 0) {
            log('ARTICLE-GEN-V6', `Block ${blockType} error (${lastErrorType}), retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          continue;
        } else {
          error('ARTICLE-GEN-V6', `Block ${blockType} generation failed after ${maxRetries + 1} attempts: ${error.message}`);
          const generationTime = Date.now() - blockStartTime;
          return {
            type: blockType,
            content: '',
            provider: provider,
            wordCount: 0,
            status: 'FAILED_GENERATION',
            errors: [error.message || 'Generation failed'],
            performanceMetrics: {
              generationTime: generationTime,
              retryCount: attempt - 1,
              cacheHit: cacheHit,
              providerUsed: provider,
              errorType: lastErrorType
            }
          };
        }
      }

      if (!text) {
        lastErrorType = 'EMPTY_RESPONSE';
        if (attempt <= maxRetries) {
          log('ARTICLE-GEN-V6', `Block ${blockType} generation failed (empty), retrying...`);
          const delay = this.getRetryDelay(attempt, lastErrorType);
          if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          continue;
        } else {
          error('ARTICLE-GEN-V6', `Block ${blockType} generation failed after ${maxRetries + 1} attempts`);
          const generationTime = Date.now() - blockStartTime;
          return {
            type: blockType,
            content: '',
            provider: provider,
            wordCount: 0,
            status: 'FAILED_VALIDATION',
            errors: ['Empty block after all retries'],
            performanceMetrics: {
              generationTime: generationTime,
              retryCount: attempt - 1,
              cacheHit: cacheHit,
              providerUsed: provider,
              errorType: lastErrorType
            }
          };
        }
      }

      // MONSTER 7.x: Fallback - автоматически добавляем маркер, если он отсутствует
      // TRIZ: Принцип сегментации - разделяем логику добавления маркера и валидации
      let textToValidate = text;
      const endMarker = `[[END_BLOCK:${blockType}]]`;
      let autoAddedMarker = false;
      let autoFixedEnding = false;
      
      // Извлекаем чистый текст для auto-expand (если понадобится)
      let cleanTextForExpand = textToValidate;
      if (textToValidate.includes(endMarker)) {
        const markerIndex = textToValidate.indexOf(endMarker);
        cleanTextForExpand = textToValidate.substring(0, markerIndex).trim();
      } else {
        cleanTextForExpand = textToValidate.trim();
      }
      
      if (!text.includes(endMarker)) {
        log('ARTICLE-GEN-V6', `⚠️  Block ${blockType} missing end marker, adding automatically (AI did not generate it)`);
        
        // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Завершаем предложение перед маркером
        let cleanText = text.trim();
        const lastChar = cleanText[cleanText.length - 1];
        
        // Если блок не заканчивается на . ! или ?, добавляем точку
        if (!['.', '!', '?'].includes(lastChar)) {
          log('ARTICLE-GEN-V6', `⚠️  Block ${blockType} does not end with punctuation, adding period before marker`);
          cleanText = cleanText + '.';
          autoFixedEnding = true;
        }
        
        // Добавляем маркер
        textToValidate = cleanText + '\n\n' + endMarker;
        autoAddedMarker = true;
      }

      // Обновляем cleanTextForExpand после возможного добавления маркера
      if (textToValidate.includes(endMarker)) {
        const markerIndex = textToValidate.indexOf(endMarker);
        cleanTextForExpand = textToValidate.substring(0, markerIndex).trim();
      } else {
        cleanTextForExpand = textToValidate.trim();
      }
      
      // MONSTER 7.x: Валидация блока
      const validation = this.validator.validateBlock(textToValidate, blockType);
      
      // TRIZ: Идеальный конечный результат - валидация проходит, но мы знаем о проблеме
      if (validation.valid) {
        // ANTI-DUPLICATE: Опционально применяем lexical variants к тексту (10% вероятность)
        // Это добавляет дополнительное разнообразие без нарушения качества
        let finalText = textToValidate;
        if (Math.random() < 0.1 && blockType !== 'vin_decoder' && blockType !== 'key_facts') {
          // Применяем lexical variants только к содержимому без маркера
          const contentWithoutMarker = textToValidate.replace(new RegExp(`\\[\\[END_BLOCK:${blockType}\\]\\].*$`, 's'), '').trim();
          const modifiedContent = this.variationEngine.applyLexicalVariants(contentWithoutMarker);
          if (modifiedContent !== contentWithoutMarker) {
            finalText = modifiedContent + '\n\n' + endMarker;
            log('ARTICLE-GEN-V6', `Applied lexical variants to ${blockType} block`);
          }
        }
        
        const wordCount = this.countWords(text); // Считаем БЕЗ маркера для точности
        const generationTime = Date.now() - blockStartTime;
        const statusMessage = autoAddedMarker 
          ? (autoFixedEnding 
              ? `validated successfully (${wordCount} words, marker and punctuation auto-added, ${generationTime}ms)` 
              : `validated successfully (${wordCount} words, marker auto-added, ${generationTime}ms)`)
          : `validated successfully (${wordCount} words, ${generationTime}ms)`;
        log('ARTICLE-GEN-V6', `Block ${blockType} ${statusMessage}`);
        return {
          type: blockType,
          content: finalText, // Используем текст с маркером (возможно с lexical variants)
          provider: provider,
          wordCount: wordCount, // Точный wordCount без маркера
          status: 'VALID',
          autoAddedMarker: autoAddedMarker, // Флаг для мониторинга
          autoFixedEnding: autoFixedEnding, // Флаг для мониторинга исправления окончания
          performanceMetrics: {
            generationTime: generationTime,
            retryCount: attempt - 1,
            cacheHit: cacheHit,
            providerUsed: provider,
            circuitBreakerBlocked: false
          }
        };
      } else {
        // ТРИЗ ПРОХОД 1: Auto-expand для коротких блоков перед исключением
        const tooShortError = validation.errors.find(e => e.includes('TOO_SHORT_FOR_BLOCK_TYPE'));
        if (tooShortError && attempt <= maxRetries) {
          // Извлекаем текущий wordCount и минимальный требуемый
          const wordCountMatch = tooShortError.match(/(\d+) words \(minimum (\d+)\)/);
          if (wordCountMatch) {
            const currentWords = parseInt(wordCountMatch[1]);
            const minWords = parseInt(wordCountMatch[2]);
            const shortfall = minWords - currentWords;
            const shortfallPercent = (shortfall / minWords) * 100;
            
            // УЛУЧШЕНО: Расширяем блоки даже если они на 50% короче (для 100% надежности)
            if (shortfallPercent <= 50 && shortfallPercent > 0) {
              log('ARTICLE-GEN-V6', `⚠️  Block ${blockType} is ${shortfall} words short (${shortfallPercent.toFixed(1)}%). Auto-expanding...`);
              
              // Расширяем блок через AI с запасом 20% для гарантии
              const targetExpansion = Math.ceil(shortfall * 1.2); // Добавляем 20% запаса
              const expandPrompt = `You are a precision editor. Expand the following text by ${targetExpansion} words to complete the thought naturally and reach minimum ${minWords} words.

CRITICAL RULES:
- Keep the EXACT same meaning and style
- Add 2-3 complete sentences that naturally extend the final thought
- DO NOT end with forbidden words: to, for, with, from, including, like, such as, indicating, suggesting, because, due to, involving, engine, system, vehicle, data, information, report, check, verification
- Every sentence MUST end with proper punctuation (. ! ?)
- Every sentence MUST contain a verb
- The expansion must feel natural and complete
- Target length: ${minWords} words minimum

[ORIGINAL TEXT]
${cleanTextForExpand || textToValidate.replace(new RegExp(`\\[\\[END_BLOCK:${blockType}\\]\\].*$`, 's'), '').trim()}

[EXPANDED TEXT]`;

              try {
                const expandedText = await this.aiAugmentation.generateText(expandPrompt, {
                  lang: 'en',
                  intent: 'vin_check',
                  maxTokens: Math.ceil(shortfall * 2) + 100, // Увеличиваем лимит токенов
                  blockType: blockType,
                  provider: 'deepseek', // Используем deepseek для лучшего качества
                  skipCache: true
                });
                
                if (expandedText && expandedText.trim()) {
                  const expandedClean = expandedText.trim();
                  const expandedWithMarker = expandedClean + '\n\n' + endMarker;
                  
                  // Повторная валидация расширенного блока
                  const revalidation = this.validator.validateBlock(expandedWithMarker, blockType);
                  if (revalidation.valid) {
                    const expandedWordCount = this.countWords(expandedClean);
                    log('ARTICLE-GEN-V6', `✅ Block ${blockType} auto-expanded successfully: ${currentWords} → ${expandedWordCount} words`);
                    return {
                      type: blockType,
                      content: expandedWithMarker,
                      provider: provider,
                      wordCount: expandedWordCount,
                      status: 'VALID',
                      autoExpanded: true,
                      performanceMetrics: {
                        generationTime: Date.now() - blockStartTime,
                        retryCount: attempt - 1,
                        cacheHit: false,
                        providerUsed: 'deepseek',
                        circuitBreakerBlocked: false
                      }
                    };
                  } else {
                    log('ARTICLE-GEN-V6', `⚠️  Auto-expanded block ${blockType} still failed validation, retrying...`);
                    log('ARTICLE-GEN-V6', `   Remaining errors: ${revalidation.errors.join(', ')}`);
                  }
                }
              } catch (expandError) {
                log('ARTICLE-GEN-V6', `⚠️  Auto-expand failed for ${blockType}: ${expandError.message}`);
              }
            }
          }
        }
        
        // ТРИЗ ПРОХОД 2: Auto-fix для грамматических ошибок
        const grammarError = validation.errors.find(e => e.includes('INVALID_GRAMMAR_LIKELY_INCOMPLETE_SENTENCE'));
        if (grammarError && attempt <= maxRetries) {
          log('ARTICLE-GEN-V6', `⚠️  Block ${blockType} has grammar error. Auto-fixing...`);
          
          const fixPrompt = `You are a precision editor. Fix the last sentence to include a verb and complete the thought naturally.

CRITICAL RULES:
- Keep the EXACT same meaning and style
- The last sentence MUST contain a verb
- The last sentence MUST end with proper punctuation (. ! ?)
- DO NOT end with forbidden words: to, for, with, from, including, like, such as, indicating, suggesting, because, due to, involving, engine, system, vehicle, data, information, report, check, verification
- Complete the thought naturally

[ORIGINAL TEXT]
${cleanTextForExpand || textToValidate.replace(new RegExp(`\\[\\[END_BLOCK:${blockType}\\]\\].*$`, 's'), '').trim()}

[FIXED TEXT]`;

          try {
            const fixedText = await this.aiAugmentation.generateText(fixPrompt, {
              lang: 'en',
              intent: 'vin_check',
              maxTokens: 200,
              blockType: blockType,
              provider: 'deepseek',
              skipCache: true
            });
            
            if (fixedText && fixedText.trim()) {
              const fixedClean = fixedText.trim();
              const fixedWithMarker = fixedClean + '\n\n' + endMarker;
              
              // Повторная валидация исправленного блока
              const revalidation = this.validator.validateBlock(fixedWithMarker, blockType);
              if (revalidation.valid) {
                const fixedWordCount = this.countWords(fixedClean);
                log('ARTICLE-GEN-V6', `✅ Block ${blockType} auto-fixed successfully: grammar error resolved`);
                return {
                  type: blockType,
                  content: fixedWithMarker,
                  provider: provider,
                  wordCount: fixedWordCount,
                  status: 'VALID',
                  autoFixed: true,
                  performanceMetrics: {
                    generationTime: Date.now() - blockStartTime,
                    retryCount: attempt - 1,
                    cacheHit: false,
                    providerUsed: 'deepseek',
                    circuitBreakerBlocked: false
                  }
                };
              } else {
                log('ARTICLE-GEN-V6', `⚠️  Auto-fixed block ${blockType} still failed validation, retrying...`);
                log('ARTICLE-GEN-V6', `   Remaining errors: ${revalidation.errors.join(', ')}`);
              }
            }
          } catch (fixError) {
            log('ARTICLE-GEN-V6', `⚠️  Auto-fix failed for ${blockType}: ${fixError.message}`);
          }
        }
        
        // Есть ошибки валидации
        lastErrorType = 'VALIDATION_ERROR';
        if (attempt <= maxRetries) {
          log('ARTICLE-GEN-V6', `Block ${blockType} validation failed (attempt ${attempt}): ${validation.errors.join(', ')}`);
          log('ARTICLE-GEN-V6', `Retrying block ${blockType}...`);
          // УЛУЧШЕНИЕ: Экспоненциальный backoff для валидации (0ms - немедленный retry)
          const delay = this.getRetryDelay(attempt, lastErrorType);
          if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          continue;
        } else {
          // Исчерпаны все попытки
          // TRIZ: Обратная связь - логируем полную информацию о провале
          const wordCount = this.countWords(text); // Считаем БЕЗ маркера
          const generationTime = Date.now() - blockStartTime;
          error('ARTICLE-GEN-V6', `Block ${blockType} failed validation after ${maxRetries + 1} attempts: ${validation.errors.join(', ')}`);
          if (autoAddedMarker) {
            error('ARTICLE-GEN-V6', `  Note: End marker was auto-added but validation still failed`);
          }
          if (autoFixedEnding) {
            error('ARTICLE-GEN-V6', `  Note: Ending punctuation was auto-fixed but validation still failed`);
          }
          circuitBreaker.recordFailure('VALIDATION_ERROR');
          return {
            type: blockType,
            content: textToValidate, // Используем текст с маркером (даже если валидация провалилась)
            provider: provider,
            wordCount: wordCount, // Точный wordCount без маркера
            status: 'FAILED_VALIDATION',
            errors: validation.errors,
            warnings: validation.warnings,
            autoAddedMarker: autoAddedMarker,
            autoFixedEnding: autoFixedEnding,
            performanceMetrics: {
              generationTime: generationTime,
              retryCount: attempt - 1,
              cacheHit: cacheHit,
              providerUsed: provider,
              errorType: lastErrorType
            }
          };
        }
      }
    }
  }

  /**
   * УЛУЧШЕНИЕ: Двухфазный pipeline (draft → refine)
   * Phase 1: Ollama быстро набрасывает структуру
   * Phase 2: DeepSeek улучшает и доводит до финального качества
   */
  async generateBlockWithPipeline(blockType, context, options = {}) {
    const { provider = 'deepseek', wordCount = 300, reference = null } = options;
    const blockStartTime = Date.now();
    
    log('ARTICLE-GEN-V6', `Generating ${blockType} with DRAFT→REFINE pipeline (${wordCount} words)...`);

    // Phase 1: DRAFT (Ollama) - быстрый черновик
    const draftStartTime = Date.now();
    const draftPrompt = this.buildDraftPrompt(blockType, context, { wordCount, reference });
    
    let draft;
    try {
      draft = await this.aiAugmentation.generateText(draftPrompt, {
        lang: 'en',
        intent: 'vin_check',
        maxTokens: Math.floor(wordCount * 1.0), // Draft может быть короче
        blockType: blockType,
        make: context.make,
        year: context.year,
        stateSlug: context.stateSlug,
        provider: 'ollama', // Draft всегда через Ollama
        systemPrompt: this.getSystemPrompt(blockType, context), // ANTI-DUPLICATE: Используем стилистические варианты
        skipCache: false
      });
      
      const draftTime = Date.now() - draftStartTime;
      log('ARTICLE-GEN-V6', `Draft for ${blockType} generated in ${draftTime}ms (${draft?.length || 0} chars)`);
    } catch (error) {
      error('ARTICLE-GEN-V6', `Draft generation failed for ${blockType}: ${error.message}`);
      // Fallback: генерируем без draft
      return await this.generateBlock(blockType, context, options);
    }

    if (!draft || draft.trim().length < 50) {
      log('ARTICLE-GEN-V6', `Draft for ${blockType} too short, falling back to direct generation`);
      return await this.generateBlock(blockType, context, options);
    }

    // Phase 2: REFINE (DeepSeek) - улучшение черновика
    const refineStartTime = Date.now();
    const refinePrompt = this.buildRefinePrompt(blockType, context, { draft, wordCount });
    
    const safeWordCount = Math.max(50, Math.abs(wordCount || 300));
    const baseTokens = Math.floor(safeWordCount * 1.2);
    const maxTokens = Math.max(150, baseTokens) + 50;
    
    let refined;
    try {
      refined = await this.aiAugmentation.generateText(refinePrompt, {
        lang: 'en',
        intent: 'vin_check',
        maxTokens: maxTokens,
        blockType: blockType,
        make: context.make,
        year: context.year,
        stateSlug: context.stateSlug,
        provider: 'deepseek', // Refine через DeepSeek
        systemPrompt: this.getSystemPrompt(blockType, context), // ANTI-DUPLICATE: Используем стилистические варианты
        skipCache: false
      });
      
      const refineTime = Date.now() - refineStartTime;
      log('ARTICLE-GEN-V6', `Refine for ${blockType} completed in ${refineTime}ms`);
    } catch (error) {
      error('ARTICLE-GEN-V6', `Refine generation failed for ${blockType}: ${error.message}`);
      // Fallback: используем draft как финальный результат
      refined = draft;
    }

    if (!refined || refined.trim().length < 50) {
      log('ARTICLE-GEN-V6', `Refine for ${blockType} failed, using draft as fallback`);
      refined = draft;
    }

    // Валидация финального результата
    const endMarker = `[[END_BLOCK:${blockType}]]`;
    let textToValidate = refined;
    let autoAddedMarker = false;
    let autoFixedEnding = false;

    // Автоматическое добавление маркера и исправление окончания (как в generateBlock)
    const trimmedContentBeforeMarker = refined.replace(new RegExp(endMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '.*$', 's'), '').trim();
    if (trimmedContentBeforeMarker.length > 0 && !['.', '!', '?'].includes(trimmedContentBeforeMarker[trimmedContentBeforeMarker.length - 1])) {
      log('ARTICLE-GEN-V6', `⚠️  Block ${blockType} ending punctuation missing, adding automatically`);
      refined = trimmedContentBeforeMarker + '.';
      autoFixedEnding = true;
    } else {
      refined = trimmedContentBeforeMarker;
    }

    if (!refined.includes(endMarker)) {
      log('ARTICLE-GEN-V6', `⚠️  Block ${blockType} missing end marker, adding automatically`);
      textToValidate = refined.trim() + '\n\n' + endMarker;
      autoAddedMarker = true;
    } else {
      textToValidate = refined;
    }

    // Валидация
    const validation = this.validator.validateBlock(textToValidate, blockType);
    const generationTime = Date.now() - blockStartTime;
    
    if (validation.valid) {
      const wordCount = this.countWords(refined);
      log('ARTICLE-GEN-V6', `Block ${blockType} validated successfully (${wordCount} words, ${generationTime}ms, pipeline: draft→refine)`);
      return {
        type: blockType,
        content: textToValidate,
        provider: provider,
        wordCount: wordCount,
        status: 'VALID',
        autoAddedMarker: autoAddedMarker,
        autoFixedEnding: autoFixedEnding,
        performanceMetrics: {
          generationTime: generationTime,
          retryCount: 0,
          cacheHit: false,
          providerUsed: 'draft-refine-pipeline',
          pipelineUsed: true
        }
      };
    } else {
      // Если валидация не прошла, пробуем обычный метод
      log('ARTICLE-GEN-V6', `Pipeline validation failed for ${blockType}, falling back to direct generation`);
      return await this.generateBlock(blockType, context, options);
    }
  }

  /**
   * Построение промпта для DRAFT фазы
   */
  buildDraftPrompt(blockType, context, options = {}) {
    const { wordCount = 300, reference = null } = options;
    const { make, model, year, stateLabel, vin } = context;
    
    return `You are a fast drafting model. Generate a rough English draft for block '${blockType}' for a VIN article.

Requirements:
- Use the structure below as a guide.
- Keep draft between ${Math.floor(wordCount * 0.8)} and ${Math.floor(wordCount * 1.2)} words.
- End with the marker [[END_BLOCK:${blockType}]] on the last line.
- Do not write anything after the marker.

Context: ${year} ${make} ${model} in ${stateLabel}, VIN: ${vin || '4T1B11HK3JU123456'}

Write a rough draft for the ${blockType} section. Focus on structure and key points, not perfect wording.`;
  }

  /**
   * ANTI-BREAK SYSTEM: Построение промпта для REFINE фазы с LLM Final Review
   */
  buildRefinePrompt(blockType, context, options = {}) {
    const { draft, wordCount = 300 } = options;
    const { make, model, year, stateLabel } = context;
    
    return `You are a high-precision automotive compliance editor.

Your job:
- Rewrite the DRAFT block "${blockType}" into a final, stable, complete block.
- Follow STRICT structure:
  (1) 2-sentence intro,
  (2) 3–6 full-sentence bullet points (if applicable),
  (3) 2-sentence closing.

🚨 CRITICAL: Before outputting:

1) Re-read the LAST THREE SENTENCES.
2) If ANY sentence is incomplete, dangling, or ends with a forbidden word,
   rewrite ONLY the ending section to make it fully self-contained.
3) STRICTLY enforce a COMPLETE ending.

Forbidden endings include (case-insensitive):
  "to", "for", "with", "from", "including", "such as",
  "like", "indicating", "suggesting", "because",
  "due to", "involving", "engine", "system", "vehicle", "data",
  "information", "report", "check", "verification"

Requirements:
- Preserve all key facts but improve clarity, structure, and depth.
- Keep output between ${Math.floor(wordCount * 0.9)} and ${Math.floor(wordCount * 1.1)} words.
- Avoid clichés and generic phrases.
- Make the text self-contained (no references to 'this draft' or 'above').
- Every sentence must be COMPLETE and end with proper punctuation.

Context: ${year} ${make} ${model} in ${stateLabel}

[DRAFT]
${draft}

After the final sentence:
- Output a BLANK LINE.
- Output EXACTLY this marker on its own line:

[[END_BLOCK:${blockType}]]

Do NOT add anything after the marker.

Now refine this draft into a polished, expert-level final version with COMPLETE endings.`;
  }

  /**
   * Построение промпта для блока на основе reference articles
   * УЛУЧШЕНИЕ: Использует canonical-промпты из файлов, если они есть
   * ANTI-DUPLICATE: Добавляет стилистические варианты, state/model boost, lexical variants
   */
  buildBlockPrompt(blockType, context, options = {}) {
    const { wordCount = 300, reference = null } = options;
    const { make, model, year, stateLabel, stateSlug, vin } = context;
    
    // ANTI-DUPLICATE: Получаем контекст вариаций
    const variationContext = context.variationContext || {};
    const styleVariant = variationContext.styleVariant || this.variationEngine.getRandomStyleVariant();
    const stateBoost = variationContext.stateBoost || this.variationEngine.getStateBoost(stateSlug);
    const modelBoost = variationContext.modelBoost || this.variationEngine.getModelBoost(year, make, model);
    const factSheet = variationContext.factSheet || null; // MONSTER 7.x FACT-LOCK

    // MONSTER 7.x: Получаем VIN specs для точных декодеров
    const vinSpecs = this.variationEngine.getVINSpecs(year, make, model);
    
    // MONSTER 7.x: Получаем вариант формата блока
    const blockVariant = this.variationEngine.getBlockVariant(blockType);
    
    // MONSTER 7.x: Получаем анти-шаблонные и TRIZ промпты
    const antishablonPrompt = this.variationEngine.getAntishablonPrompt();
    const trizAntiCutoffPrompt = this.variationEngine.getTrizAntiCutoffPrompt();
    
    // MONSTER 7.x FACT-LOCK: Подготавливаем FACT-SHEET секцию для промпта
    let factLockSection = '';
    if (factSheet && this.factLockPromptHeader) {
      factLockSection = `${this.factLockPromptHeader}\n\nFACT-SHEET (JSON):\n${JSON.stringify(factSheet, null, 2)}\n\n---\n\n`;
    }

    // УНИВЕРСАЛЬНОЕ: Декодируем VIN для добавления в контекст canonical промпта
    const vinData = this.decodeVINWMI(vin || '4T1B11HK3JU123456');
    const decodedYear = this.decodeVINYear(vin || '4T1B11HK3JU123456') || year;
    const yearCode = vin && vin.length >= 10 ? vin[9].toUpperCase() : (year === '2018' ? 'J' : year === '2019' ? 'K' : 'J');
    
    // УЛУЧШЕНИЕ: Пробуем использовать canonical-промпт из файла
    const canonicalPrompt = this.canonicalPrompts.getPromptWithSubstitution(blockType, {
      make,
      model,
      year,
      stateLabel,
      stateSlug,
      vin: vin || '4T1B11HK3JU123456',
      wordCount,
      // УНИВЕРСАЛЬНОЕ: Добавляем декодированные данные VIN для использования в промпте
      WMI: vinData.wmi,
      MANUFACTURER_NAME: vinData.manufacturerName,
      COUNTRY: vinData.country,
      VEHICLE_TYPE: vinData.vehicleType,
      YEAR_CODE: yearCode,
      POSITION1: vinData.position1,
      POSITION2: vinData.position2,
      POSITION3: vinData.position3
    });

    if (canonicalPrompt) {
      log('ARTICLE-GEN-V6', `Using canonical prompt from file for ${blockType}`);
      
      // MONSTER 7.x FACT-LOCK: Добавляем FACT-SHEET в начало промпта
      // ANTI-DUPLICATE: Добавляем стилистические и boost данные к canonical промпту
      let enhancedPrompt = factLockSection + canonicalPrompt;
      
      // Добавляем стилистические инструкции
      if (styleVariant && styleVariant.characteristics) {
        enhancedPrompt += `\n\nSTYLE GUIDANCE (${styleVariant.name}):\n${styleVariant.characteristics.join('\n')}\n`;
      }
      
      // MONSTER 7.x: Добавляем state-specific boost с рисками
      if (stateBoost && (blockType === 'state_specific' || blockType === 'deep_explanation' || blockType === 'fraud_patterns')) {
        if (stateBoost.uniqueRules && stateBoost.uniqueRules.length > 0) {
          enhancedPrompt += `\n\nSTATE-SPECIFIC REGULATIONS:\n- ${stateBoost.uniqueRules.join('\n- ')}\n`;
        }
        if (stateBoost.specificPractices && stateBoost.specificPractices.length > 0) {
          enhancedPrompt += `\nSTATE-SPECIFIC PRACTICES:\n- ${stateBoost.specificPractices.join('\n- ')}\n`;
        }
        if (stateBoost.selectedRisks && stateBoost.selectedRisks.length > 0) {
          enhancedPrompt += `\nSTATE-SPECIFIC RISKS TO MENTION:\n- ${stateBoost.selectedRisks.join('\n- ')}\n`;
        }
        if (stateBoost.fraudPatterns && stateBoost.fraudPatterns.length > 0 && blockType === 'fraud_patterns') {
          enhancedPrompt += `\nSTATE-SPECIFIC FRAUD PATTERNS:\n- ${stateBoost.fraudPatterns.join('\n- ')}\n`;
        }
      }
      
      // MONSTER 7.x: Добавляем VIN specs для точных декодеров
      if (vinSpecs && blockType === 'vin_decoder') {
        enhancedPrompt += `\n\nVIN SPECIFICATIONS FOR ${year} ${make} ${model}:\n`;
        if (vinSpecs.wmi) {
          enhancedPrompt += `- WMI: ${vinSpecs.wmi.join(' or ')} (${vinSpecs.wmi_description || ''})\n`;
        }
        if (vinSpecs.engine_codes) {
          enhancedPrompt += `- Engine Codes: ${vinSpecs.engine_codes.join(', ')}\n`;
          if (vinSpecs.engine_descriptions) {
            Object.entries(vinSpecs.engine_descriptions).forEach(([code, desc]) => {
              enhancedPrompt += `  * ${code}: ${desc}\n`;
            });
          }
        }
        if (vinSpecs.safety) {
          enhancedPrompt += `- Safety System: ${vinSpecs.safety}\n`;
          if (vinSpecs.safety_features) {
            enhancedPrompt += `  Features: ${vinSpecs.safety_features.join(', ')}\n`;
          }
        }
        if (vinSpecs.plant) {
          enhancedPrompt += `- Assembly Plants: ${vinSpecs.plant.join(', ')}\n`;
        }
        if (vinSpecs.model_year_code) {
          enhancedPrompt += `- Model Year Code (Position 10): ${vinSpecs.model_year_code} = ${year}\n`;
        }
        if (vinSpecs.vin_positions) {
          enhancedPrompt += `\nVIN POSITION BREAKDOWN:\n`;
          Object.entries(vinSpecs.vin_positions).forEach(([pos, meaning]) => {
            enhancedPrompt += `- Positions ${pos}: ${meaning}\n`;
          });
        }
      }
      
      // MONSTER 7.x: Добавляем вариант формата блока
      if (blockVariant && blockVariant.description) {
        enhancedPrompt += `\n\nBLOCK FORMAT VARIANT: ${blockVariant.variant}\n${blockVariant.description}\n`;
      }
      
      // MONSTER 7.x: Добавляем анти-шаблонный промпт
      if (antishablonPrompt) {
        enhancedPrompt += `\n\n${antishablonPrompt}\n`;
      }
      
      // MONSTER 7.x: Добавляем TRIZ-анти-обрывы промпт
      if (trizAntiCutoffPrompt) {
        enhancedPrompt += `\n\n${trizAntiCutoffPrompt.replace('<BLOCK_ID>', blockType)}\n`;
      }
      
      // Добавляем model/year-specific boost
      if (modelBoost && (blockType === 'recalls_tsbs' || blockType === 'buyer_guide' || blockType === 'deep_explanation')) {
        if (modelBoost.tsbs && modelBoost.tsbs.length > 0) {
          enhancedPrompt += `\n\nMODEL/YEAR-SPECIFIC TSBs:\n- ${modelBoost.tsbs.join('\n- ')}\n`;
        }
        if (modelBoost.commonIssues && modelBoost.commonIssues.length > 0) {
          enhancedPrompt += `\nCOMMON ISSUES FOR THIS MODEL/YEAR:\n- ${modelBoost.commonIssues.join('\n- ')}\n`;
        }
      }
      
      // Добавляем reference если есть
      let referenceText = '';
      if (reference) {
        if (typeof reference === 'string') {
          referenceText = `\n\nReference example:\n${reference}\n`;
        } else if (reference.content) {
          referenceText = `\n\nReference example:\n${reference.content}\n`;
        } else if (Array.isArray(reference)) {
          referenceText = `\n\nReference example:\n${reference.join(', ')}\n`;
        }
      }
      // MONSTER 7.x: Объединяем все компоненты промпта (все уже добавлены в enhancedPrompt)
      return enhancedPrompt + referenceText;
    }

    // Fallback: используем старый метод (хардкод промптов)
    log('ARTICLE-GEN-V6', `Using hardcoded prompt for ${blockType} (canonical file not found)`);

    // MONSTER 7.x: Требование маркера окончания - В НАЧАЛЕ ПРОМПТА
    const endMarkerRequirement = `🚨🚨🚨 CRITICAL REQUIREMENT - READ THIS FIRST 🚨🚨🚨

You MUST end your response with exactly this marker on a new line:
[[END_BLOCK:${blockType}]]

After the marker, there must be NO additional text, spaces, or content.

Example format:
[Your complete block content here...]

[[END_BLOCK:${blockType}]]

This marker is MANDATORY. Your response will be rejected without it.
🚨🚨🚨 END OF CRITICAL REQUIREMENT 🚨🚨🚨

`;

    // ANTI-DUPLICATE: Применяем стилистические варианты
    const styleGuidance = styleVariant && styleVariant.characteristics 
      ? styleVariant.characteristics.join('; ') 
      : 'DMV-grade, legal, antifraud, engineering-level explanation';
    
    const styleOpeningPhrase = this.variationEngine.getStyleOpeningPhrase(styleVariant);
    const openingInstruction = styleOpeningPhrase 
      ? `Start with a variation like: "${styleOpeningPhrase}" or similar. `
      : '';
    
    // MONSTER 7.x FACT-LOCK: Добавляем FACT-SHEET в начало fallback промпта
    const basePrompt = `${factLockSection}${endMarkerRequirement}Write a ${blockType} block for a VIN check guide for ${year} ${make} ${model} in ${stateLabel}.

${openingInstruction}Style: ${styleGuidance}.
Word count: ${wordCount} words.
Use FACTUAL, TECHNICAL style (no literary flourishes).

ANTI-DUPLICATE LEXICAL VARIATION: Use varied terminology. Instead of always using the same phrases, consider alternatives:
- "legal and technical audit" → consider "regulatory and mechanical assessment" or "state-level forensic evaluation"
- "VIN fingerprint" → consider "manufacturing identity code" or "vehicle identity signature"
- "complete history and condition" → consider "full operational and legal record" or "comprehensive vehicle documentation"
- Vary your sentence structures and logical connectors (However, In practice, In ${stateLabel}, From a technical perspective, etc.)

CRITICAL REQUIREMENTS - NO EXCEPTIONS:
- Complete ALL sentences fully - NO truncated text ending with "and", "or", "(", "[", "|"
- Finish ALL bullet points completely - NO incomplete bullets
- Complete ALL tables with ALL rows - NO partial tables
- Ensure ALL sections have proper conclusions - NO abrupt endings
- NO text breaks before headings (##) - finish the sentence, then add heading
- NO incomplete thoughts or cut-off phrases
- Every paragraph must have a complete thought
- Every list item must be a complete sentence or phrase

ANTI-DUPLICATE META-DECORRELATION (Vary your structure to avoid AI patterns):
- Vary sentence lengths: Mix short (8-12 words) and longer (18-25 words) sentences naturally
- Vary paragraph structure: Some paragraphs 2-3 sentences, others 4-5 sentences
- Vary list formats: Use bullets (*) for some lists, numbered (1., 2., 3.) for others, or mixed formats
- Vary logical connectors: Use "However", "In practice", "In ${stateLabel}", "From a technical perspective", "Additionally", "Moreover", "Specifically", "Notably" - rotate them
- Vary sentence beginnings: Start some with subject, others with prepositional phrases, some with conjunctions
- Vary technical density: Mix highly technical sentences with more accessible explanations

VALIDATION RULES:
- If you start a sentence, you MUST finish it
- If you start a table, you MUST complete all rows
- If you start a list, you MUST complete all items
- If you mention a concept, you MUST explain it fully

`;

    // MONSTER 7.x: Добавляем state-specific boost с рисками
    let stateBoostText = '';
    if (stateBoost && (blockType === 'state_specific' || blockType === 'deep_explanation' || blockType === 'fraud_patterns')) {
      if (stateBoost.uniqueRules && stateBoost.uniqueRules.length > 0) {
        stateBoostText += `\n\nSTATE-SPECIFIC REGULATIONS TO MENTION:\n${stateBoost.uniqueRules.map(rule => `- ${rule}`).join('\n')}\n`;
      }
      if (stateBoost.specificPractices && stateBoost.specificPractices.length > 0) {
        stateBoostText += `\nSTATE-SPECIFIC PRACTICES:\n${stateBoost.specificPractices.map(practice => `- ${practice}`).join('\n')}\n`;
      }
      if (stateBoost.selectedRisks && stateBoost.selectedRisks.length > 0) {
        stateBoostText += `\nSTATE-SPECIFIC RISKS TO MENTION:\n${stateBoost.selectedRisks.map(risk => `- ${risk}`).join('\n')}\n`;
      }
      if (stateBoost.fraudPatterns && stateBoost.fraudPatterns.length > 0 && blockType === 'fraud_patterns') {
        stateBoostText += `\nSTATE-SPECIFIC FRAUD PATTERNS:\n${stateBoost.fraudPatterns.map(pattern => `- ${pattern}`).join('\n')}\n`;
      }
    }
    
    // MONSTER 7.x: Добавляем VIN specs для точных декодеров
    let vinSpecsText = '';
    if (vinSpecs && blockType === 'vin_decoder') {
      vinSpecsText += `\n\nVIN SPECIFICATIONS FOR ${year} ${make} ${model}:\n`;
      if (vinSpecs.wmi) {
        vinSpecsText += `- WMI: ${vinSpecs.wmi.join(' or ')} (${vinSpecs.wmi_description || ''})\n`;
      }
      if (vinSpecs.engine_codes) {
        vinSpecsText += `- Engine Codes: ${vinSpecs.engine_codes.join(', ')}\n`;
        if (vinSpecs.engine_descriptions) {
          Object.entries(vinSpecs.engine_descriptions).forEach(([code, desc]) => {
            vinSpecsText += `  * ${code}: ${desc}\n`;
          });
        }
      }
      if (vinSpecs.safety) {
        vinSpecsText += `- Safety System: ${vinSpecs.safety}\n`;
        if (vinSpecs.safety_features) {
          vinSpecsText += `  Features: ${vinSpecs.safety_features.join(', ')}\n`;
        }
      }
      if (vinSpecs.plant) {
        vinSpecsText += `- Assembly Plants: ${vinSpecs.plant.join(', ')}\n`;
      }
      if (vinSpecs.model_year_code) {
        vinSpecsText += `- Model Year Code (Position 10): ${vinSpecs.model_year_code} = ${year}\n`;
      }
      if (vinSpecs.vin_positions) {
        vinSpecsText += `\nVIN POSITION BREAKDOWN:\n`;
        Object.entries(vinSpecs.vin_positions).forEach(([pos, meaning]) => {
          vinSpecsText += `- Positions ${pos}: ${meaning}\n`;
        });
      }
    }
    
    // MONSTER 7.x: Добавляем вариант формата блока
    let blockVariantText = '';
    if (blockVariant && blockVariant.description) {
      blockVariantText += `\n\nBLOCK FORMAT VARIANT: ${blockVariant.variant}\n${blockVariant.description}\n`;
    }
    
    // MONSTER 7.x: Добавляем анти-шаблонный промпт
    let antishablonText = '';
    if (antishablonPrompt) {
      antishablonText = `\n\n${antishablonPrompt}\n`;
    }
    
    // MONSTER 7.x: Добавляем TRIZ-анти-обрывы промпт
    let trizText = '';
    if (trizAntiCutoffPrompt) {
      trizText = `\n\n${trizAntiCutoffPrompt.replace('<BLOCK_ID>', blockType)}\n`;
    }
    
    // ANTI-DUPLICATE: Добавляем model/year-specific boost
    let modelBoostText = '';
    if (modelBoost && (blockType === 'recalls_tsbs' || blockType === 'buyer_guide' || blockType === 'deep_explanation')) {
      if (modelBoost.tsbs && modelBoost.tsbs.length > 0) {
        modelBoostText += `\n\nMODEL/YEAR-SPECIFIC TSBs TO MENTION:\n${modelBoost.tsbs.map(tsb => `- ${tsb}`).join('\n')}\n`;
      }
      if (modelBoost.recalls && modelBoost.recalls.length > 0 && blockType === 'recalls_tsbs') {
        modelBoostText += `\nMODEL/YEAR-SPECIFIC RECALLS:\n${modelBoost.recalls.map(recall => `- ${recall}`).join('\n')}\n`;
      }
      if (modelBoost.commonIssues && modelBoost.commonIssues.length > 0) {
        modelBoostText += `\nCOMMON ISSUES FOR ${year} ${make} ${model}:\n${modelBoost.commonIssues.map(issue => `- ${issue}`).join('\n')}\n`;
      }
    }
    
    // Добавляем reference если есть
    let referenceText = '';
    if (reference) {
      if (typeof reference === 'string') {
        referenceText = `\nReference example:\n${reference}\n`;
      } else if (reference.content) {
        referenceText = `\nReference example:\n${reference.content}\n`;
      } else if (Array.isArray(reference)) {
        referenceText = `\nReference example:\n${reference.join(', ')}\n`;
      }
    }
    
    // MONSTER 7.x: Объединяем все компоненты промпта
    const allPrompts = basePrompt + stateBoostText + vinSpecsText + blockVariantText + antishablonText + trizText + referenceText;

    // Специфичные промпты для каждого блока
    const blockPrompts = {
      hero: `${basePrompt}Write a hero section (2-3 sentences) that establishes expert authority and ${stateLabel}-specific context immediately.

ANTI-DUPLICATE CANONICAL-FREE MODE:
- Your FIRST sentence MUST be unique and different from standard templates
- Avoid starting with "A comprehensive VIN check" or "When purchasing a used vehicle" - use varied openings
- Consider starting with: "${styleOpeningPhrase || 'An expert analysis reveals'}" or state-specific context
- Vary your opening structure: Some start with the vehicle, others with the state, others with the process
- NO two hero sections should start identically${referenceText}`,
      
      key_facts: `${basePrompt}

Write a key facts section with 8-10 COMPLETE bullet points providing quick scanning for users.

CANON FORMAT FOR KEY FACTS:
- Each bullet MUST start with: "* **LABEL:** description..."
- LABEL must be maximum 7 words
- After LABEL there MUST be a colon ":"
- NO garbage bullets like "- *", "* -", "* *", "- -"
- NO empty bullets or bullets with only spaces

REQUIREMENTS:
- Each bullet point must be a COMPLETE sentence ending with a period
- NO truncated bullets like "Auction Traceability" or "Environmental Compliance Data: Access..." - finish EVERY thought
- Include ALL of these topics (each as a complete bullet):
  * **DMV odometer fraud-gap indexing:** analyzes sequential readings to detect inconsistencies indicative of digital manipulation or cluster replacement.
  * **NMVTIS title brand enforcement:** confirms the presence of nationally mandated designations, including Salvage, Junk, or Lemon Law buyback status.
  * **Full collision sequence reconstruction:** utilizes event data recorder timestamps and repair order chronology to determine impact severity and repair quality.
  * **Smog certification pattern analysis:** identifies testing irregularities or state-specific emission test limitations that may affect {STATE} registration eligibility.
  * **Unibody structural integrity markers:** reference factory weld points and alignment specifications to confirm the absence of critical frame damage.
  * **Auction traceability:** tracks vehicle history through Manheim, IAAI, and Copart auction records to identify potential title washing or fraud.
  * **Insurance total loss visibility:** reveals when insurers declared the vehicle a total loss, indicating significant damage or structural compromise.
  * **Fleet/rental detection:** identifies service cycles and registration patterns that indicate commercial or rental vehicle use.
  * **Anti-fraud detection:** covers VIN cloning, CAN-bus odometer rollback, and re-tagging schemes used to obscure vehicle history.
  * **Title washing detection:** identifies vehicles moved between states (NV, AZ, OR) to remove brands and obtain clean titles.
  * **Risk-adjusted value deviations:** quantifies how specific historical events or data discrepancies depreciate the vehicle's market value.
  * **Cross-state emission compliance anomalies:** detects registration gaps or smog test failures that may indicate underlying mechanical issues.

CRITICAL: Every bullet must be a complete, finished sentence. NO exceptions. NO garbage bullets.

${referenceText}`,
      
      vin_decoder: (() => {
        // УНИВЕРСАЛЬНОЕ: Декодируем VIN для получения правильных данных
        const vinData = this.decodeVINWMI(vin || '4T1B11HK3JU123456');
        const yearCode = vin && vin.length >= 10 ? vin[9].toUpperCase() : 'J';
        const decodedYear = this.decodeVINYear(vin || '4T1B11HK3JU123456') || year;
        
        // Определяем год код для таблицы
        const yearCodeMap = {
          '2018': 'J', '2019': 'K', '2020': 'L', '2021': 'M', '2022': 'N', 
          '2023': 'P', '2024': 'R', '2025': 'S'
        };
        const tableYearCode = yearCodeMap[year] || yearCode;
        
        return `${basePrompt}Write a VIN decoder section explaining 17-character structure, position meanings (WMI, VDS, VIS), and ${year} ${make} ${model}-specific codes.

🚨 CRITICAL: Complete ALL position descriptions fully. DO NOT stop at "Position 6 ("1")." - you MUST explain what Position 6 means completely.

CANONICAL VIN STRUCTURE (MUST FOLLOW EXACTLY):
Positions 1-3 (WMI): Country, Manufacturer, Vehicle Type
  - Position 1: Region/Country (${vinData.position1} = ${vinData.country})
  - Position 2: Manufacturer (${vinData.position2} = ${vinData.manufacturerName})
  - Position 3: Vehicle Type (${vinData.position3} = ${vinData.vehicleType})

Positions 4-8 (VDS): Model, Body, Grade, Safety, Engine
  - Position 4: Model Line (specific to ${make} ${model})
  - Position 5: Body/Engine Family (varies by model)
  - Position 6: Grade/Series + Restraint System (varies by trim level)
  - Position 7: Safety/Body Configuration (varies by model)
  - Position 8: Engine Code (specific to ${year} ${make} ${model} engine options)

Position 9: Check Digit (mathematical validation)

Position 10: Model Year (${tableYearCode} = ${year})

Position 11: Assembly Plant (varies by ${make} manufacturing location)

Positions 12-17: Serial Number (000001-999999)

🚨🚨🚨🚨🚨 CRITICAL: TABLE IS MANDATORY - YOUR RESPONSE WILL BE REJECTED WITHOUT IT 🚨🚨🚨🚨🚨

YOU MUST INCLUDE A VIN POSITION TABLE. THIS IS NOT OPTIONAL. VALIDATION CHECKS FOR THIS TABLE AND WILL REJECT YOUR RESPONSE IF IT'S MISSING.

STEP 1: Write your introductory paragraph about VIN decoding.

STEP 2: IMMEDIATELY AFTER the introduction, you MUST include a table with this EXACT format (use the ACTUAL VIN data for ${make}):

| Position | Range | Meaning |
|---------|-------|---------|
| 1-3 | WMI | World Manufacturer Identifier: ${vinData.wmi} = ${vinData.country}, ${vinData.manufacturerName}, ${vinData.vehicleType} |
| 4-8 | VDS | Vehicle Descriptor Section: Model-specific codes for ${year} ${make} ${model} (body style, trim, safety features, engine) |
| 9 | Check Digit | Mathematical validation digit (calculated via NHTSA algorithm) |
| 10 | Year | Model Year: ${tableYearCode} = ${year} |
| 11 | Plant | Assembly Plant: (varies by ${make} manufacturing facility) |
| 12-17 | Serial | Production Sequence: Unique serial number (from example VIN ${vin || 'XXXXXX'}) |

CRITICAL: You MUST use the ACTUAL WMI from the example VIN (${vinData.wmi}), NOT generic examples. The WMI ${vinData.wmi} means ${vinData.country}, ${vinData.manufacturerName}, ${vinData.vehicleType}.

STEP 3: After the table, continue with detailed explanations specific to ${year} ${make} ${model}.

VALIDATION CHECK: The validator looks for "| Position |" in your response. If it's not found, your response FAILS validation.

DO NOT SKIP THE TABLE. DO NOT FORGET THE TABLE. THE TABLE IS REQUIRED.

🚨🚨🚨🚨🚨 END OF CRITICAL TABLE REQUIREMENT 🚨🚨🚨🚨🚨

ENGINE-SPECIFIC CONTENT (УНИВЕРСАЛЬНОЕ):
- Describe the engine code(s) specific to ${year} ${make} ${model}
- If the example VIN has Position 8 = a specific code, explain what that code means for this model
- If mentioning other possible engine configurations, clearly label them as "other available configurations"
- Be accurate to ${make} engine naming conventions (do NOT use Toyota-specific engine codes like A25A-FKS for ${make})

CANON RULES FOR TABLES:
- Use compact format above - NO 17-row table
- NO empty cells
- NO truncated descriptions ending with ":" or ":."
- NO unclosed parentheses "(" without ")"
- Every cell must be complete - finish the description fully

CRITICAL REQUIREMENTS:
- Use the SAME VIN example (${vin || 'provided VIN'}) everywhere in the article
- Position 10 MUST be ${tableYearCode} for ${year}
- Complete the full table for positions 1-17. DO NOT stop at position 16.
- Use the CORRECT WMI (${vinData.wmi}) for ${make}, NOT examples from other manufacturers
- Finish all sentences completely - NO text breaks before or after the table
- Close ALL parentheses in table cells
- Be specific to ${make} ${model} - do NOT use generic or Toyota-specific examples

${referenceText}`;
      })(),
      
      nmvtis: `${basePrompt}Explain NMVTIS (National Motor Vehicle Title Information System) as primary data source, list providers, and explain how VIN reports aggregate NMVTIS data.${referenceText}`,
      
      deep_explanation: `${basePrompt}Write a deep explanation section about layered data streams, risk pattern evaluation, hidden collision sequences, cross-state title washing.

STYLE REQUIREMENTS:
- Use technical but practical language
- Focus on "if you see X, do Y" actionable advice
- Avoid pseudo-engineering phrases like "antifraud engineering process" or "legal engineering flaw"
- Be direct and factual, not overly complex

${referenceText}`,
      
      state_specific: `${basePrompt}Write state-specific insights for ${stateLabel}: emission/smog-check patterns (if applicable), DMV registration gaps, rebuilt-title processes, environmental factors.

CRITICAL ACCURACY - NO CONTRADICTIONS:
- Emission/Smog check: Commercial VIN reports do NOT provide full state-specific emission test history/logs. They may show indirect registration data only. Be clear about this limitation.
- ${stateLabel}-specific emission/smog requirements vary by state. Research and describe the actual requirements for ${stateLabel}, not generic examples.
- ALWAYS state: "Commercial VIN reports do NOT contain full ${stateLabel} emission test history. Full test logs are available only through state DMV/emission agency website or physical certificates."
- DO NOT claim VIN reports provide full emission/smog history anywhere in the text.
- For full emission/smog history, users must check ${stateLabel} DMV/emission agency website directly or inspect physical certificates.

REQUIRED CONTENT SECTIONS (complete ALL):
1. Smog Check Requirements and Patterns:
   - Biennial requirement for most vehicles
   - Commercial VIN reports limitation (do NOT provide full BAR history)
   - How to access full smog history (BAR website, physical certificates)
   - Complete explanation (minimum 60 words)

2. DMV Registration Gaps and Red Flags:
   - What registration gaps indicate (storage, out-of-state operation, potential issues)
   - How to identify suspicious patterns
   - Cross-state registration verification
   - Complete explanation (minimum 60 words)

3. Rebuilt Title Process in ${stateLabel}:
   - CHP inspection requirements
   - Brake and lamp inspection
   - Smog check requirements
   - Permanent "Revived Salvage" brand
   - Complete explanation (minimum 60 words)

4. Environmental Factors Specific to ${stateLabel}:
   - Coastal corrosion risks
   - Flood risk areas
   - High-altitude operation impacts
   - Complete explanation (minimum 40 words)

TARGET LENGTH: 250+ words to ensure comprehensive coverage.

${referenceText}`,
      
      accident_intelligence: `${basePrompt}Write an accident intelligence section analyzing collision patterns, frame twist, misalignment, hidden damage, counterfeit airbag modules.

REQUIRED CONTENT:
- Common collision types for ${year} ${make} ${model} in ${stateLabel}
- How to detect hidden structural damage (control point measurements, suspension geometry, weld/seam sealer inspection)
- Frame twist indicators (steering pull, uneven ride height, tire wear patterns)
- Counterfeit component risks (airbag modules, structural parts)
- Complete all sections fully - NO truncated text like "counterfeit or salv..."

${referenceText}`,
      
      fraud_patterns: `${basePrompt}Write a fraud patterns section covering VIN cloning, mileage rollback, title flipping, auction masking, hidden flood vehicles.

REQUIRED CONTENT - COMPLETE ALL 5 PATTERNS:
1. VIN Cloning (Vehicle Identity Theft):
   - How to verify: Check VIN at dashboard (visible through windshield), driver's side door jamb sticker, engine firewall stamping
   - Signs of tampering: Rivet head mismatches, adhesive residue, scratched surfaces, re-attached labels
   - NMVTIS conflict detection: Two vehicles with same VIN in different locations
   - Complete explanation with actionable steps

2. CAN-Bus Odometer Rollback:
   - Detection methods: Physical inspection (wear on seat, pedals, steering wheel), electronic verification
   - Mileage chain verification: Chronological chain from inspections, service records, title issuances
   - ECU scanning: Read mileage from secondary ECUs (engine, transmission control modules)
   - Complete explanation with detection checklist

3. Title Washing (Interstate Brand Removal):
   - Interstate patterns: NV→CA, AZ→CA, TX→IL→CA
   - Detection methods: Cross-reference NMVTIS for brands applied in other states, check title chain for jurisdictional jumps
   - California-specific: Vehicles declared salvage in other states may receive clean CA title
   - Complete explanation with verification steps

4. Auction Masking:
   - How auction records should match NMVTIS: Copart/IAAI records should align with total loss declarations
   - Red flags: Auction record exists but no salvage title, "frame damage" in auction but clean CA title
   - Complete explanation with cross-verification process

5. Hidden Flood Vehicles:
   - Detection signs: Corrosion, silt, mold, electrical malfunctions inconsistent with CA operation
   - State transfer patterns: Flood states (TX, FL, LA) → CA with clean title
   - Complete explanation with inspection checklist

CRITICAL: Complete ALL 5 patterns fully. Each pattern must have at least 2 complete paragraphs. NO truncated sections.

${referenceText}`,
      
      market_value: `${basePrompt}Write a market value section with risk-adjusted deviations.

🚨 КРИТИЧЕСКИЙ ТРЕБОВАНИЕ: Market Value таблица ДОЛЖНА БЫТЬ ЗАВЕРШЕНА ПОЛНОСТЬЮ - ВСЕ 6 СТРОК ОБЯЗАТЕЛЬНО!

REQUIRED TABLE FORMAT - COMPLETE ALL 6 ROWS (NO EXCEPTIONS):
| Risk Factor | Value Deviation | Technical Justification |
| :--- | :--- | :--- |
| Clean Title (No Brand) | 0% deviation | Baseline market value with no documented issues |
| Salvage or Rebuilt Title | -35% to -45% | Safety uncertainty, potential structural compromise, insurance challenges |
| Flood Damage History | -25% to -35% | Corrosion risk, electrical system concerns, potential hidden damage |
| Multiple Accident History | -15% to -25% | Cumulative structural stress, repair quality concerns, diminished reliability |
| No Service History | -10% to -15% | Unknown maintenance status, potential deferred repairs, reduced buyer confidence |
| Fleet/Rental Use | -5% to -10% | Higher wear patterns, multiple drivers, accelerated depreciation |

🚨 ABSOLUTE REQUIREMENTS:
- DO NOT stop at row 1 ("Clean Title | 0.") - this is CRITICAL ERROR
- DO NOT stop at row 2 ("Salvage | -35%.") - complete ALL 6 rows
- Every row MUST have all three columns filled completely
- The table MUST end with "Fleet/Rental Use" row - this is the last required row
- After the complete table, provide 2-3 paragraphs explaining how to use this matrix and interpret deviations
- Include specific examples for ${year} ${make} ${model} in ${stateLabel}

VALIDATION: Before finishing, count the table rows. You MUST have exactly 6 rows (plus header). If you have less, you have FAILED the requirement.

REQUIRED CONTENT:
1. Base Valuation Ranges (${stateLabel} Market):
   - LE/SE Trim: $16,500 to $19,500
   - XLE/XSE Trim: $19,000 to $22,500
   - Hybrid Powertrain Premium: Adds 8% to 12% to base trim value
   - Complete explanation of regional demand factors

2. Complete Risk-Adjusted Deviation Matrix Table:
   Format as Markdown table with columns: Risk Factor | Value Deviation | Technical Justification
   
   ALL ROWS MUST BE COMPLETE:
   - Clean Title (No Brand): 0% deviation | Explanation
   - Salvage or Rebuilt Title: -35% to -45% | Explanation
   - Rental Fleet Service: -15% to -18% | Explanation
   - Inconsistent/Missing Odometer Data: -12% to -20% | Explanation
   - Multiple Owners: -5% to -8% | Explanation
   - Auction History (Damage): -10% to -25% | Explanation
   
   Each row must have complete justification explaining why the deduction applies.

3. Complete explanation of how each risk factor affects value and residual worth.

CRITICAL: Complete the ENTIRE table with ALL rows. DO NOT stop mid-row or mid-explanation. Finish every cell completely.

${referenceText}`,
      
      insurance_risk: `${basePrompt}Write an insurance risk section covering accident-prone regions, theft density, claim patterns, driver-profile matching, vehicle model risk score.

REQUIRED CONTENT:
- Geographic risk zones for ${stateLabel} (high-risk ZIP codes, urban corridors)
- Theft risk for ${year} ${make} ${model} (high-risk trims, parts interchangeability)
- Loss-cost rating (HLDI data)
- Driver-profile matching risks
- Frame repair impact on premiums

CRITICAL: Complete all sections fully. NO incomplete sentences ending with "HLDI" or similar.

${referenceText}`,
      
      buyer_guide: `${basePrompt}Write a buyer guide section with actionable step-by-step checklist.

REQUIRED STRUCTURE - COMPLETE ALL 10 STEPS FULLY:
1. Step 1: Verify VIN Authenticity in Three Physical Locations
   - Dashboard (visible through windshield), driver's side door jamb sticker, engine firewall stamping
   - What to check: All three must match exactly, look for tampering signs
   - Complete explanation

2. Step 2: Check for Open Safety Recalls
   - NHTSA website (nhtsa.gov/recalls) - enter full 17-digit VIN
   - Toyota official portal (toyota.com/owners) - VIN lookup
   - What to verify: All recalls must be completed, documented proof required
   - Complete process explanation

3. Step 3: Obtain an NMVTIS Vehicle History Report
   - Authorized providers: National Insurance Crime Bureau (NICB), CARFAX, AutoCheck, other DOJ-approved providers
   - What the report includes: Title brands, odometer readings, total loss history, junk/salvage designations
   - Complete instructions on how to obtain and interpret

4. Step 4: Verify California DMV Documents
   - Title: Check for brands (Salvage, Lemon Law Buyback, Not Actual Mileage)
   - Registration: Verify current status, check for gaps
   - Smog Certificate: Must be valid (<90 days), verify mileage matches odometer
   - Complete verification checklist

5. Step 5: Physical Inspection Checklist
   - Structural: Welds, panel gaps, structural alignment (3mm tolerance), subframe bolts
   - Mechanical: Suspension geometry, frame twist indicators, steering pull
   - Cosmetic: Paint thickness, seam sealer consistency, door/panel alignment
   - Complete inspection guide

6. Step 6: Verify Odometer Chain
   - Sources: BAR smog certificates, DMV title transfers, service records
   - What to check: Chronological progression, no backward jumps, consistency across sources
   - Complete verification process

7. Step 7: Check for Liens
   - CA DMV lienholder search - how to verify
   - What liens mean: Financial encumbrances, cannot transfer title until cleared
   - Complete lien verification process

8. Step 8: Verify Lemon Law Buyback Status
   - How to check: CA DMV records, manufacturer buyback database
   - What it means: Vehicle returned to manufacturer under Song-Beverly Act
   - Complete verification steps

9. Step 9: Check Insurance Total Loss Records
   - Sources: NMVTIS, NICB VINCheck, insurance claim databases
   - What to look for: Total loss declarations, salvage designations
   - Complete search process

10. Step 10: Final Decision After Pre-Purchase Inspection (PPI)
   - When to get PPI: After passing all previous steps
   - What PPI includes: Comprehensive mechanical and structural inspection by certified mechanic
   - Final decision criteria: Combine all findings, assess risk, determine fair value
   - Complete guidance

Format as numbered steps (1-10) with clear, complete actions. Include specific websites, forms, and processes. NO truncated steps.

${referenceText}`,
      
      faq: `${basePrompt}Write a FAQ section with 12-15 questions covering common questions about VIN checks in ${stateLabel}.

🚨🚨🚨🚨🚨 CRITICAL: FAQ FORMAT IS MANDATORY - YOUR RESPONSE WILL BE REJECTED WITHOUT IT 🚨🚨🚨🚨🚨

YOU MUST FORMAT QUESTIONS USING ONE OF THESE EXACT FORMATS. VALIDATION CHECKS FOR QUESTIONS AND WILL REJECT YOUR RESPONSE IF THEY'RE NOT FOUND.

VALIDATION LOOKS FOR: "**Q1:", "1.", or "Q1:" patterns. If none are found, validation FAILS.

REQUIRED FORMAT OPTION 1 (PREFERRED - USE THIS):
**Q1: Will a VIN report show all accident history?**
Answer: No, commercial vehicle history reports aggregate data from specific sources (insurance claims, police reports, NMVTIS total loss). Minor incidents repaired privately, unreported damage, or events not in provider databases will not appear. Complete explanation.

**Q2: Will a VIN report show complete BAR smog check logs?**
Answer: No, commercial VIN reports do NOT provide full BAR smog history. They may show indirect registration data, but full smog logs (test results, station numbers, inspector notes) are available only through BAR website or physical certificates. Complete explanation.

**Q3: Does a clean California title guarantee the vehicle was never declared a total loss?**
Answer: No, title washing can occur where vehicles declared salvage in other states receive clean CA titles. Always cross-reference NMVTIS for interstate brands. Complete explanation.

**Q4: Can flood or water damage history be hidden from a VIN report?**
Answer: Yes, if damage occurred in another state without branding, or repairs were done privately. Detection requires NMVTIS check plus visual inspection for corrosion, silt, mold. Complete explanation.

**Q5: How do I verify open safety recalls for a ${year} ${make} ${model}?**
Answer: Check NHTSA website (nhtsa.gov/recalls) using full VIN, and Toyota official portal. Both sources must be checked for comprehensive verification. Complete step-by-step process.

YOU MUST INCLUDE AT LEAST 12 QUESTIONS IN THIS FORMAT. DO NOT WRITE PARAGRAPHS. DO NOT WRITE GENERAL TEXT. WRITE QUESTIONS AND ANSWERS.

REQUIRED FORMAT OPTION 2 (ALTERNATIVE):
1. Will a VIN report show all accident history?
Answer: [Complete detailed answer here, minimum 2-3 sentences]

2. Will a VIN report show complete BAR smog check logs?
Answer: [Complete detailed answer here, minimum 2-3 sentences]

3. Does a clean California title guarantee the vehicle was never declared a total loss?
Answer: [Complete detailed answer here, minimum 2-3 sentences]

REQUIRED FORMAT OPTION 3 (ALTERNATIVE):
Q1: Will a VIN report show all accident history?
Answer: [Complete detailed answer here, minimum 2-3 sentences]

Q2: Will a VIN report show complete BAR smog check logs?
Answer: [Complete detailed answer here, minimum 2-3 sentences]

Q3: Does a clean California title guarantee the vehicle was never declared a total loss?
Answer: [Complete detailed answer here, minimum 2-3 sentences]

CRITICAL REQUIREMENTS:
- You MUST include at least 12 questions (minimum 5 required for validation, but aim for 12-15)
- Each question MUST start with **Q followed by number** OR **number followed by dot** OR **Q followed by number**
- Examples that WILL PASS validation: "**Q1:", "1.", "Q1:"
- Each answer MUST be complete (minimum 2-3 sentences, NO truncated responses)
- Questions and answers must be clearly separated (blank line between Q&A pairs)
- Use consistent formatting throughout (all Q1, Q2, Q3 OR all 1., 2., 3.)

ANTI-DUPLICATE CANONICAL-FREE MODE FOR FAQ:
- Vary the ORDER of questions - don't always start with the same question
- Vary the WORDING of similar questions - rephrase common questions differently
- NO two FAQ sections should have identical first 3 questions in the same order
- Rotate question formats: Some use "Will a VIN report...", others use "Does a VIN check...", others use "How can I verify..."
🚨🚨🚨 END OF MANDATORY FORMAT REQUIREMENT 🚨🚨🚨

CRITICAL ACCURACY:
- DO NOT use "JTM" for Toyota Kentucky manufacturing - that's WRONG. Use "4T1" for USA-manufactured ${model}.
- Be consistent with VIN decoder section: WMI is "4T1" where 4=USA, T=Toyota, 1=passenger car.
- Smog check: ALWAYS state that commercial VIN reports do NOT provide full BAR smog history. Full history is available only through BAR website or physical certificates.
- Complete ALL answers fully - NO truncated responses. Every answer must be a complete paragraph.

REQUIRED QUESTIONS (complete ALL with full answers):
1. Will a VIN report show all accident history for a ${year} ${model}?
   Answer: No, commercial vehicle history reports aggregate data from specific sources (insurance claims, police reports, NMVTIS total loss). Minor incidents repaired privately, unreported damage, or events not in provider databases will not appear. Complete explanation.

2. Will a VIN report show complete BAR smog check logs?
   Answer: No, commercial VIN reports do NOT provide full BAR smog history. They may show indirect registration data, but full smog logs (test results, station numbers, inspector notes) are available only through BAR website or physical certificates. Complete explanation.

3. Does a clean California title guarantee the vehicle was never declared a total loss?
   Answer: No, title washing can occur where vehicles declared salvage in other states receive clean CA titles. Always cross-reference NMVTIS for interstate brands. Complete explanation.

4. Can flood or water damage history be hidden from a VIN report?
   Answer: Yes, if damage occurred in another state without branding, or repairs were done privately. Detection requires NMVTIS check plus visual inspection for corrosion, silt, mold. Complete explanation.

5. How do I verify open safety recalls for a ${year} ${make} ${model}?
   Answer: Check NHTSA website (nhtsa.gov/recalls) using full VIN, and Toyota official portal. Both sources must be checked for comprehensive verification. Complete step-by-step process.

6. What is title washing and how does it work?
   Answer: Title washing is the practice of moving a branded vehicle (salvage, flood) to states with weaker disclosure laws, receiving a clean title, then selling in CA. NMVTIS tracks brands across states. Complete explanation.

7. How can I detect VIN cloning?
   Answer: Verify VIN at dashboard, door jamb, and firewall. Check for tampering signs (mismatched rivets, adhesive residue). NMVTIS may show duplicate VINs in different locations. Complete detection process.

8. What is odometer rollback and how is it detected?
   Answer: CAN-Bus manipulation to reduce displayed mileage. Detection: Physical wear inspection (seat, pedals, steering), mileage chain verification, ECU scanning for true mileage. Complete detection methods.

9. How do I check for liens on a vehicle in California?
   Answer: CA DMV lienholder search, verify no financial encumbrances before purchase. Liens prevent title transfer until cleared. Complete verification process.

10. What is Revived Salvage and what is the California process?
    Answer: California process for rebuilding salvage vehicles: CHP inspection, brake & lamp inspection, smog check, REG-343 form, DMV approval. Permanent "Revived Salvage" brand. Complete process explanation.

11. How much does a VIN check cost for a ${year} ${make} ${model}?
    Answer: Commercial reports range from $25-$50. NMVTIS direct access through authorized providers. Some basic checks available for free through NHTSA recalls. Complete cost breakdown.

12. Can I check a ${year} ${model} VIN for free?
    Answer: Partial free checks available: NHTSA recalls, some basic NICB data. Full comprehensive reports require paid service. Complete explanation of free vs paid options.

Format: Q1, Q2, etc. with complete, detailed answers. Each answer must be at least 2-3 sentences. NO truncated answers.

${referenceText}`,
      
      recalls_tsbs: `${basePrompt}Write a Recalls & Technical Service Bulletins (TSBs) section for ${year} ${make} ${model}.

REQUIRED CONTENT - COMPLETE ALL SECTIONS:
1. How to Check for Recalls:
   - NHTSA website (nhtsa.gov/recalls): Enter full 17-character VIN, receive complete list of unrepaired safety recalls
   - Toyota official portal (toyota.com/owners): VIN lookup for manufacturer-specific campaigns
   - Dual-verification process: Why check both sources, what each provides
   - Complete step-by-step process

2. Major Recall Campaigns for ${year} ${model}:
   - Fuel Pump Failure (Recall 20V-012): Denso low-pressure fuel pump, impeller deformation, engine stall risk - complete explanation
   - Brake Vacuum Pump Leak (Recall 18V-888): Check valve assembly leak, oil contamination, reduced brake booster performance - complete explanation
   - Pre-Collision System (PCS) and Dynamic Radar Cruise Control (DRCC) Calibration: Multiple campaigns, calibration updates - complete explanation
   - A/C Evaporator Leak (TSB): Non-safety issue, diagnostic and repair procedures - complete explanation
   - Each recall must have: Campaign number, affected components, symptoms, risk, remedy

3. What TSBs Are and How They Differ from Recalls:
   - TSBs: Diagnostic and repair procedures for non-safety-related issues, issued to dealership service departments
   - Recalls: Mandatory, safety-critical, no-cost repairs, NHTSA-sanctioned
   - Key differences: Mandatory vs optional, safety vs non-safety, cost coverage
   - Complete explanation

4. How to Verify All Recall Repairs Completed:
   - Authorized dealership requirement: All recall repairs must be performed at authorized dealership
   - Documentation: Proof of completion, repair orders, service records
   - Verification process: Check service history, contact dealership, verify with manufacturer
   - Complete verification steps

5. Safety and Compliance Importance:
   - Why recalls matter: Safety defects, crash risk, legal compliance
   - Consequences of unrepaired recalls: Safety risk, potential liability, resale value impact
   - Complete explanation

CRITICAL: Complete ALL sections fully. NO truncated text like "Upon a VIN" or incomplete explanations. Every recall must be fully described.

${referenceText}`,

      internal_links: `${basePrompt}Write an internal links section with a list of related VIN check guides.

REQUIRED FORMAT:
- List format with actual internal links (use markdown links: [text](/path/))
- Include at least 5-7 related guides:
  * /vin/${make.toLowerCase()}/ (${make} VIN Decoder)
  * /vin/${make.toLowerCase()}/${model.toLowerCase()}/ (${make} ${model} VIN Check)
  * /${stateSlug}/title-check/ (${stateLabel} Title Check Guide)
  * /${stateSlug}/smog-check/ (${stateLabel} Smog Check Requirements)
  * /nmvtis/overview/ (NMVTIS Overview)
  * /${make.toLowerCase()}/factory-specs/ (${make} Factory Specifications)

Each link should have a brief description (1 sentence).

${referenceText}`,

      cta: `${basePrompt}Write a CTA (call-to-action) section using the CANONICAL format.

CANONICAL CTA FORMAT (MUST USE):
**Check this ${year} ${make} ${model} VIN now.**

Get the NMVTIS title chain, odometer history, accident indicators, registration patterns, and federal recall status in a single report.

You may expand on the value proposition, but MUST start with "Check this ${year} ${make} ${model} VIN now."

${referenceText}`
    };

    // MONSTER 7.x: Добавляем напоминание о маркере в КОНЕЦ промпта
    const endMarkerReminder = `

🚨🚨🚨 FINAL REMINDER - YOU MUST INCLUDE THIS AT THE END 🚨🚨🚨

Before you finish writing, remember:
You MUST end your response with exactly this marker on a new line:
[[END_BLOCK:${blockType}]]

After the marker, there must be NO additional text, spaces, or content.

Your response format MUST be:
[Your complete block content here...]

[[END_BLOCK:${blockType}]]

This marker is MANDATORY. Your response will be REJECTED without it.

🚨🚨🚨 CRITICAL: SENTENCE COMPLETION RULES 🚨🚨🚨
BEFORE you write the final sentence, READ IT ALOUD in your mind:
- Does it end with proper punctuation (. ! ?)? YES/NO
- Does it contain a verb? YES/NO  
- Does it end with forbidden words (to, for, with, from, including, like, such as, indicating, suggesting, because, due to, involving, engine, system, vehicle, data, information, report, check, verification)? YES/NO

If ANY answer is NO, you MUST rewrite the final sentence to be complete.

FORBIDDEN ENDINGS (DO NOT END WITH THESE):
❌ "Position 9 is."
❌ "common to obtain accurate vehicle history information."
❌ "including records from the New Hampshire DMV."
❌ "for the model, year, and region."

CORRECT ENDINGS (END LIKE THESE):
✅ "Position 9 is a calculated check digit used to validate the VIN's mathematical integrity."
✅ "common to Missouri, which can help identify potential undisclosed damage or fraud patterns."
✅ "including records from the New Hampshire DMV, insurance databases, and national theft registries."
✅ "for the model, year, and region may indicate hidden damage or title issues."

🚨🚨🚨 END OF FINAL REMINDER 🚨🚨🚨
`;

    // ANTI-DUPLICATE: Объединяем все части промпта с boost данными
    // MONSTER 7.x: Объединяем все компоненты промпта
    const finalPrompt = (blockPrompts[blockType] || basePrompt) + stateBoostText + vinSpecsText + blockVariantText + antishablonText + trizText + modelBoostText + referenceText + endMarkerReminder;
    return finalPrompt;
  }

  /**
   * MONSTER 7.x: Объединение блоков в статью с фильтрацией невалидных
   */
  assembleArticle(blocks, context) {
    const { make, model, year, stateLabel } = context;
    
    // MONSTER 7.x: TRIZ ИСПРАВЛЕНИЕ - Включаем все блоки с контентом для post-processor'а
    // Post-processor должен исправлять проблемы, а не исключать блоки
    const validBlocks = blocks.filter(b => {
      if (!b.content || !b.content.trim()) return false;
      // Включаем все блоки с контентом (даже с FAILED_VALIDATION)
      // Post-processor исправит проблемы
      return true;
    });
    
    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: После pre-validation некоторые блоки могли быть исправлены
    // Проверяем блоки, которые все еще имеют проблемы
    const failedBlocks = blocks.filter(b => 
      b.status === 'FAILED_VALIDATION' || 
      (b.needsPostProcessing && b.status !== 'VALID')
    );
    
    if (failedBlocks.length > 0) {
      log('ARTICLE-GEN-V6', `⚠️  ${failedBlocks.length} blocks still need post-processing:`);
      failedBlocks.forEach(b => {
        const errors = b.errors || b.validationErrors || ['Unknown error'];
        log('ARTICLE-GEN-V6', `  - ${b.type} (status: ${b.status || 'none'}): ${errors.join(', ')}`);
        // Помечаем блоки для post-processor'а
        b.needsPostProcessing = true;
        b.validationErrors = errors;
      });
    } else {
      log('ARTICLE-GEN-V6', `✅ All blocks passed pre-validation or were repaired`);
    }
    
    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Удаляем маркеры из каждого блока ПЕРЕД объединением
    // Иначе trimEndMarkers в post-processor удалит весь контент после первого маркера
    const content = validBlocks
      .map(b => {
        // Добавляем заголовок для каждого блока
        const heading = this.getBlockHeading(b.type, context);
        // Удаляем маркер окончания из содержимого блока
        let blockContent = b.content || '';
        const endMarker = `[[END_BLOCK:${b.type}]]`;
        const markerIndex = blockContent.indexOf(endMarker);
        if (markerIndex !== -1) {
          // Удаляем маркер и все после него
          blockContent = blockContent.substring(0, markerIndex).trim();
        }
        
        // ИСПРАВЛЕНИЕ: Удаляем существующие заголовки из блока (чтобы избежать дубликатов)
        // Удаляем заголовки H1, H2, H3 в начале блока
        blockContent = blockContent.replace(/^#+\s+.*$/gm, '').trim();
        // Удаляем множественные пустые строки
        blockContent = blockContent.replace(/\n{3,}/g, '\n\n');
        
        // ИСПРАВЛЕНИЕ: Для hero блока не добавляем заголовок (он уже есть в H1)
        if (b.type === 'hero') {
          return blockContent;
        }
        
        return `${heading}\n\n${blockContent}`;
      })
      .join('\n\n');

    const wordCount = this.countWords(content);
    
    // Правильно формируем blocksDetail с реальными данными
    const blocksDetail = {};
    validBlocks.forEach(b => {
      blocksDetail[b.type] = {
        provider: b.provider,
        wordCount: b.wordCount
        // Убрано дублирование: words === wordCount
      };
    });
    
    return {
      title: `VIN Check Guide for ${year} ${make} ${model} in ${stateLabel}`,
      h1: `Complete VIN Check Guide: ${year} ${make} ${model}`,
      content: content,
      wordCount: wordCount,
      blocks: validBlocks.length,
      blocksDetail: blocksDetail,
      timestamp: new Date().toISOString(),
      // MONSTER 7.x: Метаданные о валидации
      validationStats: {
        totalBlocks: blocks.length,
        validBlocks: validBlocks.length,
        failedBlocks: failedBlocks.length,
        // TRIZ: Обратная связь - отслеживаем блоки с автоматически добавленными маркерами (все блоки, не только валидные)
        autoAddedMarkers: blocks.filter(b => b.autoAddedMarker === true).length,
        autoFixedEndings: blocks.filter(b => b.autoFixedEnding === true).length
      }
    };
  }

  /**
   * УЛУЧШЕНИЕ: Расчет статистики производительности
   */
  calculatePerformanceStats(blocks, totalTime) {
    const metrics = blocks
      .filter(b => b.performanceMetrics)
      .map(b => b.performanceMetrics);
    
    if (metrics.length === 0) {
      return {
        totalTime: totalTime,
        averageBlockTime: 0,
        totalRetries: 0,
        cacheHitRate: 0,
        providerStats: {}
      };
    }
    
    const totalBlockTime = metrics.reduce((sum, m) => sum + (m.generationTime || 0), 0);
    const totalRetries = metrics.reduce((sum, m) => sum + (m.retryCount || 0), 0);
    const cacheHits = metrics.filter(m => m.cacheHit === true).length;
    
    // Статистика по провайдерам
    const providerStats = {};
    metrics.forEach(m => {
      const provider = m.providerUsed || 'unknown';
      if (!providerStats[provider]) {
        providerStats[provider] = {
          count: 0,
          totalTime: 0,
          averageTime: 0,
          retries: 0,
          cacheHits: 0
        };
      }
      providerStats[provider].count++;
      providerStats[provider].totalTime += m.generationTime || 0;
      providerStats[provider].retries += m.retryCount || 0;
      if (m.cacheHit) providerStats[provider].cacheHits++;
    });
    
    Object.keys(providerStats).forEach(provider => {
      const stats = providerStats[provider];
      stats.averageTime = stats.count > 0 ? stats.totalTime / stats.count : 0;
    });
    
    return {
      totalTime: totalTime,
      averageBlockTime: metrics.length > 0 ? totalBlockTime / metrics.length : 0,
      totalRetries: totalRetries,
      cacheHitRate: metrics.length > 0 ? cacheHits / metrics.length : 0,
      providerStats: providerStats
    };
  }

  /**
   * Заголовок для блока
   */
  getBlockHeading(blockType, context) {
    const { make, model, year, stateLabel } = context;
    
    const headings = {
      hero: `# Complete VIN Check Guide: ${year} ${make} ${model}`,
      key_facts: `## Key Facts`,
      vin_decoder: `## VIN Decoder for ${year} ${make} ${model}`,
      nmvtis: `## NMVTIS: National Motor Vehicle Title Information System`,
      deep_explanation: `## What a VIN Reveals in ${stateLabel}`,
      state_specific: `## ${stateLabel}-Specific Insights`,
      accident_intelligence: `## Accident Intelligence`,
      fraud_patterns: `## Fraud Patterns`,
      market_value: `## Market Value`,
      insurance_risk: `## Insurance Risk`,
      recalls_tsbs: `## Recalls & Technical Service Bulletins`,
      buyer_guide: `## Buyer Guide`,
      faq: `## Frequently Asked Questions`,
      internal_links: `## Related VIN Check Guides`,
      cta: `## Check Your VIN Now`
    };

    return headings[blockType] || `## ${blockType}`;
  }

  /**
   * System prompt для блока
   * ANTI-DUPLICATE: Использует стилистические варианты для разнообразия
   */
  getSystemPrompt(blockType, context = {}) {
    // ANTI-DUPLICATE: Получаем стилистический вариант из контекста
    const variationContext = context.variationContext || {};
    const styleVariant = variationContext.styleVariant || this.variationEngine.getRandomStyleVariant();
    
    const basePrompts = {
      hero: 'You are an expert SEO writer. Write a concise, authoritative hero section.',
      key_facts: 'You are an expert SEO writer. Write clear, scannable key facts.',
      vin_decoder: 'You are a technical expert. Write accurate VIN decoder explanations with correct WMI/VDS/VIS breakdowns.',
      nmvtis: 'You are a data systems expert. Explain NMVTIS clearly.',
      deep_explanation: 'You are an engineering expert. Write practical, actionable technical explanations without pseudo-engineering jargon.',
      state_specific: 'You are a state regulations expert. Write accurate state-specific insights without contradictions.',
      accident_intelligence: 'You are a collision analysis expert. Write data-driven accident intelligence.',
      fraud_patterns: 'You are an antifraud expert. Write detailed fraud pattern analysis.',
      market_value: 'You are a market analyst. Write financial intelligence with tables where appropriate.',
      insurance_risk: 'You are an insurance risk analyst. Write risk assessment.',
      recalls_tsbs: 'You are a vehicle safety expert. Write comprehensive recalls and TSBs information.',
      buyer_guide: 'You are a buyer advisor. Write step-by-step actionable checklists.',
      faq: 'You are a helpful expert. Write complete, accurate FAQ answers without contradictions.',
      internal_links: 'You are a content strategist. Suggest relevant internal links.',
      cta: 'You are a conversion expert. Write compelling CTAs.'
    };
    
    const basePrompt = basePrompts[blockType] || 'You are an expert SEO content writer.';
    
    // ANTI-DUPLICATE: Добавляем стилистические инструкции
    if (styleVariant && styleVariant.description) {
      return `${basePrompt} Writing style: ${styleVariant.description}. ${styleVariant.characteristics?.join('. ') || ''}`;
    }
    
    return basePrompt;
  }

  /**
   * Подсчет слов (делегируется в ArticleQualityUtils)
   */
  countWords(text) {
    return ArticleQualityUtils.countWords(text);
  }
}

module.exports = { ArticleGeneratorV6 };

