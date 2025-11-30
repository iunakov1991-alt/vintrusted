Встраивание виджета оплаты в твою текущую страницу отчёта

1) Убедись, что бэкенд запущен и Stripe CLI проксирует вебхуки:
   - npm i && npm run dev
   - stripe listen --forward-to localhost:3000/webhook

2) На странице отчёта вставь ПЕРЕД закрывающим </body>:
   <script src="https://js.stripe.com/v3/"></script>
   <script src="https://YOURDOMAIN.com/pay-assets/vin-stripe.js"></script>
   <div id="vin-pay"></div>
   <script>
     // если фронт и бэкенд на одном домене, apiBase='/api' и host не нужен
     VIN.mount('#vin-pay', { apiBase: '/api' });
     // если бэкенд на другом домене/порту, например локально:
     // VIN.mount('#vin-pay', { apiBase: '/api', host: 'http://localhost:3000' });
   </script>

3) Корень твоего основного сайта не трогаем — Node-сервер отдаёт только /api/*, /webhook и /pay-assets/*.

4) Переменные окружения (.env):
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   PRICE_49_RECURRING=price_...
   RETURN_URL=https://YOURDOMAIN.com/payment-success
   CANCEL_URL=https://YOURDOMAIN.com/payment-cancel

5) Что получится:
   - По корню домена остаётся твой сайт.
   - На странице отчёта появляется аккуратная форма оплаты.
   - $3 сейчас + расписание: $49 через 10 дней и ещё $49 после 1-й фазы.
   - После второго $49 подписка аннулируется автоматически.
