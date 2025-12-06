const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const { buildArticleSpec } = require("./build_article_spec.js");

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
    const timeout = Number(process.env.DEEPSEEK_QA_TIMEOUT_MS || 120000);
    const resp = await httpPostJson(baseUrl, body, { Authorization: `Bearer ${key}` }, timeout);
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
    model: process.env.LOCAL_AI_MODEL || "phi3:latest",
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
    const timeout = Number(process.env.LOCAL_AI_QA_TIMEOUT_MS || 90000);
    const resp = await httpPostJson(baseUrl, body, {}, timeout);
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
