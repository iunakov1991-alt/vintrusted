#!/usr/bin/env node
/**
 * Check status of all 5 migrated subscriptions
 */

require('dotenv').config();
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const subs = [
  { email: 'Jessegonzales100@gmail.com', sub: 'sub_1T0kfHEvbp6Wl4QEHyJaGvG3' },
  { email: 'thegentch@gmail.com', sub: 'sub_1SzLmgEvbp6Wl4QEMGVCfQJe' },
  { email: 'Khalid2000yaseni@gmail.com', sub: 'sub_1Sv02DEvbp6Wl4QEnSCXLevw' },
  { email: 'Lopez2_jc@yahoo.com', sub: 'sub_1SuEtIEvbp6Wl4QENSPTqcFQ' },
  { email: 'maodarin@gmail.com', sub: 'sub_1StZtbEvbp6Wl4QEWXXQO0HQ' }
];

async function checkAll() {
  console.log('🔍 Checking all 5 migrated subscriptions...\n');
  
  for (const s of subs) {
    console.log(`📋 ${s.email}`);
    
    try {
      const sub = await stripe.subscriptions.retrieve(s.sub);
      const price = sub.items.data[0].price;
      
      console.log(`   Status: ${sub.status}`);
      console.log(`   Price: $${price.unit_amount / 100}`);
      console.log(`   Interval: ${price.recurring.interval_count} ${price.recurring.interval}(s)`);
      console.log(`   Next billing: ${new Date(sub.current_period_end * 1000).toISOString().split('T')[0]}`);
      console.log('');
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
    }
  }
}

checkAll()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
