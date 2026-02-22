# 📊 Текущая Логика для Активной Подписки $49 Каждые 33 Дня

## 🎯 Как Работает Подписка $49

### Timeline Пользователя:

```
День 0: Оплата $2.99
├─ Status: trialing
├─ Quota: 1/1 (1 отчет уже куплен при checkout)
└─ Reports: [VIN из первой покупки]

День 3: Автоматическое списание $49
├─ Stripe отправляет: invoice.payment_succeeded (billing_reason: 'subscription_create')
├─ Status: active
├─ Quota: 1/1 → НЕ МЕНЯЕТСЯ (сохраняется с trial периода)
└─ Пользователь может использовать оставшийся 1 отчет

День 36 (33 дня после Дня 3): Второе списание $49
├─ Stripe отправляет: invoice.payment_succeeded (billing_reason: 'subscription_cycle')
├─ Status: active
├─ Quota: X/2 → 2/2 ✅ RESET (новый цикл начинается)
└─ Пользователь получает 2 новых отчета

День 69 (66 дней после Дня 3): Третье списание $49
├─ Stripe отправляет: invoice.payment_succeeded (billing_reason: 'subscription_cycle')
├─ Status: active
├─ Quota: X/2 → 2/2 ✅ RESET
└─ И так далее каждые 33 дня...
```

---

## 🔄 Webhook Логика (stripe-webhook.js)

### 1. **День 3: Первый Платеж $49 (subscription_create)**

```javascript
if (billingReason === 'subscription_create') {
    console.log('[WEBHOOK] 💳 First subscription payment - preserving trial quota');
    // НЕ сбрасываем quota
    // Quota остается как было (1/1 или 0/1 если пользователь уже использовал)
}
```

**Почему НЕ сбрасываем:**
- Пользователь уже получил 1 отчет при оплате $2.99
- День 3 - это просто "первый большой платеж", не новый цикл
- Цикл 33 дней начинается с Дня 3, а не с Дня 0

---

### 2. **День 36+: Recurring Платежи $49 (subscription_cycle)**

```javascript
if (billingReason === 'subscription_cycle') {
    console.log('[WEBHOOK] 🔄 Recurring payment - resetting quota');
    
    customerData.quota = {
        total: 2,
        used: 0,
        remaining: 2  // ✅ RESET на 2 новых отчета
    };
}
```

**Что происходит:**
- Квота полностью сбрасывается на 2/2
- Пользователь получает 2 новых проверки VIN
- Старые отчеты остаются в Purchase History

---

### 3. **Recovery from past_due (subscription_update)**

```javascript
if (billingReason === 'subscription_update') {
    console.log('[WEBHOOK] 🔧 Payment recovery - resetting quota');
    
    customerData.quota = {
        total: 2,
        used: 0,
        remaining: 2  // ✅ RESET
    };
}
```

**Когда это происходит:**
- Платеж $49 failed → status: 'past_due'
- Пользователь обновил карту
- Платеж прошел успешно → status: 'active'
- Квота сбрасывается на 2/2

---

## 🖥️ Логика Кабинета (my-reports.html)

### Что Видит Пользователь с Активной Подпиской:

#### ✅ Если `subscription.status === 'active'` И `quota.remaining > 0`:

```
┌─────────────────────────────────────┐
│ user@email.com    ✓ Active          │
│ ───────────────────────────────────  │
│ Reports Remaining              1/2  │
└─────────────────────────────────────┘

         [📄 View Your Report]
         (большая зеленая кнопка)

┌─────────────────────────────────────┐
│ Purchase History (5)                │
│ ├─ VIN1  [View] [Download]          │
│ ├─ VIN2  [View] [Download]          │
│ ├─ VIN3  [View] [Download]          │
│ └─ ...                              │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Check New VIN (1 remaining)         │
│ [Enter VIN] [Check]                 │
└─────────────────────────────────────┘
```

---

#### ❌ Если `subscription.status === 'active'` НО `quota.remaining === 0`:

```
┌─────────────────────────────────────┐
│ user@email.com    ✓ Active          │
│ ───────────────────────────────────  │
│ Reports Remaining              0/2  │
└─────────────────────────────────────┘

         [📄 View Your Report]
         (большая зеленая кнопка)

┌─────────────────────────────────────┐
│ No Reports Remaining                │
│            $49                      │
│ ✓ 2 new VIN reports                │
│ ✓ Full vehicle history              │
│ ✓ Instant access                    │
│ [Get 2 New Reports - $49]           │
└─────────────────────────────────────┘
(предложение manual renewal)

┌─────────────────────────────────────┐
│ Purchase History (5)                │
│ ├─ VIN1  [View] [Download]          │
│ └─ ...                              │
└─────────────────────────────────────┘

❌ НЕТ "Check New VIN" (квота 0)
```

**ВАЖНО:** 
- Если квота 0, показывается Offer Card с кнопкой "Get 2 New Reports - $49"
- Эта кнопка вызывает `renewSubscription()` → создает Checkout Session для $49
- НО это не "новая подписка", это просто "покупка 2 отчетов вручную"
- Автоматическая подписка продолжает работать каждые 33 дня

---

## 🔢 Quota Management

### Как Используется Квота:

```javascript
// use-quota.js
if (quota.remaining > 0) {
    customerData.quota.remaining -= 1;
    customerData.quota.used += 1;
    
    customerData.reports.push({
        vin: normalizedVin,
        purchased_at: new Date().toISOString(),
        period: 'subscription'
    });
}
```

### Пример Flow:

```
День 36: Quota reset → 2/2
├─ Пользователь проверяет VIN1 → 1/2
├─ Пользователь проверяет VIN2 → 0/2
└─ Квота закончилась → показывается Offer Card

День 38: Пользователь кликает "Get 2 New Reports - $49"
├─ Создается новый Checkout Session
├─ Платеж $49 → invoice.payment_succeeded (billing_reason: ???)
└─ Quota reset → 2/2 снова

День 69: Автоматический recurring $49
├─ Stripe списывает $49
├─ Quota reset → 2/2
└─ Цикл продолжается
```

**ВОПРОС:** Что происходит при manual renewal через кнопку "Get 2 New Reports - $49"?
- Это создает новый Checkout Session
- Не должно сбрасывать основную подписку
- Должно просто добавить 2 новых отчета?

---

## 🎨 UI Статусы

| Subscription Status | Badge Text           | Badge Color | Quota Visible |
|---------------------|----------------------|-------------|---------------|
| `trialing`          | ✓ Trial Period       | Green       | Yes (1/1)     |
| `active`            | ✓ Active Subscription| Green       | Yes (X/2)     |
| `past_due`          | ⚠️ Payment Failed    | Yellow      | No            |
| `canceled`          | ❌ No Active...      | Red         | No            |
| `disputed`          | 🚨 Disputed          | Red         | No            |

---

## ⚠️ Edge Cases & Потенциальные Проблемы

### 1. **Manual Renewal При Активной Подписке**

**Сценарий:**
- У пользователя active subscription
- Quota: 0/2
- Он кликает "Get 2 New Reports - $49"
- Что происходит?

**Текущая логика (`create-renewal-payment.js`):**
```javascript
// Создает Checkout Session для $49
// НО как это влияет на основную подписку?
// Сбрасывается ли квота? Меняется ли billing cycle?
```

**ВОЗМОЖНАЯ ПРОБЛЕМА:**
- Если это создает НОВУЮ подписку → старая отменяется?
- Если это "one-time payment" → как квота обновляется?

---

### 2. **localStorage Флаг "Первый Визит"**

**Текущая логика:**
```javascript
const isFirstVisit = !localStorage.getItem('vintrusted_visited_my_reports');

if (isFirstVisit && reports.length > 0) {
    // Показываем упрощенный интерфейс
}
```

**ПРОБЛЕМА:**
- Пользователь может очистить localStorage
- Или открыть в incognito
- Или на другом устройстве
- → Всегда будет видеть "первый визит"?

**РЕШЕНИЕ:**
- Использовать флаг в KV: `first_visit_completed: true`
- Устанавливать при первом открытии отчета
- Проверять через API

---

### 3. **Синхронизация Stripe ↔ KV**

**Что если:**
- Webhook не сработал?
- KV недоступен?
- Данные рассинхронизировались?

**Текущая защита:**
```javascript
// В my-reports.html данные ТОЛЬКО из KV
// НЕТ прямого обращения к Stripe API
```

**РИСК:**
- Если webhook failed → пользователь не видит обновленную квоту
- Если KV данные устарели → показывается неправильный статус

---

## ✅ Резюме: Что Работает Сейчас

### Для Активной Подписки $49/33 дня:

1. **День 0:** $2.99 → trialing → quota 1/1
2. **День 3:** $49 (первый) → active → quota НЕ меняется (остается 1/1 или 0/1)
3. **День 36+:** $49 (recurring) → active → quota RESET → 2/2
4. **Каждые 33 дня:** quota автоматически сбрасывается на 2/2
5. **В кабинете:**
   - Показывается email + status badge
   - Quota (X/2)
   - Purchase History с кнопками View/Download
   - Check New VIN (если quota > 0)
   - Offer Card "Get 2 New Reports" (если quota = 0)

### Что Показывается в Кабинете:

- ✅ User Card с email и статусом
- ✅ Reports Remaining (X/2)
- ✅ Зеленая кнопка "View Your Report" (последний отчет)
- ✅ Purchase History со всеми отчетами + кнопки View/Download
- ✅ Check New VIN форма (если quota > 0)
- ✅ Offer Card для manual renewal (если quota = 0)
