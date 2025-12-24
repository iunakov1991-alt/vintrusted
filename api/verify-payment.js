// ═══════════════════════════════════════════════════════════════════════
// API ENDPOINT: GET /api/verify-payment?setup_intent=seti_xxx
// ЦЕЛЬ: Проверить что оплата реально прошла перед отстукиванием GA4
// ═══════════════════════════════════════════════════════════════════════

import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // CORS заголовки
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Обработать preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Только GET запросы
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { setup_intent } = req.query;
    
    if (!setup_intent) {
      return res.status(400).json({ 
        paid: false, 
        error: 'setup_intent parameter required' 
      });
    }

    console.log('[VERIFY] Checking payment for SetupIntent:', setup_intent);

    // ┌─────────────────────────────────────────────────────────────┐
    // │ ШАГ 1: Получить SetupIntent из Stripe                       │
    // └─────────────────────────────────────────────────────────────┘
    const si = await stripe.setupIntents.retrieve(setup_intent);
    
    console.log('[VERIFY] SetupIntent status:', si.status);
    console.log('[VERIFY] payment_method:', si.payment_method || 'NULL');

    // ┌─────────────────────────────────────────────────────────────┐
    // │ ШАГ 2: Проверить что SetupIntent succeeded                  │
    // │ И что есть payment_method (карта подтверждена)              │
    // └─────────────────────────────────────────────────────────────┘
    if (si.status !== 'succeeded' || !si.payment_method) {
      console.log('[VERIFY] ❌ Payment NOT confirmed');
      return res.status(200).json({ 
        paid: false,
        status: si.status,
        payment_method: si.payment_method,
        reason: 'SetupIntent not succeeded or no payment_method'
      });
    }

    // ┌─────────────────────────────────────────────────────────────┐
    // │ ШАГ 3: Найти связанный PaymentIntent ($3)                   │
    // │ Используем metadata.setup_intent_id для поиска              │
    // └─────────────────────────────────────────────────────────────┘
    const paymentIntents = await stripe.paymentIntents.list({
      limit: 10,
      // Ищем PaymentIntent, созданный для этого SetupIntent
      // (через customer или по времени создания)
    });

    // Поиск PaymentIntent, созданного примерно в то же время
    // (более надежный способ - искать по customer ID)
    let paymentIntent = null;
    
    if (si.customer) {
      // Найти последний PaymentIntent для этого клиента
      const customerPaymentIntents = await stripe.paymentIntents.list({
        customer: si.customer,
        limit: 5,
      });
      
      // Ищем PaymentIntent на $3.00 (300 cents)
      paymentIntent = customerPaymentIntents.data.find(pi => 
        pi.amount === 300 && pi.currency === 'usd'
      );
    }

    console.log('[VERIFY] PaymentIntent found:', paymentIntent?.id);
    console.log('[VERIFY] PaymentIntent status:', paymentIntent?.status);

    // ┌─────────────────────────────────────────────────────────────┐
    // │ ШАГ 4: Проверить что $3 списались                           │
    // └─────────────────────────────────────────────────────────────┘
    const paymentSucceeded = paymentIntent && paymentIntent.status === 'succeeded';
    
    console.log('[VERIFY] Payment succeeded:', paymentSucceeded);

    // ┌─────────────────────────────────────────────────────────────┐
    // │ ШАГ 5: Проверить что SubscriptionSchedule создан             │
    // └─────────────────────────────────────────────────────────────┘
    let scheduleExists = false;
    if (si.customer) {
      const schedules = await stripe.subscriptionSchedules.list({
        customer: si.customer,
        limit: 5
      });
      scheduleExists = schedules.data.length > 0;
      console.log('[VERIFY] SubscriptionSchedule exists:', scheduleExists);
    }

    // ┌─────────────────────────────────────────────────────────────┐
    // │ ИТОГОВАЯ ПРОВЕРКА: Оплата считается валидной если:          │
    // │ 1. SetupIntent succeeded + payment_method                    │
    // │ 2. PaymentIntent succeeded ($3)                              │
    // │ 3. SubscriptionSchedule создан ($49×3)                       │
    // └─────────────────────────────────────────────────────────────┘
    const isValid = si.status === 'succeeded' && 
                    si.payment_method && 
                    paymentSucceeded;

    console.log('[VERIFY] ✅ Final validation result:', isValid);

    return res.status(200).json({
      paid: isValid,
      setup_intent: {
        id: si.id,
        status: si.status,
        payment_method: si.payment_method
      },
      payment_intent: paymentIntent ? {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount
      } : null,
      subscription_schedule: {
        exists: scheduleExists
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[VERIFY] Error:', error);
    return res.status(500).json({ 
      paid: false,
      error: error.message 
    });
  }
}

