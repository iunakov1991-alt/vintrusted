# 📚 MONSTER 7.0 — BUYER GUIDE KNOWLEDGE PACK

**Версия:** 7.0  
**Дата:** 2025-12-03  
**Статус:** ✅ Готово к использованию

---

## 📁 СТРУКТУРА ЗНАНИЙ

```
monster-7.0/knowledge/
├── vibration/
│   └── tone_core.txt                    # Тон: DMV analyst + mechanic + insurance evaluator
│
├── semantic/
│   ├── tier1/
│   │   └── core.txt                     # Первичные экспертные темы (3-5 на статью)
│   ├── tier2/
│   │   └── analytic.txt                 # Аналитические темы поддержки (2-4 на статью)
│   └── tier3/
│       └── context.txt                  # Контекстные/образовательные темы (1-2 макс)
│
└── buyer-guides/
    ├── topics/
    │   └── core_topics.txt              # Основные темы buyer guide
    ├── structure/
    │   └── buyer_guide_structure.json   # JSON структура buyer guide
    ├── examples/
    │   └── golden_example_accord_2018.md # Золотой стандарт (с комментариями)
    └── policies/
        └── writing_rules.md            # Правила написания (MUST/NEVER)
```

---

## 🎯 НАЗНАЧЕНИЕ

Эта система знаний определяет:

1. **Тон** — как должен звучать контент (DMV analyst + mechanic + insurance evaluator)
2. **Семантика** — какие темы использовать (Tier 1/2/3)
3. **Структура** — как строить buyer guides
4. **Примеры** — эталонные образцы
5. **Правила** — что делать и чего избегать

---

## 📋 КОМПОНЕНТЫ

### 1. VIBRATION (Тон)

**Файл:** `vibration/tone_core.txt`

**Требования:**
- DMV analyst
- Insurance risk evaluator
- Professional mechanic
- Anti-fraud automotive investigator

**Цель:**
- EDUCATE
- WARN
- INTERPRET
- ANALYZE
- EXPLAIN CONSEQUENCES
- PROVIDE CHECKLISTS
- GIVE ACTIONABLE ADVICE
- REVEAL HIDDEN RISKS

**Запрещено:**
- Marketing fluff
- Blogging tone
- Generalities

---

### 2. SEMANTIC TIER 1 (Первичные темы)

**Файл:** `semantic/tier1/core.txt`

**Количество:** 3-5 тем на статью

**Темы:**
1. Vehicle Engineering & Year-Specific Data
2. Accident & Structural Damage Intelligence
3. Ownership Risk Logic
4. State-Specific Law
5. Fraud Prevention

---

### 3. SEMANTIC TIER 2 (Аналитические темы)

**Файл:** `semantic/tier2/analytic.txt`

**Количество:** 2-4 темы на статью

**Темы:**
6. Market Intelligence
7. Insurance Risk
8. Mechanical & Technical Depth
9. Buyer Guide Logic

---

### 4. SEMANTIC TIER 3 (Контекстные темы)

**Файл:** `semantic/tier3/context.txt`

**Количество:** 1-2 темы максимум

**Темы:**
10. How vehicle history data is collected
11. Differences in state-level transparency
12. Crashworthiness evolution and safety features

---

### 5. BUYER GUIDE STRUCTURE

**Файл:** `buyer-guides/structure/buyer_guide_structure.json`

**Секции (12-16):**
1. intro
2. year_overview
3. engineering_changes
4. engine_reliability
5. transmission_reliability
6. known_issues
7. high_risk_trims
8. maintenance_cost
9. accident_behavior
10. market_value
11. inspection_checklist
12. title_flags
13. insurance_theft
14. who_should_buy
15. who_should_avoid
16. faq

---

### 6. GOLDEN EXAMPLE

**Файл:** `buyer-guides/examples/golden_example_accord_2018.md`

**Пример:** 2018 Honda Accord Buyer Guide

**Особенности:**
- Комментированный пример
- Показывает правильную структуру
- Демонстрирует правильный тон
- Включает все обязательные секции

---

### 7. WRITING RULES

**Файл:** `buyer-guides/policies/writing_rules.md`

**MUST:**
- Tone = DMV analyst + mechanic + insurance evaluator
- Always include engine + transmission reliability
- Always list 3-7 known issues
- Always add actionable inspection checklist
- Always add state-specific price logic
- Always explain WHY each issue matters

**NEVER:**
- Never use blog tone or filler
- Never duplicate VIN-page content
- Never speak as AI
- Never use generic "pros/cons"

---

## 🚀 ИСПОЛЬЗОВАНИЕ

### В коде генерации:

```javascript
// Загрузить знания
const toneCore = fs.readFileSync('monster-7.0/knowledge/vibration/tone_core.txt', 'utf8');
const tier1 = fs.readFileSync('monster-7.0/knowledge/semantic/tier1/core.txt', 'utf8');
const structure = JSON.parse(fs.readFileSync('monster-7.0/knowledge/buyer-guides/structure/buyer_guide_structure.json', 'utf8'));
const rules = fs.readFileSync('monster-7.0/knowledge/buyer-guides/policies/writing_rules.md', 'utf8');

// Использовать в промпте
const prompt = `
${toneCore}

SEMANTIC THEMES:
${tier1}

STRUCTURE:
${JSON.stringify(structure, null, 2)}

RULES:
${rules}

Generate buyer guide for: ${make} ${model} ${year} in ${state}
`;
```

---

## ✅ ПРОВЕРКА

**Все файлы созданы:**
- [x] vibration/tone_core.txt
- [x] semantic/tier1/core.txt
- [x] semantic/tier2/analytic.txt
- [x] semantic/tier3/context.txt
- [x] buyer-guides/topics/core_topics.txt
- [x] buyer-guides/structure/buyer_guide_structure.json
- [x] buyer-guides/examples/golden_example_accord_2018.md
- [x] buyer-guides/policies/writing_rules.md

---

**Дата создания:** 2025-12-03  
**Версия:** 7.0  
**Статус:** ✅ Готово к использованию











