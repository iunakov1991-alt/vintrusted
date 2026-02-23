# 📊 Google Ads: Ценность конверсии (Conversion Value)

**Дата:** 2026-02-23

---

## 🎯 Что такое Conversion Value?

**Conversion Value** — это денежная ценность, которую вы передаете в Google Ads при каждой конверсии.

### Как это работает:

```javascript
gtag('event', 'conversion', {
  'send_to': 'AW-17824079146/MpIjCLKgpuYbEKq6l7NC',
  'value': 1.0,        // ← ЦЕННОСТЬ КОНВЕРСИИ
  'currency': 'USD',
  'transaction_id': 'xxx'
});
```

Google Ads использует `value` для:
1. **Оптимизации ставок** (понимает какие клики приносят больше денег)
2. **Расчета ROI** (показывает сколько вы заработали)
3. **Автоматической стратегии Max Conversions** (с target CPA/ROAS)

---

## 💰 Текущие настройки (У ВАС СЕЙЧАС)

### 1. `purchase-confirmation.html` (основная конверсия)

```javascript
window.gtag('event', 'conversion', {
    'send_to': 'AW-17824079146/MpIjCLKgpuYbEKq6l7NC',
    'value': 1.0,        // ← $1 за каждую оплату $1
    'currency': 'USD',
    'transaction_id': setupIntentId,
    'gclid': gclid || undefined
});
```

**Текущая ценность:** `$1.00` за каждую конверсию

---

### 2. `my-reports.html` (fallback + download tracking)

```javascript
// Расчет ценности в зависимости от tier
const tierValue = tier === 'premium' ? 25 :     // $25
                  tier === 'medium'  ? 5  :     // $5
                  tier === 'basic'   ? 1  : 0;  // $1

window.gtag('event', 'conversion', {
    'send_to': 'AW-17824079146/MpIjCLKgpuYbEKq6l7NC',
    'value': tierValue,  // ← Динамическая ценность по tier
    'currency': 'USD',
    'transaction_id': `${action}_${vin}_${Date.now()}`,
    'gclid': gclid || undefined
});
```

**Текущая ценность (download tracking):**
- Premium: `$25`
- Medium: `$5`
- Basic: `$1`

---

## ⚠️ ПРОБЛЕМА: Противоречие с Target CPA $15

### У вас сейчас:

| Параметр | Значение |
|----------|----------|
| **Conversion Value** | `$1.00` |
| **Target CPA** | `$15.00` |
| **Реальная цена продукта** | `$1.00` (trial) |

### Что это значит:

```
Conversion Value = $1
Target CPA = $15

→ Google думает: "Клиент готов платить $15 за конверсию стоимостью $1"
→ ROI = -93% (теряете $14 на каждой продаже!)
```

### ❌ Проблемы:

1. **Google оптимизирует на убыток**
   - Будет тратить до $15 чтобы получить $1 конверсию
   - ROI будет отрицательный

2. **Неправильная оптимизация**
   - Google будет показывать рекламу тем, кто готов заплатить $1
   - Но вы платите $15 за такого клиента!

3. **Потенциал роста = 0**
   - Google думает что ваша маржа $1
   - Не будет агрессивно масштабироваться

---

## ✅ РЕШЕНИЕ: Что нужно исправить

### Вариант 1: Conversion Value = LTV (рекомендуется)

**Если у вас есть recurring subscription:**

```javascript
// Используйте среднюю LTV (Lifetime Value) клиента
const averageLTV = 50; // Например, клиент в среднем платит $50 за весь период

window.gtag('event', 'conversion', {
    'value': averageLTV,  // ← $50 вместо $1
    'currency': 'USD'
});
```

**Target CPA:** `$15` ✅  
**LTV:** `$50`  
**ROI:** `233%` ✅ (зарабатываете $50, тратите $15)

---

### Вариант 2: Conversion Value = Первая оплата × Expected Lifetime

**Если trial → recurring:**

```javascript
// Средний клиент остается 6 месяцев
// Платит $29/месяц после trial
const expectedValue = 29 * 6; // $174

window.gtag('event', 'conversion', {
    'value': expectedValue,  // ← $174
    'currency': 'USD'
});
```

**Target CPA:** `$15` ✅  
**Expected Value:** `$174`  
**ROI:** `1060%` ✅

---

### Вариант 3: Conversion Value = Immediate Purchase Value

**Если нет recurring, только одна оплата:**

```javascript
// Используйте реальную цену продукта
const productPrice = 1.0; // $1 за trial

window.gtag('event', 'conversion', {
    'value': productPrice,
    'currency': 'USD'
});
```

**НО тогда Target CPA должен быть ниже:**

| Target CPA | ROI | Рекомендация |
|------------|-----|--------------|
| `$15` | ❌ -93% | Убыток! |
| `$0.50` | ✅ +100% | Прибыльно |
| `$0.30` | ✅ +233% | Отлично |

---

## 🎯 Рекомендация для вас

### Шаг 1: Посчитайте LTV

```
1. Средняя retention: X месяцев
2. Средний чек после trial: $Y/месяц
3. LTV = X × Y

Пример:
- Retention: 4 месяца
- Чек: $29/месяц
- LTV = 4 × $29 = $116
```

### Шаг 2: Установите правильную ценность

```javascript
// purchase-confirmation.html
window.gtag('event', 'conversion', {
    'send_to': 'AW-17824079146/MpIjCLKgpuYbEKq6l7NC',
    'value': 116,  // ← ВАШ РЕАЛЬНЫЙ LTV
    'currency': 'USD',
    'transaction_id': setupIntentId,
    'gclid': gclid || undefined
});
```

### Шаг 3: Скорректируйте Target CPA

```
Target CPA = LTV × 0.3  (30% от LTV на маркетинг)

Если LTV = $116:
Target CPA = $116 × 0.3 = $35

ИЛИ агрессивнее:
Target CPA = $116 × 0.5 = $58 (50% на маркетинг, быстрый рост)
```

---

## 📊 Сравнение: До и После

### ❌ СЕЙЧАС (неправильно):

| Параметр | Значение |
|----------|----------|
| Conversion Value | $1 |
| Target CPA | $15 |
| **ROI** | **-93%** ❌ |
| Google понимает | "Клиент стоит $1" |
| Оптимизация | На самых дешевых кликах |
| Масштабирование | Невозможно (убыток) |

### ✅ ПОСЛЕ (правильно):

| Параметр | Значение |
|----------|----------|
| Conversion Value | $116 (LTV) |
| Target CPA | $35 (30% от LTV) |
| **ROI** | **+231%** ✅ |
| Google понимает | "Клиент стоит $116" |
| Оптимизация | На качественных кликах |
| Масштабирование | Агрессивное (прибыльно) |

---

## 🔧 Что исправить в коде

### Файл: `purchase-confirmation.html`

**Строка 570-576:**

**Было:**
```javascript
window.gtag('event', 'conversion', {
    'send_to': 'AW-17824079146/MpIjCLKgpuYbEKq6l7NC',
    'value': 1.0,  // ← НЕПРАВИЛЬНО
    'currency': 'USD',
    'transaction_id': setupIntentId,
    'gclid': gclid || undefined
});
```

**Должно быть:**
```javascript
// ✅ ИСПРАВЛЕНИЕ: Используем реальную ценность клиента
const CUSTOMER_LTV = 116; // TODO: Заменить на ваш реальный LTV

window.gtag('event', 'conversion', {
    'send_to': 'AW-17824079146/MpIjCLKgpuYbEKq6l7NC',
    'value': CUSTOMER_LTV,  // ← $116 вместо $1
    'currency': 'USD',
    'transaction_id': setupIntentId,
    'gclid': gclid || undefined
});
```

---

### Файл: Google Ads Campaign Settings

**Target CPA настройки:**

**Было:**
```
Strategy: Max Conversions
Target CPA: $15
Conversion Value: $1 (из gtag)
→ ROI: -93%
```

**Должно быть:**
```
Strategy: Max Conversions
Target CPA: $35 (или $58 для агрессивного роста)
Conversion Value: $116 (из gtag)
→ ROI: +231%
```

---

## ⚡ Быстрый чеклист

- [ ] Посчитать реальный LTV клиента
- [ ] Обновить `value` в `purchase-confirmation.html`
- [ ] Обновить Target CPA в Google Ads (30-50% от LTV)
- [ ] Проверить что ценность отправляется (Console → Network → google-analytics)
- [ ] Подождать 7-14 дней (Google учится на новых данных)
- [ ] Масштабировать бюджет (если ROI положительный)

---

## 📞 Следующий шаг

**Вопрос к вам:**

1. **Какой ваш средний retention?** (сколько месяцев клиент остается)
2. **Какая цена после trial?** ($29/месяц? $49/месяц?)
3. **Есть ли recurring payments?** (или только одна оплата $1?)

**Когда узнаю — исправлю код под правильные цифры!** 🚀
