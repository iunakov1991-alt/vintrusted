import Stripe from 'stripe';

export const config = { api: { bodyParser: false } }; // raw body
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

function buf(req){ 
  return new Promise((resolve)=>{ 
    const chunks=[]; 
    req.on('data',c=>chunks.push(c)); 
    req.on('end',()=>resolve(Buffer.concat(chunks))); 
  }); 
}

export default async function handler(req, res){
  if(req.method !== 'POST') return res.status(405).end();
  const sig = req.headers['stripe-signature'];
  let event;
  try{
    const raw = await buf(req);
    event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET);
  }catch(e){ return res.status(400).send(`Webhook error: ${e.message}`); }

  try{
    if(event.type === 'invoice.payment_succeeded'){
      const invoice = event.data.object;
      if(invoice.billing_reason === 'subscription_cycle' && invoice.subscription && invoice.paid){
        const sub = await stripe.subscriptions.retrieve(invoice.subscription);
        const count = (parseInt(sub.metadata.cycles_paid || '0', 10) || 0) + 1;
        await stripe.subscriptions.update(sub.id, { metadata: { ...sub.metadata, cycles_paid: String(count) } });
        if(count >= 2){
          if(sub.schedule){ try{ await stripe.subscriptionSchedules.cancel(sub.schedule); }catch(_){} }
          await stripe.subscriptions.cancel(sub.id, { invoice_now: false, prorate: false });
        }
      }
    }
    return res.status(200).json({ received: true });
  }catch(e){ return res.status(400).send(`Webhook handler error: ${e.message}`); }
}
