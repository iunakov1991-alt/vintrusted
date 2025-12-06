#!/usr/bin/env node

/**
 * MONSTER 7.x — ANTI-DUPLICATE SEO ENGINE
 * Полная система вариаций для избежания near-duplicate контента на миллионах страниц
 * 
 * Реализует:
 *  - 40+ структурных схем
 *  - 6 стилевых режимов
 *  - Систему глубины блоков (S/M/L)
 *  - VIN specs базу данных
 *  - State-specific intelligence
 *  - Анти-шаблонные промпты
 *  - TRIZ-анти-обрывы
 *  - Рекомбинацию форматов блоков
 */

const fs = require('fs');
const path = require('path');
const { log, error } = require('../logger');

class ArticleVariationEngine {
  constructor(config) {
    this.config = config;
    
    // Загружаем шаблоны из файлов
    this.loadTemplates();
    
    // Лексические варианты (синонимные панели)
    this.lexicalVariants = this.initializeLexicalVariants();
    
    // Model/year-specific boost данные (расширяем из файлов)
    this.modelBoosts = this.initializeModelBoosts();
  }

  /**
   * MONSTER 7.x: Загрузка всех шаблонов из файлов
   */
  loadTemplates() {
    const templatesDir = path.join(process.cwd(), 'data', 'seo', 'templates');
    
    try {
      // 1. Структурные схемы (40+ вариантов)
      const structurePath = path.join(templatesDir, 'structure_schemes.json');
      if (fs.existsSync(structurePath)) {
        const schemes = JSON.parse(fs.readFileSync(structurePath, 'utf8'));
        this.structuralSchemes = schemes;
        log('VARIATION-ENGINE', `Loaded ${schemes.length} structural schemes`);
      } else {
        this.structuralSchemes = this.initializeStructuralVariants(); // Fallback
      }

      // 2. Стилевые режимы (6 режимов)
      const stylePath = path.join(templatesDir, 'style_modes.json');
      if (fs.existsSync(stylePath)) {
        const styles = JSON.parse(fs.readFileSync(stylePath, 'utf8'));
        this.styleVariants = styles.modes;
        log('VARIATION-ENGINE', `Loaded ${Object.keys(styles.modes).length} style modes`);
      } else {
        this.styleVariants = this.initializeStyleVariants(); // Fallback
      }

      // 3. Глубина блоков (S/M/L)
      const depthPath = path.join(templatesDir, 'block_depth.json');
      if (fs.existsSync(depthPath)) {
        this.blockDepths = JSON.parse(fs.readFileSync(depthPath, 'utf8'));
        log('VARIATION-ENGINE', 'Loaded block depth configurations');
      } else {
        this.blockDepths = {};
      }

      // 4. VIN specs база данных
      const vinSpecsPath = path.join(templatesDir, 'vin_specs.json');
      if (fs.existsSync(vinSpecsPath)) {
        this.vinSpecs = JSON.parse(fs.readFileSync(vinSpecsPath, 'utf8'));
        log('VARIATION-ENGINE', `Loaded VIN specs for ${Object.keys(this.vinSpecs).length} models`);
      } else {
        this.vinSpecs = {};
      }

      // 5. State risks и intelligence
      const stateRisksPath = path.join(templatesDir, 'state_risks.json');
      if (fs.existsSync(stateRisksPath)) {
        const stateData = JSON.parse(fs.readFileSync(stateRisksPath, 'utf8'));
        this.stateBoosts = this.convertStateRisksToBoosts(stateData);
        log('VARIATION-ENGINE', `Loaded state risks for ${Object.keys(stateData).length} states`);
      } else {
        this.stateBoosts = this.initializeStateBoosts(); // Fallback
      }

      // 6. Варианты форматов блоков
      const blockVariantsPath = path.join(templatesDir, 'block_variants.json');
      if (fs.existsSync(blockVariantsPath)) {
        this.blockVariants = JSON.parse(fs.readFileSync(blockVariantsPath, 'utf8'));
        log('VARIATION-ENGINE', `Loaded block variants for ${Object.keys(this.blockVariants).length} block types`);
      } else {
        this.blockVariants = {};
      }

      // 7. Анти-шаблонные промпты
      const antishablonPath = path.join(templatesDir, 'antishablon_prompt.txt');
      if (fs.existsSync(antishablonPath)) {
        this.antishablonPrompt = fs.readFileSync(antishablonPath, 'utf8');
      } else {
        this.antishablonPrompt = '';
      }

      // 8. TRIZ-анти-обрывы промпты
      const trizPath = path.join(templatesDir, 'triz_anti_cutoff.txt');
      if (fs.existsSync(trizPath)) {
        this.trizAntiCutoffPrompt = fs.readFileSync(trizPath, 'utf8');
      } else {
        this.trizAntiCutoffPrompt = '';
      }

    } catch (e) {
      error('VARIATION-ENGINE', `Error loading templates: ${e.message}`);
      // Fallback к старым методам
      this.structuralSchemes = this.initializeStructuralVariants();
      this.styleVariants = this.initializeStyleVariants();
      this.stateBoosts = this.initializeStateBoosts();
      this.blockDepths = {};
      this.vinSpecs = {};
      this.blockVariants = {};
      this.antishablonPrompt = '';
      this.trizAntiCutoffPrompt = '';
    }
  }

  /**
   * Конвертация state risks в формат stateBoosts
   */
  convertStateRisksToBoosts(stateRisks) {
    const boosts = {};
    Object.entries(stateRisks).forEach(([state, data]) => {
      const stateKey = state.toLowerCase();
      boosts[stateKey] = {
        uniqueRules: data.laws || [],
        specificPractices: data.specific_practices || [],
        fraudPatterns: data.fraud_patterns || [],
        risks: data.risks || []
      };
    });
    return boosts;
  }

  /**
   * Инициализация структурных вариантов
   * 5-6 разных порядков блоков для избежания одинаковой структуры
   */
  initializeStructuralVariants() {
    const baseBlocks = [
      'hero', 'key_facts', 'vin_decoder', 'nmvtis', 'deep_explanation',
      'state_specific', 'accident_intelligence', 'fraud_patterns',
      'market_value', 'insurance_risk', 'buyer_guide', 'recalls_tsbs',
      'faq', 'internal_links', 'cta'
    ];

    return {
      A: [
        'hero', 'key_facts', 'vin_decoder', 'nmvtis', 'state_specific',
        'accident_intelligence', 'fraud_patterns', 'market_value',
        'insurance_risk', 'buyer_guide', 'recalls_tsbs', 'faq',
        'internal_links', 'cta'
      ],
      B: [
        'hero', 'vin_decoder', 'accident_intelligence', 'fraud_patterns',
        'state_specific', 'nmvtis', 'deep_explanation', 'market_value',
        'insurance_risk', 'buyer_guide', 'key_facts', 'recalls_tsbs',
        'faq', 'internal_links', 'cta'
      ],
      C: [
        'hero', 'state_specific', 'vin_decoder', 'accident_intelligence',
        'buyer_guide', 'fraud_patterns', 'nmvtis', 'deep_explanation',
        'market_value', 'insurance_risk', 'key_facts', 'recalls_tsbs',
        'faq', 'internal_links', 'cta'
      ],
      D: [
        'hero', 'deep_explanation', 'vin_decoder', 'state_specific',
        'accident_intelligence', 'nmvtis', 'fraud_patterns', 'market_value',
        'insurance_risk', 'buyer_guide', 'key_facts', 'recalls_tsbs',
        'faq', 'internal_links', 'cta'
      ],
      E: [
        'hero', 'key_facts', 'state_specific', 'vin_decoder', 'nmvtis',
        'fraud_patterns', 'accident_intelligence', 'market_value',
        'insurance_risk', 'buyer_guide', 'recalls_tsbs', 'deep_explanation',
        'faq', 'internal_links', 'cta'
      ]
    };
  }

  /**
   * Инициализация лексических вариантов
   * Синонимные панели для 60-80 ключевых фраз
   */
  initializeLexicalVariants() {
    return {
      'legal and technical audit': [
        'regulatory and mechanical assessment',
        'state-level forensic evaluation',
        'documentary verification block',
        'compliance and engineering review'
      ],
      'VIN fingerprint': [
        'manufacturing identity code',
        'vehicle identity signature',
        'factory-assigned identifier',
        'production authentication marker'
      ],
      'complete history and condition': [
        'full operational and legal record',
        'comprehensive vehicle documentation',
        'entire ownership and maintenance timeline',
        'complete provenance and status profile'
      ],
      'cross-references': [
        'correlates',
        'validates against',
        'verifies through',
        'confirms via'
      ],
      'critical data': [
        'essential information',
        'vital records',
        'key documentation',
        'fundamental evidence'
      ],
      'fraud prevention': [
        'anti-fraud verification',
        'deception detection',
        'scam prevention',
        'fraudulent activity screening'
      ],
      'title status': [
        'ownership documentation',
        'legal title record',
        'registration documentation',
        'ownership verification'
      ],
      'odometer reading': [
        'mileage record',
        'distance traveled',
        'vehicle mileage',
        'odometer value'
      ],
      'accident history': [
        'collision records',
        'incident documentation',
        'crash history',
        'damage events'
      ],
      'service records': [
        'maintenance documentation',
        'repair history',
        'service history',
        'maintenance logs'
      ]
    };
  }

  /**
   * Инициализация стилистических вариантов
   * 4 разных стиля подачи материала
   */
  initializeStyleVariants() {
    return {
      A: {
        name: 'legal-technical',
        description: 'Юридико-техничный стиль',
        characteristics: [
          'Emphasizes legal compliance and regulatory frameworks',
          'Uses formal terminology and statutory references',
          'Focuses on documentation and verification processes'
        ],
        openingPhrases: [
          'A comprehensive legal and technical audit',
          'From a regulatory compliance perspective',
          'Under state and federal vehicle regulations'
        ]
      },
      B: {
        name: 'mechanical-engineering',
        description: 'Механико-инженерный стиль',
        characteristics: [
          'Emphasizes mechanical integrity and engineering analysis',
          'Uses technical specifications and diagnostic terminology',
          'Focuses on structural and mechanical assessment'
        ],
        openingPhrases: [
          'An engineering-grade analysis',
          'From a mechanical integrity standpoint',
          'Technical evaluation reveals'
        ]
      },
      C: {
        name: 'consumer-practical',
        description: 'Потребительский/практичный стиль',
        characteristics: [
          'Emphasizes practical advice and actionable steps',
          'Uses accessible language and real-world scenarios',
          'Focuses on buyer protection and decision-making'
        ],
        openingPhrases: [
          'When purchasing a used vehicle',
          'For buyers seeking transparency',
          'Practical considerations include'
        ]
      },
      D: {
        name: 'insurance-analytical',
        description: 'Страховой аналитический стиль',
        characteristics: [
          'Emphasizes risk assessment and actuarial factors',
          'Uses insurance terminology and risk metrics',
          'Focuses on loss history and premium implications'
        ],
        openingPhrases: [
          'From an insurance risk perspective',
          'Actuarial analysis indicates',
          'Risk assessment reveals'
        ]
      }
    };
  }

  /**
   * Инициализация state-specific boost данных
   */
  initializeStateBoosts() {
    return {
      california: {
        uniqueRules: [
          'BAR Smog Check Program (Health and Safety Code §44011)',
          'CHP vehicle verification requirements',
          'Lemon Law (Song-Beverly Consumer Warranty Act)',
          'Mandatory insurance reporting (Vehicle Code §16058)'
        ],
        specificPractices: [
          'Biennial smog testing',
          'Enhanced emission history tracking',
          'Salvage to Rebuilt conversion process',
          'Electronic lien and title (ELT) system'
        ],
        fraudPatterns: [
          'Title washing across jurisdictions',
          'Odometer rollback on high-mileage models',
          'Undisclosed flood damage from coastal areas'
        ]
      },
      texas: {
        uniqueRules: [
          'TxDMV title verification',
          'Storm and flood risk assessment',
          'Salvage title loopholes',
          'Rebuilt vehicle inspection requirements'
        ],
        specificPractices: [
          'Annual vehicle inspection',
          'Flood damage documentation',
          'Hail damage reporting',
          'Title brand verification'
        ],
        fraudPatterns: [
          'Flood damage concealment',
          'Hail damage misrepresentation',
          'Title washing from other states'
        ]
      },
      florida: {
        uniqueRules: [
          'Hurricane flood risk assessment',
          'Electronic lien system',
          'Rebuilt vehicle pitfalls',
          'Salvage title regulations'
        ],
        specificPractices: [
          'Flood damage inspection',
          'Hurricane-related damage tracking',
          'Electronic title system',
          'Rebuilt vehicle verification'
        ],
        fraudPatterns: [
          'Hurricane flood damage concealment',
          'Electronic lien fraud',
          'Rebuilt vehicle misrepresentation'
        ]
      }
    };
  }

  /**
   * Инициализация model/year-specific boost данных
   */
  initializeModelBoosts() {
    return {
      '2018': {
        'Toyota': {
          'Camry': {
            tsbs: [
              'A25A-FKS engine oil dilution issues',
              'V6 ignition coil recall',
              'Transmission shift quality improvements'
            ],
            recalls: [
              'Fuel pump recall (certain VIN ranges)',
              'Brake system recall (specific production dates)'
            ],
            commonIssues: [
              'AC evaporator leaks',
              'Power window regulator failures',
              'Infotainment system glitches'
            ]
          }
        }
      },
      '2019': {
        'Toyota': {
          'Camry': {
            tsbs: [
              'AC evaporator leak TSB',
              'Lane Tracing Assist calibration notes',
              'Hybrid battery cooling system updates'
            ],
            recalls: [
              'Fuel pump recall (expanded VIN range)',
              'Brake booster recall'
            ],
            commonIssues: [
              'AC system performance',
              'Lane assist calibration',
              'Hybrid system efficiency'
            ]
          }
        }
      }
    };
  }

  /**
   * MONSTER 7.x: Получить случайную структурную схему из 40+ вариантов
   */
  getRandomStructuralVariant() {
    if (this.structuralSchemes && Array.isArray(this.structuralSchemes) && this.structuralSchemes.length > 0) {
      const randomIndex = Math.floor(Math.random() * this.structuralSchemes.length);
      const scheme = this.structuralSchemes[randomIndex];
      return {
        variant: scheme.name,
        blockOrder: scheme.sequence,
        schemeName: scheme.name
      };
    }
    
    // Fallback к старым вариантам
    const variants = Object.keys(this.structuralVariants || {});
    if (variants.length > 0) {
    const randomKey = variants[Math.floor(Math.random() * variants.length)];
    return {
      variant: randomKey,
      blockOrder: this.structuralVariants[randomKey]
      };
    }
    
    // Последний fallback
    return {
      variant: 'default',
      blockOrder: ['hero', 'key_facts', 'vin_decoder', 'nmvtis', 'state_specific', 'accident_intelligence', 'fraud_patterns', 'market_value', 'insurance_risk', 'buyer_guide', 'recalls_tsbs', 'faq', 'internal_links', 'cta']
    };
  }

  /**
   * MONSTER 7.x: Получить случайный стилевой режим из 6 вариантов
   */
  getRandomStyleVariant() {
    if (this.styleVariants && Object.keys(this.styleVariants).length > 0) {
      const styleKeys = Object.keys(this.styleVariants);
      const randomKey = styleKeys[Math.floor(Math.random() * styleKeys.length)];
      return this.styleVariants[randomKey];
    }
    
    // Fallback
    const styles = Object.keys(this.styleVariants || {});
    if (styles.length > 0) {
    const randomKey = styles[Math.floor(Math.random() * styles.length)];
    return this.styleVariants[randomKey];
    }
    
    return { name: 'default', tone: 'balanced' };
  }

  /**
   * Применить лексические варианты к тексту
   */
  applyLexicalVariants(text) {
    let modifiedText = text;
    
    Object.entries(this.lexicalVariants).forEach(([original, variants]) => {
      // Случайно выбираем, применять ли замену (30% вероятность)
      if (Math.random() < 0.3 && variants.length > 0) {
        const replacement = variants[Math.floor(Math.random() * variants.length)];
        const regex = new RegExp(original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        modifiedText = modifiedText.replace(regex, replacement);
      }
    });
    
    return modifiedText;
  }

  /**
   * Получить state-specific boost контент
   */
  getStateBoost(stateSlug) {
    const stateKey = stateSlug.toLowerCase();
    return this.stateBoosts[stateKey] || null;
  }

  /**
   * Получить model/year-specific boost контент
   */
  getModelBoost(year, make, model) {
    const yearData = this.modelBoosts[year];
    if (!yearData) return null;
    
    const makeData = yearData[make];
    if (!makeData) return null;
    
    return makeData[model] || null;
  }

  /**
   * MONSTER 7.x: Генерация случайной глубины для секций (S/M/L система)
   */
  getRandomizedDepth(sectionType) {
    if (this.blockDepths && this.blockDepths[sectionType]) {
      const depths = this.blockDepths[sectionType];
      // Случайно выбираем уровень глубины: S (30%), M (50%), L (20%)
      const roll = Math.random();
      let level;
      if (roll < 0.3) {
        level = 'S';
      } else if (roll < 0.8) {
        level = 'M';
      } else {
        level = 'L';
      }
      
      const targetWords = depths[level];
      if (targetWords) {
        // Добавляем небольшой разброс ±10%
        const variance = Math.floor(targetWords * 0.1);
        return targetWords + Math.floor(Math.random() * variance * 2) - variance;
      }
    }

    // Fallback к старым диапазонам
    const depthRanges = {
      vin_decoder: { min: 150, max: 350 },
      nmvtis: { min: 120, max: 280 },
      fraud_patterns: { min: 150, max: 260 },
      accident_intelligence: { min: 150, max: 260 },
      state_specific: { min: 160, max: 300 },
      deep_explanation: { min: 200, max: 400 },
      market_value: { min: 180, max: 280 },
      insurance_risk: { min: 180, max: 280 }
    };

    const range = depthRanges[sectionType] || { min: 200, max: 300 };
    return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
  }

  /**
   * MONSTER 7.x: Получить VIN specs для конкретной модели
   */
  getVINSpecs(year, make, model) {
    const key = `${make} ${model} ${year}`;
    return this.vinSpecs[key] || null;
  }

  /**
   * MONSTER 7.x: Получить случайный вариант формата для блока
   */
  getBlockVariant(blockType) {
    if (this.blockVariants && this.blockVariants[blockType]) {
      const variants = this.blockVariants[blockType].variants || [];
      if (variants.length > 0) {
        const randomIndex = Math.floor(Math.random() * variants.length);
        const variantName = variants[randomIndex];
        const description = this.blockVariants[blockType].descriptions?.[variantName] || '';
        return {
          variant: variantName,
          description: description
        };
      }
    }
    return null;
  }

  /**
   * MONSTER 7.x: Получить анти-шаблонный промпт
   */
  getAntishablonPrompt() {
    return this.antishablonPrompt || '';
  }

  /**
   * MONSTER 7.x: Получить TRIZ-анти-обрывы промпт
   */
  getTrizAntiCutoffPrompt() {
    return this.trizAntiCutoffPrompt || '';
  }

  /**
   * MONSTER 7.x: Получить расширенный state boost с рисками
   */
  getStateBoost(stateSlug) {
    const stateKey = stateSlug.toLowerCase();
    const boost = this.stateBoosts[stateKey];
    
    if (boost && boost.risks) {
      // Возвращаем случайные 2-4 риска для включения в контент
      const selectedRisks = [];
      const risksToSelect = Math.min(2 + Math.floor(Math.random() * 3), boost.risks.length);
      const shuffled = [...boost.risks].sort(() => Math.random() - 0.5);
      selectedRisks.push(...shuffled.slice(0, risksToSelect));
      
      return {
        ...boost,
        selectedRisks: selectedRisks
      };
    }
    
    return boost || null;
  }

  /**
   * Получить случайный opening phrase для стиля
   */
  getStyleOpeningPhrase(styleVariant) {
    const phrases = styleVariant.openingPhrases || [];
    if (phrases.length === 0) return null;
    return phrases[Math.floor(Math.random() * phrases.length)];
  }
}

module.exports = { ArticleVariationEngine };

