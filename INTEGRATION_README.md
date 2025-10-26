# VinTrusted - Stripe + VinAudit Integration

## Архитектура

Полная end-to-end интеграция Stripe + VinAudit с автоматическим переключением MOCK/LIVE режимов.

### Структура файлов

```
/api/
  /_lib/
    stripe.js         # Инициализация Stripe
    store.js          # In-memory кэш статуса отчётов
    vinaudit.js       # Адаптер VinAudit (MOCK/LIVE auto-switch)
  checkout.js         # Создание Checkout Session $3 БЕЗ SetupIntent
  stripe-webhook.js   # Webhook: подписка $49 + генерация отчёта
  report.js           # API для получения статуса/данных отчёта
  health.js           # Проверка статуса (mock/live)

/public/
  checkout-bind.js    # Привязка форм VIN/Plate к /api/checkout

success.html          # Страница успешной оплаты (авто-редирект)
report-view.html      # Страница отображения отчёта
```

## Переменные окружения

Создайте `.env` файл на основе `env.example`:

```bash
# Stripe (REQUIRED)
STRIPE_SECRET_KEY=sk_live_***
STRIPE_WEBHOOK_SECRET=whsec_***
STRIPE_PRICE_49_MONTHLY=price_1SLgSWIyzEAMYCDXa8g7uV6W

# VinAudit (оставить пустым для MOCK режима)
VINAUDIT_API_KEY=

# Plate→VIN (опционально)
AUTODEV_PLATE_API_KEY=

# App
APP_URL=https://vintrusted.com
NODE_ENV=production
```

## Как это работает

### 1. Пользователь вводит VIN или License Plate

Формы на главной странице автоматически привязаны через `checkout-bind.js`:
- Находит все формы с `[data-vin]` или `[data-plate]` + `[data-state]`
- При submit отправляет POST `/api/checkout`
- Валидирует VIN (17 символов, без I/O/Q)

### 2. Создание Checkout Session ($3)

**ВАЖНО:** Используется `mode: 'payment'` + `setup_future_usage: 'off_session'` + `customer_creation: 'always'`

Это сохраняет карту **БЕЗ SetupIntent** → фикс ошибки 400.

```javascript
// api/checkout.js
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  customer_creation: 'always',
  line_items: [{ price_data: { ... }, quantity: 1 }],
  payment_intent_data: { setup_future_usage: 'off_session' },
  success_url: `${APP_URL}/success.html?cs={CHECKOUT_SESSION_ID}`,
  metadata: { vin, plate, state }
});
```

### 3. Webhook: Подписка $49 + Генерация отчёта

После успешной оплаты $3:

1. **Создаётся подписка $49/месяц:**
   - Trial period: 7 дней
   - Авто-стоп после 2 циклов (через `cancel_at`)

2. **Генерируется отчёт:**
   - Если `VINAUDIT_API_KEY` пустой → MOCK данные
   - Если ключ установлен → реальный API VinAudit
   - Статус сохраняется в `store` (in-memory)

```javascript
// api/stripe-webhook.js
const sub = await stripe.subscriptions.create({
  customer: cs.customer,
  items: [{ price: PRICE_ID }],
  trial_period_days: 7,
  default_payment_method: pmId
});

// Авто-стоп после 2 циклов
const secondCycleEnd = trialEnd + 2 * 30 * 24 * 3600 * 1000;
await stripe.subscriptions.update(sub.id, {
  cancel_at: Math.floor(secondCycleEnd / 1000)
});
```

### 4. Success → Report

- `success.html` получает `?cs=checkout_session_id`
- Авто-редирект на `/report-view.html?id=checkout_session_id`
- Страница отчёта poll'ит `/api/report?id=...` каждые 2 секунды
- Когда статус `ready` → отображает отчёт

## Проверка готовности

### 1. Health Check

```bash
curl https://vintrusted.com/api/health
```

Ответ:
```json
{
  "vinaudit": "mock",  // или "live"
  "stripe": "configured",
  "app_url": "https://vintrusted.com"
}
```

### 2. Тестовая оплата

1. Откройте https://vintrusted.com
2. Введите тестовый VIN: `1HGBH41JXMN109186`
3. Нажмите "Get My Report"
4. Используйте тестовую карту Stripe: `4242 4242 4242 4242`
5. После оплаты → редирект на отчёт с MOCK данными

### 3. Включение LIVE режима

1. Получите API ключ VinAudit
2. Установите в Vercel: `VINAUDIT_API_KEY=your_key`
3. Redeploy проекта
4. Проверьте `/api/health` → должен показать `"vinaudit": "live"`

## FIX: create-setup-intent HTTP 400

### Проблема

Старый код пытался создать SetupIntent отдельно, что вызывало конфликт с Checkout Session.

### Решение

**Удалены все вызовы SetupIntent.** Вместо этого используется:

```javascript
mode: 'payment',
customer_creation: 'always',
payment_intent_data: { setup_future_usage: 'off_session' }
```

Stripe автоматически сохраняет payment method у customer для последующей подписки.

### Что удалено

- ❌ `api/create-setup-intent.js`
- ❌ Фронтовые вызовы `/create-setup-intent`
- ❌ `stripe.confirmSetup()` в клиентском коде

### Что добавлено

- ✅ `customer_creation: 'always'` в Checkout
- ✅ `setup_future_usage: 'off_session'` в payment_intent_data
- ✅ Получение PM из PaymentIntent в webhook

## Подписка $49: Авто-стоп после 2 циклов

Логика:
1. Trial: 7 дней (бесплатно)
2. Цикл 1: через 7 дней → $49
3. Цикл 2: через 37 дней → $49
4. Авто-отмена: через 67 дней

Реализация:
```javascript
const trialEnd = sub.trial_end * 1000;
const secondCycleEnd = trialEnd + 2 * 30 * 24 * 3600 * 1000;
await stripe.subscriptions.update(sub.id, {
  cancel_at: Math.floor(secondCycleEnd / 1000)
});
```

## GA4/Ads исключение купивших

В `checkout-bind.js` добавлен push в dataLayer:

```javascript
window.dataLayer = window.dataLayer || [];
window.dataLayer.push({ event: 'checkout_start' });
```

Дополнительно можно добавить в `report-view.html`:

```javascript
window.dataLayer.push({ 
  event: 'purchase_report',
  transaction_id: reportId 
});
```

Затем в Google Ads создать аудиторию исключения на основе события `purchase_report`.

## Деплой

```bash
# Установить зависимости (если нужно)
npm install stripe

# Установить переменные окружения в Vercel
vercel env add STRIPE_SECRET_KEY
vercel env add STRIPE_WEBHOOK_SECRET
vercel env add STRIPE_PRICE_49_MONTHLY
vercel env add APP_URL

# Деплой
git add .
git commit -m "Add Stripe + VinAudit integration"
git push

# Vercel автоматически задеплоит
```

## Настройка Stripe Webhook

1. Перейдите в Stripe Dashboard → Developers → Webhooks
2. Добавьте endpoint: `https://vintrusted.com/api/stripe-webhook`
3. Выберите события: `checkout.session.completed`
4. Скопируйте webhook secret → установите в `STRIPE_WEBHOOK_SECRET`

## Troubleshooting

### Ошибка 400 при checkout

- Проверьте, что используется новый `/api/checkout` (без SetupIntent)
- Убедитесь, что старые файлы `create-setup-intent.js` не вызываются

### Отчёт не генерируется

- Проверьте webhook в Stripe Dashboard → Events
- Проверьте логи Vercel: `vercel logs`
- Убедитесь, что `STRIPE_WEBHOOK_SECRET` корректный

### MOCK данные вместо реальных

- Проверьте `/api/health` → должен показать `"vinaudit": "live"`
- Убедитесь, что `VINAUDIT_API_KEY` установлен в Vercel
- Redeploy после установки переменной

## Контакты

Для вопросов по интеграции: support@vintrusted.com

