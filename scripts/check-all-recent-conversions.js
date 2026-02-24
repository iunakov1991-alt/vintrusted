#!/usr/bin/env node
/**
 * Check ALL conversions from last 7 hours to find both Google Ads leads
 */

require('dotenv').config();
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

async function checkAllRecentConversions() {
  console.log('🔍 Checking ALL conversions from last 7 hours...\n');
  
  try {
    // Get all charges from last 7 hours
    const sevenHoursAgo = Math.floor((Date.now() - 7 * 60 * 60 * 1000) / 1000);
    
    const charges = await stripe.charges.list({
      created: { gte: sevenHoursAgo },
      limit: 100,
      expand: ['data.customer']
    });
    
    console.log(`✅ Found ${charges.data.length} charges in last 7 hours\n`);
    
    console.log('═══════════════════════════════════════════════════');
    console.log('💳 ALL CHARGES (LAST 7 HOURS)');
    console.log('═══════════════════════════════════════════════════\n');
    
    const successfulCharges = charges.data.filter(ch => ch.paid && ch.status === 'succeeded');
    
    console.log(`💰 Successful charges: ${successfulCharges.length}\n`);
    
    let googleAdsCount = 0;
    let organicCount = 0;
    
    successfulCharges.forEach((charge, i) => {
      const time = new Date(charge.created * 1000).toISOString();
      const metadata = charge.metadata || {};
      const customer = charge.customer;
      const email = typeof customer === 'object' ? customer.email : 'unknown';
      
      const hasGclid = !!metadata.gclid;
      const hasUtmSource = !!metadata.utm_source;
      const source = metadata.utm_source || 'none';
      
      const isGoogleAds = hasGclid || (hasUtmSource && source === 'google');
      
      if (isGoogleAds) googleAdsCount++;
      else organicCount++;
      
      console.log(`${i + 1}. ${time}`);
      console.log(`   💰 Amount: $${charge.amount / 100}`);
      console.log(`   📧 Email: ${email}`);
      console.log(`   🆔 Charge: ${charge.id}`);
      console.log(`   🆔 Payment Intent: ${charge.payment_intent || 'N/A'}`);
      console.log('   ');
      console.log('   Metadata:');
      console.log(`      🎯 GCLID: ${hasGclid ? '✅ YES' : '❌ NO'}`);
      console.log(`      📍 UTM Source: ${metadata.utm_source || '❌ NO'}`);
      console.log(`      📍 UTM Medium: ${metadata.utm_medium || '❌ NO'}`);
      console.log(`      📍 UTM Campaign: ${metadata.utm_campaign || '❌ NO'}`);
      console.log(`      🎨 A/B Variant: ${metadata.ab_variant || '❌ NO'}`);
      console.log(`      🚗 VIN: ${metadata.vin || '❌ NO'}`);
      console.log('   ');
      console.log(`   📊 Source type: ${isGoogleAds ? '✅ GOOGLE ADS' : '🌐 ORGANIC/OTHER'}`);
      console.log('');
    });
    
    console.log('═══════════════════════════════════════════════════\n');
    
    // Summary
    console.log('📊 SUMMARY:\n');
    console.log(`   Total charges (7h): ${charges.data.length}`);
    console.log(`   Successful: ${successfulCharges.length}`);
    console.log(`   Google Ads: ${googleAdsCount}`);
    console.log(`   Organic/Other: ${organicCount}`);
    console.log('');
    
    console.log('═══════════════════════════════════════════════════\n');
    
    // Check if Lead 2 could be Google Ads
    console.log('🔍 ANALYZING LEAD 2 (webertanner29@gmail.com):\n');
    
    const lead2 = successfulCharges.find(ch => {
      const customer = ch.customer;
      const email = typeof customer === 'object' ? customer.email : '';
      return email === 'webertanner29@gmail.com';
    });
    
    if (lead2) {
      console.log('   Found Lead 2!\n');
      console.log(`   ⏰ Time: ${new Date(lead2.created * 1000).toISOString()}`);
      console.log(`   📍 IP: ${lead2.metadata?.ip_address || 'unknown'}`);
      console.log('');
      
      // Check SetupIntent
      const customerId = typeof lead2.customer === 'object' ? lead2.customer.id : lead2.customer;
      
      const setupIntents = await stripe.setupIntents.list({
        customer: customerId,
        limit: 5
      });
      
      console.log(`   🔍 Found ${setupIntents.data.length} SetupIntent(s) for this customer\n`);
      
      setupIntents.data.forEach((si, i) => {
        console.log(`   SetupIntent ${i + 1}:`);
        console.log(`      ID: ${si.id}`);
        console.log(`      Created: ${new Date(si.created * 1000).toISOString()}`);
        console.log('      Metadata:');
        Object.entries(si.metadata || {}).forEach(([k, v]) => {
          console.log(`         ${k}: ${v}`);
        });
        console.log('');
      });
      
      // Check PaymentIntent
      if (lead2.payment_intent) {
        try {
          const pi = await stripe.paymentIntents.retrieve(lead2.payment_intent);
          console.log('   💳 PaymentIntent metadata:');
          Object.entries(pi.metadata || {}).forEach(([k, v]) => {
            console.log(`      ${k}: ${v}`);
          });
          console.log('');
        } catch (e) {
          console.log('   ⚠️  Could not retrieve PaymentIntent\n');
        }
      }
      
      console.log('   🤔 ANALYSIS:');
      if (!lead2.metadata?.gclid && !lead2.metadata?.utm_source) {
        console.log('      ❌ No GCLID or UTM in charge metadata');
        console.log('      ⚠️  If Google Ads shows 2 conversions, this means:');
        console.log('         1. GCLID was sent from frontend but lost before Stripe');
        console.log('         2. OR Google Ads client-side tracking caught it');
        console.log('         3. OR it\'s actually organic and Google Ads miscounting');
      }
      console.log('');
    }
    
    console.log('═══════════════════════════════════════════════════\n');
    
    // Check Google Ads client-side conversions
    console.log('🎯 POSSIBLE SCENARIOS:\n');
    console.log('   Scenario 1: Both are Google Ads, Lead 2 lost GCLID in backend');
    console.log('      - Frontend sent gtag() conversion ✅');
    console.log('      - But GCLID not saved to Stripe ❌');
    console.log('      - Google Ads counted it anyway ✅');
    console.log('');
    console.log('   Scenario 2: Lead 2 is actually organic');
    console.log('      - No GCLID in URL ❌');
    console.log('      - Google Ads miscounting ❌');
    console.log('      - OR counting something else ❓');
    console.log('');
    console.log('   Scenario 3: Different conversion action');
    console.log('      - Google Ads might count page views');
    console.log('      - OR form submissions');
    console.log('      - OR other events ❓');
    console.log('');
    
    console.log('═══════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkAllRecentConversions()
  .then(() => {
    console.log('✅ Analysis complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
