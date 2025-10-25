Как вставить Stripe Payment Element на страницу отчёта:

1) Убедись, что в <head> подключены:
   <link rel="stylesheet" href="/css/stripe-fixes.css">
   <script src="https://js.stripe.com/v3/"></script>
   <script defer src="/vin-stripe.js"></script>

2) В нужном месте страницы добавь контейнер:
   <div id="vin-pay"></div>
   Инициализация: <script>VIN.mount('#vin-pay');</script>

3) Apple/Google Pay:
   - Включи в Stripe Dashboard → Payments → Wallets.
   - Для Apple Pay: добавь и проверь домен vintrusted.com.
   - Тест: Safari (Apple Pay), Chrome (Google Pay) на устройстве с добавленной картой.

4) env (Vercel → Settings → Environment Variables):
   STRIPE_PUBLISHABLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, RETURN_URL, CANCEL_URL, PRICE_49_EVERY_20D.
   После изменения env — Redeploy с очисткой кэша.
