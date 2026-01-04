import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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