#!/usr/bin/env bash

# =====================================================================================
#  MONSTER 7.x — QA + ANALYTICS INSTALL
# =====================================================================================
# Объединяет 6 шагов в один практический инсталлер:
#
# 1) Доделать qa_page.js так, чтобы:
#      – читал rules.json,
#      – применял правила к блокам,
#      – собирал rules_fired / weak_blocks,
#      – писал /tmp/${VIN}.qa.json,
#      – логировал срабатывания в stdout.
# 2) Зафиксировать JSON-структуру логов для ClickHouse/BigQuery.
# 3) Дать понятный шаг: прогнать stage1 через batch-pipeline.
# 4) Логика: logs/pages_analytics.log → заливка в ClickHouse/BigQuery.
# 5) Ввести KPI по качеству (через severity) — делается уже в аналитике.
# 6) Дальше — крутить аналитику, видеть, какие правила и блоки реально тупят.
#
# Этот скрипт:
#   • создаёт/перезаписывает scripts/qa_page.js (конкретная реализация),
#   • документирует JSON-формат записи для 1 страницы,
#   • даёт команды, как запустить stage1 и дальше грузить логи.
# =====================================================================================

set -e

mkdir -p scripts rules logs tmp

# -------------------------------------------------------------------------------------
# 1. Конкретная реализация qa_page.js
#    – читает rules.json,
#    – прогоняет правила по блокам,
#    – собирает rules_fired / weak_blocks,
#    – пишет /tmp/${VIN}.qa.json,
#    – логирует всё в stdout (для stageX.log).
# -------------------------------------------------------------------------------------

cat > scripts/qa_page.js << 'EOF'
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
EOF

chmod +x scripts/qa_page.js

echo "✅ Created/updated scripts/qa_page.js"

# -------------------------------------------------------------------------------------
# 2. Документация формата JSON-аналитики для одной страницы
#    (то, что пишет log_page_analytics.js в logs/pages_analytics.log)
# -------------------------------------------------------------------------------------

cat > docs/analytics_schema.md << 'EOFDOC'
# JSON Analytics Schema for ClickHouse/BigQuery

## Формат записи (JSONL)

Каждая строка в `logs/pages_analytics.log` — это один JSON объект:

```json
{
  "vin": "1HGCM82633A123456",
  "stage": "stage1",
  "severity": "MAJOR",
  "fatal_count": 0,
  "major_count": 1,
  "minor_count": 0,
  "wordcount": 2875,
  "rules_fired": ["syntax_incomplete_sentence_common","structure_block_min_length_core"],
  "weak_blocks": ["hero","buyer_guide"],
  "ts": "2025-12-04T10:15:32.123Z"
}
```

## ClickHouse Schema

```sql
CREATE TABLE pages_analytics (
    vin String,
    stage String,
    severity String,
    fatal_count UInt8,
    major_count UInt8,
    minor_count UInt8,
    wordcount UInt32,
    rules_fired Array(String),
    weak_blocks Array(String),
    ts DateTime
) ENGINE = MergeTree()
ORDER BY (stage, ts);
```

## BigQuery Schema

```sql
CREATE TABLE `project.dataset.pages_analytics` (
    vin STRING,
    stage STRING,
    severity STRING,
    fatal_count INT64,
    major_count INT64,
    minor_count INT64,
    wordcount INT64,
    rules_fired ARRAY<STRING>,
    weak_blocks ARRAY<STRING>,
    ts TIMESTAMP
);
```

## Загрузка данных

### ClickHouse
```bash
cat logs/pages_analytics.log | clickhouse-client --query "INSERT INTO pages_analytics FORMAT JSONEachRow"
```

### BigQuery
```bash
bq load --source_format=NEWLINE_DELIMITED_JSON \
  --autodetect \
  project:dataset.pages_analytics \
  logs/pages_analytics.log
```

## Примеры запросов

### Топ правил по частоте срабатывания
```sql
SELECT 
    rule_id,
    COUNT(*) as count
FROM pages_analytics
ARRAY JOIN rules_fired as rule_id
GROUP BY rule_id
ORDER BY count DESC
LIMIT 10;
```

### Распределение severity по стадиям
```sql
SELECT 
    stage,
    severity,
    COUNT(*) as count
FROM pages_analytics
GROUP BY stage, severity
ORDER BY stage, severity;
```

### Топ слабых блоков
```sql
SELECT 
    block_name,
    COUNT(*) as count
FROM pages_analytics
ARRAY JOIN weak_blocks as block_name
GROUP BY block_name
ORDER BY count DESC;
```
EOFDOC

echo "✅ Created docs/analytics_schema.md"

# -------------------------------------------------------------------------------------
# 3. Подсказка: как прогнать stage1 через batch-pipeline
# -------------------------------------------------------------------------------------

cat << 'INFO'

=====================================================================================
ДАЛЬШИЕ ШАГИ (РУЧНЫЕ, НО ПРЯМЫЕ)
=====================================================================================

1) Убедись, что у тебя есть tasks/stage1_tasks.csv в формате:

   VIN,MODEL,YEAR,STATE
   1HGCM82633A123456,Honda Accord,2019,Texas
   ...


2) Запуск только stage1 через bash-pipeline:

   ./scripts/monster_7x_batch_pipeline.sh --stage stage1

   или через JavaScript версию:

   node scripts/monster_7x_batch_pipeline.js --stage stage1


3) После прогона stage1:

   – проверяешь:
       logs/stage1.log
       logs/pages_analytics.log

   – смотришь:
       • сколько FATAL / MAJOR / MINOR / OK по stage1,
       • какие rules_fired чаще всего всплывают,
       • какие weak_blocks повторяются.


4) Заливка logs/pages_analytics.log в ClickHouse/BigQuery:

   – файл уже в формате JSONL (по одной записи на строку),
   – в ClickHouse: создаёшь таблицу с нужной схемой и делаешь INSERT FROM INFILE,
   – в BigQuery: создаёшь таблицу, формат JSON, загрузка с autodetect или явной схемой.

   См. docs/analytics_schema.md для деталей.


5) После этого ты перестаёшь «ощущать» качество и начинаешь его видеть:

   – какие правила реально полезны (частые MAJOR/FATAL),
   – какие стоит ослабить/усилить,
   – какие блоки системно слабые (hero, buyer_guide, state_specific и т.д.).


6) KPI по качеству (через severity):

   – FATAL rate = FATAL / (FATAL + MAJOR + MINOR + OK)
   – MAJOR rate = MAJOR / (FATAL + MAJOR + MINOR + OK)
   – Quality Score = (OK + MINOR) / (FATAL + MAJOR + MINOR + OK)

   Эти метрики можно считать по стадиям и отслеживать тренды.


=====================================================================================
УСТАНОВКА ЗАВЕРШЕНА:

  • scripts/qa_page.js — обновлён и готов к работе в пайплайне.
  • Формат JSON-аналитики задокументирован в docs/analytics_schema.md.
  • Скрипты готовы к использованию.

=====================================================================================

INFO

echo ""
echo "✅ QA + Analytics installation completed!"
echo ""
echo "Next steps:"
echo "  1. Check tasks/stage1_tasks.csv exists"
echo "  2. Run: ./scripts/monster_7x_batch_pipeline.sh --stage stage1"
echo "  3. Check logs/pages_analytics.log for results"
echo "  4. See docs/analytics_schema.md for ClickHouse/BigQuery schema"














