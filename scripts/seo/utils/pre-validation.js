const { log } = require('../logger');
const { getErrorHandler } = require('./error-handler');

/**
 * SEO MONSTER 6.0: Pre-Validation Engine
 * Предварительная валидация перед генерацией (ТРИЗ оптимизация)
 */
class PreValidationEngine {
  constructor(config) {
    this.config = config;
    this.errorHandler = getErrorHandler();
  }

  /**
   * Валидация URL плана перед генерацией
   */
  validateUrlPlan(urlPlan) {
    const errors = [];
    const warnings = [];
    const validUrls = [];

    for (const item of urlPlan) {
      const validation = this.validateUrlItem(item);
      
      if (validation.valid) {
        validUrls.push(item);
      } else {
        if (validation.critical) {
          errors.push({ item, reason: validation.reason });
        } else {
          warnings.push({ item, reason: validation.reason });
          // Добавляем в валидные, но с предупреждением
          validUrls.push(item);
        }
      }
    }

    if (errors.length > 0) {
      log('PRE-VALIDATION', `Found ${errors.length} critical validation errors`);
      errors.forEach(err => {
        log('PRE-VALIDATION', `Critical: ${err.reason} for ${err.item.url || 'unknown'}`);
      });
    }

    if (warnings.length > 0) {
      log('PRE-VALIDATION', `Found ${warnings.length} validation warnings`);
    }

    return {
      valid: errors.length === 0,
      validUrls,
      errors,
      warnings,
      stats: {
        total: urlPlan.length,
        valid: validUrls.length,
        errors: errors.length,
        warnings: warnings.length
      }
    };
  }

  /**
   * Валидация одного URL item
   */
  validateUrlItem(item) {
    // Проверка обязательных полей
    if (!item.vin) {
      return { valid: false, critical: true, reason: 'Missing VIN' };
    }

    if (!item.stateSlug) {
      return { valid: false, critical: true, reason: 'Missing state slug' };
    }

    if (!item.intent) {
      return { valid: false, critical: false, reason: 'Missing intent, using default' };
    }

    if (!item.lang) {
      return { valid: false, critical: false, reason: 'Missing language, using default' };
    }

    // Проверка формата VIN
    if (item.vin.length < 15 || item.vin.length > 17) {
      return { valid: false, critical: false, reason: 'VIN length unusual, but proceeding' };
    }

    // Проверка валидности state slug
    const validStates = [
      'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado',
      'connecticut', 'delaware', 'florida', 'georgia', 'hawaii', 'idaho',
      'illinois', 'indiana', 'iowa', 'kansas', 'kentucky', 'louisiana',
      'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota',
      'mississippi', 'missouri', 'montana', 'nebraska', 'nevada',
      'new-hampshire', 'new-jersey', 'new-mexico', 'new-york',
      'north-carolina', 'north-dakota', 'ohio', 'oklahoma', 'oregon',
      'pennsylvania', 'rhode-island', 'south-carolina', 'south-dakota',
      'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington',
      'west-virginia', 'wisconsin', 'wyoming', 'district-of-columbia'
    ];

    if (!validStates.includes(item.stateSlug)) {
      return { valid: false, critical: false, reason: `Unknown state slug: ${item.stateSlug}` };
    }

    // Проверка валидности intent
    const validIntents = this.config.intents || [];
    if (validIntents.length > 0 && !validIntents.includes(item.intent)) {
      return { valid: false, critical: false, reason: `Unknown intent: ${item.intent}` };
    }

    // Проверка валидности языка
    const validLanguages = this.config.languages || ['en'];
    if (!validLanguages.includes(item.lang)) {
      return { valid: false, critical: false, reason: `Unknown language: ${item.lang}` };
    }

    return { valid: true };
  }

  /**
   * Предварительная проверка ресурсов
   */
  validateResources() {
    const checks = {
      diskSpace: this.checkDiskSpace(),
      apiKeys: this.checkAPIKeys(),
      config: this.checkConfig()
    };

    const allValid = Object.values(checks).every(check => check.valid);

    return {
      valid: allValid,
      checks,
      canProceed: allValid
    };
  }

  /**
   * Проверка дискового пространства (упрощенная)
   */
  checkDiskSpace() {
    // В production это можно расширить
    return { valid: true, message: 'Disk space check skipped in current implementation' };
  }

  /**
   * Проверка наличия API ключей
   */
  checkAPIKeys() {
    const hasGroq = !!process.env.GROQ_API_KEY;
    const hasDeepSeek = !!process.env.DEEPSEEK_API_KEY;
    const hasOpenAI = !!process.env.OPENAI_API_KEY;

    const hasAny = hasGroq || hasDeepSeek || hasOpenAI;

    return {
      valid: hasAny,
      hasGroq,
      hasDeepSeek,
      hasOpenAI,
      message: hasAny 
        ? 'At least one API key available' 
        : 'Warning: No API keys found, AI features will be disabled'
    };
  }

  /**
   * Проверка конфигурации
   */
  checkConfig() {
    const required = ['targetPagesPerBuild', 'minQualityScore'];
    const missing = required.filter(key => !this.config[key]);

    return {
      valid: missing.length === 0,
      missing,
      message: missing.length === 0 
        ? 'Configuration valid' 
        : `Missing required config keys: ${missing.join(', ')}`
    };
  }
}

module.exports = { PreValidationEngine };


