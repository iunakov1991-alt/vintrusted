# 🚀 Monster 7.0: Обновление промптов для генерации по частям

**Дата:** 2025-12-03  
**Статус:** ✅ Реализовано

---

## 📋 ПРОБЛЕМЫ ПРЕДЫДУЩЕЙ ВЕРСИИ

### Структурный анализ выявил:

1. ❌ **Неэффективное распределение плотности** - слишком много воды в интро, мало конкретики
2. ❌ **Слабые H2/H3 структуры** - отсутствуют ключевые разделы (Recalls, Common Problems, CA DMV Pathway)
3. ❌ **Недостаточно CA-специфики** - общие фразы вместо конкретных процессов
4. ❌ **Недостаточно Camry-specific механики** - нет технических деталей (двигатели, проблемы, recalls)
5. ❌ **Нет сравнительных блоков** - отсутствуют таблицы
6. ❌ **Чрезмерная литературность** - эссе вместо технического гида
7. ❌ **Нет LSI-интентов** - закрывает только 40-50% интента
8. ❌ **Отсутствует CTA-механика** - нет призывов к действию
9. ❌ **Слишком мягкое юридическое покрытие** - нет CA DMV форм
10. ❌ **Нет NMVTIS** - отсутствует упоминание структуры данных

**Реальное качество:** 70-75%, не 100%

---

## ✅ РЕШЕНИЕ: Переработка промптов

### Part 1: VIN Decoder + NMVTIS + Технические детали + CTA

**Новые требования:**
- ✅ Краткое введение (2-3 предложения, без воды)
- ✅ **VIN Decoder блок** для 2018 Camry:
  - 17-символьная структура
  - Расшифровка позиций (WMI, VDS, VIS)
  - Camry-specific коды:
    * Двигатели: 2.5L A25A-FKS, 2.5L hybrid, 3.5L 2GR-FKS
    * Коды заводов
    * Идентификатор года модели (позиция 10)
  - Пример разбора VIN
- ✅ **NMVTIS** (National Motor Vehicle Title Information System):
  - Объяснение как основного источника данных
  - Список провайдеров NMVTIS
  - Интеграция с DMV штатов
- ✅ **Технические спецификации** для 2018 Camry:
  - Опции двигателей
  - Позиция 8 VIN идентифицирует тип двигателя
  - Места производства
  - Типичные паттерны VIN
- ✅ **CTA блок** в начале

**Стиль:** Технический, factual, без литературности  
**Длина:** 500-600 слов  
**MaxTokens:** 1200

---

### Part 2: Recalls + Common Problems + Таблицы + Red Flags

**Новые требования:**
- ✅ **Recalls для 2018 Camry (Полный список)**:
  - Fuel pump recall (NHTSA campaign number)
  - Brake assist vacuum pump issues
  - TSS (Toyota Safety Sense) sensor failures
  - A/C evaporator leaks
  - Другие recalls 2018 года
  - **Формат таблицы:** | Recall | Component | Status | Action Required |
  - Как проверить завершение recall через VIN

- ✅ **Common Problems для 2018 Camry**:
  - Паттерны отказов fuel pump
  - Проблемы brake assist vacuum pump
  - Отказы TSS sensor
  - Утечки A/C evaporator
  - Случаи раннего hesitation трансмиссии
  - Долговечность hybrid battery (если применимо)
  - Типичные диапазоны пробега: 80-160k для CA fleet use
  - Структурированный список с техническими деталями

- ✅ **Таблицы сравнения** (markdown формат):
  
  **Таблица 1: Типы Title Brand (с CA определениями)**
  | Title Brand | CA Definition | Impact on Value | Insurance |
  |------------|---------------|-----------------|-----------|
  | Clean | No branded history | Full value | Standard |
  | Salvage | Total loss claim | 40-60% reduction | Limited |
  | Rebuilt | Salvage + inspection | 30-50% reduction | Limited |
  | Flood | Water damage | 50-70% reduction | Difficult |
  | Lemon Law | Buyback | 20-40% reduction | Standard |
  
  **Таблица 2: Clean vs Salvage цены в CA**
  | Condition | Mileage Range | CA Market Value | Notes |
  |-----------|---------------|------------------|-------|
  | Clean Title | 50-80k | $X,XXX-$X,XXX | Standard range |
  | Clean Title | 80-120k | $X,XXX-$X,XXX | High mileage |
  | Salvage Title | 50-80k | $X,XXX-$X,XXX | 40-60% below clean |
  | Rebuilt Title | 50-80k | $X,XXX-$X,XXX | 30-50% below clean |
  
  **Таблица 3: Уровни серьезности аварий**
  | Severity | Damage Type | Airbag Deployment | Frame Damage | Value Impact |
  |----------|-------------|-------------------|--------------|-------------|
  | Minor | Cosmetic | No | No | 5-10% |
  | Moderate | Body panels | Possible | No | 15-25% |
  | Severe | Structural | Yes | Yes | 30-50% |
  | Total Loss | Extensive | Yes | Yes | 60-80% |

- ✅ **Как читать отчет: 7-шаговое руководство**
- ✅ **Major Red Flags** (7 пунктов с техническими объяснениями)

**Стиль:** Технический, factual  
**Длина:** 800-1000 слов  
**MaxTokens:** 2000

---

### Part 3: CA-специфика + DMV Pathways + Market Value + Checklist + CTA

**Новые требования:**
- ✅ **California-Specific Considerations** (детально):
  
  **Smog Check Requirements:**
  - STAR stations (Test-Only vs Test-and-Repair)
  - Biennial schedule (каждые 2 года для авто 6+ лет)
  - Исключения (новые авто, трансферы)
  - Период действия smog certificate
  - Как VIN отчеты показывают smog историю
  
  **Revived Salvage Process:**
  - Требование Brake & Lamp inspection
  - Верификация CHP (California Highway Patrol)
  - Форма REG 343
  - Станции инспекции
  - Временные рамки и стоимость
  
  **Odometer Disclosure:**
  - Требования формы REG 51
  - Исключения для старых авто (10+ лет)
  - Штрафы за ложное раскрытие
  - Как VIN отчеты верифицируют точность одометра
  
  **Title Pathway (CA DMV):**
  - Процесс трансфера (REG 262)
  - Дубликат титула (REG 227)
  - Процесс revived salvage title
  - Требования flood title
  - Раскрытие Lemon Law Buyback (должно быть на титуле)
  
  **Emissions & Smog Fail Patterns:**
  - Общие причины отказов для 2018 Camry
  - Требования OBD-II readiness
  - Элементы визуального осмотра
  - Процедуры повторного теста
  
  **Real CA Theft Hotspots:**
  - LA County (самый высокий уровень)
  - SF Bay Area
  - San Bernardino County
  - Как VIN отчеты показывают историю кражи/восстановления

- ✅ **Market Value Ranges в CA** для 2018 Camry:
  - Clean title: по диапазонам пробега
  - Salvage title: 40-60% ниже clean
  - Rebuilt title: 30-50% ниже clean
  - Факторы: пробег, состояние, локация, trim level
  - Формат: структурированные данные или таблица

- ✅ **How to Get a VIN Report:**
  - NMVTIS провайдеры
  - Коммерческие провайдеры (Carfax, AutoCheck, EpicVIN)
  - Бесплатные опции (NICB VINCheck)
  - Какие данные предоставляет каждый источник
  - Сравнение стоимости

- ✅ **Actionable Pre-Purchase Checklist** (11 пунктов):
  - [ ] Verify VIN matches vehicle and paperwork
  - [ ] Check title brand (clean, salvage, rebuilt, flood, lemon)
  - [ ] Review accident history (severity, airbag deployment, frame damage)
  - [ ] Verify odometer consistency (no rollback)
  - [ ] Check ownership history (number of owners, duration)
  - [ ] Verify all recalls completed (especially fuel pump, brake assist)
  - [ ] Check for unreleased liens
  - [ ] Verify smog certificate (CA requirement)
  - [ ] Review theft records
  - [ ] Cross-reference with physical inspection
  - [ ] Verify CA DMV forms (REG 51, REG 262 if applicable)

- ✅ **Legal Citations:**
  - CA Vehicle Code sections (если релевантно)
  - Требования раскрытия Lemon Law
  - Закон об odometer disclosure
  - Требования title transfer

- ✅ **Final CTA Block:**
  - "Run Full VIN Report for 2018 Toyota Camry"
  - Value proposition: NMVTIS data, CA-specific checks, recall verification
  - Mobile-responsive CTA

**Стиль:** Технический, factual  
**Длина:** 700-900 слов  
**MaxTokens:** 1800

---

## 🎯 ИЗМЕНЕНИЯ СТИЛЯ

### Было:
- ❌ Литературный стиль ("coastal humidity", "intense valley heat", "hopeful buyer")
- ❌ Эссе вместо технического гида
- ❌ Общие фразы

### Стало:
- ✅ Технический, factual стиль
- ✅ Конкретные данные и процессы
- ✅ Структурированные списки и таблицы
- ✅ Юридические ссылки и формы
- ✅ Actionable контент

---

## 📊 ОЖИДАЕМЫЕ РЕЗУЛЬТАТЫ

### Структура:
- ✅ Все ключевые H2/H3 разделы присутствуют
- ✅ Таблицы сравнения включены
- ✅ VIN decoder блок
- ✅ Actionable checklist
- ✅ CTA блоки

### Контент:
- ✅ Camry-specific технические детали
- ✅ CA-специфика с формами и процессами
- ✅ NMVTIS упоминания
- ✅ Legal citations

### SEO:
- ✅ LSI-интенты закрыты (80-90% вместо 40-50%)
- ✅ Техническая глубина
- ✅ Конкурентное усиление
- ✅ Scannable контент

### Качество:
- ✅ Ожидаемое качество: **85-90%** (вместо 70-75%)
- ✅ Соответствие уровню Monster 7.0

---

## 🧪 СЛЕДУЮЩИЕ ШАГИ

1. **Тестирование новой генерации:**
   ```bash
   node scripts/seo/learning/run-learning-loop.js
   ```

2. **Проверка структуры:**
   - Наличие всех таблиц
   - VIN decoder блок
   - CA-специфика с формами
   - Actionable checklist
   - CTA блоки

3. **Валидация качества:**
   - Техническая глубина
   - Отсутствие литературности
   - Соответствие Monster 7.0 требованиям

---

*Создано: 2025-12-03*  
*Версия: 1.0*










