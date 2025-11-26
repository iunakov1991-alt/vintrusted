// Knowledge Graph Engine
// Строит:
//   - seeds для infopage/listing с пагинацией
//   - структурированный граф перелинковки
//   - EN/ES URL и hreflang-пары

const path = require("path");
const {
  STATES_FULL,
  loadMakesModels,
  CLUSTERS,
  LISTING_PAGE_SIZE,
  MAX_LISTING_PAGES_PER_NODE,
  LANGS
} = require("./seo-kg-config");

const BASE_URL = (process.env.SEO_BASE_URL || "https://vintrusted.com").replace(/\/+$/, "");

function slugify(str) {
  return String(str)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getLangPrefix(lang) {
  return lang === "es" ? "/es" : "";
}

function buildNodeId({ lang, stateCode, make, model, clusterId, page }) {
  const parts = [
    lang,
    stateCode.toLowerCase(),
    slugify(make || "all"),
    model ? slugify(model) : "all-models",
    clusterId,
    page != null ? `p${page}` : "p1"
  ];
  return parts.join("::");
}

function buildUrl({ lang, stateCode, make, model, cluster, page }) {
  const langPrefix = getLangPrefix(lang);
  const stateSlug = stateCode.toLowerCase();
  const makeSlug = slugify(make || "all");
  const modelSlug = model ? slugify(model) : null;
  const clusterSegment = cluster[lang].slugSegment;

  const basePathParts = [
    langPrefix,
    "guides",
    stateSlug,
    makeSlug
  ];
  if (modelSlug) basePathParts.push(modelSlug);
  basePathParts.push(clusterSegment);

  let urlPath = basePathParts.join("/").replace(/\/+/g, "/");
  if (!urlPath.startsWith("/")) urlPath = "/" + urlPath;
  if (page && page > 1) {
    urlPath = `${urlPath}/page/${page}`;
  }
  return urlPath;
}

function buildHreflangs(node) {
  const { lang, urlPath } = node;
  const otherLang = lang === "en" ? "es" : "en";
  const thisHref = BASE_URL + urlPath;
  const otherPrefix = getLangPrefix(otherLang);
  const otherPath = urlPath.replace(/^\/(es)?/, otherPrefix || "/");
  const otherHref = BASE_URL + otherPath;

  return [
    { hrefLang: lang === "en" ? "en" : "es", href: thisHref },
    { hrefLang: otherLang === "en" ? "en" : "es", href: otherHref },
    { hrefLang: "x-default", href: thisHref }
  ];
}

// Строим seeds: по умолчанию — по всем штатам и всем маркам/моделям из makes-models.json
function buildKnowledgeGraphSeeds() {
  const makesModels = loadMakesModels();
  const makes = Object.keys(makesModels);
  const seeds = [];

  if (!makes.length) {
    console.warn("[SEO-KG] makes-models.json пуст или невалиден — seeds будут ограничены.");
  }

  for (const lang of LANGS) {
    for (const state of STATES_FULL) {
      const stateCode = state.code;
      for (const make of makes) {
        const models = makesModels[make] || [null];
        for (const model of models) {
          for (const cluster of CLUSTERS) {
            // Для каждого кластера/штата/марки/модели создаём пару:
            // - canonical listing page (page 1)
            // - при необходимости страницу 2..N
            const totalItems = LISTING_PAGE_SIZE * MAX_LISTING_PAGES_PER_NODE;
            const totalPages = Math.ceil(totalItems / LISTING_PAGE_SIZE);

            for (let page = 1; page <= totalPages; page++) {
              const id = buildNodeId({
                lang,
                stateCode,
                make,
                model,
                clusterId: cluster.id,
                page
              });

              const urlPath = buildUrl({
                lang,
                stateCode,
                make,
                model,
                cluster,
                page
              });

              const hreflangs = buildHreflangs({ lang, urlPath });

              seeds.push({
                id,
                lang,
                stateCode,
                stateName: state.name,
                make,
                model,
                cluster,
                clusterId: cluster.id,
                page,
                totalPages,
                urlPath,
                hreflangs
              });
            }
          }
        }
      }
    }
  }

  return seeds;
}

// Строим граф перелинковки для каждого узла
// - соседние страницы пагинации (prev/next)
// - родственники по кластеру (другие модели \ тот же штат/марка)
// - переход к VIN-интентам (state/make/year узлы из основной фабрики)
function buildLinkGraph(seeds) {
  const byId = new Map();
  const byClusterKey = new Map(); // lang::state::make::clusterId
  const byStateMake = new Map(); // lang::state::make

  for (const node of seeds) {
    byId.set(node.id, node);

    const clusterKey = [
      node.lang,
      node.stateCode,
      node.make,
      node.clusterId
    ]
      .map(String)
      .join("::");

    if (!byClusterKey.has(clusterKey)) byClusterKey.set(clusterKey, []);
    byClusterKey.get(clusterKey).push(node);

    const smKey = [node.lang, node.stateCode, node.make].map(String).join("::");
    if (!byStateMake.has(smKey)) byStateMake.set(smKey, []);
    byStateMake.get(smKey).push(node);
  }

  const links = new Map();

  for (const node of seeds) {
    const nodeLinks = [];

    // 1) Пагинация (prev/next)
    if (node.page > 1) {
      const prevId = buildNodeId({
        lang: node.lang,
        stateCode: node.stateCode,
        make: node.make,
        model: node.model,
        clusterId: node.clusterId,
        page: node.page - 1
      });
      nodeLinks.push({ rel: "prev", targetId: prevId });
    }
    if (node.page < node.totalPages) {
      const nextId = buildNodeId({
        lang: node.lang,
        stateCode: node.stateCode,
        make: node.make,
        model: node.model,
        clusterId: node.clusterId,
        page: node.page + 1
      });
      nodeLinks.push({ rel: "next", targetId: nextId });
    }

    // 2) Родственные кластеры по state/make (cross-cluster)
    const smKey = [node.lang, node.stateCode, node.make].map(String).join("::");
    const siblings = byStateMake.get(smKey) || [];
    const crossCluster = siblings.filter(
      (n) =>
        n.clusterId !== node.clusterId &&
        n.page === 1 &&
        n.urlPath !== node.urlPath
    );

    const limitedCross = crossCluster.slice(0, 4);
    for (const sib of limitedCross) {
      nodeLinks.push({
        rel: "cluster",
        targetId: sib.id
      });
    }

    // 3) "Мост" к VIN-интентам (основная фабрика)
    // Считаем, что основная сетка даёт URL вида:
    //   /vin-check/{stateCode}/{slug(make)}/{year}
    // Здесь просто формируем внутренние ссылки на эти узлы (без генерации контента).
    const vinYears = [2012, 2016, 2020, 2024];
    const makeSlug = slugify(node.make || "used-car");
    const stateCode = node.stateCode.toLowerCase();
    const vinLinks = vinYears.map((year) => {
      const vinUrl = `/vin-check/${stateCode}/${makeSlug}/${year}`;
      return {
        rel: "vin-intent",
        href: vinUrl,
        label: `VIN report for ${node.make} ${year} in ${node.stateName}`
      };
    });

    links.set(node.id, {
      nodeId: node.id,
      pagination: nodeLinks.filter((l) => l.rel === "prev" || l.rel === "next"),
      clusterLinks: nodeLinks.filter((l) => l.rel === "cluster"),
      vinIntentLinks: vinLinks
    });
  }

  return links;
}

module.exports = {
  buildKnowledgeGraphSeeds,
  buildLinkGraph,
  slugify
};

