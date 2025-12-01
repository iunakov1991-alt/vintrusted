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
    this.loadAITrainingStrategy();
    // Флаг для отключения Groq при достижении лимита
    this.groqRateLimited = false;
  }

  /**
   * Загрузка обученной стратегии AI
   */
  loadAITrainingStrategy() {
    try {
      const strategyPath = path.join(process.cwd(), 'data/seo/ai-training/learned-strategy.json');
      if (fs.existsSync(strategyPath)) {
        this.aiStrategy = JSON.parse(fs.readFileSync(strategyPath, 'utf8'));
        log('AI', 'AI training strategy loaded');
      } else {
        this.aiStrategy = null;
      }
    } catch (e) {
      log('AI', `Error loading AI strategy: ${e.message}`);
      this.aiStrategy = null;
    }
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
   * Обогащение промпта обученной стратегией AI
   * AI использует свои знания о том, что любит Google, и свою успешную стратегию
   */
  enrichPromptWithStrategy(originalPrompt, options) {
    if (!this.aiStrategy || !this.aiStrategy.core_principles) {
      // Если стратегии нет, используем оригинальный промпт
      return originalPrompt;
    }

    // Загружаем базу знаний для контекста
    const knowledgeBase = this.loadKnowledgeBase();
    
    // Строим обогащенный промпт с учетом стратегии AI
    let enrichedPrompt = originalPrompt;
    
    // Добавляем контекст о том, что любит Google (из официальной документации)
    enrichedPrompt += `\n\n---\nAI TRAINING CONTEXT (Based on official Google documentation and learned strategy):\n`;
    
    // Core Principles (может быть объектом или массивом)
    if (this.aiStrategy.core_principles) {
      enrichedPrompt += `\nCORE SEO PRINCIPLES (What Google loves, from official docs):\n`;
      if (Array.isArray(this.aiStrategy.core_principles)) {
        this.aiStrategy.core_principles.forEach((principle, i) => {
          if (principle && (typeof principle === 'string' ? principle.trim() : true)) {
            enrichedPrompt += `${i + 1}. ${typeof principle === 'string' ? principle : JSON.stringify(principle)}\n`;
          }
        });
      } else if (typeof this.aiStrategy.core_principles === 'object') {
        // Если это объект, выводим ключи и значения
        Object.entries(this.aiStrategy.core_principles).forEach(([key, value], i) => {
          enrichedPrompt += `${i + 1}. ${key}: ${value}\n`;
        });
      } else if (typeof this.aiStrategy.core_principles === 'string') {
        enrichedPrompt += this.aiStrategy.core_principles;
      }
    }
    
    // Content Strategy (может быть объектом или строкой)
    if (this.aiStrategy.content_strategy) {
      enrichedPrompt += `\nCONTENT STRATEGY (Learned from experience):\n`;
      if (typeof this.aiStrategy.content_strategy === 'object') {
        Object.entries(this.aiStrategy.content_strategy).forEach(([key, value]) => {
          enrichedPrompt += `- ${key}: ${value}\n`;
        });
      } else if (typeof this.aiStrategy.content_strategy === 'string' && this.aiStrategy.content_strategy.trim()) {
        enrichedPrompt += this.aiStrategy.content_strategy + '\n';
      }
    }
    
    // Unique Approaches (может быть объектом или массивом)
    if (this.aiStrategy.unique_approaches) {
      enrichedPrompt += `\nUNIQUE APPROACHES (What works best for this use case):\n`;
      if (Array.isArray(this.aiStrategy.unique_approaches)) {
        this.aiStrategy.unique_approaches.forEach((approach, i) => {
          if (approach && (typeof approach === 'string' ? approach.trim() : true)) {
            enrichedPrompt += `${i + 1}. ${typeof approach === 'string' ? approach : JSON.stringify(approach)}\n`;
          }
        });
      } else if (typeof this.aiStrategy.unique_approaches === 'object') {
        Object.entries(this.aiStrategy.unique_approaches).forEach(([key, value], i) => {
          enrichedPrompt += `${i + 1}. ${key}: ${value}\n`;
        });
      }
    }
    
    // Добавляем контекст из базы знаний (официальная документация Google)
    if (knowledgeBase.length > 0) {
      enrichedPrompt += `\nGOOGLE OFFICIAL DOCUMENTATION CONTEXT:\n`;
      enrichedPrompt += `- Follow Google Search Essentials and Fundamentals\n`;
      enrichedPrompt += `- Optimize for Core Web Vitals (LCP, CLS, FID)\n`;
      enrichedPrompt += `- Use structured data (Schema.org) appropriately\n`;
      enrichedPrompt += `- Focus on quality content that serves user intent\n`;
    }
    
    enrichedPrompt += `\n---\n`;
    enrichedPrompt += `\nIMPORTANT: Apply these principles naturally in your content. Don't just list them - integrate them into high-quality, useful content that Google will love and users will find valuable.\n`;
    
    return enrichedPrompt;
  }

  /**
   * Загрузка базы знаний
   */
  loadKnowledgeBase() {
    try {
      const knowledgeBasePath = path.join(process.cwd(), 'data/seo/ai-training/knowledge-base.jsonl');
      if (!fs.existsSync(knowledgeBasePath)) return [];
      
      const lines = fs.readFileSync(knowledgeBasePath, 'utf8')
        .split('\n')
        .filter(Boolean);
      
      const knowledge = [];
      for (const line of lines) {
        try {
          knowledge.push(JSON.parse(line));
        } catch (e) {
          // Skip invalid lines
        }
      }
      return knowledge;
    } catch (e) {
      log('AI', `Error loading knowledge base: ${e.message}`);
      return [];
    }
  }

  /**
   * Вызов Groq API с таймаутом
   */
  async callGroqAPI(prompt, options) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return null;

    // ТРИЗ оптимизация: уменьшаем таймаут для быстрых билдов
    const timeout = options.timeout || 10000; // 10 секунд (было 20) для ускорения
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

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
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.text();
        log('AI', `Groq API error: ${response.status} ${response.statusText} - ${errorData.substring(0, 200)}`);
        
        // Если получили 429 (Rate Limit), отключаем Groq на время этого билда
        if (response.status === 429) {
          this.groqRateLimited = true;
          log('AI', '⚠️ Groq rate limit reached (429). Disabling Groq for this build. Switching to DeepSeek.');
        }
        
        return null;
      }
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || null;
      if (content) {
        log('AI', `Groq API response received: ${content.length} characters`);
      }
      return content;
    } catch (e) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
        log('AI', `Groq API timeout after ${timeout}ms`);
      } else {
        log('AI', `Groq API exception: ${e.message}`);
      }
      return null;
    }
  }

  /**
   * Вызов DeepSeek API с таймаутом
   */
  async callDeepSeekAPI(prompt, options) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) return null;

    // ТРИЗ оптимизация: уменьшаем таймаут для быстрых билдов
    const timeout = options.timeout || 15000; // 15 секунд (было 35) для ускорения
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

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
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

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
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
        log('AI', `DeepSeek API timeout after ${timeout}ms`);
      } else {
        log('AI', `DeepSeek API exception: ${e.message}`);
      }
      return null;
    }
  }

  /**
   * Генерация текста с fallback цепочкой
   */
  async generateText(prompt, options = {}) {
    const { lang = 'en', intent = 'generic', maxTokens = 600, make, year, stateSlug } = options;
    
    // КРИТИЧНО: Обогащаем промпт обученной стратегией AI
    const enrichedPrompt = this.enrichPromptWithStrategy(prompt, options);
    
    // Улучшенный ключ кеша: добавляем make, year, state для лучшего кеширования
    const cacheKeyParts = [lang, intent, make || '', year || '', stateSlug || '', enrichedPrompt];
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
        // Пропускаем Groq, если достигнут лимит
        if (this.groqRateLimited) {
          log('AI', `Skipping Groq (rate limited) for ${intent} in ${lang}, using DeepSeek`);
          continue;
        }
        log('AI', `Trying Groq API for ${intent} in ${lang} (with AI training strategy)`);
        text = await this.callGroqAPI(enrichedPrompt || prompt, { lang, intent, maxTokens });
        if (text) {
          usedProvider = 'groq';
          log('AI', `Groq API success for ${intent} in ${lang}`);
          break;
        } else {
          log('AI', `Groq API failed for ${intent} in ${lang}`);
        }
      } else if (provider === 'deepseek') {
        log('AI', `Trying DeepSeek API for ${intent} in ${lang} (with AI training strategy)`);
        text = await this.callDeepSeekAPI(enrichedPrompt || prompt, { lang, intent, maxTokens });
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

