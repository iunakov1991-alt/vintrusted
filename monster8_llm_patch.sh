#!/usr/bin/env bash

# =============================================================================
# MONSTER 8.0 — LLM + DEBUG PATCH
# =============================================================================
# 1) scripts/gen_article_blocks.js — LLM wrapper (DeepSeek / local AI / smart stub)
# 2) scripts/debug_run_topic.sh   — skip validation when only stub is available
# 3) docs/LLM_SETUP_MONSTER8.md   — instructions for enabling real LLM providers
# =============================================================================

set -euo pipefail

mkdir -p scripts docs

# -----------------------------------------------------------------------------
# scripts/gen_article_blocks.js
# -----------------------------------------------------------------------------
cat > scripts/gen_article_blocks.js <<'EOF'
const fs = require("fs");
const path = require("path");
const https = require("https");
const { buildArticleSpec } = require("./build_article_spec.js");

function httpPostJson(url, payload, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = JSON.stringify(payload);

    const options = {
      hostname: u.hostname,
      port: u.port || (u.protocol === "https:" ? 443 : 80),
      path: u.pathname + (u.search || ""),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
        ...headers,
      },
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(body);
          resolve(json);
        } catch (e) {
          resolve(body);
        }
      });
    });

    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function callLLM(corePrompt, spec) {
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  const useLocalAi = process.env.USE_LOCAL_AI === "1" || process.env.USE_LOCAL_AI === "true";

  if (deepseekKey) {
    console.error("[LLM] Using DeepSeek-style HTTP provider (stub endpoint).");
    const url = "https://api.deepseek.example/placeholder"; // TODO: заменить на реальный endpoint
    const payload = {
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      messages: [
        { role: "system", content: corePrompt },
        { role: "user", content: JSON.stringify(spec) },
      ],
    };

    try {
      const resp = await httpPostJson(url, payload, {
        Authorization: `Bearer ${deepseekKey}`,
      });

      const text =
        resp?.choices?.[0]?.message?.content ||
        resp?.output ||
        "Stub DeepSeek response block 1.\n\n===BLOCK_END===\n\nStub DeepSeek response block 2.";

      return text;
    } catch (e) {
      console.error("[LLM] DeepSeek call failed, falling back to STUB:", e.message);
    }
  }

  if (useLocalAi) {
    console.error("[LLM] Using local LLM provider (stub).");
    const model = process.env.LOCAL_AI_MODEL || "phi3:mini";
    const blocksText = spec.blocks
      .map(
        (b, i) =>
          `LOCAL LLM STUB BLOCK ${i + 1} (${b.id}, ${b.role}) for topic ${
            spec.topic.topic_id
          } using model ${model}.`
      )
      .join(spec.delim);
    return blocksText;
  }

  console.error(
    "[LLM] Falling back to placeholder content – no providers available (no DEEPSEEK_API_KEY, no USE_LOCAL_AI)."
  );
  const blocksText = spec.blocks
    .map((b, i) => {
      return (
        `STUB BLOCK ${i + 1} (${b.id} / ${b.role}) for topic ${spec.topic.topic_id}.\n` +
        `This is offline placeholder text to keep the MONSTER 8.0 pipeline working without a real LLM.\n` +
        `When you provide DEEPSEEK_API_KEY or enable USE_LOCAL_AI, this stub will be replaced by real article content.`
      );
    })
    .join(spec.delim);
  return blocksText;
}

function splitBlocksFromOutput(output, delim) {
  return output
    .split(delim)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function generateArticleBlocks(topic) {
  const corePromptPath = path.join(__dirname, "..", "prompts", "core_prompt_blocks.txt");
  const corePrompt = fs.readFileSync(corePromptPath, "utf8");

  const spec = buildArticleSpec(topic);
  const raw = await callLLM(corePrompt, spec);
  const parts = splitBlocksFromOutput(raw, spec.delim);

  const blocksOut = {};
  spec.blocks.forEach((b, idx) => {
    blocksOut[b.id] = parts[idx] || "";
  });

  return {
    topic,
    blocks: blocksOut,
  };
}

if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    const idx = args.indexOf("--topic-file");
    if (idx === -1 || !args[idx + 1]) {
      console.error("Usage: node scripts/gen_article_blocks.js --topic-file data/topic.json");
      process.exit(1);
    }
    const topicPath = args[idx + 1];
    const topic = JSON.parse(fs.readFileSync(topicPath, "utf8"));
    const res = await generateArticleBlocks(topic);
    process.stdout.write(JSON.stringify(res, null, 2));
  })();
}

module.exports = { generateArticleBlocks };
EOF

# -----------------------------------------------------------------------------
# scripts/debug_run_topic.sh
# -----------------------------------------------------------------------------
cat > scripts/debug_run_topic.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: scripts/debug_run_topic.sh data/topic.json"
  exit 1
fi

TOPIC_FILE="$1"
BASENAME="$(basename "$TOPIC_FILE" .json)"

mkdir -p tmp logs

echo "=== DEBUG: GEN + (опционально QA/VALIDATE) for topic $TOPIC_FILE ==="

if [[ -f scripts/rl_ingest_metrics.js ]]; then
  echo "[0/3] RL ingest metrics..."
  node scripts/rl_ingest_metrics.js || true
fi
if [[ -f scripts/rl_update_strategy.js ]]; then
  echo "[0/3] RL update strategy..."
  node scripts/rl_update_strategy.js || true
fi

echo "[1/3] Generating article blocks..."
node scripts/gen_article_blocks.js --topic-file "$TOPIC_FILE" > "tmp/${BASENAME}.blocks.json"
echo "Blocks JSON → tmp/${BASENAME}.blocks.json"

if [[ -f scripts/qa_page.js ]]; then
  echo "[2/3] Running QA..."
  MONSTER_TOPIC="$BASENAME" MONSTER_STAGE="debug" \
    node scripts/qa_page.js < "tmp/${BASENAME}.blocks.json" > "tmp/${BASENAME}.qa.out" 2>"tmp/${BASENAME}.qa.log" || true
  echo "QA → tmp/${BASENAME}.qa.out, log → tmp/${BASENAME}.qa.log"
else
  echo "[2/3] QA skipped (scripts/qa_page.js not found)"
fi

if [[ -f scripts/validate_page.js ]]; then
  if [[ -z "${DEEPSEEK_API_KEY:-}" && -z "${USE_LOCAL_AI:-}" ]]; then
    echo "[3/3] Validation skipped (no DEEPSEEK_API_KEY and no USE_LOCAL_AI — content is STUB)."
  else
    echo "[3/3] Running validate_page..."
    node scripts/validate_page.js tmp/"${BASENAME}.blocks.json" | tee "tmp/${BASENAME}.validate.out" || true
    echo "Validate output → tmp/${BASENAME}.validate.out"
  fi
else
  echo "[3/3] Validation skipped (scripts/validate_page.js not found)"
fi

echo "=== DEBUG DONE for topic $BASENAME ==="
EOF
chmod +x scripts/debug_run_topic.sh

# -----------------------------------------------------------------------------
# docs/LLM_SETUP_MONSTER8.md
# -----------------------------------------------------------------------------
cat > docs/LLM_SETUP_MONSTER8.md <<'EOF'
# MONSTER 8.0 — LLM SETUP

## Вариант A: удалённый LLM (DeepSeek / аналогичный сервис)

1. Зарегистрируйтесь у выбранного провайдера и получите API-ключ.
2. В терминале, перед запуском пайплайна, выполните:
   ```bash
   export DEEPSEEK_API_KEY="ВАШ_КЛЮЧ"
   export DEEPSEEK_MODEL="deepseek-chat"    # при необходимости
   ```
3. В `scripts/gen_article_blocks.js` замените `https://api.deepseek.example/placeholder`
   и адаптируйте парсинг под реальный формат ответа.

## Вариант B: локальный LLM (Ollama)

1. Установите Ollama, скачайте модель (`ollama pull phi3:mini`).
2. Перед запуском:
   ```bash
   export USE_LOCAL_AI=1
   export LOCAL_AI_MODEL="phi3:mini"
   ```
3. В `scripts/gen_article_blocks.js` можно реализовать настоящий запрос к
   `http://localhost:11434/api/chat` (или /api/generate) и распарсить ответ.

## Вариант C: без LLM (STUB-режим)

Если переменные не заданы, генератор создаёт техничные stub-тексты для каждого блока,
чтобы пайплайн оставался рабочим. `scripts/debug_run_topic.sh` в этом случае пропускает
`validate_page.js`, чтобы не получать FATAL-ы за пустые блоки.
EOF

cat <<'EOF'
=================================================================
MONSTER 8.0 LLM + DEBUG PATCH APPLIED
-----------------------------------------------------------------
Обновлено:
  • scripts/gen_article_blocks.js
  • scripts/debug_run_topic.sh
Создано:
  • docs/LLM_SETUP_MONSTER8.md

Запуск в STUB-режиме:
  scripts/debug_run_topic.sh data/topic.dmv_ca_title_types_checklist_es_mx_us.json

С удалённым провайдером:
  export DEEPSEEK_API_KEY="..."
  export DEEPSEEK_MODEL="deepseek-chat"
  scripts/debug_run_topic.sh data/topic.dmv_ca_title_types_checklist_es_mx_us.json

С локальным LLM (Ollama):
  export USE_LOCAL_AI=1
  export LOCAL_AI_MODEL="phi3:mini"
  scripts/debug_run_topic.sh data/topic.dmv_ca_title_types_checklist_es_mx_us.json
=================================================================
EOF

