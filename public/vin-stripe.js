(function (global) {
  async function getConfig(){ return (await fetch('/api/stripe-config')).json(); }
  function el(html){ const d=document.createElement('div'); d.innerHTML=html.trim(); return d.firstChild; }

  async function mount(selector){
    const root = typeof selector==='string' ? document.querySelector(selector) : selector;
    if(!root) throw new Error('VIN: container not found');

    const cfg = await getConfig();
    if(!window.Stripe) throw new Error('VIN: Stripe.js not loaded');
    const stripe = Stripe(cfg.publishableKey);

    // 1) Создаём SetupIntent (для Payment Element)
    const si = await fetch('/api/create-setup-intent',{ method:'POST' }).then(r=>r.json());
    if(!si || !si.client_secret) throw new Error('No client_secret from SetupIntent');

    // 2) Создаём Elements с темой Stripe и Payment Element (родной UI с Apple/Google Pay)
    const elements = stripe.elements({ clientSecret: si.client_secret, appearance: { theme: 'stripe' } });
    const paymentElement = elements.create('payment', { layout: 'tabs' });

    // 3) Рендерим
    root.innerHTML = '';
    const form = el(`
      <form id="vin-form" style="max-width:420px;font-family:system-ui,sans-serif">
        <div style="margin:8px 0 12px;color:#475569;font-size:12px">$3 сейчас. $49 на 10-й и $49 на 30-й день. Отмена в любой момент.</div>
        <input id="vin-email" type="email" placeholder="Email для чека" required style="width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:8px;margin:8px 0 12px"/>
        <div id="vin-payment-element" style="margin:8px 0 12px"></div>
        <label style="display:block;margin:10px 0 14px;font-size:14px;color:#111">
          <input type="checkbox" id="vin-consent"/> Соглашаюсь на авто-списание $49 дважды (~$1.60/день) после триала.
        </label>
        <button id="vin-submit" type="submit" style="display:inline-block;padding:10px 16px;border:0;border-radius:8px;background:#111;color:#fff">Оплатить $3 за 10 дней триал</button>
        <div id="vin-msg" style="color:#b00020;margin-top:10px;font-size:14px"></div>
      </form>`);

    root.appendChild(form);
    paymentElement.mount('#vin-payment-element');

    // 4) Сабмит
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('vin-submit');
      const msg = document.getElementById('vin-msg');
      msg.textContent = '';
      if(!document.getElementById('vin-consent').checked){ msg.textContent='Согласие обязательно'; return; }
      btn.disabled = true;
      try{
        // 4.1 Подтверждаем SetupIntent (кошельки/карта внутри Payment Element)
        const email = document.getElementById('vin-email').value;
        const { error, setupIntent } = await stripe.confirmSetup({ elements, clientSecret: si.client_secret, confirmParams: { return_url: cfg.returnUrl } });
        if(error){ throw error; }

        // 4.2 Просим бэкенд взять сохранённый pm и: $3 сейчас + расписание двух $49
        const res = await fetch('/api/checkout-trial-then-two-charges', {
          method:'POST', headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify({ setup_intent_id: setupIntent.id, email })
        }).then(r=>r.json());

        if(res.error){ throw new Error(res.error); }
        // если требуются доп. действия по $3 PI
        if(res.next_action && res.client_secret){
          const piRes = await stripe.confirmCardPayment(res.client_secret, { return_url: cfg.returnUrl });
          if(piRes.error){ throw piRes.error; }
        }
        window.location.href = res.success_url || cfg.returnUrl;
      }catch(err){
        msg.textContent = err && err.message ? err.message : 'Ошибка оплаты';
      }finally{ btn.disabled = false; }
    });
  }

  global.VIN = { mount };
})(window);