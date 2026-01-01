# 🧪 План тестирования системы исправлений

**Дата:** 2025-12-04  
**Цель:** Проверить, что все правила и паттерны из analysis-report.md работают корректно

---

## ✅ Что было добавлено

### Правила в `rules.json` (21 правило):
1. ✅ `syntax_incomplete_cross_re` - исправляет "cross-re."
2. ✅ `syntax_incomplete_transforms` - исправляет "transforms."
3. ✅ `syntax_incomplete_detection` - исправляет "Detection."
4. ✅ `format_incomplete_list_has` - исправляет списки с "has."
5. ✅ `format_markdown_table_not_converted` - предупреждение о таблицах
6. ✅ `structure_cta_canonical_format` - проверка формата CTA
7. ✅ `structure_internal_links_missing_hyperlinks` - проверка ссылок

### Паттерны в `article-post-processor.js`:
- ✅ `wordCompletions`: cross-re, transforms, Detection, has.
- ✅ Обработчики для незавершенных списков и таблиц

---

## 🧪 Тесты для проверки

### Тест 1: Незавершенные предложения

**Входные данные:**
```
For an Arizona buyer, this decoded information should be cross-re.
This methodical, engineering-level approach transforms.
Answer: Odometer rollback is the illegal practice. Detection.
```

**Ожидаемый результат:**
```
For an Arizona buyer, this decoded information should be cross-referenced with multiple data sources.
This methodical, engineering-level approach transforms raw VIN data into actionable intelligence for informed decision-making.
Answer: Odometer rollback is the illegal practice. Detection requires checking service records, inspection reports, and comparing mileage readings across multiple sources.
```

**Команда для проверки:**
```bash
# Создать тестовый файл с проблемными предложениями
# Запустить post-processor
node -e "
const { ArticlePostProcessor } = require('./scripts/seo/learning/article-post-processor');
const processor = new ArticlePostProcessor();
const testContent = 'For an Arizona buyer, this decoded information should be cross-re.';
const result = processor.process({ content: testContent }, {});
console.log('Result:', result.content);
"
```

---

### Тест 2: Незавершенные списки

**Входные данные:**
```html
<ul><li>Confirming the vehicle has.</li></ul>
```

**Ожидаемый результат:**
```html
<ul><li>Confirming the vehicle has been verified through comprehensive VIN history analysis.</li></ul>
```

---

### Тест 3: Незавершенные таблицы markdown

**Входные данные:**
```html
<p>| Position | Range | Meaning |
|---------|-------|---------|
| 1-3 | WMI | World Manufacturer Identifier</p>
```

**Ожидаемый результат:**
```html
<table>
<tr><th>Position</th><th>Range</th><th>Meaning</th></tr>
<tr><td>1-3</td><td>WMI</td><td>World Manufacturer Identifier</td></tr>
</table>
```

---

### Тест 4: CTA канонический формат

**Входные данные:**
```
Check Your VIN Now
```

**Ожидаемый результат:**
- Предупреждение о неканоническом формате
- Должно быть: "Check this 2017 Audi RS7 VIN now"

---

### Тест 5: Internal Links без гиперссылок

**Входные данные:**
```
## Related VIN Check Guides
Check other guides for similar vehicles.
```

**Ожидаемый результат:**
- Предупреждение об отсутствии гиперссылок
- Должны быть реальные `<a href>` ссылки

---

## 🚀 Полный тест генерации статьи

### Запуск генерации тестовой статьи:

```bash
# Генерация одной случайной статьи
node scripts/generate-single-random-article.js

# Или оптимизированная версия (быстрее)
node scripts/generate-single-random-article-optimized.js
```

### Проверка результата:

1. **Открыть сгенерированный HTML файл:**
   ```bash
   open public/random-articles/random-article-*.html
   ```

2. **Проверить:**
   - ✅ Нет незавершенных предложений (cross-re, transforms, Detection)
   - ✅ Нет незавершенных списков (has.)
   - ✅ Таблицы правильно сконвертированы в HTML
   - ✅ CTA следует каноническому формату
   - ✅ Internal Links содержат реальные гиперссылки

3. **Проверить логи:**
   - Должны быть сообщения о применении правил
   - Должны быть предупреждения о проблемах (если есть)

---

## 📊 Автоматическая проверка правил

### Скрипт для проверки всех правил:

```javascript
// scripts/test-rules.js
const { RuleEngineIntegration } = require('./seo/learning/rule-engine-integration');
const { ArticlePostProcessor } = require('./seo/learning/article-post-processor');

const ruleEngine = new RuleEngineIntegration();
const processor = new ArticlePostProcessor();

// Тестовые случаи
const testCases = [
  {
    name: 'cross-re',
    input: 'For an Arizona buyer, this decoded information should be cross-re.',
    expected: 'cross-referenced'
  },
  {
    name: 'transforms',
    input: 'This methodical approach transforms.',
    expected: 'transforms raw VIN data'
  },
  {
    name: 'Detection',
    input: 'Answer: Odometer rollback. Detection.',
    expected: 'Detection requires checking'
  },
  {
    name: 'has.',
    input: '<ul><li>Confirming the vehicle has.</li></ul>',
    expected: 'has been verified'
  }
];

// Запуск тестов
testCases.forEach(test => {
  const result = processor.process({ content: test.input }, {});
  const passed = result.content.includes(test.expected);
  console.log(`${test.name}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
  if (!passed) {
    console.log(`  Expected: ${test.expected}`);
    console.log(`  Got: ${result.content.substring(0, 100)}...`);
  }
});
```

---

## 🎯 Критерии успеха

### Все тесты должны пройти:

- [ ] ✅ Незавершенные предложения исправляются автоматически
- [ ] ✅ Незавершенные списки завершаются
- [ ] ✅ Таблицы markdown конвертируются в HTML
- [ ] ✅ CTA проверяется на канонический формат
- [ ] ✅ Internal Links проверяются на наличие гиперссылок
- [ ] ✅ Правила применяются при генерации статей
- [ ] ✅ Post-processor не пропускает исправления при ошибках
- [ ] ✅ Валидатор использует правила из rules.json

---

## 📝 Следующие шаги

1. **Запустить генерацию тестовой статьи**
2. **Проверить результат на наличие проблем**
3. **Убедиться, что все правила применяются**
4. **При необходимости добавить дополнительные паттерны**

---

**Статус:** ✅ Готово к тестированию
















