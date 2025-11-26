#!/usr/bin/env node

/**
 * Generate pagination pages for articles2
 * Creates /articles2/page/1, /page/2, etc. with 50 articles per page
 */

const fs = require('fs');
const path = require('path');
const { renderSeoPage } = require('./scripts/seo-template.js');

function generatePaginationPages() {
  console.log('Generating pagination pages...');
  
  const articlesListPath = path.join(__dirname, 'articles2-list.json');
  if (!fs.existsSync(articlesListPath)) {
    console.error('articles2-list.json not found!');
    process.exit(1);
  }
  
  const articleList = JSON.parse(fs.readFileSync(articlesListPath, 'utf8'));
  const articlesPerPage = 50;
  const totalPages = Math.ceil(articleList.length / articlesPerPage);
  
  const baseDir = path.join(__dirname, 'articles2');
  const paginationDir = path.join(baseDir, 'page');
  
  if (!fs.existsSync(paginationDir)) {
    fs.mkdirSync(paginationDir, { recursive: true });
  }
  
  const routes = [];
  
  for (let page = 1; page <= totalPages; page++) {
    const start = (page - 1) * articlesPerPage;
    const end = start + articlesPerPage;
    const pageArticles = articleList.slice(start, end);
    
    // Generate articles list HTML
    let articlesListHTML = '<ul>\n';
    pageArticles.forEach(article => {
      articlesListHTML += `    <li><a href="${article.url}">${article.title}</a></li>\n`;
    });
    articlesListHTML += '</ul>\n';
    
    // Pagination navigation HTML
    let paginationHTML = '<nav class="pagination">\n';
    if (page > 1) {
      paginationHTML += `    <a href="/articles2/page/${page - 1}">Previous</a>\n`;
    }
    paginationHTML += `    <span>Page ${page} of ${totalPages}</span>\n`;
    if (page < totalPages) {
      paginationHTML += `    <a href="/articles2/page/${page + 1}">Next</a>\n`;
    }
    paginationHTML += '</nav>\n';
    
    const pageData = {
      slugPath: `/articles2/page/${page}`,
      title: `Vehicle History Articles - Page ${page} | VIN Trust`,
      metaDescription: `Browse page ${page} of our vehicle history articles. Comprehensive guides on VIN checks, accident history, title verification, and more.`,
      h1: `Vehicle History Articles - Page ${page}`,
      introHtml: `<p>Browse our comprehensive collection of vehicle history and verification articles. Page ${page} of ${totalPages}.</p>`,
      sections: [
        {
          id: 'articles-list',
          heading: 'Articles',
          html: articlesListHTML + paginationHTML
        }
      ],
      benefitsHtml: `<ul>
        <li>Comprehensive vehicle history guides</li>
        <li>Expert insights and tips</li>
        <li>Updated regularly with new content</li>
      </ul>`,
      faq: []
    };
    
    const pageHTML = renderSeoPage(pageData);
    
    // Create page directory
    const pageDir = path.join(paginationDir, String(page));
    if (!fs.existsSync(pageDir)) {
      fs.mkdirSync(pageDir, { recursive: true });
    }
    
    // Write file
    fs.writeFileSync(path.join(pageDir, 'index.html'), pageHTML);
    
    // Add routes
    routes.push({
      src: `/articles2/page/${page}`,
      dest: `/articles2/page/${page}/index.html`
    });
    routes.push({
      src: `/articles2/page/${page}/`,
      dest: `/articles2/page/${page}/index.html`
    });
    
    if (page % 10 === 0) {
      console.log(`Generated ${page}/${totalPages} pagination pages...`);
    }
  }
  
  console.log(`✅ Generated ${totalPages} pagination pages`);
  
  // Save routes
  fs.writeFileSync(
    path.join(__dirname, 'pagination-routes.json'),
    JSON.stringify(routes, null, 2)
  );
  
  return routes;
}

if (require.main === module) {
  generatePaginationPages();
}

module.exports = { generatePaginationPages };


