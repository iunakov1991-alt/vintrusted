# 🚀 СЕРВЕРНЫЙ МЕТОД ОТСЛЕЖИВАНИЯ КОНВЕРСИЙ GOOGLE ADS

## 📌 Что это?

Новый надёжный метод отслеживания конверсий Google Ads через **Stripe webhooks**.

**Старый метод (GTM + dataLayer):**
- ❌ Зависит от браузера
- ❌ Блокируется на iOS/Safari
- ❌ Проблемы с CSP
- ❌ Зависит от корректной настройки GTM
- ❌ Может не сработать при редиректах

**Новый метод (Stripe webhook → Google Ads):**
- ✅ Работает на сервере (не зависит от браузера)
- ✅ Работает на iOS/Safari
- ✅ Нет проблем с CSP
- ✅ Не зависит от GTM
- ✅ Stripe автоматически ретраит при сбое
- ✅ Единственный источник истины (деньги реально списались)

---

## 🏗️ Архитектура

```
┌──────────────┐
│ Пользователь │ кликает на объявление в Google Ads
└──────┬───────┘
       │ ?gclid=abc123
       ↓
┌──────────────┐
│  Твой сайт   │ gclid-cookie.js сохраняет gclid в cookie (90 дней)
└──────┬───────┘
       │
       ↓
┌──────────────┐
│  Форма + VIN │ пользователь вводит VIN и оплачивает
└──────┬───────┘
       │
       ↓
┌──────────────┐
│create-setup- │ читает gclid из cookie → сохраняет в metadata
│  intent.js   │
└──────┬───────┘
       │
       ↓
┌──────────────┐
│    Stripe    │ обрабатывает оплату
└──────┬───────┘
       │ payment_intent.succeeded
       ↓
┌──────────────────────────┐
│stripe-conversion-webhook │ достаёт gclid из metadata
│          .js             │ → отправляет в Google Ads
└──────────────────────────┘
       │
       ↓
┌──────────────┐
│  Google Ads  │ ✅ конверсия получена!
└──────────────┘
```

---

## 📁 Созданные файлы

### 1. `/api/stripe-conversion-webhook.js`
Главный webhook endpoint для Stripe.

**Что делает:**
- Слушает `payment_intent.succeeded`
- Достаёт `gclid` из `metadata`
- Отправляет конверсию в Google Ads
- Логирует в Upstash KV

**ENV переменные:**
- `STRIPE_SECRET_KEY` (уже есть)
- `STRIPE_WEBHOOK_SECRET_CONVERSION` (новая, получишь в Stripe)
- `GOOGLE_ADS_CONVERSION_ID` (новая, `AW-17824079146`)
- `GOOGLE_ADS_CONVERSION_LABEL` (новая, `l62hCKPTndgbEKq6I7NC`)

### 2. `/public/gclid-cookie.js`
Скрипт для сохранения gclid в cookie.

**Что делает:**
- Читает `?gclid=...` из URL
- Сохраняет в cookie на 90 дней
- Cookie используется в `create-setup-intent.js`

### 3. Обновлённые файлы:

#### `/api/create-setup-intent.js`
```javascript
// ДОБАВЛЕНО:
const gclid = req.cookies?.gclid || '';
if (gclid) {
  metadata.gclid = gclid;
}
```

#### `/index.html`
```html
<!-- ДОБАВЛЕНО: -->
<script src="/public/gclid-cookie.js" defer></script>
```

#### `/vercel.json`
```json
// ДОБАВЛЕНО:
{
  "src": "api/stripe-conversion-webhook.js",
  "use": "@vercel/node"
},
// ...
{
  "source": "/api/stripe-conversion-webhook",
  "destination": "/api/stripe-conversion-webhook.js"
}
```

#### `/purchase-confirmation.html`
```javascript
// ДОБАВЛЕНО:
// Fallback клиентский метод (gtag) на случай сбоя webhook
if (window.gtag) {
  window.gtag('event', 'conversion', {
    'send_to': 'AW-17824079146/l62hCKPTndgbEKq6I7NC',
    'value': 3.0,
    'currency': 'USD',
    'transaction_id': setupIntentId
  });
}
```

---

## 🛠️ Настройка

### ШАГ 1: Добавь ENV в Vercel

```bash
GOOGLE_ADS_CONVERSION_ID=AW-17824079146
GOOGLE_ADS_CONVERSION_LABEL=l62hCKPTndgbEKq6I7NC
STRIPE_WEBHOOK_SECRET_CONVERSION=whsec_...  # получишь в следующем шаге
```

### ШАГ 2: Создай webhook в Stripe

1. Stripe Dashboard → Developers → Webhooks
2. **Add endpoint**
3. **URL:** `https://vintrusted.com/api/stripe-conversion-webhook`
4. **Events:** `payment_intent.succeeded`
5. **Add endpoint**
6. **Reveal** → скопируй `whsec_...`
7. Добавь в Vercel как `STRIPE_WEBHOOK_SECRET_CONVERSION`

### ШАГ 3: Deploy

```bash
cd /Users/dmitrii/Desktop/website
git add .
git commit -m "feat: add server-side Google Ads conversion tracking via Stripe webhook"
git push
```

Vercel автоматически задеплоит.

### ШАГ 4: Проверь webhook

1. Stripe → Webhooks → твой endpoint
2. **Send test webhook** → `payment_intent.succeeded`
3. Vercel → Logs → должен быть:
   ```
   [WEBHOOK] ✅ Google Ads conversion sent
   ```

### ШАГ 5: Тестовая покупка

1. Открой `https://vintrusted.com/?gclid=test123`
2. Console → должен быть `[GCLID] ✅ Saved to cookie: test123...`
3. Сделай покупку
4. Vercel → Logs → должен быть `[WEBHOOK] ✅ Google Ads conversion sent`
5. Stripe → Webhooks → Events → статус `succeeded`
6. Через 24-48ч проверь Google Ads → Цели

---

## 🔍 Диагностика

### Проверка 1: gclid сохраняется?
```
1. https://vintrusted.com/?gclid=test123
2. Console → [GCLID] ✅ Saved to cookie: test123...
3. DevTools → Application → Cookies → gclid=test123
```

### Проверка 2: gclid передаётся в Stripe?
```
1. Сделай тестовую покупку с ?gclid=test123
2. Stripe → Payments → твой payment
3. Metadata → должен быть gclid: test123
```

### Проверка 3: webhook работает?
```
1. Stripe → Webhooks → твой endpoint
2. Send test webhook → payment_intent.succeeded
3. Vercel → Logs → [WEBHOOK] ✅ Google Ads conversion sent
```

### Проверка 4: Google Ads получает?
```
1. Google Ads → Цели → Stripe Purchase → Diagnostics
2. Через 24-48ч должны появиться конверсии
```

---

## 📊 Логирование

Все конверсии логируются в Upstash KV:

```javascript
{
  timestamp: "2025-01-04T12:00:00.000Z",
  transactionId: "pi_xxx",
  value: 3.0,
  currency: "USD",
  gclid: "abc123...",
  googleAdsResult: { success: true, status: 200 },
  source: "stripe_webhook"
}
```

Доступ через `/conversion-analytics.html` (уже существует).

---

## ⚠️ ВАЖНО

### Дедупликация
`transaction_id` используется для дедупликации:
- Серверный webhook отправляет с `transaction_id`
- Клиентский fallback отправляет с тем же `transaction_id`
- Google Ads дедуплицирует по `transaction_id`

### Fallback
Если серверный webhook временно недоступен:
- Клиент отправит gtag conversion на `purchase-confirmation.html`
- Используется тот же `transaction_id` → дедупликация

### Retry
Stripe автоматически ретраит webhook до 3х дней:
- 1 раз сразу
- Затем с увеличивающимися интервалами
- Последняя попытка через 72 часа

---

## 📚 Документация

Полная инструкция:
- `/ads-conversion-stripe/docs/01_GOOGLE_ADS_UI_STEPS.md` - настройка Google Ads
- `/ads-conversion-stripe/docs/02_STRIPE_WEBHOOK_METHOD.md` - как работает метод
- `/ads-conversion-stripe/docs/03_IMPLEMENTATION_STEPS.md` - шаги внедрения
- `/ads-conversion-stripe/ENV_SETUP.md` - настройка ENV
- `/ads-conversion-stripe/DEPLOY_CHECKLIST.md` - чеклист деплоя

---

## 🎯 Результат

✅ Надёжное отслеживание конверсий на всех платформах
✅ Работает на iOS/Safari
✅ Не зависит от браузера и GTM
✅ Автоматический retry от Stripe
✅ Дедупликация через transaction_id
✅ Fallback клиентский метод
✅ Полное логирование в Upstash KV

**Готов к деплою!** 🚀

