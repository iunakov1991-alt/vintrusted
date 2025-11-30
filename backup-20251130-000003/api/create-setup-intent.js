import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { vin } = req.body || {};
    
    // Создаём SetupIntent для Payment Element (кошельки/карта). Customer пока не обязателен.
    const setupIntent = await stripe.setupIntents.create({
      usage: 'off_session',
      metadata: vin ? { vin: vin.toUpperCase().replace(/[^A-Z0-9]/g, '') } : {}
    });
    res.status(200).json({ client_secret: setupIntent.client_secret, id: setupIntent.id });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}