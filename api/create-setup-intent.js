import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Parse cookies from request headers
function parseCookies(req) {
  const cookieHeader = req.headers?.cookie || '';
  const cookies = {};
  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.split('=');
    const value = rest.join('=').trim();
    if (name) {
      cookies[name.trim()] = decodeURIComponent(value);
    }
  });
  return cookies;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { 
      vin,
      ab_variant,
      utm_source,
      utm_medium,
      utm_campaign
    } = req.body || {};
    
    // Get gclid from cookies (saved by gclid-cookie.js on first visit)
    const cookies = parseCookies(req);
    const gclid = cookies.gclid || '';
    
    console.log('[CREATE-SETUP-INTENT] Cookies:', cookies);
    console.log('[CREATE-SETUP-INTENT] gclid:', gclid || 'NOT FOUND');
    
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
    }
    
    console.log('Creating SetupIntent with metadata:', metadata);
    
    // Создаём SetupIntent для Payment Element (кошельки/карта). Customer пока не обязателен.
    const setupIntent = await stripe.setupIntents.create({
      usage: 'off_session',
      metadata
    });
    res.status(200).json({ client_secret: setupIntent.client_secret, id: setupIntent.id });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}