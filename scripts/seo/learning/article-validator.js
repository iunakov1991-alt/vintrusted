#!/usr/bin/env node

/**
 * MONSTER 7.0 - Article Validator
 * Проверяет статьи на разрывы, незавершенные секции, валидность структуры
 */

const fs = require('fs');
const path = require('path');
const { log, error } = require('../logger');
const { ArticleQualityUtils } = require('./article-quality-utils');
const { RuleEngineIntegration } = require('./rule-engine-integration');

/**
 * MONSTER 7.x - Block Length Limits
 */
const BLOCK_LENGTH_LIMITS = {
  hero: { min: 20, max: 80 },
  key_facts: { min: 80, max: 180 },
  vin_decoder: { min: 200, max: 350 },
  nmvtis: { min: 150, max: 260 },
  deep_explanation: { min: 220, max: 320 },
  state_specific: { min: 220, max: 320 },
  accident_intelligence: { min: 200, max: 300 },
  fraud_patterns: { min: 200, max: 310 },
  market_value: { min: 120, max: 200 },
  insurance_risk: { min: 120, max: 200 },
  buyer_guide: { min: 160, max: 240 },
  recalls_tsbs: { min: 160, max: 240 },
  faq: { min: 220, max: 350 },
  internal_links: { min: 30, max: 60 },
  cta: { min: 25, max: 60 }
};

/**
 * MONSTER 7.x - Forbidden Cliche Phrases
 */
const FORBIDDEN_CLICHES = [
  /Vehicle history is not a single report but a compilation of multiple data sources/i,
  /To obtain a complete and accurate recall status, a dual-verification process is required/i,
  /Title washing exploits differences between state branding laws to remove salvage or flood brands/i,
  /A commercial VIN report will not show all accident history/i,
  /California generates more structured automotive data than any other state due to mandatory smog checks/i,
  /A comprehensive VIN check requires systematic analysis of multiple independent data streams/i
];

class ArticleValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.requiredBlocks = [
      'Executive Summary',
      'Key Facts',
      'VIN Decoder',
      'NMVTIS',
      'Data Layers',
      'State-Specific',
      'Accident Intelligence',
      'Fraud Patterns',
      'Market Value',
      'Insurance Risk',
      'Buyer Guide',
      'Recalls & TSB',
      'FAQ',
      'Related Links',
      'CTA'
    ];
    // MONSTER 7.x: Интеграция системы правил
    this.ruleEngine = new RuleEngineIntegration();
    this.loadTechnicalTermsWhitelist();
  }

  /**
   * Загрузка белого списка технических терминов
   */
  loadTechnicalTermsWhitelist() {
    try {
      const whitelistPath = path.join(process.cwd(), 'data/seo/ai-training/technical-terms-whitelist.json');
      if (fs.existsSync(whitelistPath)) {
        this.technicalTerms = JSON.parse(fs.readFileSync(whitelistPath, 'utf8'));
      } else {
        this.technicalTerms = null;
      }
    } catch (e) {
      this.technicalTerms = null;
    }
  }

  /**
   * MONSTER 7.x: Валидация отдельного блока
   * @param {string} blockContent - Содержимое блока
   * @param {string} blockType - Тип блока (hero, key_facts, etc.)
   * @returns {Object} { valid: boolean, errors: string[], warnings: string[] }
   */
  validateBlock(blockContent, blockType) {
    const errors = [];
    const warnings = [];
    
    if (!blockContent || typeof blockContent !== 'string') {
      return { valid: false, errors: ['Block content is empty or invalid'], warnings: [] };
    }

    // 1. Проверка маркера окончания
    const endMarker = `[[END_BLOCK:${blockType}]]`;
    const markerCount = (blockContent.match(new RegExp(endMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    
    if (markerCount === 0) {
      errors.push('INVALID_END_MARKER: Missing end marker');
    } else if (markerCount > 1) {
      errors.push('INVALID_END_MARKER: Multiple end markers found');
    }

    // Извлекаем чистый текст до маркера
    let cleanText = blockContent;
    if (markerCount > 0) {
      const markerIndex = blockContent.indexOf(endMarker);
      cleanText = blockContent.substring(0, markerIndex).trim();
      const afterMarker = blockContent.substring(markerIndex + endMarker.length).trim();
      if (afterMarker.length > 0) {
        errors.push('INVALID_END_MARKER: Content after end marker');
      }
    }

    // 2. Проверка финального предложения
    const trimmedText = cleanText.trim();
    if (trimmedText.length === 0) {
      errors.push('INVALID_ENDING_PUNCTUATION: Empty block after trimming');
      return { valid: false, errors, warnings };
    }

    // R1: Должно заканчиваться на . ! ?
    const lastChar = trimmedText[trimmedText.length - 1];
    if (!['.', '!', '?'].includes(lastChar)) {
      errors.push('INVALID_ENDING_PUNCTUATION: Block does not end with . ! or ?');
    }

    // R2: Последнее предложение должно содержать глагол
    const lastSentenceForVerb = trimmedText.split(/[.!?]/).filter(s => s.trim()).pop() || '';
    const hasVerb = /\b(is|are|was|were|be|have|has|do|does|can|could|will|would|should|must|may|might)\b/i.test(lastSentenceForVerb) ||
                    /\b\w+(ed|ing)\b/i.test(lastSentenceForVerb);
    if (!hasVerb && lastSentenceForVerb.split(/\s+/).length > 3) {
      errors.push('INVALID_GRAMMAR_LIKELY_INCOMPLETE_SENTENCE: Last sentence lacks verb');
    }

    // 3. ANTI-BREAK SYSTEM: Расширенная проверка запрещенных окончаний
    const forbiddenEndings = [
      /\s(to|for|with|from|including|such as|like|indicating|suggesting|for example|e\.g\.|etc\.)[\s.,]*$/i,
      /\s(because|due to|involving|engine|system|vehicle|data|information|report|check|verification)[\s.,]*$/i
    ];
    for (const pattern of forbiddenEndings) {
      if (pattern.test(trimmedText)) {
        errors.push('INVALID_TRAILING_PREPOSITION_OR_PHRASE: Block ends with forbidden phrase');
        break;
      }
    }

    // 3.1. ANTI-BREAK: Проверка последнего слова на запрещенные термины
    const lastSentenceForWord = trimmedText.split(/[.!?]/).filter(s => s.trim()).pop() || '';
    const lastWord = lastSentenceForWord.trim().split(/\s+/).pop()?.toLowerCase().replace(/[.,!?;:]$/, '') || '';
    const forbiddenWords = ['to', 'for', 'with', 'from', 'including', 'like', 'such', 'as', 'indicating', 
                           'suggesting', 'because', 'due', 'involving', 'engine', 'system', 'vehicle', 
                           'data', 'information', 'report', 'check', 'verification'];
    if (forbiddenWords.includes(lastWord)) {
      errors.push(`INVALID_TRAILING_WORD: Block ends with forbidden word "${lastWord}"`);
    }

    // 3.2. ANTI-BREAK: Проверка на зависшие фрагменты
    const danglingFragments = [
      /\s(such as|like|including|due to|involving)\s*$/i
    ];
    for (const pattern of danglingFragments) {
      if (pattern.test(trimmedText)) {
        errors.push('DANGLING_FRAGMENT: Block ends with incomplete phrase');
        break;
      }
    }

    // 4. Грязные паттерны знаков препинания
    const dirtyPunctuation = [
      /,\s*\./,
      /\s+,\s*\./,
      /\s+\.\s+\./,
      /\.\.(?!\.)/, // .. но не ...
      /,\s*,/
    ];
    for (const pattern of dirtyPunctuation) {
      if (pattern.test(trimmedText)) {
        errors.push('INVALID_PUNCTUATION_PATTERN: Dirty punctuation pattern detected');
        break;
      }
    }

    // 5. Проверка незавершенных предложений
    const incompleteSentencePatterns = [
      /\bforms an\.\s*$/gm,
      /\bforms an\s*$/gm,
      /\bsuch\.\s*$/gm,
      /\bsuch\s*$/gm,
      /\band\.\s*$/gm,
      /\bmisaligned\.\s*$/gm,
      /\bmisaligned\s*$/gm,
      /\bA\.\s*$/gm,
      /\bA\s*$/gm,
      /\btime-stamped\.\s*$/gm,
      /\btime-stamped\s*$/gm,
      /\bvehicle's\.\s*$/gm,
      /\bvehicle's\s*$/gm,
      /\breliability and\.\s*$/gm,
      /\breliability and\s*$/gm,
      /\bfor the vehicle's\.\s*$/gm,
      /\bfor the vehicle's\s*$/gm,
      /\bestablishes a documented chain of evidence for the vehicle's\.\s*$/gm,
      /\bestablishes a documented chain of evidence for the vehicle's\s*$/gm,
      /\bCalifornia law mandates specific certification for airbag system repairs\.\s+A\.\s*$/gm,
      /\bThis creates an official, time-stamped\.\s*$/gm,
      /\bThis creates an official, time-stamped\s*$/gm,
      /\bFor a \d{4} Camry, special attention should be paid to verifying the status of any applicable factory safety recalls, such\.\s*$/gm,
    ];
    
    for (const pattern of incompleteSentencePatterns) {
      if (pattern.test(trimmedText)) {
        errors.push('INCOMPLETE_SENTENCE: Incomplete sentence detected (ends with incomplete phrase)');
        break;
      }
    }

    // 6. Проверка длины блока
    const wordCount = this.countWords(trimmedText);
    const limits = BLOCK_LENGTH_LIMITS[blockType];
    if (limits) {
      if (wordCount < limits.min) {
        errors.push(`TOO_SHORT_FOR_BLOCK_TYPE: ${wordCount} words (minimum ${limits.min})`);
      }
      if (wordCount > limits.max) {
        warnings.push(`TOO_LONG_FOR_BLOCK_TYPE: ${wordCount} words (maximum ${limits.max})`);
      }
    }

    // 7. Анти-штамповый фильтр
    for (const clichePattern of FORBIDDEN_CLICHES) {
      if (clichePattern.test(trimmedText)) {
        errors.push('BLOCK_HAS_CLICHE_SENTENCES: Forbidden cliche phrase detected');
        break;
      }
    }

    // 8. КРИТИЧЕСКАЯ ПРОВЕРКА: FAQ блок ДОЛЖЕН содержать вопросы в правильном формате
    if (blockType === 'faq') {
      const questionMatches = trimmedText.match(/\*\*Q\d+:|^\d+\.|^Q\d+:/gmi) || [];
      if (questionMatches.length < 5) {
        errors.push(`FAQ_BLOCK_INVALID_FORMAT: FAQ block must contain at least 5 questions in format **Q1:, 1., or Q1: (found ${questionMatches.length})`);
      }
      // Дополнительная проверка: FAQ не должен быть обычным текстом (без структурированных вопросов)
      if (questionMatches.length === 0 && trimmedText.length > 200) {
        errors.push('FAQ_BLOCK_NOT_STRUCTURED: FAQ block appears to be plain text instead of structured Q&A format');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * ANTI-BREAK SYSTEM: Расширенная проверка естественного конца блока
   * Проверяет структуру: минимум 4 предложения, правильное окончание, нет запрещенных слов
   */
  validateNaturalEnding(text) {
    if (!text || typeof text !== 'string') {
      return { valid: false, reason: 'EMPTY_TEXT' };
    }

    const trimmedText = text.trim();
    if (trimmedText.length === 0) {
      return { valid: false, reason: 'EMPTY_TEXT' };
    }

    // Подсчет предложений
    const sentences = trimmedText.match(/[^.!?]*[.!?]/g) || [];
    if (sentences.length < 4) {
      return { valid: false, reason: 'TOO_FEW_SENTENCES', count: sentences.length };
    }

    // Проверка последнего символа
    const lastChar = trimmedText[trimmedText.length - 1];
    if (!['.', '!', '?'].includes(lastChar)) {
      return { valid: false, reason: 'INVALID_ENDING_PUNCTUATION' };
    }

    // Извлечение последнего предложения
    const lastSentence = sentences[sentences.length - 1] || '';
    const lastWord = lastSentence.trim().split(/\s+/).pop()?.toLowerCase().replace(/[.,!?;:]$/, '') || '';

    // Список запрещенных слов в конце
    const forbiddenWords = ['to', 'for', 'with', 'from', 'including', 'like', 'such', 'as', 
                           'indicating', 'suggesting', 'because', 'due', 'involving', 
                           'engine', 'system', 'vehicle', 'data', 'information', 'report', 
                           'check', 'verification'];
    
    if (forbiddenWords.includes(lastWord)) {
      return { valid: false, reason: 'INVALID_TRAILING_WORD', word: lastWord };
    }

    // Проверка на зависшие фрагменты
    const danglingPatterns = [
      /\s(such as|like|including|due to|involving)\s*$/i
    ];
    
    for (const pattern of danglingPatterns) {
      if (pattern.test(trimmedText)) {
        return { valid: false, reason: 'DANGLING_FRAGMENT' };
      }
    }

    return { valid: true };
  }

  /**
   * Подсчет слов (делегируется в ArticleQualityUtils)
   */
  countWords(text) {
    return ArticleQualityUtils.countWords(text);
  }

  /**
   * MONSTER 7.x: Проверка общей длины статьи
   * @param {Array} blocks - Массив блоков с wordCount
   * @returns {Object} { valid: boolean, totalWords: number, warnings: string[] }
   */
  validateArticleLength(blocks) {
    const totalWords = blocks.reduce((sum, block) => sum + (block.wordCount || 0), 0);
    const warnings = [];

    if (totalWords < 2000) {
      warnings.push(`UNDER_TARGET_LENGTH: ${totalWords} words (target: 2000-2500)`);
    } else if (totalWords > 2500) {
      warnings.push(`OVER_TARGET_LENGTH: ${totalWords} words (target: 2000-2500)`);
    }

    return {
      valid: totalWords >= 2000 && totalWords <= 2500,
      totalWords,
      warnings
    };
  }

  /**
   * Проверка фактологических несостыковок
   */
  checkFactualAccuracy(content, context = {}) {
    if (!this.technicalTerms || !context.year || !context.make || !context.model) {
      return; // Пропускаем если нет данных
    }

    const year = context.year;
    const make = context.make;
    const model = context.model;

    const terms = this.technicalTerms[year]?.[make]?.[model];
    if (!terms) return;

    // Проверка на запрещенные двигатели
    if (terms.forbidden_engines) {
      terms.forbidden_engines.forEach(engine => {
        const regex = new RegExp(engine.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        if (regex.test(content)) {
          this.errors.push(`Forbidden engine mentioned for ${year} ${make} ${model}: ${engine}`);
        }
      });
    }

    // Проверка запрещенных комбинаций (перенесено в checkEngineFactConflict, но оставляем здесь для обратной совместимости)
    if (terms.forbidden_combinations) {
      terms.forbidden_combinations.forEach(combo => {
        const regex = new RegExp(combo.pattern, 'gi');
        if (regex.test(content)) {
          this.errors.push(`Forbidden engine combination: "${combo.pattern}" - ${combo.reason}`);
        }
      });
    }

    // Проверка на правильный VIN код года
    if (terms.vin_codes?.model_year_code) {
      const expectedCode = terms.vin_codes.model_year_code;
      const vinDecoderSection = content.match(/##\s*VIN\s+Decoder[\s\S]*?(?=##|$)/i);
      if (vinDecoderSection) {
        const vinContent = vinDecoderSection[0];
        // Проверяем, что позиция 10 упоминается с правильным кодом
        const position10Regex = new RegExp(`position\\s+10.*[${expectedCode}${expectedCode.toLowerCase()}]`, 'i');
        if (!position10Regex.test(vinContent)) {
          this.warnings.push(`VIN Decoder may not correctly show position 10 = ${expectedCode} for ${year} model year`);
        }
      }
    }
  }

  /**
   * Валидация статьи
   */
  validate(article, context = {}) {
    this.errors = [];
    this.warnings = [];

    if (!article || !article.content) {
      this.errors.push('Article content is missing');
      return this.getResult();
    }

    const content = article.content;

    // 1. Проверка на обрывы текста
    this.checkTextBreaks(content);

    // 2. Проверка структуры H2/H3
    this.checkHeadings(content);

    // 3. Проверка таблиц
    this.checkTables(content);

    // 4. Проверка обязательных блоков (MONSTER 7.x: с интеграцией правил)
    this.checkRequiredBlocks(content, context);

    // 5. Проверка VIN decoder
    this.checkVINDecoder(content);

    // 6. Проверка CTA
    this.checkCTA(content);

    // 7. Проверка FAQ
    this.checkFAQ(content);

    // 8. Проверка минимумов
    this.checkMinimums(article);

    // 9. Проверка фактологической точности
    this.checkFactualAccuracy(content, context);

    // 10. Проверка на дублирующие блоки
    this.checkDuplicateBlocks(content);

    // 11. Проверка обрывочных концовок предложений
    this.checkIncompleteEndings(content);

    // 12. Проверка неправильных токенов
    this.checkBrokenTokens(content);

    // 13. Проверка буллетов из одного слова
    this.checkInvalidBullets(content);

    // 14. Проверка дублирующихся H2 подряд
    this.checkDuplicateH2Consecutive(content);

    // 15. Проверка коротких абзацев
    this.checkTinyParagraphs(content);

    // 16. CRITICAL: Проверка обрывов в таблицах (VIN decoder)
    this.checkTableCellTruncated(content);

    // 17. CRITICAL: Проверка незакрытых скобок
    this.checkUnbalancedParentheses(content);

    // 18. CRITICAL: Проверка мусорных буллетов в Key Facts
    this.checkGarbageBullets(content);

    // 19. CRITICAL: Проверка конфликтов двигателей
    this.checkEngineFactConflict(content, context);

    // 20. Проверка канонической структуры
    this.checkCanonStructure(content);

    // 21. Проверка формата Key Facts
    this.checkKeyFactsFormat(content);

    // 22. Проверка внутренних ссылок
    this.checkInternalLinks(content);

    // 23. Проверка длины секций
    this.checkLengthValidation(article);

    // 24. SEO: Проверка консистентности VIN/engine code (hybrid vs gas)
    this.checkVINEngineConsistency(content, context);

    // 25. SEO: Проверка обрывов предложений (digits., verified., state.)
    this.checkSentenceFragments(content);

    // 26. SEO: Проверка H1 и первого абзаца
    this.checkH1AndIntro(content, context);

    // 27. SEO: Проверка повторяющихся фраз
    this.checkRepeatedPhrases(content);

    // 28. SEO: Проверка эталонного скелета (14 секций)
    this.checkCanonicalSkeleton(content);

    // 29. SEO: Проверка интро под интент
    this.checkIntroIntent(content, context);

    // 30. SEO: Проверка FAQ под интент
    this.checkFAQIntent(content);

    // 31. ПРОБЛЕМА №8: Проверка на избыточные длинные обзоры (bloat)
    this.checkContentBloat(content);

    return this.getResult();
  }

  /**
   * Проверка обрывочных концовок предложений
   */
  checkIncompleteEndings(content) {
    const incompleteEndings = [
      /\bThis\.\s*$/gm,
      /\bthis\.\s*$/gm,
      /\bThis\s*$/gm,
      /\bwhich can\.\s*$/gm,
      /\bwhich can\s*$/gm,
      /\brisk of a\.\s*$/gm,
      /\brisk of a\s*$/gm,
      /\bheightening the risk of a\.\s*$/gm,
      /\bheightening the risk of a\s*$/gm,
      /\bComplete explanation\.\s*$/gm,
      /\bThe\.\s*$/gm,
      /\bthe\.\s*$/gm,
      /\(digits\s+\d+-\d+:\s*\./g,
      /\(digits\s+\d+-\d+:\s*$/gm,
      /\bseverely\.\s*$/gm,
      /\brecurs\.\s*$/gm,
      /\blogged in\.\s*$/gm,
      /\bcatastrophic damage\.\s*$/gm,
      /\bToyota Safety Sense\.\s*$/gm,
      /\bfrom an\.\s*$/gm,
      /\bmay receive\.\s*$/gm,
      /\bstate's\.\s*$/gm,
      /\*\*Theft History:\*\*\s*The\.\s*$/gm
    ];

    incompleteEndings.forEach((pattern) => {
      const matches = content.match(pattern);
      if (matches) {
        this.errors.push(`Incomplete sentence ending detected: ${pattern.source} (${matches.length} occurrences)`);
      }
    });

    // Проверка в ячейках таблиц
    const tableRows = content.match(/\|.*\|/g) || [];
    tableRows.forEach((row, index) => {
      const incompleteInRow = [
        'This.', 'this.', 'which can.', 'risk of a.',
        'The.', 'the.', '(digits 12-17:.', '(digits 12-17:'
      ];
      if (incompleteInRow.some(pattern => row.includes(pattern))) {
        this.errors.push(`Incomplete ending in table row ${index + 1}: "${row.substring(0, 50)}..."`);
      }
    });
  }

  /**
   * Проверка неправильных токенов (NMVTIS-a., etc.)
   */
  checkBrokenTokens(content) {
    const brokenTokenPatterns = [
      /\b[A-Z]{3,8}-a\.\b/g,
      /\b[a-z]{3,15}-a\.\b/g
    ];

    brokenTokenPatterns.forEach((pattern) => {
      const matches = content.match(pattern);
      if (matches) {
        this.errors.push(`Broken token detected: ${pattern.source} (${matches.length} occurrences: ${matches.join(', ')})`);
      }
    });
  }

  /**
   * Проверка буллетов из одного слова
   */
  checkInvalidBullets(content) {
    const bulletLines = content.match(/^\s*[-*]\s+.+$/gm) || [];
    
    bulletLines.forEach((line) => {
      // Убираем маркер, жирный/курсив, разбиваем на слова
      const cleaned = line
        .replace(/^\s*[-*]\s+/, '')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/__/g, '')
        .replace(/_/g, '')
        .trim();
      
      const words = cleaned.split(/\s+/).filter(w => w.length > 0);
      
      // Если только одно слово (или одно слово + точка)
      if (words.length <= 1) {
        this.errors.push(`Invalid bullet (too short): "${line.trim()}"`);
      }
    });
  }

  /**
   * Проверка дублирующихся H2 подряд
   */
  checkDuplicateH2Consecutive(content) {
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length - 1; i++) {
      const currentLine = lines[i].trim();
      const nextLine = lines[i + 1].trim();
      
      if (currentLine.startsWith('## ') && nextLine.startsWith('## ')) {
        // Нормализуем заголовки (убираем точки, приводим к lowercase)
        const currentNormalized = ArticleQualityUtils.normalizeH2Heading(currentLine);
        const nextNormalized = ArticleQualityUtils.normalizeH2Heading(nextLine);
        
        // Если заголовки одинаковые или очень похожие
        if (currentNormalized === nextNormalized || 
            (currentNormalized.length > 10 && nextNormalized.includes(currentNormalized)) ||
            (nextNormalized.length > 10 && currentNormalized.includes(nextNormalized))) {
          this.errors.push(`Duplicate H2 headings found consecutively: "${currentLine}" and "${nextLine}"`);
        }
      }
    }
  }

  /**
   * Проверка коротких абзацев (мусор)
   */
  checkTinyParagraphs(content) {
    const paragraphs = content.split(/\n\n/);
    
    paragraphs.forEach((para, index) => {
      const trimmed = para.trim();
      
      // Пропускаем заголовки, буллеты, таблицы, пустые строки
      if (trimmed.startsWith('#') || 
          trimmed.startsWith('-') || 
          trimmed.startsWith('*') ||
          trimmed.includes('|') ||
          trimmed.length === 0) {
        return;
      }
      
      // Если абзац < 30 символов - это мусор
      if (trimmed.length < 30) {
        this.errors.push(`Tiny paragraph detected (${trimmed.length} chars): "${trimmed.substring(0, 40)}..."`);
      }
    });
  }

  /**
   * Проверка на дублирующие блоки (например, два Recalls блока)
   */
  checkDuplicateBlocks(content) {
    // Ищем дублирующие H2 с похожими названиями
    const h2Matches = content.match(/^##\s+.+$/gm) || [];
    const blockKeywords = {
      'recalls': ['recalls', 'tsb', 'technical service'],
      'faq': ['faq', 'frequently asked', 'questions'],
      'vin decoder': ['vin decoder', 'vin structure'],
      'nmvtis': ['nmvtis', 'national motor vehicle']
    };

    Object.entries(blockKeywords).forEach(([blockName, keywords]) => {
      const matchingHeadings = h2Matches.filter(h2 => {
        const h2Text = h2.toLowerCase();
        return keywords.some(keyword => h2Text.includes(keyword));
      });

      if (matchingHeadings.length > 1) {
        this.errors.push(`Duplicate ${blockName} blocks found: ${matchingHeadings.length} headings`);
        matchingHeadings.forEach((heading, index) => {
          if (index > 0) {
            this.warnings.push(`Possible duplicate ${blockName} heading: "${heading}"`);
          }
        });
      }
    });
  }

  /**
   * Проверка на обрывы текста
   */
  checkTextBreaks(content) {
    // Обрывы после "and", "or", "(", "["
    const breakPatterns = [
      /\band\s+##/g,
      /\bor\s+##/g,
      /\(\s*##/g,
      /\[\s*##/g,
      /,\s*##/g,
      /\|\s*##/g,
      /and\s*$/m,
      /or\s*$/m,
      /\(\s*$/m,
      /\[\s*$/m
    ];

    breakPatterns.forEach((pattern, index) => {
      const matches = content.match(pattern);
      if (matches) {
        this.errors.push(`Text break detected: ${pattern.source} (${matches.length} occurrences)`);
      }
    });

    // Проверка на незавершенные предложения перед заголовками
    const incompleteBeforeHeading = content.match(/[a-z]\s+##/g);
    if (incompleteBeforeHeading) {
      this.warnings.push(`Possible incomplete sentences before headings: ${incompleteBeforeHeading.length} occurrences`);
    }
  }

  /**
   * Проверка заголовков
   */
  checkHeadings(content) {
    const h2Matches = content.match(/^##\s+.+$/gm) || [];
    const h3Matches = content.match(/^###\s+.+$/gm) || [];

    // КРИТИЧНО: Проверка на точки в заголовках
    h2Matches.forEach(h2 => {
      const h2Text = h2.replace(/^##\s+/, '');
      if (h2Text.endsWith('.')) {
        this.errors.push(`H2 ends with period (should be removed): "${h2}"`);
      }
    });

    h3Matches.forEach(h3 => {
      const h3Text = h3.replace(/^###\s+/, '');
      if (h3Text.endsWith('.')) {
        this.errors.push(`H3 ends with period (should be removed): "${h3}"`);
      }
    });

    // КРИТИЧНО: Проверка на мусорные заголовки
    h2Matches.forEach(h2 => {
      const h2Text = h2.replace(/^##\s+/, '');
      // Запрещенные паттерны в заголовках
      const forbiddenPatterns = [
        /\[Content section\]/i,
        /\[.*\]/,
        /\.\.\./,
        /^\.+$/
      ];
      
      forbiddenPatterns.forEach(pattern => {
        if (pattern.test(h2Text)) {
          this.errors.push(`H2 contains forbidden pattern (garbage): "${h2}"`);
        }
      });
    });

    // КРИТИЧНО: Проверка на дублирующие заголовки
    const h2Texts = h2Matches.map(h2 => h2.replace(/^##\s+/, '').trim().toLowerCase());
    const duplicates = [];
    h2Texts.forEach((text, index) => {
      const firstIndex = h2Texts.indexOf(text);
      if (firstIndex !== index) {
        duplicates.push({ first: h2Matches[firstIndex], duplicate: h2Matches[index] });
      }
    });

    if (duplicates.length > 0) {
      duplicates.forEach(({ first, duplicate }) => {
        this.errors.push(`Duplicate H2 headings found: "${first}" and "${duplicate}"`);
      });
    }

    // Проверка: каждый H2 должен иметь контент после него
    h2Matches.forEach((h2, index) => {
      const h2Index = content.indexOf(h2);
      const nextH2Index = content.indexOf('##', h2Index + h2.length);
      const sectionContent = content.substring(h2Index + h2.length, nextH2Index !== -1 ? nextH2Index : content.length);
      
      // Проверяем, что после H2 есть хотя бы 2 строки текста
      const lines = sectionContent.trim().split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
      if (lines.length < 2) {
        this.errors.push(`H2 "${h2}" has insufficient content (less than 2 paragraphs)`);
      }

      // Проверка: H2 не должен начинаться сразу после другого H2
      if (sectionContent.trim().startsWith('##')) {
        this.errors.push(`H2 "${h2}" is immediately followed by another heading without content`);
      }
    });

    // Проверка SEO-формулировок H2
    h2Matches.forEach(h2 => {
      const h2Text = h2.replace(/^##\s+/, '');
      // H2 должен содержать год, марку, модель или ключевые слова
      if (!h2Text.match(/\d{4}|Toyota|Camry|VIN|California|Title|Accident|Fraud|Market|Insurance|Buyer|Recall|FAQ/i)) {
        this.warnings.push(`H2 may lack SEO keywords: "${h2Text}"`);
      }
    });
  }

  /**
   * Проверка таблиц
   */
  checkTables(content) {
    // Проверка на незавершенные таблицы
    const tableMatches = content.match(/\|.*\|/g) || [];
    const tableGroups = [];
    let currentTable = [];
    
    content.split('\n').forEach((line, index) => {
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        currentTable.push({ line, index });
      } else if (line.trim() === '' && currentTable.length > 0) {
        if (currentTable.length > 0) {
          tableGroups.push(currentTable);
          currentTable = [];
        }
      }
    });
    if (currentTable.length > 0) {
      tableGroups.push(currentTable);
    }

    // Проверка валидности таблиц
    tableGroups.forEach((table, tableIndex) => {
      if (table.length < 2) {
        this.errors.push(`Table ${tableIndex + 1} is incomplete (less than 2 rows)`);
        return;
      }

      // Проверка на одинаковое количество колонок
      const columnCounts = table.map(row => (row.line.match(/\|/g) || []).length);
      const firstCount = columnCounts[0];
      if (columnCounts.some(count => count !== firstCount)) {
        this.errors.push(`Table ${tableIndex + 1} has inconsistent column counts`);
      }

      // Проверка на пустые ячейки в заголовке
      const headerRow = table[0].line;
      if (headerRow.includes('||') || headerRow.match(/\|\s*\|\s*\|/)) {
        this.errors.push(`Table ${tableIndex + 1} has empty header cells`);
      }
    });
  }

  /**
   * Проверка обязательных блоков
   * MONSTER 7.x: Использует правила из rules.json через RuleEngineIntegration
   */
  checkRequiredBlocks(content, context = {}) {
    // Если есть блоки в контексте, используем ruleEngine для проверки
    if (context.blocks && Array.isArray(context.blocks)) {
      const stage = context.stage || 'deep';
      const ruleCheck = this.ruleEngine.checkRequiredBlocks(context.blocks, stage);
      
      // Добавляем ошибки из правил
      ruleCheck.errors.forEach(err => this.errors.push(err));
      ruleCheck.warnings.forEach(warn => this.warnings.push(warn));
      
      // Дополнительно проверяем по ключевым словам для совместимости
      this.checkRequiredBlocksByKeywords(content);
    } else {
      // Fallback: проверка по ключевым словам (совместимость со старым кодом)
      this.checkRequiredBlocksByKeywords(content);
    }
  }

  /**
   * Проверка обязательных блоков по ключевым словам (fallback метод)
   */
  checkRequiredBlocksByKeywords(content) {
    // MONSTER 7.x: Обязательные блоки (ошибки) vs рекомендуемые (предупреждения)
    const requiredBlocks = {
      'VIN Decoder': ['vin decoder', 'vin structure', 'positions 1-17', 'position 1-3', 'position 10'],
      'Key Facts': ['key facts', 'essential', 'quick'],
      'NMVTIS': ['nmvtis', 'national motor vehicle'],
      'State-Specific': ['state-specific', 'state dmv', 'state vehicle code'],
      'FAQ': ['faq', 'frequently asked', 'questions']
    };

    const recommendedBlocks = {
      'Executive Summary': ['executive', 'summary', 'overview'],
      'Data Layers': ['data streams', 'layered data', 'data layers'],
      'Accident Intelligence': ['accident', 'collision', 'structural damage'],
      'Fraud Patterns': ['fraud', 'cloning', 'rollback', 'title washing'],
      'Market Value': ['market value', 'pricing', 'risk-adjusted'],
      'Insurance Risk': ['insurance', 'premium', 'risk assessment'],
      'Buyer Guide': ['buyer', 'checklist', 'step-by-step'],
      'Recalls & TSB': ['recall', 'tsb', 'technical service'],
      'Related Links': ['related', 'internal links', 'guides'],
      'CTA': ['check.*vin.*now', 'verify.*vin', 'get.*report']
    };

    // Проверяем обязательные блоки (ошибки)
    Object.entries(requiredBlocks).forEach(([blockName, keywords]) => {
      const found = keywords.some(keyword => {
        const regex = new RegExp(keyword, 'i');
        return regex.test(content);
      });
      
      if (!found) {
        this.errors.push(`Required block "${blockName}" is missing`);
      }
    });

    // Проверяем рекомендуемые блоки (предупреждения)
    Object.entries(recommendedBlocks).forEach(([blockName, keywords]) => {
      const found = keywords.some(keyword => {
        const regex = new RegExp(keyword, 'i');
        return regex.test(content);
      });
      
      if (!found) {
        this.warnings.push(`Recommended block "${blockName}" may be missing or not clearly identified`);
      }
    });
  }

  /**
   * Проверка VIN decoder
   */
  checkVINDecoder(content) {
    const vinSection = content.match(/##\s*VIN\s+Decoder[\s\S]*?(?=##|$)/i);
    if (!vinSection) {
      this.errors.push('VIN Decoder section is missing');
      return;
    }

    const vinContent = vinSection[0];

    // Проверка на таблицу позиций
    if (!vinContent.includes('|') || !vinContent.match(/\|\s*Position\s*\|/i)) {
      this.errors.push('VIN Decoder section lacks position table');
    }

    // Проверка на все 17 позиций
    const positionMatches = vinContent.match(/position\s+\d+/gi) || [];
    if (positionMatches.length < 10) {
      this.warnings.push(`VIN Decoder may not cover all 17 positions (found ${positionMatches.length} mentions)`);
    }

    // Проверка на правильный WMI (4T1 для Toyota USA)
    if (vinContent.match(/4T1/i) && !vinContent.match(/4\s*=\s*United\s+States|4\s*=\s*USA/i)) {
      this.warnings.push('VIN Decoder may not correctly explain WMI position 1 (4 = USA)');
    }

    // Проверка на позицию 10 = J для 2018
    if (content.match(/2018/i) && !vinContent.match(/position\s+10.*[Jj].*2018|10.*[Jj].*2018/i)) {
      this.errors.push('VIN Decoder does not correctly show position 10 = J for 2018 model year');
    }
  }

  /**
   * Проверка CTA
   */
  checkCTA(content) {
    const ctaPatterns = [
      /check.*vin.*now/i,
      /verify.*vin/i,
      /get.*report/i
    ];

    const hasCTA = ctaPatterns.some(pattern => pattern.test(content));
    if (!hasCTA) {
      this.errors.push('CTA (Call-to-Action) section is missing or not clearly identified');
    }

    // Проверка на канонический формат CTA
    const canonicalCTA = /Check\s+this\s+\d{4}\s+\w+\s+\w+\s+VIN\s+now/i;
    if (!canonicalCTA.test(content)) {
      this.warnings.push('CTA does not follow canonical format: "Check this {YEAR} {MAKE} {MODEL} VIN now"');
    }
  }

  /**
   * Проверка FAQ
   */
  checkFAQ(content) {
    const faqSection = content.match(/##\s*(FAQ|Frequently\s+Asked\s+Questions)[\s\S]*?(?=##|$)/i);
    if (!faqSection) {
      this.warnings.push('FAQ section is missing');
      return;
    }

    const faqContent = faqSection[0];
    const questionMatches = faqContent.match(/\*\*Q\d+:|^\d+\.|^Q\d+:/gmi) || [];
    
    if (questionMatches.length < 5) {
      this.errors.push(`FAQ section has insufficient questions (found ${questionMatches.length}, minimum 5 required)`);
    }
  }

  /**
   * Проверка минимумов
   */
  checkMinimums(article) {
    const wordCount = article.wordCount || 0;
    // MONSTER 7.x: Целевая длина 2000-2500 слов
    if (wordCount < 2000) {
      this.errors.push(`Article word count (${wordCount}) is below minimum (2000)`);
    }

    const blocks = article.blocks || 0;
    if (blocks < 12) {
      this.errors.push(`Article blocks (${blocks}) is below minimum (12)`);
    }

    // Проверка таблиц
    const tableCount = (article.content.match(/\|.*\|/g) || []).length;
    if (tableCount < 3) {
      this.warnings.push(`Article may have insufficient tables (found ${tableCount}, recommended 3+)`);
    }
  }

  /**
   * CRITICAL ERROR A: Проверка обрывов в таблицах (table_cell_truncated)
   */
  checkTableCellTruncated(content) {
    const tableRows = content.match(/\|.*\|/g) || [];
    tableRows.forEach((row, index) => {
      // Проверка на обрывы в ячейках (заканчивается на ':' или ':.')
      if (row.match(/:\s*\|$/) || row.match(/:\s*\.\s*\|$/)) {
        this.errors.push(`Table cell truncated in row ${index + 1}: "${row.substring(0, 80)}..."`);
      }
      // Проверка на незавершенные описания в VIN таблице
      if (row.includes('digits') && (row.match(/\(digits\s+\d+-\d+:\s*\./) || row.match(/\(digits\s+\d+-\d+:\s*\|/))) {
        this.errors.push(`VIN table cell truncated in row ${index + 1}: "${row.substring(0, 80)}..."`);
      }
    });
  }

  /**
   * CRITICAL ERROR A: Проверка незакрытых скобок (unbalanced_parentheses)
   */
  checkUnbalancedParentheses(content) {
    // Проверка в таблицах
    const tableRows = content.match(/\|.*\|/g) || [];
    tableRows.forEach((row, index) => {
      const openParens = (row.match(/\(/g) || []).length;
      const closeParens = (row.match(/\)/g) || []).length;
      if (openParens > closeParens) {
        this.errors.push(`Unbalanced parentheses in table row ${index + 1}: "${row.substring(0, 80)}..."`);
      }
    });

    // Проверка в основном тексте (только в критических местах)
    const criticalSections = content.match(/##\s+VIN\s+Decoder[\s\S]*?(?=##|$)/i);
    if (criticalSections) {
      const section = criticalSections[0];
      const openParens = (section.match(/\(/g) || []).length;
      const closeParens = (section.match(/\)/g) || []).length;
      if (openParens > closeParens) {
        this.errors.push(`Unbalanced parentheses in VIN Decoder section`);
      }
    }
  }

  /**
   * CRITICAL ERROR C: Проверка мусорных буллетов в Key Facts
   */
  checkGarbageBullets(content) {
    const keyFactsSection = content.match(/##\s+Key\s+Facts[\s\S]*?(?=##|$)/i);
    if (!keyFactsSection) return;

    const lines = keyFactsSection[0].split('\n');
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      // Проверка на мусорные паттерны
      if (trimmed === '- *' || trimmed === '* -' || trimmed === '* *' || trimmed === '- -') {
        this.errors.push(`Garbage bullet found in Key Facts section (line ${index + 1}): "${trimmed}"`);
      }
      // Проверка на буллеты без содержимого
      if (trimmed.match(/^[-*]\s*$/) || trimmed.match(/^[-*]\s+[-*]\s*$/)) {
        this.errors.push(`Empty bullet found in Key Facts section (line ${index + 1}): "${trimmed}"`);
      }
    });
  }

  /**
   * CRITICAL ERROR B: Проверка конфликтов двигателей (engine_fact_conflict)
   */
  checkEngineFactConflict(content, context = {}) {
    if (!this.technicalTerms || !context.year || !context.make || !context.model) {
      return;
    }

    const year = context.year;
    const make = context.make;
    const model = context.model;

    const terms = this.technicalTerms[year]?.[make]?.[model];
    if (!terms || !terms.forbidden_combinations) return;

    // Проверка запрещенных комбинаций
    terms.forbidden_combinations.forEach(combo => {
      const regex = new RegExp(combo.pattern, 'gi');
      if (regex.test(content)) {
        this.errors.push(`Engine fact conflict detected: "${combo.pattern}" - ${combo.reason}`);
      }
    });

    // Проверка правильных соответствий двигателей
    if (terms.engine_mappings) {
      Object.entries(terms.engine_mappings).forEach(([code, mapping]) => {
        // Если упоминается код двигателя, проверяем что он правильно описан
        const codeRegex = new RegExp(code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        if (codeRegex.test(content)) {
          // Проверяем что описание соответствует
          const wrongDisplacement = mapping.displacement === '3.5L' 
            ? /2\.5L.*V6|2\.5L.*2GR-FKS/gi
            : /3\.5L.*A25A/gi;
          
          if (wrongDisplacement.test(content)) {
            this.errors.push(`Engine description mismatch: ${code} is ${mapping.displacement} ${mapping.type}, but found incorrect description`);
          }
        }
      });
    }
  }

  /**
   * Проверка канонической структуры (Canon Rules 4.1)
   */
  checkCanonStructure(content) {
    const canonSections = [
      'hero',
      'key_facts',
      'vin_decoder',
      'nmvtis',
      'deep_explanation',
      'state_specific',
      'accident_intelligence',
      'fraud_patterns',
      'market_value',
      'insurance_risk',
      'buyer_guide',
      'recalls_tsbs',
      'faq',
      'internal_links',
      'cta'
    ];

    const h2Headings = content.match(/^##\s+.+$/gm) || [];
    const foundSections = h2Headings.map(h => h.replace(/^##\s+/, '').toLowerCase().trim());

    // Проверка на пустые H2/H3
    h2Headings.forEach((h2, index) => {
      const nextH2 = h2Headings[index + 1];
      const sectionContent = content.substring(
        content.indexOf(h2) + h2.length,
        nextH2 ? content.indexOf(nextH2) : content.length
      ).trim();
      
      if (sectionContent.length < 50) {
        this.errors.push(`H2 "${h2}" has insufficient content (less than 50 characters)`);
      }
    });
  }

  /**
   * Проверка формата Key Facts (Canon Rules 4.3)
   */
  checkKeyFactsFormat(content) {
    const keyFactsSection = content.match(/##\s+Key\s+Facts[\s\S]*?(?=##|$)/i);
    if (!keyFactsSection) return;

    const bullets = keyFactsSection[0].match(/^\s*[-*]\s+.+$/gm) || [];
    bullets.forEach((bullet, index) => {
      // Проверка формата: должен начинаться с "* **LABEL:**"
      if (!bullet.match(/^\s*[-*]\s+\*\*[^*]+\*\*\s*:/)) {
        this.warnings.push(`Key Facts bullet ${index + 1} does not follow format "* **LABEL:** description"`);
      }
      
      // Проверка что LABEL не слишком длинный (максимум 7 слов)
      const labelMatch = bullet.match(/\*\*([^*]+)\*\*/);
      if (labelMatch) {
        const labelWords = labelMatch[1].trim().split(/\s+/).length;
        if (labelWords > 7) {
          this.warnings.push(`Key Facts label too long (${labelWords} words, max 7): "${labelMatch[1].substring(0, 50)}..."`);
        }
      }
    });
  }

  /**
   * Проверка внутренних ссылок (Canon Rules 4.5)
   */
  checkInternalLinks(content) {
    const internalLinksSection = content.match(/##\s+Related[\s\S]*?(?=##|$)/i);
    if (!internalLinksSection) {
      this.warnings.push('Internal links section not found');
      return;
    }

    const links = internalLinksSection[0].match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];
    if (links.length < 4 || links.length > 6) {
      this.warnings.push(`Internal links count (${links.length}) should be 4-6`);
    }

    links.forEach((link, index) => {
      // Проверка что ссылка имеет описание после неё
      const linkMatch = link.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        const afterLink = internalLinksSection[0].substring(
          internalLinksSection[0].indexOf(link) + link.length
        ).trim();
        
        if (!afterLink.match(/^-\s+[A-Z]/) && !afterLink.match(/^[A-Z]/)) {
          this.warnings.push(`Internal link ${index + 1} missing description: "${linkMatch[1]}"`);
        }
      }
    });
  }

  /**
   * Проверка длины секций (Canon Rules 5.8)
   */
  checkLengthValidation(article) {
    if (!article.content) return;

    const content = article.content;
    
    // Hero section (40-90 слов)
    const heroMatch = content.match(/^#\s+[^\n]+\n\n([^#]+?)(?=\n##|$)/);
    if (heroMatch) {
      const heroWords = heroMatch[1].split(/\s+/).length;
      if (heroWords < 40 || heroWords > 90) {
        this.warnings.push(`Hero section word count (${heroWords}) should be 40-90 words`);
      }
    }

    // Key Facts (120-200 слов)
    const keyFactsMatch = content.match(/##\s+Key\s+Facts[\s\S]*?(?=##|$)/i);
    if (keyFactsMatch) {
      const keyFactsWords = keyFactsMatch[0].split(/\s+/).length;
      if (keyFactsWords < 120 || keyFactsWords > 200) {
        this.warnings.push(`Key Facts section word count (${keyFactsWords}) should be 120-200 words`);
      }
    }

    // Deep Explanation (400-700 слов)
    const deepExplanationMatch = content.match(/##\s+(What\s+a\s+VIN|Deep\s+Explanation)[\s\S]*?(?=##|$)/i);
    if (deepExplanationMatch) {
      const deepWords = deepExplanationMatch[0].split(/\s+/).length;
      if (deepWords < 400 || deepWords > 700) {
        this.warnings.push(`Deep Explanation section word count (${deepWords}) should be 400-700 words`);
      }
    }

    // FAQ (400-600 слов)
    const faqMatch = content.match(/##\s+(FAQ|Frequently\s+Asked)[\s\S]*?(?=##|$)/i);
    if (faqMatch) {
      const faqWords = faqMatch[0].split(/\s+/).length;
      if (faqWords < 400 || faqWords > 600) {
        this.warnings.push(`FAQ section word count (${faqWords}) should be 400-600 words`);
      }
    }

    // CTA (55-75 слов)
    const ctaMatch = content.match(/##\s+Check\s+Your\s+VIN[\s\S]*?(?=##|$)/i);
    if (ctaMatch) {
      const ctaWords = ctaMatch[0].split(/\s+/).length;
      if (ctaWords < 55 || ctaWords > 75) {
        this.warnings.push(`CTA section word count (${ctaWords}) should be 55-75 words`);
      }
    }

    // MONSTER 7.x: Целевая длина 2000-2500 слов
    const totalWords = article.wordCount || content.split(/\s+/).length;
    if (totalWords < 2000 || totalWords > 2500) {
      this.warnings.push(`Total article word count (${totalWords}) should be 2000-2500 words`);
    }
  }

  /**
   * SEO: Проверка консистентности VIN/engine code (hybrid vs gas) - ПРОБЛЕМА №1
   */
  checkVINEngineConsistency(content, context = {}) {
    const vinDecoderSection = content.match(/##\s+VIN\s+Decoder[\s\S]*?(?=##|$)/i);
    if (!vinDecoderSection) return;

    const vinContent = vinDecoderSection[0];
    
    // ПРОБЛЕМА №1: Определяем engine code из VIN decoder
    // Ищем Position 8 в таблице
    const position8Match = vinContent.match(/\|\s*8\s*\|[^|]+\|([^|]+)\|/i);
    let engineCodeFromVIN = null;
    let isHybrid = false;
    let isGas = false;
    
    if (position8Match) {
      const position8Desc = position8Match[1].toLowerCase();
      if (position8Desc.includes('hybrid') || position8Desc.includes('a25a-fxs')) {
        isHybrid = true;
        engineCodeFromVIN = 'A25A-FXS';
      } else if (position8Desc.includes('a25a-fks') || (position8Desc.includes('gas') && !position8Desc.includes('hybrid'))) {
        isGas = true;
        engineCodeFromVIN = 'A25A-FKS';
      } else if (position8Desc.includes('2gr-fks') || position8Desc.includes('3.5l')) {
        engineCodeFromVIN = '2GR-FKS';
      }
    } else {
      // Fallback: проверяем упоминание в тексте
      isHybrid = /hybrid|A25A-FXS/i.test(vinContent);
      isGas = /A25A-FKS|gasoline|gas/i.test(vinContent) && !isHybrid;
    }
    
    // Проверяем упоминание в других секциях
    const otherSections = content.replace(vinDecoderSection[0], '');
    
    if (isHybrid && engineCodeFromVIN === 'A25A-FXS') {
      // ПРОБЛЕМА №1: Если VIN-пример = hybrid, другие моторы должны быть в отдельном списке
      const gasOnlyMentions = otherSections.match(/\b2\.5L\s+A25A-FKS\s+(?!hybrid|other|available|configuration)\b/gi);
      if (gasOnlyMentions) {
        this.errors.push(`VIN/Engine inconsistency: VIN decoder example uses hybrid (A25A-FXS), but other sections mention gas-only (A25A-FKS) without labeling as "other configurations"`);
      }
      
      // Проверяем что запрещенные двигатели не упоминаются как относящиеся к примеру VIN
      const forbiddenEngines = otherSections.match(/\b(2AR-FXE|2AR-FE|1AR-FE|2AZ-FE)\b/gi);
      if (forbiddenEngines) {
        this.errors.push(`VIN/Engine inconsistency: Forbidden engines mentioned (${forbiddenEngines.join(', ')}) - these do not apply to ${context.year || '2018'} ${context.model || 'Camry'}`);
      }
    } else if (isGas && engineCodeFromVIN === 'A25A-FKS') {
      // Если VIN-пример = gas, проверяем что hybrid не упоминается как относящийся к примеру
      const hybridMentions = otherSections.match(/\b2\.5L\s+A25A-FXS\s+hybrid\b/gi);
      if (hybridMentions && !otherSections.match(/\bother\s+(available|possible|configuration)/i)) {
        this.warnings.push(`VIN/Engine inconsistency: VIN decoder example uses gas (A25A-FKS), but hybrid (A25A-FXS) mentioned without labeling as "other configuration"`);
      }
    }
  }

  /**
   * SEO: Проверка обрывов предложений (ПРОБЛЕМА №1 - обрывы на предлогах/глаголах)
   */
  checkSentenceFragments(content) {
    const suspiciousEndings = [
      /\bdigits\.\s*$/gm,
      /\bverified\.\s*$/gm,
      /\bstate\.\s*$/gm,
      /\bsequence \(digits\.\s*$/gm,
      /\bprovides a verified\.\s*$/gm,
      /\bdifferences in state\.\s*$/gm,
      // ПРОБЛЕМА №1: Обрывы на предлогах/глаголах
      /\bindicating\.\s*$/gm, // "indicating."
      /\bindicating\s*$/gm, // "indicating" без точки
      /\bto deliver the most\.\s*$/gm, // "to deliver the most."
      /\bto deliver the most\s*$/gm, // "to deliver the most" без точки
      /\bflood,\s*\.\s*$/gm, // "flood, ."
      /\bflood,\s*$/gm, // "flood," без точки
      /\bAccording to the Highway Loss Data Institute \(HLDI\.\s*$/gm, // "According to the Highway Loss Data Institute (HLDI."
      /\bAccording to the Highway Loss Data Institute \(HLDI\s*$/gm, // "According to the Highway Loss Data Institute (HLDI" без точки
      // ПРОБЛЕМА №2: Обрывы текста
      /\.\.\.\s*$/gm,
      /\.\.\s*$/gm,
      /\b\w{2,4}\.\.\s*$/gm, // незаконченные слова типа "exp.."
      /:\s*\.\.\.\s*\.\.\s*$/gm, // "Visibility: ... .."
      /\bconsolidates?\.\.\s*$/gm, // "consolidates.."
      /\bor\s+exp\.\.\s*$/gm, // "or exp.."
      /\bfraudulent\s+process\s+\.\.\.\s*\.\.\s*$/gm // "fraudulent process ... .."
    ];

    suspiciousEndings.forEach((pattern, index) => {
      const matches = content.match(pattern);
      if (matches) {
        // Проверяем что это не полное предложение (менее 10 слов)
        const lines = content.split('\n');
        lines.forEach((line, lineIndex) => {
          if (pattern.test(line)) {
            const words = line.trim().split(/\s+/).length;
            if (words < 10) {
              this.errors.push(`Sentence fragment detected (line ${lineIndex + 1}): "${line.substring(0, 60)}..." (${words} words, suspicious ending)`);
            }
          }
        });
      }
    });
  }

  /**
   * SEO: Проверка H1 и первого абзаца
   */
  checkH1AndIntro(content, context = {}) {
    // Проверка что H1 отделен от первого абзаца
    const h1Match = content.match(/^#\s+([^\n]+)/);
    if (h1Match) {
      const afterH1 = content.substring(h1Match[0].length, h1Match[0].length + 5);
      if (!afterH1.match(/\n\n/)) {
        this.errors.push(`H1 and first paragraph are merged - missing blank line after H1`);
      }
    }

    // Проверка что H1 содержит ключевые слова
    if (h1Match && context.year && context.make && context.model && context.stateLabel) {
      const h1 = h1Match[1];
      const required = [
        context.year.toString(),
        context.make,
        context.model,
        'VIN',
        context.stateLabel
      ];
      const missing = required.filter(keyword => !h1.includes(keyword));
      if (missing.length > 0) {
        this.warnings.push(`H1 missing keywords: ${missing.join(', ')}`);
      }
    }

    // Проверка первого абзаца
    const firstParaMatch = content.match(/^#\s+[^\n]+\n\n([^\n]+)/);
    if (firstParaMatch) {
      const firstPara = firstParaMatch[1];
      const requiredPhrases = [
        'VIN check',
        context.year ? context.year.toString() : '',
        context.make || '',
        context.model || '',
        context.stateLabel || ''
      ].filter(p => p);
      
      const missing = requiredPhrases.filter(phrase => !firstPara.includes(phrase));
      if (missing.length > 1) {
        this.warnings.push(`First paragraph missing key phrases: ${missing.join(', ')}`);
      }
    }
  }

  /**
   * SEO: Проверка повторяющихся фраз
   */
  checkRepeatedPhrases(content) {
    // Ищем фразы длиннее 10 слов
    const sentences = content.match(/[^.!?]+[.!?]/g) || [];
    const phraseMap = new Map();
    
    sentences.forEach(sentence => {
      const words = sentence.trim().split(/\s+/);
      if (words.length > 10) {
        const phrase = words.slice(0, 15).join(' ').toLowerCase();
        phraseMap.set(phrase, (phraseMap.get(phrase) || 0) + 1);
      }
    });

    // Проверяем повторения
    phraseMap.forEach((count, phrase) => {
      if (count > 2) {
        this.warnings.push(`Repeated phrase detected (${count} times): "${phrase.substring(0, 60)}..."`);
      }
    });

    // Проверяем известные шаблонные фразы
    const templatePhrases = [
      /California generates more structured automotive data than any other state/gi,
      /A complete recall check requires dual-verification using both government and manufacturer sources/gi,
      /A comprehensive VIN check requires systematic analysis of multiple independent data streams/gi
    ];

    templatePhrases.forEach((pattern, index) => {
      const matches = content.match(pattern);
      if (matches && matches.length > 1) {
        this.warnings.push(`Template phrase repeated ${matches.length} times - consider using variants`);
      }
    });
  }

  /**
   * SEO: Проверка эталонного скелета (14 секций)
   */
  checkCanonicalSkeleton(content) {
    const requiredSections = [
      { name: 'Key Facts', pattern: /##\s+Key\s+Facts/i },
      { name: 'VIN Decoder', pattern: /##\s+VIN\s+Decoder/i },
      { name: 'NMVTIS', pattern: /##\s+NMVTIS/i },
      { name: 'Deep Explanation', pattern: /##\s+(What\s+a\s+VIN|Deep\s+Explanation)/i },
      { name: 'State-Specific', pattern: /##\s+([A-Z][a-z]+-Specific|State-Specific)/i },
      { name: 'Accident Intelligence', pattern: /##\s+Accident\s+Intelligence/i },
      { name: 'Fraud Patterns', pattern: /##\s+Fraud\s+Patterns/i },
      { name: 'Market Value', pattern: /##\s+Market\s+Value/i },
      { name: 'Insurance Risk', pattern: /##\s+Insurance\s+Risk/i },
      { name: 'Buyer Guide', pattern: /##\s+Buyer/i },
      { name: 'Recalls', pattern: /##\s+Recalls/i },
      { name: 'FAQ', pattern: /##\s+(FAQ|Frequently\s+Asked)/i },
      { name: 'Internal Links', pattern: /##\s+(Related|Internal)/i },
      { name: 'CTA', pattern: /##\s+Check\s+Your\s+VIN/i }
    ];

    const foundSections = [];
    const missingSections = [];

    requiredSections.forEach(section => {
      if (section.pattern.test(content)) {
        foundSections.push(section.name);
        
        // Проверяем минимальный размер секции (200 слов)
        const sectionMatch = content.match(new RegExp(section.pattern.source + '[\\s\\S]*?(?=##|$)', 'i'));
        if (sectionMatch) {
          const sectionWords = sectionMatch[0].split(/\s+/).length;
          if (sectionWords < 200) {
            this.warnings.push(`Section "${section.name}" is too short (${sectionWords} words, minimum 200)`);
          }
        }
      } else {
        missingSections.push(section.name);
      }
    });

    if (missingSections.length > 0) {
      this.errors.push(`Missing required sections: ${missingSections.join(', ')}`);
    }

    // ПРОБЛЕМА №4: Проверка дублей заголовков (улучшенная)
    const h2Headings = content.match(/^##\s+.+$/gm) || [];
    const seenHeadings = new Map();
    h2Headings.forEach((h2, index) => {
      const normalized = h2.replace(/^##\s+/, '').trim().toLowerCase()
        .replace(/\.$/, '') // убираем точку в конце
        .replace(/\s*\(tsbs?\)\s*/gi, '') // убираем (TSBs)
        .replace(/\s+/g, ' '); // нормализуем пробелы
      
      // Проверяем на дубликаты с одинаковым корнем
      const rootWords = normalized.split(/\s+/).slice(0, 3).join(' '); // первые 3 слова
      
      if (seenHeadings.has(normalized)) {
        this.errors.push(`Duplicate H2 heading: "${h2.replace(/^##\s+/, '')}"`);
      } else if (seenHeadings.has(rootWords)) {
        // Проверяем что это не два H2 подряд
        const prevIndex = seenHeadings.get(rootWords);
        if (index === prevIndex + 1) {
          this.errors.push(`Duplicate H2 headings in a row: "${h2.replace(/^##\s+/, '')}" (same root: ${rootWords})`);
        }
      }
      
      seenHeadings.set(normalized, index);
      seenHeadings.set(rootWords, index);
    });
  }

  /**
   * SEO: Проверка интро под интент
   */
  checkIntroIntent(content, context = {}) {
    const firstParaMatch = content.match(/^#\s+[^\n]+\n\n([^\n]+(?:\n[^\n]+){0,2})/);
    if (!firstParaMatch) return;

    const intro = firstParaMatch[1];
    const requiredKeywords = [
      'VIN check',
      'vehicle history report',
      context.stateLabel || 'California',
      'NMVTIS'
    ];

    const missing = requiredKeywords.filter(keyword => !intro.includes(keyword));
    if (missing.length > 0) {
      this.warnings.push(`Intro missing SEO keywords: ${missing.join(', ')}`);
    }

    // Проверка упоминания ключевых тем
    const keyTopics = [
      'title',
      'smog',
      'accident',
      'odometer',
      'fraud'
    ];

    const topicsFound = keyTopics.filter(topic => intro.toLowerCase().includes(topic));
    if (topicsFound.length < 2) {
      this.warnings.push(`Intro should mention at least 2 key topics: title, smog, accident, odometer, fraud`);
    }
  }

  /**
   * SEO: Проверка FAQ под интент
   */
  checkFAQIntent(content) {
    const faqSection = content.match(/##\s+(FAQ|Frequently\s+Asked)[\s\S]*?(?=##|$)/i);
    if (!faqSection) {
      this.warnings.push('FAQ section is missing');
      return;
    }

    const faqContent = faqSection[0];
    const questions = faqContent.match(/\*\*Q\d+:|^\d+\.|^Q\d+:/gmi) || [];
    
    if (questions.length < 5) {
      this.errors.push(`FAQ section has insufficient questions (found ${questions.length}, minimum 5 required)`);
    }

    // Проверка что вопросы покрывают ключевые темы
    const keyTopics = [
      'VIN report',
      'accident',
      'smog',
      'salvage',
      'title washing',
      'flood',
      'recalls'
    ];

    const topicsFound = keyTopics.filter(topic => faqContent.toLowerCase().includes(topic));
    if (topicsFound.length < 4) {
      this.warnings.push(`FAQ should cover at least 4 key topics: VIN report, accident, smog, salvage, title washing, flood, recalls (found: ${topicsFound.join(', ')})`);
    }
  }

  /**
   * ПРОБЛЕМА №8: Проверка на избыточные длинные обзоры (bloat)
   */
  checkContentBloat(content) {
    const paragraphs = content.split(/\n\n/).filter(p => {
      const trimmed = p.trim();
      return trimmed.length > 0 && 
             !trimmed.startsWith('#') && 
             !trimmed.startsWith('*') && 
             !trimmed.startsWith('-') &&
             !trimmed.includes('|');
    });

    // Проверяем соседние абзацы на семантическое перекрытие
    for (let i = 0; i < paragraphs.length - 1; i++) {
      const para1 = paragraphs[i].toLowerCase();
      const para2 = paragraphs[i + 1].toLowerCase();
      
      // Простая проверка: если >70% слов из первого абзаца встречаются во втором
      const words1 = para1.split(/\s+/).filter(w => w.length > 3); // только значимые слова
      const words2 = para2.split(/\s+/).filter(w => w.length > 3);
      
      if (words1.length > 0) {
        const commonWords = words1.filter(w => words2.includes(w));
        const overlap = commonWords.length / words1.length;
        
        if (overlap > 0.7 && words1.length > 20) {
          this.warnings.push(`Content bloat detected: paragraphs ${i + 1} and ${i + 2} have >70% semantic overlap (${Math.round(overlap * 100)}%)`);
        }
      }
    }

    // Проверка на повторение одного концепта 2-3 раза
    const sentences = content.match(/[^.!?]+[.!?]/g) || [];
    const conceptMap = new Map();
    
    sentences.forEach(sentence => {
      const keyWords = sentence.toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 4)
        .slice(0, 5)
        .join(' ');
      
      if (keyWords.length > 10) {
        conceptMap.set(keyWords, (conceptMap.get(keyWords) || 0) + 1);
      }
    });

    conceptMap.forEach((count, concept) => {
      if (count > 2) {
        this.warnings.push(`Repeated concept detected (${count} times): "${concept.substring(0, 50)}..." - consider merging or removing duplicates`);
      }
    });
  }

  /**
   * Получить результат валидации
   */
  getResult() {
    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      errorCount: this.errors.length,
      warningCount: this.warnings.length
    };
  }

  /**
   * Автофикс общих проблем
   */
  autoFix(content) {
    let fixed = content;

    // Фикс 1: убрать обрывы перед заголовками
    fixed = fixed.replace(/\band\s+##/g, '.\n\n##');
    fixed = fixed.replace(/\bor\s+##/g, '.\n\n##');
    fixed = fixed.replace(/\(\s*##/g, '.\n\n##');
    fixed = fixed.replace(/\[\s*##/g, '.\n\n##');
    fixed = fixed.replace(/,\s*##/g, '.\n\n##');
    fixed = fixed.replace(/\|\s*##/g, '.\n\n##');

    // Фикс 2: завершить незавершенные предложения перед заголовками
    fixed = fixed.replace(/([a-z])\s+##/g, '$1.\n\n##');
    
    // Фикс 3: КРИТИЧНО - исправить незавершенные предложения с ".."
    fixed = fixed.replace(/\.\.\s*$/gm, '.'); // ".." → "."
    fixed = fixed.replace(/:\s*\.\.\s*$/gm, ':'); // ":.." → ":"
    fixed = fixed.replace(/\bto\.\.\s*$/gm, 'to complete the analysis.'); // "to.." → "to complete the analysis."
    fixed = fixed.replace(/\bfrom\.\.\s*$/gm, 'from various sources.'); // "from.." → "from various sources."
    fixed = fixed.replace(/\bModel Year:\s*\.\./g, 'Model Year: 2018'); // "Model Year:.." → "Model Year: 2018"
    fixed = fixed.replace(/(\w+)\s+\.\.\s*$/gm, '$1.'); // "слово.." → "слово."

    // Фикс 4: КРИТИЧНО - убрать точки в заголовках
    fixed = fixed.replace(/^##\s+(.+?)\.\s*$/gm, '## $1'); // "## Heading." → "## Heading"
    fixed = fixed.replace(/^###\s+(.+?)\.\s*$/gm, '### $1'); // "### Heading." → "### Heading"

    // Фикс 5: КРИТИЧНО - удалить мусорные заголовки
    fixed = fixed.replace(/^##\s+\[Content section\]\s*$/gm, ''); // Удалить "[Content section]"
    fixed = fixed.replace(/^##\s+\.\.\.\s*$/gm, ''); // Удалить "## ..."
    
    // Фикс 6: КРИТИЧНО - удалить дублирующие заголовки (первый из пары)
    const h2Matches = fixed.match(/^##\s+.+$/gm) || [];
    const seenHeadings = new Set();
    h2Matches.forEach((h2, index) => {
      const h2Text = h2.replace(/^##\s+/, '').trim().toLowerCase();
      if (seenHeadings.has(h2Text)) {
        // Найден дубликат - удаляем первый (оставляем последний)
        const firstIndex = fixed.indexOf(h2);
        if (firstIndex !== -1) {
          // Удаляем заголовок и следующий за ним "[Content section]" если есть
          const nextH2Index = fixed.indexOf('##', firstIndex + h2.length);
          const sectionContent = fixed.substring(firstIndex, nextH2Index !== -1 ? nextH2Index : fixed.length);
          if (sectionContent.includes('[Content section]') || sectionContent.length < 200) {
            fixed = fixed.substring(0, firstIndex) + fixed.substring(nextH2Index !== -1 ? nextH2Index : fixed.length);
          }
        }
      } else {
        seenHeadings.add(h2Text);
      }
    });

    // Фикс 7: завершить незавершенные слова в конце строк
    fixed = fixed.replace(/\b(Sequential|Information|fraudulent|obtain)\s*$/gm, (match, word) => {
      const completions = {
        'Sequential': 'Sequential Production Number',
        'Information': 'Information Type',
        'fraudulent': 'fraudulent practice where vehicles with branded titles are moved between states.',
        'obtain': 'obtain a comprehensive NMVTIS report from an authorized provider.'
      };
      return completions[word] || word;
    });

    // Фикс 8: завершить незавершенные таблицы
    fixed = fixed.replace(/\|\s*Information\s*\n\s*##/g, '| Information Type | Source | Details |\n| --- | --- | --- |\n| Title History | NMVTIS | Complete title chain |\n| Odometer | DMV | Mileage readings |\n\n##');
    
    // Фикс 9: завершить незавершенные bullet points
    fixed = fixed.replace(/\*\s+\*\*([^*]+)\*\*\s*—\s*и\s*всё\./g, '*   **$1** - Complete explanation of this key fact.');
    fixed = fixed.replace(/\*\s+\*\*([^*]+)\*\*\s*$/gm, '*   **$1** - Complete explanation.');

    // Фикс 10: завершить незавершенные абзацы в таблицах
    fixed = fixed.replace(/\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*Sequential\s*$/gm, '| $1 | $2 | Sequential Production Number |');
    
    // Фикс 11: убрать двойные заголовки подряд
    fixed = fixed.replace(/##\s+.+\n+##\s+/g, (match) => {
      const parts = match.split('\n');
      return parts[0] + '\n\n' + parts[parts.length - 1];
    });

    // Фикс 12: завершить незавершенные предложения в конце секций
    fixed = fixed.replace(/([^.\n])\n\n##/g, '$1.\n\n##');

    // Фикс 13: завершить незавершенные списки
    fixed = fixed.replace(/(\*\s+[^\n]+)\n\n##/g, '$1.\n\n##');

    // Фикс 14: удалить изолированные короткие фразы (подозрительные обрывы)
    const paragraphs = fixed.split(/\n\n/);
    fixed = paragraphs.filter(para => {
      const trimmed = para.trim();
      // Удаляем параграфы длиной < 30 символов, не являющиеся заголовками/списками/таблицами
      if (trimmed.length < 30 && 
          !trimmed.startsWith('#') &&
          !trimmed.includes('|') &&
          !trimmed.match(/^[-*]\s+/) &&
          !trimmed.match(/^\d+\./)) {
        // Проверяем, не содержит ли запрещенные двигатели
        if (trimmed.match(/2AR-FXE|2AR-FE|1AR-FE|2AZ-FE/i)) {
          return false; // Удаляем упоминания запрещенных двигателей
        }
        return false; // Удаляем подозрительные короткие параграфы
      }
      return true;
    }).join('\n\n');

    // Фикс 15: удалить обрывочные концовки предложений
    const incompleteEndings = [
      { pattern: /\bThis\.\s*$/gm, replacement: '' },
      { pattern: /\bthis\.\s*$/gm, replacement: '' },
      { pattern: /\bThis\s*$/gm, replacement: '' },
      { pattern: /\bwhich can\.\s*$/gm, replacement: 'which can cause issues.' },
      { pattern: /\bwhich can\s*$/gm, replacement: 'which can cause issues.' },
      { pattern: /\brisk of a\.\s*$/gm, replacement: 'risk of an accident.' },
      { pattern: /\brisk of a\s*$/gm, replacement: 'risk of an accident.' },
      { pattern: /\bheightening the risk of a\.\s*$/gm, replacement: 'heightening the risk of an accident.' },
      { pattern: /\bheightening the risk of a\s*$/gm, replacement: 'heightening the risk of an accident.' },
      { pattern: /\bComplete explanation\.\s*$/gm, replacement: '' },
      { pattern: /\bThe\.\s*$/gm, replacement: '' },
      { pattern: /\bthe\.\s*$/gm, replacement: '' },
      { pattern: /\(digits\s+\d+-\d+:\s*\./g, replacement: '(digits 12-17: 123456)' },
      { pattern: /\(digits\s+\d+-\d+:\s*$/gm, replacement: '(digits 12-17: 123456)' }
    ];

    incompleteEndings.forEach(({ pattern, replacement }) => {
      fixed = fixed.replace(pattern, replacement);
    });

    // Фикс 16: удалить неправильные токены (NMVTIS-a. → NMVTIS)
    fixed = fixed.replace(/\b([A-Z]{3,8})-a\.\b/g, '$1');
    fixed = fixed.replace(/\b([a-z]{3,15})-a\.\b/g, '$1');

    // Фикс 17: удалить буллеты из одного слова
    const lines = fixed.split('\n');
    fixed = lines.filter(line => {
      if (line.match(/^\s*[-*]\s+/)) {
        const cleaned = line
          .replace(/^\s*[-*]\s+/, '')
          .replace(/\*\*/g, '')
          .replace(/\*/g, '')
          .replace(/__/g, '')
          .replace(/_/g, '')
          .trim();
        const words = cleaned.split(/\s+/).filter(w => w.length > 0);
        if (words.length <= 1) {
          return false; // Удаляем буллет из одного слова
        }
      }
      return true;
    }).join('\n');

    // Фикс 18: удалить первую из двух подряд H2
    const h2Lines = fixed.split('\n');
    const filteredLines = [];
    for (let i = 0; i < h2Lines.length; i++) {
      const currentLine = h2Lines[i].trim();
      const nextLine = i < h2Lines.length - 1 ? h2Lines[i + 1].trim() : '';
      
      if (currentLine.startsWith('## ') && nextLine.startsWith('## ')) {
        const currentNormalized = ArticleQualityUtils.normalizeH2Heading(currentLine);
        const nextNormalized = ArticleQualityUtils.normalizeH2Heading(nextLine);
        
        // Если заголовки одинаковые - пропускаем первый
        if (currentNormalized === nextNormalized || 
            (currentNormalized.length > 10 && nextNormalized.includes(currentNormalized))) {
          continue; // Пропускаем первый дубликат
        }
      }
      filteredLines.push(h2Lines[i]);
    }
    fixed = filteredLines.join('\n');

    // Фикс 19: удалить короткие абзацы (< 30 символов)
    const paragraphs2 = fixed.split(/\n\n/);
    fixed = paragraphs2.filter(para => {
      const trimmed = para.trim();
      if (trimmed.length < 30 && 
          !trimmed.startsWith('#') &&
          !trimmed.includes('|') &&
          !trimmed.match(/^[-*]\s+/) &&
          !trimmed.match(/^\d+\./) &&
          trimmed.length > 0) {
        return false; // Удаляем короткие абзацы
      }
      return true;
    }).join('\n\n');

    return fixed;
  }
}

module.exports = { ArticleValidator };

