# 🚨 СРОЧНО: НАСТРОЙКА STRIPE WEBHOOK

## ❌ ПРОБЛЕМА:
Конверсия "Purchase" НЕ отстукивается потому что webhook НЕ настроен!

---

## ✅ РЕШЕНИЕ: Настроить webhook В STRIPE DASHBOARD

### Шаг 1: Открой Stripe Webhooks
```
https://dashboard.stripe.com/webhooks
```

### Шаг 2: Нажми "+ Add endpoint"

### Шаг 3: Заполни форму:

**Endpoint URL:**
```
https://vintrusted.com/api/stripe-conversion-webhook
```

**Events to send:**
Выбери ТОЛЬКО:
- ☑️ `payment_intent.succeeded`

### Шаг 4: Нажми "Add endpoint"

### Шаг 5: Скопируй Signing secret

После создания webhook-а Stripe покажет **Signing secret** (начинается с `whsec_`)

**СКОПИРУЙ ЕГО ПОЛНОСТЬЮ!**

### Шаг 6: Добавь secret в Vercel

В терминале:
```bash
cd /Users/dmitrii/Desktop/vintrusted

# Добавь secret для production
printf "whsec_XXXXX" | vercel env add STRIPE_WEBHOOK_SECRET_CONVERSION production

# Добавь secret для preview
printf "whsec_XXXXX" | vercel env add STRIPE_WEBHOOK_SECRET_CONVERSION preview

# Добавь secret для development
printf "whsec_XXXXX" | vercel env add STRIPE_WEBHOOK_SECRET_CONVERSION development
```

(Замени `whsec_XXXXX` на реальный secret из Stripe)

---

## ✅ ПРОВЕРКА:

### После настройки webhook:

1. Сделай тестовую покупку
2. Открой → https://dashboard.stripe.com/webhooks
3. Кликни на твой webhook
4. Во вкладке **"Logs"** должны появиться успешные запросы
5. Статус: **"Succeeded"**

---

## 🎯 РЕЗУЛЬТАТ:

После настройки webhook все конверсии будут отстукиваться **АВТОМАТИЧЕСКИ** и **НАДЁЖНО**!

**Серверный метод >> Client-side fallback**

---

## 📞 ЕСЛИ НУЖНА ПОМОЩЬ:

Покажи мне скриншот страницы Stripe Webhooks!
