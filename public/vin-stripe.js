(function (global) {
  function h(s){const d=document.createElement('div');d.innerHTML=s.trim();return d.firstChild}
  function log(msg){const box=document.getElementById('vin-log'); if(box){ const p=document.createElement('div'); p.textContent=msg; box.appendChild(p); }}

  async function getCfg(){
    const r = await fetch('/api/stripe-config');
    if(!r.ok){ throw new Error('stripe-config HTTP '+r.status); }
    const j = await r.json();
    if(!j.publishableKey) throw new Error('publishableKey missing');
    return j;
  }
  async function createSI(){
    const r = await fetch('/api/create-setup-intent',{method:'POST'});
    if(!r.ok){ throw new Error('create-setup-intent HTTP '+r.status); }
    const j = await r.json();
    if(!j.client_secret) throw new Error('SetupIntent client_secret missing');
    return j;
  }

  async function mount(sel){
    const root=typeof sel==='string'?document.querySelector(sel):sel; if(!root) throw new Error('VIN: container not found');
    root.innerHTML='';
    const form=h(`
      <form id="vin-form" style="max-width:520px;margin:0 auto;font-family:ui-rounded, \"SF Pro Rounded\", system-ui, -apple-system, Segoe UI, Roboto, sans-serif">
        <div style="margin-bottom:14px;text-align:center">
          <div style="font-weight:800;font-size:28px;line-height:1.1;margin-bottom:6px">Get Full Report</div>
          <div style="font-size:13px;color:#475569">Complete vehicle history with detailed information</div>
        </div>
        <div id="vin-payment-element" style="margin:8px 0 14px;min-height:350px"></div>
        <button id="vin-submit" type="submit" style="width:100%;padding:12px 16px;border-radius:12px;border:0;background:#111827;color:#fff;font-weight:700">Pay $3 to Continue</button>
        <div id="vin-msg" role="alert" style="min-height:18px;color:#b00020;margin-top:10px"></div>
        <div id="vin-log" style="margin-top:10px;font-size:12px;color:#475569"></div>
      </form>
    `);
    root.appendChild(form);

    const msg = document.getElementById('vin-msg');
    const btn = document.getElementById('vin-submit');

    try{
      log('fetch /api/stripe-config …');
      const { publishableKey, returnUrl } = await getCfg();
      if(!window.Stripe) throw new Error('Stripe.js not loaded');
      const stripe = Stripe(publishableKey);

      log('create SetupIntent …');
      const si = await createSI();
      log('SetupIntent ok: '+si.id);

      const appearance = {
        theme: 'stripe',
        variables: {
          fontFamily: 'ui-rounded, \"SF Pro Rounded\", system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          colorText: '#111827',
          colorBackground: '#ffffff',
          borderRadius: '12px',
          spacingUnit: '6px'
        }
      };
      const elements = stripe.elements({ clientSecret: si.client_secret, appearance });
      const paymentEl = elements.create('payment');
      paymentEl.mount('#vin-payment-element');
      log('Payment Element mounted');

      document.getElementById('vin-form').addEventListener('submit', async (e)=>{
        e.preventDefault(); msg.textContent=''; btn.disabled=true; const old=btn.textContent; btn.textContent='Processing…';
        try{
          log('elements.submit() …');
          const { error: submitError } = await elements.submit();
          if(submitError){ log('elements.submit error: '+submitError.message); throw submitError; }
          
          log('confirmSetup …');
          const { error, setupIntent } = await stripe.confirmSetup({ 
            elements, 
            clientSecret: si.client_secret, 
            redirect: 'if_required',
            confirmParams: { 
              return_url: returnUrl 
            } 
          });
          if(error){ log('confirmSetup error: '+error.message); throw error; }
          log('confirmSetup ok: '+setupIntent.id+' status='+setupIntent.status);

          log('POST /api/checkout-trial-then-two-charges …');
          log('Sending setup_intent_id: '+setupIntent.id);
          const r = await fetch('/api/checkout-trial-then-two-charges',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ setup_intent_id: setupIntent.id }) });
          if(!r.ok){ 
            const errData = await r.json().catch(()=>({}));
            log('checkout error: HTTP '+r.status+' - '+JSON.stringify(errData));
            throw new Error('checkout HTTP '+r.status+': '+(errData.error || 'Unknown error')); 
          }
          const data = await r.json();
          if(data.error){ log('backend error: '+data.error); throw new Error(data.error); }

          if(data.next_action && data.client_secret){
            log('confirmCardPayment (next_action) …');
            const piRes = await stripe.confirmCardPayment(data.client_secret,{ return_url: returnUrl });
            if(piRes.error){ log('confirmCardPayment error: '+piRes.error.message); throw piRes.error; }
          }
          log('redirect to success');
          location.href = data.success_url || returnUrl;
        }catch(e){
          console.error(e); msg.textContent = e && e.message ? e.message : 'Payment error';
        }finally{ btn.disabled=false; btn.textContent=old; }
      });
    }catch(e){ console.error(e); msg.textContent = e.message || 'Init error'; }
  }

  global.VIN = { mount };
})(window);