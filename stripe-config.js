import Stripe from 'stripe';

export default async function handler(req, res) {
  try {
    if (!process.env.STRIPE_PUBLISHABLE_KEY) throw new Error('Missing STRIPE_PUBLISHABLE_KEY');
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
    const returnUrl = process.env.RETURN_URL || 'https://vintrusted.com/payment-success';
    res.status(200).json({ publishableKey, returnUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}