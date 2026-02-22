# 🚨 КРИТИЧЕСКАЯ ОШИБКА В QUOTA ЛОГИКЕ!

## ❌ ПРОБЛЕМА: Пользователь Получает 2 Отчета За $2.99 Вместо 1

### Текущий Код (checkout-trial-then-two-charges.js, строка 313-317):

```javascript
quota: {
    total: 2,  // ❌ НЕПРАВИЛЬНО!
    used: finalVin ? 1 : 0,
    remaining: finalVin ? 1 : 2  // ❌ Остается 1 или 2!
}
```

### Что Происходит:

```
Пользователь оплачивает $2.99
↓
Получает отчет для VIN1
↓
Quota: total: 2, used: 1, remaining: 1
↓
Может проверить ЕЩЕ ОДИН VIN бесплатно! ❌
↓
Итого: 2 отчета за $2.99 вместо 1
```

---

## ✅ ПРАВИЛЬНАЯ ЛОГИКА

### Что Должно Быть:

**Trial Period ($2.99):**
- Пользователь платит $2.99
- Получает **1 отчет** (тот VIN который ввел)
- Quota: `total: 1, used: 1, remaining: 0`

**День 3 ($49 первый платеж):**
- Stripe списывает $49
- Quota остается: `total: 1, used: 1, remaining: 0` (НЕ меняется)
- Пользователь НЕ получает новые отчеты

**День 36 ($49 recurring):**
- Stripe списывает $49
- Quota СБРАСЫВАЕТСЯ: `total: 2, used: 0, remaining: 2`
- Пользователь получает 2 новых отчета

---

## 🔧 ИСПРАВЛЕНИЕ

### Вариант A: Total = 1 Для Trial

```javascript
// checkout-trial-then-two-charges.js
quota: {
    total: 1,  // ✅ ТОЛЬКО 1 отчет за $2.99
    used: finalVin ? 1 : 0,
    remaining: finalVin ? 0 : 1  // ✅ 0 если VIN использован
}
```

**Результат:**
- Trial: 1 отчет (оплачен)
- Remaining: 0
- Пользователь НЕ может проверить дополнительные VIN
- День 36: Quota reset → 2/2

---

### Вариант B: Total = 2, Но Used = 2 После VIN

```javascript
// checkout-trial-then-two-charges.js
quota: {
    total: 2,  // Общий лимит для full subscription
    used: finalVin ? 2 : 0,  // ✅ Используем ВСЮ квоту сразу
    remaining: finalVin ? 0 : 2  // ✅ 0 если VIN использован
}
```

**Проблема:** 
- Логически неправильно: "used: 2" когда проверен только 1 VIN
- Confusing для пользователя

---

## 💡 РЕКОМЕНДАЦИЯ: Вариант A

**Почему:**
1. Логически правильно: trial = 1 отчет, full = 2 отчета
2. Понятно для пользователя
3. Меньше путаницы

**Изменения в других местах:**

### 1. Webhook: customer.subscription.created (НЕ renewal)

```javascript
// stripe-webhook.js
if (!customerData.quota) {
    // Новый customer (НЕ должно происходить, но на всякий случай)
    customerData.quota = {
        total: 2,  // ✅ Full subscription quota
        used: 0,
        remaining: 2
    };
} else {
    // Trial period quota (total: 1) - сохраняем как есть
    console.log('[WEBHOOK] Preserving trial quota:', customerData.quota);
    // НЕ меняем total с 1 на 2 до первого recurring payment
}
```

### 2. Webhook: invoice.payment_succeeded

**subscription_create (День 3 - первый $49):**
```javascript
if (billingReason === 'subscription_create' && !isRenewal) {
    console.log('[WEBHOOK] First $49 payment - preserving trial quota');
    // НЕ сбрасываем quota
    // Quota остается: { total: 1, used: 1, remaining: 0 }
}
```

**subscription_cycle (День 36+ - recurring $49):**
```javascript
if (billingReason === 'subscription_cycle') {
    console.log('[WEBHOOK] Recurring payment - resetting quota');
    // СБРАСЫВАЕМ quota на full subscription
    customerData.quota = {
        total: 2,  // ✅ Переходим на full quota
        used: 0,
        remaining: 2
    };
}
```

---

## 📊 Timeline С Правильной Логикой

```
День 0: Оплата $2.99
├─ Status: trialing
├─ Quota: { total: 1, used: 1, remaining: 0 }  // ✅ Только 1 отчет
└─ Reports: [VIN1]

День 3: Автоматическое списание $49
├─ Status: active
├─ Quota: { total: 1, used: 1, remaining: 0 }  // ✅ НЕ меняется
└─ Пользователь ждет Day 36

День 36: Recurring payment $49
├─ Status: active
├─ Quota: { total: 2, used: 0, remaining: 2 }  // ✅ RESET на 2/2
└─ Пользователь получает 2 новых отчета

День 69: Recurring payment $49
├─ Status: active
├─ Quota: { total: 2, used: 0, remaining: 2 }  // ✅ RESET на 2/2
└─ И так далее каждые 33 дня...
```

---

## ⚠️ ТЕКУЩЕЕ ПОВЕДЕНИЕ (НЕПРАВИЛЬНОЕ)

```
День 0: Оплата $2.99
├─ Quota: { total: 2, used: 1, remaining: 1 }  // ❌ Остается 1!
└─ Reports: [VIN1]

Пользователь может проверить VIN2 БЕСПЛАТНО!
├─ use-quota успешно проходит (remaining: 1)
├─ Quota: { total: 2, used: 2, remaining: 0 }
└─ Reports: [VIN1, VIN2]  // ❌ 2 отчета за $2.99!

День 3: Первый $49
├─ Quota НЕ меняется: { total: 2, used: 2, remaining: 0 }
└─ Пользователь уже использовал оба отчета бесплатно

День 36: Recurring $49
├─ Quota: { total: 2, used: 0, remaining: 2 }  // RESET
└─ Пользователь получает 2 новых отчета

ИТОГО: За период 0-36 дней пользователь получил:
- 2 отчета за $2.99 (должен быть 1!) ❌
- Заплатил $49 на день 3 БЕЗ получения отчетов ❌
```

---

## 🎯 СРОЧНО ИСПРАВИТЬ

### Код изменения:

**api/checkout-trial-then-two-charges.js, строка 313-317:**

```javascript
// БЫЛО:
quota: {
    total: 2,
    used: finalVin ? 1 : 0,
    remaining: finalVin ? 1 : 2
}

// ДОЛЖНО БЫТЬ:
quota: {
    total: 1,  // ✅ Trial = только 1 отчет
    used: finalVin ? 1 : 0,
    remaining: finalVin ? 0 : 1  // ✅ 0 если использован
}
```

**api/stripe-webhook.js, invoice.payment_succeeded:**

Убедиться что при `subscription_cycle` меняем `total` с 1 на 2:

```javascript
if (billingReason === 'subscription_cycle') {
    // КРИТИЧНО: Переходим на full subscription quota
    customerData.quota = {
        total: 2,  // ✅ Увеличиваем total с 1 до 2
        used: 0,
        remaining: 2
    };
}
```

---

## 💰 ФИНАНСОВЫЕ ПОСЛЕДСТВИЯ

**При текущей логике:**
- Каждый пользователь получает 2 отчета вместо 1 за $2.99
- Потеря: $49/2 = $24.50 на пользователя
- Если 1000 пользователей → потеря $24,500

**После исправления:**
- Пользователи получают ровно то, за что платят
- $2.99 = 1 отчет
- $49 (recurring) = 2 отчета каждые 33 дня

---

## ✅ ДЕЙСТВИЯ

1. **СРОЧНО:** Исправить quota в checkout-trial-then-two-charges.js (total: 1)
2. **ПРОВЕРИТЬ:** Webhook invoice.payment_succeeded правильно увеличивает total на recurring
3. **ТЕСТИРОВАТЬ:** Полный цикл с новой логикой
4. **МОНИТОРИТЬ:** Проверить что существующие пользователи не пострадали
