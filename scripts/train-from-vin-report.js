#!/usr/bin/env node

/**
 * SEO MONSTER 6.0: VIN Report Training Script
 * Обучение AI на основе реального VIN отчета
 * ТРИЗ: Максимальный эффект от минимального шага
 */

const path = require('path');
const fs = require('fs');
const { VINReportTrainingIntegration } = require('./seo/ai/vin-report-training-integration');
const { log } = require('./seo/logger');

// Загрузка конфига
const configPath = path.join(process.cwd(), 'data/seo/config.json');
const config = fs.existsSync(configPath) 
  ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
  : {};

async function main() {
  const pdfPath = process.argv[2] || 'VIN-Report-5TDYK3DC8DS290235.pdf';
  const fullPath = path.isAbsolute(pdfPath) ? pdfPath : path.join(process.cwd(), pdfPath);
  
  log('VIN-REPORT-TRAINING', `Starting training from: ${fullPath}`);
  
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ PDF file not found: ${fullPath}`);
    console.error(`\nUsage: node scripts/train-from-vin-report.js [path-to-pdf]`);
    console.error(`\nExample: node scripts/train-from-vin-report.js VIN-Report-5TDYK3DC8DS290235.pdf`);
    process.exit(1);
  }
  
  try {
    const integration = new VINReportTrainingIntegration(config);
    const result = await integration.trainFromReport(fullPath);
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ VIN REPORT TRAINING COMPLETED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('📊 EXTRACTED DATA:');
    console.log(`   - Sections: ${result.extractedData.sections}`);
    console.log(`   - Semantic Patterns: ${result.extractedData.semanticPatterns.length}`);
    console.log(`   - Data Types: ${result.extractedData.dataTypes.length}`);
    console.log(`   - Writing Style: ${JSON.stringify(result.extractedData.writingStyle, null, 2)}`);
    console.log(`   - Metrics: ${JSON.stringify(result.extractedData.metrics, null, 2)}`);
    
    console.log('\n💡 RECOMMENDATIONS:');
    result.recommendations.forEach((rec, i) => {
      console.log(`   ${i + 1}. [${rec.type}] ${rec.message}`);
    });
    
    console.log(`\n📄 Training data saved to: ${result.trainingPath}`);
    console.log('\n✅ AI Training Pipeline enriched with VIN report structure and patterns');
    console.log('⚠️  All competitor brands (ClearVin/Clear Vin) have been removed\n');
    
  } catch (e) {
    console.error(`\n❌ Error: ${e.message}`);
    console.error(e.stack);
    process.exit(1);
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});


