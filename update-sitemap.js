#!/usr/bin/env node

/**
 * Update sitemap.xml with all new articles
 */

const fs = require('fs');
const path = require('path');

function updateSitemap() {
  console.log('Updating sitemap.xml...');
  
  const articlesListPath = path.join(__dirname, 'articles2-list.json');
  const sitemapPath = path.join(__dirname, 'public', 'sitemap.xml');
  
  if (!fs.existsSync(articlesListPath)) {
    console.error('articles2-list.json not found!');
    process.exit(1);
  }
  
  const articleList = JSON.parse(fs.readFileSync(articlesListPath, 'utf8'));
  const baseUrl = 'https://vintrusted.com';
  const today = new Date().toISOString().split('T')[0];
  
  // Read existing sitemap if it exists
  let existingUrls = new Set();
  if (fs.existsSync(sitemapPath)) {
    const existingContent = fs.readFileSync(sitemapPath, 'utf8');
    const urlMatches = existingContent.match(/<loc>(.*?)<\/loc>/g);
    if (urlMatches) {
      urlMatches.forEach(match => {
        const url = match.replace(/<\/?loc>/g, '');
        existingUrls.add(url);
      });
    }
  }
  
  // Generate sitemap entries for new articles
  let sitemapEntries = [];
  
  articleList.forEach(article => {
    const url = `${baseUrl}${article.url}`;
    if (!existingUrls.has(url)) {
      sitemapEntries.push(`    <url>
        <loc>${url}</loc>
        <lastmod>${today}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.7</priority>
    </url>`);
    }
  });
  
  // Add pagination pages
  const articlesPerPage = 50;
  const totalPages = Math.ceil(articleList.length / articlesPerPage);
  for (let page = 1; page <= totalPages; page++) {
    const url = `${baseUrl}/articles2/page/${page}`;
    if (!existingUrls.has(url)) {
      sitemapEntries.push(`    <url>
        <loc>${url}</loc>
        <lastmod>${today}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.6</priority>
    </url>`);
    }
  }
  
  // Read existing sitemap structure
  let sitemapContent = '';
  if (fs.existsSync(sitemapPath)) {
    sitemapContent = fs.readFileSync(sitemapPath, 'utf8');
    
    // Find closing </urlset> tag
    const urlsetEnd = sitemapContent.indexOf('</urlset>');
    if (urlsetEnd !== -1) {
      // Insert new entries before closing tag
      sitemapContent = sitemapContent.slice(0, urlsetEnd) + 
                      '\n' + sitemapEntries.join('\n') + '\n' + 
                      sitemapContent.slice(urlsetEnd);
    } else {
      // Create new sitemap
      sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries.join('\n')}
</urlset>`;
    }
  } else {
    // Create new sitemap
    sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries.join('\n')}
</urlset>`;
  }
  
  // Ensure public directory exists
  const publicDir = path.join(__dirname, 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
  // Write sitemap
  fs.writeFileSync(sitemapPath, sitemapContent);
  
  console.log(`✅ Added ${sitemapEntries.length} URLs to sitemap.xml`);
  console.log(`📄 Articles: ${articleList.length}`);
  console.log(`📄 Pagination pages: ${totalPages}`);
}

if (require.main === module) {
  updateSitemap();
}

module.exports = { updateSitemap };


