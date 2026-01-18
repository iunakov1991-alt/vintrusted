/**
 * API Endpoint: /api/validate
 * 
 * Валидирует PaymentIntent и возвращает tier (premium/medium/fraud)
 * для отправки в Google Ads с правильной ценностью ($25/$5/$0).
 * 
 * Query параметры:
 * - pi: PaymentIntent ID (обязательно)
 * 
 * Ответ:
 * {
 *   "tier": "premium" | "medium" | "fraud",
 *   "value": 25.00 | 5.00 | 0.00,
 *   "details": {
 *     "funding": "credit" | "debit" | "prepaid" | "unknown",
 *     "cvc_check": "pass" | "fail" | "unavailable" | "unchecked",
 *     "risk_level": "normal" | "elevated" | "highest"
 *   }
 * }
 */

import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Определяет tier карты на основе Stripe PaymentIntent и PaymentMethod
 * Обрабатывает: card, link, us_bank_account, apple_pay, google_pay
 */
function getCardTier(paymentIntent, paymentMethod) {
  const outcome = paymentIntent.charges?.data[0]?.outcome;
  
  // ════════════════════════════════════════════════════════════
  // STRIPE LINK: Treat as Premium (verified by Stripe)
  // ════════════════════════════════════════════════════════════
  if (paymentMethod.type === 'link') {
    console.log('[VALIDATE] 🔗 Stripe Link payment detected → PREMIUM');
    return {
      tier: 'premium',
      value: 25.00,
      details: {
        payment_type: 'link',
        email: paymentMethod.link?.email || 'N/A',
        risk_level: outcome?.risk_level || 'normal'
      }
    };
  }

  // ════════════════════════════════════════════════════════════
  // CARD PAYMENTS: Standard tier logic
  // ════════════════════════════════════════════════════════════
  const card = paymentMethod.card;

  if (!card) {
    // US Bank Account, other payment methods → Medium tier
    console.log('[VALIDATE] ⚠️ No card data, payment type:', paymentMethod.type);
    return { 
      tier: 'medium', 
      value: 5.00,
      details: {
        payment_type: paymentMethod.type,
        risk_level: outcome?.risk_level || 'N/A'
      }
    };
  }

  // Tier 3 (Fraud): блокируем
  if (outcome?.risk_level === 'highest' || card.checks?.cvc_check === 'fail') {
    return { 
      tier: 'fraud', 
      value: 0.00,
      details: {
        funding: card.funding,
        cvc_check: card.checks?.cvc_check,
        risk_level: outcome?.risk_level || 'N/A'
      }
    };
  }

  // Tier 1 (Premium): лучшие карты
  if ((card.funding === 'credit' || card.funding === 'debit') && card.checks?.cvc_check === 'pass') {
    return { 
      tier: 'premium', 
      value: 25.00,
      details: {
        funding: card.funding,
        cvc_check: card.checks?.cvc_check,
        risk_level: outcome?.risk_level || 'N/A'
      }
    };
  }

  // Tier 2 (Medium): prepaid, unknown, или нет cvc_check
  return { 
    tier: 'medium', 
    value: 5.00,
    details: {
      funding: card.funding,
      cvc_check: card.checks?.cvc_check || 'unavailable',
      risk_level: outcome?.risk_level || 'N/A'
    }
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pi } = req.query;

    if (!pi) {
      return res.status(400).json({ error: 'Missing pi (PaymentIntent ID) parameter' });
    }

    console.log(`[VALIDATE] Validating PaymentIntent: ${pi}`);

    // Получаем PaymentIntent
    const paymentIntent = await stripe.paymentIntents.retrieve(pi, {
      expand: ['charges']
    });

    if (!paymentIntent || paymentIntent.status !== 'succeeded') {
      console.log(`[VALIDATE] ❌ PaymentIntent ${pi} not succeeded`);
      return res.status(400).json({ 
        error: 'PaymentIntent not succeeded',
        tier: 'fraud',
        value: 0.00
      });
    }

    // Получаем PaymentMethod
    const paymentMethodId = paymentIntent.payment_method;
    if (!paymentMethodId) {
      console.log(`[VALIDATE] ⚠️ PaymentIntent ${pi} has no payment_method`);
      return res.status(200).json({ 
        tier: 'medium', 
        value: 5.00,
        details: { funding: 'unknown', cvc_check: 'unavailable', risk_level: 'N/A' }
      });
    }

    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    // Определяем tier
    const result = getCardTier(paymentIntent, paymentMethod);

    console.log(`[VALIDATE] ✅ ${pi} → Tier: ${result.tier}, Value: $${result.value}`);

    return res.status(200).json(result);

  } catch (error) {
    console.error('[VALIDATE] ❌ Error:', error.message);
    return res.status(500).json({ 
      error: 'Internal server error',
      tier: 'medium', // Default to medium on error
      value: 5.00
    });
  }
}
