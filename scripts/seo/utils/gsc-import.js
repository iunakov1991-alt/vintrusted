#!/usr/bin/env node

/**
 * SEO MONSTER 6.0: GSC Data Import Utility
 * 
 * Использование:
 *   node scripts/seo/utils/gsc-import.js --csv path/to/gsc-export.csv
 *   node scripts/seo/utils/gsc-import.js --json path/to/gsc-export.json
 */

const path = require('path');
const { GSCIntegration } = require('../analytics/gsc-integration');

const config = {
  enableAI: true,
  targetPagesPerBuild: 10000
};

const gsc = new GSCIntegration(config);

const args = process.argv.slice(2);
const csvIndex = args.indexOf('--csv');
const jsonIndex = args.indexOf('--json');

if (csvIndex >= 0 && args[csvIndex + 1]) {
  const csvPath = path.resolve(args[csvIndex + 1]);
  console.log(`Importing GSC data from CSV: ${csvPath}`);
  const success = gsc.importFromCSV(csvPath);
  if (success) {
    const stats = gsc.getStatistics();
    console.log('\n✅ Import successful!');
    console.log(`   Total URLs: ${stats.totalUrls}`);
    console.log(`   URLs with data: ${stats.urlsWithData}`);
    console.log(`   Total clicks: ${stats.totalClicks}`);
    console.log(`   Total impressions: ${stats.totalImpressions}`);
    console.log(`   Avg CTR: ${stats.avgCTR.toFixed(2)}%`);
    console.log(`   Avg Position: ${stats.avgPosition.toFixed(1)}`);
  } else {
    console.error('\n❌ Import failed. Check logs for details.');
    process.exit(1);
  }
} else if (jsonIndex >= 0 && args[jsonIndex + 1]) {
  const jsonPath = path.resolve(args[jsonIndex + 1]);
  console.log(`Importing GSC data from JSON: ${jsonPath}`);
  const success = gsc.importFromJSON(jsonPath);
  if (success) {
    const stats = gsc.getStatistics();
    console.log('\n✅ Import successful!');
    console.log(`   Total URLs: ${stats.totalUrls}`);
    console.log(`   URLs with data: ${stats.urlsWithData}`);
    console.log(`   Total clicks: ${stats.totalClicks}`);
    console.log(`   Total impressions: ${stats.totalImpressions}`);
    console.log(`   Avg CTR: ${stats.avgCTR.toFixed(2)}%`);
    console.log(`   Avg Position: ${stats.avgPosition.toFixed(1)}`);
  } else {
    console.error('\n❌ Import failed. Check logs for details.');
    process.exit(1);
  }
} else {
  console.log('Usage:');
  console.log('  node scripts/seo/utils/gsc-import.js --csv path/to/gsc-export.csv');
  console.log('  node scripts/seo/utils/gsc-import.js --json path/to/gsc-export.json');
  console.log('\nTo export from Google Search Console:');
  console.log('  1. Go to https://search.google.com/search-console');
  console.log('  2. Select your property');
  console.log('  3. Go to Performance > Search Results');
  console.log('  4. Click "Export" and download CSV or JSON');
  process.exit(1);
}

