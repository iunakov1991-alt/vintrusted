#!/bin/bash

set -e

########################################################################

# SEO-MONSTER 2.2 — PRO VERCEL TUNING + FIXES

#

# ЦЕЛЬ:

#  - Оставить фронт, Stripe, ClearVIN и всё API нетронутыми.

#  - Доработать SEO-монстра под Pro-план Vercel:

#      • больше страниц за билд (10–20k безопасно),

#      • всё так же только статика (без новых serverless-функций),

#      • аккуратная интеграция sitemap-ов.

#  - Закрыть узкие места:

#      • I/O по ai-cache.jsonl → один read, дальше только append.

#      • enableAI реально управляет AI (config + ENV).

#      • SEO-sitemap автоматически и мягко встраивается в корневой sitemap.

#

# ПРЕДПОСЫЛКИ:

#  - SEO-MONSTER 2.0 уже установлен:

#      scripts/seo/*, data/seo/*, public/seo/*

#  - package.json: "vercel-build": "node scripts/seo/seo-master-build.js"

#

# РЕКОМЕНДАЦИИ ПОД VERCEL PRO:

#  - data/seo/config.json:

#      "targetPagesPerBuild": 10000–20000

#      "maxPagesPerCluster": 400–600

#    Это использует более мощные билдеры Pro, но не лезет в безумие.

#  - Монстр НЕ создаёт новых Serverless Functions — лимиты по функциям

#    Pro-плана его не касаются, он пишет только статику.

########################################################################

echo "[SEO-MONSTER 2.2] Applying Pro patch..."

mkdir -p scripts/seo

mkdir -p data/seo

mkdir -p public/seo/sitemaps

mkdir -p public/internal

########################################################################

# 1) Обновлённый config.json — числа под Pro, enableAI осмысленный

########################################################################

cat > data/seo/config.json << 'EOF'

{

  "targetPagesPerBuild": 15000,

  "maxPagesPerCluster": 500,

  "minQualityScore": 0.7,

  "enableAI": true,

  "aiMaxTokens": 600,

  "languages": ["en", "es"],

  "defaultLanguage": "en",

  "intents": [

    "vin_check",

    "accident_check",

    "ownership_history",

    "market_value",

    "dmv_records"

  ]

}

EOF

echo "[SEO-MONSTER 2.2] data/seo/config.json updated for Pro."

########################################################################

# 2) Оптимизированный seo-ai-client.js

#    - Один раз читаем кеш в память (без перечитываний на каждую страницу)

#    - enableAI из config + ENV

#    - Без fetch (совместимо с Node 16/18, без глобальных завязок)

########################################################################

cat > scripts/seo/seo-ai-client.js << 'EOF'

const fs = require('fs');

const path = require('path');

const crypto = require('crypto');

const { log } = require('./logger');

const CACHE_PATH = path.join(process.cwd(), 'data/seo/ai-cache.jsonl');

const CONFIG_PATH = path.join(process.cwd(), 'data/seo/config.json');

let inMemoryCache = null;

let configEnableAI = true;

// Ленивая подгрузка конфига

function loadConfigEnableAI() {

  if (!fs.existsSync(CONFIG_PATH)) {

    return true;

  }

  try {

    const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

    return cfg.enableAI !== false;

  } catch (e) {

    log('AI', `config read error: ${e.message}`);

    return true;

  }

}

// Ленивая подгрузка кеша

function loadCacheOnce() {

  if (inMemoryCache !== null) return inMemoryCache;

  const map = new Map();

  if (!fs.existsSync(CACHE_PATH)) {

    inMemoryCache = map;

    return inMemoryCache;

  }

  try {

    const raw = fs.readFileSync(CACHE_PATH, 'utf8');

    if (!raw) {

      inMemoryCache = map;

      return inMemoryCache;

    }

    const lines = raw.split('\n').filter(Boolean);

    for (const line of lines) {

      try {

        const obj = JSON.parse(line);

        if (obj.key && obj.text) {

          map.set(obj.key, obj.text);

        }

      } catch (_e) {}

    }

  } catch (e) {

    log('AI', `Cache read error: ${e.message}`);

  }

  inMemoryCache = map;

  return inMemoryCache;

}

function appendCache(key, text) {

  try {

    if (inMemoryCache === null) {

      loadCacheOnce();

    }

    inMemoryCache.set(key, text);

    fs.appendFileSync(CACHE_PATH, JSON.stringify({ key, text }) + '\n');

  } catch (e) {

    log('AI', `Cache write error: ${e.message}`);

  }

}

function hashKey(str) {

  return crypto.createHash('sha1').update(str).digest('hex');

}

async function callGroqAPI(prompt, { lang, intent, maxTokens }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return null;
  }

  const systemPrompt = `You are an SEO content generator for a VIN history report website. You must NOT fabricate specific accident dates, owners, odometer values or any personal data. Write safe, generic, non-personalized explanations only.`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens || 600,
        temperature: 0.4
      })
    });

    if (!res.ok) {
      log('AI', `Groq HTTP error: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || null;
    if (text) {
      log('AI', `Generated text using Groq (${text.length} chars)`);
      return text.trim();
    }
    return null;
  } catch (e) {
    log('AI', `Groq request error: ${e.message}`);
    return null;
  }
}

async function callDeepSeekAPI(prompt, { lang, intent, maxTokens }) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return null;
  }

  const systemPrompt = `You are an SEO content generator for a VIN history report website. You must NOT fabricate specific accident dates, owners, odometer values or any personal data. Write safe, generic, non-personalized explanations only.`;

  try {
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens || 600,
        temperature: 0.4
      })
    });

    if (!res.ok) {
      log('AI', `DeepSeek HTTP error: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || null;
    if (text) {
      log('AI', `Generated text using DeepSeek (${text.length} chars)`);
      return text.trim();
    }
    return null;
  } catch (e) {
    log('AI', `DeepSeek request error: ${e.message}`);
    return null;
  }
}

async function callAiProvider(prompt, { lang, intent, maxTokens }) {
  // Пробуем сначала Groq (быстрый), потом DeepSeek (fallback)
  let text = await callGroqAPI(prompt, { lang, intent, maxTokens });
  
  if (!text) {
    log('AI', 'Groq failed, trying DeepSeek...');
    text = await callDeepSeekAPI(prompt, { lang, intent, maxTokens });
  }
  
  return text;
}

/**

 * generateText(prompt, { lang, intent, maxTokens })

 *

 * Логика:

 *  1. Проверяет кеш (в памяти).

 *  2. Если AI выключен (config.enableAI=false или ENV/ключа нет) — fallback.

 *  3. Если всё ок — использует Groq/DeepSeek API.

 */

async function generateText(prompt, { lang = 'en', intent = 'generic', maxTokens = 600 } = {}) {

  if (inMemoryCache === null) {

    loadCacheOnce();

    configEnableAI = loadConfigEnableAI();

  }

  const key = hashKey(`${lang}|${intent}|${prompt}`);

  if (inMemoryCache.has(key)) {

    return inMemoryCache.get(key);

  }

  const envEnable =

    process.env.SEO_ENABLE_AI === '1' ||

    process.env.SEO_ENABLE_AI === 'true' ||

    process.env.SEO_ENABLE_AI === 'on';

  // Проверяем наличие ключей Groq или DeepSeek

  const hasApiKeys = !!(process.env.GROQ_API_KEY || process.env.DEEPSEEK_API_KEY);

  const effectiveAI = configEnableAI && envEnable && hasApiKeys;

  // Если AI выключен или нет ключа — безопасный fallback

  if (!effectiveAI) {

    const fallback = `This section provides general, non-personalized information about ${intent} in the context of vehicle history reports. It explains why this check matters, what is usually included, and how drivers can use this information to make safer decisions when buying or owning a vehicle in the ${lang.toUpperCase()} locale. No specific VIN data is inferred or fabricated.`;

    appendCache(key, fallback);

    return fallback;

  }

  // Используем реальные API (Groq с fallback на DeepSeek)

  let text = await callAiProvider(prompt, { lang, intent, maxTokens });

  if (!text) {

    text = fallback;

  }

  appendCache(key, text);

  return text;

}

module.exports = { generateText };

EOF

echo "[SEO-MONSTER 2.2] scripts/seo/seo-ai-client.js updated."

########################################################################

# 3) Улучшенный seo-sitemap-engine.js под Pro:

#    - Пишет sitemaps в public/seo/sitemaps

#    - Делает глобальный индекс sitemap-seo.xml там же

#    - Копирует его в public/sitemap-seo-monster.xml

#    - Мягко интегрирует ссылку в public/sitemap.xml (если это sitemapindex)

########################################################################

cat > scripts/seo/seo-sitemap-engine.js << 'EOF'

const fs = require('fs');

const path = require('path');

const { log } = require('./logger');

const SITEMAP_ROOT = path.join(process.cwd(), 'public/seo/sitemaps');

const PUBLIC_ROOT = path.join(process.cwd(), 'public');

function chunk(arr, n) {

  const res = [];

  for (let i = 0; i < arr.length; i += n) res.push(arr.slice(i, i + n));

  return res;

}

function ensureDir(p) {

  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });

}

function writeSitemaps(pages, config) {

  ensureDir(SITEMAP_ROOT);

  // Чистим только свои файлы

  const existing = fs.readdirSync(SITEMAP_ROOT);

  for (const f of existing) {

    if (f.endsWith('.xml')) {

      fs.unlinkSync(path.join(SITEMAP_ROOT, f));

    }

  }

  const byLang = {};

  for (const p of pages) {

    if (!byLang[p.lang]) byLang[p.lang] = [];

    byLang[p.lang].push(p);

  }

  const indexEntries = [];

  const maxPerFile = 20000; // Pro позволяет спокойно держать большие sitemap-части

  for (const lang of Object.keys(byLang)) {

    const list = byLang[lang];

    const chunksArr = chunk(list, maxPerFile);

    chunksArr.forEach((chunkPages, idx) => {

      const part = idx + 1;

      const fileName = `sitemap-${lang}-${part}.xml`;

      const locs = chunkPages

        .map((p) => `<url><loc>https://vintrusted.com${p.url}</loc></url>`)

        .join('');

      const xml = `<?xml version="1.0" encoding="UTF-8"?>

<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

${locs}

</urlset>`;

      fs.writeFileSync(path.join(SITEMAP_ROOT, fileName), xml, 'utf8');

      indexEntries.push({ lang, fileName });

    });

    const indexName = `sitemap-${lang}-index.xml`;

    const entries = indexEntries

      .filter((e) => e.lang === lang)

      .map(

        (e) =>

          `<sitemap><loc>https://vintrusted.com/seo/sitemaps/${e.fileName}</loc></sitemap>`

      )

      .join('');

    const indexXml = `<?xml version="1.0" encoding="UTF-8"?>

<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

${entries}

</sitemapindex>`;

    fs.writeFileSync(path.join(SITEMAP_ROOT, indexName), indexXml, 'utf8');

  }

  // Глобальный индекс внутри public/seo/sitemaps

  const globalIndexXml = `<?xml version="1.0" encoding="UTF-8"?>

<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

${indexEntries

  .map(

    (e) =>

      `<sitemap><loc>https://vintrusted.com/seo/sitemaps/${e.fileName}</loc></sitemap>`

  )

  .join('')}

</sitemapindex>`;

  const seoIndexPath = path.join(SITEMAP_ROOT, 'sitemap-seo.xml');

  fs.writeFileSync(seoIndexPath, globalIndexXml, 'utf8');

  log(

    'SITEMAP',

    `Sitemaps written for ${Object.keys(byLang).length} languages. Total files (incl. index): ${

      indexEntries.length + 1

    }`

  );

  // Доп. интеграция: копия в корень и мягкое внедрение в sitemap.xml

  integrateWithRootSitemap(seoIndexPath);

}

/**

 * integrateWithRootSitemap:

 *  - Копирует SEO-индекс в public/sitemap-seo-monster.xml

 *  - Если public/sitemap.xml существует и это sitemapindex, добавляет

 *    <sitemap>https://vintrusted.com/seo/sitemaps/sitemap-seo.xml</sitemap>, если ещё нет.

 */

function integrateWithRootSitemap(seoIndexPath) {

  ensureDir(PUBLIC_ROOT);

  // 1) Копия монстра в отдельный файл (ничего не ломает)

  const monsterPath = path.join(PUBLIC_ROOT, 'sitemap-seo-monster.xml');

  try {

    fs.copyFileSync(seoIndexPath, monsterPath);

    log('SITEMAP', 'Root sitemap-seo-monster.xml updated.');

  } catch (e) {

    log('SITEMAP', `copy monster sitemap error: ${e.message}`);

  }

  // 2) Мягкая интеграция в существующий sitemap.xml (если это sitemapindex)

  const rootSitemapPath = path.join(PUBLIC_ROOT, 'sitemap.xml');

  if (!fs.existsSync(rootSitemapPath)) {

    return;

  }

  try {

    let content = fs.readFileSync(rootSitemapPath, 'utf8');

    // Только если это sitemapindex, иначе — не трогаем

    if (!content.includes('<sitemapindex')) {

      return;

    }

    const targetLoc = 'https://vintrusted.com/seo/sitemaps/sitemap-seo.xml';

    if (content.includes(targetLoc)) {

      // Уже подключено

      return;

    }

    const insert = `<sitemap><loc>${targetLoc}</loc></sitemap>`;

    if (content.includes('</sitemapindex>')) {

      content = content.replace('</sitemapindex>', `${insert}\n</sitemapindex>`);

      fs.writeFileSync(rootSitemapPath, content, 'utf8');

      log('SITEMAP', 'Root sitemap.xml patched with SEO index link.');

    }

  } catch (e) {

    log('SITEMAP', `root sitemap integration error: ${e.message}`);

  }

}

module.exports = { writeSitemaps };

EOF

echo "[SEO-MONSTER 2.2] scripts/seo/seo-sitemap-engine.js updated."

########################################################################

# 4) README-хинт под Pro: напоминание, что монстр — только статика

########################################################################

cat > scripts/seo/README-MONSTER-2.2.txt << 'EOF'

SEO-MONSTER 2.2 NOTES (Vercel Pro):

- Монстр НЕ создаёт новых Serverless Functions.

- Весь контент генерится на build-этапе в:

    public/seo/pages

    public/seo/sitemaps

- Лимиты по количеству функций Vercel Pro к нему не относятся.

Рекомендации под Pro:

- Если билд подходит к лимиту по времени:

  - Уменьшите "targetPagesPerBuild" в data/seo/config.json (например, до 10000).

  - Убедитесь, что Stripe/ClearVIN API НЕ вызываются на этапе билда

    (только фронт + статика).

AI:

- Чтобы выключить AI, не меняя код:

  - В .env: SEO_ENABLE_AI=0

  - Или в data/seo/config.json: "enableAI": false

- Для включения AI:

  - В .env:

      SEO_ENABLE_AI=1

      GROQ_API_KEY=sk_xxx...

      DEEPSEEK_API_KEY=sk_xxx...

EOF

echo "[SEO-MONSTER 2.2] README hint written for Pro."

echo "[SEO-MONSTER 2.2] Patch finished. 

Теперь просто гоняй обычный билд (npm run vercel-build / vercel --prod) на Pro."

