/**
 * Stripe webhook для отправки конверсии в Google Ads
 * 
 * Событие: payment_intent.succeeded
 * Действие: отправить конверсию в Google Ads с gclid
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { kv } = require('@vercel/kv');

// Чтение raw body для Stripe signature
const config = {
  api: {
    bodyParser: false,
  },
};

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * Отправка конверсии в Google Ads через Measurement Protocol
 * Это упрощённый метод без OAuth
 */
async function sendGoogleAdsConversion({ gclid, transactionId, value, currency }) {
  const conversionId = process.env.GOOGLE_ADS_CONVERSION_ID; // AW-17824079146
  const conversionLabel = process.env.GOOGLE_ADS_CONVERSION_LABEL; // l62hCKPTndgbEKq6I7NC
  
  if (!gclid) {
    console.log('[WEBHOOK] ⚠️ No gclid - conversion will not attribute to Ads click');
    return { success: false, reason: 'no_gclid' };
  }

  // Google Ads Conversion endpoint
  const endpoint = `https://www.googleadservices.com/pagead/conversion/${conversionId}/?`;
  
  const params = new URLSearchParams({
    google_conversion_id: conversionId.replace('AW-', ''),
    google_conversion_label: conversionLabel,
    google_conversion_value: value.toString(),
    google_conversion_currency: currency,
    google_conversion_order_id: transactionId,
    gclid: gclid,
  });

  try {
    const response = await fetch(endpoint + params.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'VinTrusted-Server/1.0',
      },
    });

    console.log('[WEBHOOK] ✅ Google Ads conversion sent:', {
      status: response.status,
      transactionId,
      value,
      gclid: gclid.substring(0, 10) + '...',
    });

    return { success: true, status: response.status };
  } catch (error) {
    console.error('[WEBHOOK] ❌ Error sending Google Ads conversion:', error);
    return { success: false, error: error.message };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_CONVERSION;

  let event;
  try {
    const rawBody = await buffer(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('[WEBHOOK] ❌ Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('[WEBHOOK] 📥 Received event:', event.type);

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;

    // Получаем gclid из metadata (должен быть сохранён при создании payment intent)
    const gclid = paymentIntent.metadata?.gclid || '';
    const setupIntentId = paymentIntent.id;
    const amountInDollars = paymentIntent.amount / 100;
    const currency = paymentIntent.currency.toUpperCase();

    console.log('[WEBHOOK] 💳 Payment succeeded:', {
      id: setupIntentId,
      amount: amountInDollars,
      currency,
      hasGclid: !!gclid,
    });

    // Отправить конверсию в Google Ads
    const conversionResult = await sendGoogleAdsConversion({
      gclid,
      transactionId: setupIntentId,
      value: amountInDollars,
      currency,
    });

    // Залогировать в нашу внутреннюю аналитику
    try {
      const conversionData = {
        timestamp: new Date().toISOString(),
        transactionId: setupIntentId,
        value: amountInDollars,
        currency,
        gclid: gclid || 'none',
        googleAdsResult: conversionResult,
        source: 'stripe_webhook',
      };

      await kv.lpush('conversions', JSON.stringify(conversionData));
      console.log('[WEBHOOK] 📊 Logged to internal analytics');
    } catch (error) {
      console.error('[WEBHOOK] ⚠️ Failed to log internally:', error);
    }

    return res.json({
      received: true,
      conversionSent: conversionResult.success,
    });
  }

  // Другие типы событий игнорируем
  res.json({ received: true });
}

module.exports = handler;
module.exports.config = config;

