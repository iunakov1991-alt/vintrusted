const { LayoutEngine } = require('./layout-engine');
const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Template Engine
 * Рендеринг HTML с вариативными layout'ами и блоками
 */
class TemplateEngine {
  constructor(config) {
    this.config = config;
    this.layoutEngine = new LayoutEngine(config);
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
   * Рендеринг блока контента
   */
  renderBlock(block, ctx) {
    switch (block.type) {
      case 'header':
        return this.renderHeader(ctx);
      case 'keyFacts':
        return this.renderKeyFacts(ctx);
      case 'aiSection':
        return this.renderAISection(ctx);
      case 'featureTable':
        return this.renderFeatureTable(ctx);
      case 'localInsights':
        return this.renderLocalInsights(ctx);
      case 'comparison':
        return this.renderComparison(ctx);
      case 'faq':
        return this.renderFAQ(ctx);
      case 'cta':
        return this.renderCTA(ctx);
      case 'internalLinks':
        return this.renderInternalLinks(ctx);
      default:
        return '';
    }
  }

  renderInternalLinks(ctx) {
    const links = ctx.internalLinks || [];
    if (!links.length) return '';
    return `
      <nav class="internal-links">
        <h2>Related VIN checks</h2>
        <ul>
          ${links.map(l => `<li><a href="${l.href}">${this.escapeHtml(l.label)}</a></li>`).join('')}
        </ul>
      </nav>`;
  }

  renderHeader(ctx) {
    return `
      <header>
        <h1>${this.escapeHtml(ctx.h1 || ctx.title)}</h1>
        <p class="intro">${this.escapeHtml(ctx.intro || '')}</p>
      </header>`;
  }

  renderKeyFacts(ctx) {
    const items = ctx.keyFacts || [];
    return `
      <section class="key-facts">
        <h2>Key facts at a glance</h2>
        <ul>
          ${items.map(i => `<li>${this.escapeHtml(i)}</li>`).join('')}
        </ul>
      </section>`;
  }

  renderAISection(ctx) {
    const text = ctx.aiText || '';
    if (!text) return '';
    return `
      <section class="ai-section">
        <h2>How this ${(ctx.intent || '').replace('_', ' ')} check fits into the full report</h2>
        <p>${this.escapeHtml(text)}</p>
      </section>`;
  }

  renderFeatureTable(ctx) {
    const rows = ctx.featureTable || [];
    return `
      <section class="feature-table">
        <h2>What this VIN report can show</h2>
        <table>
          <thead>
            <tr>
              <th>Check type</th>
              <th>What you see</th>
              <th>Why it matters</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td>${this.escapeHtml(r.type)}</td>
                <td>${this.escapeHtml(r.what)}</td>
                <td>${this.escapeHtml(r.why)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </section>`;
  }

  renderLocalInsights(ctx) {
    const text = ctx.localInsights || '';
    if (!text) return '';
    return `
      <section class="local-insights">
        <h2>Why VIN checks matter in ${this.escapeHtml(ctx.stateLabel || 'your state')}</h2>
        <p>${this.escapeHtml(text)}</p>
      </section>`;
  }

  renderComparison(ctx) {
    const items = ctx.comparison || [];
    return `
      <section class="free-vs-paid">
        <h2>Free VIN check vs full paid report</h2>
        <ul>
          ${items.map(i => `
            <li>
              <strong>${this.escapeHtml(i.type)}:</strong> ${this.escapeHtml(i.description)}
            </li>
          `).join('')}
        </ul>
      </section>`;
  }

  renderFAQ(ctx) {
    const faq = ctx.faq || [];
    if (!faq.length) return '';
    return `
      <section class="faq">
        <h2>FAQ</h2>
        ${faq.map(q => `
          <div class="faq-item">
            <h3>${this.escapeHtml(q.q)}</h3>
            <p>${this.escapeHtml(q.a)}</p>
          </div>
        `).join('')}
      </section>`;
  }

  renderCTA(ctx) {
    const ctaTexts = [
      'Check this VIN now',
      'Run full VIN report',
      'Get your VIN report',
      'Check VIN history',
      'View complete report'
    ];
    const ctaText = ctaTexts[Math.floor(Math.random() * ctaTexts.length)];
    
    return `
      <section class="cta">
        <a href="/checkout" class="btn-primary">${this.escapeHtml(ctaText)}</a>
      </section>`;
  }

  /**
   * Рендеринг полной страницы
   */
  renderPage(page, layout) {
    const blocks = layout.blocks || [];
    const body = blocks.map(blockType => {
      const block = { type: blockType };
      return this.renderBlock(block, page);
    }).join('');

    const schema = this.renderSchema(page);

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
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${this.escapeHtml(page.title)}" />
  <meta name="twitter:description" content="${this.escapeHtml(page.description)}" />
  ${schema}
</head>
<body>
  <main>
    ${body}
  </main>
</body>
</html>`;
  }

  renderSchema(page) {
    const faq = page.faq || [];
    const faqSchema = faq.length ? {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faq.map(q => ({
        "@type": "Question",
        "name": q.q,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": q.a
        }
      }))
    } : null;

    const baseSchema = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "url": `https://vintrusted.com${page.url}`,
      "name": page.title,
      "description": page.description
    };

    const schemas = faqSchema ? [baseSchema, faqSchema] : baseSchema;
    return `<script type="application/ld+json">${JSON.stringify(schemas)}</script>`;
  }
}

module.exports = { TemplateEngine };

