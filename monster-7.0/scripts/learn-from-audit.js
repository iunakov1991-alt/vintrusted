#!/usr/bin/env node

/**
 * Обучение AI на основе SEO аудита
 * Сохраняет результаты аудита в AI Knowledge Core
 */

const fs = require('fs');
const path = require('path');

const config = require('../../config/monster.config.json');
const AIKnowledgeCore = require('../core/ai-knowledge-core/knowledge-core');

async function learnFromAudit() {
  console.log('📚 Обучение AI на основе SEO аудита...\n');

  // Загружаем SEO аудит
  const auditPath = path.join(process.cwd(), 'SEO_AUDIT_REPORT.md');
  if (!fs.existsSync(auditPath)) {
    console.error('❌ SEO_AUDIT_REPORT.md не найден!');
    process.exit(1);
  }

  const auditContent = fs.readFileSync(auditPath, 'utf8');
  
  // Инициализируем AI Knowledge Core
  const knowledgeCore = new AIKnowledgeCore(config);

  // Создаем материал для обучения
  const learningMaterial = {
    timestamp: new Date().toISOString(),
    type: 'seo-audit',
    filename: 'SEO_AUDIT_REPORT.md',
    source: 'internal-audit',
    content: auditContent,
    tags: ['seo', 'quality', 'content-generation', 'audit', 'best-practices', 'vin-check']
  };

  // Сохраняем в базу знаний
  const savedCount = await knowledgeCore.learnFromMaterials([learningMaterial]);
  
  if (savedCount > 0) {
    console.log('✅ SEO аудит успешно сохранен в базу знаний');
    console.log(`   Материалов сохранено: ${savedCount}`);
  } else {
    console.error('❌ Ошибка при сохранении SEO аудита');
    process.exit(1);
  }

  // Создаем структурированные правила на основе аудита
  const rules = extractRulesFromAudit(auditContent);
  await saveGenerationRules(rules);

  console.log('\n✅ Обучение завершено!');
  console.log('   Правила генерации обновлены');
  console.log('   Следующая генерация будет использовать эти правила\n');
}

/**
 * Извлечение правил из аудита
 */
function extractRulesFromAudit(auditContent) {
  const rules = {
    minWords: 3000,
    minSections: 8,
    maxSections: 12,
    minFAQ: 10,
    maxFAQ: 15,
    minTables: 2,
    minScenarios: 2,
    maxScenarios: 4,
    minFAQAnswerWords: 100,
    maxFAQAnswerWords: 200,
    minSectionWords: 300,
    maxSectionWords: 500,
    requiredElements: [
      'data-breakdown',
      'sources-pipelines',
      'patterns-correlations',
      'regional-nuance',
      'best-practices',
      'scenarios',
      'tables'
    ],
    forbiddenPatterns: [
      'This comprehensive guide covers everything',
      'Understanding X is essential for making informed decisions',
      'By the end of this article',
      'In this article, we will explore',
      'This guide will help you'
    ],
    requiredSEO: [
      'schema-org-article',
      'schema-org-faqpage',
      'open-graph-tags',
      'twitter-card-tags',
      'breadcrumbs',
      'internal-links'
    ],
    qualityThreshold: 0.85
  };

  return rules;
}

/**
 * Сохранение правил генерации
 */
async function saveGenerationRules(rules) {
  const rulesPath = path.join(process.cwd(), 'data/knowledge/generation-rules.json');
  const rulesDir = path.dirname(rulesPath);

  if (!fs.existsSync(rulesDir)) {
    fs.mkdirSync(rulesDir, { recursive: true });
  }

  // Загружаем существующие правила
  let existingRules = {};
  if (fs.existsSync(rulesPath)) {
    try {
      existingRules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
    } catch (e) {
      console.warn('Не удалось загрузить существующие правила, создаем новые');
    }
  }

  // Объединяем с новыми правилами
  const updatedRules = {
    ...existingRules,
    ...rules,
    lastUpdated: new Date().toISOString(),
    source: 'seo-audit-learning'
  };

  // Сохраняем
  fs.writeFileSync(rulesPath, JSON.stringify(updatedRules, null, 2));
  console.log('   Правила сохранены в:', rulesPath);
}

// Запуск
if (require.main === module) {
  learnFromAudit().catch(error => {
    console.error('❌ Ошибка при обучении:', error);
    process.exit(1);
  });
}

module.exports = { learnFromAudit, extractRulesFromAudit };

