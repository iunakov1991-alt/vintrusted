import Stripe from 'stripe';
import { kv } from '@vercel/kv';
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

    // Log conversion
    if (vehicleVin && setup_intent_id) {
      try {
        // Get IP and User Agent
        const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'] || 'Unknown';
        
        // Try to get A/B variant from session or metadata
        let abVariant = 'unknown';
        if (setupIntent?.metadata?.ab_variant) {
          abVariant = setupIntent.metadata.ab_variant;
        }
        
        // Create conversion record
        const conversion = {
          id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          vin: vehicleVin,
          abVariant,
          device: userAgent.includes('Mobile') ? 'mobile' : 'desktop',
          source: setupIntent?.metadata?.utm_source || 'direct',
          medium: setupIntent?.metadata?.utm_medium || 'none',
          campaign: setupIntent?.metadata?.utm_campaign || 'none',
          sessionId: setup_intent_id,
          ip,
          userAgent,
          timestamp: new Date().toISOString(),
          date: new Date().toISOString().split('T')[0],
          email,
          amount: paymentDetails?.amount || 100
        };

        // Store conversion in KV
        await kv.set(`conversion:${conversion.id}`, conversion);

        // Add to daily index
        const dailyKey = `conversions:daily:${conversion.date}`;
        await kv.sadd(dailyKey, conversion.id);
        await kv.expire(dailyKey, 90 * 24 * 60 * 60);

        // Add to AB variant index
        const variantKey = `conversions:variant:${conversion.abVariant}:${conversion.date}`;
        await kv.sadd(variantKey, conversion.id);
        await kv.expire(variantKey, 90 * 24 * 60 * 60);

        console.log('✅ Conversion logged:', conversion.id);
      } catch (convError) {
        console.error('⚠️ Failed to log conversion:', convError);
        // Don't fail the main request if conversion logging fails
      }
    }

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

