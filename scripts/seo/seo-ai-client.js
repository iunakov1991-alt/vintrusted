
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



async function callAiProvider(prompt, { lang, intent, maxTokens }) {

  const endpoint = process.env.SEO_AI_ENDPOINT;

  const apiKey = process.env.SEO_AI_API_KEY;

  const model = process.env.SEO_AI_MODEL || 'gpt-4o-mini';



  if (!endpoint || !apiKey) {

    log('AI', 'AI endpoint or API key not configured, using fallback.');

    return null;

  }



  const body = {

    model,

    messages: [

      {

        role: 'system',

        content:

          'You are an SEO content generator for a VIN history report website. ' +

          'You must NOT fabricate specific accident dates, owners, odometer values or any personal data. ' +

          'Write safe, generic, non-personalized explanations only.'

      },

      {

        role: 'user',

        content: prompt

      }

    ],

    max_tokens: maxTokens || 600,

    temperature: 0.4

  };



  try {

    const res = await fetch(endpoint, {

      method: 'POST',

      headers: {

        'Authorization': `Bearer ${apiKey}`,

        'Content-Type': 'application/json'

      },

      body: JSON.stringify(body)

    });



    if (!res.ok) {

      log('AI', `HTTP error: ${res.status}`);

      return null;

    }



    const data = await res.json();

    const text =

      data.choices?.[0]?.message?.content ||

      data.choices?.[0]?.text ||

      null;



    if (!text) {

      log('AI', 'No text in AI response, using fallback.');

      return null;

    }



    return text.trim();

  } catch (e) {

    log('AI', `Request error: ${e.message}`);

    return null;

  }

}



async function generateText(prompt, { lang = 'en', intent = 'generic', maxTokens = 600 } = {}) {

  const enableAI = process.env.SEO_ENABLE_AI === '1' || process.env.SEO_ENABLE_AI === 'true';

  const key = hashKey(`${lang}|${intent}|${prompt}`);

  const cache = readCache();

  if (cache.has(key)) {

    return cache.get(key);

  }



  const fallback = `This section provides general, non-personalized information about ${intent} in the context of vehicle history reports. It explains why this check matters, what is usually included, and how drivers can use this information to make safer decisions when buying or owning a vehicle in the ${lang.toUpperCase()} locale. No specific VIN data is inferred or fabricated.`;



  if (!enableAI) {

    appendCache(key, fallback);

    return fallback;

  }



  let text = await callAiProvider(prompt, { lang, intent, maxTokens });

  if (!text) {

    text = fallback;

  }



  appendCache(key, text);

  return text;

}



module.exports = { generateText };

