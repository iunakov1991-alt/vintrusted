const { stripe } = require('./_lib/stripe');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { vin, plate, state } = req.body;
    const normVIN = (vin || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (!normVIN && !(plate && state)) {
      return res.status(400).json({ error: 'VIN or Plate+State required' });
    }

    // ВАЖНО: mode=payment + setup_future_usage + customer_creation
    // Это сохраняет карту БЕЗ SetupIntent → фикс 400
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_creation: 'always',  // ← гарантируем customer
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: 299,  // $2.99
          product_data: { name: 'VIN Report (instant)' }
        },
        quantity: 1
      }],
      payment_intent_data: { 
        setup_future_usage: 'off_session'  // ← Сохраняем карту БЕЗ SetupIntent
      },
      success_url: `${process.env.APP_URL || 'https://vintrusted.com'}/success.html?cs={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL || 'https://vintrusted.com'}/`,
      metadata: { 
        vin: normVIN, 
        plate: plate || '', 
        state: state || '' 
      }
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return res.status(500).json({ error: error.message });
  }
};

