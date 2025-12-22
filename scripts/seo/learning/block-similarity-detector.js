#!/usr/bin/env node

/**
 * Block Similarity Detector
 * Обнаружение схожести блоков для предотвращения дубликатов
 */

const { log, error } = require('../logger');

class BlockSimilarityDetector {
  constructor() {
    this.similarityThreshold = 0.70; // Порог схожести для пересоздания блока
    this.articleSimilarityThreshold = 0.80; // Порог для пересоздания всей статьи
  }

  /**
   * Вычисление Jaccard similarity (токен overlap)
   */
  jaccardSimilarity(text1, text2) {
    const tokens1 = this.tokenize(text1);
    const tokens2 = this.tokenize(text2);
    
    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);
    
    return intersection.size / union.size;
  }

  /**
   * Токенизация текста
   */
  tokenize(text) {
    if (!text) return new Set();
    
    return new Set(
      text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2)
    );
  }

  /**
   * Вычисление n-gram overlap
   */
  ngramOverlap(text1, text2, n = 3) {
    const ngrams1 = this.getNgrams(text1, n);
    const ngrams2 = this.getNgrams(text2, n);
    
    const intersection = new Set([...ngrams1].filter(x => ngrams2.has(x)));
    const union = new Set([...ngrams1, ...ngrams2]);
    
    return intersection.size / union.size;
  }

  /**
   * Извлечение n-грамм
   */
  getNgrams(text, n) {
    if (!text) return new Set();
    
    const words = text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(w => w.length > 0);
    const ngrams = new Set();
    
    for (let i = 0; i <= words.length - n; i++) {
      ngrams.add(words.slice(i, i + n).join(' '));
    }
    
    return ngrams;
  }

  /**
   * Проверка схожести двух блоков
   */
  checkBlockSimilarity(block1, block2) {
    if (!block1 || !block2) return 0;
    
    const text1 = typeof block1 === 'string' ? block1 : block1.content || '';
    const text2 = typeof block2 === 'string' ? block2 : block2.content || '';
    
    if (!text1 || !text2) return 0;
    
    // Jaccard similarity
    const jaccard = this.jaccardSimilarity(text1, text2);
    
    // N-gram overlap (2-5 grams)
    const ngram2 = this.ngramOverlap(text1, text2, 2);
    const ngram3 = this.ngramOverlap(text1, text2, 3);
    const ngram4 = this.ngramOverlap(text1, text2, 4);
    const ngram5 = this.ngramOverlap(text1, text2, 5);
    
    // Среднее значение всех метрик
    const avgSimilarity = (jaccard + ngram2 + ngram3 + ngram4 + ngram5) / 5;
    
    return avgSimilarity;
  }

  /**
   * Проверка схожести блока с существующими блоками
   */
  checkAgainstExistingBlocks(newBlock, existingBlocks = []) {
    if (!existingBlocks || existingBlocks.length === 0) {
      return { isSimilar: false, maxSimilarity: 0 };
    }
    
    let maxSimilarity = 0;
    
    for (const existingBlock of existingBlocks) {
      const similarity = this.checkBlockSimilarity(newBlock, existingBlock);
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }
    
    return {
      isSimilar: maxSimilarity >= this.similarityThreshold,
      maxSimilarity: maxSimilarity
    };
  }

  /**
   * Проверка схожести статьи с существующими статьями
   */
  checkArticleSimilarity(newArticle, existingArticles = []) {
    if (!existingArticles || existingArticles.length === 0) {
      return { isSimilar: false, maxSimilarity: 0 };
    }
    
    const newContent = typeof newArticle === 'string' ? newArticle : newArticle.content || '';
    let maxSimilarity = 0;
    
    for (const existingArticle of existingArticles) {
      const existingContent = typeof existingArticle === 'string' 
        ? existingArticle 
        : existingArticle.content || '';
      
      const similarity = this.jaccardSimilarity(newContent, existingContent);
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }
    
    return {
      isSimilar: maxSimilarity >= this.articleSimilarityThreshold,
      maxSimilarity: maxSimilarity
    };
  }

  /**
   * Вычисление uniqueness score для статьи
   */
  calculateUniquenessScore(article, referenceArticles = []) {
    if (!referenceArticles || referenceArticles.length === 0) {
      return 1.0; // Если нет референсов, считаем уникальной
    }
    
    const articleContent = typeof article === 'string' ? article : article.content || '';
    let totalSimilarity = 0;
    let count = 0;
    
    for (const refArticle of referenceArticles) {
      const refContent = typeof refArticle === 'string' ? refArticle : refArticle.content || '';
      const similarity = this.jaccardSimilarity(articleContent, refContent);
      totalSimilarity += similarity;
      count++;
    }
    
    const avgSimilarity = count > 0 ? totalSimilarity / count : 0;
    const uniquenessScore = 1 - avgSimilarity; // Инвертируем similarity в uniqueness
    
    return Math.max(0, Math.min(1, uniquenessScore)); // Ограничиваем 0-1
  }

  /**
   * Вычисление lexical variation score
   */
  calculateLexicalVariation(article, referenceArticles = []) {
    if (!referenceArticles || referenceArticles.length === 0) {
      return 1.0;
    }
    
    const articleTokens = this.tokenize(
      typeof article === 'string' ? article : article.content || ''
    );
    
    let uniqueTokenRatio = 0;
    let count = 0;
    
    for (const refArticle of referenceArticles) {
      const refTokens = this.tokenize(
        typeof refArticle === 'string' ? refArticle : refArticle.content || ''
      );
      
      // Вычисляем долю уникальных токенов
      const intersection = new Set([...articleTokens].filter(x => refTokens.has(x)));
      const uniqueInArticle = articleTokens.size - intersection.size;
      const ratio = articleTokens.size > 0 ? uniqueInArticle / articleTokens.size : 0;
      
      uniqueTokenRatio += ratio;
      count++;
    }
    
    return count > 0 ? uniqueTokenRatio / count : 1.0;
  }
}

module.exports = { BlockSimilarityDetector };









