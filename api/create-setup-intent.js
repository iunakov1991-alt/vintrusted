import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

export default async function handler(req, res){
  if(req.method !== 'POST') return res.status(405).end();
  try {
    const si = await stripe.setupIntents.create({ usage: 'off_session' });
    res.status(200).json({ client_secret: si.client_secret });
  } catch(e){ res.status(400).json({ error: e.message }); }
}
