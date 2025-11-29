
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

// Ленивая подгрузка кеша

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

  const systemPrompt = `You are an SEO content generator for a VIN history report website. You must NOT fabricate specific accident dates, owners, odometer values or any personal data. Write safe, generic, non-personalized explanations only.`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens || 600,
        temperature: 0.4
      })
    });

    if (!res.ok) {
      log('AI', `Groq HTTP error: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || null;
    if (text) {
      log('AI', `Generated text using Groq (${text.length} chars)`);
      return text.trim();
    }
    return null;
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

  const systemPrompt = `You are an SEO content generator for a VIN history report website. You must NOT fabricate specific accident dates, owners, odometer values or any personal data. Write safe, generic, non-personalized explanations only.`;

  try {
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens || 600,
        temperature: 0.4
      })
    });

    if (!res.ok) {
      log('AI', `DeepSeek HTTP error: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || null;
    if (text) {
      log('AI', `Generated text using DeepSeek (${text.length} chars)`);
      return text.trim();
    }
    return null;
  } catch (e) {
    log('AI', `DeepSeek request error: ${e.message}`);
    return null;
  }
}

async function callAiProvider(prompt, { lang, intent, maxTokens }) {
  // Пробуем сначала Groq (быстрый), потом DeepSeek (fallback)
  let text = await callGroqAPI(prompt, { lang, intent, maxTokens });
  
  if (!text) {
    log('AI', 'Groq failed, trying DeepSeek...');
    text = await callDeepSeekAPI(prompt, { lang, intent, maxTokens });
  }
  
  return text;
}

/**

 * generateText(prompt, { lang, intent, maxTokens })

 *

 * Логика:

 *  1. Проверяет кеш (в памяти).

 *  2. Если AI выключен (config.enableAI=false или ENV/ключа нет) — fallback.

 *  3. Если всё ок — использует Groq/DeepSeek API.

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

  // Проверяем наличие ключей Groq или DeepSeek

  const hasApiKeys = !!(process.env.GROQ_API_KEY || process.env.DEEPSEEK_API_KEY);

  const effectiveAI = configEnableAI && envEnable && hasApiKeys;

  // Если AI выключен или нет ключа — безопасный fallback

  if (!effectiveAI) {

    const fallback = `This section provides general, non-personalized information about ${intent} in the context of vehicle history reports. It explains why this check matters, what is usually included, and how drivers can use this information to make safer decisions when buying or owning a vehicle in the ${lang.toUpperCase()} locale. No specific VIN data is inferred or fabricated.`;

    appendCache(key, fallback);

    return fallback;

  }

  // Используем реальные API (Groq с fallback на DeepSeek)

  let text = await callAiProvider(prompt, { lang, intent, maxTokens });

  if (!text) {

    const fallback = `This section provides general, non-personalized information about ${intent} in the context of vehicle history reports. It explains why this check matters, what is usually included, and how drivers can use this information to make safer decisions when buying or owning a vehicle in the ${lang.toUpperCase()} locale. No specific VIN data is inferred or fabricated.`;

    text = fallback;

  }

  appendCache(key, text);

  return text;

}

module.exports = { generateText };

