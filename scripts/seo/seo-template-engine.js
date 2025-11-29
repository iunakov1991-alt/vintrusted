
const escapeHtml = (str = '') =>

  str.toString()

    .replace(/&/g, '&amp;')

    .replace(/</g, '&lt;')

    .replace(/>/g, '&gt;');

function buildFaqSchema(url, faq) {

  if (!faq || !faq.length) return null;

  return {

    "@context": "https://schema.org",

    "@type": "FAQPage",

    "mainEntity": faq.map(q => ({

      "@type": "Question",

      "name": q.q,

      "acceptedAnswer": {

        "@type": "Answer",

        "text": q.a

      }

    })),

    "url": `https://vintrusted.com${url}`

  };

}

function buildBaseSchema({ url, title, description }) {

  return {

    "@context": "https://schema.org",

    "@type": "WebPage",

    "url": `https://vintrusted.com${url}`,

    "name": title,

    "description": description

  };

}

function renderSchema({ url, title, description, faq }) {

  const base = buildBaseSchema({ url, title, description });

  const faqSchema = buildFaqSchema(url, faq);

  const payload = faqSchema ? [base, faqSchema] : base;

  return `<script type="application/ld+json">${JSON.stringify(payload)}</script>`;

}

function renderKeyFacts(ctx) {

  const items = ctx.keyFacts || [

    `Covers title, ownership, odometer and basic accident history for this VIN.`,

    `Uses multiple data sources (DMV, auctions, insurance records where available).`,

    `Helps you avoid overpaying for vehicles with hidden issues in ${ctx.stateLabel || 'your state'}.`

  ];

  return `

  <section class="key-facts">

    <h2>Key facts at a glance</h2>

    <ul>

      ${items.map(i => `<li>${escapeHtml(i)}</li>`).join('')}

    </ul>

  </section>`;

}

function renderLocalInsights(ctx) {

  const stateLabel = ctx.stateLabel || 'your state';

  return `

  <section class="local-insights">

    <h2>Why VIN checks matter in ${escapeHtml(stateLabel)}</h2>

    <p>

      Vehicle title and registration rules in ${escapeHtml(stateLabel)} can affect

      how salvage, rebuilt and branded titles are recorded. A detailed VIN report

      helps you understand how many owners the vehicle had, how often it was registered,

      and whether it ever appeared at auctions or insurance events in ${escapeHtml(

        stateLabel

      )}.

    </p>

  </section>`;

}

function renderComparisonBlock() {

  return `

  <section class="free-vs-paid">

    <h2>Free VIN check vs full paid report</h2>

    <ul>

      <li><strong>Free VIN check:</strong> basic format validation and limited open data; often no detailed history.</li>

      <li><strong>Full report:</strong> aggregated data from DMVs, insurance and auctions where available, with clearer risk signals.</li>

      <li><strong>Best practice:</strong> use a full report before paying a deposit or signing a bill of sale.</li>

    </ul>

  </section>`;

}

function renderFeatureTable() {

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

        <tr>

          <td>Title &amp; ownership</td>

          <td>Number of owners, title transfers, possible title brands.</td>

          <td>Helps detect frequently flipped or branded vehicles.</td>

        </tr>

        <tr>

          <td>Accident &amp; damage</td>

          <td>Reported collisions, total loss events, auction announcements.</td>

          <td>Shows history of serious incidents that may affect safety.</td>

        </tr>

        <tr>

          <td>Odometer readings</td>

          <td>Mileage recorded at inspections, registrations and sales.</td>

          <td>Helps reveal unrealistic jumps or rollbacks.</td>

        </tr>

        <tr>

          <td>Usage patterns</td>

          <td>Private, commercial or fleet use where available.</td>

          <td>Explains why some vehicles have higher wear.</td>

        </tr>

      </tbody>

    </table>

  </section>`;

}

function renderFaq(faq) {

  if (!faq || !faq.length) return '';

  return `

  <section class="faq">

    <h2>FAQ</h2>

    ${faq

      .map(

        (q) =>

          `<div class="faq-item"><h3>${escapeHtml(q.q)}</h3><p>${escapeHtml(

            q.a

          )}</p></div>`

      )

      .join('')}

  </section>`;

}

function renderInternalLinks(links) {

  if (!links || !links.length) return '';

  return `

  <nav class="internal-links">

    <h2>Related VIN checks</h2>

    <ul>

      ${links

        .map((l) => `<li><a href="${l.href}">${escapeHtml(l.label)}</a></li>`)

        .join('')}

    </ul>

  </nav>`;

}

function renderBody(layout, ctx) {

  const keyFacts = renderKeyFacts(ctx);

  const localInsights = renderLocalInsights(ctx);

  const comparison = renderComparisonBlock(ctx);

  const table = renderFeatureTable(ctx);

  const faqHtml = renderFaq(ctx.faq);

  const linksHtml = renderInternalLinks(ctx.internalLinks);

  const aiBlock = ctx.aiSectionHtml || '';

  if (layout === 'B') {

    return `

    <main>

      <header>

        <h1>${escapeHtml(ctx.h1 || ctx.title)}</h1>

        <p class="intro">${escapeHtml(ctx.intro || '')}</p>

      </header>

      ${keyFacts}

      ${aiBlock}

      ${comparison}

      ${table}

      ${localInsights}

      ${faqHtml}

      ${linksHtml}

      <section class="cta">

        <a href="/checkout" class="btn-primary">Check this VIN now</a>

      </section>

    </main>`;

  }

  if (layout === 'C') {

    return `

    <main>

      <header>

        <h1>${escapeHtml(ctx.h1 || ctx.title)}</h1>

        <p class="intro">${escapeHtml(ctx.intro || '')}</p>

      </header>

      ${localInsights}

      ${keyFacts}

      ${table}

      ${aiBlock}

      ${faqHtml}

      ${comparison}

      ${linksHtml}

      <section class="cta">

        <a href="/checkout" class="btn-primary">Run full VIN report</a>

      </section>

    </main>`;

  }

  // Layout A — базовый

  return `

  <main>

    <header>

      <h1>${escapeHtml(ctx.h1 || ctx.title)}</h1>

      <p class="intro">${escapeHtml(ctx.intro || '')}</p>

    </header>

    ${keyFacts}

    ${localInsights}

    ${aiBlock}

    ${table}

    ${comparison}

    ${faqHtml}

    ${linksHtml}

    <section class="cta">

      <a href="/checkout" class="btn-primary">Check this VIN now</a>

    </section>

  </main>`;

}

function renderPage(templateName, ctx) {

  const lang = ctx.lang || 'en';

  const title = ctx.title || 'VIN report';

  const description = ctx.description || '';

  const url = ctx.url || '/';

  const canonicalUrl = ctx.canonicalUrl || url;

  const layout = ctx.layout || 'A';

  const schema = renderSchema({ url, title, description, faq: ctx.faq || [] });

  const body = renderBody(layout, ctx);

  return `<!doctype html>

<html lang="${lang}">

<head>

  <meta charset="utf-8" />

  <title>${escapeHtml(title)}</title>

  <meta name="description" content="${escapeHtml(description)}" />

  <meta name="viewport" content="width=device-width,initial-scale=1" />

  <link rel="canonical" href="https://vintrusted.com${canonicalUrl}" />

  <meta property="og:title" content="${escapeHtml(title)}" />

  <meta property="og:description" content="${escapeHtml(description)}" />

  <meta property="og:url" content="https://vintrusted.com${url}" />

  <meta property="og:type" content="article" />

  <meta name="twitter:card" content="summary" />

  <meta name="twitter:title" content="${escapeHtml(title)}" />

  <meta name="twitter:description" content="${escapeHtml(description)}" />

  ${schema}

</head>

<body>

  ${body}

</body>

</html>`;

}

module.exports = { renderPage };

