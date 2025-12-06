/**
 * Unified API Client
 * Унифицированный клиент для AI API провайдеров
 */

const { log } = require('../logger');

/**
 * Базовый класс для API клиентов
 */
class BaseAPIClient {
  constructor(config) {
    this.config = config;
    this.timeout = config.timeout || 30000;
  }

  /**
   * Выполнение API запроса с таймаутом
   */
  async callAPI(url, options) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`API error: ${response.status} ${response.statusText} - ${errorData.substring(0, 200)}`);
      }

      return await response.json();
    } catch (e) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
        throw new Error(`API timeout after ${this.timeout}ms`);
      }
      throw e;
    }
  }
}

/**
 * DeepSeek API Client
 */
class DeepSeekAPIClient extends BaseAPIClient {
  constructor(config) {
    super({ ...config, timeout: config.timeout || 25000 });
    this.apiKey = process.env.DEEPSEEK_API_KEY;
    this.model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
  }

  async generateText(prompt, options = {}) {
    if (!this.apiKey) return null;

    try {
      const data = await this.callAPI('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
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

      const content = data.choices?.[0]?.message?.content || null;
      if (content) {
        log('AI', `DeepSeek API response: ${content.length} chars`);
      }
      return content;
    } catch (e) {
      log('AI', `DeepSeek API error: ${e.message}`);
      return null;
    }
  }
}

module.exports = {
  DeepSeekAPIClient
};

