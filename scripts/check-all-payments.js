/**
 * Простая проверка - какие вообще платежи есть в Stripe
 */

const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function checkAllPayments() {
  console.log('🔍 Checking all payments in Stripe...');
  console.log('');
  
  // Получаем все PaymentIntents (последние 100)
  const paymentIntents = await stripe.paymentIntents.list({ limit: 100 });
  
  console.log(`Total payments found: ${paymentIntents.data.length}`);
  console.log('');
  
  if (paymentIntents.data.length === 0) {
    console.log('❌ No payments found at all');
    return;
  }
  
  // Группируем по сумме
  const byAmount = {};
  const withGclid = [];
  const byDate = {};
  
  paymentIntents.data.forEach(pi => {
    const amount = pi.amount;
    const date = new Date(pi.created * 1000);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    byAmount[amount] = (byAmount[amount] || 0) + 1;
    byDate[monthKey] = (byDate[monthKey] || 0) + 1;
    
    if (pi.metadata?.gclid && pi.status === 'succeeded') {
      withGclid.push({
        id: pi.id,
        amount: pi.amount / 100,
        date: date.toISOString().split('T')[0],
        gclid: pi.metadata.gclid.substring(0, 20) + '...',
        status: pi.status
      });
    }
  });
  
  console.log('📊 By Amount:');
  Object.entries(byAmount)
    .sort((a, b) => b[1] - a[1])
    .forEach(([amount, count]) => {
      console.log(`  $${(parseInt(amount) / 100).toFixed(2)}: ${count} payments`);
    });
  console.log('');
  
  console.log('📅 By Month:');
  Object.entries(byDate)
    .sort()
    .forEach(([month, count]) => {
      console.log(`  ${month}: ${count} payments`);
    });
  console.log('');
  
  console.log(`🎯 Payments with GCLID (Google Ads): ${withGclid.length}`);
  console.log('');
  
  if (withGclid.length > 0) {
    console.log('📋 Last 10 payments with GCLID:');
    withGclid.slice(0, 10).forEach((p, idx) => {
      console.log(`${idx + 1}. $${p.amount} on ${p.date} - ${p.status}`);
      console.log(`   GCLID: ${p.gclid}`);
      console.log(`   ID: ${p.id}`);
      console.log('');
    });
  }
  
  // Самый ранний и самый поздний платеж
  const dates = paymentIntents.data.map(pi => new Date(pi.created * 1000));
  const earliest = new Date(Math.min(...dates));
  const latest = new Date(Math.max(...dates));
  
  console.log('📅 Date Range:');
  console.log(`   Earliest: ${earliest.toISOString().split('T')[0]}`);
  console.log(`   Latest: ${latest.toISOString().split('T')[0]}`);
  console.log('');
}

checkAllPayments()
  .then(() => {
    console.log('✅ Check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
