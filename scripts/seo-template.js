const escapeHtml = (str) =>
  String(str || "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;");

function renderSection(sectionId, pageData) {
  const lang = pageData.lang || "en";
  const t = pageData.t || {};
  switch (sectionId) {
    case "summary":
      return `
<section class="seo-summary">
  <p class="summary-text">${t.summary}</p>
  <p class="summary-updated">${t.updatedLabel}: <time datetime="${pageData.updatedAtIso}">${pageData.updatedAtIso}</time></p>
</section>`;
    case "table":
      return `
<section class="seo-table-block">
  <h2>${t.tableTitle}</h2>
  <table class="seo-table">
    <tbody>
      ${pageData.tableRows
        .map(
          (row) => `
      <tr>
        <th>${escapeHtml(row.label)}</th>
        <td>${escapeHtml(row.value)}</td>
      </tr>`
        )
        .join("")}
    </tbody>
  </table>
</section>`;
    case "details":
      return `
<section class="seo-details">
  <h2>${t.detailsTitle}</h2>
  ${pageData.detailsHtml || ""}
</section>`;
    case "faq":
      return `
<section class="seo-faq">
  <h2>${t.faqTitle}</h2>
  <div class="faq-list">
    ${pageData.faq
      .slice(0, 16)
      .map(
        (item) => `
    <article class="faq-item">
      <h3>${escapeHtml(item.q)}</h3>
      <p>${escapeHtml(item.a)}</p>
    </article>`
      )
      .join("")}
  </div>
</section>`;
    case "trust":
      return `
<section class="seo-trust">
  <h2>${t.trustTitle}</h2>
  ${pageData.trustHtml || ""}
</section>`;
    case "links":
      return `
<section class="seo-links">
  <h2>${t.linksTitle}</h2>
  <ul>
    ${pageData.internalLinks
      .map(
        (l) => `
    <li><a href="${escapeHtml(l.href)}">${escapeHtml(l.label)}</a></li>`
      )
      .join("")}
  </ul>
</section>`;
    default:
      return "";
  }
}

function renderSeoPage(pageData) {
  const lang = pageData.lang || "en";
  const dir = "ltr";
  const { hreflang } = pageData;

  const head = `
<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(pageData.title)}</title>
  <meta name="description" content="${escapeHtml(pageData.metaDescription)}" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <link rel="stylesheet" href="/seo.css" />
  <link rel="canonical" href="${escapeHtml(hreflang.self)}" />
  <link rel="alternate" href="${escapeHtml(hreflang.self)}" hreflang="${lang}" />
  <link rel="alternate" href="${escapeHtml(hreflang.altLang)}" hreflang="${lang === "en" ? "es" : "en"}" />
  <link rel="alternate" href="${escapeHtml(hreflang.xDefault)}" hreflang="x-default" />
</head>`;

  const ctaLabel = lang === "en" ? "Get full VIN report" : "Obtener reporte completo del VIN";
  const vinPlaceholder = lang === "en" ? "Enter VIN (17 characters)" : "Ingresa el VIN (17 caracteres)";

  const main = `
<body>
  <header class="seo-header">
    <a href="/" class="logo-link">
      <img src="/logo.svg" alt="Vintrusted" id="site-logo" />
    </a>
  </header>

  <main class="seo-main">
    <section class="hero">
      <h1>${escapeHtml(pageData.h1)}</h1>
      <p class="hero-fact">${escapeHtml(pageData.mainFact)}</p>
      <form class="hero-cta" data-lang="${lang}">
        <label class="sr-only" for="vin-input">${vinPlaceholder}</label>
        <input id="vin-input" name="vin" maxlength="17" minlength="11" required placeholder="${vinPlaceholder}" />
        <button type="submit">${ctaLabel}</button>
      </form>
    </section>

    <article class="seo-article">
      ${pageData.templateLayout
        .map((sec) => renderSection(sec, pageData))
        .join("\n")}
    </article>
  </main>

  <footer class="seo-footer">
    <p>${escapeHtml(pageData.footerText || "")}</p>
  </footer>
</body>
</html>`;

  return head + main;
}

module.exports = { renderSeoPage };
