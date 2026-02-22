import Stripe from 'stripe';
import { kv } from '@vercel/kv';
import { checkRateLimit, sendRateLimitError } from './_lib/rate-limit.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ✅ FINAL: KV retry logic
async function kvGetWithRetry(key, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await kv.get(key);
    } catch (error) {
      console.error(`[KV-RETRY] get(${key}) attempt ${attempt + 1} failed:`, error.message);
      if (attempt === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 200 * (attempt + 1)));
    }
  }
}

/**
 * Создает Stripe Checkout Session для renewal подписки
 * Берет $49 сразу (без trial) и создает новую subscription на 33 дня
 */
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

  // ✅ FINAL: Rate limiting (защита от abuse на renewal)
  const rateLimitCheck = await checkRateLimit(req, 'checkout');
  if (!rateLimitCheck.success) {
    return sendRateLimitError(res, rateLimitCheck);
  }

  try {
    const { email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    console.log('[RENEWAL-PAYMENT] Creating renewal checkout for:', email);

    const normalizedEmail = email.toLowerCase().trim();
    const customerKey = `customer:email:${normalizedEmail}`;
    
    // Проверяем существующего customer в KV
    const customerData = await kvGetWithRetry(customerKey);
    let stripeCustomerId = null;

    if (customerData) {
      // Блокируем disputed customers
      if (customerData.disputed) {
        console.log('[RENEWAL-PAYMENT] 🚨 DISPUTED CUSTOMER blocked');
        return res.status(403).json({ 
          error: 'Account suspended',
          message: 'Your account has been suspended. Please contact support.'
        });
      }
      
      // Блокируем мошенников у которых failed первый $49 платеж
      if (customerData.failed_first_payment) {
        console.log('[RENEWAL-PAYMENT] 🚨 FRAUDSTER blocked - failed first payment');
        return res.status(403).json({ 
          error: 'Payment method declined',
          message: 'Your previous payment failed. Please update your payment method or contact support.'
        });
      }
      
      // ✅ ИСПРАВЛЕНО: Блокируем renewal для ЛЮБОЙ активной подписки
      // (независимо от квоты - пользователь должен ждать автоматического reset)
      const subStatus = customerData.subscription?.status;
      const isCanceling = customerData.subscription?.cancel_at_period_end;
      
      if ((subStatus === 'active' || subStatus === 'trialing') && !isCanceling) {
        console.log('[RENEWAL-PAYMENT] ❌ Active/trialing subscription exists - renewal not allowed');
        return res.status(403).json({ 
          error: 'Active subscription exists',
          message: 'You already have an active subscription. Your quota will reset automatically on the next billing cycle.'
        });
      }
      
      // Если подписка отменена но еще активна - позволяем renewal (по сути reactivation)
      if (customerData.subscription?.status === 'active' && customerData.subscription?.cancel_at_period_end) {
        console.log('[RENEWAL-PAYMENT] ℹ️  Reactivating canceled subscription');
        // Можно попробовать возобновить через Stripe API вместо создания новой
        // Но для простоты создадим новую подписку
      }
      
      // Используем существующего customer из Stripe (если он существует)
      stripeCustomerId = customerData.customer_id;
      console.log('[RENEWAL-PAYMENT] Attempting to use existing Stripe customer:', stripeCustomerId);
      
      // Проверяем что customer существует в Stripe
      try {
        await stripe.customers.retrieve(stripeCustomerId);
        console.log('[RENEWAL-PAYMENT] ✅ Stripe customer exists');
      } catch (customerError) {
        console.log('[RENEWAL-PAYMENT] ⚠️  Stripe customer not found (test data or deleted) - will create new via Checkout');
        stripeCustomerId = null; // Checkout создаст нового
      }
    } else {
      console.log('[RENEWAL-PAYMENT] ⚠️  No existing customer found in KV');
    }

    // Создаем Checkout Session для $49 (полная цена, без trial)
    const priceEvery33D = process.env.PRICE_49_EVERY_33D?.trim();
    
    if (!priceEvery33D) {
      throw new Error('PRICE_49_EVERY_33D not configured');
    }
    
    console.log('[RENEWAL-PAYMENT] Using Price ID:', priceEvery33D);

    const sessionConfig = {
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: priceEvery33D,
          quantity: 1,
        },
      ],
      subscription_data: {
        // Без trial period (по умолчанию начинается сразу)
        metadata: {
          renewal: 'true',
          original_email: email
        }
      },
      success_url: `${req.headers.origin || 'https://vintrusted.com'}/my-reports.html?email=${encodeURIComponent(email)}&renewal_success=1`,
      cancel_url: `${req.headers.origin || 'https://vintrusted.com'}/my-reports.html?email=${encodeURIComponent(email)}`,
      customer_email: email,
      metadata: {
        renewal: 'true',
        original_email: email
      }
    };

    // Если есть существующий customer - привязываем к нему
    if (stripeCustomerId) {
      sessionConfig.customer = stripeCustomerId;
      delete sessionConfig.customer_email; // Нельзя использовать оба параметра одновременно
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    console.log('[RENEWAL-PAYMENT] ✅ Checkout session created:', session.id);

    return res.status(200).json({
      session_id: session.id,
      checkout_url: session.url
    });

  } catch (error) {
    console.error('[RENEWAL-PAYMENT] Error:', error.message);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
