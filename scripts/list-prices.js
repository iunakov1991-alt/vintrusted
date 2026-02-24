#!/usr/bin/env node
/**
 * List all Stripe prices to find the correct 33-day price
 */

require('dotenv').config();
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

async function listPrices() {
  console.log('📋 Listing all Stripe prices...\n');
  
  try {
    const prices = await stripe.prices.list({
      limit: 100,
      expand: ['data.product']
    });
    
    console.log(`✅ Found ${prices.data.length} prices\n`);
    console.log('═══════════════════════════════════════════════════\n');
    
    prices.data.forEach(price => {
      const interval = price.recurring?.interval;
      const intervalCount = price.recurring?.interval_count;
      const amount = price.unit_amount / 100;
      
      console.log(`💰 ${price.id}`);
      console.log(`   Amount: $${amount}`);
      console.log(`   Interval: ${intervalCount} ${interval}(s)`);
      console.log(`   Active: ${price.active ? '✅' : '❌'}`);
      console.log(`   Product: ${price.product}`);
      console.log('');
    });
    
    console.log('═══════════════════════════════════════════════════\n');
    
    // Find 33-day price
    const price33d = prices.data.find(p => 
      p.recurring?.interval === 'day' && 
      p.recurring?.interval_count === 33 &&
      p.unit_amount === 4900
    );
    
    if (price33d) {
      console.log('✅ Found 33-day price:');
      console.log(`   Price ID: ${price33d.id}`);
      console.log(`   Amount: $${price33d.unit_amount / 100}`);
      console.log(`   Active: ${price33d.active}\n`);
    } else {
      console.log('⚠️  No 33-day price found. Need to create one!\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

listPrices()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
