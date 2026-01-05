# Метод: Stripe Webhook → Google Ads конверсия

## Почему это лучше чем GTM dataLayer?

1. **Источник истины**: Webhook = деньги РЕАЛЬНО списались
2. **Нет зависимости от браузера**: Safari, iOS, блокировщики не влияют
3. **Нет проблем с CSP**: Запрос идёт с сервера, а не из браузера
4. **Дедупликация**: Stripe webhook приходит один раз, нет двойных конверсий
5. **Надёжность**: Stripe ретраит webhook если сервер был недоступен

## Как это работает:

```
1. Пользователь → Stripe Checkout
2. Оплата успешна
3. Stripe → webhook POST /api/stripe-webhook
4. Сервер → Google Ads API (с transaction_id + gclid)
5. Google Ads получает конверсию
```

## Что нужно:

1. ✅ Stripe webhook endpoint
2. ✅ Сохранить gclid при создании Stripe session (в metadata)
3. ✅ Google Ads API credentials (или упрощённый gtag endpoint)
4. ✅ Отправить конверсию при payment_intent.succeeded

## Fallback:

Клиентский gtag на success page (если webhook временно недоступен)

