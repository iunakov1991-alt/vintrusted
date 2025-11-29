
const escapeHtml = (str = '') =>

  str.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');



function renderSchema({ url, title, description }) {

  const schema = {

    "@context": "https://schema.org",

    "@type": "WebPage",

    "url": url,

    "name": title,

    "description": description

  };

  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;

}



function renderPage(templateName, ctx) {

  const lang = ctx.lang || 'en';

  const title = ctx.title || 'VIN report';

  const description = ctx.description || '';

  const h1 = ctx.h1 || title;

  const bodyBlocks = ctx.bodyBlocks || [];

  const faq = ctx.faq || [];

  const internalLinks = ctx.internalLinks || [];



  const faqHtml = faq.length

    ? `<section class="faq"><h2>FAQ</h2>${faq

        .map(

          (q) =>

            `<div class="faq-item"><h3>${escapeHtml(

              q.q

            )}</h3><p>${escapeHtml(q.a)}</p></div>`

        )

        .join('')}</section>`

    : '';



  const linksHtml = internalLinks.length

    ? `<nav class="internal-links"><h2>Related pages</h2><ul>${internalLinks

        .map((l) => `<li><a href="${l.href}">${escapeHtml(l.label)}</a></li>`)

        .join('')}</ul></nav>`

    : '';



  const schema = renderSchema({ url: ctx.url, title, description });



  const body = `

  <main>

    <header>

      <h1>${escapeHtml(h1)}</h1>

      <p class="intro">${escapeHtml(ctx.intro || '')}</p>

    </header>

    ${bodyBlocks.join('\n')}

    ${faqHtml}

    ${linksHtml}

    <section class="cta">

      <a href="/checkout" class="btn-primary">Check this VIN now</a>

    </section>

  </main>

  `;



  return `<!doctype html>

<html lang="${lang}">

<head>

  <meta charset="utf-8" />

  <title>${escapeHtml(title)}</title>

  <meta name="description" content="${escapeHtml(description)}" />

  <meta name="viewport" content="width=device-width,initial-scale=1" />

  ${schema}

</head>

<body>

  ${body}

</body>

</html>`;

}



module.exports = { renderPage };

