#!/usr/bin/env node

/**
 * SEO MONSTER 6.0: External Metrics Import Utility
 * 
 * Использование:
 *   node scripts/seo/utils/metrics-import.js --csv path/to/analytics-export.csv
 *   node scripts/seo/utils/metrics-import.js --json path/to/analytics-export.json
 */

const path = require('path');
const { ExternalMetrics } = require('../analytics/external-metrics');

const config = {
  enableAI: true,
  targetPagesPerBuild: 10000
};

const metrics = new ExternalMetrics(config);

const args = process.argv.slice(2);
const csvIndex = args.indexOf('--csv');
const jsonIndex = args.indexOf('--json');

if (csvIndex >= 0 && args[csvIndex + 1]) {
  const csvPath = path.resolve(args[csvIndex + 1]);
  console.log(`Importing external metrics from CSV: ${csvPath}`);
  const success = metrics.importFromAnalyticsCSV(csvPath);
  if (success) {
    const stats = metrics.getStatistics();
    console.log('\n✅ Import successful!');
    console.log(`   Total URLs: ${stats.totalUrls}`);
    console.log(`   URLs with bounce rate: ${stats.urlsWithBounceRate}`);
    console.log(`   URLs with time on page: ${stats.urlsWithTimeOnPage}`);
    console.log(`   Avg bounce rate: ${stats.avgBounceRate.toFixed(2)}%`);
    console.log(`   Avg time on page: ${stats.avgTimeOnPage.toFixed(1)}s`);
  } else {
    console.error('\n❌ Import failed. Check logs for details.');
    process.exit(1);
  }
} else if (jsonIndex >= 0 && args[jsonIndex + 1]) {
  const jsonPath = path.resolve(args[jsonIndex + 1]);
  console.log(`Importing external metrics from JSON: ${jsonPath}`);
  const success = metrics.importFromJSON(jsonPath);
  if (success) {
    const stats = metrics.getStatistics();
    console.log('\n✅ Import successful!');
    console.log(`   Total URLs: ${stats.totalUrls}`);
    console.log(`   URLs with bounce rate: ${stats.urlsWithBounceRate}`);
    console.log(`   URLs with time on page: ${stats.urlsWithTimeOnPage}`);
    console.log(`   Avg bounce rate: ${stats.avgBounceRate.toFixed(2)}%`);
    console.log(`   Avg time on page: ${stats.avgTimeOnPage.toFixed(1)}s`);
  } else {
    console.error('\n❌ Import failed. Check logs for details.');
    process.exit(1);
  }
} else {
  console.log('Usage:');
  console.log('  node scripts/seo/utils/metrics-import.js --csv path/to/analytics-export.csv');
  console.log('  node scripts/seo/utils/metrics-import.js --json path/to/analytics-export.json');
  console.log('\nTo export from Google Analytics:');
  console.log('  1. Go to your GA4 property');
  console.log('  2. Go to Reports > Engagement > Pages and screens');
  console.log('  3. Export data as CSV or JSON');
  process.exit(1);
}

