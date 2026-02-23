require('dotenv').config({ path: '../.env' });
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

(async () => {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  GOOGLE ADS ROI ANALYSIS (Jan 12-30, 2026)');
  console.log('═══════════════════════════════════════════════════════════\n');

  const startDate = Math.floor(new Date('2026-01-12').getTime() / 1000);
  const endDate = Math.floor(new Date('2026-01-30T23:59:59').getTime() / 1000);

  console.log('Period:', new Date(startDate * 1000).toLocaleDateString(), '-', new Date(endDate * 1000).toLocaleDateString());
  console.log('Google Ads Spend: $526\n');
  console.log('Loading charges from Stripe...\n');

  const allCharges = [];
  let hasMore = true;
  let startingAfter = null;

  while (hasMore) {
    const params = {
      created: { gte: startDate, lte: endDate },
      limit: 100
    };
    if (startingAfter) {
      params.starting_after = startingAfter;
    }

    const charges = await stripe.charges.list(params);
    allCharges.push(...charges.data);
    hasMore = charges.has_more;
    if (hasMore) {
      startingAfter = charges.data[charges.data.length - 1].id;
    }
  }

  console.log('✅ Total charges loaded:', allCharges.length, '\n');

  // Analyze charges
  const stats = {
    all: { count: 0, revenue: 0, trial: 0, recurring: 0, customers: new Set() },
    google: { count: 0, revenue: 0, trial: 0, recurring: 0, customers: new Set() },
    organic: { count: 0, revenue: 0, trial: 0, recurring: 0, customers: new Set() }
  };

  for (const charge of allCharges) {
    if (!charge.paid) continue;

    const amount = charge.amount / 100;
    const email = charge.billing_details?.email || 'unknown';
    
    // Get UTM data from metadata or customer
    let utmSource = '';
    let utmMedium = '';
    
    if (charge.metadata?.utm_source) {
      utmSource = charge.metadata.utm_source;
    }
    if (charge.metadata?.utm_medium) {
      utmMedium = charge.metadata.utm_medium;
    }

    // Try to get from payment intent
    if (!utmSource && charge.payment_intent) {
      try {
        const pi = await stripe.paymentIntents.retrieve(charge.payment_intent);
        if (pi.metadata?.utm_source) utmSource = pi.metadata.utm_source;
        if (pi.metadata?.utm_medium) utmMedium = pi.metadata.utm_medium;
      } catch (e) {}
    }

    // Try to get from customer
    if (!utmSource && charge.customer) {
      try {
        const customer = await stripe.customers.retrieve(charge.customer);
        if (customer.metadata?.utm_source) utmSource = customer.metadata.utm_source;
        if (customer.metadata?.utm_medium) utmMedium = customer.metadata.utm_medium;
      } catch (e) {}
    }

    // Determine source
    const isGoogle = utmSource.toLowerCase().includes('google') || 
                     utmMedium.toLowerCase() === 'cpc' || 
                     utmMedium.toLowerCase() === 'ppc';

    // Categorize payment type
    const isTrial = amount === 1;
    const isRecurring = amount === 49;

    // Update stats
    stats.all.count++;
    stats.all.revenue += amount;
    stats.all.customers.add(email);
    if (isTrial) stats.all.trial++;
    if (isRecurring) stats.all.recurring++;

    if (isGoogle) {
      stats.google.count++;
      stats.google.revenue += amount;
      stats.google.customers.add(email);
      if (isTrial) stats.google.trial++;
      if (isRecurring) stats.google.recurring++;
    } else {
      stats.organic.count++;
      stats.organic.revenue += amount;
      stats.organic.customers.add(email);
      if (isTrial) stats.organic.trial++;
      if (isRecurring) stats.organic.recurring++;
    }
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  ALL TRAFFIC');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('Total payments:', stats.all.count);
  console.log('Total customers:', stats.all.customers.size);
  console.log('Total revenue:', '$' + stats.all.revenue.toFixed(2));
  console.log('Trial ($1):', stats.all.trial);
  console.log('Recurring ($49):', stats.all.recurring);
  console.log('Conversion rate (trial → recurring):', 
    stats.all.trial > 0 ? Math.round((stats.all.recurring / stats.all.trial) * 100) + '%' : 'N/A');

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  GOOGLE ADS TRAFFIC');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('Total payments:', stats.google.count);
  console.log('Total customers:', stats.google.customers.size);
  console.log('Total revenue:', '$' + stats.google.revenue.toFixed(2));
  console.log('Trial ($1):', stats.google.trial);
  console.log('Recurring ($49):', stats.google.recurring);
  console.log('Conversion rate (trial → recurring):', 
    stats.google.trial > 0 ? Math.round((stats.google.recurring / stats.google.trial) * 100) + '%' : 'N/A');

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  ORGANIC TRAFFIC');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('Total payments:', stats.organic.count);
  console.log('Total customers:', stats.organic.customers.size);
  console.log('Total revenue:', '$' + stats.organic.revenue.toFixed(2));
  console.log('Trial ($1):', stats.organic.trial);
  console.log('Recurring ($49):', stats.organic.recurring);
  console.log('Conversion rate (trial → recurring):', 
    stats.organic.trial > 0 ? Math.round((stats.organic.recurring / stats.organic.trial) * 100) + '%' : 'N/A');

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  GOOGLE ADS ROI ANALYSIS');
  console.log('═══════════════════════════════════════════════════════════\n');

  const adSpend = 526;
  const googleRevenue = stats.google.revenue;
  const googleCustomers = stats.google.customers.size;
  const googleTrial = stats.google.trial;
  const googleRecurring = stats.google.recurring;

  console.log('Ad Spend: $' + adSpend);
  console.log('Revenue: $' + googleRevenue.toFixed(2));
  console.log('Profit/Loss: $' + (googleRevenue - adSpend).toFixed(2));
  console.log('ROI: ' + (googleRevenue > 0 ? Math.round(((googleRevenue / adSpend) - 1) * 100) : 0) + '%');
  console.log('');
  console.log('CPA (Cost Per Acquisition): $' + (googleCustomers > 0 ? (adSpend / googleCustomers).toFixed(2) : 'N/A'));
  console.log('Revenue per Customer: $' + (googleCustomers > 0 ? (googleRevenue / googleCustomers).toFixed(2) : 'N/A'));
  console.log('');

  // LTV calculation
  const conversionRate = googleTrial > 0 ? googleRecurring / googleTrial : 0;
  const avgRecurringPayments = googleTrial > 0 && conversionRate > 0 ? googleRecurring / (googleTrial * conversionRate) : 0;
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  LTV CALCULATION (OLD FLOW: $1 trial)');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const oldTrialRevenue = 1;
  const oldRecurringRevenue = conversionRate * avgRecurringPayments * 49;
  const oldLTV = oldTrialRevenue + oldRecurringRevenue;

  console.log('Trial revenue: $1.00');
  console.log('Conversion rate: ' + Math.round(conversionRate * 100) + '%');
  console.log('Avg recurring payments per converted customer: ' + avgRecurringPayments.toFixed(1));
  console.log('Expected recurring revenue: $49 × ' + (conversionRate * avgRecurringPayments).toFixed(2) + ' = $' + oldRecurringRevenue.toFixed(2));
  console.log('─────────────────────────────────────────────────────────');
  console.log('OLD FLOW LTV: $' + oldLTV.toFixed(2));

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  LTV PROJECTION (NEW FLOW: $3 trial)');
  console.log('═══════════════════════════════════════════════════════════\n');

  const newTrialRevenue = 3;
  const newRecurringRevenue = 0.5 * 3 * 49; // 50% conversion, 3 payments (conservative)
  const newLTV = newTrialRevenue + newRecurringRevenue;

  console.log('Trial revenue: $3.00');
  console.log('Conversion rate: 50% (projected)');
  console.log('Avg recurring payments: 3 (conservative)');
  console.log('Expected recurring revenue: $49 × 1.5 = $' + newRecurringRevenue.toFixed(2));
  console.log('─────────────────────────────────────────────────────────');
  console.log('NEW FLOW LTV: $' + newLTV.toFixed(2));

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  PROFITABILITY ANALYSIS');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('CURRENT PERFORMANCE (Jan 12-30):');
  console.log('  Spend: $526');
  console.log('  Revenue: $' + googleRevenue.toFixed(2));
  console.log('  Customers: ' + googleCustomers);
  console.log('  CPA: $' + (googleCustomers > 0 ? (adSpend / googleCustomers).toFixed(2) : 'N/A'));
  console.log('  ROI: ' + (googleRevenue > 0 ? Math.round(((googleRevenue / adSpend) - 1) * 100) : 0) + '%');
  console.log('  Status: ' + (googleRevenue > adSpend ? '✅ PROFITABLE' : '❌ NOT PROFITABLE'));

  console.log('\nPROJECTED PERFORMANCE (with new LTV $' + newLTV.toFixed(0) + '):');
  const projectedRevenue = googleCustomers * newLTV;
  console.log('  Spend: $526');
  console.log('  Projected Revenue: $' + projectedRevenue.toFixed(2));
  console.log('  Projected ROI: ' + Math.round(((projectedRevenue / adSpend) - 1) * 100) + '%');
  console.log('  Status: ' + (projectedRevenue > adSpend ? '✅ PROFITABLE' : '❌ NOT PROFITABLE'));

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  TARGET CPA ANALYSIS');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('With LTV $' + newLTV.toFixed(0) + ':');
  console.log('');
  console.log('Target CPA Options:');
  const cpaOptions = [15, 20, 24, 30, 40];
  for (const cpa of cpaOptions) {
    const roi = Math.round(((newLTV / cpa) - 1) * 100);
    const margin = newLTV - cpa;
    const status = roi > 100 ? '✅ Excellent' : roi > 50 ? '✅ Good' : roi > 0 ? '⚠️  OK' : '❌ Bad';
    console.log(`  $${cpa}: ROI ${roi}%, Margin $${margin.toFixed(0)} ${status}`);
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  RECOMMENDATION');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (googleRevenue < adSpend) {
    console.log('⚠️  Current campaign is NOT profitable');
    console.log('   Reason: Short-term revenue ($' + googleRevenue.toFixed(2) + ') < Ad spend ($526)');
    console.log('');
    console.log('✅ BUT: This is expected in first month!');
    console.log('   - Most customers will pay $49 in following months');
    console.log('   - True LTV: ~$' + newLTV.toFixed(0));
    console.log('   - Projected ROI: +' + Math.round(((projectedRevenue / adSpend) - 1) * 100) + '%');
    console.log('');
    console.log('🎯 Action: Continue campaign with optimizations');
    console.log('   - Update conversion value to $80');
    console.log('   - Target CPA: $15-24');
    console.log('   - Monitor for 60-90 days (full LTV cycle)');
  } else {
    console.log('✅ Campaign is profitable even in first month!');
    console.log('   Current ROI: +' + Math.round(((googleRevenue / adSpend) - 1) * 100) + '%');
    console.log('   Projected LTV ROI: +' + Math.round(((projectedRevenue / adSpend) - 1) * 100) + '%');
    console.log('');
    console.log('🎯 Action: Scale up!');
    console.log('   - Increase budget');
    console.log('   - Target CPA: $20-30');
  }

})();
