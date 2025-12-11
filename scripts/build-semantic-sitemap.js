#!/usr/bin/env node

/**
 * Build Sitemap for Semantic Pages + Hub Pages
 * 
 * Generates sitemap-semantic.xml including:
 * - All semantic pages (/semantic-pages/en/...)
 * - All hub/index pages (/en/, /en/dmv-titles/, etc.)
 */

const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://vintrusted.com';
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const SEMANTIC_DIR = path.join(PUBLIC_DIR, 'semantic-pages');
const OUTPUT_FILE = path.join(PUBLIC_DIR, 'sitemap-semantic.xml');

// Collect all HTML pages
function collectPages() {
  const pages = [];
  
  function scanDir(dir, relativePath = '') {
    if (!fs.existsSync(dir)) return;
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
      
      if (entry.isDirectory()) {
        scanDir(fullPath, relPath);
      } else if (entry.name === 'index.html') {
        const stats = fs.statSync(fullPath);
        pages.push({
          path: relativePath || '/',
          lastmod: stats.mtime.toISOString().split('T')[0],
          isHub: isHubPage(relativePath)
        });
      }
    }
  }
  
  scanDir(SEMANTIC_DIR);
  return pages;
}

// Detect if page is a hub page (has children)
function isHubPage(pagePath) {
  const fullPath = path.join(SEMANTIC_DIR, pagePath);
  if (!fs.existsSync(fullPath)) return false;
  
  const entries = fs.readdirSync(fullPath, { withFileTypes: true });
  const hasChildren = entries.some(e => 
    e.isDirectory() && 
    fs.existsSync(path.join(fullPath, e.name, 'index.html'))
  );
  
  return hasChildren;
}

// Determine priority based on depth and type
function getPriority(pagePath, isHub) {
  if (pagePath === '/') return '1.0';
  
  const depth = pagePath.split('/').filter(p => p).length;
  
  if (isHub) {
    // Hub pages: higher priority
    if (depth === 1) return '0.9'; // /en/
    if (depth === 2) return '0.8'; // /en/dmv-titles/
    if (depth === 3) return '0.7'; // /en/dmv-titles/az/
    return '0.6';
  } else {
    // Leaf pages: standard priority
    return '0.5';
  }
}

// Determine change frequency
function getChangeFreq(pagePath, isHub) {
  if (isHub) {
    return 'weekly'; // Hub pages change when new pages added
  } else {
    return 'monthly'; // Content pages are relatively stable
  }
}

// Generate sitemap XML
function generateSitemap(pages) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
  // Sort: hubs first, then by depth (shallow first), then alphabetically
  const sorted = pages.sort((a, b) => {
    if (a.isHub !== b.isHub) return b.isHub ? 1 : -1;
    
    const depthA = a.path.split('/').filter(p => p).length;
    const depthB = b.path.split('/').filter(p => p).length;
    if (depthA !== depthB) return depthA - depthB;
    
    return a.path.localeCompare(b.path);
  });
  
  for (const page of sorted) {
    const url = SITE_URL + (page.path === '/' ? '/semantic-pages/' : '/semantic-pages/' + page.path + '/');
    const priority = getPriority(page.path, page.isHub);
    const changefreq = getChangeFreq(page.path, page.isHub);
    
    xml += '  <url>\n';
    xml += `    <loc>${url}</loc>\n`;
    xml += `    <lastmod>${page.lastmod}</lastmod>\n`;
    xml += `    <changefreq>${changefreq}</changefreq>\n`;
    xml += `    <priority>${priority}</priority>\n`;
    xml += '  </url>\n';
  }
  
  xml += '</urlset>\n';
  return xml;
}

// Main function
function main() {
  console.log('🗺️ Building Semantic Sitemap\n');
  
  // Collect pages
  console.log('📊 Scanning semantic pages...');
  const pages = collectPages();
  
  const hubPages = pages.filter(p => p.isHub);
  const leafPages = pages.filter(p => !p.isHub);
  
  console.log(`   Hub pages: ${hubPages.length}`);
  console.log(`   Leaf pages: ${leafPages.length}`);
  console.log(`   Total: ${pages.length}\n`);
  
  // Generate sitemap
  console.log('🔨 Generating sitemap...');
  const xml = generateSitemap(pages);
  
  // Write file
  fs.writeFileSync(OUTPUT_FILE, xml, 'utf8');
  console.log(`✅ Sitemap written to: ${OUTPUT_FILE}`);
  
  // Stats
  const fileSize = (fs.statSync(OUTPUT_FILE).size / 1024).toFixed(2);
  console.log(`   Size: ${fileSize} KB`);
  console.log(`   URLs: ${pages.length}\n`);
  
  // Sample URLs
  console.log('📋 Sample URLs (first 5):');
  pages.slice(0, 5).forEach(p => {
    const url = SITE_URL + (p.path === '/' ? '/semantic-pages/' : '/semantic-pages/' + p.path + '/');
    const type = p.isHub ? '[HUB]' : '[PAGE]';
    console.log(`   ${type} ${url}`);
  });
  
  console.log('\n🎉 Done!\n');
}

if (require.main === module) {
  main();
}

module.exports = { main };
