
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



async function callGroqAPI(prompt, { lang, intent, maxTokens = 600 }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY not set');
  }

  const systemPrompt = `You are a helpful assistant that writes informative, factual content about vehicle history reports. Write in ${lang === 'es' ? 'Spanish' : 'English'}. Do not fabricate specific accidents, damage, or records. Focus on general information about why ${intent} checks matter and what buyers should know.`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      max_tokens: maxTokens,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Groq API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callDeepSeekAPI(prompt, { lang, intent, maxTokens = 600 }) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY not set');
  }

  const systemPrompt = `You are a helpful assistant that writes informative, factual content about vehicle history reports. Write in ${lang === 'es' ? 'Spanish' : 'English'}. Do not fabricate specific accidents, damage, or records. Focus on general information about why ${intent} checks matter and what buyers should know.`;

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      max_tokens: maxTokens,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`DeepSeek API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function generateText(prompt, { lang = 'en', intent = 'generic', maxTokens = 600 } = {}) {
  const enableAI = process.env.SEO_ENABLE_AI === '1' || process.env.SEO_ENABLE_AI === 'true';
  const key = hashKey(`${lang}|${intent}|${prompt}`);
  const cache = readCache();

  if (cache.has(key)) {
    return cache.get(key);
  }

  if (!enableAI) {
    const fallback = `This section provides general, non-personalized information about ${intent} in the context of vehicle history reports. It explains why this check matters, what is usually included, and how drivers can use this information to make safer decisions when buying or owning a vehicle in the ${lang.toUpperCase()} locale. No specific VIN data is inferred or fabricated.`;
    appendCache(key, fallback);
    return fallback;
  }

  // Try Groq first (faster), then DeepSeek as fallback
  let text = '';
  let error = null;

  // Try Groq
  if (process.env.GROQ_API_KEY) {
    try {
      text = await callGroqAPI(prompt, { lang, intent, maxTokens });
      log('AI', `Generated text using Groq (${text.length} chars)`);
    } catch (e) {
      error = e;
      log('AI', `Groq failed: ${e.message}, trying DeepSeek...`);
    }
  }

  // Fallback to DeepSeek
  if (!text && process.env.DEEPSEEK_API_KEY) {
    try {
      text = await callDeepSeekAPI(prompt, { lang, intent, maxTokens });
      log('AI', `Generated text using DeepSeek (${text.length} chars)`);
    } catch (e) {
      error = e;
      log('AI', `DeepSeek failed: ${e.message}`);
    }
  }

  // If both failed, use fallback
  if (!text) {
    const fallback = `This section provides general, non-personalized information about ${intent} in the context of vehicle history reports. It explains why this check matters, what is usually included, and how drivers can use this information to make safer decisions when buying or owning a vehicle in the ${lang.toUpperCase()} locale. No specific VIN data is inferred or fabricated.`;
    log('AI', `Both APIs failed, using fallback text. Last error: ${error?.message || 'No API keys set'}`);
    appendCache(key, fallback);
    return fallback;
  }

  appendCache(key, text);
  return text;
}



module.exports = { generateText };

