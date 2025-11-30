const { stripe } = require('./_lib/stripe');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { cs } = req.query;

    if (!cs) {
      return res.status(400).json({ error: 'Checkout session ID is required' });
    }

    const session = await stripe.checkout.sessions.retrieve(cs);
    
    // Try to get VIN from metadata
    let vin = session.metadata?.vin;
    
    if (!vin && session.customer) {
      const customer = await stripe.customers.retrieve(session.customer);
      vin = customer.metadata?.vin;
    }

    if (!vin) {
      return res.status(404).json({ error: 'VIN not found in checkout session metadata' });
    }

    return res.status(200).json({ success: true, vin: vin });
  } catch (error) {
    console.error('Error getting VIN from checkout session:', error);
    return res.status(500).json({ 
      error: 'Failed to get VIN',
      message: error.message 
    });
  }
};

