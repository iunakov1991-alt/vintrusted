#!/usr/bin/env bash

# ============================================================================
# MONSTER 8.0 — FULL STACK SETUP
# ----------------------------------------------------------------------------
# 1. Creates project directory structure and core prompt
# 2. Installs semantic configs (zones, brands, states, audiences, block profiles)
# 3. Provides dual-LLM generator (DeepSeek + Ollama) with prod/local/ensemble modes
# 4. Adds ArticleSpec builder, smart validator, RL stubs, LLM-QA, debug runner
# 5. Documents each section with inline comments for maintenance
# 6. After running, the project can generate real content using both LLM stacks
# ============================================================================

set -euo pipefail

ROOT_DIR="$(pwd)"

section() {
  printf '\n###############################################################################\n'
  printf '%s\n' "$1"
  printf '###############################################################################\n'
}

ok() {
  printf '[OK] %s\n' "$1"
}

section "0. BASE DIRECTORIES"
mkdir -p "${ROOT_DIR}/prompts" "${ROOT_DIR}/config" "${ROOT_DIR}/scripts" \
         "${ROOT_DIR}/data" "${ROOT_DIR}/tmp" "${ROOT_DIR}/logs" \
         "${ROOT_DIR}/public/static-pages"
ok "Created base directory structure"

section "1. CORE PROMPT — ARTICLE BLOCKS CONTRACT"
cat > "${ROOT_DIR}/prompts/core_prompt_blocks.txt" <<'EOF'
You are a deterministic multi-block content generator.

INPUT FORMAT
- You receive a JSON object with the following fields:
  - "topic": semantic description (zone, type, dimensions, audience, language)
  - "blocks": array of block specs (id, role, length, style, intents, must_include_terms)
  - "output_format": currently "TEXT_WITH_DELIMS"
  - "delim": delimiter string separating blocks in the response

BLOCK REQUIREMENTS
- Respect length {min, max}; stay within range without padding fluff
- No block-level headings such as "Introduction" or "Conclusion"
- Avoid repeating full sentences across blocks
- Use dense, domain-accurate automotive / DMV / auction language
- Insert all must_include_terms or explain if a term is contextually invalid

OUTPUT FORMAT
- Return each block in order, separated ONLY by the provided delimiter
- Do not add extra wrappers (no JSON, no numbering, no quotes)

ERROR HANDLING
- If the spec is malformed, respond with: ERROR: INVALID SPEC
EOF
ok "core_prompt_blocks.txt installed"

section "2. SEMANTIC ZONES CONFIG (LEVELS 0–5)"
cat > "${ROOT_DIR}/config/semantic_zones.json" <<'EOF'
{
  "zones": {
    "vin_identity": ["VIN structure", "WMI", "decoder", "plant codes", "fraud signals"],
    "dmv_titles": ["title types", "transfer", "registration", "salvage to rebuilt", "emissions", "lien"],
    "auctions": ["Copart", "IAAI", "Manheim", "ACV", "damage codes", "bidding", "inspection"],
    "used_fraud": ["odometers", "frame", "flood", "fire", "airbag", "dealer scams", "state flipping"],
    "brand_model": ["brand encyclopedia", "generations", "common issues", "recalls", "maintenance"],
    "tech_insurance": ["recalls", "TSBs", "insurance risk", "theft rates", "market value"]
  }
}
EOF
ok "semantic_zones.json written"

section "3. BRANDS & MODELS (EXCLUDING CHINESE / SUPERCAR SEGMENTS)"
cat > "${ROOT_DIR}/config/brands_models.json" <<'EOF'
{
  "brands": {
    "Toyota": ["Corolla", "Camry", "RAV4", "Highlander", "Tacoma", "Tundra"],
    "Honda": ["Civic", "Accord", "CR-V", "Pilot", "Odyssey", "Fit"],
    "Ford": ["F-150", "Escape", "Explorer", "Mustang", "Fusion"],
    "Chevrolet": ["Silverado", "Equinox", "Malibu", "Tahoe"],
    "Nissan": ["Altima", "Sentra", "Rogue", "Pathfinder"],
    "Hyundai": ["Elantra", "Sonata", "Tucson", "Santa Fe"],
    "Kia": ["Forte", "Optima", "Sportage", "Sorento"],
    "Subaru": ["Impreza", "Outback", "Forester"],
    "Mazda": ["Mazda3", "Mazda6", "CX-5"],
    "Volkswagen": ["Jetta", "Passat", "Tiguan"],
    "BMW": ["3 Series", "5 Series", "X3", "X5"],
    "Mercedes-Benz": ["C-Class", "E-Class", "GLC"],
    "Audi": ["A3", "A4", "Q5"],
    "Volvo": ["S60", "XC60", "XC90"],
    "Jeep": ["Wrangler", "Grand Cherokee"],
    "Dodge": ["Charger", "Durango"],
    "Chrysler": ["300", "Pacifica"]
  }
}
EOF
ok "brands_models.json ready"

section "4. US STATES LIST"
cat > "${ROOT_DIR}/config/us_states.json" <<'EOF'
{
  "states": [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
    "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
    "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
    "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
    "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
    "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
    "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
    "Wisconsin", "Wyoming"
  ]
}
EOF
ok "us_states.json populated"

section "5. AUDIENCE SEGMENTS (INCL. MX/US)"
cat > "${ROOT_DIR}/config/audience_segments.json" <<'EOF'
{
  "audience": {
    "us_general": {
      "language": "en",
      "needs": ["DMV", "VIN", "used cars", "titles"],
      "notes": ["expects official DMV terminology", "prefers practical checklists"]
    },
    "us_mexican": {
      "language": "es",
      "needs": ["DMV CA/TX/NV/AZ", "transfer", "registration", "insurance", "VIN"],
      "notes": ["highlight bilingual terminology", "include import/export caveats"]
    }
  }
}
EOF
ok "audience_segments.json created"

section "6. BLOCK PROFILES (CORE BUILDING BLOCKS)"
cat > "${ROOT_DIR}/config/block_profiles.json" <<'EOF'
{
  "blocks": {
    "hero": {
      "role": "hero",
      "length": { "min": 150, "max": 230 },
      "style": "summary",
      "default_intents": ["scope", "why_it_matters"]
    },
    "context_legal": {
      "role": "context",
      "length": { "min": 220, "max": 320 },
      "style": "tech_legal",
      "default_intents": ["legal_context", "definitions"]
    },
    "step_by_step": {
      "role": "guide",
      "length": { "min": 260, "max": 360 },
      "style": "practical",
      "default_intents": ["steps", "workflow"]
    },
    "mistakes": {
      "role": "guide",
      "length": { "min": 200, "max": 300 },
      "style": "practical",
      "default_intents": ["common_mistakes", "warnings"]
    },
    "fees_taxes": {
      "role": "analytic",
      "length": { "min": 180, "max": 260 },
      "style": "analytic",
      "default_intents": ["fees", "taxes", "hidden_costs"]
    },
    "legal_state": {
      "role": "context",
      "length": { "min": 260, "max": 360 },
      "style": "tech_legal",
      "default_intents": ["statutes", "state_rules"]
    },
    "inspection_overview": {
      "role": "context",
      "length": { "min": 220, "max": 320 },
      "style": "encyclopedia",
      "default_intents": ["inspection_basics"]
    },
    "paperwork_vin_history": {
      "role": "guide",
      "length": { "min": 200, "max": 280 },
      "style": "practical",
      "default_intents": ["paperwork", "vin_history", "reports"]
    },
    "fraud_detection": {
      "role": "context",
      "length": { "min": 240, "max": 320 },
      "style": "tech_legal",
      "default_intents": ["fraud_patterns", "dealer_schemes"]
    },
    "market_value": {
      "role": "analytic",
      "length": { "min": 200, "max": 280 },
      "style": "analytic",
      "default_intents": ["value_curve", "depreciation"]
    },
    "insurance_risk": {
      "role": "analytic",
      "length": { "min": 200, "max": 280 },
      "style": "analytic",
      "default_intents": ["insurance", "safety"]
    },
    "faq": {
      "role": "faq",
      "length": { "min": 220, "max": 320 },
      "style": "practical",
      "default_intents": ["user_questions"]
    }
  }
}
EOF
ok "block_profiles.json deployed"

section "7. ARTICLE TYPES TO BLOCK MAPPING"
cat > "${ROOT_DIR}/config/article_types.json" <<'EOF'
{
  "article_types": {
    "dmv_state_guide": {
      "label": "DMV state checklist",
      "default_blocks": ["hero", "context_legal", "step_by_step", "mistakes", "fees_taxes", "faq"],
      "recommended_length": { "min": 1500, "max": 2300 }
    },
    "dmv_legal_article": {
      "label": "DMV legal deep dive",
      "default_blocks": ["hero", "legal_state", "fraud_detection", "fees_taxes", "faq"],
      "recommended_length": { "min": 1600, "max": 2400 }
    },
    "auction_guide": {
      "label": "Auction buyer guide",
      "default_blocks": ["hero", "inspection_overview", "paperwork_vin_history", "fraud_detection", "faq"],
      "recommended_length": { "min": 1500, "max": 2200 }
    },
    "brand_encyclopedia": {
      "label": "Brand overview",
      "default_blocks": ["hero", "market_value", "fraud_detection", "insurance_risk", "faq"],
      "recommended_length": { "min": 1700, "max": 2400 }
    }
  }
}
EOF
ok "article_types.json configured"

section "8. DUAL LLM GENERATOR (DeepSeek + Ollama)"
cat > "${ROOT_DIR}/scripts/gen_article_blocks.js" <<'EOF'
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const { buildArticleSpec } = require("./build_article_spec.js");

// Helper: generic JSON POST (supports HTTPS and HTTP based on URL)
function httpPostJson(urlStr, payload, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const data = JSON.stringify(payload);
    const client = url.protocol === "https:" ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: url.pathname + (url.search || ""),
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
          resolve(JSON.parse(body));
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

function estimateMaxTokens(spec) {
  const words = spec.blocks.reduce((sum, block) => {
    const length = block.length || {};
    if (length.min && length.max) {
      return sum + Math.round((length.min + length.max) / 2);
    }
    if (length.max) {
      return sum + Math.round(length.max * 0.8);
    }
    return sum + 250;
  }, 0);
  const approxTokens = Math.ceil(words * 1.3);
  return Math.min(Math.max(approxTokens, 600), 7000);
}

function makeStubBlock(spec, block, index) {
  return (
    `STUB BLOCK ${index + 1} (${block.id} / ${block.role}) for topic ${spec.topic.topic_id}.\n` +
    `This placeholder keeps the pipeline alive without a real LLM.\n` +
    `Provide DEEPSEEK_API_KEY or enable USE_LOCAL_AI to replace this stub.\n`
  );
}

async function callDeepSeek(corePrompt, spec) {
  const key = process.env.DEEPSEEK_API_KEY?.trim();
  if (!key) return null;

  const baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1/chat/completions";
  const payload = {
    model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
    temperature: Number(process.env.DEEPSEEK_TEMPERATURE ?? 0.3),
    max_tokens: Number(process.env.DEEPSEEK_MAX_TOKENS ?? estimateMaxTokens(spec)),
    messages: [
      { role: "system", content: corePrompt },
      { role: "user", content: JSON.stringify(spec) }
    ]
  };

  try {
    const resp = await httpPostJson(baseUrl, payload, { Authorization: `Bearer ${key}` });
    const content =
      resp?.choices?.[0]?.message?.content ||
      resp?.choices?.[0]?.delta?.content ||
      resp?.message?.content ||
      resp?.output ||
      null;

    if (typeof content === "string" && content.trim()) {
      console.error("[LLM] DeepSeek provider responded successfully.");
      return content;
    }
    console.error("[LLM] DeepSeek response empty, falling back.");
  } catch (err) {
    console.error("[LLM] DeepSeek call failed:", err.message);
  }

  return null;
}

async function callOllama(corePrompt, spec) {
  const useLocal = process.env.USE_LOCAL_AI === "1" || process.env.USE_LOCAL_AI === "true";
  if (!useLocal) return null;

  const baseUrl = process.env.LOCAL_AI_URL || "http://localhost:11434/api/chat";
  const payload = {
    model: process.env.LOCAL_AI_MODEL || "phi3:mini",
    messages: [
      { role: "system", content: corePrompt },
      { role: "user", content: JSON.stringify(spec) }
    ],
    options: {
      temperature: Number(process.env.LOCAL_AI_TEMPERATURE ?? 0.4)
    },
    stream: false
  };

  try {
    const resp = await httpPostJson(baseUrl, payload);
    const content =
      resp?.message?.content ||
      (Array.isArray(resp?.messages) ? resp.messages.map((m) => m.content).join("\n") : null) ||
      resp?.response ||
      resp?.output ||
      null;

    if (typeof content === "string" && content.trim()) {
      console.error("[LLM] Ollama provider responded successfully.");
      return content;
    }
    console.error("[LLM] Ollama response empty, falling back.");
  } catch (err) {
    console.error("[LLM] Ollama call failed:", err.message);
  }

  return null;
}

async function llmGenerate(corePrompt, spec) {
  const mode = (process.env.LLM_GEN_MODE || "prod").toLowerCase();

  function pickNonEmpty(...candidates) {
    for (const candidate of candidates) {
      if (!candidate) continue;
      const trimmed = String(candidate).trim();
      if (!trimmed) continue;
      if (trimmed.split(/\s+/).length < 40) continue;
      return trimmed;
    }
    return null;
  }

  if (mode === "local") {
    const localText = await callOllama(corePrompt, spec);
    const picked = pickNonEmpty(localText);
    if (picked) return picked;
    console.error("[LLM] local mode: Ollama empty/too short, using stub.");
    return spec.blocks.map((block, idx) => makeStubBlock(spec, block, idx)).join(spec.delim);
  }

  if (mode === "ensemble") {
    const [deepseekRes, ollamaRes] = await Promise.allSettled([
      callDeepSeek(corePrompt, spec),
      callOllama(corePrompt, spec)
    ]);

    const dsText = deepseekRes.status === "fulfilled" ? deepseekRes.value : null;
    const olText = ollamaRes.status === "fulfilled" ? ollamaRes.value : null;
    const picked = pickNonEmpty(dsText, olText);

    if (picked) {
      console.error("[LLM] ensemble: picked non-empty result");
      return picked;
    }

    console.error("[LLM] ensemble: both providers empty/too short, using stub.");
    return spec.blocks.map((block, idx) => makeStubBlock(spec, block, idx)).join(spec.delim);
  }

  // prod mode: DeepSeek → Ollama → stub
  const ds = await callDeepSeek(corePrompt, spec);
  const pickedDs = pickNonEmpty(ds);
  if (pickedDs) return pickedDs;

  console.error("[LLM] prod: DeepSeek empty/too short, trying Ollama...");
  const ol = await callOllama(corePrompt, spec);
  const pickedOl = pickNonEmpty(ol);
  if (pickedOl) return pickedOl;

  console.error("[LLM] prod: both providers failed, using stub.");
  return spec.blocks.map((block, idx) => makeStubBlock(spec, block, idx)).join(spec.delim);
}

function splitBlocksFromOutput(output, delim) {
  return output.split(delim).map((chunk) => chunk.trim()).filter(Boolean);
}

async function generateArticleBlocks(topic) {
  const corePromptPath = path.join(__dirname, "..", "prompts", "core_prompt_blocks.txt");
  const corePrompt = fs.readFileSync(corePromptPath, "utf8");
  const spec = buildArticleSpec(topic);

  const raw = await llmGenerate(corePrompt, spec);
  const parts = splitBlocksFromOutput(raw, spec.delim);

  const blocksOut = {};
  spec.blocks.forEach((block, index) => {
    const content = parts[index];
    blocksOut[block.id] = content && content.trim().length > 0 ? content : makeStubBlock(spec, block, index);
  });

  return {
    topic,
    blocks: blocksOut
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

module.exports = {
  generateArticleBlocks,
  llmGenerate,
  callDeepSeek,
  callOllama
};
EOF
chmod +x "${ROOT_DIR}/scripts/gen_article_blocks.js"
ok "gen_article_blocks.js ready"

section "9. ARTICLE SPEC BUILDER"
cat > "${ROOT_DIR}/scripts/build_article_spec.js" <<'EOF'
const fs = require("fs");
const path = require("path");

function loadJson(relativePath, fallback = {}) {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8"));
  } catch (err) {
    if (fallback !== undefined) return fallback;
    throw err;
  }
}

const articleTypes = loadJson("config/article_types.json", {});
const blockProfiles = loadJson("config/block_profiles.json", {});
const audienceSegments = loadJson("config/audience_segments.json", {});

function resolveArticleType(typeId) {
  const articleType = articleTypes.article_types?.[typeId];
  if (!articleType) {
    throw new Error(`Unknown article type: ${typeId}`);
  }
  return articleType;
}

function collectMustIncludeTerms(topic) {
  const terms = new Set(topic.must_include_terms || []);
  const dims = topic.dimensions || {};
  if (topic.zone) terms.add(topic.zone);
  if (dims.state) terms.add(dims.state);
  if (dims.brand) terms.add(dims.brand);
  terms.add("VIN");
  return Array.from(terms);
}

function applyAudienceBias(block, topic) {
  const audienceId = topic.audience_segment || topic.audience || "us_general";
  const audience = audienceSegments.audience?.[audienceId];
  if (!audience) return block;
  const language = audience.language || "en";
  return {
    ...block,
    language,
    notes: audience.notes || []
  };
}

function buildArticleSpec(topic) {
  if (!topic || !topic.type) {
    throw new Error("Topic must include a 'type' field");
  }
  const articleType = resolveArticleType(topic.type);
  const mustIncludeTerms = collectMustIncludeTerms(topic);

  const blocks = (articleType.default_blocks || []).map((blockId) => {
    const profile = blockProfiles.blocks?.[blockId];
    if (!profile) return null;
    const blockSpec = {
      id: blockId,
      role: profile.role,
      length: profile.length,
      style: profile.style,
      intents: profile.default_intents || [],
      must_include_terms: mustIncludeTerms
    };
    return applyAudienceBias(blockSpec, topic);
  }).filter(Boolean);

  return {
    mode: "article_blocks",
    topic,
    blocks,
    output_format: "TEXT_WITH_DELIMS",
    delim: "\n\n===BLOCK_END===\n\n",
    meta: {
      article_type: topic.type,
      zone: topic.zone || null
    }
  };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const idx = args.indexOf("--topic-file");
  if (idx === -1 || !args[idx + 1]) {
    console.error("Usage: node scripts/build_article_spec.js --topic-file data/topic.json");
    process.exit(1);
  }
  const topicPath = args[idx + 1];
  const topic = JSON.parse(fs.readFileSync(topicPath, "utf8"));
  const spec = buildArticleSpec(topic);
  process.stdout.write(JSON.stringify(spec, null, 2));
}

module.exports = { buildArticleSpec };
EOF
chmod +x "${ROOT_DIR}/scripts/build_article_spec.js"
ok "build_article_spec.js installed"

section "10. VALIDATOR (REPLACES LEGACY VIN CHECK)"
cat > "${ROOT_DIR}/scripts/validate_blocks.js" <<'EOF'
const fs = require("fs");

function wordCount(text = "") {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function evaluateBlock(id, text) {
  const count = wordCount(text);
  if (count === 0) {
    return { id, severity: "FATAL", reason: "Block empty" };
  }
  if (count < 80) {
    return { id, severity: "FATAL", reason: `Block too short (${count} words)` };
  }
  if (count < 140) {
    return { id, severity: "MAJOR", reason: `Block weak (${count} words)` };
  }
  if (!/[.!?]$/.test(text.trim())) {
    return { id, severity: "MINOR", reason: "Block missing terminal punctuation" };
  }
  return { id, severity: "OK", reason: "" };
}

function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("Usage: node scripts/validate_blocks.js <blocks.json>");
    process.exit(1);
  }

  const payload = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const blocks = payload.blocks || {};

  let totals = { FATAL: 0, MAJOR: 0, MINOR: 0, OK: 0 };
  let totalWords = 0;
  const findings = [];

  for (const [blockId, text] of Object.entries(blocks)) {
    totalWords += wordCount(text);
    const result = evaluateBlock(blockId, text || "");
    totals[result.severity] = (totals[result.severity] || 0) + 1;
    if (result.severity !== "OK") {
      findings.push(`${result.severity}: ${blockId} -> ${result.reason}`);
    }
  }

  if (totalWords < 1200) {
    totals.FATAL += 1;
    findings.push(`FATAL: Total word count too low (${totalWords})`);
  }

  const summary = `SEVERITY: FATAL=${totals.FATAL}; MAJOR=${totals.MAJOR}; MINOR=${totals.MINOR}; WORDCOUNT=${totalWords}`;
  console.log(summary);
  if (findings.length) {
    console.log("DETAILS:");
    findings.forEach((line) => console.log(` - ${line}`));
  }
}

if (require.main === module) {
  main();
}
EOF
chmod +x "${ROOT_DIR}/scripts/validate_blocks.js"
ok "validate_blocks.js ready"
rm -f "${ROOT_DIR}/scripts/validate_page.js"

section "11. LLM-QA HARNESS (DUAL PROVIDER)"
cat > "${ROOT_DIR}/prompts/qa_blocks_prompt.txt" <<'EOF'
You are an article QA reviewer for automotive, DMV, auction, and fraud prevention content.

INPUT STRUCTURE
{
  "mode": "qa_blocks",
  "spec": { ... ArticleSpec ... },
  "article": {
    "topic": { ... },
    "blocks": { "block_id": "text", ... }
  }
}

TASK
- Evaluate content quality (does each block satisfy intents, cover audience needs, avoid filler?)
- Verify structure (all mandatory blocks present, logical flow, no duplication)
- Lightly assess style/length (flag obviously short or generic text)
- Flag legal or factual risks (hallucinated laws, unsafe claims, overconfident promises)
- Ensure VIN is framed as a due-diligence tool, not a miracle solution; CTA must stay neutral

OUTPUT FORMAT
[SUMMARY]
One short paragraph rating the article for this topic/audience.

[BLOCKS]
List each block id with verdict OK / WEAK / BAD and 1–3 concrete recommendations when not OK.

[LEGAL / FACTUAL RISK]
Enumerate risks or write "No obvious legal/factual risks detected."

[VIN / CTA]
Comment on VIN usage and CTA posture.

GENERAL RULES
- Be concise, precise, and practical.
- Avoid marketing tone.
- Do not rewrite the article.
- Output plain text only (no JSON).
EOF
ok "qa_blocks_prompt.txt installed"

cat > "${ROOT_DIR}/scripts/qa_llm_blocks.js" <<'EOF'
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const { buildArticleSpec } = require("./build_article_spec.js");

function httpPostJson(urlStr, payload, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const data = JSON.stringify(payload);
    const client = url.protocol === "https:" ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: url.pathname + (url.search || ""),
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
          resolve(JSON.parse(body));
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
  const key = process.env.DEEPSEEK_API_KEY?.trim();
  if (!key) return null;

  const baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1/chat/completions";
  const body = {
    model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
    temperature: Number(process.env.DEEPSEEK_TEMPERATURE ?? 0.2),
    max_tokens: Number(process.env.DEEPSEEK_MAX_TOKENS ?? 1200),
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: JSON.stringify(payload) }
    ]
  };

  try {
    const resp = await httpPostJson(baseUrl, body, { Authorization: `Bearer ${key}` });
    const content =
      resp?.choices?.[0]?.message?.content ||
      resp?.choices?.[0]?.delta?.content ||
      resp?.message?.content ||
      resp?.output ||
      null;

    if (typeof content === "string" && content.trim()) {
      console.error("[LLM-QA] DeepSeek QA succeeded");
      return content;
    }
    console.error("[LLM-QA] DeepSeek QA empty response");
  } catch (err) {
    console.error("[LLM-QA] DeepSeek QA failed:", err.message);
  }
  return null;
}

async function callOllamaQA(prompt, payload) {
  const useLocal = process.env.USE_LOCAL_AI === "1" || process.env.USE_LOCAL_AI === "true";
  if (!useLocal) return null;

  const baseUrl = process.env.LOCAL_AI_URL || "http://localhost:11434/api/chat";
  const body = {
    model: process.env.LOCAL_AI_MODEL || "phi3:mini",
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: JSON.stringify(payload) }
    ],
    options: {
      temperature: Number(process.env.LOCAL_AI_TEMPERATURE ?? 0.3)
    },
    stream: false
  };

  try {
    const resp = await httpPostJson(baseUrl, body);
    const content =
      resp?.message?.content ||
      (Array.isArray(resp?.messages) ? resp.messages.map((m) => m.content).join("\n") : null) ||
      resp?.response ||
      resp?.output ||
      null;

    if (typeof content === "string" && content.trim()) {
      console.error("[LLM-QA] Ollama QA succeeded");
      return content;
    }
    console.error("[LLM-QA] Ollama QA empty response");
  } catch (err) {
    console.error("[LLM-QA] Ollama QA failed:", err.message);
  }
  return null;
}

async function runLLMQA(blocksFilePath) {
  const blocksPayload = JSON.parse(fs.readFileSync(blocksFilePath, "utf8"));
  const topic = blocksPayload.topic;
  if (!topic) {
    console.error("[LLM-QA] Missing topic inside blocks payload");
    return;
  }
  const spec = buildArticleSpec(topic);
  const qaPromptPath = path.join(__dirname, "..", "prompts", "qa_blocks_prompt.txt");
  const qaPrompt = fs.readFileSync(qaPromptPath, "utf8");

  const payload = {
    mode: "qa_blocks",
    spec,
    article: blocksPayload
  };

  const mode = (process.env.LLM_QA_MODE || "none").toLowerCase();
  if (mode === "none") {
    console.error("[LLM-QA] LLM_QA_MODE=none, skipping");
    return;
  }

  let report = null;
  if (mode === "deepseek") {
    report = await callDeepSeekQA(qaPrompt, payload);
  } else if (mode === "local") {
    report = await callOllamaQA(qaPrompt, payload);
  } else {
    console.error(`[LLM-QA] Unknown LLM_QA_MODE=${mode}, skipping`);
    return;
  }

  if (!report || !String(report).trim()) {
    console.error("[LLM-QA] Empty QA report, nothing saved");
    return;
  }

  const baseName = path.basename(blocksFilePath).replace(/\.blocks\.json$/, "");
  const outPath = path.join(__dirname, "..", "tmp", `${baseName}.qa.llm.txt`);
  fs.writeFileSync(outPath, String(report), "utf8");
  console.error(`[LLM-QA] Report saved → ${outPath}`);
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    console.error("Usage: node scripts/qa_llm_blocks.js tmp/topic.blocks.json");
    process.exit(1);
  }
  runLLMQA(args[0]).catch((err) => {
    console.error("[LLM-QA] Fatal error:", err);
    process.exit(1);
  });
}
EOF
chmod +x "${ROOT_DIR}/scripts/qa_llm_blocks.js"
ok "qa_llm_blocks.js prepared"

section "12. RL MODULE STUBS"
cat > "${ROOT_DIR}/scripts/rl_ingest_metrics.js" <<'EOF'
const fs = require("fs");
const path = require("path");

const outPath = path.join(__dirname, "..", "data", "rl_aggregates.json");
const aggregate = {
  updated_at: new Date().toISOString(),
  records: [],
  aggregates: {
    zones: {},
    article_types: {},
    audience_segments: {}
  }
};
fs.writeFileSync(outPath, JSON.stringify(aggregate, null, 2));
console.error(`[RL] metrics ingested (stub) → ${outPath}`);
EOF
chmod +x "${ROOT_DIR}/scripts/rl_ingest_metrics.js"

cat > "${ROOT_DIR}/scripts/rl_update_strategy.js" <<'EOF'
const fs = require("fs");
const path = require("path");

const strategyPath = path.join(__dirname, "..", "config", "learned_strategy.json");
const strategy = {
  version: "1.0",
  updated_at: new Date().toISOString(),
  article_type_weights: {},
  audience_weights: {},
  language_weights: {},
  notes: "RL stub — provide data/metrics to activate learning"
};
fs.writeFileSync(strategyPath, JSON.stringify(strategy, null, 2));
console.error(`[RL] strategy updated (stub) → ${strategyPath}`);
EOF
chmod +x "${ROOT_DIR}/scripts/rl_update_strategy.js"

section "13. DEBUG RUNNER"
cat > "${ROOT_DIR}/scripts/debug_run_topic.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: scripts/debug_run_topic.sh data/topic.json"
  exit 1
fi

TOPIC_FILE="$1"
BASENAME="$(basename "$TOPIC_FILE" .json)"
mkdir -p tmp logs

echo "=== DEBUG: MONSTER 8.0 pipeline for $TOPIC_FILE ==="

if [[ -f scripts/rl_ingest_metrics.js ]]; then
  echo "[0/4] RL ingest metrics..."
  node scripts/rl_ingest_metrics.js || true
fi
if [[ -f scripts/rl_update_strategy.js ]]; then
  echo "[0/4] RL update strategy..."
  node scripts/rl_update_strategy.js || true
fi

echo "[1/4] Generating ArticleSpec..."
node scripts/build_article_spec.js --topic-file "$TOPIC_FILE" > "tmp/${BASENAME}.spec.json"

echo "[2/4] Generating article blocks (LLM_GEN_MODE=${LLM_GEN_MODE:-prod})..."
node scripts/gen_article_blocks.js --topic-file "$TOPIC_FILE" > "tmp/${BASENAME}.blocks.json"

if [[ -f scripts/qa_llm_blocks.js ]]; then
  echo "[3/4] Running LLM-QA (LLM_QA_MODE=${LLM_QA_MODE:-none})..."
  node scripts/qa_llm_blocks.js "tmp/${BASENAME}.blocks.json" || true
else
  echo "[3/4] LLM-QA skipped"
fi

if [[ -z "${DEEPSEEK_API_KEY:-}" && -z "${USE_LOCAL_AI:-}" ]]; then
  echo "[4/4] Validation skipped (content likely stub)."
else
  echo "[4/4] Validating blocks..."
  node scripts/validate_blocks.js "tmp/${BASENAME}.blocks.json" | tee "tmp/${BASENAME}.validate.out" || true
fi

echo "=== DEBUG DONE for $BASENAME ==="
EOF
chmod +x "${ROOT_DIR}/scripts/debug_run_topic.sh"
ok "debug_run_topic.sh installed"

section "14. SAMPLE TOPIC"
cat > "${ROOT_DIR}/data/topic.dmv_ca_title_types_checklist_es_mx_us.json" <<'EOF'
{
  "topic_id": "dmv_ca_title_types_checklist_es_mx_us",
  "zone": "dmv_titles",
  "type": "dmv_state_guide",
  "language": "es",
  "audience_segment": "us_mexican",
  "dimensions": {
    "state": "CA",
    "dmv_topic": "title_types",
    "format_variant": "checklist",
    "audience": "mx_us"
  },
  "must_include_terms": [
    "California DMV",
    "transfer",
    "salvage",
    "rebuilt",
    "título",
    "VIN"
  ]
}
EOF
ok "Sample topic created"

section "15. CLEANUP & FINAL HINTS"
rm -f "${ROOT_DIR}/scripts/validate_page.js"
rm -f "${ROOT_DIR}/tmp"/*.blocks.json 2>/dev/null || true
rm -f "${ROOT_DIR}/tmp"/*.spec.json 2>/dev/null || true
ok "Legacy validator removed"

cat <<'EOF'
==========================================================================
MONSTER 8.0 — FULL SETUP COMPLETE
==========================================================================
Test pipeline:
  scripts/debug_run_topic.sh data/topic.dmv_ca_title_types_checklist_es_mx_us.json

Enable DeepSeek (cloud):
  export DEEPSEEK_API_KEY="sk-..."
  export LLM_GEN_MODE="prod"

Enable Ollama (local):
  export USE_LOCAL_AI=1
  export LOCAL_AI_MODEL="phi3:mini"
  export LLM_GEN_MODE="local"

Ensemble mode (DeepSeek + Ollama):
  export LLM_GEN_MODE="ensemble"

Optional QA provider:
  export LLM_QA_MODE="deepseek"   # or "local" / "none"

All components are in place — ready for real article generation.
==========================================================================
EOF

