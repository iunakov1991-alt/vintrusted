const express = require('express');
const path = require('path');
const Stripe = require('stripe');

const app = express();
const stripe = new Stripe('sk_test_YOUR_SECRET_KEY_HERE', { apiVersion: '2024-06-20' });
const PORT = 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));

// Stripe config endpoint
app.get('/stripe-config', (req, res) => {
  res.json({ publishableKey: 'pk_test_YOUR_PUBLISHABLE_KEY_HERE' });
});

// SetupIntent endpoint
app.post('/create-setup-intent', async (req, res) => {
  try {
    const setupIntent = await stripe.setupIntents.create({ usage: 'off_session' });
    res.json({ client_secret: setupIntent.client_secret });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Main checkout endpoint
app.post('/checkout-trial-then-two-charges', async (req, res) => {
  const { setup_intent_id, consent, email } = req.body;
  if (!setup_intent_id || !consent) return res.status(400).json({ error: 'Missing setup_intent_id or consent' });

  try {
    const si = await stripe.setupIntents.retrieve(setup_intent_id);
    const paymentMethodId = si.payment_method;
    if (!paymentMethodId) throw new Error('No payment_method in SetupIntent');

    const customer = await stripe.customers.create({
      payment_method: paymentMethodId,
      email: email || undefined,
      invoice_settings: { default_payment_method: paymentMethodId },
      metadata: {
        consent_checked: 'true',
        consent_text: 'VIN Unlimited: $3 now; $49 at day 10; $49 at day 30; cancel anytime',
        consent_ts: String(Math.floor(Date.now() / 1000)),
      },
    });

    // $3 сейчас
    const trialPi = await stripe.paymentIntents.create({
      amount: 300,
      currency: 'usd',
      customer: customer.id,
      payment_method: paymentMethodId,
      confirm: true,
      off_session: false,
      description: 'VIN report trial ($3 for 10 days)',
      metadata: { phase: 'trial_fee' },
      statement_descriptor: 'VIN UNLIMITED',
      statement_descriptor_suffix: 'TRIAL 3 USD',
    });

    if (trialPi.status === 'requires_action' && trialPi.next_action) {
      return res.json({ next_action: true, client_secret: trialPi.client_secret, success_url: '/success.html' });
    }

    const t0 = Math.floor(Date.now() / 1000);
    const t10 = t0 + 10 * 24 * 60 * 60;
    const t30 = t0 + 30 * 24 * 60 * 60;

    const schedule = await stripe.subscriptionSchedules.create({
      customer: customer.id,
      end_behavior: 'cancel',
      phases: [
        {
          start_date: t10,
          iterations: 1,
          default_payment_method: paymentMethodId,
          collection_method: 'charge_automatically',
          proration_behavior: 'none',
          items: [{ price: 'price_YOUR_PRICE_ID_HERE', quantity: 1 }],
        },
        {
          start_date: t30,
          iterations: 1,
          default_payment_method: paymentMethodId,
          collection_method: 'charge_automatically',
          proration_behavior: 'none',
          items: [{ price: 'price_YOUR_PRICE_ID_HERE', quantity: 1 }],
        },
      ],
      metadata: { plan_shape: '3-now, 49@day10, 49@day30' },
    });

    return res.json({ ok: true, schedule_id: schedule.id, success_url: '/success.html' });
  } catch (e) {
    if (e.raw && e.raw.payment_intent && e.raw.payment_intent.status === 'requires_action') {
      return res.json({ next_action: true, client_secret: e.raw.payment_intent.client_secret, success_url: '/success.html' });
    }
    console.error(e);
    return res.status(400).json({ error: e.message });
  }
});

// Health check
app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
