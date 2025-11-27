// Lightweight AI client for DeepSeek (primary) + Groq/Grok (secondary).
// Ничего не знает про SEO-домены, только про "дать текст по промпту".

// Загружаем .env если доступен
try {
  require("dotenv").config();
} catch (e) {
  // dotenv не установлен или не нужен
}

const DEFAULT_PRIMARY = process.env.AI_PROVIDER_PRIMARY || "deepseek";
const DEFAULT_SECONDARY = process.env.AI_PROVIDER_SECONDARY || "groq";

const PROVIDERS = {
  deepseek: {
    name: "deepseek",
    apiKeyEnv: "DEEPSEEK_API_KEY",
    endpoint: (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com") + "/v1/chat/completions",
    defaultModel: process.env.DEEPSEEK_MODEL || process.env.DEEPSEEK_MODEL_WRITER || "deepseek-chat",
  },
  groq: {
    name: "groq",
    apiKeyEnv: "GROQ_API_KEY",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    defaultModel: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  },
  grok: {
    name: "grok",
    apiKeyEnv: "GROK_API_KEY",
    endpoint: "https://api.x.ai/v1/chat/completions",
    defaultModel: process.env.GROK_MODEL || "grok-3-mini",
  },
};

function getProviderConfig(name) {
  const key = name && PROVIDERS[name] ? name : DEFAULT_PRIMARY;
  const cfg = PROVIDERS[key];
  if (!cfg) {
    throw new Error(`AI client: unknown provider "${name}" and no valid default.`);
  }
  const apiKey = process.env[cfg.apiKeyEnv];
  if (!apiKey) {
    throw new Error(
      `AI client: missing API key for provider "${cfg.name}" (env ${cfg.apiKeyEnv})`
    );
  }
  return { ...cfg, apiKey };
}

/**
 * Low-level call to provider.
 * params: {
 *   provider?: "deepseek" | "groq" | "grok";
 *   model?: string;
 *   systemPrompt?: string;
 *   userPrompt: string;
 *   maxTokens?: number;
 *   temperature?: number;
 * }
 */
async function callAI(params) {
  const {
    provider,
    model,
    systemPrompt,
    userPrompt,
    maxTokens = 1200,
    temperature = 0.4,
  } = params || {};

  const cfg = getProviderConfig(provider);
  const usedModel = model || cfg.defaultModel;

  const body = {
    model: usedModel,
    messages: [],
    temperature,
    max_tokens: maxTokens,
  };

  if (systemPrompt) {
    body.messages.push({ role: "system", content: systemPrompt });
  }
  body.messages.push({ role: "user", content: userPrompt });

  const res = await fetch(cfg.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `AI client: ${cfg.name} HTTP ${res.status} ${res.statusText} — ${text}`
    );
  }

  const json = await res.json();
  const choice = json.choices && json.choices[0];
  const content =
    choice && choice.message && choice.message.content
      ? choice.message.content
      : "";

  return {
    provider: cfg.name,
    model: usedModel,
    raw: json,
    text: typeof content === "string" ? content : JSON.stringify(content),
  };
}

/**
 * High-level helper:
 *  - Пытается PRIMARY
 *  - Если ошибка — пробует SECONDARY
 */
async function callWithFallback(params) {
  const primaryName = DEFAULT_PRIMARY;
  const secondaryName = DEFAULT_SECONDARY;

  try {
    return await callAI({ ...params, provider: primaryName });
  } catch (err) {
    console.warn(
      `[AI] primary "${primaryName}" failed: ${err.message || err}`
    );
    if (!secondaryName || secondaryName === primaryName) {
      throw err;
    }
    console.warn(`[AI] trying secondary "${secondaryName}"...`);
    return await callAI({ ...params, provider: secondaryName });
  }
}

module.exports = {
  callAI,
  callWithFallback,
  PROVIDERS,
};

