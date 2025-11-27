// scripts/seo-graph-engine.js
// Knowledge graph поверх static-pages: страница -> метаданные -> связи.

const fs = require("fs");
const path = require("path");
const {
  STATIC_PAGES_ROOT,
  BASE_URL,
  INTENTS,
  CLUSTERS,
  HISPANIC_HEAVY_STATES,
} = require("./seo-config");

function log(msg) {
  console.log(`[SEO GRAPH] ${new Date().toISOString()} - ${msg}`);
}

function collectHtmlFiles(rootDir) {
  const res = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && e.name.toLowerCase().endsWith(".html")) res.push(full);
    }
  }
  walk(rootDir);
  return res;
}

function htmlToUrl(htmlPath) {
  const rel = path.relative(STATIC_PAGES_ROOT, htmlPath).replace(/\\/g, "/");
  let urlPath = rel.replace(/index\.html$/i, "");
  if (!urlPath.startsWith("/")) urlPath = "/" + urlPath;
  return BASE_URL + urlPath;
}

// Очень грубый парсер метаданных.
// Мы предполагаем, что генераторы уже вшивают data-атрибуты в <html> или <body>,
// либо URL-структура достаточно предсказуема.
function extractMeta(html, url) {
  const meta = {
    lang: /lang=["']es/i.test(html) ? "es" : "en",
    state: null,
    make: null,
    model: null,
    year: null,
    intent: null,
    vin: null,
    templateVersion: null,
  };

  // Пытаемся достать JSON с метаданными, если он есть
  const metaJsonMatch = html.match(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i
  );
  if (metaJsonMatch) {
    try {
      const jsonParts = metaJsonMatch[1]
        .replace(/<!--[\s\S]*?-->/g, "")
        .trim();
      const data = JSON.parse(jsonParts);
      if (data && typeof data === "object") {
        if (data["@type"] === "Vehicle" || data["@type"] === "Product") {
          if (data.vehicleIdentificationNumber) meta.vin = data.vehicleIdentificationNumber;
          if (data.model) meta.model = data.model;
          if (data.brand && data.brand.name) meta.make = data.brand.name;
        }
        if (data.templateVersion) meta.templateVersion = data.templateVersion;
      }
    } catch {
      // игнорируем
    }
  }

  // Fallback по URL
  const urlPath = url.replace(BASE_URL, "");
  const parts = urlPath.split("/").filter(Boolean);

  // Примеры:
  // /state/ca/honda/civic/2018/market-value
  // /es/state/tx/nissan/sentra/2015/vin-check
  // /vin/1HGCM82633A004352/
  if (/^\/vin\//i.test(urlPath)) {
    meta.intent = "vin-check";
    const vinMatch = urlPath.match(/\/vin\/([^/]+)/i);
    if (vinMatch) meta.vin = vinMatch[1];
  } else if (/\/state\//i.test(urlPath)) {
    const idx = parts.indexOf("state");
    if (idx >= 0 && parts[idx + 1]) meta.state = parts[idx + 1].toUpperCase();
    if (parts[idx + 2]) meta.make = parts[idx + 2];
    if (parts[idx + 3]) meta.model = parts[idx + 3];
    if (parts[idx + 4] && /^\d{4}$/.test(parts[idx + 4])) meta.year = parts[idx + 4];
    if (parts[idx + 5]) {
      const maybeIntent = parts[idx + 5];
      if (INTENTS.includes(maybeIntent)) meta.intent = maybeIntent;
    }
  } else if (/\/vin-check\//i.test(urlPath)) {
    meta.intent = "vin-check";
    const parts = urlPath.split("/").filter(Boolean);
    if (parts[1]) meta.state = parts[1].toUpperCase();
    if (parts[2]) meta.make = parts[2];
    if (parts[3] && /^\d{4}$/.test(parts[3])) meta.year = parts[3];
  }

  return meta;
}

function buildGraph(pages) {
  // Простой граф: списки по ключам
  const byState = {};
  const byMake = {};
  const byModel = {};
  const byIntent = {};
  const nodes = [];

  pages.forEach((p) => {
    nodes.push(p);

    if (p.meta.state) {
      byState[p.meta.state] = byState[p.meta.state] || [];
      byState[p.meta.state].push(p.url);
    }
    if (p.meta.make) {
      const key = p.meta.make.toLowerCase();
      byMake[key] = byMake[key] || [];
      byMake[key].push(p.url);
    }
    if (p.meta.model) {
      const key = p.meta.model.toLowerCase();
      byModel[key] = byModel[key] || [];
      byModel[key].push(p.url);
    }
    if (p.meta.intent) {
      byIntent[p.meta.intent] = byIntent[p.meta.intent] || [];
      byIntent[p.meta.intent].push(p.url);
    }
  });

  // Related links (простое приближение)
  const related = {};
  nodes.forEach((p) => {
    const links = new Set();

    if (p.meta.state && byState[p.meta.state]) {
      byState[p.meta.state]
        .slice(0, 10)
        .forEach((u) => u !== p.url && links.add(u));
    }
    if (p.meta.make && byMake[p.meta.make.toLowerCase()]) {
      byMake[p.meta.make.toLowerCase()]
        .slice(0, 10)
        .forEach((u) => u !== p.url && links.add(u));
    }
    if (p.meta.model && byModel[p.meta.model.toLowerCase()]) {
      byModel[p.meta.model.toLowerCase()]
        .slice(0, 10)
        .forEach((u) => u !== p.url && links.add(u));
    }
    if (p.meta.intent && byIntent[p.meta.intent]) {
      byIntent[p.meta.intent]
        .slice(0, 10)
        .forEach((u) => u !== p.url && links.add(u));
    }

    related[p.url] = Array.from(links).slice(0, 8); // 2–8 внутренних ссылок
  });

  return { nodes, byState, byMake, byModel, byIntent, related };
}

function main() {
  log(`Старт STM graph по: ${STATIC_PAGES_ROOT}`);
  if (!fs.existsSync(STATIC_PAGES_ROOT)) {
    log("static-pages не найдены, выходим.");
    return;
  }

  const files = collectHtmlFiles(STATIC_PAGES_ROOT);
  log(`Найдено HTML файлов: ${files.length}`);

  const pages = files.map((file) => {
    const html = fs.readFileSync(file, "utf8");
    const url = htmlToUrl(file);
    const meta = extractMeta(html, url);
    const isHispanicHeavy =
      meta.state && HISPANIC_HEAVY_STATES.includes(meta.state);
    return { file, url, meta, isHispanicHeavy };
  });

  const graph = buildGraph(pages);

  fs.mkdirSync(path.join("data"), { recursive: true });
  const outPath = path.join("data", "seo-graph.json");
  fs.writeFileSync(outPath, JSON.stringify(graph, null, 2), "utf8");
  log(`Graph сохранён: ${outPath}`);

  // Отдельно — быстрый список "money pages" VIN-уровня
  const vinPages = pages
    .filter((p) => p.meta.vin)
    .map((p) => ({
      url: p.url,
      vin: p.meta.vin,
      state: p.meta.state,
      make: p.meta.make,
      model: p.meta.model,
      year: p.meta.year,
    }));
  const vinOut = path.join("data", "seo-vin-pages.json");
  fs.writeFileSync(vinOut, JSON.stringify(vinPages, null, 2), "utf8");
  log(`VIN pages индекс: ${vinOut}`);
}

if (require.main === module) {
  main();
}

module.exports = { main };

