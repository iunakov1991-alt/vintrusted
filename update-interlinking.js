#!/usr/bin/env node

/**
 * Update interlinking between articles
 * Each article gets 5-10 links to other articles
 */

const fs = require('fs');
const path = require('path');

function updateInterlinking() {
  console.log('Updating interlinking between articles...');
  
  const articlesListPath = path.join(__dirname, 'articles2-list.json');
  if (!fs.existsSync(articlesListPath)) {
    console.error('articles2-list.json not found!');
    process.exit(1);
  }
  
  const articleList = JSON.parse(fs.readFileSync(articlesListPath, 'utf8'));
  const baseDir = path.join(__dirname, 'articles2');
  
  let updated = 0;
  
  articleList.forEach((article, index) => {
    const articleDir = path.join(baseDir, article.slug);
    const filePath = path.join(articleDir, 'index.html');
    
    if (!fs.existsSync(filePath)) {
      return;
    }
    
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Find related articles section
      const relatedSectionRegex = /<section class="related-articles">[\s\S]*?<\/section>/;
      
      // Generate 5-10 related articles
      const numRelated = 5 + (index % 6); // 5-10 articles
      const relatedIndices = [];
      
      // Select related articles (avoid same article and create variety)
      for (let i = 0; i < numRelated; i++) {
        let relatedIndex;
        do {
          relatedIndex = (index + i * 100 + Math.floor(Math.random() * 50)) % articleList.length;
        } while (relatedIndices.includes(relatedIndex) || relatedIndex === index);
        relatedIndices.push(relatedIndex);
      }
      
      let relatedHTML = `<section class="related-articles">\n    <h2>Related Articles</h2>\n    <p>Explore more vehicle history and verification resources:</p>\n    <ul class="related-links">\n`;
      
      // Internal links to main pages
      const mainPages = [
        { url: '/vin-check', name: 'VIN Check' },
        { url: '/license-plate-check', name: 'License Plate Check' },
        { url: '/vin-history-report', name: 'VIN History Report' },
        { url: '/accident-history', name: 'Accident History' },
        { url: '/recall-information', name: 'Recall Information' }
      ];
      
      mainPages.forEach(page => {
        relatedHTML += `        <li><a href="${page.url}">${page.name}</a></li>\n`;
      });
      
      // Links to related articles
      relatedIndices.forEach(relatedIndex => {
        const relatedArticle = articleList[relatedIndex];
        relatedHTML += `        <li><a href="${relatedArticle.url}">${relatedArticle.title}</a></li>\n`;
      });
      
      relatedHTML += `    </ul>\n</section>\n`;
      
      // Replace related section
      if (relatedSectionRegex.test(content)) {
        content = content.replace(relatedSectionRegex, relatedHTML);
      } else {
        // Insert before CTA section
        const ctaRegex = /<section class="cta-section">/;
        if (ctaRegex.test(content)) {
          content = content.replace(ctaRegex, relatedHTML + '\n\n$&');
        }
      }
      
      fs.writeFileSync(filePath, content);
      updated++;
      
      if (updated % 100 === 0) {
        console.log(`Updated ${updated}/${articleList.length} articles...`);
      }
    } catch (error) {
      console.error(`Error updating ${article.slug}:`, error.message);
    }
  });
  
  console.log(`✅ Updated interlinking in ${updated} articles`);
}

if (require.main === module) {
  updateInterlinking();
}

module.exports = { updateInterlinking };


