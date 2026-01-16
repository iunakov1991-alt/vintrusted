import Stripe from 'stripe';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, '../.env.local') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function getCustomerIP() {
  const email = 'tomiboss@icloud.com';
  
  console.log(`🔍 Ищу customer: ${email}\n`);

  // Найти customer по email
  const customers = await stripe.customers.search({
    query: `email:'${email}'`,
    limit: 1
  });

  if (customers.data.length === 0) {
    console.log('❌ Customer не найден');
    return;
  }

  const customer = customers.data[0];
  console.log('✅ Customer найден:');
  console.log(`   ID: ${customer.id}`);
  console.log(`   Email: ${customer.email}`);
  console.log(`   Created: ${new Date(customer.created * 1000).toISOString()}`);
  console.log(`   Card Fingerprint: ${customer.metadata?.card_fingerprint || 'N/A'}`);

  // Найти его PaymentIntents
  console.log('\n🔍 Ищу PaymentIntents...');
  const paymentIntents = await stripe.paymentIntents.list({
    customer: customer.id,
    limit: 10
  });

  let ipAddress = null;
  let allIPs = new Set();

  for (const pi of paymentIntents.data) {
    console.log(`\n📄 PaymentIntent: ${pi.id}`);
    console.log(`   Amount: $${pi.amount / 100}`);
    console.log(`   Status: ${pi.status}`);
    console.log(`   Created: ${new Date(pi.created * 1000).toISOString()}`);

    // Получить Charge для IP
    if (pi.latest_charge) {
      const charge = await stripe.charges.retrieve(pi.latest_charge);
      
      if (charge.billing_details?.address) {
        console.log(`   Billing Address: ${JSON.stringify(charge.billing_details.address)}`);
      }

      if (charge.receipt_url) {
        console.log(`   Receipt: ${charge.receipt_url}`);
      }

      // IP может быть в metadata или в payment_method_details
      if (charge.payment_method_details?.card?.network_transaction_id) {
        console.log(`   Network Transaction ID: ${charge.payment_method_details.card.network_transaction_id}`);
      }

      // Проверяем metadata
      if (pi.metadata?.ip_address) {
        console.log(`   📍 IP Address (metadata): ${pi.metadata.ip_address}`);
        ipAddress = pi.metadata.ip_address;
        allIPs.add(ipAddress);
      }
    }

    // Проверяем metadata PaymentIntent
    if (pi.metadata?.ip_address) {
      console.log(`   📍 IP Address (PI metadata): ${pi.metadata.ip_address}`);
      ipAddress = pi.metadata.ip_address;
      allIPs.add(ipAddress);
    }
  }

  // Найти SetupIntent
  console.log('\n🔍 Ищу SetupIntent...');
  const setupIntents = await stripe.setupIntents.list({
    customer: customer.id,
    limit: 10
  });

  for (const si of setupIntents.data) {
    console.log(`\n📄 SetupIntent: ${si.id}`);
    console.log(`   Status: ${si.status}`);
    console.log(`   Created: ${new Date(si.created * 1000).toISOString()}`);
    
    if (si.metadata?.ip_address) {
      console.log(`   📍 IP Address (SI metadata): ${si.metadata.ip_address}`);
      ipAddress = si.metadata.ip_address;
      allIPs.add(ipAddress);
    }
  }

  console.log('\n============================================================');
  console.log('📊 РЕЗУЛЬТАТЫ:');
  console.log('============================================================');
  console.log(`Customer ID: ${customer.id}`);
  console.log(`Email: ${customer.email}`);
  console.log(`Card Fingerprint: ${customer.metadata?.card_fingerprint || 'N/A'}`);
  
  if (allIPs.size > 0) {
    console.log(`\n📍 Найденные IP-адреса:`);
    allIPs.forEach(ip => console.log(`   - ${ip}`));
  } else {
    console.log('\n⚠️  IP-адрес не найден в metadata');
    console.log('Возможно нужно добавить логирование IP в create-setup-intent.js');
  }

  // Проверить активные subscriptions
  console.log('\n💰 Проверяю подписки...');
  const subscriptions = await stripe.subscriptions.list({
    customer: customer.id,
    status: 'active',
    limit: 10
  });

  const schedules = await stripe.subscriptionSchedules.list({
    customer: customer.id,
    limit: 10
  });

  console.log(`\n📋 Активные подписки: ${subscriptions.data.length}`);
  subscriptions.data.forEach(sub => {
    console.log(`   - ${sub.id}: $${sub.items.data[0].price.unit_amount / 100} / ${sub.items.data[0].price.recurring.interval}`);
  });

  console.log(`\n📋 Subscription Schedules: ${schedules.data.length}`);
  schedules.data.forEach(schedule => {
    console.log(`   - ${schedule.id}: ${schedule.status} (${schedule.phases.length} phases)`);
  });

  console.log('\n============================================================');
}

getCustomerIP().catch(console.error);
