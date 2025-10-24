// server.js — добавлен return_url в PI и в конфиг для фронта
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const Stripe = require('stripe');

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
const PORT = process.env.PORT || 3000;

// ВЕБХУК (raw)
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object;
      if (invoice.billing_reason === 'subscription_cycle' && invoice.subscription) {
        const sub = await stripe.subscriptions.retrieve(invoice.subscription);
        const count = parseInt(sub.metadata.cycles_paid || '0', 10) + 1;
        await stripe.subscriptions.update(sub.id, { metadata: { ...sub.metadata, cycles_paid: String(count) } });
        if (count >= 2) {
          if (sub.schedule) { try { await stripe.subscriptionSchedules.cancel(sub.schedule); } catch (_) {} }
          await stripe.subscriptions.cancel(sub.id, { invoice_now: false, prorate: false });
        }
      }
    }
    return res.json({ received: true });
  } catch (e) { return res.status(400).send(`Webhook error: ${e.message}`); }
});

// Остальное — обычный JSON и статика
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Конфиг для фронта: ключ и return_url
app.get('/stripe-config', (req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    returnUrl: process.env.RETURN_URL || `http://localhost:${PORT}/success.html`
  });
});

// SetupIntent
app.post('/create-setup-intent', async (req, res) => {
  try {
    const si = await stripe.setupIntents.create({ usage: 'off_session' });
    res.json({ client_secret: si.client_secret });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Основной чек-аут: $3 сейчас + расписание на $49 в T+10 и T+30
app.post('/checkout-trial-then-two-charges', async (req, res) => {
  const { setup_intent_id, consent, email } = req.body;
  if (!setup_intent_id || !consent) return res.status(400).json({ error: 'Missing setup_intent_id or consent' });
  const returnUrl = process.env.RETURN_URL || `http://localhost:${PORT}/success.html`;

  try {
    const si = await stripe.setupIntents.retrieve(setup_intent_id);
    const pm = si.payment_method;
    if (!pm) throw new Error('No payment_method in SetupIntent');

    const customer = await stripe.customers.create({
      payment_method: pm,
      email: email || undefined,
      invoice_settings: { default_payment_method: pm },
      metadata: { consent_checked: 'true', plan: '3-now, 49@10d, 49@30d' }
    });

    // $3 сейчас — confirm c return_url (на случай 3DS)
    const trialPi = await stripe.paymentIntents.create({
      amount: 300,
      currency: 'usd',
      customer: customer.id,
      payment_method: pm,
      confirm: true,
      return_url: returnUrl,
      description: 'VIN report trial ($3 for 10 days)',
      statement_descriptor: 'VIN UNLIMITED',
      statement_descriptor_suffix: 'TRIAL 3 USD'
    });

    if (trialPi.status === 'requires_action') {
      return res.json({ next_action: true, client_secret: trialPi.client_secret, return_url: returnUrl });
    }

    const now = Math.floor(Date.now() / 1000);
    const t10 = now + 10 * 24 * 60 * 60;
    const t30 = now + 30 * 24 * 60 * 60;

    const schedule = await stripe.subscriptionSchedules.create({
      customer: customer.id,
      end_behavior: 'cancel',
      phases: [
        { start_date: t10, iterations: 1, default_payment_method: pm, collection_method: 'charge_automatically', proration_behavior: 'none', items: [{ price: process.env.PRICE_49_RECURRING }] },
        { start_date: t30, iterations: 1, default_payment_method: pm, collection_method: 'charge_automatically', proration_behavior: 'none', items: [{ price: process.env.PRICE_49_RECURRING }] }
      ]
    });

    return res.json({ ok: true, schedule_id: schedule.id, success_url: returnUrl });
  } catch (e) {
    if (e.raw && e.raw.payment_intent && e.raw.payment_intent.client_secret) {
      return res.json({ next_action: true, client_secret: e.raw.payment_intent.client_secret, return_url: process.env.RETURN_URL || `http://localhost:${PORT}/success.html` });
    }
    return res.status(400).json({ error: e.message });
  }
});

app.get('/health', (req, res) => res.json({ ok: true }));
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));