#!/usr/bin/env node

/**
 * Generate 7000 Unique SEO Articles
 * Creates diverse, SEO-optimized article pages for VIN Trust
 */

const fs = require('fs');
const path = require('path');
const { generatePage } = require('./generate-seo-pages.js');

// Article topics and variations
const topics = {
  carBrands: ['toyota', 'honda', 'ford', 'chevrolet', 'nissan', 'bmw', 'mercedes', 'audi', 'volkswagen', 'hyundai', 'kia', 'mazda', 'subaru', 'jeep', 'ram', 'gmc', 'lexus', 'acura', 'infiniti', 'cadillac', 'lincoln', 'buick', 'chrysler', 'dodge', 'jaguar', 'land-rover', 'porsche', 'tesla', 'volvo', 'mini'],
  states: ['alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut', 'delaware', 'florida', 'georgia', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa', 'kansas', 'kentucky', 'louisiana', 'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota', 'mississippi', 'missouri', 'montana', 'nebraska', 'nevada', 'new-hampshire', 'new-jersey', 'new-mexico', 'new-york', 'north-carolina', 'north-dakota', 'ohio', 'oklahoma', 'oregon', 'pennsylvania', 'rhode-island', 'south-carolina', 'south-dakota', 'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington', 'west-virginia', 'wisconsin', 'wyoming'],
  topics: ['vin-check', 'accident-history', 'title-check', 'odometer-verification', 'lien-check', 'theft-check', 'flood-damage', 'salvage-title', 'auction-history', 'recall-check', 'ownership-history', 'service-records', 'insurance-claims', 'frame-damage', 'airbag-deployment', 'total-loss', 'rebuilt-title', 'clean-title', 'branded-title', 'export-import', 'nmvtis-report', 'carfax-alternative', 'vehicle-history', 'pre-purchase-inspection', 'used-car-check', 'certified-pre-owned', 'lemon-law', 'warranty-check', 'maintenance-history', 'emissions-test'],
  guides: ['how-to-check', 'what-is', 'why-you-need', 'complete-guide-to', 'ultimate-guide', 'everything-about', 'understanding', 'decoding', 'verifying', 'reading', 'interpreting', 'analyzing', 'comparing', 'choosing', 'buying', 'selling', 'trading', 'financing', 'insuring', 'registering'],
  years: Array.from({length: 30}, (_, i) => 1995 + i),
  models: ['sedan', 'suv', 'truck', 'coupe', 'convertible', 'hatchback', 'wagon', 'van', 'crossover', 'hybrid', 'electric', 'luxury', 'sports', 'compact', 'mid-size', 'full-size']
};

// Content templates for variety
const contentTemplates = [
  {
    intro: (title) => `Discover everything you need to know about ${title}. Our comprehensive guide provides detailed information, expert insights, and practical tips to help you make informed decisions about vehicle history and verification.`,
    sections: [
      {
        title: (t) => `Understanding ${t}`,
        content: (t) => `${t} is a crucial aspect of vehicle ownership and purchasing. Whether you're buying a used car, selling your vehicle, or simply want to verify your car's history, understanding ${t} can save you time, money, and potential headaches.`
      },
      {
        title: (t) => `Why ${t} Matters`,
        content: (t) => `When it comes to vehicle transactions, ${t} plays a vital role in protecting consumers. A thorough understanding helps identify potential issues, verify authenticity, and ensure you're making a sound investment.`
      },
      {
        title: (t) => `How to Access ${t}`,
        content: (t) => `Getting accurate information about ${t} is easier than ever. With VIN Trust, you can access comprehensive reports instantly for just $3. Our NMVTIS-verified data ensures reliability and accuracy.`
      }
    ]
  },
  {
    intro: (title) => `Learn about ${title} and how it impacts your vehicle purchase or ownership experience. This detailed resource covers essential information, common questions, and expert recommendations for navigating vehicle history checks.`,
    sections: [
      {
        title: (t) => `What You Need to Know About ${t}`,
        content: (t) => `${t} is an essential service for anyone involved in vehicle transactions. From private sellers to dealerships, understanding ${t} helps ensure transparency and protects all parties involved.`
      },
      {
        title: (t) => `Key Benefits of ${t}`,
        content: (t) => `Utilizing ${t} provides numerous advantages including fraud prevention, value assessment, safety verification, and legal protection. These benefits make it an indispensable tool for smart vehicle decisions.`
      },
      {
        title: (t) => `Getting Started with ${t}`,
        content: (t) => `Accessing ${t} information is straightforward with VIN Trust. Simply enter your vehicle's VIN number, complete the secure payment process, and receive your comprehensive report within seconds.`
      }
    ]
  },
  {
    intro: (title) => `Explore the world of ${title} with our expert guide. We provide detailed explanations, practical examples, and actionable advice to help you navigate vehicle history verification with confidence.`,
    sections: [
      {
        title: (t) => `The Importance of ${t}`,
        content: (t) => `${t} serves as a critical component in modern vehicle transactions. It provides transparency, builds trust, and helps prevent costly mistakes that could arise from incomplete information.`
      },
      {
        title: (t) => `Common Questions About ${t}`,
        content: (t) => `Many vehicle owners and buyers have questions about ${t}. Understanding the basics, costs, accuracy, and process helps you make informed decisions and avoid common pitfalls.`
      },
      {
        title: (t) => `Expert Tips for ${t}`,
        content: (t) => `When dealing with ${t}, it's important to use reliable sources, verify information through multiple channels, and understand what the data means for your specific situation.`
      }
    ]
  }
];

// Generate unique article combinations
function generateArticleSlugs(count = 7000) {
  const slugs = new Set();
  const combinations = [];
  
  // Strategy: Create diverse combinations
  let id = 0;
  
  // Pattern 1: brand + topic (300 combinations)
  for (const brand of topics.carBrands.slice(0, 15)) {
    for (const topic of topics.topics.slice(0, 20)) {
      if (slugs.size >= count) break;
      const slug = `${brand}-${topic}`;
      if (!slugs.has(slug)) {
        slugs.add(slug);
        combinations.push({ slug, type: 'brand-topic', id: id++ });
      }
    }
  }
  
  // Pattern 2: state + topic (1500 combinations)
  for (const state of topics.states) {
    for (const topic of topics.topics.slice(0, 30)) {
      if (slugs.size >= count) break;
      const slug = `${state}-${topic}`;
      if (!slugs.has(slug)) {
        slugs.add(slug);
        combinations.push({ slug, type: 'state-topic', id: id++ });
      }
    }
  }
  
  // Pattern 3: guide + topic (500 combinations)
  for (const guide of topics.guides) {
    for (const topic of topics.topics.slice(0, 25)) {
      if (slugs.size >= count) break;
      const slug = `${guide}-${topic}`;
      if (!slugs.has(slug)) {
        slugs.add(slug);
        combinations.push({ slug, type: 'guide-topic', id: id++ });
      }
    }
  }
  
  // Pattern 4: year + model + topic (1000 combinations)
  for (const year of topics.years.slice(0, 20)) {
    for (const model of topics.models.slice(0, 10)) {
      for (const topic of topics.topics.slice(0, 5)) {
        if (slugs.size >= count) break;
        const slug = `${year}-${model}-${topic}`;
        if (!slugs.has(slug)) {
          slugs.add(slug);
          combinations.push({ slug, type: 'year-model-topic', id: id++ });
        }
      }
    }
  }
  
  // Pattern 5: brand + model + topic (500 combinations)
  for (const brand of topics.carBrands.slice(0, 10)) {
    for (const model of topics.models.slice(0, 10)) {
      for (const topic of topics.topics.slice(0, 5)) {
        if (slugs.size >= count) break;
        const slug = `${brand}-${model}-${topic}`;
        if (!slugs.has(slug)) {
          slugs.add(slug);
          combinations.push({ slug, type: 'brand-model-topic', id: id++ });
        }
      }
    }
  }
  
  // Pattern 6: topic variations (remaining to reach 7000)
  const additionalTopics = [
    'free-vin-check', 'instant-vin-report', 'comprehensive-vehicle-history',
    'nmvtis-verified-report', 'car-history-check', 'vehicle-verification',
    'title-verification', 'accident-report', 'damage-history', 'mileage-verification',
    'ownership-verification', 'lien-verification', 'theft-verification',
    'flood-damage-check', 'salvage-verification', 'auction-verification',
    'recall-verification', 'service-history', 'insurance-history', 'frame-check'
  ];
  
  for (const topic1 of additionalTopics) {
    for (const topic2 of topics.topics.slice(0, 20)) {
      if (slugs.size >= count) break;
      const slug = `${topic1}-${topic2}`;
      if (!slugs.has(slug)) {
        slugs.add(slug);
        combinations.push({ slug, type: 'topic-combo', id: id++ });
      }
    }
  }
  
  // Pattern 7: Fill remaining with unique combinations
  const allTopics = [...topics.topics, ...additionalTopics];
  while (slugs.size < count) {
    const topic1 = allTopics[Math.floor(Math.random() * allTopics.length)];
    const topic2 = allTopics[Math.floor(Math.random() * allTopics.length)];
    const num = Math.floor(Math.random() * 1000);
    const slug = `${topic1}-${topic2}-${num}`;
    if (!slugs.has(slug)) {
      slugs.add(slug);
      combinations.push({ slug, type: 'random', id: id++ });
    }
    if (slugs.size >= count) break;
  }
  
  return Array.from(slugs).slice(0, count).map((slug, idx) => ({
    slug,
    type: combinations[idx]?.type || 'random',
    id: idx
  }));
}

// Generate long-tail keywords with high relevance
function generateKeywords(slug, title) {
  const words = slug.split('-');
  const keywords = new Set();
  
  // Base keywords from slug
  keywords.add(slug);
  keywords.add(title.toLowerCase());
  
  // Long-tail variations
  const longTailTemplates = [
    `${slug} free`,
    `${slug} online`,
    `${slug} instant`,
    `${slug} report`,
    `${slug} check`,
    `how to ${slug}`,
    `${slug} cost`,
    `${slug} price`,
    `${slug} service`,
    `best ${slug}`,
    `${slug} near me`,
    `${slug} usa`,
    `${slug} nmvtis`,
    `free ${slug}`,
    `instant ${slug}`,
    `${slug} verification`,
    `${slug} lookup`,
    `${slug} search`,
    `${slug} database`,
    `${slug} information`
  ];
  
  longTailTemplates.forEach(template => {
    if (template.length < 100) { // Keep keywords reasonable length
      keywords.add(template);
    }
  });
  
  // Add individual words if they're relevant
  words.forEach(word => {
    if (word.length > 2 && !['the', 'and', 'for', 'are', 'but'].includes(word)) {
      keywords.add(word);
      keywords.add(`${word} check`);
      keywords.add(`${word} report`);
    }
  });
  
  // Add common vehicle-related terms
  const vehicleTerms = ['vin check', 'vehicle history', 'car report', 'auto history', 'carfax alternative', 'nmvtis report', 'vehicle verification'];
  vehicleTerms.forEach(term => keywords.add(term));
  
  // Add brand/state specific if present
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
  
  // Convert to array and limit to 15-20 most relevant
  const keywordsArray = Array.from(keywords).slice(0, 20);
  return keywordsArray.join(', ');
}

// Generate article content
function generateArticleContent(slug, templateIndex) {
  const template = contentTemplates[templateIndex % contentTemplates.length];
  const title = slug.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
  
  const intro = template.intro(title);
  const sections = template.sections.map(section => ({
    title: section.title(title),
    content: section.content(title)
  }));
  
  // Generate FAQ section
  const faqs = [
    {
      q: `What is ${title}?`,
      a: `${title} is an essential service for vehicle verification and history checking. It provides comprehensive information about a vehicle's past, including accidents, ownership, and other important details.`
    },
    {
      q: `How much does ${title} cost?`,
      a: `VIN Trust offers ${title} services for just $3. This affordable price includes instant access to comprehensive, NMVTIS-verified vehicle history reports.`
    },
    {
      q: `How accurate is ${title}?`,
      a: `Our ${title} service uses NMVTIS-verified data, ensuring the highest level of accuracy. All information comes from official government sources and verified databases.`
    },
    {
      q: `How long does ${title} take?`,
      a: `${title} provides instant results. Once you enter the VIN and complete payment, you'll receive your comprehensive report within seconds.`
    },
    {
      q: `What information does ${title} include?`,
      a: `${title} includes comprehensive vehicle history: accident reports, title records, salvage history, flood damage, odometer readings, recalls, ownership history, and more.`
    }
  ];
  
  // Generate related articles
  const relatedArticles = [
    '/vin-check',
    '/accident-history',
    '/title-check',
    '/problems/accident-history',
    '/problems/title-brand'
  ];
  
  // Generate keywords
  const keywords = generateKeywords(slug, title);
  
  return {
    title,
    intro,
    sections,
    faqs,
    relatedArticles,
    keywords
  };
}

// Generate HTML content
function generateHTMLContent(content) {
  let html = `<h1>${content.title}</h1>\n\n`;
  html += `<div class="intro-section">\n    <p class="lead">${content.intro}</p>\n</div>\n\n`;
  
  // Sections
  content.sections.forEach(section => {
    html += `<section>\n    <h2>${section.title}</h2>\n    <p>${section.content}</p>\n</section>\n\n`;
  });
  
  // Additional content sections
  html += `<section>\n    <h2>Key Features of ${content.title}</h2>\n    <ul>\n`;
  html += `        <li><strong>Instant Access:</strong> Get your report in seconds</li>\n`;
  html += `        <li><strong>Affordable Pricing:</strong> Only $3 for comprehensive reports</li>\n`;
  html += `        <li><strong>NMVTIS Verified:</strong> Official data from government sources</li>\n`;
  html += `        <li><strong>Comprehensive Data:</strong> Complete vehicle history information</li>\n`;
  html += `        <li><strong>Easy to Use:</strong> Simple process with instant results</li>\n`;
  html += `    </ul>\n</section>\n\n`;
  
  html += `<section>\n    <h2>How to Use ${content.title}</h2>\n    <ol>\n`;
  html += `        <li>Enter your vehicle's VIN number in the search field</li>\n`;
  html += `        <li>Complete the secure payment process ($3)</li>\n`;
  html += `        <li>Receive your instant comprehensive report</li>\n`;
  html += `        <li>Review all vehicle history details and information</li>\n`;
  html += `    </ol>\n</section>\n\n`;
  
  // FAQ Section
  html += `<section>\n    <h2>Frequently Asked Questions</h2>\n\n`;
  content.faqs.forEach(faq => {
    html += `    <h3>${faq.q}</h3>\n    <p>${faq.a}</p>\n\n`;
  });
  html += `</section>\n\n`;
  
  // Related Articles
  html += `<section class="related-articles">\n    <h2>Related Articles</h2>\n    <p>Explore more vehicle history resources:</p>\n    <ul class="related-links">\n`;
  content.relatedArticles.forEach(link => {
    const linkText = link.split('/').pop().replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    html += `        <li><a href="${link}">${linkText}</a></li>\n`;
  });
  html += `    </ul>\n</section>\n\n`;
  
  // Additional informative sections
  html += `<section>\n    <h2>Understanding Vehicle History Reports</h2>\n    <p>Vehicle history reports are comprehensive documents that compile information from multiple authoritative sources. These reports provide crucial insights into a vehicle's past, helping buyers, sellers, and owners make informed decisions.</p>\n    <p>Our reports pull data from the National Motor Vehicle Title Information System (NMVTIS), insurance companies, government databases, auto auctions, and service facilities. This multi-source approach ensures the most complete picture possible of any vehicle's history.</p>\n    <p>Each report is carefully compiled and verified to ensure accuracy. We understand that vehicle history information can significantly impact purchase decisions, insurance rates, and safety assessments, so we take data quality seriously.</p>\n</section>\n\n`;
  
  html += `<section>\n    <h2>The Importance of Vehicle History Information</h2>\n    <p>Understanding a vehicle's history is essential for several reasons:</p>\n    <ul>\n`;
  html += `        <li><strong>Safety:</strong> Identifying previous accidents, structural damage, or safety recalls helps ensure the vehicle is safe to drive.</li>\n`;
  html += `        <li><strong>Value Assessment:</strong> A vehicle's history directly impacts its market value. Clean history typically means higher value.</li>\n`;
  html += `        <li><strong>Legal Protection:</strong> Verifying title status and ownership history protects you from legal issues and fraud.</li>\n`;
  html += `        <li><strong>Financial Planning:</strong> Understanding potential future repair costs based on past damage or maintenance history.</li>\n`;
  html += `        <li><strong>Insurance:</strong> Insurance companies use vehicle history to assess risk and determine premiums.</li>\n`;
  html += `    </ul>\n</section>\n\n`;
  
  html += `<section>\n    <h2>How VIN Trust Ensures Data Quality</h2>\n    <p>At VIN Trust, we prioritize data accuracy and completeness:</p>\n    <ul>\n`;
  html += `        <li><strong>NMVTIS Verification:</strong> All reports are verified through the National Motor Vehicle Title Information System, the official government database.</li>\n`;
  html += `        <li><strong>Multiple Data Sources:</strong> We aggregate information from insurance companies, government agencies, auto auctions, and service facilities.</li>\n`;
  html += `        <li><strong>Regular Updates:</strong> Our database is updated regularly to ensure the most current information available.</li>\n`;
  html += `        <li><strong>Quality Assurance:</strong> Each report undergoes quality checks before being delivered to customers.</li>\n`;
  html += `        <li><strong>Customer Support:</strong> Our team is available to help interpret reports and address any questions or concerns.</li>\n`;
  html += `    </ul>\n</section>\n\n`;
  
  // CTA Section
  html += `<section class="cta-section">\n    <h2>Get Your Vehicle History Report</h2>\n    <p>Check any vehicle's complete history instantly. Get accident reports, title records, and more.</p>\n    <div class="cta-buttons">\n        <a href="/vin-check" class="btn btn-primary">Check VIN Now</a>\n        <a href="/how-it-works" class="btn btn-secondary">Learn More</a>\n    </div>\n</section>`;
  
  return html;
}

// Main generation function
async function generateArticles(count = 7000) {
  console.log(`Generating ${count} unique SEO articles...`);
  
  const articles = generateArticleSlugs(count);
  const baseDir = path.join(__dirname, 'articles');
  
  // Create articles directory
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  
  const routes = [];
  let generated = 0;
  
  for (const article of articles) {
    try {
      const content = generateArticleContent(article.slug, article.id);
      const htmlContent = generateHTMLContent(content);
      
      // Create directory for article
      const articleDir = path.join(baseDir, article.slug);
      if (!fs.existsSync(articleDir)) {
        fs.mkdirSync(articleDir, { recursive: true });
      }
      
      // Generate improved description with long-tail keywords
      const description = `Get instant ${content.title.toLowerCase()} with VIN Trust. Comprehensive vehicle history reports including accidents, title records, and more. Only $3. NMVTIS verified data. Free ${article.slug} online.`;
      
      // Generate page
      const page = generatePage({
        title: `${content.title} - VIN Trust | Vehicle History Reports | $3 Instant Check`,
        description: description,
        keywords: content.keywords,
        canonical: `/articles/${article.slug}`,
        ogTitle: `${content.title} - VIN Trust | Instant Vehicle History Reports`,
        ogDescription: description,
        schemaType: 'Article',
        schemaName: content.title,
        schemaDescription: content.intro,
        content: htmlContent
      });
      
      // Write file
      const filePath = path.join(articleDir, 'index.html');
      fs.writeFileSync(filePath, page);
      
      // Add routes
      routes.push({
        src: `/articles/${article.slug}`,
        dest: `/articles/${article.slug}/index.html`
      });
      routes.push({
        src: `/articles/${article.slug}/`,
        dest: `/articles/${article.slug}/index.html`
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
  console.log(`📁 Articles saved to: ${baseDir}`);
  console.log(`🔗 Generated ${routes.length} routes`);
  
  return routes;
}

// Update vercel.json with new routes
function updateVercelJson(newRoutes) {
  console.log('\nUpdating vercel.json...');
  
  const vercelPath = path.join(__dirname, 'vercel.json');
  const vercelData = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
  
  // Add new routes before the closing bracket
  const existingRoutes = vercelData.routes || [];
  vercelData.routes = [...existingRoutes, ...newRoutes];
  
  // Write back
  fs.writeFileSync(vercelPath, JSON.stringify(vercelData, null, 2));
  
  console.log(`✅ Added ${newRoutes.length} routes to vercel.json`);
  console.log(`📊 Total routes now: ${vercelData.routes.length}`);
}

// Main execution
if (require.main === module) {
  const count = parseInt(process.argv[2]) || 7000;
  
  generateArticles(count)
    .then(routes => {
      updateVercelJson(routes);
      console.log('\n🎉 All done! 7000 SEO articles generated successfully.');
    })
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}

module.exports = { generateArticles, generateArticleSlugs, generateArticleContent };

