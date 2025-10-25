(function (global) {
  function h(s){const d=document.createElement('div');d.innerHTML=s.trim();return d.firstChild}
  async function cfg(){const r=await fetch('/api/stripe-config');if(!r.ok)throw new Error('stripe-config failed');return r.json()}
  async function createSI(){const r=await fetch('/api/create-setup-intent',{method:'POST'});if(!r.ok)throw new Error('create-setup-intent failed');return r.json()}

  async function mount(sel){
    const root=typeof sel==='string'?document.querySelector(sel):sel; if(!root) throw new Error('VIN: container not found');

    root.innerHTML='';
    const form=h(`
      <form id="vin-form" style="max-width:520px;margin:0 auto;font-family:ui-rounded, \"SF Pro Rounded\", system-ui, -apple-system, Segoe UI, Roboto, sans-serif">
        <div style="margin-bottom:14px;text-align:center">
          <div style="font-weight:800;font-size:28px;line-height:1.1;margin-bottom:6px">Get Full Report</div>
          <div style="font-size:13px;color:#475569">Complete vehicle history with detailed information</div>
        </div>
        <div id="vin-payment-element" style="margin:8px 0 14px;min-height:64px"></div>
        <button id="vin-submit" type="submit" style="width:100%;padding:12px 16px;border-radius:12px;border:0;background:#111827;color:#fff;font-weight:700">Pay $3 to Continue</button>
        <div id="vin-msg" role="alert" style="min-height:18px;color:#b00020;margin-top:10px"></div>
      </form>
    `);
    root.appendChild(form);

    const { publishableKey, returnUrl } = await cfg();
    if(!window.Stripe) throw new Error('Stripe.js not loaded');
    const stripe = Stripe(publishableKey);

    const si = await createSI();
    if(!si || !si.client_secret) throw new Error('No client_secret from SetupIntent');

    const appearance = {
      theme: 'stripe',
      variables: {
        fontFamily: 'ui-rounded, \"SF Pro Rounded\", system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        colorText: '#111827',
        colorBackground: '#ffffff',
        borderRadius: '12px',
        spacingUnit: '6px'
      },
      rules: {
        '.Input': { border: '1px solid #e5e7eb', padding: '10px', borderRadius: '12px' },
        '.Tab':   { borderRadius: '12px' }
      }
    };

    const elements = stripe.elements({
      clientSecret: si.client_secret,
      appearance,
      paymentMethodOrder: ['apple_pay','google_pay','card']
    });

    const paymentEl = elements.create('payment', { layout: 'tabs' });
    paymentEl.mount('#vin-payment-element');

    const btn = document.getElementById('vin-submit');
    const msg = document.getElementById('vin-msg');

    form.addEventListener('submit', async (e)=>{
      e.preventDefault(); msg.textContent='';
      try{
        btn.disabled=true; btn.textContent='Processing…';
        const { error, setupIntent } = await stripe.confirmSetup({
          elements,
          clientSecret: si.client_secret,
          confirmParams: { return_url: returnUrl }
        });
        if(error) throw error;

        const r = await fetch('/api/checkout-trial-then-two-charges',{
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ setup_intent_id: setupIntent.id })
        }).then(r=>r.json());

        if(r.error) throw new Error(r.error);
        if(r.next_action && r.client_secret){
          const pi = await stripe.confirmCardPayment(r.client_secret,{ return_url: returnUrl });
          if(pi.error) throw pi.error;
        }
        location.href = r.success_url || returnUrl;
      }catch(err){
        console.error(err);
        msg.textContent = (err && err.message) ? err.message : 'Payment error';
      }finally{
        btn.disabled=false; btn.textContent='Pay $3 to Continue';
      }
    });
  }

  global.VIN = { mount };
})(window);