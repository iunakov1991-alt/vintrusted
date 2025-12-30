# 🎯 Как система выбирает тему для статей

**Дата:** 2025-12-03  
**Цель:** Объяснить механизм выбора темы в цикле самообучения и реальной генерации

---

## 🔍 ДВА РЕЖИМА ВЫБОРА ТЕМЫ

### 1. **Цикл самообучения** (фиксированная тема)
### 2. **Реальная генерация** (динамический выбор)

---

## 📚 РЕЖИМ 1: ЦИКЛ САМООБУЧЕНИЯ

### Как выбирается тема?

**В `self-learning-loop.js`:**

```javascript
const context = {
  make: 'Toyota',           // ← Фиксированная марка
  model: 'Camry',           // ← Фиксированная модель
  year: '2018',             // ← Фиксированный год
  stateSlug: 'california',  // ← Фиксированный штат
  stateLabel: 'California',
  intent: 'vin_check',      // ← Фиксированный intent
  lang: 'en',
  vin: '4T1BF1FK3FU123456'  // ← Фиксированный VIN
};
```

**Тема всегда одинаковая:**
- ✅ **2018 Toyota Camry в California**
- ✅ **Intent: vin_check**
- ✅ **Язык: en**

---

### Почему фиксированная тема?

**Цель самообучения:** Показать, как AI улучшается на одной и той же теме

**Преимущества:**
1. ✅ **Сравнимость** - все версии (v0-v10) про одну тему
2. ✅ **Видимость прогресса** - видно улучшение качества на одной теме
3. ✅ **Фокус на обучении** - не отвлекается на разные темы
4. ✅ **Простота** - не нужно выбирать тему, можно сконцентрироваться на качестве

**Аналогия:**
- Спортсмен тренируется на одной дистанции, чтобы видеть прогресс
- Художник рисует один сюжет много раз, чтобы улучшить технику

---

### Можно ли изменить тему?

**Да, можно изменить в коде:**

```javascript
// В self-learning-loop.js, методы:
// - generateArticleWithoutTraining()
// - generateArticleWithTraining()

const context = {
  make: 'Honda',        // ← Изменить марку
  model: 'Accord',      // ← Изменить модель
  year: '2020',         // ← Изменить год
  stateSlug: 'texas',   // ← Изменить штат
  stateLabel: 'Texas',
  intent: 'vin_check',
  lang: 'en',
  vin: '19XFC2F59LE123456'  // ← Изменить VIN
};
```

**Но для обучения лучше оставить одну тему**, чтобы видеть прогресс.

---

## 🌐 РЕЖИМ 2: РЕАЛЬНАЯ ГЕНЕРАЦИЯ

### Как выбирается тема?

**В `seo-master-build.js` через `URLFactory`:**

```javascript
// 1. URLFactory получает seeds (семена)
const seeds = this.getCurrentSeeds();
const makes = seeds.makes || [];      // ['Toyota', 'Honda', 'Ford', ...]
const models = seeds.models || [];    // ['Camry', 'Accord', 'F-150', ...]
const years = seeds.years || [];      // [2015, 2016, 2017, ..., 2024]
const states = seeds.states || [];    // ['california', 'texas', 'florida', ...]
const intents = config.intents || []; // ['vin_check', 'title_check', ...]

// 2. Генерирует все комбинации
for (const state of states) {
  for (const make of makes) {
    for (const model of models) {
      for (const year of years) {
        for (const intent of intents) {
          // Создает страницу для каждой комбинации
          pages.push({
            make,
            model,
            year,
            stateSlug: state.slug,
            intent,
            lang: 'en',
            vin: this.generateVIN(make, model, year)
          });
        }
      }
    }
  }
}
```

**Результат:** Тысячи комбинаций тем

**Пример:**
- 50 марок × 200 моделей × 10 лет × 50 штатов × 1 intent = **5,000,000 страниц**

---

### Откуда берутся seeds?

**В `seed-generator.js`:**

```javascript
class SeedGenerator {
  generate(analysis) {
    // Анализирует существующие страницы
    // Определяет пробелы в покрытии
    // Генерирует новые seeds для заполнения пробелов
    
    return {
      makes: ['Toyota', 'Honda', 'Ford', 'Chevrolet', ...],
      models: ['Camry', 'Accord', 'F-150', 'Silverado', ...],
      years: [2015, 2016, 2017, ..., 2024],
      states: [
        { slug: 'california', label: 'California' },
        { slug: 'texas', label: 'Texas' },
        ...
      ],
      intents: ['vin_check', 'title_check', ...]
    };
  }
}
```

**Источники seeds:**
1. ✅ **Конфигурация** (`data/seo/config.json`)
2. ✅ **Анализ существующих страниц** (пробелы в покрытии)
3. ✅ **SEO Decision Engine** (приоритеты на основе данных)
4. ✅ **Ручной ввод** (администратор может добавить)

---

### Приоритеты выбора тем

**В `url-factory.js`:**

```javascript
// Применяются веса из Reinforcement Learning
const intentWeights = this.normalizeWeights(this.rlState.intentWeights || {});
const langWeights = this.normalizeWeights(this.rlState.languageWeights || {});

// Приоритеты:
// 1. Высокочастотные запросы (high-volume)
// 2. Среднечастотные запросы (mid-volume)
// 3. Низкочастотные запросы (low-volume)
```

**Факторы приоритета:**
- ✅ **Search volume** - популярность запроса
- ✅ **Competition** - конкуренция
- ✅ **Conversion potential** - потенциал конверсии
- ✅ **Coverage gaps** - пробелы в покрытии

---

## 🔄 СРАВНЕНИЕ РЕЖИМОВ

| Аспект | Самообучение | Реальная генерация |
|--------|--------------|-------------------|
| **Тема** | Фиксированная (Toyota Camry 2018 CA) | Динамическая (все комбинации) |
| **Цель** | Показать прогресс обучения | Покрыть все возможные запросы |
| **Выбор** | Жестко задан в коде | Через URLFactory + Seeds |
| **Количество** | 1 тема (11 версий) | Миллионы тем |
| **Приоритеты** | Нет (одна тема) | Да (веса, пробелы) |

---

## 🎯 ЛОГИКА ВЫБОРА В РЕАЛЬНОЙ ГЕНЕРАЦИИ

### Шаг 1: Анализ пробелов

```javascript
// SeedAnalyzerGenerator.identifyGaps()
const gaps = {
  missingMakes: ['Tesla', 'Rivian'],      // Нет страниц для этих марок
  missingModels: ['Model 3', 'R1T'],     // Нет страниц для этих моделей
  missingYears: [2024, 2025],            // Нет страниц для этих лет
  missingStates: ['alaska', 'hawaii'],   // Нет страниц для этих штатов
  lowQualityPages: [...]                 // Страницы низкого качества
};
```

### Шаг 2: Генерация приоритетов

```javascript
// SEO Decision Engine принимает решение
const decision = {
  targetPages: 15000,
  strategy: "fill-coverage-gaps",
  priorities: [
    "1. Заполнить пробелы в покрытии (Tesla, Rivian)",
    "2. Улучшить качество низкокачественных страниц",
    "3. Добавить новые штаты (Alaska, Hawaii)",
    "4. Обновить старые страницы (2015-2017 → 2024)"
  ]
};
```

### Шаг 3: Построение плана URL

```javascript
// URLFactory.buildUrlPlan()
const urlPlan = [
  { make: 'Tesla', model: 'Model 3', year: 2024, state: 'california', ... },
  { make: 'Tesla', model: 'Model Y', year: 2024, state: 'california', ... },
  { make: 'Rivian', model: 'R1T', year: 2024, state: 'california', ... },
  // ... тысячи комбинаций
];
```

### Шаг 4: Генерация контента

```javascript
// Для каждой темы из плана
for (const item of urlPlan) {
  const context = {
    make: item.make,
    model: item.model,
    year: item.year,
    stateSlug: item.stateSlug,
    stateLabel: humanizeStateSlug(item.stateSlug),
    intent: item.intent,
    lang: item.lang,
    vin: generateVIN(item.make, item.model, item.year)
  };
  
  // Генерируем статью для этой темы
  const article = await generateArticle(context);
}
```

---

## 💡 ПОЧЕМУ РАЗНЫЕ ПОДХОДЫ?

### Самообучение: Фиксированная тема

**Причина:** 
- Нужно показать прогресс на одной теме
- Сравнивать версии v0-v10
- Фокус на качестве, а не на разнообразии

**Аналогия:**
- Ученик пишет одно сочинение много раз, чтобы улучшить технику
- Не пишет разные сочинения каждый раз

---

### Реальная генерация: Динамический выбор

**Причина:**
- Нужно покрыть все возможные запросы
- Заполнить пробелы в покрытии
- Учесть приоритеты и веса

**Аналогия:**
- Издательство выпускает книги на разные темы
- Выбирает темы на основе спроса и пробелов

---

## 🔧 КАК ИЗМЕНИТЬ ТЕМУ В САМООБУЧЕНИИ

### Вариант 1: Изменить в коде

```javascript
// В self-learning-loop.js
const context = {
  make: 'Honda',        // ← Изменить
  model: 'Accord',      // ← Изменить
  year: '2020',         // ← Изменить
  stateSlug: 'texas',   // ← Изменить
  stateLabel: 'Texas',
  intent: 'vin_check',
  lang: 'en',
  vin: '19XFC2F59LE123456'
};
```

### Вариант 2: Сделать параметризованным

```javascript
// Можно добавить параметры в run-learning-loop.js
const make = process.argv[3] || 'Toyota';
const model = process.argv[4] || 'Camry';
const year = process.argv[5] || '2018';
const state = process.argv[6] || 'california';

const context = {
  make,
  model,
  year,
  stateSlug: state,
  stateLabel: humanizeStateSlug(state),
  intent: 'vin_check',
  lang: 'en',
  vin: generateVIN(make, model, year)
};
```

**Запуск:**
```bash
node scripts/seo/learning/run-learning-loop.js 10 Honda Accord 2020 texas
```

---

## 📊 ПРИМЕРЫ ТЕМ

### Самообучение (текущая):
- **Тема:** 2018 Toyota Camry в California
- **Intent:** vin_check
- **Язык:** en

### Реальная генерация (примеры):
- **Тема 1:** 2024 Tesla Model 3 в California
- **Тема 2:** 2015 Honda Accord в Texas
- **Тема 3:** 2020 Ford F-150 во Florida
- **Тема 4:** 2018 Chevrolet Silverado в New York
- **...** (миллионы комбинаций)

---

## 🎯 ИТОГ

### Самообучение:
- ✅ **Фиксированная тема** (Toyota Camry 2018 CA)
- ✅ **Цель:** Показать прогресс на одной теме
- ✅ **Выбор:** Жестко задан в коде
- ✅ **Можно изменить:** Да, в коде

### Реальная генерация:
- ✅ **Динамический выбор** (все комбинации)
- ✅ **Цель:** Покрыть все возможные запросы
- ✅ **Выбор:** Через URLFactory + Seeds + Приоритеты
- ✅ **Источники:** Конфигурация, анализ пробелов, SEO Decision Engine

**Ключевое различие:**
- Самообучение = **Одна тема, много итераций** (качество)
- Реальная генерация = **Много тем, одна итерация** (покрытие)

---

*Создано: 2025-12-03*  
*Версия: 1.0*















