#!/usr/bin/env node

/**
 * Update keywords in existing articles with improved long-tail keywords
 */

const fs = require('fs');
const path = require('path');

// Import topics from generate script
const topics = {
  carBrands: ['toyota', 'honda', 'ford', 'chevrolet', 'nissan', 'bmw', 'mercedes', 'audi', 'volkswagen', 'hyundai', 'kia', 'mazda', 'subaru', 'jeep', 'ram', 'gmc', 'lexus', 'acura', 'infiniti', 'cadillac', 'lincoln', 'buick', 'chrysler', 'dodge', 'jaguar', 'land-rover', 'porsche', 'tesla', 'volvo', 'mini'],
  states: ['alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut', 'delaware', 'florida', 'georgia', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa', 'kansas', 'kentucky', 'louisiana', 'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota', 'mississippi', 'missouri', 'montana', 'nebraska', 'nevada', 'new-hampshire', 'new-jersey', 'new-mexico', 'new-york', 'north-carolina', 'north-dakota', 'ohio', 'oklahoma', 'oregon', 'pennsylvania', 'rhode-island', 'south-carolina', 'south-dakota', 'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington', 'west-virginia', 'wisconsin', 'wyoming']
};

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
    if (template.length < 100) {
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
  
  // Convert to array and limit to 20 most relevant
  const keywordsArray = Array.from(keywords).slice(0, 20);
  return keywordsArray.join(', ');
}

// Update article file
function updateArticleKeywords(filePath, slug) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Extract title from content
    const titleMatch = content.match(/<title>(.*?)<\/title>/);
    if (!titleMatch) return false;
    
    const fullTitle = titleMatch[1];
    const title = fullTitle.split(' - ')[0]; // Get main title
    
    // Generate new keywords
    const newKeywords = generateKeywords(slug, title);
    
    // Update keywords meta tag
    const keywordsRegex = /<meta name="keywords" content=".*?">/;
    const newKeywordsTag = `<meta name="keywords" content="${newKeywords}">`;
    
    if (keywordsRegex.test(content)) {
      content = content.replace(keywordsRegex, newKeywordsTag);
    } else {
      // Insert after description if keywords tag doesn't exist
      const descRegex = /(<meta name="description" content=".*?">)/;
      content = content.replace(descRegex, `$1\n    ${newKeywordsTag}`);
    }
    
    // Update title to include $1 Instant Check if not present
    if (!fullTitle.includes('$1') && !fullTitle.includes('Instant')) {
      const newTitle = fullTitle.replace(' - VIN Trust | Vehicle History Reports', ' - VIN Trust | Vehicle History Reports | $1 Instant Check');
      content = content.replace(/<title>.*?<\/title>/, `<title>${newTitle}</title>`);
    }
    
    // Update description to include long-tail keywords
    const descMatch = content.match(/<meta name="description" content="(.*?)">/);
    if (descMatch) {
      let desc = descMatch[1];
      if (!desc.includes('Free') && !desc.includes('online')) {
        desc = `Get instant ${title.toLowerCase()} with VIN Trust. Comprehensive vehicle history reports including accidents, title records, and more. Only $1. NMVTIS verified data. Free ${slug} online.`;
        content = content.replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${desc}">`);
      }
    }
    
    fs.writeFileSync(filePath, content);
    return true;
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error.message);
    return false;
  }
}

// Main function
function updateAllArticles() {
  const articlesDir = path.join(__dirname, 'articles');
  
  if (!fs.existsSync(articlesDir)) {
    console.log('Articles directory not found!');
    return;
  }
  
  const articles = fs.readdirSync(articlesDir);
  let updated = 0;
  let errors = 0;
  
  console.log(`Updating keywords in ${articles.length} articles...`);
  
  articles.forEach((slug, index) => {
    const filePath = path.join(articlesDir, slug, 'index.html');
    
    if (fs.existsSync(filePath)) {
      if (updateArticleKeywords(filePath, slug)) {
        updated++;
        if (updated % 100 === 0) {
          console.log(`Updated ${updated}/${articles.length} articles...`);
        }
      } else {
        errors++;
      }
    }
  });
  
  console.log(`\n✅ Updated ${updated} articles`);
  if (errors > 0) {
    console.log(`⚠️  Errors: ${errors}`);
  }
}

if (require.main === module) {
  updateAllArticles();
}

module.exports = { updateArticleKeywords, generateKeywords };




