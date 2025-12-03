const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const { log, error } = require('../logger');

/**
 * Локальный AI провайдер для MacBook M1
 * Использует Ollama для запуска моделей локально
 */
class LocalAIProvider {
  constructor(config) {
    this.config = config;
    this.model = config.localAIModel || process.env.LOCAL_AI_MODEL || 'phi3';
    this.timeout = parseInt(process.env.LOCAL_AI_TIMEOUT || '900000', 10); // 15 минут по умолчанию (Ollama медленнее для длинных промптов и больших ответов, 3000+ слов требуют больше времени)
    this.maxRetries = 2;
  }

  /**
   * Проверка доступности Ollama
   */
  async isAvailable() {
    try {
      await execAsync('ollama --version', { timeout: 5000 });
      return true;
    } catch (e) {
      log('LOCAL-AI', 'Ollama not available');
      return false;
    }
  }

  /**
   * Вызов локального AI через Ollama
   */
  async generateText(prompt, options = {}) {
    const { maxTokens = 400 } = options;
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    
    // Проверяем доступность
    const available = await this.isAvailable();
    if (!available) {
      return null;
    }
    
    // Для длинных промптов используем временный файл вместо echo
    const useFile = prompt.length > 1000;
    let tempFilePath = null;
    
    if (useFile) {
      // Создаем временный файл для промпта
      tempFilePath = path.join(os.tmpdir(), `ollama-prompt-${Date.now()}.txt`);
      fs.writeFileSync(tempFilePath, prompt, 'utf8');
      log('LOCAL-AI', `Using temp file for long prompt: ${tempFilePath}`);
    }
    
    // Формируем команду для Ollama
    let command;
    if (useFile && tempFilePath) {
      // Используем файл для длинных промптов
      command = `cat "${tempFilePath}" | ollama run ${this.model}`;
    } else {
      // Для коротких промптов используем echo (но ограничиваем длину)
      const cleanPrompt = prompt
        .replace(/"/g, '\\"')
        .replace(/\n/g, ' ')
        .trim();
      const shortPrompt = cleanPrompt.length > 2000 
        ? cleanPrompt.substring(0, 2000) + "..."
        : cleanPrompt;
      command = `echo "${shortPrompt}" | ollama run ${this.model}`;
    }
    
    log('LOCAL-AI', `Calling local AI (${this.model}), max tokens: ${maxTokens}...`);
    
    let lastError = null;
    
    // Retry логика
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        // Выполняем команду с таймаутом
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
          error('LOCAL-AI', `Ollama error: ${stderr}`);
          lastError = new Error(stderr);
          continue;
        }
        
        // Очищаем ответ от служебных символов Ollama (ANSI escape codes)
        let text = stdout
          .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '') // Убираем ANSI escape codes
          .replace(/\x1b\[[?0-9;]*[hlm]/g, '') // Убираем дополнительные ANSI коды
          .replace(/[?2026h]/g, '') // Убираем специфичные коды Ollama
          .replace(/[?25l]/g, '') // Убираем hide cursor
          .replace(/[?25h]/g, '') // Убираем show cursor
          .replace(/[?2026l]/g, '') // Убираем дополнительные коды
          .replace(/[1G]/g, '') // Убираем cursor positioning
          .replace(/[K]/g, '') // Убираем clear line
          .replace(/⠙|⠹|⠸|⠼|⠴|⠦|⠧|⠇|⠏|⠋/g, '') // Убираем spinner символы
          .trim();
        
        // Убираем префиксы Ollama (">>> ", ">>>", и т.д.)
        text = text.replace(/^>>>\s*/gm, '').trim();
        text = text.replace(/^>>>/gm, '').trim();
        
        // Убираем пустые строки в начале
        text = text.replace(/^\s*\n+/gm, '').trim();
        
        // Если ответ слишком короткий, возможно ошибка
        if (text.length < 10) {
          log('LOCAL-AI', 'Response too short, retrying...');
          lastError = new Error('Response too short');
          continue;
        }
        
        // Ограничиваем длину (если нужно) - примерно 4 символа на токен
        if (maxTokens && text.length > maxTokens * 4) {
          text = text.substring(0, maxTokens * 4);
        }
        
        log('LOCAL-AI', `Local AI success: ${text.length} chars`);
        
        // Удаляем временный файл если использовали
        if (tempFilePath && fs.existsSync(tempFilePath)) {
          try {
            fs.unlinkSync(tempFilePath);
          } catch (e) {
            // Игнорируем ошибки удаления
          }
        }
        
        return text;
        
      } catch (e) {
        lastError = e;
        if (attempt < this.maxRetries) {
          log('LOCAL-AI', `Attempt ${attempt + 1} failed: ${e.message}, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Пауза перед retry
        }
      }
    }
    
    // Удаляем временный файл если использовали (даже при ошибке)
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (e) {
        // Игнорируем ошибки удаления
      }
    }
    
    error('LOCAL-AI', `All attempts failed: ${lastError?.message || 'Unknown error'}`);
    return null;
  }

  /**
   * Проверка, что модель загружена
   */
  async isModelLoaded() {
    try {
      const { stdout } = await execAsync('ollama list', { timeout: 5000 });
      return stdout.includes(this.model);
    } catch (e) {
      return false;
    }
  }
}

module.exports = { LocalAIProvider };

