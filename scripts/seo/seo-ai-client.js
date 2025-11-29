
const fs = require('fs');

const path = require('path');

const crypto = require('crypto');

const { log } = require('./logger');



const CACHE_PATH = path.join(process.cwd(), 'data/seo/ai-cache.jsonl');



function hashKey(str) {

  return crypto.createHash('sha1').update(str).digest('hex');

}



function readCache() {

  if (!fs.existsSync(CACHE_PATH)) return new Map();

  const map = new Map();

  const lines = fs.readFileSync(CACHE_PATH, 'utf8').split('\n').filter(Boolean);

  for (const line of lines) {

    try {

      const obj = JSON.parse(line);

      if (obj.key && obj.text) map.set(obj.key, obj.text);

    } catch (_e) {}

  }

  return map;

}



function appendCache(key, text) {

  try {

    fs.appendFileSync(CACHE_PATH, JSON.stringify({ key, text }) + '\n');

  } catch (e) {

    log('AI', `Cache write error: ${e.message}`);

  }

}



async function generateText(prompt, { lang = 'en', intent = 'generic', maxTokens = 600 } = {}) {

  const enableAI = process.env.SEO_ENABLE_AI === '1' || process.env.SEO_ENABLE_AI === 'true';

  const key = hashKey(`${lang}|${intent}|${prompt}`);

  const cache = readCache();

  if (cache.has(key)) {

    return cache.get(key);

  }



  if (!enableAI || !process.env.SEO_AI_API_KEY) {

    const fallback = `This section provides general, non-personalized information about ${intent} in the context of vehicle history reports. It explains why this check matters, what is usually included, and how drivers can use this information to make safer decisions when buying or owning a vehicle in the ${lang.toUpperCase()} locale. No specific VIN data is inferred or fabricated.`;

    appendCache(key, fallback);

    return fallback;

  }



  // TODO: здесь Cursor подключит реального AI-провайдера (DeepSeek/Grok).

  const text = `AI-generated content placeholder for intent "${intent}" (lang=${lang}). Replace this with real provider integration.`;

  appendCache(key, text);

  return text;

}



module.exports = { generateText };

