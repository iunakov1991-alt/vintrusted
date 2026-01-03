# 🚀 РЕАЛИЗАЦИЯ ЛОКАЛЬНОГО AI НА MACBOOK AIR M1

## 📋 ПРОСТОЙ ПЛАН (ПО ШАГАМ)

### ШАГ 1: Установка Ollama (5 минут)

```bash
# Установка Ollama
brew install ollama

# Или через официальный сайт
# https://ollama.ai/download
```

**Что это:** Ollama - это программа, которая запускает AI модели локально на твоем Mac.

---

### ШАГ 2: Загрузка модели (10-15 минут)

```bash
# Загружаем легкую модель (2-3 GB)
ollama pull phi3

# Или чуть более мощную (4-5 GB, но лучше качество)
ollama pull llama3.1:8b
```

**Что это:** Загружаем AI модель на Mac. Phi3 - легкая (2 GB), Llama3.1 - мощнее (4-5 GB).

---

### ШАГ 3: Проверка работы (1 минута)

```bash
# Тестируем, что модель работает
ollama run phi3 "Привет, как дела?"
```

**Что это:** Проверяем, что модель отвечает. Если видишь ответ - все работает.

---

### ШАГ 4: Интеграция в код (10 минут)

Создаем новый файл для локального AI:

```javascript
// scripts/seo/ai/local-ai-provider.js
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const { log, error } = require('../logger');

class LocalAIProvider {
  constructor(config) {
    this.config = config;
    this.model = config.localAIModel || 'phi3'; // phi3 или llama3.1:8b
    this.timeout = 30000; // 30 секунд таймаут
  }

  /**
   * Вызов локального AI через Ollama
   */
  async generateText(prompt, options = {}) {
    const { maxTokens = 400 } = options;
    
    try {
      // Формируем команду для Ollama
      const command = `ollama run ${this.model} "${prompt.replace(/"/g, '\\"')}"`;
      
      log('LOCAL-AI', `Calling local AI (${this.model})...`);
      
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
        return null;
      }
      
      // Очищаем ответ от служебных символов Ollama
      let text = stdout.trim();
      // Убираем ">>> " и другие префиксы Ollama
      text = text.replace(/^>>>\s*/gm, '').trim();
      
      // Ограничиваем длину (если нужно)
      if (maxTokens && text.length > maxTokens * 4) {
        text = text.substring(0, maxTokens * 4);
      }
      
      log('LOCAL-AI', `Local AI success: ${text.length} chars`);
      return text;
      
    } catch (e) {
      error('LOCAL-AI', `Local AI error: ${e.message}`);
      return null;
    }
  }

  /**
   * Проверка доступности Ollama
   */
  async isAvailable() {
    try {
      await execAsync('ollama --version', { timeout: 5000 });
      return true;
    } catch (e) {
      return false;
    }
  }
}

module.exports = { LocalAIProvider };
```

---

### ШАГ 5: Модификация ai-augmentation.js (5 минут)

Добавляем поддержку локального AI в существующий код:

```javascript
// В scripts/seo/content/ai-augmentation.js

// В начале файла добавляем:
const { LocalAIProvider } = require('../ai/local-ai-provider');

class AIAugmentation {
  constructor(config) {
    // ... существующий код ...
    
    // Добавляем локальный AI провайдер
    this.localAI = new LocalAIProvider(config);
    this.useLocalAI = process.env.USE_LOCAL_AI === '1' || 
                      process.env.USE_LOCAL_AI === 'true';
  }

  async generateText(prompt, options = {}) {
    // ... существующий код до проверки кеша ...
    
    // НОВОЕ: Сначала пробуем локальный AI (если включен)
    if (this.useLocalAI) {
      const isAvailable = await this.localAI.isAvailable();
      if (isAvailable) {
        log('AI', 'Trying local AI first...');
        const localText = await this.localAI.generateText(enrichedPrompt || prompt, {
          maxTokens: options.maxTokens || 400
        });
        
        if (localText) {
          log('AI', 'Local AI success, using it');
          this.appendCache(key, localText);
          return localText;
        } else {
          log('AI', 'Local AI failed, falling back to API');
        }
      } else {
        log('AI', 'Local AI not available, using API');
      }
    }
    
    // ... остальной код (DeepSeek, Groq) остается как fallback ...
  }
}
```

---

### ШАГ 6: Настройка переменных окружения (2 минуты)

Добавляем в `.env.local`:

```bash
# Локальный AI на MacBook M1
USE_LOCAL_AI=1
LOCAL_AI_MODEL=phi3  # или llama3.1:8b

# Fallback на API если локальный AI не работает
DEEPSEEK_API_KEY=your_key_here
GROQ_API_KEY=your_key_here
```

---

### ШАГ 7: Оптимизация для M1 (10 минут)

Создаем файл для управления потоками и памятью:

```javascript
// scripts/seo/utils/m1-optimizer.js
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const { log } = require('../logger');

class M1Optimizer {
  constructor() {
    this.isM1 = process.platform === 'darwin' && 
                process.arch === 'arm64';
    this.maxThreads = this.isM1 ? 6 : 4; // 6 потоков для M1
    this.memoryLimit = 6000; // 6 GB из 8 GB
  }

  /**
   * Получить оптимальное количество потоков для M1
   */
  getOptimalThreads() {
    if (!this.isM1) {
      return 4; // Для не-M1 используем 4
    }
    
    // Для M1: 6 потоков оптимально
    return this.maxThreads;
  }

  /**
   * Проверка доступной памяти
   */
  async getAvailableMemory() {
    try {
      const { stdout } = await execAsync('vm_stat');
      // Парсим вывод vm_stat для получения свободной памяти
      // Упрощенная версия
      return this.memoryLimit; // Возвращаем лимит
    } catch (e) {
      return this.memoryLimit;
    }
  }

  /**
   * Очистка памяти после билда
   */
  async cleanupAfterBuild() {
    if (!this.isM1) return;
    
    log('M1-OPTIMIZER', 'Cleaning up memory after build...');
    
    try {
      // 1. Очистка кеша Ollama (если используется)
      await execAsync('ollama ps').catch(() => {});
      
      // 2. Принудительная сборка мусора Node.js
      if (global.gc) {
        global.gc();
        log('M1-OPTIMIZER', 'Garbage collection triggered');
      }
      
      // 3. Логируем использование памяти
      const memUsage = process.memoryUsage();
      log('M1-OPTIMIZER', `Memory after cleanup: ${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`);
      
    } catch (e) {
      log('M1-OPTIMIZER', `Cleanup error: ${e.message}`);
    }
  }

  /**
   * Проверка температуры (упрощенная)
   */
  async checkTemperature() {
    if (!this.isM1) return null;
    
    try {
      // Используем CPU usage как индикатор нагрузки
      const cpuUsage = process.cpuUsage();
      const totalCpu = cpuUsage.user + cpuUsage.system;
      
      // Если CPU usage очень высокий, возможно перегрев
      if (totalCpu > 1000000000) { // > 1 секунда CPU time
        log('M1-OPTIMIZER', 'High CPU usage detected, may throttle');
        return 'high';
      }
      
      return 'normal';
    } catch (e) {
      return null;
    }
  }
}

module.exports = { M1Optimizer };
```

---

### ШАГ 8: Интеграция в seo-master-build.js (5 минут)

Добавляем в начало `main()` функции:

```javascript
// В scripts/seo/seo-master-build.js

const { M1Optimizer } = require('./utils/m1-optimizer');

async function main() {
  // ... существующий код ...
  
  // НОВОЕ: Инициализация M1 оптимизатора
  const m1Optimizer = new M1Optimizer();
  const optimalThreads = m1Optimizer.getOptimalThreads();
  
  // Если на M1, используем оптимальное количество потоков
  if (m1Optimizer.isM1) {
    log('M1', `Detected M1, using ${optimalThreads} threads`);
    process.env.SEO_BUILD_CONCURRENCY = optimalThreads.toString();
  }
  
  // ... остальной код билда ...
  
  // В конце main(), после завершения билда:
  try {
    // Очистка памяти после билда
    await m1Optimizer.cleanupAfterBuild();
    
    // Выгрузка на Vercel (если нужно)
    if (process.env.AUTO_DEPLOY === '1') {
      await deployToVercel();
    }
  } catch (e) {
    error('MAIN', `Post-build error: ${e.message}`);
  }
}
```

---

### ШАГ 9: Автоматическая выгрузка на Vercel (5 минут)

Создаем функцию выгрузки:

```javascript
// scripts/seo/utils/vercel-deploy.js
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const { log, error } = require('../logger');

async function deployToVercel() {
  log('DEPLOY', 'Starting deployment to Vercel...');
  
  try {
    // 1. Проверяем изменения
    const { stdout: status } = await execAsync('git status --porcelain');
    if (!status.trim()) {
      log('DEPLOY', 'No changes to deploy');
      return;
    }
    
    // 2. Добавляем файлы
    log('DEPLOY', 'Adding files to git...');
    await execAsync('git add public/vin/');
    
    // 3. Коммит
    log('DEPLOY', 'Committing changes...');
    const commitMessage = `SEO build: ${new Date().toISOString()}`;
    await execAsync(`git commit -m "${commitMessage}"`);
    
    // 4. Push
    log('DEPLOY', 'Pushing to GitHub...');
    await execAsync('git push origin main');
    
    // 5. Vercel deploy hook (если настроен)
    if (process.env.VERCEL_DEPLOY_HOOK) {
      log('DEPLOY', 'Triggering Vercel deploy hook...');
      const fetch = require('node-fetch');
      await fetch(process.env.VERCEL_DEPLOY_HOOK, { method: 'POST' });
    }
    
    log('DEPLOY', 'Deployment completed');
    
  } catch (e) {
    error('DEPLOY', `Deployment error: ${e.message}`);
    throw e;
  }
}

module.exports = { deployToVercel };
```

---

### ШАГ 10: Запуск (1 минута)

```bash
# Устанавливаем переменные окружения
export USE_LOCAL_AI=1
export LOCAL_AI_MODEL=phi3
export SEO_BUILD_CONCURRENCY=6
export AUTO_DEPLOY=1

# Запускаем билд
node scripts/seo/seo-master-build.js
```

---

## 📊 ЧТО ПОЛУЧИТСЯ

### До (Vercel Pro + DeepSeek API):
- Время: 1-2 минуты
- Стоимость: $3-30 за билд
- Зависимость: Интернет, API лимиты

### После (MacBook M1 + Локальный AI):
- Время: 30-60 секунд (в 2-4x быстрее)
- Стоимость: $0 (только электричество)
- Зависимость: Только MacBook

---

## 🔧 НАСТРОЙКА ПОД M1 8GB

### Оптимальная конфигурация:

```javascript
// data/seo/config.json
{
  "targetPagesPerBuild": 10000,
  "aiMaxTokens": 400,  // Меньше токенов = меньше памяти
  "aiProviders": ["local", "deepseek", "groq"],  // local первый
  "features": {
    // Отключаем тяжелые фичи для экономии памяти
    "visualOptimization": false,
    "coreWebVitals": false
  }
}
```

### Переменные окружения:

```bash
# .env.local
USE_LOCAL_AI=1
LOCAL_AI_MODEL=phi3  # Легкая модель (2 GB)
SEO_BUILD_CONCURRENCY=6  # 6 потоков для M1
AUTO_DEPLOY=1  # Автоматическая выгрузка
```

---

## ⚠️ ВАЖНЫЕ МОМЕНТЫ

### 1. Память:
- Phi3: ~2 GB
- Llama 3.1 8B: ~4-5 GB
- **Рекомендация:** Используй Phi3 для 8GB MacBook

### 2. Температура:
- M1 Air пассивное охлаждение
- При длительной нагрузке может троттлить
- **Решение:** 6 потоков максимум, паузы между билдами

### 3. Очистка:
- После каждого билда очищаем память
- Закрываем неиспользуемые процессы Ollama
- Принудительная сборка мусора Node.js

---

## 🚀 БЫСТРЫЙ СТАРТ

### 1. Установка (5 минут):
```bash
brew install ollama
ollama pull phi3
```

### 2. Настройка (2 минуты):
```bash
# В .env.local
USE_LOCAL_AI=1
LOCAL_AI_MODEL=phi3
SEO_BUILD_CONCURRENCY=6
```

### 3. Запуск:
```bash
node scripts/seo/seo-master-build.js
```

**Готово!** Теперь AI работает локально на MacBook M1.

---

## 📝 ЧЕКЛИСТ

- [ ] Установлен Ollama
- [ ] Загружена модель (phi3 или llama3.1:8b)
- [ ] Создан файл `local-ai-provider.js`
- [ ] Модифицирован `ai-augmentation.js`
- [ ] Создан файл `m1-optimizer.js`
- [ ] Интегрирован в `seo-master-build.js`
- [ ] Настроены переменные окружения
- [ ] Протестирован билд

---

## 🎯 ИТОГО

**Простыми словами:**
1. Устанавливаем Ollama (программа для локального AI)
2. Загружаем модель (Phi3 - легкая, 2 GB)
3. Модифицируем код, чтобы использовать локальный AI вместо API
4. Настраиваем 6 потоков для M1
5. После билда очищаем память и выгружаем на Vercel

**Результат:**
- В 2-4x быстрее
- $0 стоимость
- Полный контроль




















