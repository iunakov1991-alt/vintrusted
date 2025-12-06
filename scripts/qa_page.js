#!/usr/bin/env node

/**
 * qa_page.js
 * ============================================================================
 * Вход:
 *   node scripts/qa_page.js /path/to/page.json --rules rules/rules.json --depth <deep|medium|light|prod>
 *
 * Ожидания:
 *   • page.json — объект с блоками (либо page.blocks, либо топ-левел ключи блоков),
 *   • MONSTER_VIN / MONSTER_STAGE заданы извне (batch-pipeline),
 *   • rules.json — структура вида { version, rules: [...], stats: { usage: {} } }.
 *
 * Выход:
 *   • stdout — лог применения правил (для logs/stageX.log),
 *   • файл /tmp/${VIN}.qa.json:
 *       {
 *         "vin": "1HGCM82633A123456",
 *         "stage": "stage1",
 *         "severity_hint": null,
 *         "rules_fired": ["syntax_incomplete_sentence_common", ...],
 *         "weak_blocks": ["hero","buyer_guide"],
 *         "depth": "deep",
 *         "ts": "2025-12-04T10:15:32.123Z"
 *       }
 */

const fs = require("fs");
const path = require("path");

function loadJson(p, fallback = null) {
  try {
    if (!fs.existsSync(p)) return fallback;
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    console.error(`[QA][ERROR] Failed to load JSON from ${p}: ${e.message}`);
    return fallback;
  }
}

function getArg(flag, defVal = null) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx === process.argv.length - 1) return defVal;
  return process.argv[idx + 1];
}

// -----------------------------------------------------------------------------
// 1. Разбор аргументов / окружения
// -----------------------------------------------------------------------------
const pagePath = process.argv[2];
if (!pagePath) {
  console.error("[QA][FATAL] No page JSON path provided");
  process.exit(0); // не роняем pipeline
}

const rulesPath = getArg("--rules", "rules/rules.json");
const depth = getArg("--depth", "deep");
const stage = getArg("--stage", process.env.MONSTER_STAGE || "unknown");

const envVin = process.env.MONSTER_VIN || null;
const envStage = process.env.MONSTER_STAGE || stage;

// -----------------------------------------------------------------------------
// 2. Загрузка страницы и блоков
// -----------------------------------------------------------------------------
const pageRaw = loadJson(pagePath, {});
if (!pageRaw || typeof pageRaw !== "object") {
  console.error(`[QA][ERROR] Invalid page JSON: ${pagePath}`);
  process.exit(0);
}

// Извлекаем блоки из структуры данных
let blocks = {};
if (pageRaw.article && pageRaw.article.blocksDetail) {
  blocks = pageRaw.article.blocksDetail;
} else if (pageRaw.blocks && typeof pageRaw.blocks === "object") {
  blocks = pageRaw.blocks;
} else {
  // Используем весь объект как блоки
  blocks = pageRaw;
}

const vin = envVin || pageRaw.vin || path.basename(pagePath).replace(/\..+$/, "");
const stageName = envStage;

// -----------------------------------------------------------------------------
// 3. Загрузка правил
// -----------------------------------------------------------------------------
const rulesData = loadJson(rulesPath, { version: 1, rules: [], stats: { usage: {} } });
const rules = Array.isArray(rulesData.rules) ? rulesData.rules : [];

console.log(`[QA][INIT] VIN=${vin} STAGE=${stageName} DEPTH=${depth} RULES=${rules.length}`);

// -----------------------------------------------------------------------------
// 4. Хелперы
// -----------------------------------------------------------------------------
function shouldApplyRuleToDepth(rule, depth) {
  const meta = rule.meta || {};
  const min = meta.stage_min || "deep";
  const max = meta.stage_max || "prod";

  const order = ["deep","medium","light","prod"];
  const dIdx = order.indexOf(depth);
  const minIdx = order.indexOf(min);
  const maxIdx = order.indexOf(max);

  if (dIdx === -1) return true;
  if (minIdx !== -1 && dIdx < minIdx) return false;
  if (maxIdx !== -1 && dIdx > maxIdx) return false;
  return true;
}

function getBlockText(blockName) {
  const v = blocks[blockName];
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    if (v.content) return String(v.content);
    if (v.text) return String(v.text);
    if (v.html) return String(v.html);
  }
  return String(v);
}

function countWords(text) {
  return (text || "")
    .split(/\s+/)
    .filter(Boolean).length;
}

// -----------------------------------------------------------------------------
// 5. Применение правил к блокам
// -----------------------------------------------------------------------------
const rulesFiredSet = new Set();
const weakBlocksSet = new Set();

for (const rule of rules) {
  if (!rule || typeof rule !== "object") continue;
  if (rule.scope && rule.scope !== "block") continue; // пока работаем только с block-правилами
  if (!shouldApplyRuleToDepth(rule, depth)) continue;

  const appliesTo = Array.isArray(rule.applies_to) && rule.applies_to.length
    ? rule.applies_to
    : Object.keys(blocks);

  let regex = null;
  try {
    const pattern = rule.pattern || ".*";
    regex = new RegExp(pattern, "i");
  } catch (e) {
    console.error(`[QA][WARN] Invalid regex in rule ${rule.id}: ${e.message}`);
    continue;
  }

  for (const blockName of appliesTo) {
    const text = getBlockText(blockName);
    if (!text || !text.trim()) continue;

    if (regex.test(text)) {
      rulesFiredSet.add(rule.id);

      // Лог в stdout — для stageX.log
      console.log(
        `[QA][RULE_HIT] vin=${vin} stage=${stageName} block=${blockName} ` +
        `rule_id=${rule.id} type=${rule.type || "unknown"} priority=${rule.priority || 0}`
      );

      // Простая эвристика "слабого" блока:
      //  – structure / semantic / syntax с priority >= 3
      //  – либо meta.on_fail_severity === "MAJOR" / "FATAL"
      const type = rule.type || "";
      const prio = rule.priority || 0;
      const onFail = (rule.on_fail_severity || "").toUpperCase();

      const severityStrong = (onFail === "MAJOR" || onFail === "FATAL");
      const typeStrong =
        type === "structure" ||
        type === "semantic" ||
        type === "syntax";

      if ((typeStrong && prio >= 3) || severityStrong) {
        weakBlocksSet.add(blockName);
      }
    }
  }
}

// -----------------------------------------------------------------------------
// 6. Дополнительный слабый блок: слишком маленький объём
// -----------------------------------------------------------------------------
const criticalBlocks = ["hero","state_specific","accident_intelligence","buyer_guide","recalls_tsbs","faq"];
for (const name of criticalBlocks) {
  const text = getBlockText(name);
  if (!text.trim()) continue;
  const wc = countWords(text);
  if (wc < 140) {
    console.log(
      `[QA][WEAK_BLOCK] vin=${vin} stage=${stageName} block=${name} reason=min_words (${wc})`
    );
    weakBlocksSet.add(name);
  }
}

// -----------------------------------------------------------------------------
// 7. Формирование QA-JSON (/tmp/${VIN}.qa.json)
// -----------------------------------------------------------------------------
const qaPayload = {
  vin,
  stage: stageName,
  severity_hint: null,          // может быть заполнено позже, если захочешь
  rules_fired: Array.from(rulesFiredSet),
  weak_blocks: Array.from(weakBlocksSet),
  depth,
  ts: new Date().toISOString()
};

const outPath = `/tmp/${vin}.qa.json`;

try {
  fs.writeFileSync(outPath, JSON.stringify(qaPayload, null, 2), "utf8");
  console.log(`[QA][OUT] Written QA JSON to ${outPath}`);
} catch (e) {
  console.error(`[QA][ERROR] Failed to write QA JSON to ${outPath}: ${e.message}`);
}

process.exit(0);
