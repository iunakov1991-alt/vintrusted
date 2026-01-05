import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Helper function to parse cookies from request headers
function parseCookies(req) {
  const list = {};
  const rc = req.headers.cookie;
  rc && rc.split(';').forEach(function(cookie) {
    const parts = cookie.split('=');
    list[parts.shift().trim()] = decodeURI(parts.join('='));
  });
  return list;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    const {
      vin,
      ab_variant,
      utm_source,
      utm_medium,
      utm_campaign,
      amount = 300 // Default $3.00 in cents
    } = req.body || {};

    // Get gclid from cookies (saved by gclid-cookie.js on first visit)
    const cookies = parseCookies(req);
    const gclid = cookies.gclid || '';

    // Build metadata
    const metadata = {};

    if (vin) {
      metadata.vin = vin.toUpperCase().replace(/[^A-Z0-9]/g, '');
    }

    if (ab_variant) {
      metadata.ab_variant = ab_variant;
    }

    if (utm_source) {
      metadata.utm_source = utm_source;
    }

    if (utm_medium) {
      metadata.utm_medium = utm_medium;
    }

    if (utm_campaign) {
      metadata.utm_campaign = utm_campaign;
    }

    // CRITICAL: Save gclid for Google Ads conversion tracking
    if (gclid) {
      metadata.gclid = gclid;
      console.log('[CREATE-PAYMENT-INTENT] ✅ gclid:', gclid);
    } else {
      console.log('[CREATE-PAYMENT-INTENT] ❌ gclid: NOT FOUND');
    }

    console.log('[CREATE-PAYMENT-INTENT] Creating PaymentIntent with metadata:', metadata);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'usd',
      description: 'Trial activation $3',
      statement_descriptor_suffix: 'VIN Report',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata
    });

    console.log('[CREATE-PAYMENT-INTENT] ✅ Created:', paymentIntent.id);

    res.status(200).json({ 
      client_secret: paymentIntent.client_secret, 
      id: paymentIntent.id 
    });
  } catch (e) {
    console.error('[CREATE-PAYMENT-INTENT] ❌ Error:', e.message);
    res.status(400).json({ error: e.message });
  }
}
