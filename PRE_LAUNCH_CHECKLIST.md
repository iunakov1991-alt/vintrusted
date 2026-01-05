# 🚀 PRE-LAUNCH CHECKLIST - VinTrusted.com

## ✅ CRITICAL ENVIRONMENT VARIABLES (Vercel)

Проверь что все эти переменные установлены в Vercel Dashboard:

### 1. Stripe
- [ ] `STRIPE_SECRET_KEY` - Stripe Secret Key (live mode)
- [ ] `STRIPE_PUBLISHABLE_KEY` - Stripe Publishable Key (live mode)
- [ ] `STRIPE_WEBHOOK_SECRET_CONVERSION` - Webhook secret для `/api/stripe-conversion-webhook`
- [ ] `PRICE_49_EVERY_10D` - Price ID для подписки $49/10 дней

### 2. Google Ads
- [ ] `GOOGLE_ADS_CONVERSION_ID` - Conversion ID (формат: AW-XXXXXXXXXX)
- [ ] `GOOGLE_ADS_CONVERSION_LABEL` - Conversion Label (получен в Google Ads UI)

### 3. ClearVin API
- [ ] `CLEARVIN_EMAIL` - Email для доступа к ClearVin API
- [ ] `CLEARVIN_PASSWORD` - Password для ClearVin API

### 4. Опциональные (для логирования)
- [ ] `KV_REST_API_URL` - Upstash KV URL (если используешь)
- [ ] `KV_REST_API_TOKEN` - Upstash KV Token (если используешь)

---

## ✅ GOOGLE ADS SETUP

### 1. Auto-tagging включен
- Зайди в Google Ads → Settings → Account settings
- Убедись что "Auto-tagging" = ON

### 2. Conversion Action создана
- Google Ads → Tools → Conversions
- Должна быть конверсия "Purchase" с правильным Conversion ID и Label

---

## ✅ STRIPE WEBHOOK SETUP

1. **Webhook endpoint:** `https://vintrusted.com/api/stripe-conversion-webhook`
2. **Event to listen:** `payment_intent.succeeded`
3. **Webhook signing secret:** сохранен в `STRIPE_WEBHOOK_SECRET_CONVERSION`

---

## ✅ TESTED FLOW

### 1. gclid Flow ✅
- [x] URL с `?gclid=xxx` → сохраняется в cookie
- [x] Cookie `gclid` → передается в `/api/create-setup-intent`
- [x] SetupIntent metadata → копируется в PaymentIntent
- [x] PaymentIntent metadata → отправляется в webhook

### 2. Conversion Tracking ✅
- [x] Stripe webhook ловит `payment_intent.succeeded`
- [x] Webhook извлекает `gclid` из metadata
- [x] Webhook отправляет конверсию в Google Ads (200 OK)
- [x] Deduplication работает через `transaction_id`

### 3. Payment & Report Flow ✅
- [x] Оплата $3 → редирект на `purchase-confirmation.html`
- [x] После 10 секунд → редирект на `success.html?vin=xxx`
- [x] `success.html` загружает отчет из `/api/get-clearvin-report`
- [x] ClearVin API работает с токен кешированием
- [x] Отчет отображается в iframe с правильным sandbox

### 4. CSP Headers ✅
- [x] ClearVin domains добавлены в CSP
- [x] `base-uri` разрешен для `www.clearvin.com`
- [x] Все JS/CSS/fonts загружаются без ошибок

### 5. Mobile Version ✅
- [x] Responsive design работает
- [x] Форма оплаты адаптивная
- [x] Отчет отображается на мобильных

---

## ⚠️ ВАЖНО ПЕРЕД ЗАПУСКОМ

### 1. Проверь Stripe в Live Mode
```bash
# В Vercel Dashboard → Settings → Environment Variables
# Убедись что используются LIVE keys, а не test keys!
```

### 2. Проверь Google Ads Conversion ID
```bash
# Формат: AW-XXXXXXXXXX
# Проверь что это PRODUCTION conversion, а не test!
```

### 3. Сделай тестовую покупку с реальным gclid
```bash
# 1. Создай тестовую кампанию в Google Ads
# 2. Кликни по объявлению → получи реальный gclid
# 3. Оплати $3 на сайте
# 4. Проверь через 24-48 часов что конверсия появилась в Google Ads
```

---

## 🔥 KNOWN ISSUES (НЕ КРИТИЧНО)

1. **Upstash KV logging timeout** - не критично, конверсии всё равно отправляются
2. **CSP warnings для Google Ads domains** - можно игнорировать, не блокирует функциональность
3. **Error verifying payment** - исправлено, но может появиться если SetupIntent не имеет customer

---

## 📊 МОНИТОРИНГ ПОСЛЕ ЗАПУСКА

### 1. Vercel Logs
```
https://vercel.com/dashboard → vintrusted → Logs
```
Фильтры:
- `/api/stripe-conversion-webhook` - проверяй что конверсии отправляются
- `/api/get-clearvin-report` - проверяй что отчеты загружаются

### 2. Stripe Dashboard
```
https://dashboard.stripe.com/events
```
Проверяй:
- `payment_intent.succeeded` имеет metadata с gclid
- Webhook delivery = 200 OK

### 3. Google Ads Dashboard
```
Google Ads → Tools → Conversions
```
Проверяй (через 24-48 часов):
- Конверсии появляются
- Attribution правильная

---

## 🎯 READY TO LAUNCH!

Если все чекбоксы выше отмечены ✅ - можешь запускать трафик!

**Google Ads конверсии будут отстукивать через server-side webhook с deduplic ation!** 🚀

