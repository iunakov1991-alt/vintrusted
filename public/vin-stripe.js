(function (global) {
  async function cfg(){ return (await fetch('/api/stripe-config')).json(); }
  function el(html){ const d=document.createElement('div'); d.innerHTML=html.trim(); return d.firstChild; }
  function getParam(name){ const v=new URLSearchParams(location.search).get(name)||''; return v.trim(); }
  function sanitizeVIN(v){ 
    if (!v) return ''; 
    v = v.toString().toUpperCase().replace(/[^A-Z0-9]/g,''); 
    if(!/^[A-HJ-NPR-Z0-9]{17}$/.test(v)) return ''; 
    return v; 
  }

  async function mount(selector){
    const root = typeof selector==='string'? document.querySelector(selector): selector; if(!root) throw new Error('VIN: container not found');
    // безопасно подставим VIN (если нужно где-то показать)
    const rawVin = getParam('vin'); const safeVin = sanitizeVIN(rawVin);
    if(safeVin && root.dataset.fillVinTarget){ const t = document.querySelector(root.dataset.fillVinTarget); if(t) t.value = safeVin; }

    const c = await cfg(); if(!window.Stripe) throw new Error('Stripe.js not loaded');
    const stripe = Stripe(c.publishableKey);

    // 1) SetupIntent под Payment Element
    const si = await fetch('/api/create-setup-intent',{ method:'POST' }).then(r=>r.json());
    if(!si || !si.client_secret) throw new Error('Нет client_secret');

    // 2) Elements + Payment Element (родной UI, Apple/Google Pay внутри)
    const elements = stripe.elements({ clientSecret: si.client_secret, appearance: { theme: 'stripe' } });
    const payment = elements.create('payment', { layout:'tabs' });

    // 3) Рендер
    root.innerHTML='';
    const form = el(`<form id="vin-form" style="font-family:system-ui,sans-serif">
       <div style="color:#475569;font-size:12px;margin-bottom:10px">$3 сейчас. $49 на 10-й и $49 на 30-й день. Отмена в любой момент.</div>
       <input id="vin-email" type="email" placeholder="Email для чека" required style="width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:8px;margin:6px 0 12px"/>
       <div id="vin-payment" class="stripe-card"></div>
       <label style="display:block;margin:8px 0 12px"><input type="checkbox" id="vin-consent"/> Соглашаюсь на авто-списание $49 дважды (~$1.60/день) после триала.</label>
       <button id="vin-submit" type="submit" style="padding:10px 16px;border-radius:8px;border:0;background:#111;color:#fff">Оплатить $3 за 10 дней триал</button>
       <div id="vin-msg" style="color:#b00020;margin-top:8px"></div>
    </form>`);
    root.appendChild(form);
    payment.mount('#vin-payment');

    // 4) Сабмит
    form.addEventListener('submit', async (e)=>{
      e.preventDefault(); const btn=document.getElementById('vin-submit'); const msg=document.getElementById('vin-msg'); msg.textContent='';
      if(!document.getElementById('vin-consent').checked){ msg.textContent='Согласие обязательно'; return; }
      btn.disabled=true;
      try{
        const email = document.getElementById('vin-email').value;
        const { error, setupIntent } = await stripe.confirmSetup({ elements, clientSecret: si.client_secret, confirmParams:{ return_url: c.returnUrl } });
        if(error) throw error;
        const res = await fetch('/api/checkout-trial-then-two-charges',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ setup_intent_id: setupIntent.id, email }) }).then(r=>r.json());
        if(res.error) throw new Error(res.error);
        if(res.next_action && res.client_secret){ const pi = await stripe.confirmCardPayment(res.client_secret,{ return_url:c.returnUrl }); if(pi.error) throw pi.error; }
        location.href = res.success_url || c.returnUrl;
      }catch(e){ msg.textContent = e.message || 'Ошибка оплаты'; }
      finally{ btn.disabled=false; }
    });
  }

  global.VIN = { mount };
})(window);