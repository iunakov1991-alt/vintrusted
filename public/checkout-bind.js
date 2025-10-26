(function(){
  const API = '/api/checkout';

  function normalizeVIN(v){ 
    if(!v) return ''; 
    const vin=v.toUpperCase().replace(/[^A-Z0-9]/g,''); 
    if(/[IOQ]/.test(vin)) return ''; 
    return vin.length===17?vin:''; 
  }

  function disableForm(form,on){ 
    const btn=form.querySelector('[type="submit"]'); 
    if(btn){ 
      btn.disabled=!!on; 
      btn.dataset._origText=btn.dataset._origText||btn.textContent; 
      btn.textContent=on?'Processing…':btn.dataset._origText; 
    } 
  }

  async function startCheckout(payload){
    const r=await fetch(API,{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify(payload)
    });
    if(!r.ok) throw new Error(await r.text().catch(()=> 'Checkout error'));
    const j=await r.json(); 
    if(!j.url) throw new Error('No checkout URL');
    
    try{ 
      window.dataLayer=window.dataLayer||[]; 
      window.dataLayer.push({event:'checkout_start'});
    }catch(_){}
    
    window.location.href=j.url;
  }

  function bindVinForm(form){
    form.addEventListener('submit',async e=>{
      e.preventDefault();
      const vinEl=form.querySelector('[data-vin]');
      const vin=normalizeVIN(vinEl?vinEl.value:'');
      if(!vin){ 
        vinEl&&vinEl.focus(); 
        alert('Введите корректный VIN: 17 символов, без I,O,Q'); 
        return; 
      }
      try{ 
        disableForm(form,true); 
        await startCheckout({vin}); 
      }catch(err){ 
        console.error(err); 
        alert('Ошибка оплаты'); 
      }finally{ 
        disableForm(form,false); 
      }
    });
  }

  function bindPlateForm(form){
    form.addEventListener('submit',async e=>{
      e.preventDefault();
      const p=form.querySelector('[data-plate]'); 
      const s=form.querySelector('[data-state]');
      const plate=(p&&p.value||'').trim().toUpperCase().replace(/\s+/g,''); 
      const state=(s&&s.value||'').trim().toUpperCase();
      if(!plate||!state||state.length!==2){ 
        (plate?s:s||p)?.focus(); 
        alert('Укажите номер и штат (2 буквы, напр. CA)'); 
        return; 
      }
      try{ 
        disableForm(form,true); 
        await startCheckout({plate,state}); 
      }catch(err){ 
        console.error(err); 
        alert('Ошибка оплаты'); 
      }finally{ 
        disableForm(form,false); 
      }
    });
  }

  document.addEventListener('DOMContentLoaded',()=>{
    document.querySelectorAll('form:has([data-vin])').forEach(bindVinForm);
    document.querySelectorAll('form:has([data-plate])').forEach(bindPlateForm);
  });
})();

