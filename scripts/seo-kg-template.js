// SEO Knowledge Graph template
// Чистый, компактный HTML без тяжёлого JS, соблюдение:
// - логотип вверху (#site-logo)
// - один H1
// - summary до 180 символов
// - таблица 5+ строк
// - FAQ 2–4 вопроса
// - внутренние ссылки 2–5
// - пагинация prev/next
// - hreflang EN/ES + x-default

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderHreflangLinks(hreflangs) {
  if (!hreflangs || !hreflangs.length) return "";
  return hreflangs
    .map(
      (alt) =>
        `<link rel="alternate" href="${escapeHtml(
          alt.href
        )}" hreflang="${escapeHtml(alt.hrefLang)}" />`
    )
    .join("\n");
}

function renderPagination(pagination, baseUrl) {
  if (!pagination || !pagination.length) return "";
  const prev = pagination.find((l) => l.rel === "prev");
  const next = pagination.find((l) => l.rel === "next");

  let linksHtml = "";
  if (prev) {
    const prevPage = prev.targetId.split("::").pop();
    const prevPageNum = prevPage.startsWith("p") ? parseInt(prevPage.substring(1)) : 1;
    const prevUrl = prevPageNum === 1 
      ? baseUrl.replace(/\/page\/\d+$/, "")
      : baseUrl.replace(/\/page\/\d+$/, "") + `/page/${prevPageNum}`;
    linksHtml += `<a class="kg-pagination-link kg-pagination-prev" href="${escapeHtml(prevUrl)}">${prevPageNum === 1 ? "First" : "Previous"}</a>`;
  }
  if (next) {
    const nextPage = next.targetId.split("::").pop();
    const nextPageNum = nextPage.startsWith("p") ? parseInt(nextPage.substring(1)) : 1;
    const nextUrl = baseUrl.replace(/\/page\/\d+$/, "") + `/page/${nextPageNum}`;
    linksHtml += `<a class="kg-pagination-link kg-pagination-next" href="${escapeHtml(nextUrl)}">Next</a>`;
  }
  if (!linksHtml) return "";

  return `
<nav class="kg-pagination" aria-label="Pagination">
  ${linksHtml}
</nav>`;
}

function renderInternalLinks(internalLinks, lang) {
  if (!internalLinks || !internalLinks.length) return "";
  const limited = internalLinks.slice(0, 5);
  const heading = lang === "es" ? "Recursos relacionados" : "Related resources";
  const items = limited
    .map(
      (l) =>
        `<li><a href="${escapeHtml(l.href)}">${escapeHtml(
          l.label || l.href
        )}</a></li>`
    )
    .join("\n");

  return `
<section class="kg-internal-links">
  <h2>${heading}</h2>
  <ul>
    ${items}
  </ul>
</section>`;
}

function renderFaq(faq, lang) {
  if (!faq || !faq.length) return "";
  const limited = faq.slice(0, 4);
  const qa = limited
    .map(
      (item) => `
  <div class="kg-faq-item">
    <h3>${escapeHtml(item.q || item.question)}</h3>
    <p>${escapeHtml(item.a || item.answer)}</p>
  </div>`
    )
    .join("\n");

  const heading = lang === "es" ? "Preguntas frecuentes" : "Frequently asked questions";

  return `
<section class="kg-faq">
  <h2>${heading}</h2>
  ${qa}
</section>`;
}

function renderTable(table) {
  if (!table || !table.rows || !table.rows.length) return "";
  const header =
    table.headers && table.headers.length
      ? `<thead><tr>${table.headers
          .map((h) => `<th>${escapeHtml(h)}</th>`)
          .join("")}</tr></thead>`
      : "";

  const body = `<tbody>${table.rows
    .map(
      (row) =>
        `<tr>${(Array.isArray(row) ? row : [row.label, row.value]).map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`
    )
    .join("")}</tbody>`;

  return `
<section class="kg-table">
  <h2>${escapeHtml(table.title || "Key data")}</h2>
  <table>
    ${header}
    ${body}
  </table>
</section>`;
}

function renderContentSections(sections) {
  if (!sections || !sections.length) return "";
  return sections
    .map(
      (s) => `
<section class="kg-section">
  <h2>${escapeHtml(s.heading)}</h2>
  ${s.html || ""}
</section>`
    )
    .join("\n");
}

function renderTrustBlock(trust, lang) {
  if (!trust) return "";
  const heading =
    lang === "es"
      ? "Por qué confiar en Vintrusted"
      : "Why trust Vintrusted";
  return `
<section class="kg-trust">
  <h2>${heading}</h2>
  <p>${escapeHtml(trust)}</p>
</section>`;
}

function renderCtaBlock(cta, lang, urlPath) {
  if (!cta) return "";
  const label =
    lang === "es"
      ? "Checar VIN ahora"
      : "Check VIN now";
  const placeholder =
    lang === "es"
      ? "Ingresa el VIN de tu vehículo"
      : "Enter your vehicle VIN";

  return `
<section class="kg-cta">
  <h2>${escapeHtml(cta.heading || label)}</h2>
  <p>${escapeHtml(cta.text || "")}</p>
  <form class="kg-cta-form" method="GET" action="/vin">
    <input
      type="text"
      name="vin"
      maxlength="17"
      required
      placeholder="${escapeHtml(placeholder)}"
      aria-label="${escapeHtml(placeholder)}"
    />
    <button type="submit">${escapeHtml(label)}</button>
    <input type="hidden" name="src" value="${escapeHtml(
      urlPath
    )}" data-lang="${escapeHtml(lang)}" />
  </form>
</section>`;
}

function renderSeoKgPage(pageData) {
  const {
    lang,
    title,
    metaDescription,
    urlPath,
    summary,
    lastUpdatedISO,
    table,
    sections,
    faq,
    trustText,
    cta,
    internalLinks,
    pagination,
    hreflangs
  } = pageData;

  const baseUrl = (process.env.SEO_BASE_URL || "https://vintrusted.com").replace(/\/+$/, "");
  const canonicalUrl = baseUrl + urlPath;

  const html = `<!doctype html>
<html lang="${lang === "es" ? "es" : "en"}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(metaDescription)}" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="/seo.css" />
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
  ${renderHreflangLinks(hreflangs)}
</head>
<body>
  <header class="kg-header">
    <a href="/" class="kg-logo-link" aria-label="Vintrusted home">
      <img id="site-logo" src="/logo.svg" alt="Vintrusted" height="32" />
    </a>
  </header>

  <main class="kg-main">
    <article class="kg-article">
      <h1>${escapeHtml(title)}</h1>
      <p class="kg-summary">${escapeHtml(summary)}</p>
      <p class="kg-updated">
        <small>Last updated: ${escapeHtml(lastUpdatedISO)}</small>
      </p>

      ${renderTable(table)}
      ${renderContentSections(sections)}
      ${renderTrustBlock(trustText, lang)}
      ${renderFaq(faq, lang)}
      ${renderInternalLinks(internalLinks, lang)}
      ${renderCtaBlock(cta, lang, urlPath)}
      ${renderPagination(pagination, urlPath)}
    </article>
  </main>

  <footer class="kg-footer">
    <p><small>Vehicle history, auction and DMV data guidance only. Not a government document.</small></p>
  </footer>
</body>
</html>`;

  return html;
}

module.exports = {
  renderSeoKgPage
};

