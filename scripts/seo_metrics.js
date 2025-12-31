#!/usr/bin/env node

/**
 * MONSTER 7.x: SEO Metrics
 * Проверяет SEO метрики статьи (длина блоков, структура)
 */

const fs = require('fs');
const path = require('path');

function countWords(text) {
  if (!text) return 0;
  return (text || '').split(/\s+/).filter(Boolean).length;
}

function extractBlockContent(content, blockName) {
  if (!content) return '';
  
  // Ищем блок по заголовку H2
  const blockPatterns = {
    hero: /^#\s+([^\n]+)/m,
    faq: /##\s+[Ff]requently\s+[Aa]sked\s+[Qq]uestions[\s\S]*?(?=##|$)/i,
    buyer_guide: /##\s+[Bb]uyer['\s]?[Ss]?[Gg]uide[\s\S]*?(?=##|$)/i
  };

  const pattern = blockPatterns[blockName];
  if (pattern) {
    const match = content.match(pattern);
    if (match) {
      return match[0] || match[1] || '';
    }
  }

  // Fallback: возвращаем весь контент для hero
  if (blockName === 'hero') {
    const h1Match = content.match(/^#\s+([^\n]+)/m);
    if (h1Match) {
      const h1End = content.indexOf('\n\n', content.indexOf(h1Match[0]));
      return content.substring(0, h1End !== -1 ? h1End : content.length);
    }
  }

  return '';
}

function seoMetrics(article) {
  const content = article.content || '';
  
  const hero = extractBlockContent(content, 'hero');
  const faq = extractBlockContent(content, 'faq');
  const buyer = extractBlockContent(content, 'buyer_guide');

  const heroWords = countWords(hero);
  const faqWords = countWords(faq);
  const buyerWords = countWords(buyer);
  const totalWords = countWords(content);

  const reasons = [];
  const metrics = {
    hero_words: heroWords,
    faq_words: faqWords,
    buyer_guide_words: buyerWords,
    total_words: totalWords
  };

  if (heroWords < 80 || heroWords > 260) {
    reasons.push(`Hero out of range: ${heroWords} (target: 80-260)`);
  }

  if (faqWords > 0 && (faqWords < 200 || faqWords > 400)) {
    reasons.push(`FAQ out of range: ${faqWords} (target: 200-400)`);
  }

  if (buyerWords > 0 && (buyerWords < 180 || buyerWords > 380)) {
    reasons.push(`Buyer guide out of range: ${buyerWords} (target: 180-380)`);
  }

  if (totalWords < 2200 || totalWords > 3600) {
    reasons.push(`Total words out of range: ${totalWords} (target: 2200-3600)`);
  }

  return {
    ok: reasons.length === 0,
    reasons,
    metrics
  };
}

function main() {
  const args = process.argv.slice(2);
  const inputIndex = args.indexOf('--input');
  
  if (inputIndex === -1 || !args[inputIndex + 1]) {
    console.error('Usage: node seo_metrics.js --input <page.json>');
    process.exit(1);
  }

  const inputPath = args[inputIndex + 1];
  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  const pageData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const article = pageData.article || pageData;

  const result = seoMetrics(article);

  console.log(JSON.stringify({
    vin: pageData.vin || 'N/A',
    seo_metrics: result.metrics,
    validation: {
      valid: result.ok,
      reasons: result.reasons
    }
  }, null, 2));

  return result.ok ? 0 : 1;
}

if (require.main === module) {
  const exitCode = main();
  process.exit(exitCode);
}

module.exports = { seoMetrics, countWords };















