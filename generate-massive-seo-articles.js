const fs = require("fs");
const fsp = fs.promises;
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
const { chooseLang } = require("./scripts/seo-lang-policy");
const { withCache } = require("./scripts/seo-cache");

const ROOT = __dirname;
const STATIC_ROOT = path.join(ROOT, "public", "static-pages");

const BATCH_SIZE = parseInt(process.env.SEO_WRITE_BATCH_SIZE || "400", 10);
const MAX_CONCURRENCY = parseInt(process.env.SEO_WRITE_CONCURRENCY || "8", 10);

async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
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

/**
 * Простая очередь с ограничением параллелизма.
 */
async function runWithConcurrency(tasks, max) {
  const results = [];
  let index = 0;
  let active = 0;

  return new Promise((resolve, reject) => {
    function next() {
      if (index === tasks.length && active === 0) {
        return resolve(results);
      }

      while (active < max && index < tasks.length) {
        const i = index++;
        const fn = tasks[i];
        active++;
        Promise.resolve()
          .then(fn)
          .then((res) => {
            results[i] = res;
            active--;
            next();
          })
          .catch((err) => {
            active--;
            console.error("[MASSIVE] Task error:", err.message);
            next();
          });
      }
    }
    next();
  });
}

/**
 * Псевдо-тяжёлая функция — может использоваться для подмешивания
 * маркета/статистики; кэшируется на уровне (state, make, year, lang, intent).
 */
async function getEnrichedData(state, make, year, lang, intent) {
  const key = `stats:${state.code}:${make}:${year}:${lang}:${intent}`;
  return withCache(key, async () => {
    return {
      marketSample: "median_price_bucket_approx",
      riskSample: "risk_profile_bucket_approx",
      updatedAt: new Date().toISOString(),
    };
  });
}

/**
 * Подсчёт слов и FAQ для метрик/контроля качества.
 */
function countWords(html) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return 0;
  return text.split(" ").length;
}

function countFaq(html) {
  const matches = html.match(/data-faq-item=/g);
  return matches ? matches.length : 0;
}

async function main() {
  const targetPages = parseInt(process.env.SEO_TARGET_PAGES || "500000", 10);
  const maxPerBuild = parseInt(process.env.SEO_MAX_PAGES_PER_BUILD || targetPages, 10);
  const HARD_LIMIT = Math.min(targetPages, maxPerBuild);

  console.log(`[MASSIVE] target=${targetPages}, maxPerBuild=${maxPerBuild}, hardLimit=${HARD_LIMIT}`);
  console.log(`[MASSIVE] batchSize=${BATCH_SIZE}, concurrency=${MAX_CONCURRENCY}`);

  const seeds = getAllStateMakeYearSeedsWithLangs();
  const jobs = [];

  for (const seed of seeds) {
    // Используем RL lang-policy для выбора языка вместо фиксированного seed.lang
    const lang = chooseLang();
    const seedWithLang = { ...seed, lang };
    for (const intent of INTENTS) {
      jobs.push({ kind: "vin", seed: seedWithLang, intent });
    }
  }

  for (const cluster of TOPIC_CLUSTERS) {
    // Используем RL lang-policy для выбора языка
    const lang = chooseLang();
    if (cluster.id === "dmv-process") {
      for (const state of STATES) {
        jobs.push({ kind: "topic", clusterId: cluster.id, lang, state });
      }
    } else {
      jobs.push({ kind: "topic", clusterId: cluster.id, lang });
    }
  }

  shuffle(jobs);
  const selected = jobs.slice(0, HARD_LIMIT);
  console.log(`[MASSIVE] totalJobs=${jobs.length}, selected=${selected.length}`);

  const tasks = [];
  for (const job of selected) {
    const task = async () => {
      let pageData;
      if (job.kind === "vin") {
        // Кэшируем enriched data
        const enriched = await getEnrichedData(
          job.seed.state,
          job.seed.make,
          job.seed.year || 2020,
          job.seed.lang,
          job.intent
        );
        const slugKey = `${job.seed.state.code}-${job.seed.make}-${job.seed.model}-${job.intent}-${job.seed.lang}`;
        const template = pickTemplate(job.seed.lang, slugKey);
        pageData = buildVinPageData(job.seed, job.intent, template.layout);
        applyMicroVariantCopy(pageData, template.micro);
      } else {
        pageData = buildTopicPageData(job.clusterId, job.lang, job.state);
        if (!pageData) return null;
      }

      if (!pageData) return null;

      const slugPath = slugFromUrl(pageData.hreflang.self);
      const outFile = path.join(STATIC_ROOT, slugPath.replace(/^\/+/, ""), "index.html");
      await ensureDir(path.dirname(outFile));
      const html = renderSeoPage(pageData);
      await fsp.writeFile(outFile, html, "utf8");

      const words = countWords(html);
      const faqCount = countFaq(html);

      return {
        urlPath: slugPath,
        lang: job.kind === "vin" ? job.seed.lang : job.lang,
        intent: job.kind === "vin" ? job.intent : job.clusterId,
        words,
        faqCount,
      };
    };
    tasks.push(task);
  }

  // Батчинг + ограниченный параллелизм
  const totalTasks = tasks.length;
  let offset = 0;
  const metrics = [];

  while (offset < totalTasks) {
    const slice = tasks.slice(offset, offset + BATCH_SIZE);
    console.log(`[MASSIVE] Processing batch: ${offset}..${offset + slice.length - 1}`);
    const results = await runWithConcurrency(slice, MAX_CONCURRENCY);
    metrics.push(...results.filter(Boolean));
    offset += BATCH_SIZE;
  }

  // Сохраняем метрики качества
  const METRICS_FILE = path.join(ROOT, "data", "metrics", "massive-gen-quality.json");
  await fsp.mkdir(path.dirname(METRICS_FILE), { recursive: true });

  const summary = {
    totalPagesPlanned: selected.length,
    totalPagesWritten: metrics.length,
    avgWords: metrics.length
      ? metrics.reduce((s, m) => s + (m.words || 0), 0) / metrics.length
      : 0,
    avgFaqCount: metrics.length
      ? metrics.reduce((s, m) => s + (m.faqCount || 0), 0) / metrics.length
      : 0,
    langs: metrics.reduce((acc, m) => {
      acc[m.lang] = (acc[m.lang] || 0) + 1;
      return acc;
    }, {}),
    intents: metrics.reduce((acc, m) => {
      acc[m.intent] = (acc[m.intent] || 0) + 1;
      return acc;
    }, {}),
    generatedAt: new Date().toISOString(),
  };

  await fsp.writeFile(
    METRICS_FILE,
    JSON.stringify({ summary, detailSample: metrics.slice(0, 200) }, null, 2),
    "utf8"
  );

  console.log(`[MASSIVE] Created pages: ${metrics.length}`);
  console.log(`[MASSIVE] Metrics saved to: ${METRICS_FILE}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error("[MASSIVE] Fatal error:", err);
    process.exit(1);
  });
}

module.exports = { main };
