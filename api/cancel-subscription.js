import { kv } from '@vercel/kv';
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
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
    
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const customerKey = `customer:email:${normalizedEmail}`;
    const customerData = await kv.get(customerKey);

    if (!customerData) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const subscriptionId = customerData.subscription?.subscription_id;

    if (!subscriptionId) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    // Cancel at period end (не сразу)
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    });

    // Обновляем в KV
    customerData.subscription.cancel_at_period_end = true;
    customerData.subscription.canceled_at = new Date().toISOString();
    await kv.set(customerKey, customerData);

    return res.status(200).json({
      success: true,
      canceled_at_period_end: subscription.cancel_at_period_end,
      current_period_end: subscription.current_period_end
    });

  } catch (error) {
    console.error('[CANCEL-SUBSCRIPTION] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
