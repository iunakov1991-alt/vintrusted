// Генератор Knowledge Graph страниц:
// - DMV / fraud / auctions / maintenance / buying guides
// - 50 штатов × все марки × модели
// - EN + ES версии
// - листинги с пагинацией
// - граф перелинковки (cluster + VIN-интенты)

const fs = require("fs");
const path = require("path");
const { buildKnowledgeGraphSeeds, buildLinkGraph } = require("./seo-kg-engine");
const { renderSeoKgPage } = require("./seo-kg-template");

const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const STATIC_PAGES_ROOT = path.join(PUBLIC_DIR, "static-pages");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function buildInternalLinksFromGraph(node, linkGraph) {
  const entry = linkGraph.get(node.id);
  if (!entry) return [];

  const internalLinks = [];

  // clusterLinks → обычные "related" ссылки
  for (const c of entry.clusterLinks || []) {
    const targetNode = Array.from(linkGraph.keys())
      .map((id) => {
        const parts = id.split("::");
        return { id, parts };
      })
      .find((n) => n.id === c.targetId);
    
    if (targetNode) {
      // Находим seed по id
      const allSeeds = buildKnowledgeGraphSeeds();
      const target = allSeeds.find((s) => s.id === c.targetId);
      if (target) {
        internalLinks.push({
          href: target.urlPath,
          label: target.cluster[target.lang].label + " " + target.make + (target.model ? " " + target.model : "") + " in " + target.stateName
        });
      }
    }
  }

  // vinIntentLinks → ссылки на VIN-интенты
  for (const v of entry.vinIntentLinks || []) {
    internalLinks.push({
      href: v.href,
      label: v.label
    });
  }

  return internalLinks;
}

function getTodayISO() {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

function buildPageDataForNode(node, linkGraph) {
  const { lang, cluster, stateName, stateCode, make, model, urlPath, hreflangs, page, totalPages } =
    node;

  const clusterText = cluster[lang];
  const title =
    lang === "es"
      ? `${clusterText.label} – ${make}${model ? " " + model : ""} en ${stateName}`
      : `${clusterText.label} – ${make}${model ? " " + model : ""} in ${stateName}`;

  const metaDescription =
    lang === "es"
      ? `Guía detallada sobre ${clusterText.label.toLowerCase()} para autos usados ${make}${
          model ? " " + model : ""
        } en ${stateName}. Cómo evitar fraudes, entender el historial y usar el reporte VIN.`
      : `Detailed guide on ${clusterText.label.toLowerCase()} for used ${make}${
          model ? " " + model : ""
        } in ${stateName}. Risks, red flags and how to use a VIN report before you buy.`;

  const summary = clusterText.summaryPattern
    .replace("{stateName}", stateName)
    .replace("{make}", make);

  const lastUpdatedISO = getTodayISO();

  // Таблица: 5+ строк, 2–3 колонки
  const table = {
    title:
      lang === "es"
        ? "Resumen de riesgo y datos clave"
        : "Risk summary and key data",
    headers:
      lang === "es"
        ? ["Aspecto", "Detalle"]
        : ["Aspect", "Detail"],
    rows: [
      [
        lang === "es" ? "Estado" : "State",
        `${stateName} (${stateCode})`
      ],
      [
        lang === "es" ? "Marca" : "Make",
        make + (model ? ` – ${model}` : "")
      ],
      [
        lang === "es" ? "Tipo de tema" : "Topic type",
        clusterText.label
      ],
      [
        lang === "es" ? "Riesgo principal" : "Main risk",
        cluster.intent === "fraud"
          ? lang === "es"
            ? "Fraude de odómetro, lavado de título y daños ocultos."
            : "Odometer rollback, title washing and hidden damage."
          : cluster.intent === "auctions"
          ? lang === "es"
            ? "Historial desconocido, daños severos y costos extras de subasta."
            : "Unknown history, severe damage and extra auction fees."
          : cluster.intent === "dmv"
          ? lang === "es"
            ? "Confusión con marcas de título, salvage y rebuilt."
            : "Confusion around title brands, salvage and rebuilt rules."
          : lang === "es"
          ? "Costos acumulados de mantenimiento y seguro."
          : "Accumulated maintenance and insurance costs."
      ],
      [
        lang === "es" ? "Acción recomendada" : "Recommended action",
        lang === "es"
          ? "Checar el VIN antes de pagar, revisar el historial completo del vehículo."
          : "Run a VIN check before paying and review the full vehicle history."
      ]
    ]
  };

  const sections = [];

  // Блок 1: основы риска/темы
  sections.push({
    heading:
      lang === "es"
        ? `Por qué este tema importa al comprar un usado en ${stateName}`
        : `Why this topic matters when buying used in ${stateName}`,
    html:
      lang === "es"
        ? `
  <p>
    En ${stateName}, muchos autos usados pasan por subastas, compañías de seguro y varios dueños.
    Sin un reporte VIN, es casi imposible ver todo el historial real del vehículo.
  </p>
  <p>
    Esta guía está enfocada en ${clusterText.label.toLowerCase()} para ayudarte a entender el riesgo
    antes de firmar cualquier contrato o entregar dinero.
  </p>
`
        : `
  <p>
    In ${stateName}, many used vehicles pass through auctions, insurance companies and multiple owners.
    Without a VIN report it is almost impossible to see the full real history of the car.
  </p>
  <p>
    This guide focuses on ${clusterText.label.toLowerCase()} to help you understand the risk
    before you sign anything or send money.
  </p>
`
  });

  // Блок 2: конкретные red flags
  sections.push({
    heading:
      lang === "es"
        ? "Señales de alerta que debes buscar"
        : "Red flags you should look for",
    html:
      lang === "es"
        ? `
  <ul>
    <li>Historial incompleto o inconsistente del odómetro.</li>
    <li>Título con marcas salvage, rebuilt, junk o flood.</li>
    <li>Fotos del anuncio que no coinciden con la condición actual del auto.</li>
    <li>Vendedor evita mostrar el VIN completo o el título original.</li>
  </ul>
`
        : `
  <ul>
    <li>Incomplete or inconsistent odometer history.</li>
    <li>Title branded as salvage, rebuilt, junk or flood.</li>
    <li>Listing photos that don't match the current condition of the car.</li>
    <li>Seller avoids showing full VIN or the original title.</li>
  </ul>
`
  });

  // Блок 3: связь с VIN-отчётом
  sections.push({
    heading:
      lang === "es"
        ? "Cómo usar un reporte VIN de forma inteligente"
        : "How to use a VIN report smartly",
    html:
      lang === "es"
        ? `
  <p>
    El reporte VIN no es un papel mágico, pero combina datos de aseguradoras, DMV y subastas
    para revelar patrones de riesgo: accidentes, marcas de título, lecturas de odómetro y recalls abiertos.
  </p>
  <p>
    En ${stateName}, para un ${make}${model ? " " + model : ""}, el reporte te ayuda a comparar el precio
    con el riesgo real y decidir si el auto vale la pena.
  </p>
`
        : `
  <p>
    A VIN report is not a magic paper, but it combines data from insurers, DMVs and auctions
    to reveal risk patterns: accidents, title branding, odometer readings and open recalls.
  </p>
  <p>
    In ${stateName}, for a ${make}${model ? " " + model : ""}, it helps you line up the asking price
    against the real risk and decide if the car is worth it or not.
  </p>
`
  });

  const trustText =
    lang === "es"
      ? "Vintrusted se enfoca en reportes claros, con bloques separados para título, accidentes, odómetro y valor de mercado, para que puedas decidir en minutos."
      : "Vintrusted focuses on clear reports with separate blocks for title, accidents, odometer and market value so you can decide in minutes.";

  const faq =
    lang === "es"
      ? [
          {
            q: "¿Qué hago si el reporte muestra varias marcas de título?",
            a: "Asume que el auto tiene un riesgo alto. Compara el precio con otros vehículos similares y considera evitarlo si no tienes experiencia con salvage o rebuilt."
          },
          {
            q: "¿Puedo usar un reporte VIN de Vintrusted para negociar el precio?",
            a: "Sí, muchos compradores muestran el historial al vendedor para justificar un precio más bajo cuando hay accidentes, daños o lecturas dudosas."
          },
          {
            q: "¿Qué pasa si el reporte no tiene información de accidentes?",
            a: "Eso no garantiza que el auto nunca haya tenido daños, pero reduce el riesgo. Siempre revisa el auto físicamente o con un mecánico."
          }
        ]
      : [
          {
            q: "What if the report shows multiple title brands?",
            a: "Treat the car as high risk. Compare the price to similar vehicles and consider walking away unless you have experience with salvage or rebuilt cars."
          },
          {
            q: "Can I use a Vintrusted report to negotiate price?",
            a: "Yes. Many buyers show the history to the seller to justify a lower price when there are accidents, damage or suspicious mileage."
          },
          {
            q: "What if the report has no accident records?",
            a: "It does not guarantee the car never had damage, but it reduces the risk. Always combine the report with a physical inspection."
          }
        ];

  const entry = linkGraph.get(node.id);
  if (entry) {
    // Чтобы при рендере internalLinks мы могли подтянуть label/url
    entry.node = {
      urlPath,
      internalLabel:
        lang === "es"
          ? `${clusterText.label} ${make}${model ? " " + model : ""} en ${stateName}`
          : `${clusterText.label} ${make}${model ? " " + model : ""} in ${stateName}`
    };
  }

  const internalLinks = buildInternalLinksFromGraph(node, linkGraph);

  const cta =
    lang === "es"
      ? {
          heading: "Checa el VIN antes de comprar",
          text: "Usa un reporte VIN para ver accidentes, marcas de título, lecturas de odómetro y recalls abiertos antes de pagar por el vehículo."
        }
      : {
          heading: "Check the VIN before you pay",
          text: "Use a VIN report to see accidents, title brands, mileage history and open recalls before you send money for the car."
        };

  return {
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
    pagination: (linkGraph.get(node.id) || {}).pagination || [],
    hreflangs
  };
}

function main() {
  console.log("[SEO-KG] Building knowledge graph seeds...");
  const seeds = buildKnowledgeGraphSeeds();
  console.log(`[SEO-KG] Seeds total: ${seeds.length}`);

  console.log("[SEO-KG] Building link graph...");
  const linkGraph = buildLinkGraph(seeds);

  let count = 0;
  const targetPages = parseInt(process.env.SEO_TARGET_PAGES || "1000000", 10);
  const maxPerBuild = parseInt(process.env.SEO_MAX_PAGES_PER_BUILD || targetPages, 10);
  const HARD_LIMIT = Math.min(targetPages, maxPerBuild);

  for (const node of seeds) {
    if (count >= HARD_LIMIT) break;
    
    const pageData = buildPageDataForNode(node, linkGraph);
    const html = renderSeoKgPage(pageData);

    const urlPathClean = node.urlPath.replace(/^\//, "").replace(/\/+$/, "");
    const outDir = path.join(STATIC_PAGES_ROOT, urlPathClean);
    ensureDir(outDir);
    const outPath = path.join(outDir, "index.html");

    fs.writeFileSync(outPath, html, "utf8");
    count++;
    
    if (count % 1000 === 0) {
      console.log(`[SEO-KG] Generated: ${count} pages`);
    }
  }

  console.log(`[SEO-KG] Generated pages: ${count}`);
}

if (require.main === module) {
  main();
}

module.exports = { main };

