# 📊 LTV Расчет для Vintrusted (на основе вашей информации)

**Дата:** 2026-02-23

---

## 📝 Исходные данные (от пользователя)

### Старый флоу (январь 12-30):
```
День 1:  $1  (trial)
День 10: $49 (recurring)
День 20: $49 (recurring)
День 30: $49 (recurring)
```

### Новый флоу (текущий):
```
День 1:  $3  (trial)
День 3:  $49 (recurring)
День 33: $49 (recurring)
День 63: $49 (recurring)
... и так далее до отмены
```

### Конверсия:
- **50% из trial становятся recurring subscribers**

---

## 💰 LTV Расчет (Новый флоу)

### Метод 1: Консервативный (первые 3 месяца)

```
Trial revenue: $3 × 100% = $3.00

Recurring revenue:
  Day 3:  $49 × 50% conversion = $24.50
  Day 33: $49 × 50% retention = $24.50
  Day 63: $49 × 40% retention = $19.60
  
Total LTV = $3 + $24.50 + $24.50 + $19.60 = $71.60
```

**Консервативный LTV:** `$72` (округлено)

---

### Метод 2: Оптимистичный (6 месяцев)

```
Trial revenue: $3

Recurring (предполагая 50% conversion, затем 80% retention):
  Month 1: $49 × 50% = $24.50
  Month 2: $49 × 40% = $19.60  (80% от 50%)
  Month 3: $49 × 32% = $15.68  (80% от 40%)
  Month 4: $49 × 26% = $12.74
  Month 5: $49 × 20% = $9.80
  Month 6: $49 × 16% = $7.84

Total LTV = $3 + $24.50 + $19.60 + $15.68 + $12.74 + $9.80 + $7.84 = $93.16
```

**Оптимистичный LTV:** `$93`

---

### Метод 3: На основе январских данных

**Нужно проверить в Stripe:**
1. Сколько клиентов заплатили $1 в январе (12-30)?
2. Сколько из них заплатили хотя бы один раз $49?
3. Сколько в среднем раз платили по $49?

**Формула:**
```
Conversion Rate = (Клиенты с $49) / (Клиенты с $1)
Avg Recurring = (Всего $49 платежей) / (Клиенты с $49)

LTV = $3 + ($49 × Conversion Rate × Avg Recurring)
```

**Пример (если найдем в Stripe):**
```
Предположим:
- 20 клиентов заплатили $1
- 10 из них заплатили $49 (50% conversion ✅)
- В среднем 2 раза по $49

LTV = $3 + ($49 × 0.5 × 2) = $3 + $49 = $52
```

---

## 🎯 Рекомендация по Conversion Value

### Вариант A: Консервативный подход

```javascript
// purchase-confirmation.html (строка 572)

const CUSTOMER_LTV = 72;  // Консервативный расчет

window.gtag('event', 'conversion', {
    'send_to': 'AW-17824079146/MpIjCLKgpuYbEKq6l7NC',
    'value': CUSTOMER_LTV,  // $72 вместо $1
    'currency': 'USD',
    'transaction_id': setupIntentId,
    'gclid': gclid || undefined
});
```

**Target CPA:**
- Консервативный (30%): `$22`
- Агрессивный (50%): `$36`

**ROI:**
- @ $15 Target CPA: `+380%` ✅
- @ $22 Target CPA: `+227%` ✅
- @ $36 Target CPA: `+100%` ✅

---

### Вариант B: Средний подход

```javascript
const CUSTOMER_LTV = 80;  // Среднее между консервативным и оптимистичным

window.gtag('event', 'conversion', {
    'value': CUSTOMER_LTV,  // $80
    'currency': 'USD'
});
```

**Target CPA:**
- Консервативный (30%): `$24`
- Агрессивный (50%): `$40`

**ROI:**
- @ $15 Target CPA: `+433%` ✅
- @ $24 Target CPA: `+233%` ✅
- @ $40 Target CPA: `+100%` ✅

---

### Вариант C: Оптимистичный подход

```javascript
const CUSTOMER_LTV = 93;  // 6 месяцев retention

window.gtag('event', 'conversion', {
    'value': CUSTOMER_LTV,  // $93
    'currency': 'USD'
});
```

**Target CPA:**
- Консервативный (30%): `$28`
- Агрессивный (50%): `$47`

**ROI:**
- @ $15 Target CPA: `+520%` ✅
- @ $28 Target CPA: `+232%` ✅
- @ $47 Target CPA: `+98%` ✅

---

## ✅ Финальная рекомендация

### Для запуска Max Conversions с Target CPA $15:

**Используйте СРЕДНИЙ LTV:** `$80`

```javascript
// purchase-confirmation.html

window.gtag('event', 'conversion', {
    'send_to': 'AW-17824079146/MpIjCLKgpuYbEKq6l7NC',
    'value': 80,  // ← $80 вместо $1
    'currency': 'USD',
    'transaction_id': setupIntentId,
    'gclid': gclid || undefined
});
```

### Почему $80?

1. **Консервативнее чем $93** (если retention окажется ниже)
2. **Оптимистичнее чем $72** (даст Google больше бюджета на оптимизацию)
3. **С вашим Target CPA $15 = +433% ROI** (очень прибыльно!)

---

## 📊 Сравнение: До и После

### ❌ СЕЙЧАС (неправильно):

| Параметр | Значение |
|----------|----------|
| Conversion Value | $1 |
| Target CPA | $15 |
| **ROI** | **-93%** ❌ |
| Spend per customer | $15 |
| Earn per customer | $1 |
| **Loss per customer** | **-$14** 💸 |

### ✅ ПОСЛЕ (правильно):

| Параметр | Значение |
|----------|----------|
| Conversion Value | $80 |
| Target CPA | $15 |
| **ROI** | **+433%** ✅ |
| Spend per customer | $15 |
| Earn per customer | $80 |
| **Profit per customer** | **+$65** 💰 |

---

## 🔧 Что нужно сделать

### 1. Обновить код:

```bash
# Файл: purchase-confirmation.html
# Строка: 572

# Было:
'value': 1.0

# Станет:
'value': 80
```

### 2. Проверить Google Ads:

```
Campaign Settings:
✅ Strategy: Maximize Conversions
✅ Target CPA: $15 (можно оставить!)
✅ Conversion Value: $80 (будет получен из gtag)
```

### 3. Мониторинг:

После изменений:
- ✅ Conversion Value будет $80 в каждой конверсии
- ✅ Google увидит что клиент стоит $80
- ✅ Будет оптимизировать на качественных клиентов
- ✅ ROI станет +433% вместо -93%

---

## 📈 Прогноз

### При бюджете $800/месяц:

**Было (Value $1):**
```
Conversions: 53 (при $15 CPA)
Revenue: 53 × $1 = $53
Spend: $800
ROI: -93% ❌
Loss: -$747
```

**Станет (Value $80):**
```
Conversions: 53 (при $15 CPA)
Revenue: 53 × $80 = $4,240
Spend: $800
ROI: +430% ✅
Profit: +$3,440
```

---

## ⚠️ Важно

**Conversion Value = это среднее по ВСЕМ клиентам:**
- 50% заплатят только $3 (trial и уйдут)
- 50% заплатят $3 + $49 + $49 + ... = ~$150+

**Среднее: (~$3 × 50%) + (~$150 × 50%) = ~$77 ≈ $80 ✅**

Это правильная логика для Google Ads!

---

## 🚀 Готово к запуску?

**Чеклист:**
- [ ] Проверить январские данные в Stripe (опционально, для уточнения)
- [ ] Обновить `value: 80` в `purchase-confirmation.html`
- [ ] Задеплоить изменения
- [ ] Проверить что новая ценность отправляется (Console → Network)
- [ ] Оставить Target CPA $15
- [ ] Запустить кампанию Max Conversions
- [ ] Мониторить первые 50-100 конверсий

**Хотите чтобы я сейчас обновил код?** 🔧
