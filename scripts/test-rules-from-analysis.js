#!/usr/bin/env node

/**
 * Тестирование правил из analysis-report.md
 * Проверяет, что все добавленные правила работают корректно
 */

const { ArticlePostProcessor } = require('./seo/learning/article-post-processor');
const { RuleEngineIntegration } = require('./seo/learning/rule-engine-integration');
const { log, error } = require('./seo/logger');

// Тестовые случаи из analysis-report.md
const testCases = [
  {
    name: 'Незавершенное предложение: cross-re',
    input: 'For an Arizona buyer, this decoded information should be cross-re.',
    expected: 'cross-referenced',
    blockType: 'buyer_guide'
  },
  {
    name: 'Незавершенное предложение: transforms',
    input: 'This methodical, engineering-level approach transforms.',
    expected: 'transforms raw VIN data',
    blockType: 'accident_intelligence'
  },
  {
    name: 'Незавершенное предложение: Detection',
    input: 'Answer: Odometer rollback is the illegal practice. Detection.',
    expected: 'Detection requires checking',
    blockType: 'faq'
  },
  {
    name: 'Незавершенный список: has.',
    input: '<ul><li>Confirming the vehicle has.</li></ul>',
    expected: 'has been verified',
    blockType: 'buyer_guide'
  },
  {
    name: 'Неправильные теги <em> вместо списков',
    input: '<em>   <strong>Decode Structural Identifiers:</strong> Validate...</em>   <em><strong>Verify Title Chain:</strong> Scrutinize...</em>',
    expected: '<li><strong>Decode Structural Identifiers:</strong>',
    blockType: 'buyer_guide'
  }
];

async function testRules() {
  log('TEST-RULES', 'Starting rule testing from analysis-report.md...\n');

  const processor = new ArticlePostProcessor();
  const ruleEngine = new RuleEngineIntegration();

  let passed = 0;
  let failed = 0;
  const failures = [];

  for (const testCase of testCases) {
    try {
      // Применяем правила через ruleEngine
      let processed = ruleEngine.applyRulesToBlock(testCase.blockType, testCase.input, 'deep');
      
      // Применяем post-processor
      const result = processor.process({ content: processed }, { stage: 'deep' });
      
      const finalContent = result.content || '';
      const containsExpected = finalContent.includes(testCase.expected);
      
      if (containsExpected) {
        log('TEST-RULES', `✅ PASS: ${testCase.name}`);
        passed++;
      } else {
        error('TEST-RULES', `❌ FAIL: ${testCase.name}`);
        error('TEST-RULES', `   Expected: "${testCase.expected}"`);
        error('TEST-RULES', `   Got: "${finalContent.substring(0, 100)}..."`);
        failed++;
        failures.push({
          name: testCase.name,
          expected: testCase.expected,
          got: finalContent.substring(0, 200)
        });
      }
    } catch (err) {
      error('TEST-RULES', `❌ ERROR: ${testCase.name}`);
      error('TEST-RULES', `   ${err.message}`);
      failed++;
      failures.push({
        name: testCase.name,
        error: err.message
      });
    }
  }

  // Итоговый отчет
  console.log('\n' + '='.repeat(60));
  log('TEST-RULES', `\n📊 Результаты тестирования:`);
  log('TEST-RULES', `   ✅ Пройдено: ${passed}/${testCases.length}`);
  log('TEST-RULES', `   ❌ Провалено: ${failed}/${testCases.length}`);
  
  if (failed > 0) {
    console.log('\n❌ Проваленные тесты:');
    failures.forEach(failure => {
      console.log(`\n  - ${failure.name}`);
      if (failure.expected) {
        console.log(`    Ожидалось: ${failure.expected}`);
        console.log(`    Получено: ${failure.got}`);
      }
      if (failure.error) {
        console.log(`    Ошибка: ${failure.error}`);
      }
    });
  }

  console.log('\n' + '='.repeat(60));
  
  if (failed === 0) {
    log('TEST-RULES', '✅ Все тесты пройдены успешно!');
    return 0;
  } else {
    error('TEST-RULES', `❌ Некоторые тесты провалены (${failed})`);
    return 1;
  }
}

// Запуск тестов
if (require.main === module) {
  testRules()
    .then(exitCode => {
      process.exit(exitCode);
    })
    .catch(err => {
      error('TEST-RULES', `Fatal error: ${err.message}`);
      process.exit(1);
    });
}

module.exports = { testRules };

