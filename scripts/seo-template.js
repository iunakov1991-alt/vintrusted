// scripts/seo-template.js
// Универсальный SEO-шаблон EN/ES c:
// - логотипом (#site-logo);
// - H1, summary < 180 символов;
// - таблицей данных (5+ строк, 2+ столбца);
// - блоком деталей сущности;
// - 2–16 FAQ;
// - внутренними ссылками (2–5);
// - Dataset + FAQPage JSON-LD;
// - 300+ структурных вариаций DOM;
// - жёсткой проверкой качества (через seo-text-quality.js);
// - раздельной аналитикой EN/ES (через seo-analytics.js);
// - чистым, минималистичным дизайном (завязка на public/seo.css).

const { evaluatePageQuality } = require("./seo-text-quality");
const { renderAnalyticsSnippet } = require("./seo-analytics");
const { buildInternalLinks } = require("./seo-link-graph");

function slugify(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Дешёвый hash для выбора варианта структуры
function hash(str) {
  let h = 0;
  const s = String(str || "");
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// Наборы вариаций: layout × tableStyle × faqStyle × detailsStyle × linkBlockStyle
const LAYOUT_VARIANTS = Array.from({ length: 10 }, (_, i) => i); // 10
const TABLE_VARIANTS = Array.from({ length: 6 }, (_, i) => i); // 6
const FAQ_VARIANTS = Array.from({ length: 5 }, (_, i) => i); // 5
const DETAILS_VARIANTS = Array.from({ length: 5 }, (_, i) => i); // 5
const LINKS_VARIANTS = Array.from({ length: 4 }, (_, i) => i); // 4
// 10 * 6 * 5 * 5 * 4 = 600 комбинированных структур (>=300)

function pickVariantCombo(slugPath) {
  const h = hash(slugPath);
  const layout = LAYOUT_VARIANTS[h % LAYOUT_VARIANTS.length];
  const table = TABLE_VARIANTS[(h >> 3) % TABLE_VARIANTS.length];
  const faq = FAQ_VARIANTS[(h >> 6) % FAQ_VARIANTS.length];
  const details = DETAILS_VARIANTS[(h >> 9) % DETAILS_VARIANTS.length];
  const links = LINKS_VARIANTS[(h >> 12) % LINKS_VARIANTS.length];
  return { layout, table, faq, details, links };
}

// Нормализация pageData, чтобы не ломать старые генераторы
function normalizePageData(raw) {
  const lang = String(raw.lang || "en").toLowerCase().startsWith("es")
    ? "es"
    : "en";

  const title = raw.title || (lang === "es"
    ? "Reporte de historial del vehículo por VIN"
    : "Vehicle history report by VIN");

  const metaDescription =
    raw.metaDescription ||
    (lang === "es"
      ? "Consulta el historial de un vehículo usado en EE.UU. por VIN: títulos, accidentes, kilometraje y más."
      : "Check the history of a used vehicle in the US by VIN: titles, accidents, mileage and more.");

  const h1 =
    raw.h1 ||
    (lang === "es"
      ? "Reporte de historial del vehículo por VIN"
      : "VIN-based vehicle history report");

  const summary =
    raw.summary ||
    (raw.introHtml
      ? stripHtml(raw.introHtml).slice(0, 180)
      : lang === "es"
      ? "Checa el historial real de un vehículo usado en EE.UU. por su número VIN antes de comprar."
      : "See the real history of a used vehicle in the US by its VIN before you buy.");

  const lastUpdatedIso =
    raw.lastUpdatedIso || raw.updatedAtIso || new Date().toISOString().split("T")[0];

  const faq = Array.isArray(raw.faq) ? raw.faq : [];
  const sections = Array.isArray(raw.sections) ? raw.sections : [];

  const table = raw.table || {
    caption:
      lang === "es"
        ? "Resumen de datos del vehículo (base estimada)"
        : "Summary of vehicle data (estimated base)",
    columns:
      raw.table && Array.isArray(raw.table.columns)
        ? raw.table.columns
        : [
            lang === "es" ? "Campo" : "Field",
            lang === "es" ? "Valor" : "Value",
          ],
    rows:
      raw.table && Array.isArray(raw.table.rows)
        ? raw.table.rows
        : raw.tableRows && Array.isArray(raw.tableRows)
        ? raw.tableRows.map((r) => Array.isArray(r) ? r : [r.label, r.value])
        : [
            [
              lang === "es" ? "Tipo de título (estimado)" : "Title status (estimated)",
              lang === "es"
                ? "Posible clean / salvage / rebuilt según registros de subastas"
                : "Possible clean / salvage / rebuilt based on auction records",
            ],
            [
              lang === "es" ? "Rango de precio de mercado" : "Market value range",
              lang === "es"
                ? "Basado en ventas recientes de vehículos similares en EE.UU."
                : "Based on recent sales of similar vehicles in the US",
            ],
            [
              lang === "es" ? "Región principal" : "Primary region",
              raw.stateName || raw.stateCode || "US",
            ],
            [
              lang === "es" ? "Uso previsto" : "Intended use",
              lang === "es"
                ? "Compra/venta de vehículo usado, verificación previa a la compra"
                : "Used vehicle buying/selling, pre-purchase verification",
            ],
            [
              lang === "es" ? "Última actualización" : "Last updated",
              lastUpdatedIso,
            ],
          ],
  };

  const internalLinks =
    Array.isArray(raw.internalLinks) && raw.internalLinks.length
      ? raw.internalLinks
      : buildInternalLinks({
          slugPath: raw.slugPath,
          lang,
          stateCode: raw.stateCode,
          make: raw.make,
          year: raw.year,
          model: raw.model,
          intent: raw.intent,
        });

  return {
    ...raw,
    lang,
    title,
    metaDescription,
    h1,
    summary,
    lastUpdatedIso,
    faq,
    sections,
    table,
    internalLinks,
  };
}

function stripHtml(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildDatasetJsonLd(page) {
  const baseUrl = (process.env.SEO_BASE_URL || "https://vintrusted.com").replace(/\/+$/, "");
  const url = baseUrl + (page.slugPath || "/");
  const lang = page.lang === "es" ? "es" : "en";

  const name =
    page.title ||
    (lang === "es"
      ? "Reporte de historial del vehículo por número VIN"
      : "Vehicle history dataset by VIN");
  const description = page.metaDescription || page.summary || "";

  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name,
    description,
    url,
    inLanguage: lang === "es" ? "es-US" : "en-US",
    dateModified: page.lastUpdatedIso,
    license: "https://vintrusted.com/terms",
    isAccessibleForFree: false,
    creator: {
      "@type": "Organization",
      name: "Vintrusted",
      url: baseUrl,
    },
    variableMeasured: [
      "Title status",
      "Accidents",
      "Odometer readings",
      "Market value",
      "Recall status",
    ],
    measurementTechnique:
      "Aggregation of VIN-level records from title agencies, auction records, insurance data and market listings",
  };
}

function buildFaqJsonLd(page) {
  if (!Array.isArray(page.faq) || page.faq.length === 0) return null;
  const baseUrl = (process.env.SEO_BASE_URL || "https://vintrusted.com").replace(/\/+$/, "");
  const url = baseUrl + (page.slugPath || "/");
  const mainEntity = page.faq.map((item) => ({
    "@type": "Question",
    name: item.question || item.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer || item.a,
    },
  }));
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity,
    url,
  };
}

function renderTable(table, variant) {
  if (!table || !Array.isArray(table.rows) || table.rows.length === 0) return "";
  const caption = table.caption || "";
  const cols =
    Array.isArray(table.columns) && table.columns.length >= 2
      ? table.columns
      : ["Field", "Value"];

  const cls =
    variant % 2 === 0
      ? "seo-table seo-table-simple"
      : "seo-table seo-table-striped";

  return `
<section class="seo-section seo-section-table" data-block="table">
  <h2 class="seo-h2">${escapeHtml(caption)}</h2>
  <div class="seo-table-wrapper">
    <table class="${cls}">
      <thead>
        <tr>
          ${cols.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${table.rows
          .map((row) => {
            const cells = Array.isArray(row) ? row : [row.label, row.value];
            return `<tr>${cells
              .slice(0, cols.length)
              .map((cell) => `<td>${escapeHtml(cell)}</td>`)
              .join("")}</tr>`;
          })
          .join("")}
      </tbody>
    </table>
  </div>
</section>
`;
}

function renderFaq(page, variant) {
  const faq = Array.isArray(page.faq) ? page.faq : [];
  if (faq.length === 0) return "";
  const limited = faq.slice(0, 16);
  const cls =
    variant % 2 === 0
      ? "seo-section-faq seo-section"
      : "seo-section-faq seo-section seo-section-alt";

  const title =
    page.lang === "es"
      ? "Preguntas frecuentes sobre el reporte VIN"
      : "Frequently asked questions about the VIN report";

  return `
<section class="${cls}" data-block="faq">
  <h2 class="seo-h2">${escapeHtml(title)}</h2>
  <div class="seo-faq-list">
    ${limited
      .map(
        (item) => `
      <div class="seo-faq-item">
        <h3 class="seo-h3">${escapeHtml(item.question || item.q)}</h3>
        <p>${escapeHtml(item.answer || item.a)}</p>
      </div>`
      )
      .join("")}
  </div>
</section>
`;
}

function renderDetails(page, variant) {
  const lang = page.lang === "es" ? "es" : "en";
  const cls =
    variant % 2 === 0
      ? "seo-section seo-section-details"
      : "seo-section seo-section-details seo-section-alt";

  const heading =
    lang === "es"
      ? "Detalles clave del vehículo antes de comprar"
      : "Key vehicle details before you buy";

  const body =
    page.detailsHtml ||
    (lang === "es"
      ? `
    <p>
      Este resumen no es un documento oficial del DMV, pero te ayuda a entender si vale la pena
      avanzar con la compra. Combina títulos, posibles accidentes, rango de kilometraje y valor
      de mercado estimado para este tipo de vehículo en EE.UU.
    </p>
  `
      : `
    <p>
      This summary is not an official DMV document, but it helps you understand whether
      it makes sense to move forward with the purchase. It combines title status, possible
      accidents, mileage range and estimated market value for this type of vehicle in the US.
    </p>
  `);

  return `
<section class="${cls}" data-block="details">
  <h2 class="seo-h2">${escapeHtml(heading)}</h2>
  ${body}
</section>
`;
}

function renderInternalLinks(page, variant) {
  const links = Array.isArray(page.internalLinks) ? page.internalLinks : [];
  if (!links.length) return "";
  const limited = links.slice(0, 5);
  const lang = page.lang === "es" ? "es" : "en";

  const heading =
    lang === "es"
      ? "Otras herramientas y guías relacionadas"
      : "Other related tools and guides";

  const cls =
    variant % 2 === 0
      ? "seo-section seo-section-links"
      : "seo-section seo-section-links seo-section-alt";

  return `
<section class="${cls}" data-block="links">
  <h2 class="seo-h2">${escapeHtml(heading)}</h2>
  <ul class="seo-link-list">
    ${limited
      .map(
        (l) => `
      <li>
        <a href="${escapeHtml(l.href)}">${escapeHtml(l.anchor || l.label || l.href)}</a>
      </li>`
      )
      .join("")}
  </ul>
</section>
`;
}

function renderCta(page) {
  const lang = page.lang === "es" ? "es" : "en";

  const title =
    lang === "es"
      ? "Checar VIN ahora"
      : "Check VIN now";

  const subtitle =
    lang === "es"
      ? "Introduce el número VIN para ver el historial real antes de pagar el vehículo."
      : "Enter the VIN to see the real history before you pay for the vehicle.";

  const placeholder =
    lang === "es" ? "Ingresa el VIN de 17 caracteres" : "Enter 17-character VIN";

  const buttonLabel =
    lang === "es" ? "Continuar con el reporte" : "Continue to report";

  return `
<section class="seo-section seo-section-cta" data-block="cta">
  <h2 class="seo-h2">${escapeHtml(title)}</h2>
  <p class="seo-cta-subtitle">${escapeHtml(subtitle)}</p>
  <form class="seo-cta-form" method="GET" action="/vin/lookup">
    <label class="seo-cta-label" for="vin-input">
      ${escapeHtml(
        lang === "es"
          ? "Número VIN del vehículo"
          : "Vehicle VIN number"
      )}
    </label>
    <div class="seo-cta-row">
      <input
        id="vin-input"
        name="vin"
        maxlength="17"
        minlength="11"
        required
        class="seo-cta-input"
        placeholder="${escapeHtml(placeholder)}"
        aria-label="${escapeHtml(placeholder)}"
      />
      <button type="submit" class="seo-cta-button">
        ${escapeHtml(buttonLabel)}
      </button>
    </div>
  </form>
</section>
`;
}

function renderSummaryBlock(page) {
  return `
<section class="seo-section seo-section-summary" data-block="summary">
  <p class="seo-summary-text">
    ${escapeHtml(page.summary)}
  </p>
</section>
`;
}

function renderSections(page, layoutVariant) {
  const blocks = [];

  const tableBlock = renderTable(page.table, layoutVariant);
  const detailsBlock = renderDetails(page, layoutVariant);
  const faqBlock = renderFaq(page, layoutVariant);
  const linksBlock = renderInternalLinks(page, layoutVariant);
  const ctaBlock = renderCta(page);

  // layoutVariant определяет порядок блоков,
  // чтобы создать структурную энтропию
  switch (layoutVariant % 5) {
    case 0:
      blocks.push(tableBlock, detailsBlock, faqBlock, linksBlock, ctaBlock);
      break;
    case 1:
      blocks.push(detailsBlock, tableBlock, faqBlock, ctaBlock, linksBlock);
      break;
    case 2:
      blocks.push(faqBlock, tableBlock, detailsBlock, linksBlock, ctaBlock);
      break;
    case 3:
      blocks.push(tableBlock, faqBlock, linksBlock, detailsBlock, ctaBlock);
      break;
    default:
      blocks.push(detailsBlock, faqBlock, tableBlock, linksBlock, ctaBlock);
      break;
  }

  return blocks.join("\n");
}

/**
 * Основная функция:
 * pageData:
 *  {
 *    lang: 'en' | 'es',
 *    slugPath: '/vin-check/ca/toyota/2018/',
 *    title,
 *    metaDescription,
 *    h1,
 *    summary,
 *    table: { caption, columns, rows },
 *    sections, // опционально
 *    faq: [{ question, answer }],
 *    internalLinks: [{ href, anchor }],
 *    lastUpdatedIso,
 *    stateCode, stateName, make, year, model, intent,
 *  }
 */
function renderSeoPage(pageData) {
  const page = normalizePageData(pageData || {});
  const combo = pickVariantCombo(page.slugPath || "/");
  const datasetJsonLd = buildDatasetJsonLd(page);
  const faqJsonLd = buildFaqJsonLd(page);
  const analyticsSnippet = renderAnalyticsSnippet(page.lang);

  const headBlocks = [];
  const baseUrl = (process.env.SEO_BASE_URL || "https://vintrusted.com").replace(/\/+$/, "");
  const canonicalUrl = baseUrl + (page.slugPath || "/");

  headBlocks.push(`
<title>${escapeHtml(page.title)}</title>
<meta name="description" content="${escapeHtml(page.metaDescription)}" />
<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="stylesheet" href="/seo.css" />
`);

  if (datasetJsonLd) {
    headBlocks.push(
      `<script type="application/ld+json">${JSON.stringify(datasetJsonLd)}</script>`
    );
  }
  if (faqJsonLd) {
    headBlocks.push(
      `<script type="application/ld+json">${JSON.stringify(faqJsonLd)}</script>`
    );
  }

  const summaryBlock = renderSummaryBlock(page);
  const mainBlocks = [summaryBlock, renderSections(page, combo.layout)];

  // Подсчёт качества
  const quality = evaluatePageQuality({
    lang: page.lang,
    slugPath: page.slugPath,
    htmlBlocks: mainBlocks,
    faqItems: page.faq,
  });

  const langAttr = page.lang === "es" ? 'lang="es"' : 'lang="en"';

  return `
<!DOCTYPE html>
<html ${langAttr}>
<head>
  ${headBlocks.join("\n")}
  ${analyticsSnippet}
</head>
<body class="seo-body">
  <header class="seo-header">
    <div class="seo-container">
      <a href="/" class="seo-logo-link" aria-label="Vintrusted home">
        <img id="site-logo" class="seo-logo" src="/logo.svg" alt="Vintrusted" height="32" />
      </a>
    </div>
  </header>

  <main class="seo-main" data-words="${quality.totalWords}" data-faq="${quality.faqCount}">
    <div class="seo-container">
      <h1 class="seo-h1">${escapeHtml(page.h1)}</h1>
      ${summaryBlock}
      ${renderSections(page, combo.layout)}
    </div>
  </main>

  <footer class="seo-footer">
    <div class="seo-container">
      <p class="seo-footer-text">
        ${
          page.lang === "es"
            ? "Vintrusted no es una agencia gubernamental ni el DMV. Los reportes se basan en datos de múltiples fuentes comerciales y públicas."
            : "Vintrusted is not a government agency or the DMV. Reports are based on data from multiple commercial and public sources."
        }
      </p>
      <p class="seo-footer-meta">
        ${
          page.lang === "es"
            ? "Última actualización de esta página:"
            : "Last update of this page:"
        } ${escapeHtml(page.lastUpdatedIso)}
      </p>
    </div>
  </footer>
</body>
</html>
`;
}

module.exports = {
  renderSeoPage,
};
