# ENV Variables для Google Ads Conversion

Добавь в Vercel → Settings → Environment Variables:

```bash
# Google Ads Conversion (ОБЯЗАТЕЛЬНО)
GOOGLE_ADS_CONVERSION_ID=AW-17824079146
GOOGLE_ADS_CONVERSION_LABEL=l62hCKPTndgbEKq6I7NC

# Stripe Webhook Secret для нового endpoint (ОБЯЗАТЕЛЬНО)
STRIPE_WEBHOOK_SECRET_CONVERSION=whsec_...

# Stripe (уже должен быть)
STRIPE_SECRET_KEY=sk_live_...

# Upstash KV (уже должен быть)
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=...
```

## Где взять Webhook Secret:

1. Stripe Dashboard → Developers → Webhooks
2. Add endpoint
3. URL: `https://vintrusted.com/api/stripe-conversion-webhook`
4. Events to send: `payment_intent.succeeded`
5. Add endpoint
6. Reveal → скопируй `whsec_...`
7. Добавь в Vercel как `STRIPE_WEBHOOK_SECRET_CONVERSION`

## Проверка:

После деплоя:
1. Зайди в Stripe → Webhooks → твой endpoint
2. Send test webhook → `payment_intent.succeeded`
3. Проверь логи в Vercel
4. Должен быть `[WEBHOOK] ✅ Google Ads conversion sent`

