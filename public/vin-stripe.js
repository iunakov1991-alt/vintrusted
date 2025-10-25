(function (global) {
  function h(html){ const d=document.createElement('div'); d.innerHTML=html.trim(); return d.firstChild; }
  async function getCfg(){ const r=await fetch('/api/stripe-config'); if(!r.ok) throw new Error('stripe-config failed'); return r.json(); }
  async function createSetupIntent(){ const r=await fetch('/api/create-setup-intent',{method:'POST'}); if(!r.ok) throw new Error('create-setup-intent failed'); return r.json(); }

  async function mount(container){
    const root = typeof container==='string' ? document.querySelector(container) : container;
    if(!root) throw new Error('VIN: container not found');

    // каркас
    root.innerHTML = '';
    const form = h(`
      <form id="vin-form" style="max-width:460px;margin:0 auto;font-family:system-ui">
        <div style="color:#475569;font-size:12px;margin:6px 0 12px">$3 сейчас. Затем $49 на 10-й и $49 на 30-й день. Отмена в любой момент.</div>
        <input id="vin-email" type="email" placeholder="Email для чека" required style="width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:10px;margin:6px 0 12px"/>
        <div id="vin-payment-element" style="margin:8px 0 14px;min-height:64px"></div>
        <label style="display:block;margin:8px 0 12px"><input id="vin-consent" type="checkbox"/> Соглашаюсь на два автосписания $49 (~$1.60/день) после триала</label>
        <button id="vin-submit" type="submit" style="padding:10px 16px;border-radius:10px;border:0;background:#111;color:#fff">Оплатить $3 за 10 дней триал</button>
        <div id="vin-msg" style="color:#b00020;margin-top:10px"></div>
      </form>
    `);
    root.appendChild(form);

    // конфиг + SetupIntent
    const cfg = await getCfg();
    if (!window.Stripe) throw new Error('Stripe.js not loaded');
    const stripe = Stripe(cfg.publishableKey);

    const si = await createSetupIntent();
    if (!si || !si.client_secret) throw new Error('No client_secret from SetupIntent');

    const elements = stripe.elements({ clientSecret: si.client_secret, appearance: { theme: 'stripe' } });
    const paymentEl = elements.create('payment', { layout: 'tabs' });
    paymentEl.mount('#vin-payment-element');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('vin-submit');
      const msg = document.getElementById('vin-msg');
      msg.textContent = '';
      if (!document.getElementById('vin-consent').checked) { msg.textContent = 'Согласие обязательно'; return; }
      btn.disabled = true;
      try {
        const email = document.getElementById('vin-email').value;
        const { error, setupIntent } = await stripe.confirmSetup({ elements, clientSecret: si.client_secret, confirmParams: { return_url: cfg.returnUrl } });
        if (error) throw error;

        const res = await fetch('/api/checkout-trial-then-two-charges', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ setup_intent_id: setupIntent.id, email })
        }).then(r=>r.json());

        if (res.error) throw new Error(res.error);
        if (res.next_action && res.client_secret) {
          const piRes = await stripe.confirmCardPayment(res.client_secret, { return_url: cfg.returnUrl });
          if (piRes.error) throw piRes.error;
        }
        location.href = res.success_url || cfg.returnUrl;
      } catch (e) {
        msg.textContent = e.message || 'Ошибка оплаты';
      } finally {
        btn.disabled = false;
      }
    });
  }

  global.VIN = { mount };
})(window);