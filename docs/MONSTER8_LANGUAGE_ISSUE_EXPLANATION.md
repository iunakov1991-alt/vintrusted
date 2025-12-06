# 🔍 ОБЪЯСНЕНИЕ: Почему все тестовые страницы на испанском

**Дата:** 2025-12-06  
**Проблема:** Все последние тестовые страницы были на испанском языке

---

## ✅ ВЫВОД: Это НЕ баг системы

### Причина

Все тестовые топики в `data/topics_queue.json` были созданы **явно для испанской аудитории**:

```json
[
  {
    "topic_file": "data/topic.dmv_ca_title_types_checklist_es_mx_us.json"  // ← es = испанский
  },
  {
    "topic_file": "data/topic.dmv_tx_title_types_checklist_es_mx_us.json"  // ← es = испанский
  },
  {
    "topic_file": "data/topic.dmv_fl_title_types_checklist_es_mx_us.json"  // ← es = испанский
  }
]
```

Каждый топик содержит:
```json
{
  "language": "es",                    // ← Явно указан испанский
  "audience_segment": "us_mexican",   // ← Мексиканская аудитория в США
  ...
}
```

---

## 🔧 КАК СИСТЕМА ВЫБИРАЕТ ЯЗЫК

### Логика выбора языка:

1. **Приоритет 1:** `topic.language` (явно указан в файле топика)
2. **Приоритет 2:** `audience_segment` → `audience_segments.json` → `language`
3. **Приоритет 3:** Дефолт `"en"` (английский)

**Код в `build_article_spec.js`:**
```javascript
function applyAudienceBias(block, topic) {
  const audienceId = topic.audience_segment || topic.audience || "us_general";
  const audience = audienceSegments.audience?.[audienceId];
  if (!audience) return block;
  const language = audience.language || "en";  // ← Берётся из audience
  return { ...block, language, notes: audience.notes || [] };
}
```

**Но в `render_article_from_blocks.js`:**
```javascript
<html lang="${escapeHtml(topic.language || "en")}">  // ← Берётся напрямую из topic.language
```

---

## ✅ РЕШЕНИЕ: Созданы английские версии

Созданы английские топики для проверки:

1. ✅ `data/topic.dmv_ca_title_types_checklist_en_us_general.json`
   - `"language": "en"`
   - `"audience_segment": "us_general"`
   - Протестирован: ✅ Работает

2. ✅ `data/topic.dmv_tx_title_types_checklist_en_us_general.json`
   - `"language": "en"`
   - `"audience_segment": "us_general"`

---

## 📊 ТЕКУЩЕЕ СОСТОЯНИЕ

### Испанские страницы (3):
- `/es/dmv-titles/ca/title-types/checklist/`
- `/es/dmv-titles/tx/title-types/checklist/`
- `/es/dmv-titles/fl/title-types/checklist/`

### Английские страницы (1):
- `/en/dmv-titles/ca/title-types/checklist/` ✅

---

## 🎯 КАК СОЗДАТЬ СТАТЬИ НА РАЗНЫХ ЯЗЫКАХ

### Шаг 1: Создайте топик с нужным языком

**Испанский:**
```json
{
  "topic_id": "dmv_ca_title_types_checklist_es_mx_us",
  "language": "es",
  "audience_segment": "us_mexican",
  ...
}
```

**Английский:**
```json
{
  "topic_id": "dmv_ca_title_types_checklist_en_us_general",
  "language": "en",
  "audience_segment": "us_general",
  ...
}
```

### Шаг 2: Добавьте в `topics_queue.json`

```json
[
  {
    "topic_file": "data/topic.dmv_ca_title_types_checklist_es_mx_us.json"
  },
  {
    "topic_file": "data/topic.dmv_ca_title_types_checklist_en_us_general.json"
  }
]
```

### Шаг 3: Запустите генерацию

```bash
node scripts/build_topics_batch.js --mode prod
```

---

## ✅ ИТОГ

- ❌ **НЕ баг** — система работает правильно
- ✅ **Причина** — все тестовые топики были на испанском
- ✅ **Решение** — созданы английские версии для проверки
- ✅ **Система** — корректно определяет язык из `topic.language`

**Для генерации статей на разных языках просто создавайте топики с нужным `language` и добавляйте их в очередь.**

