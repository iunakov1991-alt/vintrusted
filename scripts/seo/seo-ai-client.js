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

// Ленивая подгрузка кеша (один read за билд)
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

  const model = process.env.GROQ_MODEL || 'llama-3.1-70b-versatile';
  const url = 'https://api.groq.com/openai/v1/chat/completions';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are an SEO content generator for a VIN history report website. You must NOT fabricate specific accident dates, owners, odometer values or any personal data. Write safe, generic, non-personalized explanations only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: maxTokens || 600,
        temperature: 0.4
      })
    });

    if (!response.ok) {
      log('AI', `Groq API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || null;
    if (!text) {
      log('AI', 'No text in Groq response');
      return null;
    }
    return text.trim();
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

  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
  const url = 'https://api.deepseek.com/v1/chat/completions';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are an SEO content generator for a VIN history report website. You must NOT fabricate specific accident dates, owners, odometer values or any personal data. Write safe, generic, non-personalized explanations only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: maxTokens || 600,
        temperature: 0.4
      })
    });

    if (!response.ok) {
      log('AI', `DeepSeek API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || null;
    if (!text) {
      log('AI', 'No text in DeepSeek response');
      return null;
    }
    return text.trim();
  } catch (e) {
    log('AI', `DeepSeek request error: ${e.message}`);
    return null;
  }
}

async function callAiProvider(prompt, { lang, intent, maxTokens }) {
  // Сначала пробуем Groq (быстрый)
  let text = await callGroqAPI(prompt, { lang, intent, maxTokens });
  if (!text) {
    // Если Groq не сработал, пробуем DeepSeek (fallback)
    log('AI', 'Groq failed, trying DeepSeek...');
    text = await callDeepSeekAPI(prompt, { lang, intent, maxTokens });
  }
  return text;
}

/**
 * generateText(prompt, { lang, intent, maxTokens })
 *
 * 1. Проверяет кеш (в памяти).
 * 2. Если AI выключен (config.enableAI=false или ENV/ключа нет) — fallback.
 * 3. Если включен — использует Groq API с fallback на DeepSeek.
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

  const hasApiKeys = !!(process.env.GROQ_API_KEY || process.env.DEEPSEEK_API_KEY);
  const effectiveAI = configEnableAI && envEnable && hasApiKeys;

  // AI отключен или нет ключа — безопасный fallback (генерик, без фактов о конкретном VIN)
  if (!effectiveAI) {
    const fallback = `This section provides general, non-personalized information about ${intent} in the context of vehicle history reports. It explains why this check matters, what is usually included, and how drivers can use this information to make safer decisions when buying or owning a vehicle in the ${lang.toUpperCase()} locale. No specific VIN data is inferred or fabricated.`;
    appendCache(key, fallback);
    return fallback;
  }

  // Вызываем реальный AI провайдер (Groq → DeepSeek fallback)
  let text = await callAiProvider(prompt, { lang, intent, maxTokens });
  if (!text) {
    // Если оба провайдера не сработали, используем fallback
    text = `This section provides general, non-personalized information about ${intent} in the context of vehicle history reports. It explains why this check matters, what is usually included, and how drivers can use this information to make safer decisions when buying or owning a vehicle in the ${lang.toUpperCase()} locale. No specific VIN data is inferred or fabricated.`;
  }
  appendCache(key, text);
  return text;
}

module.exports = { generateText };
