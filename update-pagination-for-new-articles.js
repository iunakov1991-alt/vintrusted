#!/usr/bin/env node

/**
 * Update pagination for all articles2 articles (including new 5000)
 * Updates pagination pages and routes in vercel.json
 */

const fs = require('fs');
const path = require('path');
const { generatePage } = require('./generate-seo-pages.js');

function updatePagination() {
  console.log('🔄 Updating pagination for all articles...\n');
  
  const articlesListPath = path.join(__dirname, 'articles2-list.json');
  if (!fs.existsSync(articlesListPath)) {
    console.error('❌ articles2-list.json not found!');
    process.exit(1);
  }
  
  const articleList = JSON.parse(fs.readFileSync(articlesListPath, 'utf8'));
  const articlesPerPage = 50;
  const totalPages = Math.ceil(articleList.length / articlesPerPage);
  
  console.log(`📊 Statistics:`);
  console.log(`   Total articles: ${articleList.length}`);
  console.log(`   Articles per page: ${articlesPerPage}`);
  console.log(`   Total pages needed: ${totalPages}\n`);
  
  const baseDir = path.join(__dirname, 'articles2');
  const paginationDir = path.join(baseDir, 'page');
  
  if (!fs.existsSync(paginationDir)) {
    fs.mkdirSync(paginationDir, { recursive: true });
  }
  
  // Remove old pagination pages
  if (fs.existsSync(paginationDir)) {
    const oldPages = fs.readdirSync(paginationDir);
    for (const pageDir of oldPages) {
      const pagePath = path.join(paginationDir, pageDir);
      if (fs.statSync(pagePath).isDirectory()) {
        fs.rmSync(pagePath, { recursive: true, force: true });
      }
    }
  }
  
  const routes = [];
  
  console.log('📝 Generating pagination pages...\n');
  
  for (let page = 1; page <= totalPages; page++) {
    const start = (page - 1) * articlesPerPage;
    const end = start + articlesPerPage;
    const pageArticles = articleList.slice(start, end);
    
    // Generate pagination HTML
    let articlesHTML = '<div class="articles-list">\n';
    articlesHTML += '<h1>Vehicle History Articles</h1>\n';
    articlesHTML += '<p class="lead">Browse our comprehensive collection of vehicle history and verification articles.</p>\n';
    articlesHTML += '<ul class="articles-grid">\n';
    
    pageArticles.forEach(article => {
      articlesHTML += `    <li><a href="${article.url}">${article.title}</a></li>\n`;
    });
    
    articlesHTML += '</ul>\n';
    articlesHTML += '</div>\n';
    
    // Pagination navigation
    let paginationHTML = '<nav class="pagination">\n';
    if (page > 1) {
      paginationHTML += `    <a href="/articles2/page/${page - 1}" class="prev">← Previous</a>\n`;
    }
    paginationHTML += `    <span class="current">Page ${page} of ${totalPages}</span>\n`;
    if (page < totalPages) {
      paginationHTML += `    <a href="/articles2/page/${page + 1}" class="next">Next →</a>\n`;
    }
    paginationHTML += '</nav>\n';
    
    const content = articlesHTML + '\n' + paginationHTML;
    
    const pageHTML = generatePage({
      title: `Vehicle History Articles - Page ${page} of ${totalPages} | VIN Trust`,
      description: `Browse page ${page} of ${totalPages} of our vehicle history articles. Comprehensive guides on VIN checks, accident history, title verification, and more.`,
      keywords: `vehicle history articles, vin check articles, page ${page}, car history guides, vehicle verification`,
      canonical: `/articles2/page/${page}`,
      ogTitle: `Vehicle History Articles - Page ${page} of ${totalPages}`,
      ogDescription: `Browse our collection of ${articleList.length} vehicle history articles on page ${page}.`,
      schemaType: 'CollectionPage',
      schemaName: `Vehicle History Articles - Page ${page}`,
      schemaDescription: `Page ${page} of ${totalPages} of vehicle history articles`,
      content: content
    });
    
    // Create page directory
    const pageDir = path.join(paginationDir, String(page));
    if (!fs.existsSync(pageDir)) {
      fs.mkdirSync(pageDir, { recursive: true });
    }
    
    // Write file
    fs.writeFileSync(path.join(pageDir, 'index.html'), pageHTML);
    
    // Add routes (with and without trailing slash)
    routes.push({
      src: `/articles2/page/${page}`,
      dest: `/articles2/page/${page}/index.html`
    });
    routes.push({
      src: `/articles2/page/${page}/`,
      dest: `/articles2/page/${page}/index.html`
    });
    
    if (page % 50 === 0 || page === totalPages) {
      console.log(`   ✅ Generated ${page}/${totalPages} pagination pages...`);
    }
  }
  
  console.log(`\n✅ Generated ${totalPages} pagination pages`);
  console.log(`📋 Routes created: ${routes.length}`);
  
  // Update vercel.json
  console.log('\n🔄 Updating vercel.json...');
  
  const vercelPath = path.join(__dirname, 'vercel.json');
  const vercel = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
  
  // Remove old pagination routes
  vercel.routes = vercel.routes.filter(route => {
    const src = route.src || '';
    return !src.includes('/articles2/page/');
  });
  
  // Add new pagination routes
  vercel.routes = [...vercel.routes, ...routes];
  
  // Backup
  const backupPath = path.join(__dirname, `vercel.json.backup.pagination.${Date.now()}`);
  fs.writeFileSync(backupPath, JSON.stringify(JSON.parse(fs.readFileSync(vercelPath, 'utf8')), null, 2));
  console.log(`💾 Backup created: ${backupPath}`);
  
  // Save updated vercel.json
  fs.writeFileSync(vercelPath, JSON.stringify(vercel, null, 2));
  console.log(`✅ Updated vercel.json`);
  console.log(`📊 Total routes in vercel.json: ${vercel.routes.length}`);
  
  // Save routes
  fs.writeFileSync(
    path.join(__dirname, 'pagination-routes.json'),
    JSON.stringify(routes, null, 2)
  );
  
  return { routes, totalPages };
}

if (require.main === module) {
  try {
    const { routes, totalPages } = updatePagination();
    console.log(`\n📊 Final Statistics:`);
    console.log(`   Pagination pages: ${totalPages}`);
    console.log(`   Routes created: ${routes.length}`);
    console.log(`\n✅ Pagination update complete!`);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

module.exports = { updatePagination };

