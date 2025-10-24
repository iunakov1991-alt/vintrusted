/* vin-stripe.js — встраиваемый виджет оплаты. Подключается на твоей странице отчёта. */
(function (global) {
  async function loadConfig(base) {
    const r = await fetch(base + '/stripe-config');
    return r.json();
  }
  function el(html) { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }

  async function mount(selector, opts) {
    const apiBase = (opts && opts.apiBase) || '/api';
    const host = (opts && opts.host) || '';
    const root = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!root) throw new Error('VIN: container not found');

    const cfg = await loadConfig(host + apiBase);
    if (!window.Stripe) throw new Error('VIN: Stripe.js not loaded');
    const stripe = Stripe(cfg.publishableKey);
    const elements = stripe.elements();

    root.innerHTML = '';
    const form = el(`
      <div class="vin-wrapper" style="font-family:system-ui,sans-serif;max-width:380px">
        <div style="color:#666;font-size:12px;margin:8px 0 16px">$3 сейчас. Автосписания $49 на 10-й и 30-й день. Отмена в любой момент.</div>
        <div style="margin:10px 0"><input id="vin-email" type="email" placeholder="Email для чека" style="padding:10px;width:100%;border:1px solid #ddd;border-radius:8px"/></div>
        <div id="vin-card" style="border:1px solid #ddd;padding:12px;border-radius:8px"></div>
        <label style="display:block;margin:10px 0"><input type="checkbox" id="vin-consent"/> Соглашаюсь на авто-списание $49 дважды (~$1.60/день).</label>
        <button id="vin-pay" style="padding:10px 16px;border-radius:8px;border:0;background:#111;color:#fff">Оплатить $3 за 10 дней триал</button>
        <div id="vin-msg" style="color:#b00020;margin-top:8px"></div>
      </div>`);
    root.appendChild(form);

    const card = elements.create('card');
    card.mount('#vin-card');

    // создаём SetupIntent
    const si = await fetch(host + apiBase + '/create-setup-intent', { method: 'POST' }).then(r => r.json());
    const setupClientSecret = si.client_secret;

    document.getElementById('vin-pay').addEventListener('click', async () => {
      const msg = document.getElementById('vin-msg');
      msg.textContent = '';
      if (!document.getElementById('vin-consent').checked) { msg.textContent = 'Согласие обязательно'; return; }
      try {
        const email = document.getElementById('vin-email').value;
        const csi = await stripe.confirmCardSetup(setupClientSecret, { payment_method: { card }, return_url: cfg.returnUrl });
        if (csi.error) throw csi.error;
        const res = await fetch(host + apiBase + '/checkout-trial-then-two-charges', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ setup_intent_id: csi.setupIntent.id, email })
        }).then(r => r.json());
        if (res.error) throw new Error(res.error);
        if (res.next_action && res.client_secret) {
          const piRes = await stripe.confirmCardPayment(res.client_secret, { return_url: cfg.returnUrl });
          if (piRes.error) throw piRes.error;
        }
        window.location.href = res.success_url || cfg.returnUrl;
      } catch (e) { msg.textContent = e.message || 'Ошибка оплаты'; }
    });
  }

  global.VIN = { mount };
})(window);
