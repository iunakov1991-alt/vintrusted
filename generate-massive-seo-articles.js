const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { renderSeoPage } = require("./scripts/seo-template");
const {
  getAllStateMakeYearSeedsWithLangs,
  buildVinPageData,
  INTENTS,
  STATES
} = require("./scripts/seo-content-engine");
const { TOPIC_CLUSTERS, buildTopicPageData } = require("./scripts/seo-topics-engine");
const { getEnTemplateVariants } = require("./scripts/seo-templates-en");
const { getEsTemplateVariants } = require("./scripts/seo-templates-es");

const ROOT = __dirname;
const STATIC_ROOT = path.join(ROOT, "public", "static-pages");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function hashToInt(str, mod) {
  const hash = crypto.createHash("sha256").update(String(str || "")).digest("hex");
  const asInt = parseInt(hash.slice(0, 8), 16);
  return mod > 0 ? asInt % mod : 0;
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function pickTemplate(lang, slug) {
  const variants = lang === "es" ? getEsTemplateVariants() : getEnTemplateVariants();
  const idx = hashToInt(slug, variants.length);
  return variants[idx];
}

function applyMicroVariantCopy(pageData, micro) {
  const additions = {
    "data-first": `<p>This layout surfaces the clean data points first so analysts can scan VIN information before diving into commentary.</p>`,
    "explain-first": `<p>This explanation-first view helps new buyers understand why each data point impacts the ${pageData.h1} decision.</p>`,
    "risk-focused": `<p class="risk">High-risk signals such as salvage branding, auction relists and odometer jumps are highlighted with warning badges.</p>`,
    "value-focused": `<p class="value">Market value deltas compare advertised pricing against recent auction averages for comparable trims.</p>`,
    "dmv-focused": `<p class="dmv">Links to DMV resources in ${pageData.h1} context show how to double-check title paperwork before submitting transfers.</p>`,
    "auction-focused": `<p class="auction">If this VIN shows Copart or IAAI activity, review the sale date and condition report snippet embedded below.</p>`,
    "scam-warning": `<p class="warning">Scam watch: verify payment requests and never wire funds without verifying the seller's identity and paperwork.</p>`,
    "maintenance-cost": `<p class="maintenance">Maintenance cost estimates consider average shop rates in the state plus common failure items for this drivetrain.</p>`,
    "insurance-cost": `<p class="insurance">Insurance impact: branded titles often increase premiums or disqualify comprehensive coverage.</p>`,
    "ownership-guide": `<p class="guide">Ownership guide steps outline what to inspect at delivery, how to document photos and where to store the VIN report.</p>`,
    "vin-reporte": `<p class="es-note">Este layout resalta los datos duros primero para compradores que necesitan validar odómetro y alertas legales.</p>`,
    "historial-vehiculo": `<p class="es-note">El historial se explica en lenguaje sencillo, ideal para familias que importan o compran en subastas de ${pageData.h1}.</p>`,
    "checar-vin": `<p class="es-note">El CTA siempre está arriba para que puedas ingresar el VIN y comparar inmediatamente contra el anuncio.</p>`,
    "subasta-riesgos": `<p class="es-note">Si el carro pasó por subastas Copart/IAAI, verás fechas y estados para entender por qué fue vendido allí.</p>`,
    "titulo-salvage": `<p class="es-note">Alertas especiales muestran diferencias entre salvage, rebuilt y junk, así sabes si vale la pena arreglarlo.</p>`,
    "dmv-procesos": `<p class="es-note">Incluimos enlaces rápidos a procesos DMV locales para transferir título y revisar tarifas pendientes.</p>`,
    "fraude-odometro": `<p class="es-note">Aprende a comparar lecturas del VIN con el desgaste real del interior para detectar odómetro alterado.</p>`,
    "lavado-titulo": `<p class="es-note">El lavado de título (title washing) se detecta cuando un carro brinca entre estados con diferentes reglas.</p>`,
    "costo-mantenimiento": `<p class="es-note">Calculamos costos de mantenimiento promedio en ${pageData.h1} para saber cuánto gastarás después de comprar.</p>`,
    "guia-compra-usado": `<p class="es-note">Guía paso a paso: revisar VIN, inspección mecánica, papeleo DMV y cómo negociar basado en el historial.</p>`
  };

  if (!pageData.detailsHtml) pageData.detailsHtml = "";
  if (additions[micro]) {
    pageData.detailsHtml += additions[micro];
  }
}

function slugFromUrl(url) {
  return url.replace(/^https?:\/\/[^/]+/, "").replace(/\/+/g, "/");
}

function main() {
  const targetPages = parseInt(process.env.SEO_TARGET_PAGES || "500000", 10);
  const maxPerBuild = parseInt(process.env.SEO_MAX_PAGES_PER_BUILD || targetPages, 10);
  const HARD_LIMIT = Math.min(targetPages, maxPerBuild);

  console.log(`[MASSIVE] target=${targetPages}, maxPerBuild=${maxPerBuild}, hardLimit=${HARD_LIMIT}`);

  const seeds = getAllStateMakeYearSeedsWithLangs();
  const jobs = [];

  for (const seed of seeds) {
    for (const intent of INTENTS) {
      jobs.push({ kind: "vin", seed, intent });
    }
  }

  for (const cluster of TOPIC_CLUSTERS) {
    for (const lang of ["en","es"]) {
      if (cluster.id === "dmv-process") {
        for (const state of STATES) {
          jobs.push({ kind: "topic", clusterId: cluster.id, lang, state });
        }
      } else {
        jobs.push({ kind: "topic", clusterId: cluster.id, lang });
      }
    }
  }

  shuffle(jobs);
  const selected = jobs.slice(0, HARD_LIMIT);
  console.log(`[MASSIVE] totalJobs=${jobs.length}, selected=${selected.length}`);

  let created = 0;
  for (const job of selected) {
    let pageData;
    if (job.kind === "vin") {
      const slugKey = `${job.seed.state.code}-${job.seed.make}-${job.seed.model}-${job.intent}-${job.seed.lang}`;
      const template = pickTemplate(job.seed.lang, slugKey);
      pageData = buildVinPageData(job.seed, job.intent, template.layout);
      applyMicroVariantCopy(pageData, template.micro);
    } else {
      pageData = buildTopicPageData(job.clusterId, job.lang, job.state);
      if (!pageData) continue;
    }

    if (!pageData) continue;

    const slugPath = slugFromUrl(pageData.hreflang.self);
    const outFile = path.join(STATIC_ROOT, slugPath.replace(/^\/+/, ""), "index.html");
    ensureDir(path.dirname(outFile));
    const html = renderSeoPage(pageData);
    fs.writeFileSync(outFile, html, "utf8");
    created++;
    if (created % 10000 === 0) {
      console.log(`[MASSIVE] ${created} pages written`);
    }
  }

  console.log(`[MASSIVE] Created pages: ${created}`);
}

if (require.main === module) {
  main();
}

module.exports = { main };
