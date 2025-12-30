# 🔍 AI TRAINING — НЕДОСТАЮЩИЕ ИСТОЧНИКИ

**Дата проверки:** 2025-12-03  
**Статус:** Обнаружены недостающие источники

---

## ✅ ЧТО УЖЕ ЕСТЬ

### ФАЗА 1 — CORE GOOGLE SEARCH ✅
Все 9 источников присутствуют в `ai-training-pipeline.js` (строки 36-44)

### ФАЗА 2 — ENTITY GRAPH / SCHEMA.ORG ✅
Все 6 источников присутствуют в `ai-training-pipeline.js` (строки 69-74)

### ФАЗА 3 — INDUSTRY: VIN / AUTO / DATA ✅
Все 5 источников присутствуют в `ai-training-pipeline.js` (строки 97-101)

### ФАЗА 4 — TECHNICAL SEO / WEB VITALS 2025 ✅
Все 6 источников присутствуют в `ai-training-pipeline.js` (строки 124-129)

### ФАЗА 5 — LARGE WEBSITE / CRAWL BUDGET ✅
Все 3 источника присутствуют в `ai-training-pipeline.js` (строки 152-154)

### ФАЗА 6 — SEARCH INTENT ✅
Все 2 источника присутствуют в `ai-training-pipeline.js` (строки 177-178)

### USER SIGNALS / IDENTITY ✅
Все 2 источника присутствуют в `ga4-gtm-search-console-docs.jsonl` (строки 14-15)

### GOOGLE SEARCH CONSOLE API ✅
Все 3 источника присутствуют в `ga4-gtm-search-console-docs.jsonl` (строки 16-18)

---

## ❌ ЧТО ОТСУТСТВУЕТ

### 1. GOOGLE ANALYTICS 4 (GA4) — 1 источник отсутствует

**Отсутствует:**
- ❌ `https://support.google.com/analytics/answer/7201382`

**Что есть (8 из 9):**
- ✅ `https://support.google.com/analytics/answer/10089681` (Getting Started)
- ✅ `https://support.google.com/analytics/answer/10269537` (Events)
- ✅ `https://support.google.com/analytics/answer/9322688` (Conversions)
- ✅ `https://support.google.com/analytics/answer/10330115` (Audiences)
- ✅ `https://support.google.com/analytics/answer/9234069` (Custom Dimensions)
- ✅ `https://support.google.com/analytics/answer/12195621` (Data Retention)
- ✅ `https://support.google.com/analytics/answer/12238921` (Measurement Protocol)
- ✅ `https://support.google.com/analytics/answer/12070843` (Data Import)

---

### 2. GOOGLE TAG MANAGER (GTM) — 1 источник отсутствует

**Отсутствует:**
- ❌ `https://support.google.com/analytics/answer/9216061`

**Что есть (5 из 6):**
- ✅ `https://support.google.com/tagmanager/answer/6103696` (Getting Started)
- ✅ `https://support.google.com/tagmanager/answer/7679319` (Tags)
- ✅ `https://support.google.com/tagmanager/answer/7679317` (Triggers)
- ✅ `https://support.google.com/tagmanager/answer/9442095` (Variables)
- ✅ `https://support.google.com/tagmanager/answer/6107056` (Data Layer)

---

## 📋 ИТОГО

**Всего источников в запросе:** 47  
**Присутствует в системе:** 45  
**Отсутствует:** 2

**Процент покрытия:** 95.7%

---

## 🔧 РЕКОМЕНДАЦИИ

### 1. Добавить недостающие источники в `ga4-gtm-search-console-docs.jsonl`

Добавить следующие записи:

```jsonl
{"type":"ga4","source":"https://support.google.com/analytics/answer/7201382","title":"GA4 Core - [Название]","content":"[Содержание]"}
{"type":"gtm","source":"https://support.google.com/analytics/answer/9216061","title":"GTM - [Название]","content":"[Содержание]"}
```

### 2. Проверить актуальность отсутствующих URL

Перед добавлением проверить:
- Существуют ли эти URL
- Актуальны ли они (не устарели)
- Какой контент они содержат

### 3. Обновить метод `ingestFromJSONL`

Убедиться, что метод корректно обрабатывает все типы:
- `ga4`
- `gtm`
- `gsc`
- `user-signals`

---

## 📝 ПРИМЕЧАНИЯ

1. **Внутренние логи** — все 8 файлов присутствуют в `ingestInternalMetrics()` (строки 287-295)
2. **VIN Report Training** — реализовано через `ingestVINReportSample()`
3. **VIN Collection Training** — реализовано через `vin-collection-training.js`

---

**Следующий шаг:** Добавить недостающие 2 источника в `ga4-gtm-search-console-docs.jsonl`
















