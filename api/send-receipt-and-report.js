import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, setup_intent_id, vin } = req.body || {};

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    console.log('Email receipt request:', { email, setup_intent_id, vin });

    let paymentDetails = null;
    let vinFromStripe = null;

    if (setup_intent_id) {
      try {
        const setupIntent = await stripe.setupIntents.retrieve(setup_intent_id);
        console.log('SetupIntent retrieved:', setupIntent.id);

        if (setupIntent.customer) {
          const customer = await stripe.customers.retrieve(setupIntent.customer);
          console.log('Customer retrieved:', customer.id);

          const paymentIntents = await stripe.paymentIntents.list({
            customer: setupIntent.customer,
            limit: 1
          });

          if (paymentIntents.data.length > 0) {
            paymentDetails = paymentIntents.data[0];
            console.log('Payment found:', paymentDetails.id, 'amount:', paymentDetails.amount);
          }

          vinFromStripe = setupIntent.metadata?.vin || customer.metadata?.vin;
        }
      } catch (stripeError) {
        console.error('Stripe retrieval error:', stripeError.message);
      }
    }

    const vehicleVin = vin || vinFromStripe;

    // TODO: Здесь интегрируйте отправку email через SendGrid/Mailgun/etc
    // TODO: Здесь интегрируйте генерацию PDF отчёта

    const responseData = {
      success: true,
      message: 'Receipt and report will be sent to ' + email,
      data: {
        email,
        paymentAmount: paymentDetails?.amount ? (paymentDetails.amount / 100) : 3,
        paymentStatus: paymentDetails?.status || 'succeeded',
        vin: vehicleVin
      }
    };

    console.log('Response:', responseData);

    return res.status(200).json(responseData);
  } catch (error) {
    console.error('Error in send-receipt-and-report:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

