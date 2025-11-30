Как вставить форму Stripe на страницу отчёта:

1) Перед </body> добавь:
   <script src="https://js.stripe.com/v3/"></script>
   <script src="/vin-stripe.js"></script>
   <div id="vin-pay"></div>
   <script>VIN.mount('#vin-pay');</script>

2) Требования к Apple/Google Pay:
   • Домен должен быть HTTPS (Vercel — ок).
   • В Stripe Dashboard включи Wallets → Apple Pay/Google Pay.
   • Для теста используй Stripe test cards/Wallets.

3) Что увидишь:
   • Родной Stripe Payment Element (тема "stripe").
   • Если кошелёк доступен — кнопки Apple Pay / Google Pay внутри элемента.
   • Фолбэк — ввод карты в том же элементе.
