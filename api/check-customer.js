import { kv } from '@vercel/kv';
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // CORS headers
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
    const { email, vin } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log('[CHECK-CUSTOMER] Checking email:', normalizedEmail);

    // Проверяем в KV
    const customerKey = `customer:email:${normalizedEmail}`;
    console.log('[CHECK-CUSTOMER] KV key:', customerKey);
    
    let customerData = null;
    try {
      customerData = await kv.get(customerKey);
      console.log('[CHECK-CUSTOMER] KV result:', customerData ? 'found' : 'null');
    } catch (kvError) {
      console.error('[CHECK-CUSTOMER] KV error:', kvError.message);
      throw kvError;
    }

    if (!customerData) {
      console.log('[CHECK-CUSTOMER] ❌ Customer not found');
      return res.status(200).json({ 
        exists: false,
        new_customer: true
      });
    }

    console.log('[CHECK-CUSTOMER] ✅ Customer found:', customerData.customer_id);

    // Проверяем, купил ли уже этот VIN
    const hasVin = customerData.reports?.some(r => r.vin === vin);

    // Получаем актуальную подписку из Stripe
    let subscriptionStatus = 'none';
    let nextBilling = null;
    
    if (customerData.subscription?.subscription_id) {
      try {
        const sub = await stripe.subscriptions.retrieve(customerData.subscription.subscription_id);
        subscriptionStatus = sub.status;
        
        if (sub.status === 'active') {
          nextBilling = new Date(sub.current_period_end * 1000).toISOString();
        }
      } catch (err) {
        console.error('[CHECK-CUSTOMER] Error fetching subscription:', err.message);
      }
    }

    return res.status(200).json({
      exists: true,
      customer_id: customerData.customer_id,
      email: customerData.email,
      subscription_status: subscriptionStatus,
      quota_remaining: customerData.quota?.remaining || 0,
      quota_used: customerData.quota?.used || 0,
      quota_total: customerData.quota?.total || 0,
      reports_count: customerData.reports?.length || 0,
      has_vin: hasVin,
      next_billing: nextBilling
    });

  } catch (error) {
    console.error('[CHECK-CUSTOMER] Error:', error.message, error.stack);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      stack: error.stack?.substring(0, 200)
    });
  }
}
