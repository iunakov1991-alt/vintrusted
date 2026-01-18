import Stripe from 'stripe';

export default async function handler(req, res) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    
    // Get account info
    const account = await stripe.accounts.retrieve();
    
    // Get first 10 chars of the key for identification
    const keyPreview = process.env.STRIPE_SECRET_KEY?.substring(0, 20) + '...';
    
    return res.status(200).json({
      account_id: account.id,
      email: account.email,
      business_name: account.business_profile?.name || 'N/A',
      key_preview: keyPreview,
      livemode: !process.env.STRIPE_SECRET_KEY?.includes('test')
    });
  } catch (error) {
    return res.status(500).json({ 
      error: error.message,
      key_preview: process.env.STRIPE_SECRET_KEY?.substring(0, 20) + '...'
    });
  }
}
