# 🔬 MONSTER 7.1 (PHI-3 TRIZ EDITION) — ТРИЗ-АНАЛИЗ И ПЛАН ПЕРЕХОДА

## 📋 ИКР (Идеальный Конечный Результат)

**Monster 7.1 на M1 + Phi-3:**
- ✅ Работает быстро и стабильно
- ✅ Генерирует качественные SEO-страницы батчами (20-50 за прогон)
- ✅ Сам себя улучшает через легкие модули обучения
- ✅ Не перегружает железо (CPU/RAM)
- ✅ Простая архитектура для одного разработчика
- ✅ Быстрый MVP с возможностью расширения

---

## 🔍 НАЙДЕННЫЕ ПРОТИВОРЕЧИЯ (ТРИЗ)

### ПРОТИВОРЕЧИЕ 1: Монолитная генерация vs Слабая модель

**Проблема:**
- Текущая реализация: один AI-вызов генерирует всю статью (3000+ слов, 4000 токенов)
- Файл: `monster-7.0/core/modules/content-generator.js:278`
- Код: `localAI.generateText(aiPrompt, { maxTokens: 4000 })`
- Промпт включает: все секции, таблицы, сценарии, FAQ в одном запросе

**Противоречие (ТРИЗ):**
- **Нужно:** Генерировать глубокий контент (3000+ слов, 8-12 секций, 10-15 FAQ)
- **Но:** Phi-3 слабая модель, один большой промпт → таймауты, низкое качество, долго

**ТРИЗ-решение: ПРИНЦИП "ДРОБЛЕНИЕ"**
- Разделить генерацию на части:
  - Один AI-вызов = одна структурная единица (секция, таблица, сценарий, FAQ-блок)
  - Финальная HTML-страница собирается локально (JS), без участия AI
- **Выигрыш:** 
  - Каждый промпт короткий (300-500 токенов input, 600-1000 output)
  - Быстрее (параллелизация возможна)
  - Качественнее (модель фокусируется на одной задаче)

---

### ПРОТИВОРЕЧИЕ 2: Нет батчей vs Миллион страниц

**Проблема:**
- Текущая реализация: `strategyGenerator.maxPages: 1000000` (конфиг)
- Файл: `config/monster.config.json:21`
- Код: `monster-7.0/core/modules/content-generator.js:80` - обрабатывает все priorities без ограничений

**Противоречие (ТРИЗ):**
- **Нужно:** Генерировать много страниц (цель: 1M страниц)
- **Но:** M1 8GB ограничен, последовательная генерация, одна страница = 8-16 минут

**ТРИЗ-решение: ПРИНЦИП "ДИНАМИЧНОСТЬ" + "ПЕРЕХОД В ДРУГОЕ ИЗМЕРЕНИЕ"**
- Добавить уровень очереди задач:
  - `maxPagesPerRun: 20-50` страниц за один запуск
  - Возможность паузы/возобновления
  - Прогресс-бар и статус в дашборде
- **Выигрыш:**
  - Контролируемая нагрузка на систему
  - Возможность остановки/возобновления
  - Прогресс виден пользователю

---

### ПРОТИВОРЕЧИЕ 3: Раздутый Knowledge Core vs Короткие промпты

**Проблема:**
- Текущая реализация: `prompt-engine.js:124-167` загружает весь `knowledge-base.jsonl`
- Все знания (SEO, Analytics, TRIZ, Best Practices) загружаются в память
- Промпт обогащается всеми знаниями сразу

**Противоречие (ТРИЗ):**
- **Нужно:** Использовать знания из базы (SEO, GA4, GSC, TRIZ)
- **Но:** Phi-3 имеет ограничение на input tokens (~300-500), нельзя "скормить всё"

**ТРИЗ-решение: ПРИНЦИП "ИСПОЛЬЗОВАНИЕ РЕСУРСОВ" + "ОТДЕЛЕНИЕ"**
- Легкий Knowledge Core:
  - Несколько маленьких файлов `.md/.jsonl` (SEO, GA4, GSC, TRIZ)
  - Подгрузка только нужных кусков по теме
  - Без попытки "скормить всё" Phi-3 в одном промпте
- **Выигрыш:**
  - Короткие промпты (300-500 токенов)
  - Быстрее загрузка
  - Меньше памяти

---

### ПРОТИВОРЕЧИЕ 4: Все модули всегда активны vs Нужен быстрый MVP

**Проблема:**
- Текущая реализация: `orchestrator.js:30-82` инициализирует все модули всегда
- Все модули (Semantic Scanner, Strategy Generator, Evolution Engine, TRIZ Repair, Library Scanner, Performance Learner) запускаются даже если не нужны

**Противоречие (ТРИЗ):**
- **Нужно:** Сложная архитектура с TRIZ/Evolution/Best-Performance
- **Но:** Один разработчик, нужен быстрый MVP

**ТРИЗ-решение: ПРИНЦИП "ОТДЕЛЕНИЕ" (ЯДРО vs НАДСТРОЙКИ)**
- **ЯДРО (первая реализация):**
  - Semantic Scanner (упрощённый)
  - Strategy Generator (базовый)
  - Prompt Engine (под Phi-3)
  - Content Generator (по секциям)
  - QualityScore (минимальный)
  - Dashboard (старт/стоп/батчи/логи)
- **НАДСТРОЙКИ (позже):**
  - Расширенный TRIZ Self-Repair
  - Расширенный Evolution Engine
  - Расширенный Best-Performance Learner
  - Library Scanner
- **Выигрыш:**
  - Быстрый MVP с ядром
  - Надстройки добавляются постепенно

---

### ПРОТИВОРЕЧИЕ 5: Нет очереди vs Много задач

**Проблема:**
- Текущая реализация: нет очереди задач, все запускается синхронно
- Нет возможности паузы/возобновления
- Нет прогресс-бара для длительных операций

**Противоречие (ТРИЗ):**
- **Нужно:** Обработать много страниц
- **Но:** Нет контроля над процессом, нельзя остановить/возобновить

**ТРИЗ-решение: ПРИНЦИП "ДИНАМИЧНОСТЬ"**
- Добавить очередь задач:
  - `TaskQueue` класс для управления задачами
  - Возможность паузы/возобновления
  - Прогресс-бар в дашборде
- **Выигрыш:**
  - Контроль над процессом
  - Возможность остановки/возобновления
  - Прогресс виден пользователю

---

## 🎯 ПЛАН ПЕРЕХОДА К MONSTER 7.1

### ЭТАП 1: РЕФАКТОРИНГ ГЕНЕРАЦИИ (ПРИНЦИП "ДРОБЛЕНИЕ")

#### 1.1. Разделить генерацию на части

**Файлы для изменения:**
- `monster-7.0/core/modules/content-generator.js` → `monster-7.1/core/modules/content-generator-sectioned.js`

**Новая архитектура:**
```javascript
class SectionedContentGenerator {
  // Генерация одной секции
  async generateSection(sectionType, context) {
    const prompt = this.buildSectionPrompt(sectionType, context);
    const response = await localAI.generateText(prompt, {
      maxTokens: 600-1000 // Короткий промпт
    });
    return this.parseSection(response);
  }

  // Генерация таблицы
  async generateTable(tableType, context) {
    const prompt = this.buildTablePrompt(tableType, context);
    const response = await localAI.generateText(prompt, {
      maxTokens: 400-600
    });
    return this.parseTable(response);
  }

  // Генерация FAQ блока
  async generateFAQBlock(questions, context) {
    const prompt = this.buildFAQPrompt(questions, context);
    const response = await localAI.generateText(prompt, {
      maxTokens: 800-1200
    });
    return this.parseFAQ(response);
  }

  // Сборка финальной страницы (без AI)
  buildPage(sections, tables, faq) {
    // Локальная сборка HTML из частей
    return this.renderHTML(sections, tables, faq);
  }
}
```

**Профиль под Phi-3:**
- `maxInputTokens: 300-500`
- `maxOutputTokens: 600-1000`
- `callsPerPage: 10-15` (8-12 секций + 2-3 таблицы/сценария)

---

#### 1.2. Упростить Knowledge Core

**Файлы для изменения:**
- `monster-7.0/core/ai-knowledge-core/knowledge-core.js` → `monster-7.1/core/ai-knowledge-core/knowledge-core-light.js`

**Новая архитектура:**
```javascript
class LightKnowledgeCore {
  // Загрузка только нужных знаний по теме
  async getKnowledgeForTopic(topic, maxTokens = 500) {
    const knowledgeFiles = {
      'seo': 'data/knowledge/seo-guidelines.md',
      'analytics': 'data/knowledge/ga4-basics.md',
      'triz': 'data/knowledge/triz-principles.md',
      'best-practices': 'data/knowledge/seo-best-practices.md'
    };

    const file = knowledgeFiles[topic];
    if (!file || !fs.existsSync(file)) {
      return '';
    }

    const content = fs.readFileSync(file, 'utf8');
    // Обрезаем до maxTokens символов
    return content.substring(0, maxTokens * 4); // ~4 символа на токен
  }
}
```

---

### ЭТАП 2: ДОБАВИТЬ БАТЧИ И ОЧЕРЕДЬ (ПРИНЦИП "ДИНАМИЧНОСТЬ")

#### 2.1. Создать TaskQueue

**Новый файл:**
- `monster-7.1/core/utils/task-queue.js`

**Архитектура:**
```javascript
class TaskQueue {
  constructor(config) {
    this.maxPagesPerRun = config.maxPagesPerRun || 20;
    this.queue = [];
    this.currentTask = null;
    this.isPaused = false;
    this.progress = { completed: 0, total: 0 };
  }

  async addTask(task) {
    this.queue.push(task);
    this.progress.total++;
  }

  async processQueue() {
    while (this.queue.length > 0 && !this.isPaused) {
      const task = await this.queue.shift();
      this.currentTask = task;
      await this.executeTask(task);
      this.progress.completed++;
    }
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
    this.processQueue();
  }
}
```

---

#### 2.2. Обновить конфиг

**Файл:**
- `config/monster-7.1.config.json`

**Изменения:**
```json
{
  "version": "7.1",
  "name": "Monster 7.1 (Phi-3 TRIZ Edition)",
  "platform": "M1",
  
  "phi3Profile": {
    "maxInputTokens": 500,
    "maxOutputTokens": 1000,
    "callsPerPage": 15,
    "timeout": 60000
  },
  
  "batches": {
    "maxPagesPerRun": 20,
    "pauseEnabled": true,
    "resumeEnabled": true
  },
  
  "modules": {
    "core": {
      "semanticScanner": { "enabled": true, "simplified": true },
      "strategyGenerator": { "enabled": true, "basic": true },
      "promptEngine": { "enabled": true, "phi3Optimized": true },
      "contentGenerator": { "enabled": true, "sectioned": true },
      "qualityScore": { "enabled": true, "minimal": true },
      "dashboard": { "enabled": true }
    },
    "extensions": {
      "trizRepair": { "enabled": false },
      "evolutionEngine": { "enabled": false },
      "performanceLearner": { "enabled": false },
      "libraryScanner": { "enabled": false }
    }
  }
}
```

---

### ЭТАП 3: УПРОСТИТЬ ОРКЕСТРАТОР (ПРИНЦИП "ОТДЕЛЕНИЕ")

#### 3.1. Разделить на ЯДРО и НАДСТРОЙКИ

**Файл:**
- `monster-7.1/core/orchestrator-core.js`

**Архитектура:**
```javascript
class MonsterOrchestratorCore {
  async initialize() {
    // ТОЛЬКО ЯДРО
    this.modules.semanticScanner = new SemanticScanner(this.config);
    this.modules.strategyGenerator = new StrategyGenerator(this.config);
    this.modules.promptEngine = new PromptEngine(this.config);
    this.modules.contentGenerator = new SectionedContentGenerator(this.config);
    this.modules.qualityScore = new QualityScore(this.config);
    
    // НАДСТРОЙКИ (опционально)
    if (this.config.modules.extensions.trizRepair.enabled) {
      this.modules.trizRepair = new TRIZRepair(this.config);
    }
    // ... остальные надстройки
  }
}
```

---

## 📁 СТРУКТУРА MONSTER 7.1

```
monster-7.1/
├── core/
│   ├── orchestrator-core.js          # Упрощённый оркестратор (только ядро)
│   ├── modules/
│   │   ├── content-generator-sectioned.js  # Генерация по секциям
│   │   ├── prompt-engine-phi3.js           # Промпты под Phi-3
│   │   ├── semantic-scanner-simple.js      # Упрощённый сканер
│   │   └── strategy-generator-basic.js    # Базовый генератор стратегий
│   ├── ai-knowledge-core/
│   │   └── knowledge-core-light.js        # Лёгкий Knowledge Core
│   └── utils/
│       ├── task-queue.js                   # Очередь задач
│       └── batch-manager.js               # Менеджер батчей
├── dashboard/
│   └── ui/                                 # Обновлённый дашборд с батчами
└── config/
    └── monster-7.1.config.json             # Новый конфиг
```

---

## ✅ ЧЕКЛИСТ МИГРАЦИИ

### Фаза 1: Ядро (MVP)
- [ ] Создать `monster-7.1/core/modules/content-generator-sectioned.js`
- [ ] Реализовать генерацию по секциям (одна секция = один AI-вызов)
- [ ] Создать `monster-7.1/core/utils/task-queue.js`
- [ ] Добавить батчи (maxPagesPerRun: 20)
- [ ] Обновить дашборд (прогресс-бар, пауза/возобновление)
- [ ] Создать `monster-7.1/core/ai-knowledge-core/knowledge-core-light.js`
- [ ] Упростить промпты (300-500 токенов input)

### Фаза 2: Оптимизация
- [ ] Профилировать Phi-3 (maxInputTokens, maxOutputTokens)
- [ ] Оптимизировать промпты под Phi-3
- [ ] Добавить кэширование секций
- [ ] Улучшить качество генерации

### Фаза 3: Надстройки (опционально)
- [ ] Добавить TRIZ Self-Repair (лёгкий)
- [ ] Добавить Evolution Engine (лёгкий)
- [ ] Добавить Best-Performance Learner (лёгкий)

---

## 🚀 ПРЕИМУЩЕСТВА MONSTER 7.1

1. **Быстрее:** Генерация по секциям (10-15 коротких вызовов вместо 1 длинного)
2. **Качественнее:** Phi-3 фокусируется на одной задаче за раз
3. **Контролируемее:** Батчи, очередь, пауза/возобновление
4. **Проще:** Ядро отделено от надстроек
5. **Масштабируемее:** Легко добавлять надстройки постепенно

---

**Дата создания:** 2024-12-03  
**Версия:** Monster 7.1 (Phi-3 TRIZ Edition)  
**Методология:** ТРИЗ (Теория решения изобретательских задач)
















