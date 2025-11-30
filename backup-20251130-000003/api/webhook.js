import Stripe from 'stripe';
export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    const raw = await buffer(req);
    event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook signature verification failed: ${err.message}`);
  }

  if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object;
    const subscriptionId = invoice.subscription;
    // Защита от лишних списаний: если это второй успешный цикл — отменим подписку в конце периода
    try {
      const inv = await stripe.invoices.list({ subscription: subscriptionId, limit: 10 });
      const recurringPaid = inv.data.filter(i => i.paid && i.status === 'paid' && i.billing_reason === 'subscription_cycle');
      if (recurringPaid.length >= 2) {
        await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
      }
    } catch (e) {
      console.error('webhook handling error:', e.message);
    }
  }

  res.json({ received: true });
}

// ——— helpers ———
import { Readable } from 'stream';
function buffer(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const stream = req instanceof Readable ? req : Readable.from(req);
    stream.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}