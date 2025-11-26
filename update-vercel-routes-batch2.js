#!/usr/bin/env node

/**
 * Update vercel.json with 10,000 new article routes
 */

const fs = require('fs');
const path = require('path');

function updateVercelJson() {
  console.log('Updating vercel.json with new article routes...');
  
  const vercelPath = path.join(__dirname, 'vercel.json');
  const articlesListPath = path.join(__dirname, 'articles2-list.json');
  
  if (!fs.existsSync(articlesListPath)) {
    console.error('articles2-list.json not found! Run generate-10000-seo-articles.js first.');
    process.exit(1);
  }
  
  const articleList = JSON.parse(fs.readFileSync(articlesListPath, 'utf8'));
  const vercelData = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
  
  // Generate routes
  const newRoutes = [];
  articleList.forEach(article => {
    newRoutes.push({
      src: `/articles2/${article.slug}`,
      dest: `/articles2/${article.slug}/index.html`
    });
    newRoutes.push({
      src: `/articles2/${article.slug}/`,
      dest: `/articles2/${article.slug}/index.html`
    });
  });
  
  // Remove duplicates
  const existingRoutes = vercelData.routes || [];
  const existingSrcs = new Set(existingRoutes.map(r => r.src));
  const uniqueNewRoutes = newRoutes.filter(r => !existingSrcs.has(r.src));
  
  // Add new routes
  vercelData.routes = [...existingRoutes, ...uniqueNewRoutes];
  
  // Write back
  fs.writeFileSync(vercelPath, JSON.stringify(vercelData, null, 2));
  
  console.log(`✅ Added ${uniqueNewRoutes.length} new routes to vercel.json`);
  console.log(`📊 Total routes now: ${vercelData.routes.length}`);
  console.log(`📄 Total articles: ${articleList.length}`);
  
  // Validate JSON
  try {
    JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
    console.log('✅ vercel.json is valid');
  } catch (error) {
    console.error('❌ vercel.json validation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  updateVercelJson();
}

module.exports = { updateVercelJson };


