const { log } = require('../logger');
const fs = require('fs');
const path = require('path');

/**
 * SEO MONSTER 6.0: Transparency Mode
 * Полная видимость решений AI (ТРИЗ приоритет #5)
 */
class TransparencyMode {
  constructor(config) {
    this.config = config;
    this.enabled = config.transparencyMode?.enabled !== false;
    this.decisions = [];
    this.maxDecisions = 1000;
    this.logPath = path.join(process.cwd(), 'data/seo/transparency-log.jsonl');
  }

  /**
   * Логирование решения AI
   */
  logDecision(decision) {
    if (!this.enabled) return;

    const entry = {
      timestamp: Date.now(),
      decision: {
        type: decision.type,
        input: this.sanitizeInput(decision.input),
        output: decision.output,
        reasoning: decision.reasoning,
        confidence: decision.confidence,
        alternatives: decision.alternatives || [],
        metrics: decision.metrics || {}
      },
      context: this.sanitizeContext(decision.context || {})
    };

    this.decisions.push(entry);
    
    // Ограничиваем размер в памяти
    if (this.decisions.length > this.maxDecisions) {
      this.decisions = this.decisions.slice(-this.maxDecisions);
    }

    // Сохраняем в файл
    this.saveToFile(entry);

    log('TRANSPARENCY', `Decision logged: ${decision.type}`);
  }

  /**
   * Получение истории решений
   */
  getDecisionHistory(filter = {}) {
    let filtered = [...this.decisions];

    if (filter.type) {
      filtered = filtered.filter(d => d.decision.type === filter.type);
    }

    if (filter.since) {
      filtered = filtered.filter(d => d.timestamp >= filter.since);
    }

    if (filter.limit) {
      filtered = filtered.slice(-filter.limit);
    }

    return filtered;
  }

  /**
   * Получение объяснения решения
   */
  explainDecision(decisionId) {
    const decision = this.decisions.find(d => d.timestamp === decisionId);
    if (!decision) {
      return null;
    }

    return {
      decision: decision.decision,
      explanation: this.generateExplanation(decision),
      alternatives: decision.decision.alternatives,
      impact: this.estimateImpact(decision)
    };
  }

  /**
   * Генерация объяснения
   */
  generateExplanation(entry) {
    const { decision } = entry;
    const explanation = [];

    explanation.push(`Decision Type: ${decision.type}`);
    explanation.push(`Confidence: ${(decision.confidence * 100).toFixed(1)}%`);
    
    if (decision.reasoning) {
      explanation.push(`Reasoning: ${decision.reasoning}`);
    }

    if (decision.metrics) {
      explanation.push(`Metrics: ${JSON.stringify(decision.metrics)}`);
    }

    if (decision.alternatives && decision.alternatives.length > 0) {
      explanation.push(`Alternatives considered: ${decision.alternatives.length}`);
    }

    return explanation.join('\n');
  }

  /**
   * Оценка влияния решения
   */
  estimateImpact(entry) {
    // Упрощенная оценка влияния
    return {
      estimated: true,
      impact: 'medium', // low, medium, high
      affectedAreas: ['performance', 'quality']
    };
  }

  /**
   * Очистка чувствительных данных из входа
   */
  sanitizeInput(input) {
    if (typeof input !== 'object' || input === null) {
      return input;
    }

    const sanitized = { ...input };
    delete sanitized.apiKey;
    delete sanitized.token;
    delete sanitized.password;
    delete sanitized.secret;
    
    return sanitized;
  }

  /**
   * Очистка контекста
   */
  sanitizeContext(context) {
    return this.sanitizeInput(context);
  }

  /**
   * Сохранение в файл
   */
  saveToFile(entry) {
    try {
      const line = JSON.stringify(entry) + '\n';
      fs.appendFileSync(this.logPath, line, 'utf8');
    } catch (e) {
      // Игнорируем ошибки записи
    }
  }

  /**
   * Получение статистики решений
   */
  getStats() {
    const stats = {
      total: this.decisions.length,
      byType: {},
      avgConfidence: 0,
      recentDecisions: this.decisions.slice(-10).length
    };

    if (this.decisions.length > 0) {
      const confidences = this.decisions
        .map(d => d.decision.confidence || 0)
        .filter(c => c > 0);
      
      stats.avgConfidence = confidences.length > 0
        ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length
        : 0;

      // Группировка по типам
      for (const entry of this.decisions) {
        const type = entry.decision.type;
        stats.byType[type] = (stats.byType[type] || 0) + 1;
      }
    }

    return stats;
  }
}

module.exports = { TransparencyMode };


