#!/usr/bin/env node
/**
 * Analyze A/B Test Results from Stripe
 * 
 * Extracts ab_variant from Stripe charges metadata
 * and counts conversions per variant
 */

require('dotenv').config();
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

async function analyzeABTest() {
  console.log('🔍 Analyzing A/B Test Results...\n');
  
  const startDate = '2026-01-01';
  const endDate = '2026-02-23';
  
  // Convert to Unix timestamps
  const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
  const endTimestamp = Math.floor(new Date(endDate + 'T23:59:59').getTime() / 1000);
  
  console.log(`📅 Date Range: ${startDate} - ${endDate}`);
  console.log(`⏱️  Unix Range: ${startTimestamp} - ${endTimestamp}\n`);
  
  // Fetch all charges in the date range
  let allCharges = [];
  let hasMore = true;
  let startingAfter = null;
  
  while (hasMore) {
    const params = {
      limit: 100,
      created: {
        gte: startTimestamp,
        lte: endTimestamp
      }
    };
    
    if (startingAfter) {
      params.starting_after = startingAfter;
    }
    
    const charges = await stripe.charges.list(params);
    allCharges = allCharges.concat(charges.data);
    hasMore = charges.has_more;
    
    if (hasMore && charges.data.length > 0) {
      startingAfter = charges.data[charges.data.length - 1].id;
    }
    
    console.log(`✓ Fetched ${allCharges.length} charges so far...`);
  }
  
  console.log(`\n📊 Total Charges: ${allCharges.length}\n`);
  
  // Analyze by A/B variant
  const variants = {
    light: { count: 0, revenue: 0, conversions: [] },
    dark: { count: 0, revenue: 0, conversions: [] },
    unknown: { count: 0, revenue: 0, conversions: [] }
  };
  
  const devices = {
    desktop: 0,
    mobile: 0,
    unknown: 0
  };
  
  const sources = {
    google: 0,
    direct: 0,
    chatgpt: 0,
    other: 0
  };
  
  // Process each charge
  allCharges.forEach(charge => {
    // Skip failed charges
    if (!charge.paid) return;
    
    // Get metadata
    const metadata = charge.metadata || {};
    let variant = metadata.ab_variant || 'unknown';
    
    // Normalize variant names
    if (variant === 'variant_a') variant = 'light';
    if (variant === 'variant_b') variant = 'dark';
    
    // Count and track
    if (variants[variant]) {
      variants[variant].count++;
      variants[variant].revenue += charge.amount / 100;
      variants[variant].conversions.push({
        id: charge.id,
        amount: charge.amount / 100,
        date: new Date(charge.created * 1000).toISOString().split('T')[0],
        email: metadata.email || 'unknown',
        vin: metadata.vin || 'unknown',
        source: metadata.utm_source || 'direct'
      });
    }
    
    // Track source
    const source = metadata.utm_source || 'direct';
    if (source.includes('google')) sources.google++;
    else if (source.includes('chatgpt')) sources.chatgpt++;
    else if (source === 'direct') sources.direct++;
    else sources.other++;
  });
  
  // Calculate total conversions
  const totalConversions = variants.light.count + variants.dark.count + variants.unknown.count;
  
  // Print results
  console.log('═══════════════════════════════════════════════════');
  console.log('🎯 A/B TEST RESULTS');
  console.log('═══════════════════════════════════════════════════\n');
  
  console.log(`📊 TOTAL CONVERSIONS: ${totalConversions}\n`);
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Variant breakdown
  Object.entries(variants).forEach(([variant, data]) => {
    if (data.count === 0 && variant === 'unknown') return;
    
    const percentage = totalConversions > 0 ? (data.count / totalConversions * 100).toFixed(1) : 0;
    const avgRevenue = data.count > 0 ? (data.revenue / data.count).toFixed(2) : 0;
    
    const label = variant.charAt(0).toUpperCase() + variant.slice(1);
    const emoji = variant === 'light' ? '☀️' : variant === 'dark' ? '🌙' : '❓';
    
    console.log(`${emoji} VARIANT: ${label.toUpperCase()}`);
    console.log(`   Conversions: ${data.count} (${percentage}%)`);
    console.log(`   Revenue: $${data.revenue.toFixed(2)}`);
    console.log(`   Avg per conversion: $${avgRevenue}`);
    console.log('');
  });
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Winner calculation
  if (variants.light.count > 0 && variants.dark.count > 0) {
    const winner = variants.light.count > variants.dark.count ? 'light' : 'dark';
    const loser = winner === 'light' ? 'dark' : 'light';
    const diff = Math.abs(variants[winner].count - variants[loser].count);
    const improvement = ((diff / variants[loser].count) * 100).toFixed(1);
    
    const winnerEmoji = winner === 'light' ? '☀️' : '🌙';
    
    console.log(`🏆 WINNER: ${winnerEmoji} ${winner.toUpperCase()}`);
    console.log(`   Better by: ${diff} conversions (+${improvement}%)`);
    console.log(`   Conversion Rate Improvement: +${improvement}%\n`);
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Source breakdown
  console.log('📍 BY SOURCE:\n');
  Object.entries(sources).forEach(([source, count]) => {
    if (count > 0) {
      const percentage = totalConversions > 0 ? (count / totalConversions * 100).toFixed(1) : 0;
      console.log(`   ${source}: ${count} (${percentage}%)`);
    }
  });
  
  console.log('\n═══════════════════════════════════════════════════\n');
  
  // Detailed list for each variant
  console.log('📋 DETAILED CONVERSION LIST:\n');
  
  ['light', 'dark'].forEach(variant => {
    if (variants[variant].count > 0) {
      console.log(`\n${variant.toUpperCase()} Variant (${variants[variant].count} conversions):`);
      console.log('─────────────────────────────────────────────────────');
      variants[variant].conversions.forEach((conv, i) => {
        console.log(`${i + 1}. ${conv.date} | $${conv.amount.toFixed(2)} | ${conv.source} | ${conv.vin.substring(0, 8)}...`);
      });
    }
  });
  
  console.log('\n═══════════════════════════════════════════════════\n');
  
  // Recommendation
  if (variants.light.count > 0 && variants.dark.count > 0) {
    const winner = variants.light.count > variants.dark.count ? 'light' : 'dark';
    const improvement = (Math.abs(variants.light.count - variants.dark.count) / Math.min(variants.light.count, variants.dark.count) * 100).toFixed(1);
    
    console.log('💡 RECOMMENDATION:\n');
    console.log(`   ✅ Use ${winner.toUpperCase()} variant for all traffic`);
    console.log(`   📈 Expected CR improvement: +${improvement}%`);
    console.log(`   💰 Additional conversions per period: +${Math.abs(variants.light.count - variants.dark.count)}`);
  } else if (variants.light.count === 0 && variants.dark.count === 0) {
    console.log('⚠️  NO A/B TEST DATA FOUND\n');
    console.log('   Possible reasons:');
    console.log('   - ab_variant not tracked in Stripe metadata');
    console.log('   - Test not running during this period');
    console.log('   - Conversions too old (before A/B test implementation)');
  }
  
  console.log('\n═══════════════════════════════════════════════════\n');
}

// Run analysis
analyzeABTest()
  .then(() => {
    console.log('✅ Analysis complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
