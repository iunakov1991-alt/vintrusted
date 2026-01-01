# 📋 АНАЛИЗ МАТЕРИАЛОВ ДЛЯ ОБУЧЕНИЯ AI

**Дата проверки:** 2025-12-03  
**Статус:** Частично готово, требуется дополнение

---

## ✅ ЧТО УЖЕ ЕСТЬ В СИСТЕМЕ

### 1. База по Google и SEO (частично)
- ✅ **Ссылки на официальную документацию Google:**
  - Search Essentials
  - SEO Fundamentals  
  - Structured Data
  - Core Web Vitals
  - Sitemaps, Robots.txt
- ⚠️ **Проблема:** Только ссылки, нет выжимок и конкретных правил
- 📍 **Где:** `data/seo/ai-training/knowledge-base.jsonl` (строки 1, 7, 19)

### 2. Schema.org (частично)
- ✅ **Ссылки на Schema.org:**
  - Vehicle, Car, Product
  - Organization, Dataset
  - FAQPage
- ⚠️ **Проблема:** Только ссылки, нет примеров использования
- 📍 **Где:** `data/seo/ai-training/knowledge-base.jsonl` (строки 2, 8, 20)

### 3. VIN Report структура (есть)
- ✅ **Реальная структура VIN отчета:**
  - Извлечена из реального PDF отчета
  - Секции, заголовки, таблицы
  - Семантические паттерны
  - Стиль написания
- ✅ **Хорошо:** Есть реальные примеры структуры
- 📍 **Где:** `data/seo/ai-training/knowledge-base.jsonl` (строки 13-18, 44+)

### 4. Правила генерации (частично)
- ✅ **Запрещенные паттерны:**
  - "This comprehensive guide covers everything"
  - "In this article, we will explore"
  - "By the end of this article"
- ⚠️ **Проблема:** Нет полного документа "Must/Never"
- 📍 **Где:** `data/knowledge/generation-rules.json`

---

## ❌ ЧТО ОТСУТСТВУЕТ (КРИТИЧНО)

### 1. Выжимки Google Search Essentials / Helpful Content / E-E-A-T
**Статус:** ❌ ОТСУТСТВУЕТ

**Что нужно:**
- Что такое helpful content (конкретные критерии)
- E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness)
- Что считается мошенничеством/манипуляцией
- Google SEO Starter Guide (выжимка по структуре, заголовкам, перелинковке)

**Где добавить:** `data/seo/ai-training/knowledge-base.jsonl`

**Формат:**
```json
{
  "phase": "google-essentials",
  "type": "google-guidelines",
  "content": {
    "helpful_content": "Конкретные критерии helpful content...",
    "e_e_a_t": "Experience, Expertise, Authoritativeness, Trustworthiness...",
    "manipulation": "Что считается манипуляцией...",
    "seo_starter": "Структура страницы, заголовки, перелинковка..."
  }
}
```

---

### 2. Эталонная статья про California VIN
**Статус:** ❌ ОТСУТСТВУЕТ

**Что нужно:**
- Твоя статья про California VIN / risk / fraud (ОБЯЗАТЕЛЬНО)
- В разобранном виде: блоки, структура, почему так

**Где добавить:** `data/seo/ai-training/reference-articles/california-vin-reference.json`

**Формат:**
```json
{
  "title": "California VIN Check - Risk and Fraud Prevention",
  "url": "ссылка или путь к файлу",
  "structure": {
    "intro": "...",
    "overview": "...",
    "risk": "...",
    "state-specific": "...",
    "fraud": "...",
    "buyer-guide": "...",
    "faq": "..."
  },
  "why_blocks_here": {
    "intro": "Почему intro первый - объяснение",
    "risk": "Почему risk после overview - объяснение"
  },
  "good_headings": ["Примеры хороших заголовков"],
  "bad_headings": ["Примеры плохих заголовков"]
}
```

---

### 3. Статьи конкурентов (разобранные)
**Статус:** ❌ ОТСУТСТВУЕТ

**Что нужно:**
- 1-2 статьи конкурентов (Carfax/CarVertical)
- В разобранном виде: структура, блоки
- Анализ: длина, секции, таблицы, FAQ

**Где добавить:** `data/seo/ai-training/reference-articles/competitor-analysis.json`

**Формат:**
```json
{
  "competitors": [
    {
      "source": "Carfax",
      "url": "...",
      "analysis": {
        "word_count": 3500,
        "sections": 12,
        "has_tables": true,
        "has_faq": true,
        "faq_count": 15,
        "recurring_themes": ["VIN decoding", "Title brands", "Accident history"]
      },
      "structure": {
        "blocks": ["intro", "overview", "..."]
      }
    }
  ],
  "summary": "Вот так пишут лидеры ниши. Наша задача - быть глубже, чётче и полезнее."
}
```

---

### 4. Справочная инфа по VIN / авто-отчётам
**Статус:** ❌ ОТСУТСТВУЕТ

**Что нужно:**
- Что такое VIN, ISO 3779
- Типы title: clean / salvage / rebuilt / junk / lemon
- Базовые вещи по CA: smog check, salvage inspection, flood, etc.

**Где добавить:** `data/seo/ai-training/reference-materials/vin-reference.json`

**Формат:**
```json
{
  "vin_basics": {
    "what_is_vin": "...",
    "iso_3779": "...",
    "vin_structure": "..."
  },
  "title_types": {
    "clean": "...",
    "salvage": "...",
    "rebuilt": "...",
    "junk": "...",
    "lemon": "..."
  },
  "california_specific": {
    "smog_check": "...",
    "salvage_inspection": "...",
    "flood_damage": "..."
  }
}
```

---

### 5. Внутренний свод правил монстра (Must / Never)
**Статус:** ⚠️ ЧАСТИЧНО (только запрещенные паттерны)

**Что есть:**
- ✅ Запрещенные паттерны в `generation-rules.json`

**Чего не хватает:**
- ❌ Полный документ Must/Never
- ❌ Правила тона (аналитик + оценщик)
- ❌ Правила использования примеров, сценариев, чек-листов

**Где добавить:** `data/seo/ai-training/writing-rules.json`

**Формат:**
```json
{
  "must": [
    "Всегда объяснять, что делать и как интерпретировать данные",
    "Избегать фраз типа 'In this article we will…'",
    "Использовать примеры, сценарии, чек-листы",
    "Держать тон: аналитик + оценщик, без болтовни"
  ],
  "never": [
    "Вода, общие фразы, повтор одного и того же",
    "Прямое копирование структуры конкурента 1:1",
    "Упоминание 'как AI-модель…' и прочей херни",
    "Кликбейт"
  ],
  "tone": "analytical + evaluator, no chit-chat",
  "style": "professional, authoritative, actionable"
}
```

---

### 6. Мини-ТРИЗ для монстра
**Статус:** ❌ ОТСУТСТВУЕТ

**Что нужно:**
- Противоречие: "нужен максимально экспертный контент при ограниченных ресурсах"
- ИКР: "каждая статья выглядит как работа авто-аналитика и страхового эксперта"
- Приёмы: дробление, использование ресурсов, динамичность

**Где добавить:** `data/seo/ai-training/triz-principles.json`

**Формат:**
```json
{
  "contradiction": "Нужен максимально экспертный контент при ограниченных ресурсах (DeepSeek API)",
  "ikr": "Каждая статья выглядит как работа авто-аналитика и страхового эксперта, при этом генерится секциями, малыми запросами",
  "techniques": [
    {
      "name": "Дробление",
      "description": "Всё по секциям - каждая секция отдельный запрос"
    },
    {
      "name": "Использование ресурсов",
      "description": "Конкуренты, эталонная статья, справочная инфа"
    },
    {
      "name": "Динамичность",
      "description": "Адаптируем длину под нишу"
    }
  ],
  "why_structured_this_way": "Система понимает, ПОЧЕМУ она устроена так, а не иначе"
}
```

---

### 7. Конкурентный анализ (метрики)
**Статус:** ❌ ОТСУТСТВУЕТ

**Что нужно:**
- 3-5 страниц конкурентов
- Метрики: длина статьи, количество секций, наличие таблиц, наличие FAQ
- Повторяющиеся темы

**Где добавить:** `data/seo/ai-training/competitor-metrics.json`

**Формат:**
```json
{
  "competitor_analysis": [
    {
      "source": "Carfax",
      "url": "...",
      "metrics": {
        "word_count": 3500,
        "sections": 12,
        "has_tables": true,
        "table_count": 2,
        "has_faq": true,
        "faq_count": 15
      },
      "recurring_themes": ["VIN decoding", "Title brands", "Accident history", "State-specific rules"]
    }
  ],
  "benchmark": {
    "avg_word_count": 3500,
    "avg_sections": 12,
    "avg_faq": 15,
    "common_themes": ["список повторяющихся тем"]
  },
  "instruction": "Вот так сейчас пишут лидеры ниши. Монстр, наша задача — быть глубже, чётче и полезнее."
}
```

---

## 📊 ИТОГОВАЯ ТАБЛИЦА

| Материал | Статус | Где добавить | Приоритет |
|----------|--------|--------------|-----------|
| **1. Google Search Essentials выжимки** | ❌ Нет | `knowledge-base.jsonl` | 🔴 КРИТИЧНО |
| **2. E-E-A-T правила** | ❌ Нет | `knowledge-base.jsonl` | 🔴 КРИТИЧНО |
| **3. Helpful Content критерии** | ❌ Нет | `knowledge-base.jsonl` | 🔴 КРИТИЧНО |
| **4. Эталонная статья CA VIN** | ❌ Нет | `reference-articles/` | 🔴 КРИТИЧНО |
| **5. Статьи конкурентов (разобранные)** | ❌ Нет | `reference-articles/` | 🟡 ВАЖНО |
| **6. Справочная инфа VIN/title/CA** | ❌ Нет | `reference-materials/` | 🔴 КРИТИЧНО |
| **7. Must/Never правила** | ⚠️ Частично | `writing-rules.json` | 🔴 КРИТИЧНО |
| **8. Мини-ТРИЗ** | ❌ Нет | `triz-principles.json` | 🟡 ВАЖНО |
| **9. Конкурентный анализ (метрики)** | ❌ Нет | `competitor-metrics.json` | 🟡 ВАЖНО |

---

## 🎯 ПЛАН ДЕЙСТВИЙ

### Приоритет 1 (КРИТИЧНО - перед первой генерацией):
1. ✅ Создать выжимки Google Search Essentials / Helpful Content / E-E-A-T
2. ✅ Добавить эталонную статью про California VIN
3. ✅ Создать справочную инфу по VIN/title/CA правилам
4. ✅ Дополнить Must/Never правила

### Приоритет 2 (ВАЖНО - для улучшения качества):
5. ✅ Добавить разобранные статьи конкурентов
6. ✅ Создать конкурентный анализ (метрики)
7. ✅ Добавить мини-ТРИЗ документ

---

## 📝 РЕКОМЕНДАЦИИ

1. **Сначала добавить критичные материалы** (Приоритет 1)
2. **Потом улучшить качество** (Приоритет 2)
3. **Интегрировать в систему** через `ai-training-pipeline.js`
4. **Обновить `enrichPromptWithStrategy`** для использования новых материалов

---

**Следующий шаг:** Создать недостающие файлы с материалами для обучения.


















