import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { setup_intent } = req.query;

    if (!setup_intent) {
      return res.status(400).json({ error: 'setup_intent is required' });
    }

    const setupIntent = await stripe.setupIntents.retrieve(setup_intent);
    
    // Try to get VIN from metadata
    let vin = setupIntent.metadata?.vin;
    
    if (!vin && setupIntent.customer) {
      const customer = await stripe.customers.retrieve(setupIntent.customer);
      vin = customer.metadata?.vin;
    }

    if (!vin) {
      return res.status(404).json({ error: 'VIN not found in setup intent metadata' });
    }

    return res.status(200).json({ success: true, vin: vin });
  } catch (error) {
    console.error('Error getting VIN from setup intent:', error);
    return res.status(500).json({ 
      error: 'Failed to get VIN',
      message: error.message 
    });
  }
}

