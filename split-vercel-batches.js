#!/usr/bin/env node

/**
 * Split vercel.json into batches for deployment
 * Batch 1: articles (batch 1) only
 * Batch 2: articles2 (batch 2) + pagination
 */

const fs = require('fs');
const path = require('path');

function splitVercelBatches() {
  console.log('Splitting vercel.json into batches...\n');
  
  const vercelPath = path.join(__dirname, 'vercel.json');
  const backupPath = path.join(__dirname, 'vercel.json.backup');
  
  // Read full version
  let fullData;
  if (fs.existsSync(backupPath)) {
    fullData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  } else if (fs.existsSync(vercelPath)) {
    fullData = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
    // Create backup
    fs.writeFileSync(backupPath, JSON.stringify(fullData, null, 2));
    console.log('✅ Created backup: vercel.json.backup\n');
  } else {
    console.error('❌ vercel.json not found!');
    process.exit(1);
  }
  
  const allRoutes = fullData.routes || [];
  
  // Categorize routes
  const batch1Routes = allRoutes.filter(r => 
    r.src && r.src.startsWith('/articles/') && !r.src.startsWith('/articles2/')
  );
  
  const batch2Routes = allRoutes.filter(r => 
    r.src && r.src.startsWith('/articles2/')
  );
  
  const otherRoutes = allRoutes.filter(r => 
    !r.src || (!r.src.startsWith('/articles/') && !r.src.startsWith('/articles2/'))
  );
  
  console.log('Route distribution:');
  console.log(`  Batch 1 (articles/): ${batch1Routes.length}`);
  console.log(`  Batch 2 (articles2/): ${batch2Routes.length}`);
  console.log(`  Other routes: ${otherRoutes.length}`);
  console.log(`  Total: ${allRoutes.length}\n`);
  
  // Create Batch 1 version (only articles, no articles2)
  const batch1Data = {
    ...fullData,
    routes: [...otherRoutes, ...batch1Routes]
  };
  
  // Save Batch 1 version
  const batch1Path = path.join(__dirname, 'vercel-batch1.json');
  fs.writeFileSync(batch1Path, JSON.stringify(batch1Data, null, 2));
  
  console.log('✅ Created vercel-batch1.json');
  console.log(`   Routes: ${batch1Data.routes.length}`);
  
  // Validate Batch 1
  try {
    JSON.parse(fs.readFileSync(batch1Path, 'utf8'));
    console.log('✅ Batch 1 JSON is valid\n');
  } catch (error) {
    console.error('❌ Batch 1 JSON validation failed:', error.message);
    process.exit(1);
  }
  
  // Check for duplicates in Batch 1
  const batch1Srcs = batch1Data.routes.map(r => r.src);
  const batch1Duplicates = batch1Srcs.filter((item, index) => batch1Srcs.indexOf(item) !== index);
  if (batch1Duplicates.length > 0) {
    console.log(`⚠️  Found ${batch1Duplicates.length} duplicates in Batch 1`);
  } else {
    console.log('✅ No duplicates in Batch 1\n');
  }
  
  console.log('📋 Summary:');
  console.log(`   Batch 1 ready: ${batch1Data.routes.length} routes`);
  console.log(`   Batch 2 pending: ${batch2Routes.length} routes`);
  console.log(`   Backup saved: vercel.json.backup\n`);
  
  return {
    batch1Data,
    batch2Routes,
    otherRoutes,
    fullData
  };
}

if (require.main === module) {
  splitVercelBatches();
}

module.exports = { splitVercelBatches };


