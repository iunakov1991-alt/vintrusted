const { log, error } = require('../logger');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

/**
 * Локальный AI провайдер для MacBook M1
 * Использует Ollama для быстрой генерации (замена Grok из версии 6)
 */
class LocalAIProvider {
  constructor(config) {
    this.config = config;
    this.model = config.localAIModel || process.env.LOCAL_AI_MODEL || 'phi3';
    this.timeout = parseInt(process.env.LOCAL_AI_TIMEOUT || '90000', 10); // 90 сек для phi3 (увеличено для надежности)
    this.maxRetries = 2;
    this.ollamaAPIUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434';
    this.useAPI = process.env.OLLAMA_USE_API === '1' || process.env.OLLAMA_USE_API === 'true' || true; // По умолчанию используем API
  }

  /**
   * Проверка доступности Ollama
   */
  async isAvailable() {
    try {
      if (this.useAPI) {
        // Проверка через API
        const response = await fetch(`${this.ollamaAPIUrl}/api/tags`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        });
        if (response.ok) {
          const data = await response.json();
          const hasModel = data.models?.some(m => m.name.includes(this.model));
          if (hasModel) {
            log('LOCAL-AI', `Ollama API available with model ${this.model}`);
            return true;
          }
        }
      } else {
        // Проверка через CLI
        await execAsync('ollama --version', { timeout: 5000 });
        // Проверяем, что модель загружена
        const { stdout } = await execAsync('ollama list', { timeout: 5000 });
        if (stdout.includes(this.model)) {
          log('LOCAL-AI', `Ollama CLI available with model ${this.model}`);
          return true;
        }
      }
      return false;
    } catch (e) {
      log('LOCAL-AI', `Ollama not available: ${e.message}`);
      return false;
    }
  }

  /**
   * Вызов локального AI через Ollama
   */
  async generateText(prompt, options = {}) {
    const { maxTokens = 800, systemPrompt } = options;
    
    try {
      if (this.useAPI) {
        // Используем Ollama API (быстрее и надежнее)
        return await this.generateViaAPI(prompt, { maxTokens, systemPrompt });
      } else {
        // Используем CLI (fallback)
        return await this.generateViaCLI(prompt, { maxTokens, systemPrompt });
      }
    } catch (e) {
      error('LOCAL-AI', `Ollama generation error: ${e.message}`);
      return null;
    }
  }

  /**
   * Генерация через Ollama API
   */
  async generateViaAPI(prompt, options = {}) {
    const { maxTokens = 800, systemPrompt } = options;
    
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      // УЛУЧШЕНИЕ: Streaming для больших блоков (maxTokens > 1000)
      const useStreaming = (options.stream === true) || (maxTokens > 1000);
      
      if (useStreaming) {
        return await this.generateViaAPIStreaming(prompt, options, messages, controller, timeoutId);
      }

      const response = await fetch(`${this.ollamaAPIUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: messages,
          options: {
            num_predict: maxTokens,
            temperature: 0.7
          },
          stream: false
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        error('LOCAL-AI', `Ollama API error: ${response.status} - ${errorText}`);
        return null;
      }

      const data = await response.json();
      const text = data.message?.content || '';
      
      if (text) {
        log('LOCAL-AI', `Ollama API success: ${text.length} chars, model: ${this.model}`);
      }
      
      return text.trim();
    } catch (e) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
        error('LOCAL-AI', `Ollama API timeout after ${this.timeout}ms`);
      } else {
        error('LOCAL-AI', `Ollama API error: ${e.message}`);
      }
      return null;
    }
  }

  /**
   * УЛУЧШЕНИЕ: Streaming генерация через Ollama API
   * Для больших блоков (>1000 токенов) - ускорение за счет получения первых токенов
   */
  async generateViaAPIStreaming(prompt, options, messages, controller, timeoutId) {
    const { maxTokens = 800 } = options;
    
    log('LOCAL-AI', `Using streaming mode for large block (${maxTokens} tokens)`);
    
    try {
      const response = await fetch(`${this.ollamaAPIUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: messages,
          options: {
            num_predict: maxTokens,
            temperature: 0.7
          },
          stream: true
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        error('LOCAL-AI', `Ollama API streaming error: ${response.status} - ${errorText}`);
        return null;
      }

      // Читаем поток данных
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Последняя неполная строка остается в буфере

        for (const line of lines) {
          if (line.trim() === '') continue;
          
          try {
            const json = JSON.parse(line);
            if (json.message?.content) {
              fullText += json.message.content;
            }
            if (json.done) break;
          } catch (e) {
            // Игнорируем некорректные JSON строки
          }
        }
      }

      if (fullText) {
        log('LOCAL-AI', `Ollama streaming success: ${fullText.length} chars`);
      }

      return fullText.trim();
    } catch (e) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
        error('LOCAL-AI', `Ollama streaming timeout after ${this.timeout}ms`);
      } else {
        error('LOCAL-AI', `Ollama streaming error: ${e.message}`);
      }
      return null;
    }
  }

  /**
   * Генерация через Ollama CLI (fallback)
   */
  async generateViaCLI(prompt, options = {}) {
    const { maxTokens = 800, systemPrompt } = options;
    
    // Формируем полный промпт
    let fullPrompt = prompt;
    if (systemPrompt) {
      fullPrompt = `${systemPrompt}\n\n${prompt}`;
    }

    // Экранируем кавычки для команды
    const escapedPrompt = fullPrompt.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    
    const command = `ollama run ${this.model} "${escapedPrompt}"`;
    
    log('LOCAL-AI', `Calling Ollama CLI (${this.model})...`);
    
    try {
      const { stdout, stderr } = await Promise.race([
        execAsync(command, { 
          maxBuffer: 1024 * 1024 * 10, // 10 MB буфер
          timeout: this.timeout 
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), this.timeout)
        )
      ]);
      
      if (stderr && !stdout) {
        error('LOCAL-AI', `Ollama CLI error: ${stderr}`);
        return null;
      }
      
      // Очищаем ответ от служебных символов Ollama
      let text = stdout.trim();
      text = text.replace(/^>>>\s*/gm, '').trim();
      text = text.replace(/^Using model.*$/gm, '').trim();
      
      // Ограничиваем длину (если нужно)
      if (maxTokens && text.length > maxTokens * 4) {
        text = text.substring(0, maxTokens * 4);
      }
      
      log('LOCAL-AI', `Ollama CLI success: ${text.length} chars`);
      return text;
      
    } catch (e) {
      if (e.message === 'Timeout') {
        error('LOCAL-AI', `Ollama CLI timeout after ${this.timeout}ms`);
      } else {
        error('LOCAL-AI', `Ollama CLI error: ${e.message}`);
      }
      return null;
    }
  }

  /**
   * Проверка, что модель загружена
   */
  async isModelLoaded() {
    try {
      if (this.useAPI) {
        const response = await fetch(`${this.ollamaAPIUrl}/api/tags`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        });
        if (response.ok) {
          const data = await response.json();
          return data.models?.some(m => m.name.includes(this.model)) || false;
        }
      } else {
        const { stdout } = await execAsync('ollama list', { timeout: 5000 });
        return stdout.includes(this.model);
      }
      return false;
    } catch (e) {
      return false;
    }
  }
}

module.exports = { LocalAIProvider };

