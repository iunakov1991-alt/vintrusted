import Stripe from 'stripe';

export default async function handler(req, res) {
  try {
    if (!process.env.STRIPE_PUBLISHABLE_KEY) throw new Error('Missing STRIPE_PUBLISHABLE_KEY');
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
    const returnUrl = process.env.RETURN_URL || process.env.APP_URL + '/success.html' || 'https://vintrusted.com/success.html';
    res.status(200).json({ publishableKey, returnUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}