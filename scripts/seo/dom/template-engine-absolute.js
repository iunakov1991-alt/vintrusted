const { log } = require('../logger');
const path = require('path');
const fs = require('fs');

/**
 * SEO-ДИЗАЙН ABSOLUTE 1000%
 * Template Engine для нового дизайна в стиле DMV × Apple × LegalTech
 */
class TemplateEngineAbsolute {
  constructor(config) {
    this.config = config;
  }

  escapeHtml(str = '') {
    return str.toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Получение пути к AI-изображению для кластера
   * Все изображения в формате SVG (генерируются через DeepSeek или программно)
   */
  getClusterImagePath(clusterId, type = 'hero') {
    const imagesDir = path.join(process.cwd(), 'public', 'seo', 'images', 'clusters');
    const svgPath = path.join(imagesDir, `${clusterId}-${type}.svg`);
    
    if (fs.existsSync(svgPath)) {
      return `/seo/images/clusters/${clusterId}-${type}.svg`;
    }
    return null;
  }

  /**
   * 1. HERO SECTION
   */
  renderHero(ctx) {
    const vin = ctx.vin || 'N/A';
    const make = ctx.make || 'Vehicle';
    const year = ctx.year || '';
    const state = ctx.stateLabel || ctx.stateSlug || '';
    const summary = ctx.heroSummary || ctx.intro || `Complete VIN history report for ${year} ${make} in ${state}`;
    
    // AI изображение для кластера
    const clusterId = `${ctx.stateSlug}-${ctx.make}-${ctx.intent}`;
    const heroImage = this.getClusterImagePath(clusterId, 'hero');
    const ogImage = this.getClusterImagePath(clusterId, 'og');
    
    const ctaVariants = [
      'Get Full Report',
      'View Complete History',
      'Check VIN Now',
      'Get Detailed Report',
      'Access Full Report'
    ];
    const ctaText = ctaVariants[Math.floor(Math.random() * ctaVariants.length)];

    return `
<section class="seo-hero">
  ${heroImage ? `<img src="${heroImage}" alt="VIN Report for ${make} in ${state}" class="seo-hero-image" />` : ''}
  <div class="seo-container">
    <span class="seo-hero-vin">${this.escapeHtml(vin)}</span>
    <div class="seo-hero-meta">${year} ${this.escapeHtml(make)} • ${this.escapeHtml(state)}</div>
    <p class="seo-hero-summary">${this.escapeHtml(summary)}</p>
    <a href="/checkout?vin=${encodeURIComponent(vin)}" class="seo-hero-cta">${this.escapeHtml(ctaText)}</a>
  </div>
</section>`;
  }

  /**
   * 2. KEY FACTS (CARDS)
   */
  renderKeyFacts(ctx) {
    const facts = ctx.keyFacts || [];
    if (!facts.length) return '';

    const icons = ['📋', '🚗', '📅', '📍', '✅', '⚠️'];
    
    return `
<section class="seo-key-facts seo-section">
  <div class="seo-container">
    ${facts.map((fact, idx) => {
      const icon = icons[idx % icons.length];
      const label = typeof fact === 'object' ? fact.label : 'Fact';
      const value = typeof fact === 'object' ? fact.value : fact;
      
      return `
    <div class="seo-key-fact-card">
      <div class="seo-key-fact-icon">${icon}</div>
      <div class="seo-key-fact-label">${this.escapeHtml(label)}</div>
      <div class="seo-key-fact-value">${this.escapeHtml(value)}</div>
    </div>`;
    }).join('')}
  </div>
</section>`;
  }

  /**
   * 3. DEEP EXPLANATION
   */
  renderDeepExplanation(ctx) {
    const explanation = ctx.deepExplanation || ctx.aiText || '';
    if (!explanation) return '';

    // Разбиваем на абзацы
    const paragraphs = explanation.split('\n\n').filter(p => p.trim());
    
    return `
<section class="seo-explanation seo-section">
  <div class="seo-container">
    <h2>Understanding This VIN Report</h2>
    ${paragraphs.map(p => `<p>${this.escapeHtml(p.trim())}</p>`).join('')}
  </div>
</section>`;
  }

  /**
   * 4. VEHICLE SPECS TABLE (DMV STYLE)
   */
  renderVehicleSpecs(ctx) {
    const vin = ctx.vin || 'N/A';
    const make = ctx.make || 'N/A';
    const year = ctx.year || 'N/A';
    const state = ctx.stateLabel || ctx.stateSlug || 'N/A';
    const intent = ctx.intent || 'vin_check';
    
    const specs = [
      { label: 'VIN', value: vin, isVIN: true },
      { label: 'Make', value: make },
      { label: 'Year', value: year },
      { label: 'State', value: state },
      { label: 'Report Type', value: intent.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) }
    ];

    return `
<section class="seo-specs-table seo-section">
  <div class="seo-container">
    <table class="seo-specs-table">
      <thead>
        <tr>
          <th>Specification</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        ${specs.map(spec => `
        <tr>
          <td>${this.escapeHtml(spec.label)}</td>
          <td class="${spec.isVIN ? 'vin-cell' : ''}">${this.escapeHtml(spec.value)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>
</section>`;
  }

  /**
   * 5. STATE INSIGHTS
   */
  renderStateInsights(ctx) {
    const insights = ctx.stateInsights || ctx.localInsights || '';
    if (!insights) return '';

    return `
<section class="seo-state-insights seo-section">
  <div class="seo-container">
    <h2>State-Specific Considerations for ${this.escapeHtml(ctx.stateLabel || ctx.stateSlug || 'Your State')}</h2>
    <p>${this.escapeHtml(insights)}</p>
  </div>
</section>`;
  }

  /**
   * 6. COMMON RISKS
   */
  renderCommonRisks(ctx) {
    const risks = ctx.commonRisks || [
      'Title branding issues (salvage, flood, etc.)',
      'Accident history not fully disclosed',
      'Odometer rollback or tampering',
      'Lien or loan still attached',
      'Theft records or recovery history',
      'Multiple previous owners in short time'
    ];

    return `
<section class="seo-risks seo-section">
  <div class="seo-container">
    <h2>Common Risks to Check</h2>
    <ul>
      ${risks.map(risk => `<li>${this.escapeHtml(risk)}</li>`).join('')}
    </ul>
  </div>
</section>`;
  }

  /**
   * 7. MARKET VALUE
   */
  renderMarketValue(ctx) {
    const marketValue = ctx.marketValue || {};
    const retailRange = marketValue.retail || { min: 15000, max: 25000 };
    const tradeInRange = marketValue.tradeIn || { min: 12000, max: 20000 };

    return `
<section class="seo-market-value seo-section">
  <div class="seo-container">
    <h2>Estimated Market Value</h2>
    <div class="seo-market-range">
      <span class="seo-market-range-label">Retail Value:</span>
      <span class="seo-market-range-value">$${retailRange.min.toLocaleString()} - $${retailRange.max.toLocaleString()}</span>
    </div>
    <div class="seo-market-range">
      <span class="seo-market-range-label">Trade-In Value:</span>
      <span class="seo-market-range-value">$${tradeInRange.min.toLocaleString()} - $${tradeInRange.max.toLocaleString()}</span>
    </div>
  </div>
</section>`;
  }

  /**
   * 8. AI ANALYSIS
   */
  renderAIAnalysis(ctx) {
    const aiText = ctx.aiText || ctx.deepExplanation || '';
    if (!aiText) return '';

    const paragraphs = aiText.split('\n\n').filter(p => p.trim());

    return `
<section class="seo-ai-analysis seo-section">
  <div class="seo-container">
    <h2>Expert Analysis</h2>
    ${paragraphs.map(p => `<p>${this.escapeHtml(p.trim())}</p>`).join('')}
  </div>
</section>`;
  }

  /**
   * 9. FREE VS PAID
   */
  renderFreeVsPaid(ctx) {
    const comparison = [
      { feature: 'Basic VIN Decode', free: '✓', paid: '✓' },
      { feature: 'Title History', free: 'Limited', paid: '✓' },
      { feature: 'Accident Records', free: '✗', paid: '✓' },
      { feature: 'Odometer History', free: '✗', paid: '✓' },
      { feature: 'Lien Records', free: '✗', paid: '✓' },
      { feature: 'Theft Records', free: '✗', paid: '✓' },
      { feature: 'Ownership History', free: '✗', paid: '✓' },
      { feature: 'Market Value Estimate', free: '✗', paid: '✓' }
    ];

    return `
<section class="seo-comparison seo-section">
  <div class="seo-container">
    <h2>Free Check vs Full Paid Report</h2>
    <table class="seo-comparison-table">
      <thead>
        <tr>
          <th>Feature</th>
          <th>Free Check</th>
          <th>Full Report</th>
        </tr>
      </thead>
      <tbody>
        ${comparison.map(item => `
        <tr>
          <td>${this.escapeHtml(item.feature)}</td>
          <td class="${item.free === '✓' ? 'check' : item.free === '✗' ? 'cross' : ''}">${this.escapeHtml(item.free)}</td>
          <td class="${item.paid === '✓' ? 'check' : ''}">${this.escapeHtml(item.paid)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>
</section>`;
  }

  /**
   * 10. FAQ
   */
  renderFAQ(ctx) {
    const faq = ctx.faq || [];
    if (!faq.length) return '';

    return `
<section class="seo-faq seo-section">
  <div class="seo-container">
    <h2>Frequently Asked Questions</h2>
    ${faq.map(item => `
    <div class="seo-faq-item">
      <div class="seo-faq-question">${this.escapeHtml(item.q)}</div>
      <div class="seo-faq-answer">${this.escapeHtml(item.a)}</div>
    </div>`).join('')}
  </div>
</section>`;
  }

  /**
   * 11. INTERNAL LINKS
   */
  renderInternalLinks(ctx) {
    const links = ctx.internalLinks || [];
    if (!links.length) return '';

    // Разделяем на две группы
    const stateLinks = links.filter(l => l.type === 'state' || l.href.includes(ctx.stateSlug));
    const makeLinks = links.filter(l => l.type === 'make' || l.href.includes(ctx.make));

    return `
<section class="seo-internal-links seo-section">
  <div class="seo-container-wide">
    ${stateLinks.length > 0 ? `
    <div class="seo-internal-links-section">
      <h3>VINs in ${this.escapeHtml(ctx.stateLabel || ctx.stateSlug)}</h3>
      <ul>
        ${stateLinks.slice(0, 5).map(l => `<li><a href="${l.href}">${this.escapeHtml(l.label)}</a></li>`).join('')}
      </ul>
    </div>` : ''}
    ${makeLinks.length > 0 ? `
    <div class="seo-internal-links-section">
      <h3>Popular VINs for ${this.escapeHtml(ctx.make || 'This Make')}</h3>
      <ul>
        ${makeLinks.slice(0, 5).map(l => `<li><a href="${l.href}">${this.escapeHtml(l.label)}</a></li>`).join('')}
      </ul>
    </div>` : ''}
  </div>
</section>`;
  }

  /**
   * Рендеринг блока по типу
   */
  renderBlock(blockType, ctx) {
    switch (blockType) {
      case 'hero':
        return this.renderHero(ctx);
      case 'keyFacts':
        return this.renderKeyFacts(ctx);
      case 'deepExplanation':
        return this.renderDeepExplanation(ctx);
      case 'vehicleSpecs':
        return this.renderVehicleSpecs(ctx);
      case 'stateInsights':
        return this.renderStateInsights(ctx);
      case 'commonRisks':
        return this.renderCommonRisks(ctx);
      case 'marketValue':
        return this.renderMarketValue(ctx);
      case 'aiAnalysis':
        return this.renderAIAnalysis(ctx);
      case 'freeVsPaid':
        return this.renderFreeVsPaid(ctx);
      case 'faq':
        return this.renderFAQ(ctx);
      case 'internalLinks':
        return this.renderInternalLinks(ctx);
      default:
        return '';
    }
  }

  /**
   * Рендеринг полной Schema.org разметки
   */
  renderSchema(page) {
    const schemas = [];

    // WebPage
    schemas.push({
      "@context": "https://schema.org",
      "@type": "WebPage",
      "url": `https://vintrusted.com${page.url}`,
      "name": page.title,
      "description": page.description,
      "inLanguage": page.lang || "en"
    });

    // Breadcrumb
    schemas.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://vintrusted.com"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": page.stateLabel || page.stateSlug,
          "item": `https://vintrusted.com/vin/${page.vin}/${page.stateSlug}/`
        }
      ]
    });

    // Vehicle
    if (page.vin && page.make && page.year) {
      schemas.push({
        "@context": "https://schema.org",
        "@type": "Vehicle",
        "vehicleIdentificationNumber": page.vin,
        "manufacturer": {
          "@type": "Brand",
          "name": page.make
        },
        "productionDate": page.year,
        "vehicleModelDate": page.year
      });
    }

    // Product (VIN Report)
    schemas.push({
      "@context": "https://schema.org",
      "@type": "Product",
      "name": `VIN Report for ${page.vin}`,
      "description": page.description,
      "offers": {
        "@type": "Offer",
        "price": "3.00",
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock"
      }
    });

    // FAQPage
    if (page.faq && page.faq.length > 0) {
      schemas.push({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": page.faq.map(q => ({
          "@type": "Question",
          "name": q.q,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": q.a
          }
        }))
      });
    }

    return `<script type="application/ld+json">${JSON.stringify(schemas, null, 2)}</script>`;
  }

  /**
   * Рендеринг Google Analytics
   */
  renderGoogleAnalytics() {
    const gaId = process.env.GOOGLE_ANALYTICS_ID || this.config?.googleAnalyticsId || 'G-CX3CT2K2FC';
    if (!gaId) return '';

    return `
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${gaId}');
  </script>`;
  }

  /**
   * Рендеринг полной страницы
   */
  renderPage(page, layout) {
    const blocks = layout.blocks || [];
    const body = blocks.map(blockType => this.renderBlock(blockType, page)).join('\n');

    const schema = this.renderSchema(page);
    const gaCode = this.renderGoogleAnalytics();
    
    // OG Image для кластера
    const clusterId = `${page.stateSlug}-${page.make}-${page.intent}`;
    const ogImage = this.getClusterImagePath(clusterId, 'og');
    const ogImageUrl = ogImage ? `https://vintrusted.com${ogImage}` : '';

    return `<!doctype html>
<html lang="${page.lang || 'en'}">
<head>
  <meta charset="utf-8" />
  <title>${this.escapeHtml(page.title)}</title>
  <meta name="description" content="${this.escapeHtml(page.description)}" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <link rel="canonical" href="https://vintrusted.com${page.url}" />
  <meta property="og:title" content="${this.escapeHtml(page.title)}" />
  <meta property="og:description" content="${this.escapeHtml(page.description)}" />
  <meta property="og:url" content="https://vintrusted.com${page.url}" />
  <meta property="og:type" content="article" />
  ${ogImageUrl ? `<meta property="og:image" content="${ogImageUrl}" />` : ''}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${this.escapeHtml(page.title)}" />
  <meta name="twitter:description" content="${this.escapeHtml(page.description)}" />
  ${ogImageUrl ? `<meta name="twitter:image" content="${ogImageUrl}" />` : ''}
  <link rel="stylesheet" href="/css/seo-absolute.css" />
  ${schema}${gaCode}
</head>
<body>
  <div class="seo-page">
    ${body}
  </div>
</body>
</html>`;
  }
}

module.exports = { TemplateEngineAbsolute };

