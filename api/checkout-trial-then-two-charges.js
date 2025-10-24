import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

export default async function handler(req, res){
  if(req.method !== 'POST') return res.status(405).end();
  const { setup_intent_id, email } = req.body || {};
  if(!setup_intent_id) return res.status(400).json({ error: 'Missing setup_intent_id' });
  
  try{
    const si = await stripe.setupIntents.retrieve(setup_intent_id);
    const pm = si.payment_method; if(!pm) throw new Error('No payment_method in SetupIntent');

    const customer = await stripe.customers.create({
      payment_method: pm,
      email: email || undefined,
      invoice_settings: { default_payment_method: pm },
      metadata: { consent_checked: 'true', plan: '3-now, 49@10d, 49@after-phase1' }
    });

    const returnUrl = process.env.RETURN_URL;
    const trialPi = await stripe.paymentIntents.create({
      amount: 300, currency: 'usd', customer: customer.id, payment_method: pm,
      confirm: true, return_url: returnUrl,
      description: 'VIN report trial ($3 for 10 days)',
      statement_descriptor: 'VIN UNLIMITED', statement_descriptor_suffix: 'TRIAL 3 USD'
    });

    if(trialPi.status === 'requires_action'){
      return res.status(200).json({ next_action: true, client_secret: trialPi.client_secret, return_url: returnUrl });
    }

    const now = Math.floor(Date.now()/1000);
    const t10 = now + 10*24*60*60; // старт расписания через 10 дней

    const schedule = await stripe.subscriptionSchedules.create({
      customer: customer.id,
      start_date: t10,
      end_behavior: 'cancel',
      phases: [
        { iterations: 1, default_payment_method: pm, collection_method: 'charge_automatically', proration_behavior: 'none', items: [{ price: process.env.PRICE_49_RECURRING }] },
        { iterations: 1, default_payment_method: pm, collection_method: 'charge_automatically', proration_behavior: 'none', items: [{ price: process.env.PRICE_49_RECURRING }] }
      ]
    });

    res.status(200).json({ ok: true, schedule_id: schedule.id, success_url: returnUrl });
  }catch(e){
    if(e.raw && e.raw.payment_intent && e.raw.payment_intent.client_secret){
      return res.status(200).json({ next_action: true, client_secret: e.raw.payment_intent.client_secret, return_url: process.env.RETURN_URL });
    }
    res.status(400).json({ error: e.message });
  }
}
