# 🎯 MONSTER 7.0 - Каноническая структура и валидация

**Дата:** 2025-12-03  
**Статус:** ✅ Внедрено

---

## ✅ ЧТО РЕАЛИЗОВАНО

### 1. Канонический VIN Decoder Template

**Файл:** `data/seo/ai-training/vin-decoder-canon.json`

**Структура:**
- Positions 1-3 (WMI): Country, Manufacturer, Vehicle Type
- Positions 4-8 (VDS): Model, Body, Grade, Safety, Engine
- Position 9: Check Digit
- Position 10: Model Year (J=2018, K=2019, etc.)
- Position 11: Assembly Plant
- Positions 12-17: Serial Number

**Правила:**
- НЕЛЬЗЯ менять роли позиций между статьями
- Все статьи используют ОДИН шаблон
- Позиция 10 ВСЕГДА = Model Year

---

### 2. Article Validator

**Файл:** `scripts/seo/learning/article-validator.js`

**Проверки:**
- ✅ Обрывы текста (and ##, or ##, ( ##, [ ##)
- ✅ Структура H2/H3 (каждый H2 должен иметь минимум 2 абзаца)
- ✅ Валидность таблиц (одинаковое количество колонок, завершенные строки)
- ✅ Обязательные блоки (12 блоков Monster 7.0)
- ✅ VIN decoder (правильность структуры, позиция 10)
- ✅ CTA (канонический формат)
- ✅ FAQ (минимум 5 вопросов)
- ✅ Минимумы (3000+ слов, 12+ блоков, 3+ таблицы)

**Автофикс:**
- Исправляет обрывы перед заголовками
- Убирает двойные заголовки подряд
- Завершает незаконченные предложения

---

### 3. Обновленные промпты

**Все блоки теперь требуют:**
- ✅ Завершать ВСЕ предложения полностью
- ✅ Завершать ВСЕ bullet points
- ✅ Завершать ВСЕ таблицы со всеми строками
- ✅ НЕТ обрывов перед заголовками (##)
- ✅ НЕТ незавершенных мыслей

**Специфичные улучшения:**
- **VIN Decoder:** Каноническая структура, полная таблица 1-17
- **Key Facts:** 8-10 полных bullet points, без обрывов
- **Fraud Patterns:** Все 5 паттернов полностью описаны
- **Market Value:** Полная таблица со всеми строками
- **Buyer Guide:** 10 полных шагов с детальными инструкциями
- **Recalls & TSBs:** Все секции завершены
- **FAQ:** 12-15 вопросов с полными ответами
- **CTA:** Канонический формат
- **Related Links:** Список с markdown ссылками

---

### 4. Канонический CTA

**Формат:**
```
**Check this {YEAR} {MAKE} {MODEL} VIN now.**

Get the NMVTIS title chain, odometer history, accident indicators, 
registration patterns, and federal recall status in a single report.
```

**Требования:**
- Всегда начинается с "Check this {YEAR} {MAKE} {MODEL} VIN now."
- Перечисляет конкретные данные отчета
- Не изменяется между статьями

---

### 5. Канонические Related Links

**Формат:**
- Markdown ссылки: `[text](/path/)`
- Минимум 5-7 ссылок:
  - `/vin/{make}/` (VIN Decoder)
  - `/vin/{make}/{model}/` (Model VIN Check)
  - `/{state}/title-check/` (State Title Check)
  - `/{state}/smog-check/` (State Smog Check)
  - `/nmvtis/overview/` (NMVTIS Overview)
  - `/{make}/factory-specs/` (Factory Specs)

---

## 📋 12 ЭТАЛОННЫХ БЛОКОВ MONSTER 7.0

1. **Executive Summary** - Обзор и цели
2. **Key Facts** - 8-10 ключевых фактов
3. **VIN Decoder** - Каноническая таблица 1-17
4. **NMVTIS + Title Chain** - Федеральная история титулов
5. **Data Layers** - Многослойные потоки данных
6. **State-Specific Rules** - Специфика штата (CA: smog, rebuilt, CHP)
7. **Accident Intelligence** - Структурный анализ
8. **Fraud Patterns** - 5 паттернов мошенничества
9. **Market Value** - Risk-adjusted матрица
10. **Insurance Risk** - Геориски и премии
11. **Buyer's Checklist** - 10 шагов
12. **Recalls & TSB** - Полный список
13. **FAQ** - 12-15 вопросов
14. **Related Links** - Внутренние ссылки
15. **CTA** - Канонический призыв

---

## 🔧 ПРОЦЕСС ВАЛИДАЦИИ

```
1. Generate Draft (LLM)
   ↓
2. Canon Enforcer (Validator)
   - Проверка 12 блоков
   - Проверка VIN canon
   - Проверка таблиц
   - Проверка разрывов
   - Проверка CTA & Related
   ↓
3. Auto-Fix
   - Переписывает недостающие фрагменты
   - Достраивает разрывы
   - Нормализует H2/H3
   - Восстанавливает VIN-таблицу
   ↓
4. Publish → public/vin/{vin}/index.html
```

---

## 📊 ТРЕБУЕМЫЕ МИНИМУМЫ

- ✅ Минимум 3000 слов
- ✅ Минимум 12 блоков
- ✅ Минимум 3 таблицы
- ✅ Минимум 5 FAQ (рекомендуется 12-15)
- ✅ Минимум 1 CTA
- ✅ VIN decoder 100% валидный
- ✅ NO DUPLICATED SECTIONS
- ✅ NO TEXT BREAKS

---

## 🎯 SEO-ОПТИМИЗАЦИЯ H2/H3

**Формат H2:**
```
{YEAR} {MAKE} {MODEL} + {INTENT}
```

**Примеры:**
- "2018 Toyota Camry VIN Decoder (California)"
- "2018 Toyota Camry Title & NMVTIS History"
- "2018 Toyota Camry Accident & Structural Integrity Analysis"
- "Fraud Detection for 2018 Toyota Camry in California"
- "Market Value Analysis: 2018 Toyota Camry (CA)"

**H3:** Подинтенты с конкретикой
- "How to validate Check Digit"
- "How California brands Salvage/Rebuilt"
- "Frame Twist Indicators"
- "VIN cloning detection points"

---

## 🚀 СЛЕДУЮЩИЕ ШАГИ

1. ✅ **Создать эталонную статью** - использовать как reference
2. ✅ **Интегрировать валидацию** - в production pipeline
3. ✅ **Мониторинг качества** - отслеживать ошибки валидации
4. ✅ **Автоматический фикс** - улучшить автофикс для сложных случаев
5. ✅ **A/B тестирование** - тестировать разные формулировки CTA

---

*Создано: 2025-12-03*  
*Версия: 1.0*

















