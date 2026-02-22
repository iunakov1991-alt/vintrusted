// server.js — API и вебхук. НИЧЕГО не раздаём на корне — основной сайт останется как есть.
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const Stripe = require('stripe');
const cors = require('cors');
const path = require('path');

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
const PORT = process.env.PORT || 3000;

// --- ВЕБХУК: raw body ДО любых JSON-парсеров
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);

    if (event.type === 'invoice.finalized') {
      const invoice = event.data.object;
      if (invoice.payment_intent) {
        // красивый дескриптор
        await stripe.paymentIntents.update(invoice.payment_intent, {
          statement_descriptor: 'VIN UNLIMITED',
          statement_descriptor_suffix: '1.60/DAY'
        });
      }
    }

    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object;
      if (invoice.billing_reason === 'subscription_cycle' && invoice.subscription && invoice.paid) {
        const sub = await stripe.subscriptions.retrieve(invoice.subscription);
        const count = (parseInt(sub.metadata.cycles_paid || '0', 10) || 0) + 1;
        await stripe.subscriptions.update(sub.id, { metadata: { ...sub.metadata, cycles_paid: String(count) } });
        if (count >= 2) {
          if (sub.schedule) { try { await stripe.subscriptionSchedules.cancel(sub.schedule); } catch (_) {} }
          await stripe.subscriptions.cancel(sub.id, { invoice_now: false, prorate: false });
        }
      }
    }

    return res.json({ received: true });
  } catch (e) {
    return res.status(400).send(`Webhook error: ${e.message}`);
  }
});

// --- Остальные маршруты: JSON уже можно
app.use(bodyParser.json());

// CORS: по умолчанию открыто (проще для интеграции). На проде можешь сузить origin.
app.use(cors());

// Отдаём только ассеты виджета по отдельному префиксу, НО НЕ корневую страницу
app.use('/pay-assets', express.static(path.join(__dirname, 'public')));

// Тестовая страница для проверки интеграции
app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'test.html'));
});

// Конфиг для фронта
app.get('/api/stripe-config', (req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    returnUrl: process.env.RETURN_URL || `http://localhost:${PORT}/payment-success`,
    cancelUrl: process.env.CANCEL_URL || `http://localhost:${PORT}/payment-cancel`
  });
});

// SetupIntent
app.post('/api/create-setup-intent', async (req, res) => {
  try {
    const si = await stripe.setupIntents.create({ usage: 'off_session' });
    return res.json({ client_secret: si.client_secret });
  } catch (e) { return res.status(400).json({ error: e.message }); }
});

// Checkout логика: $3 сейчас, далее $49 на 10-й и второй $49 после первой фазы. Расписание стартует через 10 дней.
app.post('/api/checkout-trial-then-two-charges', async (req, res) => {
  const { setup_intent_id, email } = req.body;
  const returnUrl = process.env.RETURN_URL || `http://localhost:${PORT}/payment-success`;
  try {
    const si = await stripe.setupIntents.retrieve(setup_intent_id);
    const pm = si.payment_method;
    if (!pm) throw new Error('No payment_method in SetupIntent');

    const customer = await stripe.customers.create({
      payment_method: pm,
      email: email || undefined,
      invoice_settings: { default_payment_method: pm },
      metadata: { consent_checked: 'true', plan: '3-now, 49@10d, 49@after-phase1' }
    });

    // $3 сейчас — с return_url на случай 3DS
    const trialPi = await stripe.paymentIntents.create({
      amount: 299,
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

    // Старт расписания через 10 дней от сегодня
    const now = Math.floor(Date.now() / 1000);
    const t10 = now + 10 * 24 * 60 * 60;

    // ВАЖНО: start_date только на уровне schedule; фазы идут последовательно по iterations
    const schedule = await stripe.subscriptionSchedules.create({
      customer: customer.id,
      start_date: t10,
      end_behavior: 'cancel',
      phases: [
        {
          iterations: 1,
          default_payment_method: pm,
          collection_method: 'charge_automatically',
          proration_behavior: 'none',
          items: [{ price: process.env.PRICE_49_RECURRING }]
        },
        {
          iterations: 1,
          default_payment_method: pm,
          collection_method: 'charge_automatically',
          proration_behavior: 'none',
          items: [{ price: process.env.PRICE_49_RECURRING }]
        }
      ]
    });

    return res.json({ ok: true, schedule_id: schedule.id, success_url: returnUrl });
  } catch (e) {
    if (e.raw && e.raw.payment_intent && e.raw.payment_intent.client_secret) {
      return res.json({ next_action: true, client_secret: e.raw.payment_intent.client_secret, return_url: process.env.RETURN_URL || `http://localhost:${PORT}/payment-success` });
    }
    return res.status(400).json({ error: e.message });
  }
});

// Health
app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`Stripe API listening on http://localhost:${PORT}`));