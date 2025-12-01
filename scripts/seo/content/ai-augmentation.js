const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: AI Augmentation
 * Мультипровайдерная AI система с fallback цепочками
 */
class AIAugmentation {
  constructor(config) {
    this.config = config;
    this.cachePath = path.join(process.cwd(), 'data/seo/ai-cache.jsonl');
    this.cache = new Map();
    // Оптимизация: DeepSeek первый для экономии Groq лимитов
    this.providers = config.aiProviders || ['deepseek', 'groq'];
    this.loadCache();
  }

  loadCache() {
    if (!fs.existsSync(this.cachePath)) return;
    try {
      const raw = fs.readFileSync(this.cachePath, 'utf8');
      const lines = raw.split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const obj = JSON.parse(line);
          if (obj.key && obj.text) this.cache.set(obj.key, obj.text);
        } catch (_e) {}
      }
      log('AI', `Cache loaded: ${this.cache.size} entries`);
    } catch (e) {
      log('AI', `Cache load error: ${e.message}`);
    }
  }

  appendCache(key, text) {
    try {
      this.cache.set(key, text);
      fs.appendFileSync(this.cachePath, JSON.stringify({ key, text }) + '\n');
    } catch (e) {
      log('AI', `Cache write error: ${e.message}`);
    }
  }

  hashKey(str) {
    return crypto.createHash('sha1').update(str).digest('hex');
  }

  /**
   * Вызов Groq API
   */
  async callGroqAPI(prompt, options) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return null;

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that writes generic, informative content about vehicle history reports. Never fabricate specific VIN data, accidents, or ownership records. Focus on general explanations.'
            },
            { role: 'user', content: prompt }
          ],
          max_tokens: options.maxTokens || 600,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        log('AI', `Groq API error: ${response.status} ${response.statusText} - ${errorData.substring(0, 200)}`);
        return null;
      }
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || null;
      if (content) {
        log('AI', `Groq API response received: ${content.length} characters`);
      }
      return content;
    } catch (e) {
      log('AI', `Groq API exception: ${e.message}`);
      return null;
    }
  }

  /**
   * Вызов DeepSeek API
   */
  async callDeepSeekAPI(prompt, options) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) return null;

    try {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that writes generic, informative content about vehicle history reports. Never fabricate specific VIN data, accidents, or ownership records. Focus on general explanations.'
            },
            { role: 'user', content: prompt }
          ],
          max_tokens: options.maxTokens || 600,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        log('AI', `DeepSeek API error: ${response.status} ${response.statusText} - ${errorData.substring(0, 200)}`);
        return null;
      }
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || null;
      if (content) {
        log('AI', `DeepSeek API response received: ${content.length} characters`);
      }
      return content;
    } catch (e) {
      log('AI', `DeepSeek API exception: ${e.message}`);
      return null;
    }
  }

  /**
   * Генерация текста с fallback цепочкой
   */
  async generateText(prompt, options = {}) {
    const { lang = 'en', intent = 'generic', maxTokens = 600, make, year, stateSlug } = options;
    // Улучшенный ключ кеша: добавляем make, year, state для лучшего кеширования
    const cacheKeyParts = [lang, intent, make || '', year || '', stateSlug || '', prompt];
    const key = this.hashKey(cacheKeyParts.join('|'));

    // Проверка включенности AI
    const envEnable = process.env.SEO_ENABLE_AI === '1' || 
                      process.env.SEO_ENABLE_AI === 'true';
    const hasApiKeys = !!(process.env.GROQ_API_KEY || process.env.DEEPSEEK_API_KEY);
    const effectiveAI = this.config.enableAI && envEnable && hasApiKeys;

    // Если AI включен, проверяем кеш, но пропускаем fallback ответы
    if (effectiveAI && this.cache.has(key)) {
      const cached = this.cache.get(key);
      // Проверяем, не является ли это fallback текстом
      const isFallback = cached.includes('This section provides general, non-personalized information');
      if (!isFallback) {
        log('AI', `Using cached AI response for ${intent} in ${lang}`);
        return cached;
      } else {
        log('AI', `Skipping cached fallback, regenerating with AI for ${intent} in ${lang}`);
        // Удаляем fallback из кеша, чтобы регенерировать
        this.cache.delete(key);
      }
    } else if (this.cache.has(key)) {
      // Если AI не включен, используем кеш как есть
      return this.cache.get(key);
    }

    if (!effectiveAI) {
      log('AI', `AI disabled, using fallback for ${intent} in ${lang}`);
      const fallback = this.getFallbackText(intent, lang);
      this.appendCache(key, fallback);
      return fallback;
    }

    // Пробуем провайдеры по порядку (DeepSeek первый для экономии Groq)
    let text = null;
    let usedProvider = null;
    for (const provider of this.providers) {
      if (provider === 'groq') {
        log('AI', `Trying Groq API for ${intent} in ${lang}`);
        text = await this.callGroqAPI(prompt, { lang, intent, maxTokens });
        if (text) {
          usedProvider = 'groq';
          log('AI', `Groq API success for ${intent} in ${lang}`);
          break;
        } else {
          log('AI', `Groq API failed for ${intent} in ${lang}`);
        }
      } else if (provider === 'deepseek') {
        log('AI', `Trying DeepSeek API for ${intent} in ${lang}`);
        text = await this.callDeepSeekAPI(prompt, { lang, intent, maxTokens });
        if (text) {
          usedProvider = 'deepseek';
          log('AI', `DeepSeek API success for ${intent} in ${lang}`);
          break;
        } else {
          log('AI', `DeepSeek API failed for ${intent} in ${lang}`);
        }
      }
    }

    if (!text) {
      log('AI', `All providers failed, using fallback for ${intent} in ${lang}`);
      text = this.getFallbackText(intent, lang);
    } else {
      log('AI', `AI content generated by ${usedProvider} for ${intent} in ${lang} (${text.length} chars)`);
    }

    this.appendCache(key, text);
    return text;
  }

  getFallbackText(intent, lang) {
    return `This section provides general, non-personalized information about ${intent} in the context of vehicle history reports. It explains why this check matters, what is usually included, and how drivers can use this information to make safer decisions when buying or owning a vehicle in the ${lang.toUpperCase()} locale. No specific VIN data is inferred or fabricated.`;
  }
}

module.exports = { AIAugmentation };

