# 🎯 ЛОГИКА ВЫБОРА ЯЗЫКА И ТЕМЫ В MONSTER 8.0

**Дата:** 2025-12-06  
**Версия:** MONSTER 8.0

---

## 📋 КАК ВЫБИРАЕТСЯ ЯЗЫК СТАТЬИ

### 1. **Источник: `topic.language` + `audience_segment`**

Язык определяется **явно в файле топика** (`data/topic.*.json`):

```json
{
  "topic_id": "dmv_fl_title_types_checklist_es_mx_us",
  "language": "es",                    // ← Язык статьи
  "audience_segment": "us_mexican",   // ← Аудитория
  ...
}
```

### 2. **Маппинг через `config/audience_segments.json`**

Система использует `audience_segment` для определения:
- **Языка контента** (`language`)
- **Стиля написания** (`notes`)
- **Терминологии** (официальные термины DMV)

**Пример:**
```json
{
  "audience": {
    "us_mexican": {
      "language": "es",              // ← Испанский
      "needs": ["DMV CA/TX/NV/AZ", "transfer", "registration"],
      "notes": ["highlight bilingual terminology", "include import/export caveats"]
    },
    "us_general": {
      "language": "en",              // ← Английский
      "needs": ["DMV", "VIN", "used cars", "titles"]
    }
  }
}
```

### 3. **Применение в `build_article_spec.js`**

```javascript
function applyAudienceBias(block, topic) {
  const audienceId = topic.audience_segment || topic.audience || "us_general";
  const audience = audienceSegments.audience?.[audienceId];
  if (!audience) return block;
  const language = audience.language || "en";  // ← Язык из audience
  return {
    ...block,
    language,
    notes: audience.notes || []
  };
}
```

**Итог:** Язык берётся из `topic.language` (явно указан) или из `audience_segment` (через маппинг).

---

## 🎲 КАК ВЫБИРАЕТСЯ ТЕМА СТАТЬИ

### 1. **Ручной выбор через `data/topics_queue.json`**

Темы выбираются **вручную** из очереди:

```json
[
  {
    "topic_file": "data/topic.dmv_ca_title_types_checklist_es_mx_us.json"
  },
  {
    "topic_file": "data/topic.dmv_tx_title_types_checklist_es_mx_us.json"
  },
  {
    "topic_file": "data/topic.dmv_fl_title_types_checklist_es_mx_us.json"
  }
]
```

### 2. **Структура топика определяет контент**

Каждый топик содержит:
- **`zone`** — семантическая зона (`dmv_titles`, `vin_identity`, `auctions`, etc.)
- **`type`** — тип статьи (`dmv_state_guide`, `dmv_legal_article`, etc.)
- **`dimensions`** — параметры (штат, бренд, модель, etc.)
- **`must_include_terms`** — обязательные термины

**Пример:**
```json
{
  "topic_id": "dmv_fl_title_types_checklist_es_mx_us",
  "zone": "dmv_titles",              // ← Зона: DMV/титулы
  "type": "dmv_state_guide",         // ← Тип: гайд по штату
  "dimensions": {
    "state": "FL",                   // ← Штат: Флорида
    "dmv_topic": "title_types",      // ← Тема: типы титулов
    "format_variant": "checklist"    // ← Формат: чеклист
  },
  "must_include_terms": [
    "Florida DMV", "transfer", "salvage", "rebuilt", "título", "VIN"
  ]
}
```

### 3. **Генерация блоков через `article_types.json`**

Тип статьи (`dmv_state_guide`) определяет **какие блоки** генерировать:

```json
{
  "dmv_state_guide": {
    "default_blocks": [
      "hero", 
      "context_legal", 
      "step_by_step", 
      "checklist",      // ← Новый блок
      "mistakes", 
      "fees_taxes", 
      "vin_verification_mini",  // ← Новый блок
      "faq"
    ]
  }
}
```

### 4. **Пайплайн генерации**

```
1. topics_queue.json → выбирает topic_file
2. topic.json → содержит zone, type, dimensions, language
3. build_article_spec.js → создаёт ArticleSpec с блоками
4. gen_article_blocks.js → вызывает LLM с промптом
5. render_article_from_blocks.js → рендерит HTML
```

---

## 🔄 ПРИНЦИПЫ ВЫБОРА

### **Язык:**
- ✅ **Явный** — указан в `topic.language`
- ✅ **Через аудиторию** — `audience_segment` → `language` из `audience_segments.json`
- ✅ **Дефолт** — `"en"` если не указано

### **Тема:**
- ✅ **Ручной выбор** — через `topics_queue.json`
- ✅ **Структурированный** — через `zone` + `type` + `dimensions`
- ✅ **Расширяемый** — можно добавить новые топики в очередь

---

## 📝 ПРИМЕРЫ

### Пример 1: Испанская статья для мексиканской аудитории в Калифорнии
```json
{
  "topic_id": "dmv_ca_title_types_checklist_es_mx_us",
  "language": "es",                    // ← Испанский
  "audience_segment": "us_mexican",   // ← Мексиканская аудитория в США
  "zone": "dmv_titles",
  "type": "dmv_state_guide",
  "dimensions": {
    "state": "CA"                      // ← Калифорния
  }
}
```

### Пример 2: Английская статья для общей аудитории в Техасе
```json
{
  "topic_id": "dmv_tx_title_types_checklist_en_us_general",
  "language": "en",                    // ← Английский
  "audience_segment": "us_general",   // ← Общая аудитория
  "zone": "dmv_titles",
  "type": "dmv_state_guide",
  "dimensions": {
    "state": "TX"                      // ← Техас
  }
}
```

---

## 🎯 ИТОГ

**Язык:** Определяется явно в `topic.language` или через `audience_segment` → `audience_segments.json`

**Тема:** Выбирается вручную через `topics_queue.json`, структура определяется через `zone` + `type` + `dimensions`

**Гибкость:** Можно легко добавить новые языки, аудитории и темы, просто создав новые файлы топиков и добавив их в очередь.

