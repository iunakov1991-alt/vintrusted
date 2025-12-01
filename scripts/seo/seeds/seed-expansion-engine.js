const fs = require('fs');
const path = require('path');
const { log } = require('../logger');
// ТРИЗ оптимизация: используем объединенный модуль
const { SeedAnalyzerGenerator } = require('./seed-analyzer-generator');
// Обратная совместимость: если старые модули нужны
let SeedAnalyzer, SeedGenerator;
try {
  const oldAnalyzer = require('./seed-analyzer');
  const oldGenerator = require('./seed-generator');
  SeedAnalyzer = oldAnalyzer.SeedAnalyzer;
  SeedGenerator = oldGenerator.SeedGenerator;
} catch (e) {
  // Старые модули не найдены - используем только новый
  SeedAnalyzer = SeedAnalyzerGenerator;
  SeedGenerator = SeedAnalyzerGenerator;
}
const { AIAugmentation } = require('../content/ai-augmentation');

/**
 * SEO MONSTER 6.0: Seed Expansion Engine
 * Основной модуль для расширения seed-list перед каждым билдом
 */
class SeedExpansionEngine {
  constructor(config) {
    this.config = config;
    // ТРИЗ оптимизация: используем объединенный модуль
    this.analyzerGenerator = new SeedAnalyzerGenerator(config);
    // Обратная совместимость: сохраняем старые ссылки
    this.analyzer = this.analyzerGenerator;
    this.generator = this.analyzerGenerator;
    this.aiAugmentation = new AIAugmentation(config);
    this.buildHistoryPath = path.join(process.cwd(), 'data/seo/build-history.jsonl');
  }

  /**
   * Расширение seed-list перед билдом
   */
  async expandSeedsBeforeBuild() {
    log('SEED-EXPANSION', 'Starting seed expansion');

    try {
      // ТРИЗ оптимизация: объединенный анализ и генерация
      const analysis = await this.analyzerGenerator.analyzeAndGenerate();
      
      // Извлекаем данные из объединенного результата
      const expanded = {
        expandedSeeds: analysis.expandedSeeds,
        additions: analysis.additions
      };

      // 3. Анализ предыдущих билдов
      const buildHistory = this.analyzeBuildHistory();

      // 4. Анализ ограничений ресурсов
      const resourceLimits = this.analyzeResourceLimits();

      // 5. AI анализ и определение оптимального объема
      const aiAnalysis = await this.analyzeWithAI({
        currentState: analysis,
        expandedSeeds: expanded,
        buildHistory: buildHistory,
        resourceLimits: resourceLimits
      });

      // 6. Расчет recommended_build_volume
      const recommendedVolume = this.calculateOptimalVolume({
        analysis,
        aiAnalysis,
        buildHistory,
        resourceLimits
      });

      // 7. Определение стратегии распределения
      const buildStrategy = this.determineBuildStrategy(recommendedVolume, resourceLimits);

      const result = {
        recommended_build_volume: recommendedVolume,
        expanded_seed_list: expanded.expandedSeeds,
        reasoning: aiAnalysis.reasoning || 'Based on gap analysis and resource limits',
        build_strategy: buildStrategy,
        diff: {
          added: expanded.additions,
          removed: []
        },
        analyzedAt: new Date().toISOString()
      };

      log('SEED-EXPANSION', `Expansion complete: recommended volume ${recommendedVolume}, +${expanded.additions.states.length} states, +${expanded.additions.makes.length} makes`);

      return result;
    } catch (e) {
      log('SEED-EXPANSION', `Error during expansion: ${e.message}`);
      return this.getFallbackResult();
    }
  }

  /**
   * Анализ предыдущих билдов
   */
  analyzeBuildHistory() {
    const history = {
      totalBuilds: 0,
      avgPagesGenerated: 0,
      avgQuality: 0,
      avgAccepted: 0,
      avgRejected: 0,
      successRate: 0,
      trend: 'stable'
    };

    if (!fs.existsSync(this.buildHistoryPath)) {
      return history;
    }

    try {
      const lines = fs.readFileSync(this.buildHistoryPath, 'utf8')
        .split('\n')
        .filter(Boolean)
        .slice(-10); // Последние 10 билдов

      if (lines.length === 0) return history;

      const builds = lines.map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      }).filter(Boolean);

      if (builds.length === 0) return history;

      history.totalBuilds = builds.length;
      history.avgPagesGenerated = builds.reduce((sum, b) => sum + (b.pagesGenerated || 0), 0) / builds.length;
      history.avgQuality = builds.reduce((sum, b) => sum + (b.avgQuality || 0), 0) / builds.length;
      history.avgAccepted = builds.reduce((sum, b) => sum + (b.pagesAccepted || 0), 0) / builds.length;
      history.avgRejected = builds.reduce((sum, b) => sum + (b.pagesRejected || 0), 0) / builds.length;
      history.successRate = builds.filter(b => b.success).length / builds.length;

      // Определяем тренд
      if (builds.length >= 2) {
        const recent = builds.slice(-3);
        const older = builds.slice(-6, -3);
        if (older.length > 0) {
          const recentAvg = recent.reduce((sum, b) => sum + (b.avgQuality || 0), 0) / recent.length;
          const olderAvg = older.reduce((sum, b) => sum + (b.avgQuality || 0), 0) / older.length;
          if (recentAvg > olderAvg * 1.05) history.trend = 'improving';
          else if (recentAvg < olderAvg * 0.95) history.trend = 'declining';
        }
      }
    } catch (e) {
      log('SEED-EXPANSION', `Error analyzing build history: ${e.message}`);
    }

    return history;
  }

  /**
   * Анализ ограничений ресурсов
   */
  analyzeResourceLimits() {
    const limits = {
      groqDailyLimit: 200, // TPD лимит позволяет ~200 страниц
      groqUsedToday: 0, // Будет обновляться из метрик
      deepseekAvailable: true,
      cacheHitRate: 0.5, // Предполагаем 50% кеша
      maxBuildTime: 240000 // 4 минуты на Vercel
    };

    // TODO: Загружать реальные метрики использования Groq
    // Пока используем консервативные значения

    return limits;
  }

  /**
   * AI анализ пробелов и рекомендации
   */
  async analyzeWithAI(context) {
    const prompt = `You are an advanced SEO AI system analyzing seed expansion for a VIN check website.

CURRENT STATE:
- Existing coverage: ${context.currentState.existingCoverage.states.length} states, ${context.currentState.existingCoverage.makes.length} makes, ${context.currentState.existingCoverage.years.length} years
- Gaps: ${context.currentState.gaps.missingStates.length} missing states, ${context.currentState.gaps.missingMakes.length} missing makes, ${context.currentState.gaps.missingYears.length} missing years

BUILD HISTORY:
- Total builds: ${context.buildHistory.totalBuilds}
- Avg quality: ${context.buildHistory.avgQuality.toFixed(3)}
- Trend: ${context.buildHistory.trend}

RESOURCE LIMITS:
- Groq daily limit: ${context.resourceLimits.groqDailyLimit} pages
- Cache hit rate: ${(context.resourceLimits.cacheHitRate * 100).toFixed(0)}%

YOUR TASK:
Analyze the gaps and recommend:
1. Optimal build volume for maximum effectiveness
2. Reasoning for your recommendation
3. Priority order for filling gaps

Consider:
- Quality over quantity
- Resource constraints (Groq limits)
- Learning from previous builds
- Maximizing traffic potential

Output JSON with: recommended_volume (number), reasoning (string), priority_order (array).`;

    try {
      const aiResponse = await this.aiAugmentation.generateText(prompt, {
        lang: 'en',
        intent: 'seed_expansion_analysis',
        maxTokens: 1000
      });

      // Парсим JSON из ответа
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (e) {
          // Если не JSON, извлекаем данные из текста
        }
      }

      // Fallback: извлекаем данные из текста
      const volumeMatch = aiResponse.match(/recommended[_\s]?volume[:\s]+(\d+)/i);
      const recommendedVolume = volumeMatch ? parseInt(volumeMatch[1]) : null;

      return {
        recommended_volume: recommendedVolume,
        reasoning: aiResponse.substring(0, 500),
        priority_order: ['missing_coverage', 'high_traffic_potential', 'quality_boost']
      };
    } catch (e) {
      log('SEED-EXPANSION', `AI analysis error: ${e.message}`);
      return {
        recommended_volume: null,
        reasoning: 'AI analysis unavailable',
        priority_order: ['missing_coverage']
      };
    }
  }

  /**
   * Расчет оптимального объема билда
   */
  calculateOptimalVolume({ analysis, aiAnalysis, buildHistory, resourceLimits }) {
    // 1. Базовый расчет на основе пробелов
    const gapsVolume = this.calculateGapsVolume(analysis.gaps);

    // 2. Анализ эффективности предыдущих объемов
    const optimalVolumeFromHistory = buildHistory.totalBuilds > 0
      ? Math.min(buildHistory.avgPagesGenerated * 1.2, 2000) // +20% от среднего, макс 2000
      : 300; // Первый билд: консервативный объем

    // 3. Учет ограничений ресурсов
    const maxVolumeFromResources = resourceLimits.groqDailyLimit + 
      (resourceLimits.groqDailyLimit * 4); // Groq + DeepSeek (4x)

    // 4. AI рекомендация
    const aiRecommendedVolume = aiAnalysis.recommended_volume;

    // 5. Выбор оптимального объема
    const candidates = [
      gapsVolume,
      optimalVolumeFromHistory,
      maxVolumeFromResources,
      aiRecommendedVolume
    ].filter(v => v && v > 0);

    if (candidates.length === 0) {
      return 300; // Fallback
    }

    const recommendedVolume = Math.min(...candidates);

    // Ограничиваем разумными пределами
    if (recommendedVolume < 100) return 300; // Минимум 300
    if (recommendedVolume > 10000) return 10000; // Максимум 10000

    return Math.round(recommendedVolume);
  }

  /**
   * Расчет объема на основе пробелов
   */
  calculateGapsVolume(gaps) {
    const stateWeight = 1;
    const makeWeight = 2;
    const yearWeight = 1;
    const combinationWeight = 0.5;

    const volume = 
      gaps.missingStates.length * stateWeight * 10 +
      gaps.missingMakes.length * makeWeight * 20 +
      gaps.missingYears.length * yearWeight * 15 +
      gaps.missingCombinations.length * combinationWeight;

    return Math.round(volume);
  }

  /**
   * Определение стратегии распределения
   */
  determineBuildStrategy(recommendedVolume, resourceLimits) {
    const strategy = {
      groq_pages: 0,
      deepseek_pages: 0,
      cached_pages: 0,
      priority_order: []
    };

    // Groq для топ-страниц (максимум 150 для безопасности)
    const groqAvailable = resourceLimits.groqDailyLimit - resourceLimits.groqUsedToday;
    strategy.groq_pages = Math.min(150, groqAvailable, Math.floor(recommendedVolume * 0.2));

    // Остальное через DeepSeek
    strategy.deepseek_pages = recommendedVolume - strategy.groq_pages;

    // Учитываем кеш
    const cacheHitRate = resourceLimits.cacheHitRate;
    strategy.cached_pages = Math.floor(strategy.deepseek_pages * cacheHitRate);
    strategy.deepseek_pages -= strategy.cached_pages;

    // Определяем приоритеты
    strategy.priority_order = ['missing_coverage', 'high_traffic_potential', 'quality_boost'];

    return strategy;
  }

  /**
   * Fallback результат
   */
  getFallbackResult() {
    return {
      recommended_build_volume: 300,
      expanded_seed_list: this.analyzer.loadSeeds(),
      reasoning: 'Fallback: using default seeds and conservative volume',
      build_strategy: {
        groq_pages: 150,
        deepseek_pages: 150,
        cached_pages: 0,
        priority_order: ['missing_coverage']
      },
      diff: {
        added: [],
        removed: []
      }
    };
  }
}

module.exports = { SeedExpansionEngine };

