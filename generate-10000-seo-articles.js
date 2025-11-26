#!/usr/bin/env node

/**
 * Generate 10,000 Unique SEO Articles (Batch 2)
 * Creates comprehensive, long-form SEO-optimized articles (900-1500 words)
 */

const fs = require('fs');
const path = require('path');
const { renderSeoPage } = require('./scripts/seo-template.js');

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

// LSI keywords for natural content
const lsiKeywords = {
  vin: ['vehicle identification number', 'vin number', 'vin code', 'chassis number', 'serial number'],
  history: ['vehicle history', 'car history', 'auto history', 'ownership history', 'service history'],
  check: ['verify', 'validate', 'inspect', 'examine', 'review', 'audit'],
  report: ['documentation', 'record', 'file', 'statement', 'certificate'],
  vehicle: ['automobile', 'car', 'auto', 'motor vehicle', 'transportation'],
  title: ['ownership document', 'certificate of title', 'pink slip', 'registration'],
  accident: ['collision', 'crash', 'incident', 'damage', 'wreck'],
  recall: ['safety recall', 'defect notice', 'service campaign', 'safety notice']
};

// Generate comprehensive article content (900-1500 words)
function generateLongFormContent(slug, title, articleIndex) {
  const words = slug.split('-');
  const content = [];
  
  // Introduction (150-200 words)
  const intro = generateIntroduction(title, words, articleIndex);
  content.push({ type: 'intro', html: `<div class="intro-section"><p class="lead">${intro}</p></div>` });
  
  // Main sections (4-7 sections, 150-250 words each)
  const numSections = 4 + (articleIndex % 4); // 4-7 sections
  for (let i = 0; i < numSections; i++) {
    const section = generateSection(title, words, i, articleIndex);
    content.push({ type: 'section', html: section });
  }
  
  // Table (1-2 tables)
  const numTables = articleIndex % 2 === 0 ? 1 : 2;
  for (let i = 0; i < numTables; i++) {
    const table = generateTable(title, words, i);
    content.push({ type: 'table', html: table });
  }
  
  // Lists and bullet points
  const lists = generateLists(title, words, articleIndex);
  content.push({ type: 'lists', html: lists });
  
  // FAQ (4-7 questions)
  const numFAQs = 4 + (articleIndex % 4); // 4-7 FAQs
  const faqs = generateFAQ(title, words, numFAQs, articleIndex);
  content.push({ type: 'faq', html: faqs });
  
  // Related articles section
  const related = generateRelatedArticles(articleIndex);
  content.push({ type: 'related', html: related });
  
  // CTA section
  const cta = generateCTA(title);
  content.push({ type: 'cta', html: cta });
  
  return content;
}

function generateIntroduction(title, words, index) {
  const templates = [
    `When purchasing a used vehicle, understanding ${title} is crucial for making an informed decision. This comprehensive guide explores everything you need to know about ${title}, from basic concepts to advanced verification techniques. Whether you're a first-time buyer or an experienced car enthusiast, this resource provides valuable insights into vehicle history verification and protection.`,
    `In today's automotive market, ${title} plays a vital role in vehicle transactions. This detailed examination covers the essential aspects of ${title}, including legal requirements, common issues, and best practices. Our expert analysis helps you navigate the complexities of vehicle verification and ensures you have all the information needed for a successful purchase or sale.`,
    `Navigating the world of ${title} can be challenging without proper guidance. This extensive resource delves deep into ${title}, offering practical advice, real-world examples, and expert recommendations. From understanding basic terminology to implementing advanced verification strategies, this guide serves as your complete reference for vehicle history and verification processes.`
  ];
  
  let intro = templates[index % templates.length];
  
  // Add LSI keywords naturally
  if (words.includes('vin') || words.includes('check')) {
    intro += ` Vehicle identification number verification is essential for ensuring transparency and preventing fraud in automotive transactions.`;
  }
  if (words.includes('history') || words.includes('report')) {
    intro += ` Comprehensive vehicle history reports provide detailed insights into a car's past, including ownership records, service history, and incident documentation.`;
  }
  
  return intro;
}

function generateSection(title, words, sectionIndex, articleIndex) {
  const sectionTitles = [
    `Understanding ${title}: Key Concepts and Terminology`,
    `The Importance of ${title} in Vehicle Transactions`,
    `How ${title} Protects Buyers and Sellers`,
    `Step-by-Step Guide to ${title}`,
    `Common Issues and Solutions Related to ${title}`,
    `Legal and Regulatory Aspects of ${title}`,
    `Best Practices for ${title} Verification`
  ];
  
  const sectionTitle = sectionTitles[sectionIndex % sectionTitles.length];
  
  const paragraphTemplates = [
    `${title} represents a critical component of modern vehicle verification systems. Understanding how ${title} works requires knowledge of automotive documentation, legal requirements, and industry standards. This section explores the fundamental principles that govern ${title} and explains why it's essential for both buyers and sellers in today's market.`,
    `The process of ${title} involves multiple steps, each designed to verify different aspects of a vehicle's history and condition. From initial documentation review to comprehensive database searches, ${title} provides a systematic approach to vehicle verification that protects all parties involved in a transaction.`,
    `When dealing with ${title}, it's important to recognize the various factors that can influence the verification process. These include state regulations, vehicle age, previous ownership, and documented incidents. Each of these elements plays a role in determining the accuracy and completeness of ${title} information.`,
    `Professional ${title} services utilize advanced technology and comprehensive databases to provide accurate, up-to-date information. These services combine government records, insurance data, and service history to create detailed reports that help buyers make informed decisions.`
  ];
  
  let sectionHTML = `<section>\n    <h2>${sectionTitle}</h2>\n`;
  
  // Add 2-3 paragraphs per section
  const numParagraphs = 2 + (sectionIndex % 2);
  for (let i = 0; i < numParagraphs; i++) {
    const para = paragraphTemplates[(sectionIndex * numParagraphs + i) % paragraphTemplates.length];
    sectionHTML += `    <p>${para}</p>\n`;
  }
  
  // Add bullet points or numbered list
  if (sectionIndex % 2 === 0) {
    sectionHTML += `    <ul>\n`;
    for (let i = 0; i < 4; i++) {
      sectionHTML += `        <li><strong>Key Point ${i + 1}:</strong> Important information about ${title} that helps users understand the concept better and make informed decisions.</li>\n`;
    }
    sectionHTML += `    </ul>\n`;
  } else {
    sectionHTML += `    <ol>\n`;
    for (let i = 0; i < 4; i++) {
      sectionHTML += `        <li>Step ${i + 1} in the ${title} process involves specific actions and verification procedures.</li>\n`;
    }
    sectionHTML += `    </ol>\n`;
  }
  
  sectionHTML += `</section>\n\n`;
  
  return sectionHTML;
}

function generateTable(title, words, tableIndex) {
  const tableTemplates = [
    {
      title: `Comparison: ${title} Services`,
      headers: ['Feature', 'Basic Plan', 'Premium Plan', 'Enterprise'],
      rows: [
        ['Report Details', 'Standard', 'Enhanced', 'Complete'],
        ['Data Sources', 'NMVTIS', 'NMVTIS + Insurance', 'All Sources'],
        ['Update Frequency', 'Monthly', 'Weekly', 'Real-time'],
        ['Price', '$3', '$5', 'Custom']
      ]
    },
    {
      title: `${title} Timeline and Requirements`,
      headers: ['Stage', 'Duration', 'Requirements', 'Cost'],
      rows: [
        ['Initial Check', 'Instant', 'VIN Number', '$3'],
        ['Detailed Report', '24 hours', 'VIN + Payment', '$5'],
        ['Comprehensive Analysis', '48 hours', 'Full Documentation', '$10']
      ]
    }
  ];
  
  const table = tableTemplates[tableIndex % tableTemplates.length];
  
  let tableHTML = `<section>\n    <h2>${table.title}</h2>\n    <table class="comparison-table">\n        <thead>\n            <tr>\n`;
  
  table.headers.forEach(header => {
    tableHTML += `                <th>${header}</th>\n`;
  });
  
  tableHTML += `            </tr>\n        </thead>\n        <tbody>\n`;
  
  table.rows.forEach(row => {
    tableHTML += `            <tr>\n`;
    row.forEach(cell => {
      tableHTML += `                <td>${cell}</td>\n`;
    });
    tableHTML += `            </tr>\n`;
  });
  
  tableHTML += `        </tbody>\n    </table>\n</section>\n\n`;
  
  return tableHTML;
}

function generateLists(title, words, index) {
  let listsHTML = `<section>\n    <h2>Essential Information About ${title}</h2>\n    <ul>\n`;
  
  const listItems = [
    `Understanding ${title} helps protect against fraud and ensures transparency in vehicle transactions`,
    `Professional ${title} services provide access to comprehensive databases and verified information`,
    `Regular ${title} checks are recommended when buying, selling, or maintaining a vehicle`,
    `${title} reports include detailed information about accidents, ownership, and service history`,
    `Legal requirements for ${title} vary by state, so it's important to understand local regulations`,
    `Technology has made ${title} more accessible and affordable for consumers`,
    `${title} verification is essential for insurance purposes and vehicle registration`
  ];
  
  listItems.forEach((item, i) => {
    if (i < 6) {
      listsHTML += `        <li>${item}</li>\n`;
    }
  });
  
  listsHTML += `    </ul>\n</section>\n\n`;
  
  return listsHTML;
}

function generateFAQ(title, words, numFAQs, index) {
  let faqHTML = `<section>\n    <h2>Frequently Asked Questions About ${title}</h2>\n\n`;
  
  const faqTemplates = [
    {
      q: `What is ${title} and why is it important?`,
      a: `${title} is a comprehensive vehicle verification and history checking service that provides detailed information about a vehicle's past. It's important because it helps buyers make informed decisions, protects against fraud, and ensures transparency in vehicle transactions. Our ${title} service uses NMVTIS-verified data to provide accurate, reliable information.`
    },
    {
      q: `How much does ${title} cost?`,
      a: `VIN Trust offers ${title} services starting at just $3. This affordable price includes instant access to comprehensive vehicle history reports that are verified through the National Motor Vehicle Title Information System (NMVTIS). For more detailed reports, premium options are available at $5 and $10.`
    },
    {
      q: `How accurate is ${title} information?`,
      a: `Our ${title} service uses NMVTIS-verified data, which is the official government database for vehicle information. This ensures the highest level of accuracy available. All information comes from verified sources including government agencies, insurance companies, and service facilities.`
    },
    {
      q: `How long does it take to get ${title} results?`,
      a: `${title} provides instant results. Once you enter your vehicle's VIN number and complete the secure payment process, you'll receive your comprehensive report within seconds. For more detailed analysis, extended reports may take 24-48 hours.`
    },
    {
      q: `What information does ${title} include?`,
      a: `${title} includes comprehensive vehicle history including accident reports, title records, salvage history, flood damage, odometer readings, recalls, ownership history, service records, and more. Each report is tailored to provide the most relevant information for your specific vehicle.`
    },
    {
      q: `Can I use ${title} for any vehicle?`,
      a: `Yes, ${title} can be used for any vehicle with a valid VIN number. This includes cars, trucks, SUVs, motorcycles, and other motor vehicles registered in the United States. Our service covers vehicles from all 50 states and provides comprehensive information regardless of vehicle age or make.`
    },
    {
      q: `Is ${title} legal and safe to use?`,
      a: `Absolutely. ${title} is a legal service that complies with all federal and state regulations regarding vehicle information access. We use secure, encrypted connections to protect your personal information and payment details. All data is obtained through legitimate channels and verified sources.`
    }
  ];
  
  for (let i = 0; i < numFAQs; i++) {
    const faq = faqTemplates[i % faqTemplates.length];
    faqHTML += `    <h3>${faq.q}</h3>\n    <p>${faq.a}</p>\n\n`;
  }
  
  faqHTML += `</section>\n\n`;
  
  return faqHTML;
}

function generateRelatedArticles(articleIndex) {
  // Generate links to other articles in the batch
  const relatedCount = 5 + (articleIndex % 6); // 5-10 related articles
  let relatedHTML = `<section class="related-articles">\n    <h2>Related Articles</h2>\n    <p>Explore more vehicle history and verification resources:</p>\n    <ul class="related-links">\n`;
  
  // Internal links to main pages
  const mainPages = [
    '/vin-check',
    '/license-plate-check',
    '/vin-history-report',
    '/accident-history',
    '/recall-information'
  ];
  
  mainPages.forEach(page => {
    const pageName = page.split('/').pop().replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    relatedHTML += `        <li><a href="${page}">${pageName}</a></li>\n`;
  });
  
  // Links to other articles in articles2 (will be populated after generation)
  for (let i = 0; i < relatedCount - mainPages.length; i++) {
    const relatedIndex = (articleIndex + i + 1) % 10000;
    relatedHTML += `        <li><a href="/articles2/article-${String(relatedIndex).padStart(6, '0')}">Related Article ${relatedIndex + 1}</a></li>\n`;
  }
  
  relatedHTML += `    </ul>\n</section>\n\n`;
  
  return relatedHTML;
}

function generateCTA(title) {
  return `<section class="cta-section">\n    <h2>Get Your Vehicle History Report</h2>\n    <p>Check any vehicle's complete history instantly. Get accident reports, title records, and more for just $3.</p>\n    <div class="cta-buttons">\n        <a href="/vin-check" class="btn btn-primary">Check VIN Now — $3</a>\n        <a href="/how-it-works" class="btn btn-secondary">Learn More</a>\n    </div>\n</section>`;
}

// Generate keywords with long-tail variations
function generateKeywords(slug, title) {
  const words = slug.split('-');
  const keywords = new Set();
  
  keywords.add(slug);
  keywords.add(title.toLowerCase());
  
  const longTailTemplates = [
    `${slug} free`, `${slug} online`, `${slug} instant`, `${slug} report`, `${slug} check`,
    `how to ${slug}`, `${slug} cost`, `${slug} price`, `${slug} service`, `best ${slug}`,
    `${slug} near me`, `${slug} usa`, `${slug} nmvtis`, `free ${slug}`, `instant ${slug}`,
    `${slug} verification`, `${slug} lookup`, `${slug} search`, `${slug} database`, `${slug} information`
  ];
  
  longTailTemplates.forEach(template => {
    if (template.length < 100) keywords.add(template);
  });
  
  words.forEach(word => {
    if (word.length > 2 && !['the', 'and', 'for', 'are', 'but'].includes(word)) {
      keywords.add(word);
      keywords.add(`${word} check`);
      keywords.add(`${word} report`);
    }
  });
  
  const vehicleTerms = ['vin check', 'vehicle history', 'car report', 'auto history', 'carfax alternative', 'nmvtis report', 'vehicle verification'];
  vehicleTerms.forEach(term => keywords.add(term));
  
  const brandMatch = words.find(w => topics.carBrands.includes(w));
  if (brandMatch) {
    keywords.add(`${brandMatch} vehicle history`);
    keywords.add(`${brandMatch} car report`);
    keywords.add(`${brandMatch} vin check`);
  }
  
  const stateMatch = words.find(w => topics.states.includes(w));
  if (stateMatch) {
    keywords.add(`${stateMatch} vehicle check`);
    keywords.add(`${stateMatch} car history`);
    keywords.add(`vehicle check ${stateMatch}`);
  }
  
  return Array.from(keywords).slice(0, 20).join(', ');
}

// Generate unique article slugs
function generateArticleSlugs(count = 10000) {
  const slugs = new Set();
  const articles = [];
  
  let id = 0;
  
  // Pattern 1: guide + topic (1000)
  for (const guide of topics.guides.slice(0, 25)) {
    for (const topic of topics.topics.slice(0, 40)) {
      if (slugs.size >= count) break;
      const slug = `${guide}-${topic}`;
      if (!slugs.has(slug)) {
        slugs.add(slug);
        articles.push({ slug, id: id++ });
      }
    }
  }
  
  // Pattern 2: brand + problem (500)
  for (const brand of topics.carBrands) {
    for (const problem of topics.problems.slice(0, 10)) {
      if (slugs.size >= count) break;
      const slug = `${brand}-${problem}`;
      if (!slugs.has(slug)) {
        slugs.add(slug);
        articles.push({ slug, id: id++ });
      }
    }
  }
  
  // Pattern 3: state + dmv (400)
  for (const state of topics.states) {
    for (const dmv of topics.dmv.slice(0, 8)) {
      if (slugs.size >= count) break;
      const slug = `${state}-${dmv}`;
      if (!slugs.has(slug)) {
        slugs.add(slug);
        articles.push({ slug, id: id++ });
      }
    }
  }
  
  // Pattern 4: year + model + topic (2000)
  for (const year of topics.years.slice(0, 40)) {
    for (const model of topics.models.slice(0, 10)) {
      for (const topic of topics.topics.slice(0, 5)) {
        if (slugs.size >= count) break;
        const slug = `${year}-${model}-${topic}`;
        if (!slugs.has(slug)) {
          slugs.add(slug);
          articles.push({ slug, id: id++ });
        }
      }
    }
  }
  
  // Pattern 5: repair + brand (300)
  for (const repair of topics.repairs) {
    for (const brand of topics.carBrands.slice(0, 30)) {
      if (slugs.size >= count) break;
      const slug = `${repair}-${brand}`;
      if (!slugs.has(slug)) {
        slugs.add(slug);
        articles.push({ slug, id: id++ });
      }
    }
  }
  
  // Pattern 6: topic combinations (remaining)
  const allTopics = [...topics.topics, ...topics.guides, ...topics.problems, ...topics.repairs, ...topics.dmv];
  while (slugs.size < count) {
    const topic1 = allTopics[Math.floor(Math.random() * allTopics.length)];
    const topic2 = allTopics[Math.floor(Math.random() * allTopics.length)];
    const num = Math.floor(Math.random() * 10000);
    const slug = `${topic1}-${topic2}-${num}`;
    if (!slugs.has(slug) && slug.length < 100) {
      slugs.add(slug);
      articles.push({ slug, id: id++ });
    }
    if (slugs.size >= count) break;
  }
  
  return Array.from(slugs).slice(0, count).map((slug, idx) => ({
    slug: `article-${String(idx).padStart(6, '0')}`,
    originalSlug: slug,
    id: idx
  }));
}

// Main generation function
async function generateArticles(count = 10000) {
  console.log(`Generating ${count} unique SEO articles...`);
  
  const articles = generateArticleSlugs(count);
  const baseDir = path.join(__dirname, 'articles2');
  
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  
  const routes = [];
  const articleList = [];
  let generated = 0;
  
  for (const article of articles) {
    try {
      const title = article.originalSlug.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      
      const content = generateLongFormContent(article.originalSlug, title, article.id);
      
      // Extract intro, sections, FAQ from content array
      const introItem = content.find(item => item.type === 'intro');
      const introHtml = introItem ? introItem.html.replace(/<div[^>]*>|<\/div>/g, '').replace(/<p[^>]*class="lead"[^>]*>|<\/p>/g, '') : '';
      
      const sections = [];
      let sectionId = 1;
      content.forEach(item => {
        if (item.type === 'section' || item.type === 'table' || item.type === 'lists') {
          // Extract heading from HTML
          const headingMatch = item.html.match(/<h2[^>]*>(.*?)<\/h2>/);
          const heading = headingMatch ? headingMatch[1] : `Section ${sectionId}`;
          const bodyHtml = item.html.replace(/<h2[^>]*>.*?<\/h2>\s*/g, '');
          sections.push({
            id: `section-${sectionId++}`,
            heading: heading,
            html: bodyHtml
          });
        }
      });
      
      // Extract FAQ
      const faqItem = content.find(item => item.type === 'faq');
      const faq = [];
      if (faqItem) {
        const faqMatches = faqItem.html.matchAll(/<h3[^>]*>(.*?)<\/h3>\s*<p[^>]*>(.*?)<\/p>/g);
        for (const match of faqMatches) {
          faq.push({
            question: match[1],
            answer: match[2]
          });
        }
      }
      
      // Generate pageData
      const description = `Get instant ${title.toLowerCase()} with VIN Trust. Comprehensive vehicle history reports including accidents, title records, and more. Only $3. NMVTIS verified data. Free ${article.originalSlug} online.`;
      const pageData = {
        slugPath: `/articles2/${article.slug}`,
        title: `${title} - VIN Trust | Vehicle History Reports | $3 Instant Check`,
        metaDescription: description,
        h1: title,
        introHtml: introHtml || `<p>Learn everything about ${title} with VIN Trust's comprehensive vehicle history reports.</p>`,
        sections: sections,
        benefitsHtml: `<ul>
          <li>Fast report generation after payment</li>
          <li>Clear title & accident history</li>
          <li>Market value & sale history data</li>
          <li>NMVTIS verified information</li>
        </ul>`,
        faq: faq
      };
      
      // Generate page using new template
      const html = renderSeoPage(pageData);
      
      // Create directory
      const articleDir = path.join(baseDir, article.slug);
      if (!fs.existsSync(articleDir)) {
        fs.mkdirSync(articleDir, { recursive: true });
      }
      
      // Write file
      const filePath = path.join(articleDir, 'index.html');
      fs.writeFileSync(filePath, html, 'utf8');
      
      // Add routes
      routes.push({
        src: `/articles2/${article.slug}`,
        dest: `/articles2/${article.slug}/index.html`
      });
      routes.push({
        src: `/articles2/${article.slug}/`,
        dest: `/articles2/${article.slug}/index.html`
      });
      
      articleList.push({
        slug: article.slug,
        title: title,
        url: `/articles2/${article.slug}`
      });
      
      generated++;
      if (generated % 100 === 0) {
        console.log(`Generated ${generated}/${count} articles...`);
      }
    } catch (error) {
      console.error(`Error generating article ${article.slug}:`, error.message);
    }
  }
  
  console.log(`\n✅ Generated ${generated} articles successfully!`);
  
  // Save article list for pagination and interlinking
  fs.writeFileSync(
    path.join(__dirname, 'articles2-list.json'),
    JSON.stringify(articleList, null, 2)
  );
  
  return { routes, articleList };
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateArticles, generateArticleSlugs };
}

// CLI usage
if (require.main === module) {
  const count = parseInt(process.argv[2]) || 10000;
  
  generateArticles(count)
    .then(({ routes, articleList }) => {
      console.log(`\n📊 Statistics:`);
      console.log(`   Articles generated: ${articleList.length}`);
      console.log(`   Routes created: ${routes.length}`);
      console.log(`\n✅ Generation complete!`);
      console.log(`\nNext steps:`);
      console.log(`   1. Run: node update-vercel-routes.js`);
      console.log(`   2. Run: node generate-pagination.js`);
      console.log(`   3. Run: node update-sitemap.js`);
      console.log(`   4. Run: node update-interlinking.js`);
    })
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}


