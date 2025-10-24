export default async function handler(req, res){
  res.status(200).json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    returnUrl: process.env.RETURN_URL,
    cancelUrl: process.env.CANCEL_URL
  });
}
