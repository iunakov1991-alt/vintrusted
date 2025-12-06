const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const { buildArticleSpec } = require("./build_article_spec.js");

// Helper: generic JSON POST (supports HTTPS and HTTP based on URL)
function httpPostJson(urlStr, payload, headers = {}, timeoutMs = 120000) {
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
      },
      timeout: timeoutMs
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
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Request timeout after ${timeoutMs}ms`));
    });

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

  console.error("[LLM] DeepSeek: calling API...");
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
    const timeout = Number(process.env.DEEPSEEK_TIMEOUT_MS || 120000);
    const resp = await httpPostJson(baseUrl, payload, { Authorization: `Bearer ${key}` }, timeout);
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

  console.error("[LLM] Ollama: calling API...");
  const baseUrl = process.env.LOCAL_AI_URL || "http://localhost:11434/api/chat";
  const payload = {
    model: process.env.LOCAL_AI_MODEL || "phi3:latest",
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
    const timeout = Number(process.env.LOCAL_AI_TIMEOUT_MS || 90000);
    const resp = await httpPostJson(baseUrl, payload, {}, timeout);
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
    console.error("[LLM] local mode: calling Ollama only...");
    const localText = await callOllama(corePrompt, spec);
    const picked = pickNonEmpty(localText);
    if (picked) {
      console.error("[LLM] local: Ollama succeeded");
      return picked;
    }
    console.error("[LLM] local mode: Ollama empty/too short, using stub.");
    return spec.blocks.map((block, idx) => makeStubBlock(spec, block, idx)).join(spec.delim);
  }

  if (mode === "ensemble") {
    console.error("[LLM] ensemble mode: calling DeepSeek and Ollama in parallel...");
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
  console.error("[LLM] prod mode: trying DeepSeek first...");
  const ds = await callDeepSeek(corePrompt, spec);
  const pickedDs = pickNonEmpty(ds);
  if (pickedDs) {
    console.error("[LLM] prod: DeepSeek succeeded");
    return pickedDs;
  }

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
    // Убеждаемся, что выводим валидный JSON без лишних символов
    const jsonOutput = JSON.stringify(res, null, 2);
    process.stdout.write(jsonOutput);
    // Добавляем перевод строки в конце для корректного завершения
    if (!jsonOutput.endsWith('\n')) {
      process.stdout.write('\n');
    }
  })();
}

module.exports = {
  generateArticleBlocks,
  llmGenerate,
  callDeepSeek,
  callOllama
};
