#!/usr/bin/env node

/**
 * Educational Pages Generator
 * Создаёт SEO-страницы для Helpful Resources секции
 */

const fs = require('fs');
const path = require('path');

const TOPICS_FILE = path.join(__dirname, '..', 'data', 'educational_topics.json');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'semantic-pages', 'en', 'educational');
const SITE_URL = 'https://vintrusted.com';

// Загрузить топики
function loadTopics() {
  const data = fs.readFileSync(TOPICS_FILE, 'utf8');
  return JSON.parse(data);
}

// Генерировать HTML для educational страницы
function generatePageHTML(topic, allTopics) {
  const relatedTopics = topic.related
    .map(slug => allTopics.find(t => t.slug === slug))
    .filter(Boolean)
    .slice(0, 5);
  
  const breadcrumbs = [
    { name: 'Home', url: 'https://vintrusted.com/' },
    { name: 'Educational', url: 'https://vintrusted.com/en/educational/' },
    { name: topic.title, url: `https://vintrusted.com/${topic.slug}/` }
  ];
  
  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${topic.title} | VIN Trust</title>
    <meta name="description" content="${topic.description}" />
    <link rel="canonical" href="${SITE_URL}/${topic.slug}/" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="dns-prefetch" href="https://vintrusted.com" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <link rel="icon" type="image/svg+xml" href="/img/favicon.svg" />
    <link rel="icon" type="image/png" href="/img/favicon.png" />
    <link rel="apple-touch-icon" href="/img/favicon.png" />
    <link rel="shortcut icon" href="/favicon.ico" />
    <meta name="theme-color" content="#0f0f0f" />
    <meta name="msapplication-TileColor" content="#3B82F6" />
    <link rel="alternate" hreflang="en-US" href="${SITE_URL}/${topic.slug}/" />
    <link rel="alternate" hreflang="x-default" href="${SITE_URL}/${topic.slug}/" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${topic.title}" />
    <meta property="og:description" content="${topic.description}" />
    <meta property="og:url" content="${SITE_URL}/${topic.slug}/" />
    <meta property="og:image" content="https://vintrusted.com/hero-background.jpg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:site_name" content="VIN Trust" />
    <meta property="og:locale" content="en_US" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${topic.title}" />
    <meta name="twitter:description" content="${topic.description}" />
    <meta name="twitter:image" content="https://vintrusted.com/hero-background.jpg" />
    <script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "${topic.title}",
  "description": "${topic.description}",
  "url": "${SITE_URL}/${topic.slug}/",
  "inLanguage": "en-US",
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "${SITE_URL}/${topic.slug}/"
  },
  "publisher": {
    "@type": "Organization",
    "name": "VIN Trust",
    "url": "https://vintrusted.com"
  },
  "isPartOf": {
    "@type": "WebSite",
    "name": "VIN Trust",
    "url": "https://vintrusted.com"
  },
  "keywords": "${topic.keywords.join(', ')}"
}
    </script>
    <script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
${breadcrumbs.map((b, i) => `    {
      "@type": "ListItem",
      "position": ${i + 1},
      "name": "${b.name}",
      "item": "${b.url}"
    }`).join(',\n')}
  ]
}
    </script>
    <link rel="stylesheet" href="/css/styles.css" />
    <style>
      .educational-page {
        max-width: 1200px;
        margin: 0 auto;
        padding: 40px 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        line-height: 1.6;
        color: #333;
      }
      .breadcrumb {
        margin-bottom: 20px;
        font-size: 14px;
        color: #666;
      }
      .breadcrumb a {
        color: #3B82F6;
        text-decoration: none;
      }
      .breadcrumb a:hover {
        text-decoration: underline;
      }
      .breadcrumb span {
        margin: 0 8px;
      }
      .hero-section {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 60px 40px;
        border-radius: 16px;
        margin-bottom: 40px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      }
      .hero-section h1 {
        margin: 0 0 10px;
        font-size: 48px;
        font-weight: 700;
        line-height: 1.2;
      }
      .hero-section p {
        margin: 0;
        font-size: 20px;
        opacity: 0.95;
      }
      .content-wrapper {
        display: grid;
        grid-template-columns: 1fr 300px;
        gap: 40px;
      }
      .main-content {
        background: white;
        padding: 40px;
        border-radius: 12px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.05);
      }
      .main-content h2 {
        font-size: 32px;
        margin: 40px 0 20px;
        color: #1a1a1a;
        border-bottom: 3px solid #3B82F6;
        padding-bottom: 10px;
      }
      .main-content h3 {
        font-size: 24px;
        margin: 30px 0 15px;
        color: #333;
      }
      .main-content p {
        font-size: 18px;
        line-height: 1.8;
        margin: 15px 0;
      }
      .main-content ul, .main-content ol {
        font-size: 18px;
        line-height: 1.8;
        margin: 15px 0;
        padding-left: 30px;
      }
      .main-content li {
        margin: 10px 0;
      }
      .sidebar {
        position: sticky;
        top: 20px;
        height: fit-content;
      }
      .sidebar-card {
        background: white;
        padding: 24px;
        border-radius: 12px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        margin-bottom: 20px;
      }
      .sidebar-card h3 {
        margin: 0 0 15px;
        font-size: 18px;
        color: #1a1a1a;
        border-bottom: 2px solid #3B82F6;
        padding-bottom: 8px;
      }
      .sidebar-card ul {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      .sidebar-card li {
        margin: 12px 0;
      }
      .sidebar-card a {
        color: #3B82F6;
        text-decoration: none;
        font-size: 16px;
        transition: color 0.2s;
      }
      .sidebar-card a:hover {
        color: #2563eb;
        text-decoration: underline;
      }
      .cta-box {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 30px;
        border-radius: 12px;
        text-align: center;
        margin: 40px 0;
      }
      .cta-box h3 {
        margin: 0 0 15px;
        font-size: 24px;
      }
      .cta-box p {
        margin: 0 0 20px;
        opacity: 0.95;
      }
      .cta-button {
        display: inline-block;
        padding: 14px 32px;
        background: white;
        color: #667eea;
        text-decoration: none;
        border-radius: 8px;
        font-weight: 600;
        font-size: 16px;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      .cta-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0,0,0,0.2);
      }
      @media (max-width: 768px) {
        .content-wrapper {
          grid-template-columns: 1fr;
        }
        .hero-section h1 {
          font-size: 32px;
        }
        .hero-section p {
          font-size: 16px;
        }
        .main-content {
          padding: 24px;
        }
      }
    </style>
  </head>
  <body>
    <div class="educational-page">
      <!-- Breadcrumbs -->
      <nav class="breadcrumb">
        ${breadcrumbs.map((b, i) => 
          i === breadcrumbs.length - 1 
            ? `<span>${b.name}</span>`
            : `<a href="${b.url}">${b.name}</a><span>›</span>`
        ).join('')}
      </nav>
      
      <!-- Hero Section -->
      <div class="hero-section">
        <h1>${topic.title}</h1>
        <p>${topic.subtitle}</p>
      </div>
      
      <!-- Content Wrapper -->
      <div class="content-wrapper">
        <!-- Main Content -->
        <article class="main-content">
          <h2>Overview</h2>
          <p>${topic.description}</p>
          
          <h2>What You Need to Know</h2>
          <p>When dealing with ${topic.title.toLowerCase()}, there are several important aspects to consider. Understanding these fundamentals will help you make informed decisions and avoid common pitfalls.</p>
          
          <ul>
            <li><strong>Documentation Requirements:</strong> Know what paperwork you'll need to complete the process successfully.</li>
            <li><strong>State Regulations:</strong> Requirements may vary by state, so check your local DMV guidelines.</li>
            <li><strong>Timeline:</strong> Understanding how long the process takes helps you plan accordingly.</li>
            <li><strong>Costs:</strong> Be aware of fees, taxes, and other expenses involved.</li>
          </ul>
          
          <h2>Key Considerations</h2>
          <p>Before proceeding, make sure you understand the implications and requirements. This knowledge will save you time and help ensure a smooth process.</p>
          
          <h3>Important Points</h3>
          <ol>
            <li>Always verify information with your state's DMV or relevant authority</li>
            <li>Keep copies of all documentation for your records</li>
            <li>Understand your rights and obligations</li>
            <li>Seek professional advice if you're unsure about any aspect</li>
          </ol>
          
          <h2>Common Questions</h2>
          <p>Here are answers to frequently asked questions about ${topic.title.toLowerCase()}:</p>
          
          <h3>How long does it take?</h3>
          <p>Processing times vary by state and situation. Generally, you can expect anywhere from a few days to several weeks depending on the complexity.</p>
          
          <h3>What documents do I need?</h3>
          <p>Required documentation typically includes proof of identity, proof of ownership or purchase, and any state-specific forms. Check with your local DMV for exact requirements.</p>
          
          <h3>How much does it cost?</h3>
          <p>Fees vary significantly by state and circumstance. Contact your local DMV or relevant authority for current fee schedules.</p>
          
          <!-- CTA Box -->
          <div class="cta-box">
            <h3>Get Your Vehicle History Report</h3>
            <p>Check your vehicle's complete history including title records, accidents, and more</p>
            <a href="/" class="cta-button">Check VIN Now →</a>
          </div>
          
          <h2>Next Steps</h2>
          <p>Now that you understand the basics, you can proceed with confidence. Remember to:</p>
          <ul>
            <li>Gather all required documentation</li>
            <li>Check your state's specific requirements</li>
            <li>Allow sufficient time for processing</li>
            <li>Keep records of all transactions</li>
          </ul>
          
          <p><em>Last updated: ${new Date().toISOString().split('T')[0]}</em></p>
        </article>
        
        <!-- Sidebar -->
        <aside class="sidebar">
          ${relatedTopics.length > 0 ? `
          <div class="sidebar-card">
            <h3>Related Topics</h3>
            <ul>
              ${relatedTopics.map(rt => `<li><a href="/${rt.slug}/">${rt.title}</a></li>`).join('\n              ')}
            </ul>
          </div>
          ` : ''}
          
          <div class="sidebar-card">
            <h3>Popular Resources</h3>
            <ul>
              <li><a href="/en/dmv-titles/">DMV Title Guides</a></li>
              <li><a href="/">VIN Decoder</a></li>
              <li><a href="/en/educational/">All Educational Topics</a></li>
            </ul>
          </div>
          
          <div class="sidebar-card">
            <h3>Need Help?</h3>
            <ul>
              <li><a href="/contact">Contact Us</a></li>
              <li><a href="/about-us">About VIN Trust</a></li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  </body>
</html>`;
  
  return html;
}

// Генерировать все страницы
function generateAllPages() {
  const topics = loadTopics();
  
  console.log(`\n📚 Generating ${topics.length} educational pages...\n`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const topic of topics) {
    try {
      const topicDir = path.join(OUTPUT_DIR, topic.slug);
      
      // Создать директорию
      if (!fs.existsSync(topicDir)) {
        fs.mkdirSync(topicDir, { recursive: true });
      }
      
      // Генерировать HTML
      const html = generatePageHTML(topic, topics);
      
      // Сохранить файл
      const filePath = path.join(topicDir, 'index.html');
      fs.writeFileSync(filePath, html, 'utf8');
      
      console.log(`✅ ${topic.slug} (${topic.title})`);
      successCount++;
    } catch (error) {
      console.error(`❌ ${topic.slug}: ${error.message}`);
      failCount++;
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Failed: ${failCount}`);
  console.log(`   Total: ${topics.length}\n`);
  
  console.log(`🎉 Educational pages generated in: ${OUTPUT_DIR}\n`);
}

// Main
if (require.main === module) {
  generateAllPages();
}

module.exports = { generateAllPages };
