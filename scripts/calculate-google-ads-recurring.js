require('dotenv').config({ path: '../.env' });
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

(async () => {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  GOOGLE ADS CUSTOMERS: TRIAL + RECURRING ANALYSIS');
  console.log('═══════════════════════════════════════════════════════════\n');

  const startDate = Math.floor(new Date('2026-01-12').getTime() / 1000);
  const endDate = Math.floor(new Date('2026-01-30T23:59:59').getTime() / 1000);

  console.log('Period:', new Date(startDate * 1000).toLocaleDateString(), '-', new Date(endDate * 1000).toLocaleDateString());
  console.log('Looking for Google Ads traffic (utm_medium=cpc)\n');

  // Load ALL charges (not just January) to see recurring payments
  const allChargesEver = [];
  let hasMore = true;
  let startingAfter = null;

  console.log('Loading ALL charges from Stripe (including after Jan 30)...\n');

  while (hasMore) {
    const params = {
      limit: 100,
      created: { gte: startDate } // From Jan 12 onwards
    };
    if (startingAfter) {
      params.starting_after = startingAfter;
    }

    const charges = await stripe.charges.list(params);
    allChargesEver.push(...charges.data);
    hasMore = charges.has_more;
    if (hasMore) {
      startingAfter = charges.data[charges.data.length - 1].id;
    }
  }

  console.log('✅ Loaded', allChargesEver.length, 'total charges\n');

  // Find customers who paid $1 trial in January from Google Ads
  const googleAdsCustomers = new Map();

  for (const charge of allChargesEver) {
    if (!charge.paid) continue;

    const amount = charge.amount / 100;
    const email = charge.billing_details?.email || charge.receipt_email || 'unknown';
    const chargeDate = new Date(charge.created * 1000);
    
    // Check if this is a trial payment in January period
    if (amount === 1 && charge.created >= startDate && charge.created <= endDate) {
      // Check if Google Ads traffic
      let utmSource = '';
      let utmMedium = '';
      let gclid = '';
      
      // Try charge metadata
      if (charge.metadata?.utm_source) utmSource = charge.metadata.utm_source;
      if (charge.metadata?.utm_medium) utmMedium = charge.metadata.utm_medium;
      if (charge.metadata?.gclid) gclid = charge.metadata.gclid;

      // Try payment intent
      if ((!utmSource || !utmMedium) && charge.payment_intent) {
        try {
          const pi = await stripe.paymentIntents.retrieve(charge.payment_intent);
          if (pi.metadata?.utm_source) utmSource = pi.metadata.utm_source;
          if (pi.metadata?.utm_medium) utmMedium = pi.metadata.utm_medium;
          if (pi.metadata?.gclid) gclid = pi.metadata.gclid;
        } catch (e) {}
      }

      // Try customer metadata
      if ((!utmSource || !utmMedium) && charge.customer) {
        try {
          const customer = await stripe.customers.retrieve(charge.customer);
          if (customer.metadata?.utm_source) utmSource = customer.metadata.utm_source;
          if (customer.metadata?.utm_medium) utmMedium = customer.metadata.utm_medium;
          if (customer.metadata?.gclid) gclid = customer.metadata.gclid;
        } catch (e) {}
      }

      // Check if Google Ads
      const isGoogleAds = utmMedium.toLowerCase() === 'cpc' || 
                          utmMedium.toLowerCase() === 'ppc' ||
                          utmSource.toLowerCase().includes('google');

      if (isGoogleAds) {
        if (!googleAdsCustomers.has(email)) {
          googleAdsCustomers.set(email, {
            email,
            trialCharge: charge,
            trialDate: chargeDate,
            trialAmount: amount,
            gclid,
            utmSource,
            utmMedium,
            recurringPayments: []
          });
        }
      }
    }
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  GOOGLE ADS TRIAL CUSTOMERS');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('Found', googleAdsCustomers.size, 'Google Ads customers who paid $1 trial\n');

  // Now find ALL recurring payments for these customers
  for (const [email, customerData] of googleAdsCustomers) {
    for (const charge of allChargesEver) {
      if (!charge.paid) continue;
      
      const chargeEmail = charge.billing_details?.email || charge.receipt_email || 'unknown';
      const amount = charge.amount / 100;
      const chargeDate = new Date(charge.created * 1000);
      
      // Check if this is a recurring payment from this customer
      if (chargeEmail === email && amount === 49) {
        customerData.recurringPayments.push({
          amount,
          date: chargeDate,
          id: charge.id
        });
      }
    }
  }

  // Display results
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  DETAILED BREAKDOWN');
  console.log('═══════════════════════════════════════════════════════════\n');

  let totalTrial = 0;
  let totalRecurring = 0;
  let totalRecurringPayments = 0;
  let customersWithRecurring = 0;

  for (const [email, data] of googleAdsCustomers) {
    console.log('👤', email);
    console.log('   Trial: $' + data.trialAmount, '(' + data.trialDate.toLocaleDateString() + ')');
    console.log('   GCLID:', data.gclid ? '✅ ' + data.gclid.substring(0, 20) + '...' : '❌ None');
    console.log('   UTM:', data.utmSource || 'none', '/', data.utmMedium || 'none');
    
    totalTrial += data.trialAmount;
    
    if (data.recurringPayments.length > 0) {
      customersWithRecurring++;
      console.log('   Recurring payments:', data.recurringPayments.length);
      for (const payment of data.recurringPayments) {
        console.log('     - $' + payment.amount, '(' + payment.date.toLocaleDateString() + ')');
        totalRecurring += payment.amount;
        totalRecurringPayments++;
      }
    } else {
      console.log('   Recurring payments: 0 ❌');
    }
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');

  const totalCustomers = googleAdsCustomers.size;
  const conversionRate = totalCustomers > 0 ? (customersWithRecurring / totalCustomers) * 100 : 0;
  const avgRecurringPerCustomer = customersWithRecurring > 0 ? totalRecurringPayments / customersWithRecurring : 0;
  const totalRevenue = totalTrial + totalRecurring;

  console.log('Google Ads Customers:', totalCustomers);
  console.log('');
  console.log('Trial Revenue:');
  console.log('  Customers:', totalCustomers);
  console.log('  Amount:', '$' + totalTrial);
  console.log('');
  console.log('Recurring Revenue:');
  console.log('  Customers with recurring:', customersWithRecurring);
  console.log('  Total recurring payments:', totalRecurringPayments);
  console.log('  Total recurring amount:', '$' + totalRecurring);
  console.log('  Avg payments per converted customer:', avgRecurringPerCustomer.toFixed(1));
  console.log('');
  console.log('Conversion Rate (trial → recurring):', conversionRate.toFixed(0) + '%');
  console.log('');
  console.log('TOTAL REVENUE:', '$' + totalRevenue);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  GOOGLE ADS ROI');
  console.log('═══════════════════════════════════════════════════════════\n');

  const adSpend = 526;
  const profit = totalRevenue - adSpend;
  const roi = adSpend > 0 ? ((totalRevenue / adSpend - 1) * 100) : 0;
  const cpa = totalCustomers > 0 ? adSpend / totalCustomers : 0;
  const revenuePerCustomer = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

  console.log('Ad Spend: $' + adSpend);
  console.log('Total Revenue: $' + totalRevenue);
  console.log('Profit/Loss: $' + profit.toFixed(2));
  console.log('ROI: ' + roi.toFixed(1) + '%');
  console.log('');
  console.log('CPA (Cost Per Acquisition): $' + cpa.toFixed(2));
  console.log('Revenue per Customer: $' + revenuePerCustomer.toFixed(2));
  console.log('');
  console.log('Status:', profit > 0 ? '✅ PROFITABLE' : profit > -50 ? '⚠️  Nearly break-even' : '❌ Loss');

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  LTV CALCULATION');
  console.log('═══════════════════════════════════════════════════════════\n');

  const ltv = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
  console.log('Actual LTV (based on real data): $' + ltv.toFixed(2));
  console.log('');
  console.log('Breakdown:');
  console.log('  Trial: $' + (totalTrial / totalCustomers).toFixed(2) + ' per customer');
  console.log('  Recurring: $' + (totalRecurring / totalCustomers).toFixed(2) + ' per customer');

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  PROJECTION FOR NEW FLOW');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Project with new flow ($3 trial)
  const newTrialPerCustomer = 3;
  const recurringPerCustomer = totalRecurring / totalCustomers;
  const newLTV = newTrialPerCustomer + recurringPerCustomer;

  console.log('New Flow (trial $3 instead of $1):');
  console.log('  Trial: $' + newTrialPerCustomer);
  console.log('  Recurring: $' + recurringPerCustomer.toFixed(2) + ' (same as current)');
  console.log('  New LTV: $' + newLTV.toFixed(2));
  console.log('');

  // With same spend but optimized CPA
  const targetCPA = 15;
  const projectedCustomers = Math.floor(adSpend / targetCPA);
  const projectedRevenue = projectedCustomers * newLTV;
  const projectedProfit = projectedRevenue - adSpend;
  const projectedROI = ((projectedRevenue / adSpend - 1) * 100);

  console.log('Projection with optimized CPA ($' + targetCPA + '):');
  console.log('  Customers: ' + projectedCustomers + ' (vs ' + totalCustomers + ' current)');
  console.log('  Revenue: $' + projectedRevenue.toFixed(2));
  console.log('  Profit: $' + projectedProfit.toFixed(2));
  console.log('  ROI: ' + projectedROI.toFixed(0) + '%');

})();
