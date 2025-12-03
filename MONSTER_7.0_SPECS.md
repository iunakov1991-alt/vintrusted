# MONSTER 7.0 — ПОЛНЫЕ СПЕЦИФИКАЦИИ И ЛОГИКА ГЕНЕРАЦИИ

**Версия:** 7.0  
**Дата:** 2024  
**Платформа:** MacBook Air M1, 8GB RAM  
**Запуск:** ТОЛЬКО через Dashboard (MonsterUI)

---

## 📋 АРХИТЕКТУРА

### Принципы
- **Легковесность**: Никаких тяжелых процессов, оптимизация для M1 8GB
- **Автономность**: Самообучение, самовосстановление, самоэволюция
- **Dashboard-Only**: Все запуски ТОЛЬКО через MonsterUI, запрет прямых CLI команд
- **Гениальный контент**: Эксперт-уровень, без флаффа, с таблицами и сценариями

### Модули (A-I)

#### [A] SEMANTIC SCANNER
**Файл:** `monster-7.0/core/modules/semantic-scanner.js`

**Функция:** Сканирует нишу и строит семантическую карту

**Логика:**
1. Анализирует существующий контент
2. Определяет ключевые слова и интенты
3. Выявляет пробелы в контенте
4. Строит семантическую карту (темы, кластеры, связи)

**Выходные данные:**
```json
{
  "keywords": ["vin check", "accident history", ...],
  "intents": ["vin_check", "accident_check", ...],
  "themes": ["vehicle-identity-core", ...],
  "gaps": [...]
}
```

---

#### [B] SEO STRATEGY GENERATOR
**Файл:** `monster-7.0/core/modules/strategy-generator.js`

**Функция:** Генерирует SEO стратегию на основе семантической карты

**Логика:**
1. Принимает семантическую карту от [A]
2. Определяет приоритеты (high/medium/low)
3. Рассчитывает целевое количество страниц
4. Учитывает M1 ограничения (память, конcurrency)
5. Создает план генерации

**Выходные данные:**
```json
{
  "priorities": [
    {
      "type": "vin_check",
      "theme": "vin-check",
      "pages": 10,
      "priority": "high",
      "keywords": [...]
    }
  ],
  "targetPages": 50,
  "m1Constraints": {
    "maxConcurrency": 4,
    "maxMemory": 6GB
  }
}
```

---

#### [C] PROMPT ENGINE BRAIN
**Файл:** `monster-7.0/core/modules/prompt-engine.js`

**Функция:** Генерирует оптимизированные промпты для AI

**Логика:**
1. Базовый промпт из AI Knowledge Core
2. Обогащение E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness)
3. SEO оптимизация (ключевые слова, структура)
4. Интеграция TRIZ принципов
5. Использование мастер-промпта (`master-seo-prompt.js`)

**Мастер-промпт требования:**
- Эксперт-уровень контента (15+ лет опыта)
- Запрет флаффа ("In this article we will...")
- Требование таблиц (минимум 2)
- Требование сценариев (2-4)
- Техническая терминология
- 3000+ слов
- 8-12 секций
- 10-15 FAQ

**Выходные данные:**
```json
{
  "prompt": "...",
  "context": {
    "theme": "vin-check",
    "intent": "vin_check",
    "keywords": [...]
  }
}
```

---

#### [D] SELF-EVOLUTION ENGINE
**Файл:** `monster-7.0/core/modules/evolution-engine.js`

**Функция:** Анализирует результаты и предлагает улучшения

**Логика:**
1. Анализирует сгенерированный контент
2. Сравнивает с лучшими практиками
3. Выявляет паттерны успеха
4. Предлагает улучшения для следующих циклов

**Выходные данные:**
```json
{
  "improvements": [
    {
      "area": "content-length",
      "suggestion": "Increase average section length to 400 words",
      "priority": "high"
    }
  ],
  "patterns": {
    "successful": [...],
    "unsuccessful": [...]
  }
}
```

---

#### [E] TRIZ SELF-REPAIR SYSTEM
**Файл:** `monster-7.0/core/modules/triz-repair.js`

**Функция:** Применяет TRIZ для решения противоречий и ошибок

**Логика:**
1. Выявляет противоречия (например, "нужна скорость, но и качество")
2. Применяет TRIZ принципы (40 изобретательских приемов)
3. Генерирует решения
4. Интегрирует решения в систему

**Примеры противоречий:**
- Скорость генерации vs Качество контента
- Память M1 vs Количество страниц
- Автоматизация vs Контроль качества

---

#### [F] LIBRARY FRESHNESS SCANNER
**Файл:** `monster-7.0/core/modules/library-scanner.js`

**Функция:** Сканирует устаревшие библиотеки и предлагает обновления

**Логика:**
1. Проверяет `package.json`
2. Сравнивает версии с последними
3. Выявляет уязвимости
4. Предлагает безопасные обновления

---

#### [G] AI KNOWLEDGE CORE & TRIZ TRAINER
**Файл:** `monster-7.0/core/ai-knowledge-core/knowledge-core.js`

**Функция:** Централизованное хранилище знаний AI

**Содержимое:**
- Google SEO документация
- Google Analytics документация
- Google Tag Manager документация
- Google Search Console документация
- TRIZ учебник
- Enterprise SEO best practices
- Пользовательские материалы (через Dashboard)

**Методы:**
- `loadKnowledge()` - загрузка знаний
- `getKnowledge(topic)` - получение знаний по теме
- `saveMaterial(text, files)` - сохранение пользовательских материалов

**Формат хранения:**
- `knowledge-base.jsonl` - база знаний
- `user-materials.jsonl` - пользовательские материалы

---

#### [H] DASHBOARD & HUMAN FEEDBACK LOOP
**Файл:** `monster-7.0/core/dashboard/server.js` + `ui/index.html`

**Функция:** Единственная точка входа, визуализация, обучение

**Компоненты:**
1. **Status Bar** - статус системы, CPU/RAM
2. **SEO Metrics** - метрики SEO (сгенерировано, опубликовано, качество, индексация)
3. **Generation Metrics** - метрики генерации (скорость, ошибки)
4. **Quality Metrics** - метрики качества (средний score, распределение)
5. **Explanations** - объяснения действий системы
6. **Self-Questions** - вопросы системы к пользователю
7. **Learning Module** - прием ответов пользователя и интеграция в AI Knowledge Core

**Кнопки управления:**
- `START` - запуск полного цикла
- `REBUILD` - пересборка стратегии
- `LEARN AGAIN` - повторное обучение
- `EVOLVE` - запуск эволюции
- `SELF-REPAIR` - запуск TRIZ ремонта
- `UPDATE LIBRARIES` - обновление библиотек
- `EXPORT STRATEGY` - экспорт стратегии

**API Endpoints:**
- `GET /api/status` - статус системы
- `POST /api/start` - запуск цикла
- `POST /api/stop` - остановка
- `GET /api/tasks` - текущие задачи
- `POST /api/learn-materials` - загрузка материалов для обучения
- `GET /api/metrics` - метрики
- `GET /api/logs` - логи

---

#### [I] BEST-PERFORMANCE LEARNING ENGINE
**Файл:** `monster-7.0/core/modules/performance-learner.js`

**Функция:** Анализирует лучшие результаты и извлекает паттерны

**Логика:**
1. Анализирует сгенерированные страницы
2. Выявляет лучшие (высокий quality score)
3. Сравнивает лучшие/средние/худшие
4. Извлекает паттерны успеха:
   - Структура кластеров
   - Типы страниц
   - Форматы контента
   - Промпты
   - DOM паттерны
   - TRIZ решения
5. Интегрирует паттерны в стратегию, промпты, эволюцию

**Выходные данные:**
```json
{
  "bestPractices": {
    "structure": {...},
    "prompts": {...},
    "content": {...}
  },
  "patterns": {
    "successful": [...],
    "unsuccessful": [...]
  }
}
```

---

## 🔄 ПОЛНЫЙ ЦИКЛ ГЕНЕРАЦИИ

### Последовательность выполнения

```
1. [A] Semantic Scanner
   ↓
2. [B] Strategy Generator
   ↓
3. [C] Prompt Engine
   ↓
4. [I] Content Generator (использует [C])
   ↓
5. [I] Performance Learner
   ↓
6. [D] Evolution Engine
   ↓
7. [E] TRIZ Repair (если есть проблемы)
   ↓
8. [H] Dashboard обновление
```

### Детальная логика Content Generator

**Файл:** `monster-7.0/core/modules/content-generator.js`

#### 1. Инициализация
```javascript
constructor(config) {
  this.config = config;
  this.outputPath = 'public/seo-pages';
  this.cache = new Map();
}
```

#### 2. Выполнение (execute)
```javascript
async execute(params) {
  // 1. Получаем стратегию
  const strategy = params.strategy;
  const priorities = strategy.result.priorities || [];
  
  // 2. Ограничение для M1: максимум 5 приоритетов
  for (const priority of priorities.slice(0, 5)) {
    // 3. Генерируем страницы для приоритета
    const pages = await this.generatePagesForPriority(priority, ...);
    results.pages.push(...pages);
  }
  
  // 4. Сохраняем страницы с валидацией
  await this.savePages(results.pages);
}
```

#### 3. Генерация страницы (generatePage)
```javascript
async generatePage(priority, strategy, semanticMap, prompts, index) {
  // 1. Создаем контекст
  const context = {
    theme: priority.theme,
    intent: priority.type,
    keywords: priority.keywords,
    index: index
  };
  
  // 2. Генерируем контент
  const content = await this.generateContent(context, prompts);
  
  // 3. Строим HTML страницу
  const html = this.buildPage(content, context);
  
  // 4. Рассчитываем качество
  const qualityScore = this.calculateQualityScore(content);
  
  // 5. ВАЛИДАЦИЯ: если качество < 0.7, регенерируем (до 2 попыток)
  if (qualityScore < 0.7) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const regenerated = await this.regenerateLowQualityPage(...);
      const newScore = this.calculateQualityScore(regenerated);
      if (newScore >= 0.7) {
        content = regenerated;
        qualityScore = newScore;
        break;
      }
    }
  }
  
  // 6. Сохраняем
  return {
    content: content,
    html: html,
    qualityScore: qualityScore,
    path: this.generatePagePath(context),
    context: context
  };
}
```

#### 4. Генерация контента (generateContent)
```javascript
async generateContent(context, prompts) {
  // 1. Строим промпт (использует мастер-промпт)
  const prompt = this.buildAIPrompt(basePrompt, context);
  
  // 2. Пытаемся AI генерацию (Ollama или API)
  try {
    const aiResponse = await this.callAI(prompt);
    const parsed = this.parseAIResponse(aiResponse, context);
    if (parsed) return parsed;
  } catch (error) {
    // Fallback на шаблоны
  }
  
  // 3. Fallback: используем шаблоны
  return this.generateFromTemplates(context);
}
```

#### 5. Расчет качества (calculateQualityScore)
```javascript
calculateQualityScore(content) {
  let score = 0.0;
  
  // БАЗОВЫЕ ТРЕБОВАНИЯ
  const wordCount = this.countWords(content);
  if (wordCount >= 3000) score += 0.15;
  else if (wordCount >= 2000) score += 0.10;
  else if (wordCount >= 1500) score += 0.05;
  else if (wordCount < 1000) score -= 0.20;
  
  // СТРУКТУРА
  const sections = content.sections || [];
  if (sections.length >= 8) score += 0.10;
  else if (sections.length < 3) score -= 0.10;
  
  // FAQ
  const faqSection = sections.find(s => s.type === 'faq');
  if (faqSection && faqSection.questions.length >= 10) score += 0.10;
  else score -= 0.05;
  
  // ТАБЛИЦЫ (требование мастер-промпта)
  if (this.hasTables(content)) score += 0.10;
  else score -= 0.05;
  
  // СЦЕНАРИИ (требование мастер-промпта)
  if (this.hasScenarios(content)) score += 0.10;
  else score -= 0.05;
  
  // ТЕХНИЧЕСКАЯ ТЕРМИНОЛОГИЯ
  if (this.hasTechnicalTerms(content)) score += 0.05;
  
  // ФЛАФФ (запрещено)
  if (this.hasFluff(content)) score -= 0.10;
  
  // Нормализация: 0.0 - 1.0
  return Math.max(0.0, Math.min(1.0, score));
}
```

#### 6. Построение HTML (buildPage)
```javascript
buildPage(content, context) {
  // 1. Генерируем секции
  const sectionsHTML = content.sections
    .filter(s => s.type !== 'faq')
    .map(s => this.renderSection(s))
    .join('\n');
  
  // 2. Генерируем FAQ
  const faqHTML = this.renderFAQ(faqSection);
  
  // 3. Строим полный HTML с:
  //    - Header (логотип, навигация, языки)
  //    - Hero section (фон, overlay, заголовок)
  //    - Main content (секции)
  //    - FAQ section
  //    - Footer
  //    - Inline CSS (из seo-page-template.css)
  //    - Schema.org structured data
  
  return html;
}
```

#### 7. Сохранение страниц (savePages)
```javascript
async savePages(pages) {
  const minQualityThreshold = 0.7;
  
  for (const page of pages) {
    const qualityScore = page.qualityScore || this.calculateQualityScore(page.content);
    
    // ВАЛИДАЦИЯ: если качество < 0.7, регенерируем
    if (qualityScore < minQualityThreshold) {
      // Попытка регенерации (до 2 раз)
      // ...
    }
    
    // Сохранение в public/seo-pages/{theme}-{index}/index.html
    const dir = path.join(this.outputPath, page.path);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), page.html);
  }
}
```

---

## 📊 МЕТРИКИ И КОНТРОЛЬ КАЧЕСТВА

### Метрики страниц
- **Сгенерировано**: количество созданных страниц
- **Опубликовано**: количество сохраненных страниц
- **Качество**: средний quality score (0.0 - 1.0)
- **Проиндексировано Google**: (будущее) количество проиндексированных страниц

### Контроль качества

**Минимальный порог:** 0.7

**Проверки:**
1. ✅ Длина контента (3000+ слов = +0.15)
2. ✅ Количество секций (8+ = +0.10)
3. ✅ Глубина секций (300+ слов = +0.10)
4. ✅ FAQ (10+ вопросов = +0.10)
5. ✅ Таблицы (2+ = +0.10)
6. ✅ Сценарии (2-4 = +0.10)
7. ✅ Техническая терминология (+0.05)
8. ✅ Примеры/кейсы (+0.05)
9. ✅ Структурированность (+0.05)
10. ❌ Флафф (-0.10)

**Автоматическая регенерация:**
- Если quality score < 0.7, система пытается регенерировать контент до 2 раз
- Используются улучшенные промпты
- Если не помогло, сохраняется с предупреждением

---

## 🚀 ЗАПУСК И ДЕПЛОЙ

### Локальный запуск
```bash
npm run monster:start
# Открыть http://localhost:3000
```

### Production (Vercel)

**Конфигурация:** `vercel.json`

**Rewrite для SEO страниц:**
```json
{
  "source": "/seo-pages/:path*",
  "destination": "/public/seo-pages/:path*/index.html"
}
```

**Структура файлов:**
```
public/seo-pages/
  ├── vin_check-0/
  │   └── index.html
  ├── vin_check-1/
  │   └── index.html
  └── ...
```

**URL страниц:**
- `https://vintrusted.com/seo-pages/vin_check-0/`
- `https://vintrusted.com/seo-pages/vin_check-1/`

---

## 📝 МАСТЕР-ПРОМПТ

**Файл:** `monster-7.0/core/prompts/master-seo-prompt.js`

**Основан на:** образце экспертного уровня статьи

**Требования:**
- Эксперт-уровень (15+ лет опыта)
- Запрет флаффа
- Таблицы (минимум 2)
- Сценарии (2-4)
- Техническая терминология
- 3000+ слов
- 8-12 секций
- 10-15 FAQ

**Формат ответа:**
```json
{
  "title": "...",
  "h1": "...",
  "metaDescription": "...",
  "sections": [
    {"type": "introduction", "heading": "...", "content": "..."},
    {"type": "main", "heading": "...", "content": "...", "tables": [...]},
    {"type": "scenario", "heading": "...", "scenario": {...}},
    {"type": "faq", "questions": [{"q": "...", "a": "..."}]}
  ]
}
```

---

## 🔧 КОНФИГУРАЦИЯ

**Файл:** `config/monster.config.json`

```json
{
  "m1Optimization": true,
  "localAI": true,
  "aiModel": "phi3",
  "maxConcurrency": 4,
  "maxMemory": 6GB,
  "minQualityScore": 0.7,
  "targetPagesPerBuild": 50
}
```

---

## 📚 ДОКУМЕНТАЦИЯ

- `MONSTER_7.0_QUICKSTART.md` - быстрый старт
- `MONSTER_7.0_ARCHITECTURE.md` - архитектура
- `monster-7.0/README.md` - общая документация
- `monster-7.0/docs/QUALITY_SYSTEM_EXPLANATION.md` - система качества

---

**Версия:** 7.0  
**Последнее обновление:** 2024

