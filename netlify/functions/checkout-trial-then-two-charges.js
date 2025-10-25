const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ВНИМАНИЕ: предполагается, что PRICE_49_EVERY_20D указывает на price с interval=day, interval_count=20
exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { setup_intent_id, email } = body || {};
    
    if (!setup_intent_id) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'setup_intent_id is required' })
      };
    }

    const si = await stripe.setupIntents.retrieve(setup_intent_id);
    if (!si || !si.payment_method) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'SetupIntent has no payment_method' })
      };
    }

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
      statement_descriptor: 'VIN UNLIMITED',
      description: 'Trial activation $3'
    });

    // 3) План на два списания $49: t+10 и t+30 (каждые 20 дней, 2 итерации)
    const startAt = Math.floor(Date.now() / 1000) + 10 * 86400;
    const schedule = await stripe.subscriptionSchedules.create({
      customer: customer.id,
      start_date: startAt,
      end_behavior: 'cancel',
      phases: [
        {
          iterations: 2,
          default_payment_method: si.payment_method,
          collection_method: 'charge_automatically',
          proration_behavior: 'none',
          items: [{ price: process.env.PRICE_49_EVERY_20D }]
        }
      ]
    });

    // Если $3 потребовал доп. действия (редко), вернём клиентский secret для confirmCardPayment
    const payload = { success: true, success_url: process.env.RETURN_URL || 'https://vintrusted.com/payment-success' };
    if (pi.status === 'requires_action' || pi.status === 'requires_confirmation') {
      payload.next_action = true;
      payload.client_secret = pi.client_secret;
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: JSON.stringify(payload)
    };
  } catch (e) {
    console.error(e);
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: e.message })
    };
  }
};