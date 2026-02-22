import { kv } from '@vercel/kv';
import Stripe from 'stripe';
import { checkRateLimit, sendRateLimitError } from './_lib/rate-limit.js';
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

  // ✅ P0: Rate limiting (защита от enumeration)
  const rateLimitCheck = await checkRateLimit(req, 'read');
  if (!rateLimitCheck.success) {
    return sendRateLimitError(res, rateLimitCheck);
  }

  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const customerKey = `customer:email:${normalizedEmail}`;
    
    // ✅ ЗАЩИТА: KV может быть временно недоступен
    let customerData;
    try {
      customerData = await kv.get(customerKey);
    } catch (kvError) {
      console.error('[GET-CUSTOMER-DATA] KV error:', kvError);
      return res.status(503).json({ 
        error: 'Service temporarily unavailable',
        message: 'Database is temporarily unavailable. Please try again in a moment.',
        retry: true
      });
    }

    if (!customerData) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // ✅ ЗАЩИТА: Проверяем базовую структуру данных
    if (!customerData.email || !customerData.customer_id) {
      console.error('[GET-CUSTOMER-DATA] Invalid customer data structure:', customerData);
      return res.status(500).json({ 
        error: 'Invalid customer data',
        message: 'Customer data is corrupted. Please contact support.'
      });
    }

    // Используем данные из KV (синхронизированные через webhook)
    const subscription = customerData.subscription || null;

    return res.status(200).json({
      email: customerData.email,
      customer_id: customerData.customer_id,
      created_at: customerData.created_at,
      subscription: subscription,
      quota: customerData.quota || { total: 0, used: 0, remaining: 0 },
      reports: customerData.reports || [],
      disputed: customerData.disputed || false,
      dispute_id: customerData.dispute_id || null,
      failed_first_payment: customerData.failed_first_payment || false,
      failed_first_payment_at: customerData.failed_first_payment_at || null,
      // ✅ Tier data для Google Ads конверсии (определяется при checkout)
      tier: customerData.tier || null, // 'premium', 'medium', 'fraud'
      tier_value: customerData.tier_value !== undefined ? customerData.tier_value : null, // Может быть 0 для fraud
      tier_determined_at: customerData.tier_determined_at || null,
      // ✅ Флаг для определения первого визита (защита от дублей конверсий)
      first_report_viewed: customerData.first_report_viewed || false,
      first_report_viewed_at: customerData.first_report_viewed_at || null
    });

  } catch (error) {
    console.error('[GET-CUSTOMER-DATA] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
}
