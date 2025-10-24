(function (global) {
  async function cfg(){ return (await fetch('/api/stripe-config')).json(); }
  function h(t){ const d=document.createElement('div'); d.innerHTML=t.trim(); return d.firstChild; }
  async function mount(selector){
    const root = typeof selector==='string'? document.querySelector(selector): selector;
    if(!root) throw new Error('VIN: container not found');
    const c = await cfg();
    const stripe = Stripe(c.publishableKey); const elements = stripe.elements();
    root.innerHTML='';
    const form=h(`<div style="font-family:system-ui,sans-serif;max-width:380px">
        <div style="color:#666;font-size:12px;margin:8px 0 16px">$3 сейчас. $49 на 10-й и 30-й день. Отмена в любой момент.</div>
        <div style="margin:10px 0"><input id="vin-email" type="email" placeholder="Email для чека" style="padding:10px;width:100%;border:1px solid #ddd;border-radius:8px"/></div>
        <div id="vin-card" style="border:1px solid #ddd;padding:12px;border-radius:8px"></div>
        <label style="display:block;margin:10px 0"><input type="checkbox" id="vin-consent"/> Соглашаюсь на авто-списание $49 дважды (~$1.60/день).</label>
        <button id="vin-pay" style="padding:10px 16px;border-radius:8px;border:0;background:#111;color:#fff">Оплатить $3 за 10 дней триал</button>
        <div id="vin-msg" style="color:#b00020;margin-top:8px"></div>
      </div>`);
    root.appendChild(form);
    const card = elements.create('card'); card.mount('#vin-card');
    const si = await fetch('/api/create-setup-intent',{ method:'POST' }).then(r=>r.json());
    const cs = si.client_secret; if(!cs) throw new Error('Нет client_secret');
    document.getElementById('vin-pay').addEventListener('click', async()=>{
      const msg=document.getElementById('vin-msg'); msg.textContent='';
      if(!document.getElementById('vin-consent').checked){ msg.textContent='Согласие обязательно'; return; }
      try{
        const email=document.getElementById('vin-email').value;
        const csi=await stripe.confirmCardSetup(cs,{ payment_method:{ card }, return_url:c.returnUrl });
        if(csi.error) throw csi.error;
        const res=await fetch('/api/checkout-trial-then-two-charges',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ setup_intent_id:csi.setupIntent.id, email }) }).then(r=>r.json());
        if(res.error) throw new Error(res.error);
        if(res.next_action && res.client_secret){ const pi=await stripe.confirmCardPayment(res.client_secret,{ return_url:c.returnUrl }); if(pi.error) throw pi.error; }
        window.location.href = res.success_url || c.returnUrl;
      }catch(e){ msg.textContent = e.message || 'Ошибка оплаты'; }
    });
  }
  global.VIN = { mount };
})(window);