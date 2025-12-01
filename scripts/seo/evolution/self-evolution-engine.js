const { log } = require('../logger');
const fs = require('fs');
const path = require('path');

/**
 * SEO MONSTER 6.0: Self-Evolution Engine
 * Самоэволюция системы на основе опыта (ТРИЗ приоритет #8)
 */
class SelfEvolutionEngine {
  constructor(config) {
    this.config = config;
    this.evolutionHistory = [];
    this.mutations = new Map(); // mutationId -> { applied: false, success: null }
    this.maxHistorySize = 200;
    this.evolutionPath = path.join(process.cwd(), 'data/seo/evolution-history.jsonl');
  }

  /**
   * Анализ результатов и эволюция
   */
  async evolve(buildResults, metrics = {}) {
    log('SELF-EVOLUTION', 'Starting evolution analysis');

    // Анализируем результаты
    const analysis = this.analyzeResults(buildResults, metrics);
    
    // Генерируем мутации
    const mutations = this.generateMutations(analysis);
    
    // Оцениваем мутации
    const evaluated = this.evaluateMutations(mutations, analysis);
    
    // Применяем лучшие мутации
    const applied = await this.applyMutations(evaluated);
    
    // Сохраняем историю
    this.saveEvolutionStep({
      timestamp: Date.now(),
      analysis,
      mutations: evaluated,
      applied,
      metrics
    });

    log('SELF-EVOLUTION', `Evolution completed: ${applied.length} mutations applied`);

    return {
      analysis,
      mutations: evaluated,
      applied,
      recommendations: this.generateRecommendations(analysis)
    };
  }

  /**
   * Анализ результатов билда
   */
  analyzeResults(buildResults, metrics) {
    const {
      pagesGenerated = 0,
      pagesAccepted = 0,
      avgQuality = 0,
      duration = 0,
      errors = 0
    } = buildResults;

    const acceptanceRate = pagesGenerated > 0 ? pagesAccepted / pagesGenerated : 0;
    const efficiency = pagesGenerated > 0 ? pagesGenerated / (duration / 1000) : 0; // pages per second
    const errorRate = pagesGenerated > 0 ? errors / pagesGenerated : 0;

    // Сравниваем с предыдущими результатами
    const previous = this.getPreviousResults();
    const improvement = previous ? {
      acceptanceRate: acceptanceRate - previous.acceptanceRate,
      avgQuality: avgQuality - previous.avgQuality,
      efficiency: efficiency - previous.efficiency,
      errorRate: errorRate - previous.errorRate
    } : null;

    return {
      acceptanceRate,
      avgQuality,
      efficiency,
      errorRate,
      improvement,
      isImproving: improvement ? (
        improvement.acceptanceRate > 0 &&
        improvement.avgQuality > 0 &&
        improvement.errorRate < 0
      ) : null
    };
  }

  /**
   * Генерация мутаций на основе анализа
   */
  generateMutations(analysis) {
    const mutations = [];

    // Если качество падает - мутации для улучшения качества
    if (analysis.avgQuality < 0.75) {
      mutations.push({
        id: 'increase_quality_threshold',
        type: 'config',
        target: 'minQualityScore',
        action: 'increase',
        value: 0.05,
        reason: 'Quality is below target'
      });
    }

    // Если эффективность низкая - мутации для ускорения
    if (analysis.efficiency < 1) {
      mutations.push({
        id: 'increase_concurrency',
        type: 'config',
        target: 'concurrency',
        action: 'increase',
        value: 2,
        reason: 'Efficiency is low'
      });
    }

    // Если ошибок много - мутации для надежности
    if (analysis.errorRate > 0.1) {
      mutations.push({
        id: 'enable_error_isolation',
        type: 'feature',
        target: 'errorIsolation',
        action: 'enable',
        reason: 'Error rate is high'
      });
    }

    // Если acceptance rate низкий - мутации для улучшения генерации
    if (analysis.acceptanceRate < 0.8) {
      mutations.push({
        id: 'improve_content_generation',
        type: 'strategy',
        target: 'contentGeneration',
        action: 'optimize',
        reason: 'Acceptance rate is low'
      });
    }

    // Если улучшения нет - экспериментируем
    if (analysis.isImproving === false) {
      mutations.push({
        id: 'experiment_with_layouts',
        type: 'strategy',
        target: 'layoutSelection',
        action: 'experiment',
        reason: 'No improvement detected'
      });
    }

    return mutations;
  }

  /**
   * Оценка мутаций
   */
  evaluateMutations(mutations, analysis) {
    return mutations.map(mutation => {
      let score = 0.5; // Базовый score

      // Оцениваем потенциальное влияние
      if (mutation.type === 'config') {
        score += 0.2; // Конфигурационные изменения безопаснее
      } else if (mutation.type === 'feature') {
        score += 0.1; // Включение функций - средний риск
      } else if (mutation.type === 'strategy') {
        score -= 0.1; // Изменение стратегии - выше риск
      }

      // Учитываем текущее состояние
      if (mutation.reason.includes('Quality')) {
        score += analysis.avgQuality < 0.7 ? 0.3 : 0.1;
      }
      if (mutation.reason.includes('Efficiency')) {
        score += analysis.efficiency < 0.5 ? 0.3 : 0.1;
      }
      if (mutation.reason.includes('Error')) {
        score += analysis.errorRate > 0.15 ? 0.3 : 0.1;
      }

      return {
        ...mutation,
        score: Math.min(1, Math.max(0, score)),
        evaluated: true
      };
    }).sort((a, b) => b.score - a.score); // Сортируем по score
  }

  /**
   * Применение мутаций
   */
  async applyMutations(evaluatedMutations) {
    const applied = [];
    const threshold = 0.6; // Порог для применения

    for (const mutation of evaluatedMutations) {
      if (mutation.score < threshold) {
        continue; // Слишком низкий score
      }

      try {
        const result = await this.applyMutation(mutation);
        applied.push({
          ...mutation,
          applied: true,
          appliedAt: Date.now(),
          result
        });
        log('SELF-EVOLUTION', `Applied mutation: ${mutation.id}`);
      } catch (e) {
        log('SELF-EVOLUTION', `Failed to apply mutation ${mutation.id}: ${e.message}`);
        applied.push({
          ...mutation,
          applied: false,
          error: e.message
        });
      }
    }

    return applied;
  }

  /**
   * Применение конкретной мутации
   */
  async applyMutation(mutation) {
    // В реальной реализации это должно изменять конфигурацию или стратегию
    // Здесь мы только логируем и сохраняем намерение
    
    switch (mutation.type) {
      case 'config':
        // Изменение конфигурации должно быть применено через ConfigManager
        return {
          type: 'config_change',
          target: mutation.target,
          action: mutation.action,
          value: mutation.value,
          note: 'Config change queued for next build'
        };

      case 'feature':
        // Включение/выключение функций через feature flags
        return {
          type: 'feature_toggle',
          target: mutation.target,
          action: mutation.action,
          note: 'Feature flag updated'
        };

      case 'strategy':
        // Изменение стратегии требует более глубокой интеграции
        return {
          type: 'strategy_change',
          target: mutation.target,
          action: mutation.action,
          note: 'Strategy change requires manual review'
        };

      default:
        throw new Error(`Unknown mutation type: ${mutation.type}`);
    }
  }

  /**
   * Генерация рекомендаций
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    if (analysis.avgQuality < 0.7) {
      recommendations.push({
        priority: 'high',
        action: 'Improve content quality',
        reason: `Average quality (${analysis.avgQuality.toFixed(2)}) is below target (0.7)`
      });
    }

    if (analysis.efficiency < 1) {
      recommendations.push({
        priority: 'medium',
        action: 'Optimize build process',
        reason: `Efficiency (${analysis.efficiency.toFixed(2)} pages/s) is low`
      });
    }

    if (analysis.errorRate > 0.1) {
      recommendations.push({
        priority: 'high',
        action: 'Reduce error rate',
        reason: `Error rate (${(analysis.errorRate * 100).toFixed(1)}%) is too high`
      });
    }

    if (analysis.acceptanceRate < 0.8) {
      recommendations.push({
        priority: 'high',
        action: 'Improve acceptance rate',
        reason: `Acceptance rate (${(analysis.acceptanceRate * 100).toFixed(1)}%) is below target (80%)`
      });
    }

    return recommendations;
  }

  /**
   * Получение предыдущих результатов
   */
  getPreviousResults() {
    if (this.evolutionHistory.length === 0) {
      return null;
    }

    const last = this.evolutionHistory[this.evolutionHistory.length - 1];
    return last.analysis;
  }

  /**
   * Сохранение шага эволюции
   */
  saveEvolutionStep(step) {
    this.evolutionHistory.push(step);
    
    if (this.evolutionHistory.length > this.maxHistorySize) {
      this.evolutionHistory = this.evolutionHistory.slice(-this.maxHistorySize);
    }

    // Сохраняем в файл
    try {
      const line = JSON.stringify(step) + '\n';
      fs.appendFileSync(this.evolutionPath, line, 'utf8');
    } catch (e) {
      // Игнорируем ошибки записи
    }
  }

  /**
   * Получение статистики
   */
  getStats() {
    return {
      totalEvolutions: this.evolutionHistory.length,
      totalMutations: this.mutations.size,
      appliedMutations: Array.from(this.mutations.values()).filter(m => m.applied).length,
      recentImprovements: this.evolutionHistory
        .slice(-10)
        .filter(h => h.analysis.isImproving === true).length
    };
  }
}

module.exports = { SelfEvolutionEngine };


