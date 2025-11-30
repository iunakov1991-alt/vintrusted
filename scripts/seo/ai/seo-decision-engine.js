const { callDeepseekChat } = require('../../ai/deepseek-client');
const { callGroqChat } = require('../../ai/groq-client');
const fs = require('fs');
const path = require('path');
const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: AI Decision Engine
 * Умная система принятия решений для SEO стратегии
 */
class SEODecisionEngine {
  constructor(config) {
    this.config = config;
    this.decisionsPath = path.join(process.cwd(), 'data/seo/ai-decisions.json');
    this.loadHistory();
  }

  loadHistory() {
    try {
      if (fs.existsSync(this.decisionsPath)) {
        this.history = JSON.parse(fs.readFileSync(this.decisionsPath, 'utf8'));
      } else {
        this.history = {
          decisions: [],
          performance: {},
          lastUpdated: null
        };
      }
    } catch (e) {
      this.history = {
        decisions: [],
        performance: {},
        lastUpdated: null
      };
    }
  }

  saveHistory() {
    try {
      const dir = path.dirname(this.decisionsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.decisionsPath, JSON.stringify(this.history, null, 2), 'utf8');
    } catch (e) {
      log('AI-DECISION', 'Failed to save history', e);
    }
  }

  /**
   * Подсчет существующих страниц
   */
  countExistingPages() {
    const vinDir = path.join(process.cwd(), 'public', 'vin');
    let totalPages = 0;
    let pagesByState = {};
    let pagesByIntent = {};
    
    if (fs.existsSync(vinDir)) {
      const states = fs.readdirSync(vinDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory());
      
      for (const state of states) {
        const statePath = path.join(vinDir, state.name);
        const vins = fs.readdirSync(statePath, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory());
        
        for (const vin of vins) {
          const vinPath = path.join(statePath, vin.name);
          const indexFile = path.join(vinPath, 'index.html');
          if (fs.existsSync(indexFile)) {
            totalPages++;
            pagesByState[state.name] = (pagesByState[state.name] || 0) + 1;
          }
        }
      }
    }

    return { totalPages, pagesByState, pagesByIntent };
  }

  /**
   * Получение метрик последних билдов
   */
  getBuildMetrics() {
    const buildHistoryPath = path.join(process.cwd(), 'data/seo/build-history.jsonl');
    const metrics = {
      recentBuilds: [],
      avgQuality: 0,
      avgAccepted: 0,
      avgRejected: 0,
      successRate: 1.0,
      trend: 'stable'
    };

    if (fs.existsSync(buildHistoryPath)) {
      const lines = fs.readFileSync(buildHistoryPath, 'utf8')
        .split('\n')
        .filter(line => line.trim())
        .slice(-10); // Последние 10 билдов

      const builds = lines.map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      }).filter(b => b);

      if (builds.length > 0) {
        metrics.recentBuilds = builds;
        metrics.avgQuality = builds.reduce((sum, b) => sum + (b.avgQuality || 0), 0) / builds.length;
        metrics.avgAccepted = builds.reduce((sum, b) => sum + (b.pagesAccepted || 0), 0) / builds.length;
        metrics.avgRejected = builds.reduce((sum, b) => sum + ((b.pagesGenerated || 0) - (b.pagesAccepted || 0)), 0) / builds.length;
        metrics.successRate = builds.filter(b => b.pagesAccepted > 0).length / builds.length;

        // Определение тренда
        if (builds.length >= 2) {
          const recent = builds.slice(-3);
          const older = builds.slice(-6, -3);
          if (older.length > 0) {
            const recentAvg = recent.reduce((sum, b) => sum + (b.pagesAccepted || 0), 0) / recent.length;
            const olderAvg = older.reduce((sum, b) => sum + (b.pagesAccepted || 0), 0) / older.length;
            if (recentAvg > olderAvg * 1.1) metrics.trend = 'improving';
            else if (recentAvg < olderAvg * 0.9) metrics.trend = 'declining';
          }
        }
      }
    }

    return metrics;
  }

  /**
   * Получение GSC метрик (если есть)
   */
  getGSCMetrics() {
    const gscCachePath = path.join(process.cwd(), 'data/seo/gsc-cache.json');
    if (!fs.existsSync(gscCachePath)) {
      return null;
    }

    try {
      const gscData = JSON.parse(fs.readFileSync(gscCachePath, 'utf8'));
      const urls = Object.values(gscData);
      if (urls.length === 0) return null;

      const totalClicks = urls.reduce((sum, u) => sum + (u.clicks || 0), 0);
      const totalImpressions = urls.reduce((sum, u) => sum + (u.impressions || 0), 0);
      const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const avgPosition = urls.reduce((sum, u) => sum + (u.position || 0), 0) / urls.length;

      return {
        totalClicks,
        totalImpressions,
        avgCTR,
        avgPosition,
        urlsWithData: urls.length
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * AI принятие решения о количестве страниц
   */
  async makeDecision(context = {}) {
    const existing = this.countExistingPages();
    const buildMetrics = this.getBuildMetrics();
    const gscMetrics = this.getGSCMetrics();
    const rlStatePath = path.join(process.cwd(), 'data/seo/rl-state.json');
    let rlState = {};
    if (fs.existsSync(rlStatePath)) {
      rlState = JSON.parse(fs.readFileSync(rlStatePath, 'utf8'));
    }

    // Формируем контекст для AI
    const aiContext = {
      existingPages: existing.totalPages,
      pagesByState: existing.pagesByState,
      buildMetrics: {
        avgQuality: buildMetrics.avgQuality,
        avgAccepted: buildMetrics.avgAccepted,
        avgRejected: buildMetrics.avgRejected,
        successRate: buildMetrics.successRate,
        trend: buildMetrics.trend,
        recentBuildsCount: buildMetrics.recentBuilds.length
      },
      gscMetrics: gscMetrics ? {
        totalClicks: gscMetrics.totalClicks,
        avgCTR: gscMetrics.avgCTR,
        avgPosition: gscMetrics.avgPosition,
        urlsWithData: gscMetrics.urlsWithData
      } : null,
      config: {
        targetPagesPerBuild: this.config.targetPagesPerBuild || 10000,
        minQualityScore: this.config.minQualityScore || 0.70,
        maxPagesPerCluster: this.config.maxPagesPerCluster || 500
      },
      rlState: {
        intentsCount: Object.keys(rlState.intentWeights || {}).length,
        languagesCount: Object.keys(rlState.languageWeights || {}).length,
        lastUpdated: rlState.lastUpdated
      },
      ...context
    };

    // AI промпт для принятия решения
    const aiPrompt = `You are an expert SEO strategist and machine learning engineer. Your task is to decide how many pages to generate in the next build to maximize SEO performance and conversions.

CONTEXT:
- Existing pages: ${aiContext.existingPages}
- Average quality score: ${aiContext.buildMetrics.avgQuality.toFixed(3)}
- Average pages accepted per build: ${aiContext.buildMetrics.avgAccepted.toFixed(0)}
- Average pages rejected per build: ${aiContext.buildMetrics.avgRejected.toFixed(0)}
- Build success rate: ${(aiContext.buildMetrics.successRate * 100).toFixed(1)}%
- Quality trend: ${aiContext.buildMetrics.trend}
${aiContext.gscMetrics ? `
- GSC total clicks: ${aiContext.gscMetrics.totalClicks}
- GSC average CTR: ${aiContext.gscMetrics.avgCTR.toFixed(2)}%
- GSC average position: ${aiContext.gscMetrics.avgPosition.toFixed(1)}
- URLs with GSC data: ${aiContext.gscMetrics.urlsWithData}
` : '- No GSC data available yet'}
- Config target: ${aiContext.config.targetPagesPerBuild} pages
- Min quality threshold: ${aiContext.config.minQualityScore}

STRATEGY GOALS:
1. Maximize SEO coverage and organic traffic
2. Maximize conversion potential
3. Maintain high quality (quality score >= ${aiContext.config.minQualityScore})
4. Optimize resource usage
5. Learn from past performance

DECISION RULES:
- If pages < 100: Aggressive growth (15000-20000 pages) to establish presence
- If pages 100-1000: Standard growth (10000-15000 pages) to expand coverage
- If pages 1000-10000: Balanced growth (8000-12000 pages) to optimize coverage
- If pages > 10000: Selective growth (5000-8000 pages) to fill gaps
- If pages > 50000: Maintenance mode (1000-3000 pages) to update existing
- Adjust based on quality trend: if declining, reduce quantity, if improving, maintain or increase
- If GSC shows low CTR: focus on quality over quantity
- If GSC shows high CTR: can increase quantity
- Consider rejection rate: if high (>30%), reduce target to maintain quality

RESPOND WITH JSON:
{
  "targetPages": <number>,
  "reasoning": "<detailed explanation in Russian>",
  "strategy": "<strategy name>",
  "confidence": <0-1>,
  "recommendations": ["<recommendation1>", "<recommendation2>"],
  "expectedOutcome": "<what to expect>"
}`;

    try {
      // Используем DeepSeek для принятия решения
      const response = await callDeepseekChat({
        messages: [
          {
            role: 'system',
            content: 'You are an expert SEO strategist. Always respond with valid JSON only, no additional text.'
          },
          {
            role: 'user',
            content: aiPrompt
          }
        ],
        temperature: 0.3,
        maxTokens: 1000
      });

      // Парсим JSON ответ
      let decision;
      try {
        // Извлекаем JSON из ответа (может быть обернут в markdown)
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          decision = JSON.parse(jsonMatch[0]);
        } else {
          decision = JSON.parse(response);
        }
      } catch (e) {
        // Fallback на базовую логику
        decision = this.fallbackDecision(aiContext);
      }

      // Валидация и корректировка
      decision.targetPages = Math.max(100, Math.min(20000, Math.round(decision.targetPages || 10000)));
      decision.confidence = Math.max(0, Math.min(1, decision.confidence || 0.7));
      
      if (!decision.reasoning) {
        decision.reasoning = this.generateReasoning(aiContext, decision);
      }
      if (!decision.strategy) {
        decision.strategy = this.determineStrategy(aiContext);
      }
      if (!decision.recommendations) {
        decision.recommendations = [];
      }
      if (!decision.expectedOutcome) {
        decision.expectedOutcome = this.generateExpectedOutcome(aiContext, decision);
      }

      // Сохраняем решение в историю
      decision.timestamp = new Date().toISOString();
      decision.context = aiContext;
      this.history.decisions.push(decision);
      if (this.history.decisions.length > 50) {
        this.history.decisions = this.history.decisions.slice(-50);
      }
      this.saveHistory();

      log('AI-DECISION', `Decision made: ${decision.targetPages} pages, strategy: ${decision.strategy}, confidence: ${decision.confidence.toFixed(2)}`);

      return decision;
    } catch (error) {
      log('AI-DECISION', 'AI decision failed, using fallback', error);
      return this.fallbackDecision(aiContext);
    }
  }

  /**
   * Fallback решение (если AI недоступен)
   */
  fallbackDecision(context) {
    const existing = context.existingPages;
    let targetPages = 10000;
    let strategy = 'standard';
    let reasoning = '';

    if (existing < 100) {
      targetPages = 15000;
      strategy = 'aggressive-growth';
      reasoning = 'Мало страниц (<100). Агрессивный рост для установления присутствия.';
    } else if (existing < 1000) {
      targetPages = 12000;
      strategy = 'standard-growth';
      reasoning = 'Средний объем (100-1000). Стандартный рост для расширения покрытия.';
    } else if (existing < 10000) {
      targetPages = 10000;
      strategy = 'balanced-growth';
      reasoning = 'Хороший объем (1000-10000). Сбалансированный рост.';
    } else if (existing < 50000) {
      targetPages = 5000;
      strategy = 'selective-growth';
      reasoning = 'Большой объем (>10000). Селективный рост для заполнения пробелов.';
    } else {
      targetPages = 2000;
      strategy = 'maintenance';
      reasoning = 'Очень большой объем (>50000). Режим обновления существующих страниц.';
    }

    // Корректировка на основе качества
    if (context.buildMetrics.avgQuality < 0.70) {
      targetPages = Math.floor(targetPages * 0.7);
      reasoning += ' Снижено из-за низкого качества.';
    } else if (context.buildMetrics.avgQuality > 0.85) {
      targetPages = Math.floor(targetPages * 1.1);
      reasoning += ' Увеличено из-за высокого качества.';
    }

    // Корректировка на основе rejection rate
    const rejectionRate = context.buildMetrics.avgRejected / (context.buildMetrics.avgAccepted + context.buildMetrics.avgRejected || 1);
    if (rejectionRate > 0.3) {
      targetPages = Math.floor(targetPages * 0.8);
      reasoning += ' Снижено из-за высокого процента отклонений.';
    }

    return {
      targetPages: Math.max(100, Math.min(20000, targetPages)),
      reasoning,
      strategy,
      confidence: 0.7,
      recommendations: [],
      expectedOutcome: `Ожидается генерация ~${targetPages} страниц с учетом отсеивания.`
    };
  }

  /**
   * Генерация reasoning (fallback)
   */
  generateReasoning(context, decision) {
    return `Решение основано на анализе ${context.existingPages} существующих страниц, среднем качестве ${context.buildMetrics.avgQuality.toFixed(3)}, и тренде ${context.buildMetrics.trend}.`;
  }

  /**
   * Определение стратегии (fallback)
   */
  determineStrategy(context) {
    const existing = context.existingPages;
    if (existing < 100) return 'aggressive-growth';
    if (existing < 1000) return 'standard-growth';
    if (existing < 10000) return 'balanced-growth';
    if (existing < 50000) return 'selective-growth';
    return 'maintenance';
  }

  /**
   * Генерация expected outcome (fallback)
   */
  generateExpectedOutcome(context, decision) {
    const expectedAccepted = Math.floor(decision.targetPages * (1 - (context.buildMetrics.avgRejected / (context.buildMetrics.avgAccepted + context.buildMetrics.avgRejected || 1))));
    return `Ожидается ~${expectedAccepted} принятых страниц из ${decision.targetPages} сгенерированных.`;
  }

  /**
   * Получение рекомендации для дашборда
   */
  async getDashboardRecommendation() {
    const decision = await this.makeDecision();
    const existing = this.countExistingPages();

    return {
      shouldBuild: true, // Всегда можно запустить билд
      urgency: existing.totalPages < 100 ? 'high' : existing.totalPages < 1000 ? 'medium' : 'low',
      recommendation: decision.reasoning,
      targetPages: decision.targetPages,
      strategy: decision.strategy,
      confidence: decision.confidence,
      recommendations: decision.recommendations,
      expectedOutcome: decision.expectedOutcome,
      aiPowered: true
    };
  }

  /**
   * Обновление производительности решений (обучение)
   */
  updatePerformance(decisionId, actualResults) {
    if (!this.history.performance[decisionId]) {
      this.history.performance[decisionId] = {
        decision: null,
        actual: null,
        score: 0
      };
    }

    const decision = this.history.decisions.find(d => d.timestamp === decisionId);
    if (decision) {
      this.history.performance[decisionId] = {
        decision: {
          targetPages: decision.targetPages,
          strategy: decision.strategy
        },
        actual: actualResults,
        score: this.calculateScore(decision, actualResults),
        updatedAt: new Date().toISOString()
      };
      this.saveHistory();
    }
  }

  /**
   * Расчет score для обучения
   */
  calculateScore(decision, actual) {
    let score = 0.5; // Базовый score

    // Точность предсказания количества
    const pagesDiff = Math.abs(decision.targetPages - (actual.pagesGenerated || 0));
    const pagesAccuracy = 1 - Math.min(pagesDiff / decision.targetPages, 1);
    score += pagesAccuracy * 0.3;

    // Качество результата
    if (actual.avgQuality) {
      score += (actual.avgQuality - 0.7) * 0.5; // Бонус за качество выше 0.7
    }

    // Acceptance rate
    if (actual.pagesGenerated && actual.pagesAccepted) {
      const acceptanceRate = actual.pagesAccepted / actual.pagesGenerated;
      score += (acceptanceRate - 0.7) * 0.2; // Бонус за высокий acceptance rate
    }

    return Math.max(0, Math.min(1, score));
  }
}

module.exports = { SEODecisionEngine };

