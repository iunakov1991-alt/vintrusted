#!/usr/bin/env node
/**
 * Check last ChatGPT conversion and its logs
 */

require('dotenv').config();
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

async function checkLastChatGPTConversion() {
  console.log('🔍 Finding last ChatGPT conversion...\n');
  
  try {
    // Get recent charges
    console.log('📡 Fetching recent charges...');
    const charges = await stripe.charges.list({
      limit: 100,
      expand: ['data.customer']
    });
    
    // Filter ChatGPT conversions
    const chatgptCharges = charges.data.filter(ch => {
      const source = ch.metadata?.utm_source || '';
      return source.includes('chatgpt') || source.includes('chat');
    });
    
    console.log(`✅ Found ${chatgptCharges.length} ChatGPT charges\n`);
    
    if (chatgptCharges.length === 0) {
      console.log('❌ No ChatGPT conversions found!');
      return;
    }
    
    // Get the latest one
    const lastCharge = chatgptCharges[0];
    const chargeDate = new Date(lastCharge.created * 1000);
    
    console.log('═══════════════════════════════════════════════════');
    console.log('💳 LAST CHATGPT CONVERSION');
    console.log('═══════════════════════════════════════════════════\n');
    
    console.log(`📅 Date: ${chargeDate.toISOString()}`);
    console.log(`🆔 Charge ID: ${lastCharge.id}`);
    console.log(`💰 Amount: $${lastCharge.amount / 100}`);
    console.log(`✅ Status: ${lastCharge.status}`);
    console.log(`💳 Paid: ${lastCharge.paid ? 'YES ✅' : 'NO ❌'}`);
    console.log('');
    
    // Customer info
    const customer = lastCharge.customer;
    if (typeof customer === 'object') {
      console.log(`👤 Customer: ${customer.email || customer.id}`);
      console.log(`🆔 Customer ID: ${customer.id}`);
    } else {
      console.log(`👤 Customer ID: ${customer}`);
    }
    console.log('');
    
    // Metadata
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📋 METADATA:\n');
    
    const metadata = lastCharge.metadata || {};
    const keys = Object.keys(metadata).sort();
    
    if (keys.length === 0) {
      console.log('   ⚠️  No metadata found!\n');
    } else {
      keys.forEach(key => {
        console.log(`   ${key}: ${metadata[key]}`);
      });
      console.log('');
    }
    
    // UTM parameters
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📊 UTM TRACKING:\n');
    console.log(`   Source:   ${metadata.utm_source || '❌ NOT SET'}`);
    console.log(`   Medium:   ${metadata.utm_medium || '❌ NOT SET'}`);
    console.log(`   Campaign: ${metadata.utm_campaign || '❌ NOT SET'}`);
    console.log(`   GCLID:    ${metadata.gclid || '❌ NOT SET'}`);
    console.log('');
    
    // A/B Test
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🎯 A/B TEST:\n');
    console.log(`   Variant: ${metadata.ab_variant || '❌ NOT SET'}`);
    console.log('');
    
    // VIN
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🚗 VIN:\n');
    console.log(`   VIN: ${metadata.vin || '❌ NOT SET'}`);
    console.log('');
    
    // Payment details
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('💳 PAYMENT DETAILS:\n');
    console.log(`   Card brand: ${lastCharge.payment_method_details?.card?.brand || 'unknown'}`);
    console.log(`   Card last4: ${lastCharge.payment_method_details?.card?.last4 || 'unknown'}`);
    console.log(`   Card country: ${lastCharge.payment_method_details?.card?.country || 'unknown'}`);
    console.log(`   Receipt email: ${lastCharge.receipt_email || 'not sent'}`);
    console.log('');
    
    // Check if this was a trial or recurring
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📈 PAYMENT TYPE:\n');
    
    const amount = lastCharge.amount / 100;
    let paymentType = 'unknown';
    
    if (amount === 1) {
      paymentType = 'TRIAL ($1 - OLD)';
    } else if (amount === 3) {
      paymentType = 'TRIAL ($3 - NEW)';
    } else if (amount === 49) {
      paymentType = 'RECURRING ($49)';
    }
    
    console.log(`   Type: ${paymentType}`);
    console.log(`   Description: ${lastCharge.description || 'N/A'}`);
    console.log('');
    
    // Get related subscription if exists
    if (lastCharge.invoice) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('📋 RELATED SUBSCRIPTION:\n');
      
      try {
        const invoice = await stripe.invoices.retrieve(lastCharge.invoice);
        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription);
          const price = sub.items.data[0].price;
          
          console.log(`   Subscription ID: ${sub.id}`);
          console.log(`   Status: ${sub.status}`);
          console.log(`   Interval: ${price.recurring?.interval_count} ${price.recurring?.interval}(s)`);
          console.log(`   Created: ${new Date(sub.created * 1000).toISOString().split('T')[0]}`);
          console.log(`   Next billing: ${new Date(sub.current_period_end * 1000).toISOString().split('T')[0]}`);
        }
      } catch (e) {
        console.log(`   ⚠️  Could not retrieve subscription: ${e.message}`);
      }
      console.log('');
    }
    
    console.log('═══════════════════════════════════════════════════\n');
    
    // Check Google Ads conversion tracking
    console.log('🎯 GOOGLE ADS CONVERSION TRACKING:\n');
    
    if (metadata.gclid) {
      console.log('   ✅ GCLID present - conversion WILL be tracked');
      console.log(`   📍 GCLID: ${metadata.gclid}`);
    } else {
      console.log('   ❌ GCLID missing - conversion NOT tracked in Google Ads');
      console.log('   ℹ️  This is expected for ChatGPT traffic');
    }
    console.log('');
    
    console.log('═══════════════════════════════════════════════════\n');
    
    // Summary
    console.log('📊 SUMMARY:\n');
    console.log(`   Source: ChatGPT`);
    console.log(`   Date: ${chargeDate.toISOString().split('T')[0]}`);
    console.log(`   Amount: $${amount}`);
    console.log(`   Type: ${paymentType}`);
    console.log(`   Status: ${lastCharge.paid ? '✅ Paid' : '❌ Failed'}`);
    console.log(`   A/B Variant: ${metadata.ab_variant || 'unknown'}`);
    console.log(`   VIN: ${metadata.vin || 'not set'}`);
    console.log('');
    
    console.log('═══════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkLastChatGPTConversion()
  .then(() => {
    console.log('✅ Check complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
