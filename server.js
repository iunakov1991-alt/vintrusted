// Проверка и запуск Stripe API
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const Stripe = require('stripe');
const cors = require('cors');

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

// Middleware
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Stripe config endpoint
app.get('/stripe-config', (req, res) => {
  res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
});

// SetupIntent endpoint
app.post('/create-setup-intent', async (req, res) => {
  try {
    const setupIntent = await stripe.setupIntents.create({ usage: 'off_session' });
    res.json({ client_secret: setupIntent.client_secret });
  } catch (err) {
    console.error('SetupIntent Error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// Test Stripe connection
app.get('/api/test-stripe', async (req, res) => {
  try {
    const balance = await stripe.balance.retrieve();
    res.json({ success: true, message: 'Stripe connected successfully', balance });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
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
          items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
        },
        {
          start_date: t30,
          iterations: 1,
          default_payment_method: paymentMethodId,
          collection_method: 'charge_automatically',
          proration_behavior: 'none',
          items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Stripe configured with key: ${process.env.STRIPE_SECRET_KEY.substring(0, 20)}...`);
});