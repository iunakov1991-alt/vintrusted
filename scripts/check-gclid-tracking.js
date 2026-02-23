const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

(async () => {
  // Ищем $1 charges
  const charges = await stripe.charges.list({
    limit: 100,
    created: { gte: Math.floor(new Date('2026-01-20').getTime() / 1000) }
  });
  
  const dollarCharges = charges.data.filter(c => c.amount === 100 && c.status === 'succeeded');
  
  console.log(`Found ${dollarCharges.length} charges for $1 since Jan 20\n`);
  
  let withGclid = 0;
  let withoutGclid = 0;
  let withSource = 0;
  let withoutSource = 0;
  
  // Проверяем первые 5
  for (const charge of dollarCharges.slice(0, 5)) {
    console.log(`─────────────────────────────────────`);
    console.log(`Charge ID: ${charge.id}`);
    console.log(`Date: ${new Date(charge.created * 1000).toISOString().split('T')[0]}`);
    console.log(`Amount: $${charge.amount / 100}`);
    console.log(`Charge metadata:`, JSON.stringify(charge.metadata, null, 2));
    
    // Проверяем payment intent metadata
    if (charge.payment_intent) {
      try {
        const pi = await stripe.paymentIntents.retrieve(charge.payment_intent);
        console.log(`PaymentIntent metadata:`, JSON.stringify(pi.metadata, null, 2));
        
        if (pi.metadata?.gclid) {
          console.log(`✅ Has gclid: ${pi.metadata.gclid.substring(0, 20)}...`);
          withGclid++;
        } else {
          console.log(`❌ NO gclid in PaymentIntent`);
          withoutGclid++;
        }
        
        if (pi.metadata?.utm_source || pi.metadata?.source) {
          console.log(`✅ Has source: ${pi.metadata.utm_source || pi.metadata.source}`);
          withSource++;
        } else {
          console.log(`❌ NO source in PaymentIntent`);
          withoutSource++;
        }
      } catch (e) {
        console.log('Error fetching PaymentIntent:', e.message);
      }
    } else {
      console.log('❌ No PaymentIntent (using old checkout.js flow)');
    }
    
    console.log('');
  }
  
  console.log(`\n============ SUMMARY ============`);
  console.log(`Total $1 charges checked: ${dollarCharges.slice(0, 5).length}`);
  console.log(`With gclid: ${withGclid}`);
  console.log(`Without gclid: ${withoutGclid}`);
  console.log(`With source: ${withSource}`);
  console.log(`Without source: ${withoutSource}`);
  console.log(`\n⚠️  ПРОБЛЕМА: Если gclid нет, то Google Ads конверсия не отправится!`);
  console.log(`📋 Решение: Нужно использовать create-payment-intent.js вместо checkout.js`);
})();
