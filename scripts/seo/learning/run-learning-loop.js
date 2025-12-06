#!/usr/bin/env node

/**
 * Запуск цикла самообучения
 * 
 * Использование:
 * node scripts/seo/learning/run-learning-loop.js [iterations]
 * 
 * По умолчанию: 10 итераций
 */

const { SelfLearningLoop } = require('./self-learning-loop');
const config = require('../../../data/seo/config.json');
const { log, error: logError } = require('../logger');

async function main() {
  const iterations = parseInt(process.argv[2] || '10', 10);
  
  log('SELF-LEARNING', `Starting self-learning loop with ${iterations} iterations...`);
  
  try {
    const learningLoop = new SelfLearningLoop(config);
    const versions = await learningLoop.runLearningLoop(iterations);
    
    console.log('\n✅ Self-learning loop completed!\n');
    console.log('📊 Results:');
    console.log(`   Total versions: ${versions.length}`);
    console.log(`   Initial quality: ${(versions[0]?.qualityScore || 0).toFixed(2)}`);
    console.log(`   Final quality: ${(versions[versions.length - 1]?.qualityScore || 0).toFixed(2)}`);
    console.log(`   Improvement: +${((versions[versions.length - 1]?.qualityScore || 0) - (versions[0]?.qualityScore || 0)).toFixed(2)}`);
    console.log(`\n📄 Comparison page: http://localhost:3000/learning-loop/comparison.html`);
    console.log(`\n📚 All versions:`);
    versions.forEach(v => {
      console.log(`   ${v.version}: ${(v.qualityScore * 100).toFixed(1)}% - http://localhost:3000${v.url}`);
    });
    
  } catch (err) {
    logError('SELF-LEARNING', `Error in learning loop: ${err.message}`, err);
    console.error('❌ Error:', err); // CLI output для пользователя
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };

