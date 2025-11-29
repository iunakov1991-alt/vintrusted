const fs = require('fs');
const path = require('path');
const { log } = require('./logger');
const { buildUrlPlan } = require('./seo-url-factory');
const { buildPageContent } = require('./seo-content-engine');
const { scorePage, resetQualityIndex, writeQualityIndex } = require('./seo-quality-engine');
const { loadRlState, saveRlState, updateRlState } = require('./seo-rl-engine');
const { buildGraph } = require('./seo-graph-engine');
const { writeSitemaps } = require('./seo-sitemap-engine');
const { writeDashboard } = require('./seo-dashboard');

const isVercel = !!(process.env.VERCEL || process.env.VERCEL_ENV);
const BUILD_META_PATH = path.join(process.cwd(), 'public/internal/build-meta.json');
const RUN_SUMMARY_PATH = path.join(process.cwd(), 'public/internal/seo-run-summary.json');

// concurrency можно регулировать через ENV:
//   SEO_BUILD_CONCURRENCY=8..12
const DEFAULT_CONCURRENCY = parseInt(process.env.SEO_BUILD_CONCURRENCY || '8', 10);

function safeLoadJson(p, fallback) {
  try {
    if (!fs.existsSync(p)) return fallback;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    log('MASTER', `JSON load error at ${p}: ${e.message}`);
    return fallback;
  }
}

function attachInternalLinks(plan) {
  const byCluster = {};
  plan.forEach((item, index) => {
    if (!byCluster[item.clusterId]) byCluster[item.clusterId] = [];
    byCluster[item.clusterId].push({ index, item });
  });

  for (const clusterId of Object.keys(byCluster)) {
    const arr = byCluster[clusterId];
    for (let i = 0; i < arr.length; i++) {
      const current = arr[i].item;

      const neighborsIdx = [i - 1, i + 1, i + 2].filter(
        (j) => j >= 0 && j < arr.length
      );
      const links = [];
      const used = new Set();
      for (const ni of neighborsIdx) {
        const neighbor = arr[ni].item;
        if (!neighbor || neighbor.url === current.url) continue;
        if (used.has(neighbor.url)) continue;
        used.add(neighbor.url);
        const stateSlug = neighbor.stateSlug || '';
        const stateLabel = stateSlug
          ? stateSlug.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase())
          : 'your state';
        const label = `${neighbor.year} ${String(neighbor.make || '').toUpperCase()} VIN check in ${stateLabel}`;
        links.push({ href: neighbor.url, label });

        if (links.length >= 3) break;
      }

      current.internalLinks = links;
    }
  }
}

async function runWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let index = 0;
  const actualLimit = Math.max(1, Math.min(limit, items.length || 1));

  async function workerLoop() {
    while (true) {
      const i = index++;
      if (i >= items.length) break;
      const item = items[i];
      try {
        results[i] = await worker(item, i);
      } catch (e) {
        console.error(e);
        results[i] = null;
      }
    }
  }

  const workers = [];
  for (let i = 0; i < actualLimit; i++) {
    workers.push(workerLoop());
  }
  await Promise.all(workers);
  return results.filter(Boolean);
}

async function main() {
  const startedAt = new Date().toISOString();
  const startMs = Date.now();
  let buildMeta = {
    buildId: startedAt.replace(/[:.]/g, '-'),
    startedAt,
    finishedAt: null
  };

  // На Vercel удаляем старый build-meta.json, чтобы гарантировать выполнение build
  // Vercel делает несколько проходов build для разных функций, но SEO build должен выполниться один раз
  if (isVercel && fs.existsSync(BUILD_META_PATH)) {
    try {
      const existingMeta = JSON.parse(fs.readFileSync(BUILD_META_PATH, 'utf8'));
      // Проверяем, был ли build выполнен в этом же деплое (по buildId или времени)
      const existingBuildId = existingMeta.buildId;
      const currentBuildId = buildMeta.buildId;
      
      // Если buildId совпадает и build завершен - это тот же деплой, пропускаем
      if (existingBuildId === currentBuildId && existingMeta.finishedAt) {
        log('MASTER', 'SEO build already completed in this deployment, skipping.');
        process.exit(0);
      }
      
      // Иначе - новый деплой, удаляем старый файл и продолжаем
      log('MASTER', 'New deployment detected, removing old build meta and continuing...');
      fs.unlinkSync(BUILD_META_PATH);
    } catch (e) {
      log('MASTER', `Error reading build meta: ${e.message}, removing and continuing...`);
      if (fs.existsSync(BUILD_META_PATH)) {
        fs.unlinkSync(BUILD_META_PATH);
      }
    }
  }

  fs.mkdirSync(path.dirname(BUILD_META_PATH), { recursive: true });
  fs.writeFileSync(BUILD_META_PATH, JSON.stringify(buildMeta, null, 2));

  const configPath = path.join(process.cwd(), 'data/seo/config.json');
  const config = safeLoadJson(configPath, {
    targetPagesPerBuild: 10000,
    maxPagesPerCluster: 450,
    minQualityScore: 0.7,
    languages: ['en', 'es']
  });

  const rlState = loadRlState();

  log('MASTER', 'Building URL plan...');
  const plan = buildUrlPlan(config, rlState);
  log('MASTER', `URL plan size: ${plan.length}`);

  if (!plan.length) {
    log('MASTER', 'No pages planned, finishing early.');
    const finishedAt = new Date().toISOString();
    buildMeta.finishedAt = finishedAt;
    fs.writeFileSync(BUILD_META_PATH, JSON.stringify(buildMeta, null, 2));
    fs.writeFileSync(
      RUN_SUMMARY_PATH,
      JSON.stringify(
        {
          buildId: buildMeta.buildId,
          startedAt,
          finishedAt,
          durationMs: Date.now() - startMs,
          pagesPlanned: 0,
          pagesGenerated: 0,
          pagesAccepted: 0,
          avgQuality: 0,
          concurrency: 0
        },
        null,
        2
      )
    );
    process.exit(0);
  }

  attachInternalLinks(plan);

  const concurrency = DEFAULT_CONCURRENCY;
  log('MASTER', `Generating pages with concurrency=${concurrency}...`);

  const pages = await runWithConcurrency(plan, concurrency, async (item) => {
    return await buildPageContent(item, config);
  });

  log('MASTER', `Pages generated: ${pages.length}`);

  log('MASTER', 'Resetting quality index...');
  resetQualityIndex();

  log('MASTER', 'Scoring pages (in memory)...');
  const qualityRecords = [];
  const scored = pages.map((p) => {
    const { scored, rec } = scorePage(p, config);
    qualityRecords.push(rec);
    return scored;
  });

  writeQualityIndex(qualityRecords);

  const minScore = config.minQualityScore || 0.7;
  const accepted = scored.filter(
    (p) => (p.qualityScore || 0) >= minScore
  );

  log(
    'MASTER',
    `Accepted pages (score >= ${minScore}): ${accepted.length}/${scored.length}`
  );

  log('MASTER', 'Building graph (analysis only, accepted pages)...');
  buildGraph(accepted);

  log('MASTER', 'Writing sitemaps (accepted pages only)...');
  writeSitemaps(accepted, config);

  log('MASTER', 'Updating RL state from accepted pages...');
  const newRl = updateRlState(rlState, accepted);
  saveRlState(newRl);

  const finishedAt = new Date().toISOString();
  const durationMs = Date.now() - startMs;
  buildMeta.finishedAt = finishedAt;
  fs.writeFileSync(BUILD_META_PATH, JSON.stringify(buildMeta, null, 2));

  log('MASTER', 'Writing dashboard and run summary...');
  writeDashboard(buildMeta, scored, accepted);

  const avgQuality =
    accepted.reduce((acc, p) => acc + (p.qualityScore || 0), 0) /
      Math.max(accepted.length, 1) || 0;

  const summary = {
    buildId: buildMeta.buildId,
    startedAt,
    finishedAt,
    durationMs,
    pagesPlanned: plan.length,
    pagesGenerated: pages.length,
    pagesAccepted: accepted.length,
    avgQuality,
    concurrency
  };

  fs.writeFileSync(RUN_SUMMARY_PATH, JSON.stringify(summary, null, 2));

  log('MASTER', `SEO build finished in ${durationMs}ms.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
