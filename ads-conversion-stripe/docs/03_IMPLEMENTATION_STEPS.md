# Шаги внедрения (конкретно для твоего проекта)

## ✅ ШАГ 1: Обнови .env.local

Добавь:
```
GOOGLE_ADS_CONVERSION_ID=AW-17824079146
GOOGLE_ADS_CONVERSION_LABEL=l62hCKPTndgbEKq6I7NC
STRIPE_WEBHOOK_SECRET=whsec_...
```

## ✅ ШАГ 2: Сохрани gclid при создании Stripe session

В `/api/create-setup-intent.js`:

```javascript
// Получить gclid из cookies или query
const gclid = req.cookies?.gclid || req.query?.gclid || '';

const setupIntent = await stripe.setupIntents.create({
  // ... твои параметры
  metadata: {
    vin: vin,
    gclid: gclid, // 👈 ДОБАВИТЬ ЭТО
  },
});
```

## ✅ ШАГ 3: Создай webhook endpoint в Stripe

1. Dashboard → Developers → Webhooks
2. Add endpoint
3. URL: `https://vintrusted.com/api/stripe-conversion-webhook`
4. Events: `payment_intent.succeeded`
5. Скопируй Signing secret → добавь в ENV

## ✅ ШАГ 4: Добавь gclid cookie на сайте

В `index.html` добавь перед закрытием `</body>`:

```html
<script>
// Сохранить gclid в cookie
(function() {
  const params = new URLSearchParams(window.location.search);
  const gclid = params.get('gclid');
  if (gclid) {
    document.cookie = 'gclid=' + gclid + '; max-age=' + (90*24*60*60) + '; path=/';
  }
})();
</script>
```

## ✅ ШАГ 5: Проверка

1. Сделай тестовую покупку
2. Проверь Stripe → Webhooks → Events
3. Проверь логи Vercel
4. Через 24-48ч проверь Google Ads → Конверсии

## ❗ КРИТИЧНО:

- gclid ДОЛЖЕН быть сохранён при клике из рекламы
- Webhook endpoint ДОЛЖЕН возвращать 200 OK
- Stripe ретраит webhook до 3х дней если не получил 200

