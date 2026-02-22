# 🚨 КРИТИЧЕСКИЕ ПРОБЛЕМЫ: Цикл Подписки

## ❌ ПРОБЛЕМА #1: Manual Renewal НЕ Обновляет Квоту

### Описание Проблемы:

**Сценарий:**
1. Пользователь имеет `active` подписку
2. Квота закончилась: `0/2`
3. Пользователь кликает "Get 2 New Reports - $49" в Offer Card
4. `create-renewal-payment.js` создает НОВУЮ подписку через Checkout
5. Webhook `customer.subscription.created` срабатывает
6. **ПРОБЛЕМА:** Квота НЕ обновляется!

### Код Проблемы:

**stripe-webhook.js, строки 190-200:**
```javascript
if (!customerData.quota) {
    // Если quota НЕ существует (renewal case) - создаем с 2/2
    customerData.quota = {
        total: 2,
        used: 0,
        remaining: 2
    };
} else {
    // ❌ ПРОБЛЕМА: Если quota существует - сохраняем старое значение!
    console.log('[WEBHOOK] ℹ️  Preserving existing quota from trial period:', customerData.quota);
}
```

**Почему это ломается:**
- При manual renewal `customerData` УЖЕ существует (это не новый пользователь)
- `customerData.quota` = `{ total: 2, used: 2, remaining: 0 }`
- Условие `if (!customerData.quota)` = FALSE
- Квота НЕ обновляется
- Пользователь заплатил $49, но квота осталась 0/2 ❌

### Последствия:

- Пользователь заплатил $49 но НЕ получил 2 новых отчета
- Квота осталась 0/2
- Нужно ждать `invoice.payment_succeeded` webhook
- НО там тоже есть проблема...

---

## ❌ ПРОБЛЕМА #2: Manual Renewal Invoice НЕ Сбрасывает Квоту

### Webhook `invoice.payment_succeeded`:

**stripe-webhook.js, строки 326-345:**
```javascript
const billingReason = invoice.billing_reason;

// КРИТИЧНО: Сбрасываем quota ТОЛЬКО для recurring payments или recovery
const shouldResetQuota = billingReason === 'subscription_cycle' || billingReason === 'subscription_update';

if (shouldResetQuota) {
    // RESET QUOTA на новый цикл
    customerData.quota = {
        total: 2,
        used: 0,
        remaining: 2
    };
} else if (billingReason === 'subscription_create') {
    // НЕ сбрасываем quota
    console.log('[WEBHOOK] 💳 First subscription payment - preserving trial quota');
}
```

**Проблема:**
- Manual renewal через Checkout создает invoice с `billing_reason: 'subscription_create'`
- Это НЕ `subscription_cycle` и НЕ `subscription_update`
- Квота НЕ сбрасывается!
- Пользователь снова заплатил $49, но квота всё еще 0/2 ❌

### Логика Неправильная:

```
User clicks "Get 2 New Reports - $49"
↓
create-renewal-payment creates Checkout Session
↓
User pays $49
↓
Webhook: customer.subscription.created
├─ Quota exists → NOT updated (0/2)
↓
Webhook: invoice.payment_succeeded
├─ billing_reason: 'subscription_create'
├─ shouldResetQuota = FALSE
└─ Quota NOT updated (still 0/2)
↓
❌ User paid but got NOTHING
```

---

## ❌ ПРОБЛЕМА #3: Дублирование Подписок При Manual Renewal

### Описание:

**Что происходит при manual renewal:**
1. Пользователь имеет `active` подписку с ID `sub_abc123`
2. Квота 0/2
3. Кликает "Get 2 New Reports - $49"
4. `create-renewal-payment` создает НОВУЮ подписку с ID `sub_xyz789`
5. **Старая подписка** `sub_abc123` всё еще `active`!

**Последствия:**
- 2 активных подписки одновременно
- 2x $49 будут списываться каждые 33 дня
- Пользователь платит $98/месяц вместо $49 ❌

### Код Проверки:

**create-renewal-payment.js, строки 65-71:**
```javascript
if ((subStatus === 'active' || subStatus === 'trialing') && hasQuota && !isCanceling) {
    // Блокируем renewal если есть quota
    return res.status(403).json({ error: 'Active subscription exists' });
}
```

**Проблема:**
- Блокируется только если `hasQuota = true`
- Если `quota.remaining === 0` → блокировка НЕ срабатывает
- Создается новая подписка ПОВЕРХ старой
- Старая подписка НЕ отменяется автоматически

---

## ❌ ПРОБЛЕМА #4: Metadata 'renewal' Не Используется

### Код:

**create-renewal-payment.js, строки 116-119:**
```javascript
subscription_data: {
    metadata: {
        renewal: 'true',
        original_email: email
    }
}
```

**Проблема:**
- Metadata устанавливается при создании Checkout
- НО нигде в webhook НЕ проверяется!
- Нет способа отличить "manual renewal" от "обычной подписки"

**Где должно использоваться:**
```javascript
// stripe-webhook.js
if (event.type === 'customer.subscription.created') {
    const subscription = event.data.object;
    const isRenewal = subscription.metadata?.renewal === 'true';
    
    if (isRenewal) {
        // Логика для manual renewal:
        // 1. Отменить старую подписку
        // 2. Сбросить квоту на 2/2
        // 3. Сохранить старые reports
    }
}
```

---

## ❌ ПРОБЛЕМА #5: Нет Отмены Старой Подписки

### При Manual Renewal Должно Происходить:

1. ✅ Создать новую подписку
2. ❌ **ОТМЕНИТЬ старую подписку** ← НЕ РЕАЛИЗОВАНО
3. ✅ Сбросить квоту на 2/2
4. ✅ Сохранить старые reports

**Как Должно Быть:**

```javascript
// stripe-webhook.js - в customer.subscription.created
if (isRenewal && customerData.subscription?.subscription_id) {
    const oldSubscriptionId = customerData.subscription.subscription_id;
    
    try {
        // Отменяем старую подписку немедленно
        await stripe.subscriptions.cancel(oldSubscriptionId);
        console.log('[WEBHOOK] ✅ Old subscription canceled:', oldSubscriptionId);
    } catch (err) {
        console.error('[WEBHOOK] ❌ Failed to cancel old subscription:', err.message);
    }
}
```

---

## ⚠️ ПРОБЛЕМА #6: localStorage "Первый Визит" Ненадежно

### Текущая Логика:

```javascript
// my-reports.html
const isFirstVisit = !localStorage.getItem('vintrusted_visited_my_reports');

if (isFirstVisit && reports.length > 0) {
    // Показываем упрощенный интерфейс
}
```

**Проблемы:**
1. **Пользователь очистил localStorage** → снова видит "первый визит"
2. **Открыл в incognito** → видит "первый визит"
3. **Другой браузер/устройство** → видит "первый визит"
4. **Блокировщик cookies/localStorage** → видит "первый визит"

**Решение:**
```javascript
// Использовать флаг в KV
customerData.first_report_viewed = true; // Устанавливается при первом просмотре

// В API get-customer-data.js
return res.json({
    // ...
    first_report_viewed: customerData.first_report_viewed || false
});

// В my-reports.html
const isFirstVisit = !data.first_report_viewed;
```

---

## ⚠️ ПРОБЛЕМА #7: Нет Синхронизации Start Date

### При Manual Renewal:

**Ожидание:**
- Новая подписка должна начаться СЕЙЧАС
- Первый recurring payment через 33 дня
- `start_date` = NOW

**Реальность (если не отменить старую подписку):**
- Старая подписка: `current_period_end` = через 10 дней
- Новая подписка: `current_period_end` = через 33 дня
- Оба будут списываться параллельно!

---

## 🔴 ПРОБЛЕМА #8: Логика Блокировки Renewal Неполная

### Текущая Логика:

**create-renewal-payment.js:**
```javascript
if ((subStatus === 'active' || subStatus === 'trialing') && hasQuota && !isCanceling) {
    return res.status(403).json({ error: 'Active subscription exists' });
}
```

**Что Блокируется:**
- ✅ active с квотой > 0
- ✅ trialing с квотой > 0

**Что НЕ Блокируется:**
- ❌ active с квотой = 0 (это и есть наш use case!)
- ❌ trialing с квотой = 0
- ❌ past_due с квотой = 0

**Правильная Логика Должна Быть:**

```javascript
// Блокируем renewal если ЛЮБАЯ подписка активна (независимо от квоты)
if ((subStatus === 'active' || subStatus === 'trialing') && !isCanceling) {
    // Вместо блокировки - отменяем старую подписку и создаем новую
    // ИЛИ просто сбрасываем квоту без новой подписки
    
    // Опция 1: Сбросить квоту текущей подписки (не создавать новую)
    // Опция 2: Отменить старую, создать новую
}
```

---

## 📊 ИТОГОВАЯ ОЦЕНКА ПРОБЛЕМ

| # | Проблема | Критичность | Последствия |
|---|----------|-------------|-------------|
| 1 | Manual renewal НЕ обновляет квоту в subscription.created | 🔴 КРИТИЧНО | Пользователь платит $49, не получает отчеты |
| 2 | Manual renewal НЕ сбрасывает квоту в invoice.payment_succeeded | 🔴 КРИТИЧНО | Пользователь платит $49, не получает отчеты |
| 3 | Дублирование подписок | 🔴 КРИТИЧНО | Пользователь платит $98 вместо $49 каждые 33 дня |
| 4 | Metadata 'renewal' не используется | 🟡 ВАЖНО | Нет способа обработать renewal правильно |
| 5 | Нет отмены старой подписки | 🔴 КРИТИЧНО | Дублирование подписок → двойная оплата |
| 6 | localStorage "первый визит" ненадежно | 🟢 МЕЛКО | Inconsistent UX |
| 7 | Нет синхронизации дат | 🟡 ВАЖНО | Непредсказуемые даты списания |
| 8 | Логика блокировки неполная | 🔴 КРИТИЧНО | Позволяет создать дубликат подписки |

---

## ✅ РЕКОМЕНДУЕМЫЕ ИСПРАВЛЕНИЯ

### Опция A: Сбросить Квоту Без Новой Подписки (ПРОЩЕ)

**Изменить логику "Get 2 New Reports - $49":**

1. НЕ создавать новую подписку
2. Просто сбросить квоту текущей подписки на 2/2
3. Списать $49 как one-time payment

**Плюсы:**
- Нет дублирования подписок
- Проще реализовать
- Меньше edge cases

**Минусы:**
- Не "настоящий" renewal
- Нарушает цикл подписки (33 дня)

---

### Опция B: Правильный Renewal с Отменой Старой (ПРАВИЛЬНЕЕ)

**Изменить webhook логику:**

```javascript
// stripe-webhook.js - customer.subscription.created
if (event.type === 'customer.subscription.created') {
    const subscription = event.data.object;
    const isRenewal = subscription.metadata?.renewal === 'true';
    
    if (isRenewal && customerData) {
        console.log('[WEBHOOK] 🔄 Processing manual renewal');
        
        // 1. Отменить старую подписку
        if (customerData.subscription?.subscription_id && 
            customerData.subscription.subscription_id !== subscription.id) {
            try {
                await stripe.subscriptions.cancel(customerData.subscription.subscription_id);
                console.log('[WEBHOOK] ✅ Old subscription canceled');
            } catch (err) {
                console.error('[WEBHOOK] ❌ Failed to cancel old subscription:', err);
            }
        }
        
        // 2. СБРОСИТЬ КВОТУ (независимо от существования)
        customerData.quota = {
            total: 2,
            used: 0,
            remaining: 2
        };
        console.log('[WEBHOOK] ✅ Quota reset for renewal');
        
        // 3. Сохранить старые reports
        // (они уже в customerData.reports)
    }
    
    // Обновить subscription данные
    customerData.subscription = {
        subscription_id: subscription.id,
        status: subscription.status,
        start_date: new Date(subscription.current_period_start * 1000).toISOString(),
        end_date: new Date(subscription.current_period_end * 1000).toISOString()
    };
    
    await kv.set(customerKey, customerData);
}
```

**И обновить invoice.payment_succeeded:**

```javascript
if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object;
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    const isRenewal = subscription.metadata?.renewal === 'true';
    
    const shouldResetQuota = 
        billingReason === 'subscription_cycle' || 
        billingReason === 'subscription_update' ||
        (billingReason === 'subscription_create' && isRenewal); // ✅ Добавлено
    
    if (shouldResetQuota) {
        customerData.quota = {
            total: 2,
            used: 0,
            remaining: 2
        };
    }
}
```

---

## 🎯 СРОЧНЫЕ ДЕЙСТВИЯ

1. **НЕМЕДЛЕННО:** Исправить Проблему #1, #2 (квота не обновляется)
2. **НЕМЕДЛЕННО:** Исправить Проблему #3, #5 (дублирование подписок)
3. **ВАЖНО:** Исправить Проблему #4 (использовать metadata)
4. **ЖЕЛАТЕЛЬНО:** Исправить Проблему #6 (localStorage → KV)

**Без этих исправлений manual renewal НЕ РАБОТАЕТ!**
