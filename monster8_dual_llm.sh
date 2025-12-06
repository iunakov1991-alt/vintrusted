#!/usr/bin/env bash

# MONSTER 8.0 — Dual LLM Stack (DeepSeek + Ollama) + LLM-QA hook
# Один запуск: ставит режимы LLM_GEN_MODE / LLM_QA_MODE, обновляет обёртку,
# добавляет qa-промпт и LLM-QA скрипт, обновляет debug_run_topic.sh.

set -euo pipefail

mkdir -p prompts scripts tmp logs

# ------------------------------------------------------------------------------
# 1. Промпт для LLM-QA по блокам статьи
# ------------------------------------------------------------------------------

cat > prompts/qa_blocks_prompt.txt << 'EOF'
You are an article QA reviewer for automotive/DMV/auction content.

INPUT
You receive a JSON object:
{
  "mode": "qa_blocks",
  "spec": { ... ArticleSpec ... },
  "article": {
    "topic": { ... },
    "blocks": {
      "<block_id>": "text...",
      ...
    }
  }
}

The ArticleSpec was produced by MONSTER 8.0 and contains:
- topic (zone, type, dimensions, etc.)
- blocks (id, role, length, style, intents, must_include_terms)
- output_format, delim, meta

TASK
For the given article:
1) Check CONTENT QUALITY:
   - Does each block actually answer its intents?
   - Are there obvious gaps for the topic and audience?
   - Is the language concrete and domain-specific (DMV, title, salvage, Copart, VIN, etc.)?
   - Is VIN mentioned as one of the tools, not as a landing-page obsession?

2) Check STRUCTURE:
   - Are all mandatory blocks present and non-empty?
   - Does the flow make sense for this article type (guide, checklist, encyclopedia, analytics)?
   - Are there any blocks that look like duplicated or generic filler?

3) Check STYLE AND LENGTH (LIGHT):
   - Are any blocks clearly too short or obviously under-developed?
   - Are there long generic intros with no value?

4) RED FLAGS:
   - Hallucinated laws (code sections that obviously do not exist, like "Section 9999.999").
   - Overconfident legal advice ("you will never have a problem if you just...").
   - Aggressive marketing tone ("amazing deal", "incredible opportunity").
   - Treating VIN check as magic solution or guarantee.

OUTPUT FORMAT
- Do NOT output JSON.
- Do NOT rewrite the article.
- Produce a plain text QA report in sections:

[SUMMARY]
One short paragraph: how good is this article overall for this topic and audience?

[BLOCKS]
For each block (by id):
- State whether it is OK / WEAK / BAD.
- If WEAK/BAD, give 1–3 concrete reasons and 1–3 concrete improvements (what exactly to add/change).

[LEGAL / FACTUAL RISK]
List any potential legal/factual/hallucination risks you see.
If none, write: "No obvious legal/factual risks detected."

[VIN / CTA]
Comment briefly:
- Is VIN used as one of the due diligence tools, not as the main hero of the article?
- Is the CTA tone acceptable (short, neutral, not overpromising)?

GENERAL STYLE RULES
- Be concise and concrete.
- Avoid marketing language.
- Focus on practical value and risk.
EOF

# ------------------------------------------------------------------------------
# 2. Обновлённая обёртка LLM: DeepSeek + Ollama + режимы LLM_GEN_MODE
# ------------------------------------------------------------------------------

cat > scripts/gen_article_blocks.js << 'EOF'
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const { buildArticleSpec } = require("./build_article_spec.js");

function httpPostJson(urlStr, payload, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const data = JSON.stringify(payload);

    const isHttps = u.protocol === "https:";
    const client = isHttps ? https : http;

    const options = {
      hostname: u.hostname,
      port: u.port || (isHttps ? 443 : 80),
      path: u.pathname + (u.search || ""),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
        ...headers
      }
    };

    const req = client.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(body);
          resolve(json);
        } catch {
          resolve(body);
        }
      });
    });

    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

// ---------------------- DeepSeek provider (prod) ----------------------

async function callDeepSeek(corePrompt, spec) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    return null;
  }

  console.error("[LLM] DeepSeek provider: start");
  const url = process.env.DEEPSEEK_API_URL || "https://api.deepseek.example/placeholder";

  const payload = {
    model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
    messages: [
      { role: "system", content: corePrompt },
      { role: "user", content: JSON.stringify(spec) }
    ]
  };

  try {
    const resp = await httpPostJson(url, payload, {
      "Authorization": `Bearer ${key}`
    });

    const text =
      resp?.choices?.[0]?.message?.content ||
      resp?.message?.content ||
      resp?.output ||
      String(resp);

    console.error("[LLM] DeepSeek provider: ok");
    return text;
  } catch (e) {
    console.error("[LLM] DeepSeek provider failed:", e.message);
    return null;
  }
}

// ---------------------- Ollama provider (local) ----------------------

async function callOllama(corePrompt, spec) {
  const useLocal = process.env.USE_LOCAL_AI === "1" || process.env.USE_LOCAL_AI === "true";
  if (!useLocal) {
    return null;
  }

  const model = process.env.LOCAL_AI_MODEL || "phi3:mini";
  const url = process.env.LOCAL_AI_URL || "http://localhost:11434/api/chat";

  console.error("[LLM] Ollama provider:", model);

  const payload = {
    model,
    messages: [
      { role: "system", content: corePrompt },
      { role: "user", content: JSON.stringify(spec) }
    ],
    stream: false
  };

  try {
    const resp = await httpPostJson(url, payload, {});
    const text =
      resp?.message?.content ||
      resp?.choices?.[0]?.message?.content ||
      resp?.output ||
      String(resp);

    console.error("[LLM] Ollama provider: ok");
    return text;
  } catch (e) {
    console.error("[LLM] Ollama provider failed:", e.message);
    return null;
  }
}

// ---------------------- Generator orchestrator ----------------------

async function llmGenerate(corePrompt, spec) {
  const mode = (process.env.LLM_GEN_MODE || "prod").toLowerCase();

  // helper: choose non-empty, "reasonable" text
  function pickNonEmpty(...candidates) {
    for (const t of candidates) {
      if (!t) continue;
      const trimmed = String(t).trim();
      if (!trimmed) continue;
      // минимальная "осмысленность": хотя бы 40 слов
      if (trimmed.split(/\s+/).length < 40) continue;
      return trimmed;
    }
    return null;
  }

  if (mode === "local") {
    // Только Ollama, без внешнего ключа
    const ol = await callOllama(corePrompt, spec);
    const picked = pickNonEmpty(ol);
    if (picked) return picked;
    console.error("[LLM] local mode: Ollama empty/too short, using stub.");
    return `Stub local LLM article for topic ${spec.topic.topic_id}\n\n===BLOCK_END===\n\nSecond block stub.`;
  }

  if (mode === "ensemble") {
    // Оба одновременно, приоритет DeepSeek, но можно fallback на Ollama
    const [dsRes, olRes] = await Promise.allSettled([
      callDeepSeek(corePrompt, spec),
      callOllama(corePrompt, spec)
    ]);

    const dsText = dsRes.status === "fulfilled" ? dsRes.value : null;
    const olText = olRes.status === "fulfilled" ? olRes.value : null;

    const picked = pickNonEmpty(dsText, olText);
    if (picked) {
      console.error("[LLM] ensemble: picked non-empty result");
      return picked;
    }

    console.error("[LLM] ensemble: both providers empty/too short, using stub.");
    return `Stub ensemble article for topic ${spec.topic.topic_id}\n\n===BLOCK_END===\n\nSecond block stub.`;
  }

  // prod (дефолт): DeepSeek → Ollama → stub
  const ds = await callDeepSeek(corePrompt, spec);
  const pickedDs = ds ? String(ds).trim() : "";
  if (pickedDs && pickedDs.split(/\s+/).length >= 40) {
    return pickedDs;
  }

  console.error("[LLM] prod: DeepSeek result empty/too short, trying Ollama...");
  const ol = await callOllama(corePrompt, spec);
  const pickedOl = ol ? String(ol).trim() : "";
  if (pickedOl && pickedOl.split(/\s+/).length >= 40) {
    return pickedOl;
  }

  console.error("[LLM] prod: both providers failed/too short, using stub.");
  return `Stub article for topic ${spec.topic.topic_id}\n\n===BLOCK_END===\n\nSecond block stub.`;
}

function splitBlocksFromOutput(output, delim) {
  return output.split(delim).map((s) => s.trim()).filter(Boolean);
}

async function generateArticleBlocks(topic) {
  const corePromptPath = path.join(__dirname, "..", "prompts", "core_prompt_blocks.txt");
  const corePrompt = fs.readFileSync(corePromptPath, "utf8");

  const spec = buildArticleSpec(topic);
  const raw = await llmGenerate(corePrompt, spec);
  const parts = splitBlocksFromOutput(raw, spec.delim);

  const blocksOut = {};
  spec.blocks.forEach((b, idx) => {
    blocksOut[b.id] = parts[idx] || "";
  });

  return {
    topic,
    blocks: blocksOut
  };
}

// CLI: node scripts/gen_article_blocks.js --topic-file data/topic.json
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

module.exports = {
  generateArticleBlocks,
  llmGenerate,
  callDeepSeek,
  callOllama
};
EOF

# ------------------------------------------------------------------------------
# 3. LLM-QA скрипт: читает blocks.json, дергает DeepSeek/Ollama по LLM_QA_MODE
# ------------------------------------------------------------------------------

cat > scripts/qa_llm_blocks.js << 'EOF'
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const { buildArticleSpec } = require("./build_article_spec.js");

function httpPostJson(urlStr, payload, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const data = JSON.stringify(payload);
    const isHttps = u.protocol === "https:";
    const client = isHttps ? https : http;

    const options = {
      hostname: u.hostname,
      port: u.port || (isHttps ? 443 : 80),
      path: u.pathname + (u.search || ""),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
        ...headers
      }
    };

    const req = client.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(body);
          resolve(json);
        } catch {
          resolve(body);
        }
      });
    });

    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function callDeepSeekQA(prompt, payload) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return null;

  console.error("[LLM-QA] DeepSeek QA: start");
  const url = process.env.DEEPSEEK_API_URL || "https://api.deepseek.example/placeholder";

  const body = {
    model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: JSON.stringify(payload) }
    ]
  };

  try {
    const resp = await httpPostJson(url, body, {
      "Authorization": `Bearer ${key}`
    });

    const text =
      resp?.choices?.[0]?.message?.content ||
      resp?.message?.content ||
      resp?.output ||
      String(resp);

    console.error("[LLM-QA] DeepSeek QA: ok");
    return text;
  } catch (e) {
    console.error("[LLM-QA] DeepSeek QA failed:", e.message);
    return null;
  }
}

async function callOllamaQA(prompt, payload) {
  const useLocal = process.env.USE_LOCAL_AI === "1" || process.env.USE_LOCAL_AI === "true";
  if (!useLocal) return null;

  const model = process.env.LOCAL_AI_MODEL || "phi3:mini";
  const url = process.env.LOCAL_AI_URL || "http://localhost:11434/api/chat";

  console.error("[LLM-QA] Ollama QA:", model);

  const body = {
    model,
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: JSON.stringify(payload) }
    ],
    stream: false
  };

  try {
    const resp = await httpPostJson(url, body, {});
    const text =
      resp?.message?.content ||
      resp?.choices?.[0]?.message?.content ||
      resp?.output ||
      String(resp);

    console.error("[LLM-QA] Ollama QA: ok");
    return text;
  } catch (e) {
    console.error("[LLM-QA] Ollama QA failed:", e.message);
    return null;
  }
}

async function runLLMQA(blocksFilePath) {
  const raw = JSON.parse(fs.readFileSync(blocksFilePath, "utf8"));
  const topic = raw.topic;
  const article = raw;

  const spec = buildArticleSpec(topic);

  const qaPromptPath = path.join(__dirname, "..", "prompts", "qa_blocks_prompt.txt");
  const qaPrompt = fs.readFileSync(qaPromptPath, "utf8");

  const payload = {
    mode: "qa_blocks",
    spec,
    article
  };

  const mode = (process.env.LLM_QA_MODE || "none").toLowerCase();
  if (mode === "none") {
    console.error("[LLM-QA] LLM_QA_MODE=none, skipping.");
    return;
  }

  let report = null;
  if (mode === "local") {
    report = await callOllamaQA(qaPrompt, payload);
  } else if (mode === "deepseek") {
    report = await callDeepSeekQA(qaPrompt, payload);
  } else {
    console.error(`[LLM-QA] Unknown LLM_QA_MODE=${mode}, skipping.`);
    return;
  }

  if (!report || !String(report).trim()) {
    console.error("[LLM-QA] Empty QA report, nothing to save.");
    return;
  }

  const baseName = path.basename(blocksFilePath).replace(/\.blocks\.json$/," ");
  const outPath = path.join(__dirname, "..", "tmp", `${baseName}.qa.llm.txt`);

  fs.writeFileSync(outPath, String(report), "utf8");
  console.error(`[LLM-QA] Report saved → ${outPath}`);
}

// CLI: node scripts/qa_llm_blocks.js tmp/topic.blocks.json
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    console.error("Usage: node scripts/qa_llm_blocks.js tmp/topic.blocks.json");
    process.exit(1);
  }
  runLLMQA(args[0]).catch((e) => {
    console.error("[LLM-QA] Fatal error:", e);
    process.exit(1);
  });
}
EOF

# ------------------------------------------------------------------------------
# 4. Обновлённый debug_run_topic.sh с шагом LLM-QA
# ------------------------------------------------------------------------------

cat > scripts/debug_run_topic.sh << 'EOF'
#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: scripts/debug_run_topic.sh data/topic.json"
  exit 1
fi

TOPIC_FILE="$1"
BASENAME="$(basename "$TOPIC_FILE" .json)"

mkdir -p tmp logs

echo "=== DEBUG: GEN + LLM-QA + (опционально QA/VALIDATE) for topic $TOPIC_FILE ==="

# 0) RL-пайплайн (можно выключить, если мешает)
if [[ -f scripts/rl_ingest_metrics.js ]]; then
  echo "[0/4] RL ingest metrics..."
  node scripts/rl_ingest_metrics.js || true
fi
if [[ -f scripts/rl_update_strategy.js ]]; then
  echo "[0/4] RL update strategy..."
  node scripts/rl_update_strategy.js || true
fi

# 1) Генерация блоков
echo "[1/4] Generating article blocks..."
node scripts/gen_article_blocks.js --topic-file "$TOPIC_FILE" > "tmp/${BASENAME}.blocks.json"
echo "Blocks JSON → tmp/${BASENAME}.blocks.json"

# 2) LLM-QA (DeepSeek/Ollama) по блокам
if [[ -f scripts/qa_llm_blocks.js ]]; then
  echo "[2/4] Running LLM-QA on blocks (LLM_QA_MODE)..."
  node scripts/qa_llm_blocks.js "tmp/${BASENAME}.blocks.json" || true
else
  echo "[2/4] LLM-QA skipped (scripts/qa_llm_blocks.js not found)"
fi

# 3) Локальный QA-скрипт (если существует)
if [[ -f scripts/qa_page.js ]]; then
  echo "[3/4] Running QA (local rules)..."
  MONSTER_TOPIC="$BASENAME" MONSTER_STAGE="debug" \
    node scripts/qa_page.js < "tmp/${BASENAME}.blocks.json" > "tmp/${BASENAME}.qa.out" 2>"tmp/${BASENAME}.qa.log" || true
  echo "QA → tmp/${BASENAME}.qa.out, log → tmp/${BASENAME}.qa.log"
else
  echo "[3/4] QA skipped (scripts/qa_page.js not found)"
fi

# 4) Validate (старый VIN-валидатор может ругаться на новый формат/длину)
if [[ -f scripts/validate_page.js ]]; then
  echo "[4/4] Running validate_page (old VIN-flow, may fail)..."
  node scripts/validate_page.js tmp/"${BASENAME}.blocks.json" | tee "tmp/${BASENAME}.validate.out" || true
  echo "Validate output → tmp/${BASENAME}.validate.out"
else
  echo "[4/4] Validation skipped (scripts/validate_page.js not found)"
fi

echo "=== DEBUG DONE for topic $BASENAME ==="
EOF

chmod +x scripts/debug_run_topic.sh

# ------------------------------------------------------------------------------
# 5. Итог
# ------------------------------------------------------------------------------

echo
echo "Монстр 8.0: связка DeepSeek + Ollama + LLM-QA обновлена."
echo
echo "Ключевые переменные окружения:"
echo "  export DEEPSEEK_API_KEY=\"...\""
echo "  export DEEPSEEK_MODEL=\"deepseek-chat\"          # при необходимости"
echo "  export USE_LOCAL_AI=1                           # чтобы Ollama работала"
echo "  export LOCAL_AI_MODEL=\"phi3:mini\"             # или другая локальная модель"
echo "  export LOCAL_AI_URL=\"http://localhost:11434/api/chat\"  # при отличном эндпоинте"
echo
echo "Режимы генерации:"
echo "  export LLM_GEN_MODE=\"prod\"      # DeepSeek → Ollama → stub (дефолт)"
echo "  export LLM_GEN_MODE=\"local\"     # только Ollama"
echo "  export LLM_GEN_MODE=\"ensemble\"  # оба, приоритет DeepSeek"
echo
echo "Режимы LLM-QA:"
echo "  export LLM_QA_MODE=\"none\"       # выключено (по умолчанию)"
echo "  export LLM_QA_MODE=\"local\"      # QA через Ollama"
echo "  export LLM_QA_MODE=\"deepseek\"   # QA через DeepSeek"
echo "  export LLM_QA_STRICT=\"0\"        # пока только отчёт, без автопатчей"
echo
echo "Запуск пайплайна для тестового топика:"
echo "  scripts/debug_run_topic.sh data/topic.dmv_ca_title_types_checklist_es_mx_us.json"

