const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Smart Cache Invalidation
 * Умная инвалидация кеша по контексту (ТРИЗ приоритет #3)
 */
class SmartCacheInvalidation {
  constructor(config) {
    this.config = config;
    this.invalidationRules = new Map();
    this.cacheDependencies = new Map(); // key -> [dependentKeys]
    this.contextHistory = new Map(); // key -> [contexts]
  }

  /**
   * Регистрация правила инвалидации
   */
  registerRule(key, rule) {
    this.invalidationRules.set(key, rule);
  }

  /**
   * Регистрация зависимости
   */
  registerDependency(key, dependentKey) {
    if (!this.cacheDependencies.has(key)) {
      this.cacheDependencies.set(key, []);
    }
    this.cacheDependencies.get(key).push(dependentKey);
  }

  /**
   * Проверка, нужно ли инвалидировать кеш
   */
  shouldInvalidate(key, context = {}) {
    const rule = this.invalidationRules.get(key);
    
    if (!rule) {
      return false; // Нет правила - не инвалидируем
    }

    // Проверка по времени
    if (rule.maxAge) {
      const cachedAt = context.cachedAt || 0;
      const age = Date.now() - cachedAt;
      if (age > rule.maxAge) {
        return true;
      }
    }

    // Проверка по контексту
    if (rule.contextConditions) {
      for (const condition of rule.contextConditions) {
        if (this.evaluateCondition(condition, context)) {
          return true;
        }
      }
    }

    // Проверка по зависимостям
    if (rule.dependencies) {
      for (const dep of rule.dependencies) {
        if (context[dep] !== this.getLastKnownValue(dep)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Инвалидация кеша с учетом зависимостей
   */
  invalidate(key, cascade = true) {
    const invalidated = [key];

    // Каскадная инвалидация зависимых ключей
    if (cascade) {
      const dependents = this.cacheDependencies.get(key) || [];
      for (const dependent of dependents) {
        invalidated.push(...this.invalidate(dependent, true));
      }
    }

    log('SMART-CACHE', `Invalidated ${invalidated.length} cache entries for key: ${key}`);
    return invalidated;
  }

  /**
   * Умная инвалидация на основе контекста
   */
  smartInvalidate(key, context = {}) {
    if (this.shouldInvalidate(key, context)) {
      return this.invalidate(key, true);
    }
    return [];
  }

  /**
   * Оценка условия
   */
  evaluateCondition(condition, context) {
    const { field, operator, value } = condition;

    const contextValue = context[field];
    if (contextValue === undefined) {
      return false;
    }

    switch (operator) {
      case 'equals':
        return contextValue === value;
      case 'notEquals':
        return contextValue !== value;
      case 'greaterThan':
        return contextValue > value;
      case 'lessThan':
        return contextValue < value;
      case 'changed':
        return contextValue !== this.getLastKnownValue(field);
      default:
        return false;
    }
  }

  /**
   * Получение последнего известного значения
   */
  getLastKnownValue(field) {
    // В реальной реализации это должно храниться в персистентном хранилище
    return null;
  }

  /**
   * Установка правила по умолчанию
   */
  setDefaultRule(key, maxAge = 3600000) { // 1 час по умолчанию
    this.registerRule(key, {
      maxAge,
      contextConditions: [],
      dependencies: []
    });
  }
}

module.exports = { SmartCacheInvalidation };


