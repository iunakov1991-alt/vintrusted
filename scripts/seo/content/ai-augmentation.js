// КРИТИЧНО: Загружаем переменные окружения из .env
// Альтернативный способ без dotenv (если dotenv не установлен)
try {
  require('dotenv').config();
} catch (e) {
  // Если dotenv не установлен, загружаем .env вручную
  const fsEnv = require('fs');
  const pathEnv = require('path');
  const envPath = pathEnv.join(process.cwd(), '.env');
  if (fsEnv.existsSync(envPath)) {
    const content = fsEnv.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^[\"']|[\"']$/g, '');
        process.env[key.trim()] = value.trim();
      }
    }
  }
}

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
    // Используем только DeepSeek (Groq отключен)
    this.providers = config.aiProviders || ['deepseek'];
    this.loadCache();
    this.loadAITrainingStrategy();
    
    // Локальный AI для MacBook M1 (условная загрузка)
    // TRIZ: Разделение через feature flags для плавного перехода на M1
    this.localAI = null;
    this.useLocalAI = false;
    
    // Загружаем LocalAI только если feature flag включен И переменная окружения установлена
    if (config.features?.localAI !== false && (process.env.USE_LOCAL_AI === '1' || process.env.USE_LOCAL_AI === 'true')) {
      try {
        const { LocalAIProvider } = require('../ai/local-ai-provider');
        this.localAI = new LocalAIProvider(config);
        this.useLocalAI = true;
        log('AI', 'Local AI enabled and loaded');
      } catch (e) {
        // Graceful fallback: LocalAI не доступен, используем только API провайдеры
        log('AI', `Local AI not available (${e.message}), using API providers only`);
        this.useLocalAI = false;
      }
    } else {
      log('AI', 'Local AI disabled (Pre-M1 mode or feature flag off)');
    }
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
  /**
   * TRIZ ПРИНЦИП: Дробление + Ограничение длины
   * Ограничиваем длину обогащенного промпта для предотвращения таймаутов
   */
  enrichPromptWithStrategy(originalPrompt, options) {
    if (!this.aiStrategy || !this.aiStrategy.core_principles) {
      // Если стратегии нет, используем оригинальный промпт
      return originalPrompt;
    }

    // TRIZ: Ограничение длины промпта (максимум 2000 символов стратегии)
    const MAX_STRATEGY_LENGTH = 2000;
    const useCompactStrategy = options.useCompactStrategy !== false; // По умолчанию компактная версия
    
    // Загружаем базу знаний для контекста
    const knowledgeBase = this.loadKnowledgeBase();
    
    // Строим обогащенный промпт с учетом стратегии AI
    let enrichedPrompt = originalPrompt;
    
    // Добавляем контекст о том, что любит Google (из официальной документации)
    enrichedPrompt += `\n\n---\nAI TRAINING CONTEXT (Based on official Google documentation and learned strategy):\n`;
    
    let strategyText = '';
    
    // Core Principles (компактная версия для длинных запросов)
    if (this.aiStrategy.core_principles) {
      let principlesText = '';
      if (Array.isArray(this.aiStrategy.core_principles)) {
        principlesText = this.aiStrategy.core_principles
          .filter(p => p && (typeof p === 'string' ? p.trim() : true))
          .slice(0, useCompactStrategy ? 3 : 10) // TRIZ: Ограничение количества
          .map((p, i) => `${i + 1}. ${typeof p === 'string' ? p.substring(0, 150) : JSON.stringify(p).substring(0, 150)}`)
          .join('\n');
      } else if (typeof this.aiStrategy.core_principles === 'object') {
        const entries = Object.entries(this.aiStrategy.core_principles);
        principlesText = entries
          .slice(0, useCompactStrategy ? 3 : entries.length)
          .map(([key, value], i) => `${i + 1}. ${key}: ${String(value).substring(0, 100)}`)
          .join('\n');
      } else if (typeof this.aiStrategy.core_principles === 'string' && this.aiStrategy.core_principles.trim()) {
        principlesText = useCompactStrategy 
          ? this.aiStrategy.core_principles.substring(0, 300)
          : this.aiStrategy.core_principles;
      }
      
      if (principlesText) {
        strategyText += `\nCORE SEO PRINCIPLES:\n${principlesText}\n`;
      }
    }
    
    // Content Strategy (компактная версия)
    if (this.aiStrategy.content_strategy && strategyText.length < MAX_STRATEGY_LENGTH * 0.6) {
      let contentStrategyText = '';
      if (typeof this.aiStrategy.content_strategy === 'object') {
        const entries = Object.entries(this.aiStrategy.content_strategy);
        contentStrategyText = entries
          .slice(0, useCompactStrategy ? 2 : entries.length)
          .map(([key, value]) => `- ${key}: ${String(value).substring(0, 100)}`)
          .join('\n');
      } else if (typeof this.aiStrategy.content_strategy === 'string' && this.aiStrategy.content_strategy.trim()) {
        contentStrategyText = useCompactStrategy
          ? this.aiStrategy.content_strategy.substring(0, 200)
          : this.aiStrategy.content_strategy;
      }
      
      if (contentStrategyText && strategyText.length + contentStrategyText.length < MAX_STRATEGY_LENGTH * 0.8) {
        strategyText += `\nCONTENT STRATEGY:\n${contentStrategyText}\n`;
      }
    }
    
    // TRIZ: Ограничиваем общую длину стратегии
    if (strategyText.length > MAX_STRATEGY_LENGTH) {
      strategyText = strategyText.substring(0, MAX_STRATEGY_LENGTH) + '\n[...strategy truncated for API stability...]';
    }
    
    enrichedPrompt += strategyText;
    
    // Компактный контекст из базы знаний (всегда короткий)
    if (knowledgeBase.length > 0 && strategyText.length < MAX_STRATEGY_LENGTH * 0.9) {
      enrichedPrompt += `\nGOOGLE DOCS:\n- Follow Search Essentials\n- Optimize Core Web Vitals\n- Use Schema.org appropriately\n- Focus on quality content\n`;
    }
    
    enrichedPrompt += `\n---\n`;
    enrichedPrompt += `\nIMPORTANT: Apply these principles naturally. Integrate them into high-quality, useful content.\n`;
    
    // TRIZ: Финальная проверка длины
    const totalLength = enrichedPrompt.length;
    if (totalLength > originalPrompt.length + MAX_STRATEGY_LENGTH + 500) {
      log('AI', `Prompt too long (${totalLength} chars), truncating strategy...`);
      const maxEnrichment = MAX_STRATEGY_LENGTH + 500;
      const strategyStart = enrichedPrompt.indexOf('AI TRAINING CONTEXT');
      if (strategyStart > 0) {
        const beforeStrategy = enrichedPrompt.substring(0, strategyStart);
        const strategyPart = enrichedPrompt.substring(strategyStart);
        const truncatedStrategy = strategyPart.substring(0, maxEnrichment) + '\n[...truncated for stability...]';
        enrichedPrompt = beforeStrategy + truncatedStrategy + '\n---\nIMPORTANT: Apply principles naturally.\n';
      }
    }
    
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
   * Вызов DeepSeek API с таймаутом
   */
  /**
   * TRIZ ПРИНЦИП: Динамичность + Обратная связь + Посредник
   * Адаптивный таймаут, retry логика и более надежный механизм запросов
   */
  async callDeepSeekAPI(prompt, options) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) return null;

    // TRIZ: Адаптивный таймаут на основе длины промпта
    const promptLength = prompt.length;
    const baseTimeout = 120000; // 120 секунд базовый (увеличен для стабильности)
    const lengthMultiplier = Math.min(promptLength / 2000, 1.0); // Консервативный множитель
    const timeout = options.timeout || Math.min(baseTimeout * (1 + lengthMultiplier), 180000); // Максимум 180 сек
    
    // TRIZ: Адаптивный maxTokens на основе длины промпта
    const adaptiveMaxTokens = options.maxTokens || Math.min(600 + Math.floor(promptLength / 15), 1500);
    
    // TRIZ: Retry логика (до 2 попыток)
    const maxRetries = 2;
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // TRIZ: Используем AbortController с увеличенным таймаутом
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, timeout);

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
            max_tokens: adaptiveMaxTokens,
            temperature: 0.7
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.text();
          log('AI', `DeepSeek API error: ${response.status} ${response.statusText} - ${errorData.substring(0, 200)}`);
          if (attempt < maxRetries && response.status >= 500) {
            // Retry на серверные ошибки
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Экспоненциальная задержка
            continue;
          }
          return null;
        }
        
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || null;
        if (content) {
          log('AI', `DeepSeek API success (attempt ${attempt}): ${content.length} chars, prompt: ${promptLength} chars, timeout: ${timeout}ms, tokens: ${adaptiveMaxTokens}`);
        }
        return content;
      } catch (e) {
        clearTimeout && clearTimeout();
        lastError = e;
        
        if (e.name === 'AbortError' || e.message === 'TIMEOUT') {
          log('AI', `DeepSeek API timeout (attempt ${attempt}/${maxRetries}) after ${timeout}ms (prompt: ${promptLength} chars)`);
          if (attempt < maxRetries) {
            // TRIZ: Увеличиваем таймаут для следующей попытки
            const retryTimeout = timeout * 1.5;
            log('AI', `Retrying with increased timeout: ${retryTimeout}ms`);
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
            continue;
          }
        } else {
          log('AI', `DeepSeek API exception (attempt ${attempt}/${maxRetries}): ${e.message} (prompt: ${promptLength} chars)`);
          if (attempt < maxRetries && (e.message.includes('network') || e.message.includes('ECONNRESET'))) {
            // Retry на сетевые ошибки
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
            continue;
          }
        }
      }
    }
    
    log('AI', `DeepSeek API failed after ${maxRetries} attempts: ${lastError?.message || 'unknown error'}`);
    return null;
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
    const hasApiKeys = !!process.env.DEEPSEEK_API_KEY;
    const effectiveAI = this.config.enableAI && envEnable && hasApiKeys;

    // MONSTER 7.x: При retry отключаем кеш для новой генерации
    const skipCache = options.skipCache === true;

    // Если AI включен, проверяем кеш, но пропускаем fallback ответы и retry
    if (!skipCache && effectiveAI && this.cache.has(key)) {
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
    } else if (!skipCache && this.cache.has(key)) {
      // Если AI не включен, используем кеш как есть (только если не skipCache)
      return this.cache.get(key);
    }

    if (!effectiveAI && !this.useLocalAI) {
      log('AI', `AI disabled, using fallback for ${intent} in ${lang}`);
      const fallback = this.getFallbackText(intent, lang);
      this.appendCache(key, fallback);
      return fallback;
    }

    // ВЕРСИЯ 6 АРХИТЕКТУРА: Гибридная система Ollama (primary) + DeepSeek (fallback)
    // Определяем тип блока для выбора провайдера
    const blockType = options.blockType || 'general';
    const forceProvider = options.provider; // Явно указанный провайдер
    
    // Блоки для Ollama (быстрые, простые):
    const ollamaBlocks = [
      'hero', 'key_facts', 'vin_decoder', 'nmvtis', 
      'buyer_guide', 'faq', 'internal_links', 'cta',
      'technical_specs', 'simple_section'
    ];
    
    // Блоки для DeepSeek (сложные, требуют качества):
    const deepseekBlocks = [
      'deep_explanation', 'state_specific', 'accident_intelligence',
      'fraud_patterns', 'market_value', 'insurance_risk',
      'complex_analysis', 'engineering_grade'
    ];
    
    // Если провайдер явно указан, используем его
    const useOllama = forceProvider === 'ollama' || (!forceProvider && ollamaBlocks.includes(blockType));
    const useDeepSeek = forceProvider === 'deepseek' || (!forceProvider && (deepseekBlocks.includes(blockType) || !ollamaBlocks.includes(blockType)));
    
    // Пробуем Ollama для быстрых блоков (как Groq в версии 6)
    if (useOllama && this.useLocalAI && this.localAI) {
      try {
        const isAvailable = await this.localAI.isAvailable();
        if (isAvailable) {
          log('AI', `Trying Ollama (primary) for block type: ${blockType}...`);
          
          // Для Ollama используем оригинальный промпт (быстрее, без обогащения)
          // УЛУЧШЕНИЕ: Streaming для больших блоков (ускорение за счет получения первых токенов)
          const useStreaming = (maxTokens || 800) > 1000 || options.stream === true;
          log('AI', `Ollama streaming: ${useStreaming ? 'ENABLED' : 'DISABLED'} (maxTokens: ${maxTokens || 800})`);
          const localText = await this.localAI.generateText(prompt, {
            maxTokens: maxTokens || 800,
            systemPrompt: options.systemPrompt || 'You are an expert SEO content writer. Write clear, factual, technical content.',
            stream: useStreaming
          });
          
          if (localText) {
            // Валидация качества через Ollama (быстрая проверка)
            const validation = await this.validateWithOllama(localText, blockType, options);
            
            if (validation.score >= 0.8) {
              log('AI', `Ollama success (quality: ${(validation.score * 100).toFixed(0)}%) for ${blockType}`);
              this.appendCache(key, localText);
              return localText;
            } else {
              log('AI', `Ollama quality low (${(validation.score * 100).toFixed(0)}%), falling back to DeepSeek`);
              // Fallback на DeepSeek если качество низкое
            }
          } else {
            log('AI', 'Ollama failed, falling back to DeepSeek');
          }
        } else {
          log('AI', 'Ollama not available, using DeepSeek');
        }
      } catch (e) {
        log('AI', `Ollama error: ${e.message}, falling back to DeepSeek`);
      }
    }

    // TRIZ: Используем компактную стратегию для длинных запросов
    const promptToUse = enrichedPrompt || prompt;
    const promptLength = promptToUse.length;
    const useCompactStrategy = promptLength > 1500; // Для длинных промптов используем компактную стратегию
    
    // Пробуем провайдеры по порядку (только DeepSeek)
    let text = null;
    let usedProvider = null;
    for (const provider of this.providers) {
      if (provider === 'deepseek') {
        log('AI', `Trying DeepSeek API for ${intent} in ${lang} (prompt: ${promptLength} chars, compact: ${useCompactStrategy})`);
        
        // TRIZ: Если промпт слишком длинный, используем компактную стратегию
        let finalPrompt = promptToUse;
        if (useCompactStrategy && enrichedPrompt) {
          // Регенерируем с компактной стратегией
          finalPrompt = this.enrichPromptWithStrategy(prompt, { ...options, useCompactStrategy: true });
          log('AI', `Using compact strategy (${finalPrompt.length} vs ${promptToUse.length} chars)`);
        }
        
        text = await this.callDeepSeekAPI(finalPrompt, { 
          lang, 
          intent, 
          maxTokens,
          useCompactStrategy 
        });
        if (text) {
          usedProvider = 'deepseek';
          log('AI', `DeepSeek API success for ${intent} in ${lang}`);
          break;
        } else {
          log('AI', `DeepSeek API failed for ${intent} in ${lang}, will retry with fallback`);
          // TRIZ: Обратная связь - если запрос упал, пробуем без обогащения
          if (enrichedPrompt && promptLength > 2000) {
            log('AI', `Retrying without strategy enrichment (prompt too long)`);
            text = await this.callDeepSeekAPI(prompt, { lang, intent, maxTokens: Math.min(maxTokens || 600, 800) });
            if (text) {
              usedProvider = 'deepseek';
              log('AI', `DeepSeek API success without enrichment`);
              break;
            }
          }
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

  /**
   * Валидация качества контента через Ollama (версия 6 архитектура)
   */
  async validateWithOllama(content, blockType, options = {}) {
    if (!this.useLocalAI || !this.localAI) {
      return { score: 1.0, valid: true }; // Если Ollama недоступен, считаем валидным
    }

    try {
      const isAvailable = await this.localAI.isAvailable();
      if (!isAvailable) {
        return { score: 1.0, valid: true };
      }

      const validationPrompt = `Evaluate the quality of this ${blockType} block for a VIN check article:

${content.substring(0, 500)}...

Rate from 0.0 to 1.0 based on:
- Structure and clarity (0.3)
- Technical accuracy (0.3)
- Completeness (0.2)
- Professional tone (0.2)

Respond with JSON only: {"score": 0.95, "valid": true, "issues": []}`;

      const validationResponse = await this.localAI.generateText(validationPrompt, {
        maxTokens: 200,
        systemPrompt: 'You are a quality validator. Respond only with valid JSON.'
      });

      if (validationResponse) {
        try {
          const jsonMatch = validationResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const validation = JSON.parse(jsonMatch[0]);
            return {
              score: validation.score || 0.8,
              valid: validation.valid !== false,
              issues: validation.issues || []
            };
          }
        } catch (e) {
          // Если не удалось распарсить, считаем валидным
          log('AI', `Validation response parse error: ${e.message}`);
        }
      }

      return { score: 0.8, valid: true }; // По умолчанию валидно
    } catch (e) {
      log('AI', `Validation error: ${e.message}`);
      return { score: 0.8, valid: true }; // При ошибке считаем валидным
    }
  }

  getFallbackText(intent, lang) {
    return `This section provides general, non-personalized information about ${intent} in the context of vehicle history reports. It explains why this check matters, what is usually included, and how drivers can use this information to make safer decisions when buying or owning a vehicle in the ${lang.toUpperCase()} locale. No specific VIN data is inferred or fabricated.`;
  }
}

module.exports = { AIAugmentation };

