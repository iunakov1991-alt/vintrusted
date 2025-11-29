import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ВНИМАНИЕ: предполагается, что PRICE_49_EVERY_10D указывает на price с interval=day, interval_count=10
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  console.log('Checkout request:', req.body);
  
  try {
    const { setup_intent_id, email, vin } = req.body || {};
    if (!setup_intent_id) throw new Error('setup_intent_id is required');

    console.log('Retrieving SetupIntent:', setup_intent_id);
    const si = await stripe.setupIntents.retrieve(setup_intent_id);
    if (!si || !si.payment_method) throw new Error('SetupIntent has no payment_method');
    console.log('SetupIntent OK, payment_method:', si.payment_method);

    // 1) Customer с привязанным PM
    const customer = await stripe.customers.create({
      email: email || undefined,
      payment_method: si.payment_method,
      invoice_settings: { default_payment_method: si.payment_method }
    });

    // 2) Снимаем $3 сразу
    const pi = await stripe.paymentIntents.create({
      amount: 300,
      currency: 'usd',
      customer: customer.id,
      payment_method: si.payment_method,
      confirm: true,
      off_session: true,
      statement_descriptor_suffix: 'VIN Report',
      description: 'Trial activation $3'
    });

    // 3) План на три списания $49: t+10, t+20, t+30 (каждые 10 дней, 3 итерации)
    const priceId = (process.env.PRICE_49_EVERY_10D || process.env.STRIPE_PRICE_49_MONTHLY || process.env.PRICE_49_RECURRING)?.trim();
    
    if (!priceId || priceId === '') {
      console.error('Price ID environment variables:', {
        PRICE_49_EVERY_10D: process.env.PRICE_49_EVERY_10D,
        STRIPE_PRICE_49_MONTHLY: process.env.STRIPE_PRICE_49_MONTHLY,
        PRICE_49_RECURRING: process.env.PRICE_49_RECURRING
      });
      throw new Error('PRICE_49_EVERY_10D environment variable is not set or empty. Please configure Stripe price ID.');
    }

    const startAt = Math.floor(Date.now() / 1000) + 10 * 86400;
    const schedule = await stripe.subscriptionSchedules.create({
      customer: customer.id,
      start_date: startAt,
      end_behavior: 'cancel',
      phases: [
        {
          iterations: 3,
          default_payment_method: si.payment_method,
          collection_method: 'charge_automatically',
          proration_behavior: 'none',
          items: [{ price: priceId }]
        }
      ]
    });

    // Get VIN from request body, SetupIntent metadata, or customer metadata
    let finalVin = vin || si.metadata?.vin || '';
    
    // If we have a customer, try to get VIN from customer metadata
    if (!finalVin && customer) {
      finalVin = customer.metadata?.vin || '';
    }
    
    // Build success URL with VIN
    const baseUrl = process.env.APP_URL || process.env.RETURN_URL?.replace('/success.html', '').replace('/payment-success', '') || 'https://vintrusted.com';
    let successUrl = `${baseUrl}/success.html`;
    
    const params = new URLSearchParams();
    if (finalVin) {
      params.append('vin', finalVin);
    }
    if (si.id) {
      params.append('setup_intent', si.id);
    }
    
    if (params.toString()) {
      successUrl += '?' + params.toString();
    }
    
    // Если $3 потребовал доп. действия (редко), вернём клиентский secret для confirmCardPayment
    const payload = { success: true, success_url: successUrl };
    if (pi.status === 'requires_action' || pi.status === 'requires_confirmation') {
      payload.next_action = true;
      payload.client_secret = pi.client_secret;
    }

    console.log('Checkout success!');
    res.status(200).json(payload);
  } catch (e) {
    console.error('Checkout error:', e.message, e.type, e.code);
    res.status(400).json({ error: e.message, type: e.type, code: e.code });
  }
}