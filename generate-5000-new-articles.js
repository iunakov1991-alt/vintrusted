#!/usr/bin/env node

/**
 * Generate 5,000 New Unique SEO Articles
 * Creates new articles and adds them to vercel.json
 */

const fs = require('fs');
const path = require('path');
const { generatePage } = require('./generate-seo-pages.js');

// Extended topics for more variety
const topics = {
  carBrands: ['toyota', 'honda', 'ford', 'chevrolet', 'nissan', 'bmw', 'mercedes', 'audi', 'volkswagen', 'hyundai', 'kia', 'mazda', 'subaru', 'jeep', 'ram', 'gmc', 'lexus', 'acura', 'infiniti', 'cadillac', 'lincoln', 'buick', 'chrysler', 'dodge', 'jaguar', 'land-rover', 'porsche', 'tesla', 'volvo', 'mini', 'genesis', 'rivian', 'lucid', 'polestar', 'fisker'],
  states: ['alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut', 'delaware', 'florida', 'georgia', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa', 'kansas', 'kentucky', 'louisiana', 'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota', 'mississippi', 'missouri', 'montana', 'nebraska', 'nevada', 'new-hampshire', 'new-jersey', 'new-mexico', 'new-york', 'north-carolina', 'north-dakota', 'ohio', 'oklahoma', 'oregon', 'pennsylvania', 'rhode-island', 'south-carolina', 'south-dakota', 'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington', 'west-virginia', 'wisconsin', 'wyoming'],
  topics: ['vin-check', 'accident-history', 'title-check', 'odometer-verification', 'lien-check', 'theft-check', 'flood-damage', 'salvage-title', 'auction-history', 'recall-check', 'ownership-history', 'service-records', 'insurance-claims', 'frame-damage', 'airbag-deployment', 'total-loss', 'rebuilt-title', 'clean-title', 'branded-title', 'export-import', 'nmvtis-report', 'carfax-alternative', 'vehicle-history', 'pre-purchase-inspection', 'used-car-check', 'certified-pre-owned', 'lemon-law', 'warranty-check', 'maintenance-history', 'emissions-test', 'registration-check', 'dmv-records', 'vehicle-registration', 'title-transfer', 'ownership-transfer', 'vehicle-verification', 'vin-decoder', 'vin-lookup', 'vehicle-inspection', 'safety-inspection'],
  guides: ['how-to-check', 'what-is', 'why-you-need', 'complete-guide-to', 'ultimate-guide', 'everything-about', 'understanding', 'decoding', 'verifying', 'reading', 'interpreting', 'analyzing', 'comparing', 'choosing', 'buying', 'selling', 'trading', 'financing', 'insuring', 'registering', 'transferring', 'reporting', 'documenting', 'validating'],
  years: Array.from({length: 35}, (_, i) => 1990 + i),
  models: ['sedan', 'suv', 'truck', 'coupe', 'convertible', 'hatchback', 'wagon', 'van', 'crossover', 'hybrid', 'electric', 'luxury', 'sports', 'compact', 'mid-size', 'full-size', 'pickup', 'minivan', 'roadster'],
  problems: ['engine-problems', 'transmission-issues', 'brake-problems', 'electrical-issues', 'suspension-problems', 'cooling-system', 'fuel-system', 'exhaust-system', 'steering-problems', 'tire-issues'],
  repairs: ['engine-repair', 'transmission-repair', 'brake-repair', 'electrical-repair', 'body-repair', 'paint-repair', 'interior-repair', 'ac-repair', 'heating-repair'],
  dmv: ['dmv-registration', 'dmv-title', 'dmv-transfer', 'dmv-renewal', 'dmv-fees', 'dmv-requirements', 'dmv-forms', 'dmv-appointment']
};

// Generate unique article slugs
function generateArticleSlugs(count = 5000) {
  const slugs = new Set();
  const articles = [];
  
  let id = 0;
  const startId = 10000; // Start from 10000 to avoid conflicts
  
  // Pattern 1: brand + year + topic (1500)
  for (const brand of topics.carBrands) {
    for (const year of topics.years.slice(10, 25)) {
      for (const topic of topics.topics.slice(0, 3)) {
        if (slugs.size >= count) break;
        const slug = `${brand}-${year}-${topic}`;
        if (!slugs.has(slug)) {
          slugs.add(slug);
          articles.push({ slug: `article-${String(startId + id).padStart(6, '0')}`, originalSlug: slug, id: id++ });
        }
      }
    }
  }
  
  // Pattern 2: state + brand + topic (1000)
  for (const state of topics.states) {
    for (const brand of topics.carBrands.slice(0, 20)) {
      for (const topic of topics.topics.slice(0, 2)) {
        if (slugs.size >= count) break;
        const slug = `${state}-${brand}-${topic}`;
        if (!slugs.has(slug)) {
          slugs.add(slug);
          articles.push({ slug: `article-${String(startId + id).padStart(6, '0')}`, originalSlug: slug, id: id++ });
        }
      }
    }
  }
  
  // Pattern 3: model + year + problem (1000)
  for (const model of topics.models) {
    for (const year of topics.years.slice(15, 30)) {
      for (const problem of topics.problems.slice(0, 3)) {
        if (slugs.size >= count) break;
        const slug = `${model}-${year}-${problem}`;
        if (!slugs.has(slug)) {
          slugs.add(slug);
          articles.push({ slug: `article-${String(startId + id).padStart(6, '0')}`, originalSlug: slug, id: id++ });
        }
      }
    }
  }
  
  // Pattern 4: guide + brand + state (800)
  for (const guide of topics.guides.slice(0, 20)) {
    for (const brand of topics.carBrands.slice(0, 20)) {
      for (const state of topics.states.slice(0, 2)) {
        if (slugs.size >= count) break;
        const slug = `${guide}-${brand}-${state}`;
        if (!slugs.has(slug)) {
          slugs.add(slug);
          articles.push({ slug: `article-${String(startId + id).padStart(6, '0')}`, originalSlug: slug, id: id++ });
        }
      }
    }
  }
  
  // Pattern 5: topic + repair + brand (700)
  for (const topic of topics.topics.slice(0, 20)) {
    for (const repair of topics.repairs) {
      for (const brand of topics.carBrands.slice(0, 10)) {
        if (slugs.size >= count) break;
        const slug = `${topic}-${repair}-${brand}`;
        if (!slugs.has(slug)) {
          slugs.add(slug);
          articles.push({ slug: `article-${String(startId + id).padStart(6, '0')}`, originalSlug: slug, id: id++ });
        }
      }
    }
  }
  
  // Pattern 6: Random combinations (remaining)
  const allTopics = [...topics.topics, ...topics.guides, ...topics.problems, ...topics.repairs];
  while (slugs.size < count) {
    const topic1 = allTopics[Math.floor(Math.random() * allTopics.length)];
    const topic2 = allTopics[Math.floor(Math.random() * allTopics.length)];
    const num = Math.floor(Math.random() * 100000);
    const slug = `${topic1}-${topic2}-${num}`;
    if (!slugs.has(slug) && slug.length < 100) {
      slugs.add(slug);
      articles.push({ slug: `article-${String(startId + id).padStart(6, '0')}`, originalSlug: slug, id: id++ });
    }
    if (slugs.size >= count) break;
  }
  
  return articles.slice(0, count);
}

// Generate article content (simplified version)
function generateArticleContent(slug, title) {
  return `
    <h1>${title}</h1>
    
    <div class="intro-section">
      <p class="lead">When purchasing a used vehicle, understanding ${title} is crucial for making an informed decision. This comprehensive guide explores everything you need to know about ${title}, from basic concepts to advanced verification techniques.</p>
    </div>
    
    <section>
      <h2>Understanding ${title}</h2>
      <p>${title} plays a vital role in vehicle transactions. This detailed examination covers the essential aspects, including legal requirements, common issues, and best practices. Our expert analysis helps you navigate the complexities of vehicle verification.</p>
    </section>
    
    <section>
      <h2>Key Benefits of ${title}</h2>
      <ul>
        <li><strong>Transparency:</strong> Get complete visibility into a vehicle's history</li>
        <li><strong>Protection:</strong> Avoid costly mistakes and hidden problems</li>
        <li><strong>Confidence:</strong> Make informed decisions with verified information</li>
        <li><strong>Legal Compliance:</strong> Ensure all documentation is in order</li>
      </ul>
    </section>
    
    <section>
      <h2>How to Use ${title}</h2>
      <p>To effectively use ${title}, follow these steps:</p>
      <ol>
        <li>Gather all necessary vehicle information</li>
        <li>Access the verification system</li>
        <li>Review the comprehensive report</li>
        <li>Make an informed decision based on the findings</li>
      </ol>
    </section>
    
    <section>
      <h2>Frequently Asked Questions</h2>
      <h3>What is ${title}?</h3>
      <p>${title} is a comprehensive vehicle verification service that provides detailed information about a vehicle's history, including accidents, ownership, and maintenance records.</p>
      
      <h3>Why is ${title} important?</h3>
      <p>${title} helps protect buyers from purchasing vehicles with hidden problems, ensuring transparency and peace of mind in vehicle transactions.</p>
      
      <h3>How accurate is ${title}?</h3>
      <p>${title} uses official databases and verified sources to provide accurate and up-to-date information about vehicle history.</p>
    </section>
    
    <div class="cta-section">
      <h2>Get Your Vehicle History Report Now</h2>
      <p>Don't risk buying a vehicle without complete information. Get your comprehensive vehicle history report for just $3.</p>
      <div class="cta-buttons">
        <a href="/" class="btn btn-primary">Check VIN Now — $3</a>
      </div>
    </div>
  `;
}

// Main function
async function generateAndAddArticles(count = 5000) {
  console.log(`🚀 Generating ${count} new unique SEO articles...\n`);
  
  // Load existing vercel.json
  const vercelPath = path.join(__dirname, 'vercel.json');
  const vercel = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
  const existingRoutes = vercel.routes || [];
  
  // Get existing article paths to avoid duplicates
  const existingPaths = new Set();
  for (const route of existingRoutes) {
    if (route.src && route.src.includes('/articles2/')) {
      existingPaths.add(route.src.replace(/\/$/, ''));
    }
  }
  
  console.log(`📊 Existing articles in vercel.json: ${existingPaths.size}`);
  
  // Generate new articles
  const articles = generateArticleSlugs(count);
  const baseDir = path.join(__dirname, 'articles2');
  
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  
  const newRoutes = [];
  const articleList = [];
  let generated = 0;
  
  console.log(`📝 Creating articles and routes...\n`);
  
  for (const article of articles) {
    try {
      const articleDir = path.join(baseDir, article.slug);
      if (!fs.existsSync(articleDir)) {
        fs.mkdirSync(articleDir, { recursive: true });
      }
      
      const title = article.originalSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      const content = generateArticleContent(article.slug, title);
      
      const pageConfig = {
        title: `${title} | VIN Trust - Vehicle History Report`,
        description: `Complete guide to ${title}. Get comprehensive vehicle history reports, accident records, and title verification for just $3.`,
        keywords: `${title}, vehicle history, vin check, accident history, title check`,
        canonical: `/articles2/${article.slug}`,
        ogTitle: `${title} | VIN Trust`,
        ogDescription: `Get your vehicle history report for ${title}. Comprehensive, accurate, and affordable.`,
        schemaType: 'Article',
        schemaName: title,
        schemaDescription: `Complete guide to ${title}`,
        content: content
      };
      
      const html = generatePage(pageConfig);
      fs.writeFileSync(path.join(articleDir, 'index.html'), html);
      
      // Add routes (with and without trailing slash)
      const routePath = `/articles2/${article.slug}`;
      if (!existingPaths.has(routePath)) {
        newRoutes.push({
          src: routePath,
          dest: `${routePath}/index.html`
        });
        newRoutes.push({
          src: `${routePath}/`,
          dest: `${routePath}/index.html`
        });
        
        articleList.push({
          slug: article.slug,
          title: title,
          url: routePath
        });
      }
      
      generated++;
      if (generated % 500 === 0) {
        console.log(`   ✅ Generated ${generated}/${count} articles...`);
      }
    } catch (error) {
      console.error(`   ❌ Error generating article ${article.slug}:`, error.message);
    }
  }
  
  console.log(`\n✅ Generated ${generated} articles successfully!`);
  console.log(`📋 New routes to add: ${newRoutes.length}`);
  
  // Add new routes to vercel.json
  vercel.routes = [...existingRoutes, ...newRoutes];
  
  // Backup vercel.json
  const backupPath = path.join(__dirname, 'vercel.json.backup.' + Date.now());
  fs.writeFileSync(backupPath, JSON.stringify(JSON.parse(fs.readFileSync(vercelPath, 'utf8')), null, 2));
  console.log(`💾 Backup created: ${backupPath}`);
  
  // Save updated vercel.json
  fs.writeFileSync(vercelPath, JSON.stringify(vercel, null, 2));
  console.log(`✅ Updated vercel.json with ${newRoutes.length} new routes`);
  console.log(`📊 Total routes in vercel.json: ${vercel.routes.length}`);
  
  // Save article list
  const listPath = path.join(__dirname, 'articles2-new-list.json');
  fs.writeFileSync(listPath, JSON.stringify(articleList, null, 2));
  console.log(`💾 Article list saved: ${listPath}`);
  
  return { routes: newRoutes, articleList, totalRoutes: vercel.routes.length };
}

// CLI usage
if (require.main === module) {
  const count = parseInt(process.argv[2]) || 5000;
  
  generateAndAddArticles(count)
    .then(({ routes, articleList, totalRoutes }) => {
      console.log(`\n📊 Final Statistics:`);
      console.log(`   Articles generated: ${articleList.length}`);
      console.log(`   Routes created: ${routes.length}`);
      console.log(`   Total routes in vercel.json: ${totalRoutes}`);
      console.log(`\n✅ Generation complete!`);
      console.log(`\n🚀 Next steps:`);
      console.log(`   1. Review the changes: git status`);
      console.log(`   2. Commit: git add . && git commit -m "Add 5,000 new SEO articles"`);
      console.log(`   3. Deploy: vercel --prod`);
    })
    .catch(error => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

module.exports = { generateAndAddArticles, generateArticleSlugs };

