// Stripe Configuration API
// Returns Stripe publishable key and other config

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
    
    if (!publishableKey) {
      console.error('STRIPE_PUBLISHABLE_KEY not configured');
      return res.status(500).json({ 
        error: 'Stripe not configured. Please contact support.' 
      });
    }

    res.status(200).json({ 
      publishableKey,
      returnUrl: process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}/payment-success.html`
        : 'https://vintrusted.com/payment-success.html'
    });
  } catch (error) {
    console.error('Error in stripe-config:', error);
    res.status(500).json({ 
      error: 'Failed to get Stripe configuration' 
    });
  }
}
