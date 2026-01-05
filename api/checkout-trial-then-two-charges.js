import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ВНИМАНИЕ: предполагается, что PRICE_49_EVERY_10D указывает на price с interval=day, interval_count=10
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  console.log('Checkout request:', req.body);
  
  try {
    const { setup_intent_id, email, vin } = req.body || {};
    if (!setup_intent_id) throw new Error('setup_intent_id is required');

    console.log('Retrieving SetupIntent:', setup_intent_id);
    const si = await stripe.setupIntents.retrieve(setup_intent_id);
    if (!si || !si.payment_method) throw new Error('SetupIntent has no payment_method');
    console.log('SetupIntent OK, payment_method:', si.payment_method);

    // 1) Customer с привязанным PM
    // Копируем metadata из SetupIntent в Customer для future charges
    const customer = await stripe.customers.create({
      email: email || undefined,
      payment_method: si.payment_method,
      invoice_settings: { default_payment_method: si.payment_method },
      metadata: si.metadata || {} // ✅ Копируем metadata (gclid, utm_*, etc.)
    });
    console.log('[CHECKOUT] Customer created with metadata:', customer.metadata);

    // 2) Снимаем $3 сразу
    // КРИТИЧНО: копируем metadata из SetupIntent (включая gclid для Google Ads конверсий)
    console.log('[CHECKOUT] SetupIntent metadata:', si.metadata);
    const pi = await stripe.paymentIntents.create({
      amount: 300,
      currency: 'usd',
      customer: customer.id,
      payment_method: si.payment_method,
      confirm: true,
      off_session: true,
      statement_descriptor_suffix: 'VIN Report',
      description: 'Trial activation $3',
      metadata: si.metadata || {} // ✅ Копируем все metadata (gclid, utm_*, ab_variant, vin)
    });
    console.log('[CHECKOUT] PaymentIntent created with metadata:', pi.metadata);

    // 3) План на три списания $49: t+10, t+20, t+30 (каждые 10 дней, 3 итерации)
    let schedule = null;
    const priceId = process.env.PRICE_49_EVERY_10D;
    if (priceId) {
      try {
        const startAt = Math.floor(Date.now() / 1000) + 10 * 86400;
        schedule = await stripe.subscriptionSchedules.create({
          customer: customer.id,
          start_date: startAt,
          end_behavior: 'cancel',
          phases: [
            {
              iterations: 3,
              default_payment_method: si.payment_method,
              collection_method: 'charge_automatically',
              proration_behavior: 'none',
              items: [{ price: priceId }]
            }
          ]
        });
        console.log('Subscription schedule created:', schedule.id);
      } catch (scheduleError) {
        console.error('Failed to create subscription schedule:', scheduleError.message);
        // Продолжаем выполнение, даже если подписка не создалась
      }
    } else {
      console.log('PRICE_49_EVERY_10D not set, skipping subscription schedule');
    }

    // Get VIN from request body, SetupIntent metadata, or customer metadata
    let finalVin = vin || si.metadata?.vin || '';
    
    // If we have a customer, try to get VIN from customer metadata
    if (!finalVin && customer) {
      finalVin = customer.metadata?.vin || '';
    }
    
    // 4) Отправить отчет ClearVin на email (если есть email и VIN)
    if (email && finalVin) {
      try {
        console.log('Sending ClearVin report to:', email, 'for VIN:', finalVin);
        
        // Вызываем API для отправки отчета
        const reportResponse = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://vintrusted.com'}/api/send-clearvin-report`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email,
            vin: finalVin
          })
        });
        
        if (reportResponse.ok) {
          console.log('ClearVin report sent successfully');
        } else {
          const errorData = await reportResponse.json();
          console.error('Failed to send ClearVin report:', errorData);
        }
      } catch (reportError) {
        console.error('Error sending ClearVin report:', reportError.message);
        // Продолжаем выполнение, даже если отчет не отправился
      }
    } else {
      console.log('Skipping ClearVin report - missing email or VIN');
    }
    
    // Build success URL with VIN - redirect to confirmation page first
    const baseUrl = process.env.APP_URL || process.env.RETURN_URL?.replace('/success.html', '').replace('/payment-success', '') || 'https://vintrusted.com';
    let successUrl = `${baseUrl}/purchase-confirmation.html`;
    
    const params = new URLSearchParams();
    if (finalVin) {
      params.append('vin', finalVin);
    }
    if (si.id) {
      params.append('setup_intent', si.id);
    }
    
    if (params.toString()) {
      successUrl += '?' + params.toString();
    }
    
    // Если $3 потребовал доп. действия (редко), вернём клиентский secret для confirmCardPayment
    const payload = { success: true, success_url: successUrl };
    if (pi.status === 'requires_action' || pi.status === 'requires_confirmation') {
      payload.next_action = true;
      payload.client_secret = pi.client_secret;
    }

    console.log('Checkout success!');
    res.status(200).json(payload);
  } catch (e) {
    console.error('Checkout error:', e.message, e.type, e.code);
    res.status(400).json({ error: e.message, type: e.type, code: e.code });
  }
}