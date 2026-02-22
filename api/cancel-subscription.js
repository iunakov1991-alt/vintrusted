import Stripe from 'stripe';
import { kv } from '@vercel/kv';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    console.log('[CANCEL-SUB] Request:', email);

    const normalizedEmail = email.toLowerCase().trim();
    const customerKey = `customer:email:${normalizedEmail}`;
    
    const customerData = await kv.get(customerKey);

    if (!customerData) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const subscriptionId = customerData.subscription?.subscription_id;

    if (!subscriptionId) {
      return res.status(400).json({ 
        error: 'No active subscription',
        message: 'No active subscription found to cancel'
      });
    }

    console.log('[CANCEL-SUB] Canceling subscription:', subscriptionId);

    // Отменяем подписку в Stripe
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    });

    console.log('[CANCEL-SUB] ✅ Subscription canceled at period end:', subscription.cancel_at);

    // Обновляем KV (webhook тоже обновит, но сразу уведомим клиента)
    customerData.subscription.status = 'canceled';
    customerData.subscription.cancel_at = new Date(subscription.cancel_at * 1000).toISOString();
    await kv.set(customerKey, customerData);

    return res.status(200).json({
      success: true,
      message: 'Subscription will be canceled at the end of current billing period',
      cancel_at: customerData.subscription.cancel_at
    });

  } catch (error) {
    console.error('[CANCEL-SUB] Error:', error.message);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
