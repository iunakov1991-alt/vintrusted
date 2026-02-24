#!/usr/bin/env node
/**
 * Deep dive into last ChatGPT conversion
 */

require('dotenv').config();
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const CHARGE_ID = 'ch_3T468PEvbp6Wl4QE1Onm5qyx';
const CUSTOMER_ID = 'cus_U2AT213Rp6guCk';

async function deepDive() {
  console.log('🔍 Deep dive into ChatGPT conversion...\n');
  
  try {
    // 1. Get charge details
    console.log('═══════════════════════════════════════════════════');
    console.log('💳 CHARGE DETAILS');
    console.log('═══════════════════════════════════════════════════\n');
    
    const charge = await stripe.charges.retrieve(CHARGE_ID, {
      expand: ['customer', 'payment_intent', 'invoice']
    });
    
    console.log(`🆔 Charge ID: ${charge.id}`);
    console.log(`💰 Amount: $${charge.amount / 100}`);
    console.log(`📅 Date: ${new Date(charge.created * 1000).toISOString()}`);
    console.log(`✅ Status: ${charge.status} (paid: ${charge.paid})`);
    console.log(`📧 Email: ${charge.billing_details?.email || 'N/A'}`);
    console.log('');
    
    // 2. Find related SetupIntent
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🔍 LOOKING FOR SETUPINTENT:\n');
    
    // Try to find by customer and timestamp
    const setupIntents = await stripe.setupIntents.list({
      customer: CUSTOMER_ID,
      limit: 10
    });
    
    console.log(`   Found ${setupIntents.data.length} SetupIntents for this customer\n`);
    
    // Find the closest one by time
    const chargeTime = charge.created;
    let closestSetupIntent = null;
    let minTimeDiff = Infinity;
    
    setupIntents.data.forEach(si => {
      const timeDiff = Math.abs(si.created - chargeTime);
      if (timeDiff < minTimeDiff) {
        minTimeDiff = timeDiff;
        closestSetupIntent = si;
      }
    });
    
    if (closestSetupIntent) {
      const timeDiffMinutes = Math.floor(minTimeDiff / 60);
      console.log(`   ✅ Found closest SetupIntent: ${closestSetupIntent.id}`);
      console.log(`   ⏱️  Time difference: ${timeDiffMinutes} minutes`);
      console.log(`   📅 SetupIntent created: ${new Date(closestSetupIntent.created * 1000).toISOString()}`);
      console.log('');
      
      // SetupIntent metadata
      console.log('   📋 SETUPINTENT METADATA:\n');
      const siMetadata = closestSetupIntent.metadata || {};
      const siKeys = Object.keys(siMetadata).sort();
      
      if (siKeys.length === 0) {
        console.log('      ⚠️  No metadata in SetupIntent!\n');
      } else {
        siKeys.forEach(key => {
          console.log(`      ${key}: ${siMetadata[key]}`);
        });
        console.log('');
      }
    } else {
      console.log('   ❌ No SetupIntent found for this customer\n');
    }
    
    // 3. Check customer subscriptions
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📋 CUSTOMER SUBSCRIPTIONS:\n');
    
    const subscriptions = await stripe.subscriptions.list({
      customer: CUSTOMER_ID,
      limit: 10,
      expand: ['data.latest_invoice']
    });
    
    console.log(`   Found ${subscriptions.data.length} subscription(s)\n`);
    
    subscriptions.data.forEach((sub, i) => {
      const price = sub.items.data[0].price;
      console.log(`   ${i + 1}. Subscription: ${sub.id}`);
      console.log(`      Status: ${sub.status}`);
      console.log(`      Price: $${price.unit_amount / 100}`);
      console.log(`      Interval: ${price.recurring?.interval_count} ${price.recurring?.interval}(s)`);
      console.log(`      Created: ${new Date(sub.created * 1000).toISOString().split('T')[0]}`);
      console.log(`      Current period: ${new Date(sub.current_period_start * 1000).toISOString().split('T')[0]} → ${new Date(sub.current_period_end * 1000).toISOString().split('T')[0]}`);
      
      if (sub.metadata) {
        const metaKeys = Object.keys(sub.metadata);
        if (metaKeys.length > 0) {
          console.log('      Metadata:');
          metaKeys.forEach(k => console.log(`        ${k}: ${sub.metadata[k]}`));
        }
      }
      console.log('');
    });
    
    // 4. Check all charges for this customer
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('💳 ALL CHARGES FOR THIS CUSTOMER:\n');
    
    const allCharges = await stripe.charges.list({
      customer: CUSTOMER_ID,
      limit: 20
    });
    
    console.log(`   Total charges: ${allCharges.data.length}\n`);
    
    allCharges.data.forEach((ch, i) => {
      const date = new Date(ch.created * 1000).toISOString().split('T')[0];
      const time = new Date(ch.created * 1000).toISOString().split('T')[1].substring(0, 8);
      console.log(`   ${i + 1}. ${date} ${time} | $${ch.amount / 100} | ${ch.status} | ${ch.paid ? '✅' : '❌'}`);
    });
    
    console.log('');
    console.log('═══════════════════════════════════════════════════\n');
    
    // 5. Customer info
    const customer = await stripe.customers.retrieve(CUSTOMER_ID);
    
    console.log('👤 CUSTOMER INFO:\n');
    console.log(`   ID: ${customer.id}`);
    console.log(`   Email: ${customer.email || 'not set'}`);
    console.log(`   Name: ${customer.name || 'not set'}`);
    console.log(`   Created: ${new Date(customer.created * 1000).toISOString().split('T')[0]}`);
    console.log(`   Balance: $${customer.balance / 100}`);
    console.log('');
    
    if (customer.metadata) {
      console.log('   Customer metadata:');
      Object.entries(customer.metadata).forEach(([k, v]) => {
        console.log(`      ${k}: ${v}`);
      });
      console.log('');
    }
    
    console.log('═══════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

deepDive()
  .then(() => {
    console.log('✅ Deep dive complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
