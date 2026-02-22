import { kv } from '@vercel/kv';
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const customerKey = `customer:email:${normalizedEmail}`;
    
    const customerData = await kv.get(customerKey);

    if (!customerData) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Получаем актуальную подписку из Stripe
    let subscription = null;
    
    if (customerData.subscription?.subscription_id) {
      try {
        const sub = await stripe.subscriptions.retrieve(customerData.subscription.subscription_id);
        subscription = {
          status: sub.status,
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
          canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null
        };
      } catch (err) {
        console.error('[GET-CUSTOMER-DATA] Error fetching subscription:', err.message);
      }
    }

    return res.status(200).json({
      email: customerData.email,
      customer_id: customerData.customer_id,
      created_at: customerData.created_at,
      subscription: subscription,
      quota: customerData.quota || { total: 0, used: 0, remaining: 0 },
      reports: customerData.reports || []
    });

  } catch (error) {
    console.error('[GET-CUSTOMER-DATA] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
