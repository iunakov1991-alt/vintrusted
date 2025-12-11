#!/usr/bin/env node

/**
 * Generate Hub/Index Pages for semantic navigation
 * 
 * Creates intermediate pages like:
 * - /en/ (language hub)
 * - /en/dmv-titles/ (zone hub)
 * - /en/dmv-titles/az/ (state hub)
 * - /en/dmv-titles/az/duplicate-title/ (topic hub)
 * 
 * These pages list all child pages and provide navigation
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PUBLIC_DIR = path.join(__dirname, '..', 'public', 'semantic-pages');
const SITE_URL = 'https://vintrusted.com';

// Collect all existing pages
function collectAllPages() {
  const pages = [];
  
  function scanDir(dir, relativePath = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
      
      if (entry.isDirectory()) {
        scanDir(fullPath, relPath);
      } else if (entry.name === 'index.html') {
        pages.push(relativePath); // Path without /index.html
      }
    }
  }
  
  if (fs.existsSync(PUBLIC_DIR)) {
    scanDir(PUBLIC_DIR);
  }
  
  return pages;
}

// Extract all intermediate paths (hub pages)
function extractHubPaths(pages) {
  const hubs = new Set();
  
  for (const page of pages) {
    const parts = page.split('/').filter(p => p);
    
    // Generate all intermediate paths
    for (let i = 1; i <= parts.length; i++) {
      const hubPath = parts.slice(0, i).join('/');
      hubs.add(hubPath);
    }
  }
  
  return Array.from(hubs).sort();
}

// Get children pages for a hub
function getChildren(hubPath, allPages) {
  const children = [];
  const hubParts = hubPath.split('/').filter(p => p);
  const hubDepth = hubParts.length;
  
  for (const page of allPages) {
    if (!page.startsWith(hubPath + '/')) continue;
    
    const pageParts = page.split('/').filter(p => p);
    
    // Only immediate children (one level deeper)
    if (pageParts.length === hubDepth + 1) {
      children.push(page);
    }
  }
  
  return children.sort();
}

// Generate breadcrumbs for hub page
function generateBreadcrumbs(hubPath) {
  const parts = hubPath.split('/').filter(p => p);
  const breadcrumbs = [
    {
      position: 0,
      name: 'Home',
      url: SITE_URL + '/'
    }
  ];
  
  let currentPath = '';
  for (let i = 0; i < parts.length; i++) {
    currentPath += '/' + parts[i];
    breadcrumbs.push({
      position: i + 1,
      name: humanize(parts[i]),
      url: SITE_URL + currentPath + '/'
    });
  }
  
  return breadcrumbs;
}

// Humanize path part (e.g., "dmv-titles" -> "DMV Titles")
function humanize(str) {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Generate meta description for hub
function generateDescription(hubPath, childCount) {
  const parts = hubPath.split('/').filter(p => p);
  const last = parts[parts.length - 1];
  
  if (parts.length === 1) {
    // Language hub
    return `Browse all ${humanize(last)} vehicle history and DMV resources. ${childCount} categories available.`;
  }
  
  if (parts[1] === 'dmv-titles' && parts.length === 2) {
    // Zone hub
    return `Complete DMV title guides and checklists for all states. ${childCount} states covered.`;
  }
  
  if (parts[1] === 'dmv-titles' && parts.length === 3) {
    // State hub
    const state = parts[2].toUpperCase();
    return `${humanize(parts[2])} DMV title guides, transfer checklists, and registration requirements. ${childCount} guides available.`;
  }
  
  // Topic hub
  return `Complete guides and checklists for ${humanize(last)}. ${childCount} resources available.`;
}

// Generate title for hub
function generateTitle(hubPath, childCount) {
  const parts = hubPath.split('/').filter(p => p);
  const last = parts[parts.length - 1];
  
  if (parts.length === 1) {
    return `${humanize(last)} - Vehicle History & DMV Guides`;
  }
  
  if (parts[1] === 'dmv-titles' && parts.length === 2) {
    return `DMV Title Guides - All States`;
  }
  
  if (parts[1] === 'dmv-titles' && parts.length === 3) {
    const state = humanize(parts[2]);
    return `${state} DMV Title Guides & Checklists`;
  }
  
  return `${humanize(last)} - Complete Guides`;
}

// Generate HTML for hub page
function generateHubHTML(hubPath, children, allPages) {
  const breadcrumbs = generateBreadcrumbs(hubPath);
  const title = generateTitle(hubPath, children.length);
  const description = generateDescription(hubPath, children.length);
  const canonicalUrl = SITE_URL + '/' + hubPath + '/';
  
  // Group children by category if possible
  const childGroups = {};
  for (const child of children) {
    const childParts = child.split('/').filter(p => p);
    const lastPart = childParts[childParts.length - 1];
    
    if (!childGroups[lastPart]) {
      childGroups[lastPart] = [];
    }
    childGroups[lastPart].push(child);
  }
  
  // Generate child links HTML
  let childLinksHTML = '';
  for (const [category, pages] of Object.entries(childGroups)) {
    childLinksHTML += `
    <div class="hub-category">
      <h3>${humanize(category)}</h3>
      <ul class="hub-links">`;
    
    for (const page of pages) {
      const pageTitle = humanize(page.split('/').pop());
      childLinksHTML += `
        <li><a href="/${page}/">${pageTitle}</a></li>`;
    }
    
    childLinksHTML += `
      </ul>
    </div>`;
  }
  
  // Generate breadcrumb JSON-LD
  const breadcrumbJSON = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map(bc => ({
      '@type': 'ListItem',
      position: bc.position,
      name: bc.name,
      item: bc.url
    }))
  };
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${canonicalUrl}">
  <link rel="icon" type="image/svg+xml" href="${SITE_URL}/img/favicon.svg">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:site_name" content="VIN Trust">
  <script type="application/ld+json">
${JSON.stringify(breadcrumbJSON, null, 2)}
  </script>
  <style>
    :root {
      --bg-page: #05070b;
      --bg-elevated: #0c1018;
      --text-main: #f5f7ff;
      --text-muted: #a7b0c5;
      --accent: #4f8cff;
      --font-sans: system-ui, -apple-system, sans-serif;
    }
    
    body {
      font-family: var(--font-sans);
      background: radial-gradient(circle at top, #101525 0, #05070b 52%, #020308 100%);
      color: var(--text-main);
      margin: 0;
      padding: 40px 20px;
      line-height: 1.6;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .breadcrumbs {
      display: flex;
      gap: 8px;
      margin-bottom: 32px;
      font-size: 14px;
      color: var(--text-muted);
    }
    
    .breadcrumbs a {
      color: var(--accent);
      text-decoration: none;
    }
    
    .breadcrumbs a:hover {
      text-decoration: underline;
    }
    
    h1 {
      font-size: 42px;
      margin: 0 0 16px 0;
      font-weight: 600;
      letter-spacing: -0.02em;
    }
    
    .description {
      font-size: 18px;
      color: var(--text-muted);
      margin-bottom: 48px;
    }
    
    .hub-category {
      background: var(--bg-elevated);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
    }
    
    .hub-category h3 {
      margin: 0 0 16px 0;
      font-size: 20px;
      color: var(--accent);
    }
    
    .hub-links {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 12px;
    }
    
    .hub-links a {
      display: block;
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.04);
      border-radius: 8px;
      color: var(--text-main);
      text-decoration: none;
      transition: all 0.2s;
    }
    
    .hub-links a:hover {
      background: rgba(79, 140, 255, 0.12);
      color: var(--accent);
      transform: translateX(4px);
    }
    
    .footer {
      margin-top: 64px;
      padding-top: 32px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      text-align: center;
      color: var(--text-muted);
      font-size: 14px;
    }
    
    .footer a {
      color: var(--accent);
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <nav class="breadcrumbs">
      ${breadcrumbs.map((bc, i) => 
        i === breadcrumbs.length - 1 
          ? `<span>${bc.name}</span>`
          : `<a href="${bc.url}">${bc.name}</a><span>/</span>`
      ).join('')}
    </nav>
    
    <h1>${title}</h1>
    <p class="description">${description}</p>
    
    ${childLinksHTML}
    
    <footer class="footer">
      <p><a href="/">VIN Trust</a> © 2025 | <a href="/privacy">Privacy</a> | <a href="/terms">Terms</a></p>
    </footer>
  </div>
</body>
</html>`;
  
  return html;
}

// Main function
function main() {
  console.log('🚀 Generating Hub/Index Pages\n');
  
  // Collect all existing pages
  console.log('📊 Scanning existing pages...');
  const allPages = collectAllPages();
  console.log(`   Found ${allPages.length} pages\n`);
  
  // Extract hub paths
  console.log('🔍 Extracting hub paths...');
  const hubPaths = extractHubPaths(allPages);
  console.log(`   Need ${hubPaths.length} hub pages\n`);
  
  // Generate each hub page
  let created = 0;
  let skipped = 0;
  
  for (const hubPath of hubPaths) {
    const hubDir = path.join(PUBLIC_DIR, hubPath);
    const hubFile = path.join(hubDir, 'index.html');
    
    // Skip if already exists (unless it's a leaf page)
    if (fs.existsSync(hubFile) && allPages.includes(hubPath)) {
      skipped++;
      continue;
    }
    
    // Get children
    const children = getChildren(hubPath, allPages);
    
    if (children.length === 0) {
      // Leaf page, skip
      skipped++;
      continue;
    }
    
    // Create directory
    if (!fs.existsSync(hubDir)) {
      fs.mkdirSync(hubDir, { recursive: true });
    }
    
    // Generate HTML
    const html = generateHubHTML(hubPath, children, allPages);
    
    // Write file
    fs.writeFileSync(hubFile, html, 'utf8');
    created++;
    
    console.log(`✅ Created: /${hubPath}/`);
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped} (already exist or leaf pages)`);
  console.log(`   Total hub pages: ${created + skipped}\n`);
  
  console.log('🎉 Done!\n');
}

if (require.main === module) {
  main();
}

module.exports = { main };
