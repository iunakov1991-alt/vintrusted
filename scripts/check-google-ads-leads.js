#!/usr/bin/env node
/**
 * Check 2 Google Ads leads from last 7 hours
 */

require('dotenv').config();
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const PAYMENT_INTENTS = [
  'pi_3T4Fi8Evbp6Wl4QE1fPhIOHO',
  'pi_3T4DcXEvbp6Wl4QE0Qu7sjJn'
];

async function checkGoogleAdsLeads() {
  console.log('🔍 Checking Google Ads leads...\n');
  
  for (let i = 0; i < PAYMENT_INTENTS.length; i++) {
    const piId = PAYMENT_INTENTS[i];
    
    console.log('═══════════════════════════════════════════════════');
    console.log(`💳 LEAD ${i + 1}/2`);
    console.log('═══════════════════════════════════════════════════\n');
    
    try {
      // Get PaymentIntent
      const pi = await stripe.paymentIntents.retrieve(piId, {
        expand: ['customer', 'charges.data.balance_transaction']
      });
      
      const charge = pi.charges?.data?.[0];
      const customer = pi.customer;
      
      console.log(`🆔 Payment Intent: ${pi.id}`);
      console.log(`💰 Amount: $${pi.amount / 100}`);
      console.log(`✅ Status: ${pi.status}`);
      console.log(`📅 Created: ${new Date(pi.created * 1000).toISOString()}`);
      console.log(`📧 Email: ${pi.receipt_email || 'not set'}`);
      
      if (typeof customer === 'object') {
        console.log(`👤 Customer: ${customer.email || customer.id}`);
      } else {
        console.log(`👤 Customer ID: ${customer}`);
      }
      
      if (charge) {
        console.log(`💳 Charge: ${charge.id} (${charge.paid ? '✅ paid' : '❌ failed'})`);
      }
      
      console.log('');
      
      // Metadata
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('📋 METADATA:\n');
      
      const metadata = pi.metadata || {};
      const metaKeys = Object.keys(metadata).sort();
      
      if (metaKeys.length === 0) {
        console.log('   ⚠️  NO METADATA!\n');
      } else {
        metaKeys.forEach(key => {
          const value = metadata[key];
          const icon = key === 'gclid' ? '🎯' : 
                      key === 'utm_source' ? '📍' :
                      key === 'ab_variant' ? '🎨' :
                      key === 'vin' ? '🚗' : '  ';
          console.log(`   ${icon} ${key}: ${value}`);
        });
        console.log('');
      }
      
      // UTM Analysis
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('📊 TRACKING ANALYSIS:\n');
      
      const hasGclid = !!metadata.gclid;
      const hasUtmSource = !!metadata.utm_source;
      const hasUtmMedium = !!metadata.utm_medium;
      const hasUtmCampaign = !!metadata.utm_campaign;
      const hasAbVariant = !!metadata.ab_variant;
      const hasVin = !!metadata.vin;
      
      console.log(`   🎯 GCLID:        ${hasGclid ? '✅ YES' : '❌ NO'} ${hasGclid ? `(${metadata.gclid.substring(0, 20)}...)` : ''}`);
      console.log(`   📍 UTM Source:   ${hasUtmSource ? '✅ YES' : '❌ NO'} ${hasUtmSource ? `(${metadata.utm_source})` : ''}`);
      console.log(`   📍 UTM Medium:   ${hasUtmMedium ? '✅ YES' : '❌ NO'} ${hasUtmMedium ? `(${metadata.utm_medium})` : ''}`);
      console.log(`   📍 UTM Campaign: ${hasUtmCampaign ? '✅ YES' : '❌ NO'} ${hasUtmCampaign ? `(${metadata.utm_campaign})` : ''}`);
      console.log(`   🎨 A/B Variant:  ${hasAbVariant ? '✅ YES' : '❌ NO'} ${hasAbVariant ? `(${metadata.ab_variant})` : ''}`);
      console.log(`   🚗 VIN:          ${hasVin ? '✅ YES' : '❌ NO'} ${hasVin ? `(${metadata.vin})` : ''}`);
      console.log('');
      
      // Google Ads Conversion
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('🎯 GOOGLE ADS CONVERSION:\n');
      
      if (hasGclid) {
        console.log('   ✅ GCLID present - conversion WILL be tracked in Google Ads');
        console.log(`   📊 Conversion ID: AW-17824079146`);
        console.log(`   💰 Conversion Value: $80 (LTV-based)`);
        console.log('   🎯 This lead will appear in Google Ads dashboard');
      } else {
        console.log('   ❌ GCLID missing - conversion NOT tracked');
        console.log('   ⚠️  This is a PROBLEM for Google Ads leads!');
      }
      console.log('');
      
      // Subscription check
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('📋 SUBSCRIPTION STATUS:\n');
      
      const customerId = typeof customer === 'object' ? customer.id : customer;
      
      if (customerId) {
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          limit: 5
        });
        
        const schedules = await stripe.subscriptionSchedules.list({
          customer: customerId,
          limit: 5
        });
        
        if (subscriptions.data.length > 0) {
          console.log(`   ✅ Has ${subscriptions.data.length} subscription(s):\n`);
          subscriptions.data.forEach((sub, idx) => {
            const price = sub.items.data[0].price;
            console.log(`   ${idx + 1}. ${sub.id}`);
            console.log(`      Status: ${sub.status}`);
            console.log(`      Price: $${price.unit_amount / 100}`);
            console.log(`      Interval: ${price.recurring?.interval_count} ${price.recurring?.interval}(s)`);
            console.log('');
          });
        } else if (schedules.data.length > 0) {
          console.log(`   📅 Has ${schedules.data.length} scheduled subscription(s):\n`);
          schedules.data.forEach((sched, idx) => {
            console.log(`   ${idx + 1}. ${sched.id}`);
            console.log(`      Status: ${sched.status}`);
            if (sched.phases && sched.phases[0]) {
              const startDate = new Date(sched.phases[0].start_date * 1000).toISOString().split('T')[0];
              console.log(`      Start: ${startDate}`);
            }
            console.log('');
          });
        } else {
          console.log('   ⚠️  NO subscription or schedule found!');
          console.log('   This is one-time payment without recurring.\n');
        }
      }
      
      console.log('═══════════════════════════════════════════════════\n\n');
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n\n`);
    }
  }
  
  // Summary
  console.log('═══════════════════════════════════════════════════');
  console.log('📊 SUMMARY OF 2 GOOGLE ADS LEADS');
  console.log('═══════════════════════════════════════════════════\n');
  
  console.log('✅ Both leads checked - see details above\n');
  
  console.log('🔍 KEY POINTS TO CHECK:\n');
  console.log('   1. GCLID present? (для Google Ads tracking)');
  console.log('   2. ab_variant tracked? (для A/B test)');
  console.log('   3. Subscription created? (для recurring revenue)');
  console.log('   4. Payment successful? (для дохода)\n');
  
  console.log('═══════════════════════════════════════════════════\n');
}

checkGoogleAdsLeads()
  .then(() => {
    console.log('✅ Check complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
