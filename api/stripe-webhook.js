// Объединённая функция: stripe-config + stripe-webhook
// Эндпоинт /api/stripe-config теперь обрабатывается здесь

const { stripe } = require('./_lib/stripe');
const { createOrGetReport } = require('./_lib/vinaudit');
const { store } = require('./_lib/store');

function buffer(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  // Если это GET запрос на /api/stripe-config
  if (req.method === 'GET') {
    return res.status(200).json({
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || '',
    });
  }
  
  // Disable body parsing for raw body access
  req.rawBody = true;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    const rawBody = await buffer(req);
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const cs = event.data.object;

    try {
      // Получаем PM для подписки
      let pmId;
      if (cs.payment_intent) {
        const pi = await stripe.paymentIntents.retrieve(cs.payment_intent);
        pmId = pi.payment_method;
      }

      // Создаём подписку $49 с trial=7 и авто-стопом после 2 циклов
      const PRICE_ID = process.env.STRIPE_PRICE_49_MONTHLY || 'price_1SLgSWIyzEAMYCDXa8g7uV6W';
      
      const sub = await stripe.subscriptions.create({
        customer: cs.customer,
        items: [{ price: PRICE_ID }],
        trial_period_days: 7,
        ...(pmId ? { default_payment_method: pmId } : {})
      });

      // Рассчитываем дату отмены после 2 циклов
      const trialEnd = sub.trial_end * 1000;
      const secondCycleEnd = trialEnd + 2 * 30 * 24 * 3600 * 1000;
      
      await stripe.subscriptions.update(sub.id, {
        cancel_at: Math.floor(secondCycleEnd / 1000)
      });

      // Генерация отчёта
      const orderId = cs.id;
      const vin = cs.metadata?.vin || '';
      const plate = cs.metadata?.plate || '';
      const state = cs.metadata?.state || '';

      store.touch(orderId, { status: 'processing' });

      // Асинхронная генерация отчёта
      setImmediate(async () => {
        try {
          const report = await createOrGetReport({ vin, plate, state });
          store.save(orderId, { status: 'ready', report });
        } catch (e) {
          console.error('Report generation error:', e);
          store.save(orderId, { 
            status: 'error', 
            error: e?.message || 'Report failed' 
          });
        }
      });

    } catch (err) {
      console.error('Webhook processing error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(200).json({ received: true });
};

