const { log, error } = require('../logger');
const { getReferenceArticlesLoader } = require('./reference-articles-loader');
const { ArticleQualityUtils } = require('./article-quality-utils');

/**
 * ОПТИМИЗИРОВАННЫЙ АНАЛИЗАТОР СТАТЕЙ
 * 
 * Реализует 4 оптимизации:
 * 1. Глубокий анализ через Ollama
 * 2. Анализ блоков отдельно
 * 3. Сравнение с reference articles
 * 4. Параллельная обработка
 */
class OptimizedArticleAnalyzer {
  constructor(aiAugmentation, config) {
    this.aiAugmentation = aiAugmentation;
    this.config = config;
    this.refLoader = getReferenceArticlesLoader();
    this.referenceArticles = this.refLoader.loadReferenceArticles();
  }

  /**
   * ОПТИМИЗАЦИЯ 1: Глубокий анализ блока через Ollama
   * 
   * Анализирует качество блока по 5 критериям:
   * - Structure (0.2)
   * - Technical accuracy (0.2)
   * - Completeness vs reference (0.2)
   * - Professional tone (0.2)
   * - Actionable value (0.2)
   */
  async analyzeBlockWithOllama(block, blockType, reference = null) {
    if (!this.aiAugmentation.useLocalAI || !this.aiAugmentation.localAI) {
      log('OPTIMIZED-ANALYZER', 'Ollama not available, using fallback analysis');
      return this.fallbackBlockAnalysis(block, blockType);
    }

    try {
      const blockContent = typeof block === 'string' ? block : block.content || '';
      const blockTypeName = typeof block === 'string' ? blockType : (block.type || blockType);
      
      const referenceContent = reference 
        ? (typeof reference === 'string' ? reference : reference.content || '')
        : this.refLoader.getReferenceForBlock(blockTypeName, this.referenceArticles);

      const analysisPrompt = `Analyze this ${blockTypeName} block quality for a VIN check article.

CURRENT BLOCK:
${blockContent.substring(0, 800)}

${referenceContent ? `REFERENCE (high-quality example):
${referenceContent.substring(0, 600)}
` : ''}

Rate quality from 0.0 to 1.0 across 5 dimensions (each 0.2 points):
1. **Structure** (0.2): Proper headings, lists, tables, formatting
2. **Technical accuracy** (0.2): Factual correctness (VIN structure, CA laws, recalls)
3. **Completeness vs reference** (0.2): Covers all key points from reference
4. **Professional tone** (0.2): Expert, technical, no literary flourishes
5. **Actionable value** (0.2): Provides practical, usable advice

Respond ONLY with valid JSON:
{
  "score": 0.95,
  "breakdown": {
    "structure": 0.2,
    "technicalAccuracy": 0.2,
    "completeness": 0.2,
    "professionalTone": 0.2,
    "actionableValue": 0.2
  },
  "issues": ["missing specific data", "needs more technical depth"],
  "strengths": ["good structure", "accurate information"],
  "recommendations": ["add more CA-specific details", "include examples"]
}`;

      log('OPTIMIZED-ANALYZER', `Analyzing ${blockTypeName} block with Ollama...`);
      
      const analysisText = await this.aiAugmentation.localAI.generateText(analysisPrompt, {
        maxTokens: 600,
        timeout: 45000
      });

      if (!analysisText) {
        return this.fallbackBlockAnalysis(block, blockTypeName);
      }

      // Парсим JSON из ответа
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        
        // Валидация структуры
        if (typeof analysis.score === 'number' && analysis.score >= 0 && analysis.score <= 1) {
          log('OPTIMIZED-ANALYZER', `${blockTypeName} block score: ${analysis.score.toFixed(2)}`);
          return {
            blockType: blockTypeName,
            score: analysis.score,
            breakdown: analysis.breakdown || {},
            issues: analysis.issues || [],
            strengths: analysis.strengths || [],
            recommendations: analysis.recommendations || [],
            analyzedWith: 'ollama'
          };
        }
      }

      log('OPTIMIZED-ANALYZER', `Failed to parse Ollama analysis for ${blockTypeName}, using fallback`);
      return this.fallbackBlockAnalysis(block, blockTypeName);
    } catch (e) {
      error('OPTIMIZED-ANALYZER', `Ollama analysis error for ${blockTypeName}: ${e.message}`);
      return this.fallbackBlockAnalysis(block, blockTypeName);
    }
  }

  /**
   * Fallback анализ (если Ollama недоступен)
   */
  fallbackBlockAnalysis(block, blockType) {
    const blockContent = typeof block === 'string' ? block : block.content || '';
    const wordCount = ArticleQualityUtils.countWords(blockContent);
    
    let score = 0.5;
    if (wordCount > 200) score += 0.2;
    if (wordCount > 100) score += 0.1;
    
    const hasHeadings = /#{1,3}|<h[1-3]/.test(blockContent);
    if (hasHeadings) score += 0.1;
    
    const hasLists = /[-*]|<[uo]l/.test(blockContent);
    if (hasLists) score += 0.1;

    return {
      blockType,
      score: Math.min(1.0, score),
      breakdown: {
        structure: hasHeadings && hasLists ? 0.2 : 0.1,
        technicalAccuracy: 0.15,
        completeness: 0.15,
        professionalTone: 0.15,
        actionableValue: 0.15
      },
      issues: wordCount < 100 ? ['too short'] : [],
      strengths: wordCount > 200 ? ['good length'] : [],
      recommendations: [],
      analyzedWith: 'fallback'
    };
  }


  /**
   * ОПТИМИЗАЦИЯ 3: Сравнение блока с reference
   */
  async compareWithReference(block, blockType) {
    const reference = this.refLoader.getReferenceForBlock(blockType, this.referenceArticles);
    
    if (!reference) {
      return {
        similarity: null,
        missing: [],
        better: [],
        needsImprovement: []
      };
    }

    if (!this.aiAugmentation.useLocalAI || !this.aiAugmentation.localAI) {
      return this.simpleComparison(block, reference);
    }

    try {
      const blockContent = typeof block === 'string' ? block : block.content || '';
      
      const comparisonPrompt = `Compare this ${blockType} block with a high-quality reference:

CURRENT BLOCK:
${blockContent.substring(0, 600)}

REFERENCE (high-quality example):
${reference.substring(0, 600)}

What's missing in current block? What's better? What needs improvement?

Respond ONLY with valid JSON:
{
  "similarity": 0.85,
  "missing": ["specific CA smog-check data", "technical VIN details"],
  "better": ["structure is clearer"],
  "needsImprovement": ["add more depth", "include examples"]
}`;

      const comparisonText = await this.aiAugmentation.localAI.generateText(comparisonPrompt, {
        maxTokens: 400,
        timeout: 30000
      });

      if (!comparisonText) {
        return this.simpleComparison(block, reference);
      }

      const jsonMatch = comparisonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const comparison = JSON.parse(jsonMatch[0]);
        return {
          similarity: comparison.similarity || 0.5,
          missing: comparison.missing || [],
          better: comparison.better || [],
          needsImprovement: comparison.needsImprovement || []
        };
      }
    } catch (e) {
      error('OPTIMIZED-ANALYZER', `Comparison error for ${blockType}: ${e.message}`);
    }

    return this.simpleComparison(block, reference);
  }

  /**
   * Простое сравнение (fallback)
   */
  simpleComparison(block, reference) {
    const blockContent = typeof block === 'string' ? block : block.content || '';
    const blockWords = blockContent.toLowerCase().split(/\s+/);
    const referenceWords = reference.toLowerCase().split(/\s+/);
    
    const commonWords = blockWords.filter(w => referenceWords.includes(w));
    const similarity = commonWords.length / Math.max(blockWords.length, referenceWords.length);

    return {
      similarity: Math.min(1.0, similarity),
      missing: [],
      better: [],
      needsImprovement: similarity < 0.5 ? ['low similarity with reference'] : []
    };
  }

  /**
   * Извлечение блоков из статьи
   */
  extractBlocks(article) {
    // Если статья уже имеет блоки (версия 6)
    if (article.blocks && Array.isArray(article.blocks)) {
      return article.blocks.map(block => ({
        type: block.type || 'unknown',
        content: block.content || ''
      }));
    }

    // Если контент - строка, пытаемся извлечь блоки по заголовкам
    const content = typeof article === 'string' ? article : article.content || '';
    const blocks = [];
    
    // Разделяем по H2/H3 заголовкам
    const headingRegex = /(?:^|\n)(?:#{2,3}|<h[2-3])\s+(.+?)(?:\n|$)/g;
    let lastIndex = 0;
    let match;
    let blockIndex = 0;

    while ((match = headingRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        blocks.push({
          type: `section_${blockIndex++}`,
          content: content.substring(lastIndex, match.index).trim()
        });
      }
      lastIndex = match.index;
    }

    if (lastIndex < content.length) {
      blocks.push({
        type: `section_${blockIndex}`,
        content: content.substring(lastIndex).trim()
      });
    }

    return blocks.length > 0 ? blocks : [{
      type: 'full_content',
      content: content
    }];
  }

  /**
   * ОПТИМИЗАЦИЯ 2: Анализ всех блоков статьи отдельно
   * ОПТИМИЗАЦИЯ 4: Параллельная обработка
   */
  async analyzeArticleBlocks(article) {
    log('OPTIMIZED-ANALYZER', 'Extracting and analyzing blocks...');
    
    const blocks = this.extractBlocks(article);
    log('OPTIMIZED-ANALYZER', `Found ${blocks.length} blocks to analyze`);

    // ОПТИМИЗАЦИЯ 4: Параллельный анализ всех блоков
    const blockAnalyses = await Promise.all(
      blocks.map(async (block) => {
        const reference = this.refLoader.getReferenceForBlock(block.type, this.referenceArticles);
        
        // Параллельно: анализ качества + сравнение с reference
        const [analysis, comparison] = await Promise.all([
          this.analyzeBlockWithOllama(block, block.type, reference),
          this.compareWithReference(block, block.type)
        ]);

        return {
          blockType: block.type,
          content: block.content.substring(0, 200) + '...',
          wordCount: ArticleQualityUtils.countWords(block.content),
          analysis: analysis,
          comparison: comparison
        };
      })
    );

    // Вычисляем общую оценку
    const overallScore = this.calculateOverallScore(blockAnalyses);
    const weakestBlock = this.findWeakestBlock(blockAnalyses);
    const strongestBlock = this.findStrongestBlock(blockAnalyses);

    return {
      overall: {
        score: overallScore,
        blockCount: blocks.length,
        averageBlockScore: blockAnalyses.reduce((sum, b) => sum + b.analysis.score, 0) / blockAnalyses.length
      },
      blocks: blockAnalyses,
      weakestBlock: weakestBlock,
      strongestBlock: strongestBlock,
      recommendations: this.generateRecommendations(blockAnalyses)
    };
  }

  /**
   * Вычисление общей оценки
   */
  calculateOverallScore(blockAnalyses) {
    if (blockAnalyses.length === 0) return 0.5;

    const scores = blockAnalyses.map(b => b.analysis.score);
    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    
    // Бонус за количество блоков (версия 6: 12-14 блоков)
    const blockCountBonus = Math.min(0.1, (blockAnalyses.length / 14) * 0.1);
    
    // Штраф за слабые блоки
    const weakBlocks = scores.filter(s => s < 0.7).length;
    const weakBlockPenalty = Math.min(0.1, (weakBlocks / blockAnalyses.length) * 0.1);

    return Math.min(1.0, Math.max(0.0, avgScore + blockCountBonus - weakBlockPenalty));
  }

  /**
   * Поиск самого слабого блока
   */
  findWeakestBlock(blockAnalyses) {
    if (blockAnalyses.length === 0) return null;
    
    return blockAnalyses.reduce((weakest, current) => 
      current.analysis.score < weakest.analysis.score ? current : weakest
    );
  }

  /**
   * Поиск самого сильного блока
   */
  findStrongestBlock(blockAnalyses) {
    if (blockAnalyses.length === 0) return null;
    
    return blockAnalyses.reduce((strongest, current) => 
      current.analysis.score > strongest.analysis.score ? current : strongest
    );
  }

  /**
   * Генерация рекомендаций на основе анализа
   */
  generateRecommendations(blockAnalyses) {
    const recommendations = [];

    // Рекомендации по слабым блокам
    const weakBlocks = blockAnalyses.filter(b => b.analysis.score < 0.7);
    if (weakBlocks.length > 0) {
      recommendations.push({
        priority: 'high',
        type: 'weak_blocks',
        message: `${weakBlocks.length} block(s) need improvement`,
        blocks: weakBlocks.map(b => ({
          type: b.blockType,
          score: b.analysis.score,
          issues: b.analysis.issues
        }))
      });
    }

    // Рекомендации по недостающим элементам
    const missingElements = blockAnalyses
      .flatMap(b => b.comparison.missing || [])
      .filter((v, i, a) => a.indexOf(v) === i); // Уникальные

    if (missingElements.length > 0) {
      recommendations.push({
        priority: 'medium',
        type: 'missing_elements',
        message: 'Missing elements compared to reference',
        elements: missingElements
      });
    }

    // Рекомендации по улучшению
    const improvements = blockAnalyses
      .flatMap(b => b.comparison.needsImprovement || [])
      .filter((v, i, a) => a.indexOf(v) === i);

    if (improvements.length > 0) {
      recommendations.push({
        priority: 'medium',
        type: 'improvements',
        message: 'Areas for improvement',
        improvements: improvements
      });
    }

    return recommendations;
  }

  /**
   * Полный анализ статьи (главный метод)
   */
  async analyzeArticle(article) {
    log('OPTIMIZED-ANALYZER', 'Starting optimized article analysis...');
    
    const startTime = Date.now();

    // ОПТИМИЗАЦИЯ 2 + 4: Анализ блоков отдельно + параллельная обработка
    const blockAnalysis = await this.analyzeArticleBlocks(article);

    // Базовые метрики
    const content = typeof article === 'string' ? article : article.content || '';
    const wordCount = ArticleQualityUtils.countWords(content);

    const analysis = {
      timestamp: new Date().toISOString(),
      wordCount: wordCount,
      qualityScore: blockAnalysis.overall.score,
      blockCount: blockAnalysis.overall.blockCount,
      averageBlockScore: blockAnalysis.overall.averageBlockScore,
      blockAnalysis: blockAnalysis,
      analysisTime: Date.now() - startTime,
      analyzedWith: 'optimized_analyzer'
    };

    log('OPTIMIZED-ANALYZER', `Analysis complete in ${analysis.analysisTime}ms. Score: ${analysis.qualityScore.toFixed(2)}`);
    
    return analysis;
  }
}

module.exports = { OptimizedArticleAnalyzer };

