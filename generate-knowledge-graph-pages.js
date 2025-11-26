// Генерация knowledge-graph страниц:
// - DMV directory
// - Fraud patterns
// - Auctions guide
// - Ownership cost overview
// - Resale value overview
// C пагинацией для длинных списков.

const fs = require("fs");
const path = require("path");
const {
  STATES,
  MAKES,
  YEARS,
  LANGS,
  slugify
} = require("./scripts/seo-content-engine");
const { isDuplicate, register, saveIndex } = require("./scripts/seo-dedupe");

// Путь вывода
const ROOT = __dirname;
const STATIC_ROOT = path.join(ROOT, "public", "static-pages");

// Пытаемся использовать общий шаблон, если он есть
let renderSeoPage = null;
try {
  // предполагаем scripts/seo-template.js с export renderSeoPage
  ({ renderSeoPage } = require("./scripts/seo-template"));
} catch {
  // fallback: простой HTML
  renderSeoPage = (pageData) => {
    const title = pageData.title || "Vintrusted";
    const meta = pageData.metaDescription || "";
    const h1 = pageData.h1 || title;
    const summary = pageData.summary || "";
    const tableRows = pageData.tableRows || [];
    const sections = pageData.sections || [];
    const faq = pageData.faq || [];

    const tableHtml =
      tableRows.length > 0
        ? `
      <table class="vt-table">
        <tbody>
          ${tableRows
            .map(
              (row) => `
            <tr>
              <th>${row.label}</th>
              <td>${row.value}</td>
            </tr>
          `
            )
            .join("\n")}
        </tbody>
      </table>
    `
        : "";

    const sectionsHtml = sections
      .map(
        (s) => `
      <section id="${s.id}">
        <h2>${s.heading}</h2>
        ${s.html}
      </section>
    `
      )
      .join("\n");

    const faqHtml =
      faq.length > 0
        ? `
      <section id="faq">
        <h2>FAQ</h2>
        <dl>
          ${faq
            .map(
              (f) => `
            <dt>${f.question}</dt>
            <dd>${f.answer}</dd>
          `
            )
            .join("\n")}
        </dl>
      </section>
    `
        : "";

    return `<!doctype html>
<html lang="${pageData.lang || "en"}">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <meta name="description" content="${meta}">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="/seo.css">
</head>
<body>
  <header class="vt-header">
    <div class="vt-logo" id="site-logo">Vintrusted</div>
  </header>
  <main class="vt-main">
    <h1>${h1}</h1>
    <p class="vt-summary">${summary}</p>
    ${tableHtml}
    ${sectionsHtml}
    ${faqHtml}
  </main>
  <footer class="vt-footer">
    <p>Vintrusted — low-cost VIN reports for the U.S. used car market.</p>
  </footer>
</body>
</html>`;
  };
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writePage(slugPath, html) {
  const clean = slugPath.replace(/^\/+/, "");
  const outDir = path.join(STATIC_ROOT, clean);
  ensureDir(outDir);
  fs.writeFileSync(path.join(outDir, "index.html"), html, "utf8");
}

// ===== DMV DIRECTORY =====

function generateDmvPages() {
  const pages = [];
  for (const lang of LANGS) {
    const langPrefix = lang === "es" ? "/es" : "";
    const isEs = lang === "es";

    // hub
    const hubSlug = `${langPrefix}/dmv`;
    const hubTitle = isEs
      ? "Directorio DMV por estado – tramites de título y registro"
      : "DMV directory by state – title and registration basics";
    const hubMeta = isEs
      ? "Encuentra los enlaces y puntos clave de cada DMV estatal en EE.UU. para trámites de título, registro y placas."
      : "Find key DMV entry points for every U.S. state: title transfer, registration and plates.";

    const tableRows = STATES.map((s) => ({
      label: s.name,
      value: isEs
        ? `Información básica de DMV para ${s.name}`
        : `Basic DMV info for ${s.name}`
    }));

    const sections = [
      {
        id: "how-it-helps",
        heading: isEs
          ? "Cómo usar el directorio DMV de Vintrusted"
          : "How to use the Vintrusted DMV directory",
        html: isEs
          ? `
            <p>
              Antes de comprar un auto usado en EE.UU., vale la pena revisar cómo funciona el DMV de tu estado:
              tiempos de trámite, tipos de título y reglas para autos salvage / rebuilt.
            </p>
          `
          : `
            <p>
              Before buying a used car, check how your state DMV handles title transfer, branded titles,
              salvage inspections and registration fees.
            </p>
          `
      }
    ];

    const faq = isEs
      ? [
          {
            question: "¿Puedo cambiar un título salvage a limpio?",
            answer:
              "En la mayoría de los estados no. Se puede cambiar a rebuilt o similar, pero el historial de salvage permanece en el vehículo."
          }
        ]
      : [
          {
            question: "Can I convert a salvage title back to clean?",
            answer:
              "In most states, no. You can rebuild and inspect the vehicle, but the salvage history remains attached to the VIN."
          }
        ];

    const hubPageData = {
      lang,
      slugPath: hubSlug,
      title: hubTitle,
      metaDescription: hubMeta,
      h1: hubTitle,
      summary: hubMeta,
      tableRows,
      sections,
      faq,
      entity: {
        type: "dmv-directory"
      }
    };

    if (!isDuplicate(hubPageData)) {
      register(hubPageData);
      pages.push(hubPageData);
    }

    // per-state pages
    for (const state of STATES) {
      const stSlug = `${langPrefix}/dmv/${state.code.toLowerCase()}`;
      const stTitle = isEs
        ? `DMV de ${state.name} – títulos, registros y salvage`
        : `${state.name} DMV – titles, registration and salvage rules`;
      const stMeta = isEs
        ? `Puntos clave para trámites de título, registro y vehículos salvage en el DMV de ${state.name}.`
        : `Key points for title transfer, registration and salvage / rebuilt vehicles at ${state.name} DMV.`;

      const stTable = [
        {
          label: isEs ? "Estado" : "State",
          value: state.name
        },
        {
          label: isEs ? "Enfoque" : "Focus",
          value: isEs
            ? "Títulos, salvage / rebuilt, tiempos de trámite"
            : "Titles, salvage / rebuilt, processing times"
        }
      ];

      const stSections = [
        {
          id: "titles",
          heading: isEs ? "Tipos de título comunes" : "Common title types",
          html: isEs
            ? `
              <ul>
                <li>Clean: sin marca de salvage</li>
                <li>Salvage: pérdida total con daño severo</li>
                <li>Rebuilt / reconstructed: reparado y reinspeccionado</li>
              </ul>
            `
            : `
              <ul>
                <li>Clean: no salvage branding</li>
                <li>Salvage: total loss with severe damage</li>
                <li>Rebuilt / reconstructed: repaired and inspected</li>
              </ul>
            `
        }
      ];

      const stFaq = isEs
        ? [
            {
              question: "¿Se puede registrar un auto salvage en la calle?",
              answer:
                "Depende del estado. En muchos casos se requiere inspección especial y el título queda marcado como rebuilt."
            }
          ]
        : [
            {
              question: "Can I register a salvage vehicle for street use?",
              answer:
                "It depends on the state. In many cases you need a special inspection and the title will be branded rebuilt or similar."
            }
          ];

      const stPageData = {
        lang,
        slugPath: stSlug,
        title: stTitle,
        metaDescription: stMeta,
        h1: stTitle,
        summary: stMeta,
        tableRows: stTable,
        sections: stSections,
        faq: stFaq,
        entity: {
          type: "dmv-state",
          stateCode: state.code,
          stateName: state.name
        }
      };

      if (!isDuplicate(stPageData)) {
        register(stPageData);
        pages.push(stPageData);
      }
    }
  }

  // запись файлов
  for (const page of pages) {
    const html = renderSeoPage(page);
    writePage(page.slugPath, html);
  }

  return pages.length;
}

// ===== FRAUD LIST + PAGINATION =====

const FRAUD_TOPICS = [
  "VIN cloning",
  "Title washing",
  "Odometer rollback",
  "Curbstoning",
  "Paper tag fraud",
  "Salvage laundering",
  "Non-repairable export scheme",
  "Airbag scam",
  "Flood car washing",
  "Temp registration loopholes",
  "Fake inspection stickers",
  "Shill bidding on auctions",
  "Broker title games"
];

function paginate(items, perPage) {
  const pages = [];
  for (let i = 0; i < items.length; i += perPage) {
    pages.push(items.slice(i, i + perPage));
  }
  return pages;
}

function generateFraudPages() {
  const pages = [];
  const perPage = 5;
  const chunks = paginate(FRAUD_TOPICS, perPage);

  for (const lang of LANGS) {
    const langPrefix = lang === "es" ? "/es" : "";
    const isEs = lang === "es";

    chunks.forEach((chunk, idx) => {
      const pageNum = idx + 1;
      const baseSlug = `${langPrefix}/fraud`;
      const slug =
        pageNum === 1 ? baseSlug : `${baseSlug}/page/${pageNum}`;

      const title = isEs
        ? (pageNum === 1
            ? "Fraudes comunes con autos usados – guía Vintrusted"
            : `Fraudes con autos usados – página ${pageNum}`)
        : (pageNum === 1
            ? "Common used car fraud patterns – Vintrusted guide"
            : `Used car fraud patterns – page ${pageNum}`);

      const meta = isEs
        ? "Aprende los patrones de fraude más comunes con autos usados, títulos y subastas para evitar perder dinero."
        : "Learn the most common fraud patterns in used cars, titles and auctions to avoid losing money.";

      const tableRows = chunk.map((topic) => ({
        label: topic,
        value: isEs
          ? "Patrón de fraude frecuente en compras de autos usados."
          : "Frequent fraud pattern in used car transactions."
      }));

      const navLinks = [];
      if (pageNum > 1) {
        navLinks.push({
          label: isEs ? "Página anterior" : "Previous page",
          href:
            pageNum === 2
              ? baseSlug
              : `${baseSlug}/page/${pageNum - 1}`
        });
      }
      if (pageNum < chunks.length) {
        navLinks.push({
          label: isEs ? "Siguiente página" : "Next page",
          href: `${baseSlug}/page/${pageNum + 1}`
        });
      }

      const linksHtml =
        navLinks.length > 0
          ? `
          <nav class="vt-pagination">
            <ul>
              ${navLinks
                .map((l) => `<li><a href="${l.href}">${l.label}</a></li>`)
                .join("\n")}
            </ul>
          </nav>
        `
          : "";

      const sections = [
        {
          id: "fraud-intro",
          heading: isEs
            ? "Por qué importa entender el fraude con VIN y títulos"
            : "Why VIN and title fraud matters",
          html: isEs
            ? `
              <p>
                Muchos autos con título limpio vienen de subastas salvage, inundaciones o pérdida total.
                Entender los patrones de fraude te ayuda a leer reportes de VIN con ojos de profesional.
              </p>
              ${linksHtml}
            `
            : `
              <p>
                Many clean-title cars started life as insurance total losses, floods or auction flips.
                Understanding fraud patterns helps you read VIN reports like a pro.
              </p>
              ${linksHtml}
            `
        }
      ];

      const faq = isEs
        ? [
            {
              question: "¿Un reporte de VIN siempre detecta el fraude?",
              answer:
                "No siempre, pero sí muestra muchas señales: cambios de estado, títulos inconsistentes, lecturas raras de odómetro, etc."
            }
          ]
        : [
            {
              question: "Does a VIN report always catch fraud?",
              answer:
                "Not always, but it shows many signals: state hopping, inconsistent titles, odd mileage jumps, auction histories, etc."
            }
          ];

      const pageData = {
        lang,
        slugPath: slug,
        title,
        metaDescription: meta,
        h1: title,
        summary: meta,
        tableRows,
        sections,
        faq,
        entity: {
          type: "fraud-list",
          page: pageNum
        }
      };

      if (!isDuplicate(pageData)) {
        register(pageData);
        pages.push(pageData);
      }
    });
  }

  for (const page of pages) {
    const html = renderSeoPage(page);
    writePage(page.slugPath, html);
  }

  return pages.length;
}

// ===== AUCTION GUIDE (без пагинации, как хабы) =====
const AUCTIONS = ["Copart", "IAAI", "Manheim", "ACV", "Backlot"];

function generateAuctionPages() {
  const pages = [];

  for (const lang of LANGS) {
    const langPrefix = lang === "es" ? "/es" : "";
    const isEs = lang === "es";

    const hubSlug = `${langPrefix}/auctions`;
    const hubTitle = isEs
      ? "Guía de subastas de autos en EE.UU."
      : "U.S. car auction buyer guide";

    const hubMeta = isEs
      ? "Entiende cómo funcionan Copart, IAAI, Manheim y otras subastas antes de pujar por un auto salvage o usado."
      : "Understand how Copart, IAAI, Manheim and other auctions work before bidding on salvage or used cars.";

    const tableRows = AUCTIONS.map((a) => ({
      label: a,
      value: isEs
        ? "Plataforma de subastas para autos usados y salvage."
        : "Auction platform for used and salvage vehicles."
    }));

    const sections = [
      {
        id: "overview",
        heading: isEs ? "Panorama general" : "Overview",
        html: isEs
          ? `
            <p>
              Cada casa de subastas tiene reglas distintas sobre fees, arbitraje, títulos y exportación.
              Saber leer el listado y el reporte de VIN es igual de importante que la inspección física.
            </p>
          `
          : `
            <p>
              Each auction has different rules on fees, arbitration, titles and export.
              Being able to read the listing and the VIN report is as critical as the physical inspection.
            </p>
          `
      }
    ];

    const hubPageData = {
      lang,
      slugPath: hubSlug,
      title: hubTitle,
      metaDescription: hubMeta,
      h1: hubTitle,
      summary: hubMeta,
      tableRows,
      sections,
      faq: [],
      entity: {
        type: "auction-hub"
      }
    };

    if (!isDuplicate(hubPageData)) {
      register(hubPageData);
      pages.push(hubPageData);
    }

    // per-auction pages
    for (const auc of AUCTIONS) {
      const aucSlug = `${langPrefix}/auctions/${slugify(auc)}`;
      const aucTitle = isEs
        ? `${auc} – guía rápida para compradores`
        : `${auc} – quick buyer guide`;
      const aucMeta = isEs
        ? `Puntos clave para comprar en ${auc}: fees, reglas básicas y cómo usar reportes de VIN.`
        : `Key points for buying at ${auc}: fees, basic rules and how to use VIN reports.`;

      const aucTable = [
        {
          label: "Platform",
          value: auc
        },
        {
          label: isEs ? "Tipo de inventario" : "Inventory type",
          value: isEs
            ? "Autos salvage, usados, flotas y más (según la plataforma)."
            : "Salvage, used, fleet and more (depending on the platform)."
        }
      ];

      const sectionsA = [
        {
          id: "fees",
          heading: isEs ? "Fees típicos" : "Typical fees",
          html: isEs
            ? "<p>Cada subasta cobra buyer fees, internet fees y storage. Revísalos antes de pujar.</p>"
            : "<p>Each auction charges buyer fees, internet fees and storage. Check them before bidding.</p>"
        }
      ];

      const aucPageData = {
        lang,
        slugPath: aucSlug,
        title: aucTitle,
        metaDescription: aucMeta,
        h1: aucTitle,
        summary: aucMeta,
        tableRows: aucTable,
        sections: sectionsA,
        faq: [],
        entity: {
          type: "auction",
          name: auc
        }
      };

      if (!isDuplicate(aucPageData)) {
        register(aucPageData);
        pages.push(aucPageData);
      }
    }
  }

  for (const page of pages) {
    const html = renderSeoPage(page);
    writePage(page.slugPath, html);
  }

  return pages.length;
}

// MAIN
function main() {
  const dmvCount = generateDmvPages();
  const fraudCount = generateFraudPages();
  const auctionCount = generateAuctionPages();
  saveIndex();
  console.log(
    `[KNOWLEDGE GRAPH] DMV pages: ${dmvCount}, fraud pages: ${fraudCount}, auction pages: ${auctionCount}`
  );
}

if (require.main === module) {
  main();
}

module.exports = { main };

