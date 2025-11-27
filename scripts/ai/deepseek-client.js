// scripts/ai/deepseek-client.js
// Универсальный клиент DeepSeek, совместимый с OpenAI SDK (CommonJS)

const OpenAI = require("openai");

const apiKey = process.env.DEEPSEEK_API_KEY;
const baseURL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
const writerModel = process.env.DEEPSEEK_MODEL_WRITER || "deepseek-chat";
const reasonerModel = process.env.DEEPSEEK_MODEL_REASONER || "deepseek-reasoner";

if (!apiKey) {
  console.warn("[DEEPSEEK] DEEPSEEK_API_KEY не задан — AI-контент работать не будет.");
}

const deepseekClient = new OpenAI({
  apiKey,
  baseURL,
});

/**
 * Базовый вызов DeepSeek chat/completions
 */
async function callDeepseekChat({
  messages,
  model = writerModel,
  maxTokens = 2048,
  temperature = 0.5,
}) {
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY не задан в окружении.");
  }

  const response = await deepseekClient.chat.completions.create({
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
    stream: false,
  });

  const choice = response.choices?.[0];
  return choice?.message?.content || "";
}

/**
 * Reasoning-модель (deepseek-reasoner) для сложных задач:
 * анализ GSC, генерация планов тестов, оптимизация шаблонов и т.п.
 */
async function callDeepseekReasoner({
  messages,
  maxTokens = 4096,
  temperature = 0.3,
}) {
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY не задан в окружении.");
  }

  const response = await deepseekClient.chat.completions.create({
    model: reasonerModel,
    messages,
    max_tokens: maxTokens,
    temperature,
    stream: false,
  });

  const choice = response.choices?.[0];
  return choice?.message?.content || "";
}

module.exports = {
  deepseekClient,
  callDeepseekChat,
  callDeepseekReasoner,
};

