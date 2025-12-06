#!/usr/bin/env node

/**
 * Анализ качества страницы для самообучения
 * Сохраняет результаты в формате для системы обучения
 */

const fs = require('fs');
const path = require('path');

const PAGE_PATH = process.argv[2] || 'public/semantic-pages/en/dmv-titles/az/title-types/checklist/index.html';

if (!fs.existsSync(PAGE_PATH)) {
  console.error(`ERROR: Page not found: ${PAGE_PATH}`);
  process.exit(1);
}

const html = fs.readFileSync(PAGE_PATH, 'utf8');

// Извлекаем текст контента
const textContent = html
  .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

// Подсчитываем слова
const words = textContent.split(/\s+/).filter(w => w.length > 0);
const wordCount = words.length;

// Анализ структуры
const h1Count = (html.match(/<h1[^>]*>/gi) || []).length;
const h2Count = (html.match(/<h2[^>]*>/gi) || []).length;
const h3Count = (html.match(/<h3[^>]*>/gi) || []).length;
const listCount = (html.match(/<[uo]l[^>]*>/gi) || []).length;
const tableCount = (html.match(/<table[^>]*>/gi) || []).length;
const paragraphCount = (html.match(/<p[^>]*>/gi) || []).length;

// Ключевые слова
const keywords = {
  state: ['AZ', 'Arizona', 'MVD'],
  dmv: ['DMV', 'title', 'titles'],
  types: ['clean', 'salvage', 'rebuilt', 'branded'],
  vin: ['VIN', 'vehicle identification number'],
  legal: ['legal', 'law', 'regulation', 'statute']
};
const keywordScores = {};
Object.keys(keywords).forEach(category => {
  const found = keywords[category].filter(kw => 
    textContent.toLowerCase().includes(kw.toLowerCase())
  ).length;
  keywordScores[category] = found / keywords[category].length;
});

// Внутренние ссылки
const internalLinks = (html.match(/<a[^>]+href=['\"][^'\"http]/gi) || []).length;

// FAQ - ищем в Schema.org
const faqScripts = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) || [];
let faqCount = 0;
faqScripts.forEach(script => {
  try {
    // Извлекаем JSON из script тега
    const content = script.replace(/<script[^>]*>/, '').replace(/<\/script>/, '').trim();
    if (content) {
      const data = JSON.parse(content);
      if (data["@type"] === "FAQPage" && data.mainEntity && Array.isArray(data.mainEntity)) {
        faqCount = Math.max(faqCount, data.mainEntity.length);
      }
    }
  } catch (e) {
    // Пробуем найти JSON другим способом
    try {
      const jsonMatch = script.match(/{[\s\S]*"@type"[\s\S]*"FAQPage"[\s\S]*}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        if (data.mainEntity && Array.isArray(data.mainEntity)) {
          faqCount = Math.max(faqCount, data.mainEntity.length);
        }
      }
    } catch (e2) {
      // Игнорируем ошибки парсинга
    }
  }
});

// SEO элементы
const hasTitle = html.includes('<title>');
const hasMetaDesc = html.includes('meta name="description"');
const hasCanonical = html.includes('rel="canonical"');
const hasOGTags = html.includes('og:title');
const hasTwitterCard = html.includes('twitter:card');
const schemaCount = (html.match(/application\/ld\+json/gi) || []).length;
const hasWebPageSchema = html.includes('"@type": "WebPage"');
const hasOrganizationSchema = html.includes('"@type": "Organization"');
const hasSearchAction = html.includes('SearchAction');

// Извлекаем title и description
const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
const title = titleMatch ? titleMatch[1] : '';
const titleLength = title.length;

const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
const desc = descMatch ? descMatch[1] : '';
const descLength = desc.length;

// Оценка качества
const qualityScore = {
  content: {
    wordCount,
    targetWordCount: 2000,
    wordCountScore: Math.min(1.0, wordCount / 2000),
    structureScore: (
      (h1Count === 1 ? 0.2 : 0) +
      (h2Count >= 3 ? 0.3 : h2Count * 0.1) +
      (h3Count >= 2 ? 0.2 : h3Count * 0.1) +
      (listCount >= 2 ? 0.15 : listCount * 0.075) +
      (tableCount >= 1 ? 0.15 : 0)
    )
  },
  keywords: {
    scores: keywordScores,
    overallScore: Object.values(keywordScores).reduce((a, b) => a + b, 0) / Object.keys(keywordScores).length
  },
  seo: {
    title: hasTitle && titleLength >= 50 && titleLength <= 60,
    description: hasMetaDesc && descLength >= 140 && descLength <= 160,
    canonical: hasCanonical,
    ogTags: hasOGTags,
    twitterCard: hasTwitterCard,
    schemaCount,
    hasWebPageSchema,
    hasOrganizationSchema,
    hasSearchAction,
    seoScore: (
      (hasTitle ? 0.1 : 0) +
      (hasMetaDesc ? 0.1 : 0) +
      (hasCanonical ? 0.1 : 0) +
      (hasOGTags ? 0.1 : 0) +
      (hasTwitterCard ? 0.05 : 0) +
      (schemaCount >= 3 ? 0.15 : schemaCount * 0.05) +
      (hasWebPageSchema ? 0.1 : 0) +
      (hasOrganizationSchema ? 0.1 : 0) +
      (hasSearchAction ? 0.1 : 0)
    )
  },
  links: {
    internalLinks,
    targetLinks: 4,
    linksScore: Math.min(1.0, internalLinks / 4)
  },
  faq: {
    count: faqCount,
    targetCount: 5,
    faqScore: Math.min(1.0, faqCount / 5)
  }
};

// Общий score
const overallScore = (
  qualityScore.content.wordCountScore * 0.3 +
  qualityScore.content.structureScore * 0.2 +
  qualityScore.keywords.overallScore * 0.15 +
  qualityScore.seo.seoScore * 0.2 +
  qualityScore.links.linksScore * 0.1 +
  qualityScore.faq.faqScore * 0.05
);

// Сохраняем результаты
const analysisResult = {
  pagePath: PAGE_PATH,
  url: PAGE_PATH.replace(/^public\/semantic-pages/, 'https://vintrusted.com').replace(/\/index\.html$/, '/'),
  analyzedAt: new Date().toISOString(),
  quality: {
    overallScore,
    ...qualityScore
  },
  metrics: {
    wordCount,
    h1Count,
    h2Count,
    h3Count,
    listCount,
    tableCount,
    paragraphCount,
    internalLinks,
    faqCount,
    schemaCount,
    titleLength,
    descLength
  },
  recommendations: []
};

// Генерируем рекомендации
if (wordCount < 1500) {
  analysisResult.recommendations.push({
    type: 'content',
    severity: 'major',
    message: `Word count (${wordCount}) is below target (1500-2000 words). Consider adding more detailed content.`
  });
}

if (h2Count < 3) {
  analysisResult.recommendations.push({
    type: 'structure',
    severity: 'major',
    message: `Only ${h2Count} H2 headings found. Consider adding more sections for better structure.`
  });
}

if (internalLinks < 4) {
  analysisResult.recommendations.push({
    type: 'links',
    severity: 'major',
    message: `Only ${internalLinks} internal links found. Target: 4-6 links for better internal linking.`
  });
}

if (faqCount < 5) {
  analysisResult.recommendations.push({
    type: 'faq',
    severity: 'major',
    message: `Only ${faqCount} FAQ items found. Target: 5+ questions for better coverage.`
  });
}

if (titleLength < 50 || titleLength > 60) {
  analysisResult.recommendations.push({
    type: 'seo',
    severity: 'major',
    message: `Title length (${titleLength}) is not optimal. Target: 50-60 characters.`
  });
}

// Сохраняем в файл для обучения
const outputDir = path.join(__dirname, '..', 'data', 'seo', 'quality-analysis');
fs.mkdirSync(outputDir, { recursive: true });

const outputFile = path.join(outputDir, `quality-${Date.now()}.json`);
fs.writeFileSync(outputFile, JSON.stringify(analysisResult, null, 2), 'utf8');

// Выводим результаты
console.log('\n=== АНАЛИЗ КАЧЕСТВА СТРАНИЦЫ ДЛЯ САМООБУЧЕНИЯ ===\n');
console.log(`Страница: ${PAGE_PATH}`);
console.log(`URL: ${analysisResult.url}\n`);

console.log('📊 МЕТРИКИ:');
console.log(`  Слов: ${wordCount} (цель: 1500-2000)`);
console.log(`  H1: ${h1Count}, H2: ${h2Count}, H3: ${h3Count}`);
console.log(`  Списки: ${listCount}, Таблицы: ${tableCount}`);
console.log(`  Внутренние ссылки: ${internalLinks} (цель: 4-6)`);
console.log(`  FAQ: ${faqCount} (цель: 5+)`);
console.log(`  Schema.org схем: ${schemaCount}`);

console.log('\n📈 ОЦЕНКИ:');
console.log(`  Контент: ${(qualityScore.content.wordCountScore * 100).toFixed(0)}%`);
console.log(`  Структура: ${(qualityScore.content.structureScore * 100).toFixed(0)}%`);
console.log(`  Ключевые слова: ${(qualityScore.keywords.overallScore * 100).toFixed(0)}%`);
console.log(`  SEO: ${(qualityScore.seo.seoScore * 100).toFixed(0)}%`);
console.log(`  Ссылки: ${(qualityScore.links.linksScore * 100).toFixed(0)}%`);
console.log(`  FAQ: ${(qualityScore.faq.faqScore * 100).toFixed(0)}%`);
console.log(`\n  ОБЩИЙ SCORE: ${(overallScore * 100).toFixed(1)}%`);

if (analysisResult.recommendations.length > 0) {
  console.log('\n⚠️  РЕКОМЕНДАЦИИ:');
  analysisResult.recommendations.forEach(rec => {
    console.log(`  [${rec.severity.toUpperCase()}] ${rec.message}`);
  });
}

console.log(`\n✅ Результаты сохранены: ${outputFile}\n`);

// Сохраняем также в JSONL для обучения
const jsonlFile = path.join(__dirname, '..', 'data', 'seo', 'quality_logs', 'quality_analysis.jsonl');
fs.mkdirSync(path.dirname(jsonlFile), { recursive: true });
fs.appendFileSync(jsonlFile, JSON.stringify(analysisResult) + '\n', 'utf8');

console.log(`✅ Добавлено в лог обучения: ${jsonlFile}\n`);

