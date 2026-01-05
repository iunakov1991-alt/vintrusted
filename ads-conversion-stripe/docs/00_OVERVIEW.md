# Google Ads конверсии для Stripe: лучший метод

Цель: чтобы Google Ads стабильно видел покупки/оплаты, даже на iOS/Safari, при редиректах Stripe, SPA и Consent.

Лучший метод:
1) Серверная конверсия по факту оплаты: Stripe webhook `payment_intent.succeeded` -> Google Ads (через Measurement Protocol / Ads endpoint).
2) Резервный клиентский сигнал: `gtag('event','conversion', ...)` на success-странице.
3) Дедупликация по `transaction_id` (одинаковый ID в сервере и клиенте).

Почему это нужно:
- URL-based "thank you page view" — слабый сигнал, часто игнорируется Ads.
- Серверный webhook — единственный источник истины (деньги реально списались).
- Клиентский сигнал помогает обучению и ловит случаи, когда серверная часть временно недоступна.
