require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

(async () => {
  console.log('===================================================');
  console.log('  ANALYSIS: $1 -> $49 CONVERSION (Jan 12-30)');
  console.log('===================================================\n');

  // Get all charges for January (12-30)
  const startDate = Math.floor(new Date('2026-01-12').getTime() / 1000);
  const endDate = Math.floor(new Date('2026-01-30T23:59:59').getTime() / 1000);

  console.log('Period:', new Date(startDate * 1000).toLocaleDateString(), '-', new Date(endDate * 1000).toLocaleDateString());
  console.log('Loading charges from Stripe...\n');

  const charges = await stripe.charges.list({
    created: { gte: startDate, lte: endDate },
    limit: 100
  });

  console.log('Loaded charges:', charges.data.length, '\n');

  // Group by email
  const customerData = {};

  for (const charge of charges.data) {
    if (!charge.paid) continue;

    const amount = charge.amount / 100;
    const email = charge.billing_details?.email || 'unknown';
    const date = new Date(charge.created * 1000);

    if (!customerData[email]) {
      customerData[email] = {
        email,
        payments: []
      };
    }

    customerData[email].payments.push({
      amount,
      date: date.toISOString().split('T')[0],
      timestamp: charge.created
    });
  }

  // Sort payments by time
  for (const email in customerData) {
    customerData[email].payments.sort((a, b) => a.timestamp - b.timestamp);
  }

  console.log('===================================================');
  console.log('  RESULTS');
  console.log('===================================================\n');

  let totalCustomers = 0;
  let trialCustomers = 0;  // Who paid $1
  let convertedCustomers = 0;  // Who paid $49 after $1
  let totalRecurringPayments = 0;  // Total $49 payments
  let paymentsPerCustomer = {};

  for (const email in customerData) {
    const payments = customerData[email].payments;
    totalCustomers++;

    const hasTrial = payments.some(p => p.amount === 1);
    const has49 = payments.filter(p => p.amount === 49);

    if (hasTrial) {
      trialCustomers++;
    }

    if (hasTrial && has49.length > 0) {
      convertedCustomers++;
      paymentsPerCustomer[email] = has49.length;
      totalRecurringPayments += has49.length;
    }

    // Output details
    if (payments.length > 1) {
      console.log('Customer:', email);
      console.log('   Payments:', payments.map(p => `${p.date}: $${p.amount}`).join(' -> '));
      console.log('');
    }
  }

  console.log('===================================================');
  console.log('  STATISTICS');
  console.log('===================================================\n');

  console.log('Total customers:', totalCustomers);
  console.log('Trial ($1):', trialCustomers);
  console.log('Converted -> $49:', convertedCustomers);
  console.log('Conversion Rate:', trialCustomers > 0 ? Math.round(convertedCustomers / trialCustomers * 100) + '%' : 'N/A');
  console.log('Total $49 payments:', totalRecurringPayments);
  console.log('Avg $49 payments per converted customer:', convertedCustomers > 0 ? (totalRecurringPayments / convertedCustomers).toFixed(1) : 'N/A');

  console.log('\n===================================================');
  console.log('  CUSTOMER DETAILS');
  console.log('===================================================\n');

  for (const email in paymentsPerCustomer) {
    const count = paymentsPerCustomer[email];
    const total = count * 49;
    console.log(`${email}: ${count} x $49 = $${total}`);
  }

  console.log('\n===================================================');
  console.log('  LTV CALCULATION');
  console.log('===================================================\n');

  const conversionRate = trialCustomers > 0 ? convertedCustomers / trialCustomers : 0;
  const avgRecurring = convertedCustomers > 0 ? totalRecurringPayments / convertedCustomers : 0;

  console.log('Conversion Rate (Trial -> Recurring):', Math.round(conversionRate * 100) + '%');
  console.log('Avg Recurring Payments:', avgRecurring.toFixed(1));
  console.log('');

  // LTV calculation
  const expectedRecurringPayments = conversionRate * avgRecurring;
  const expectedRecurringRevenue = expectedRecurringPayments * 49;
  const trialRevenue = 1;
  const totalLTV = trialRevenue + expectedRecurringRevenue;

  console.log('Expected LTV:');
  console.log('   Trial: $1.00');
  console.log('   Recurring: $49 x ' + expectedRecurringPayments.toFixed(2) + ' = $' + expectedRecurringRevenue.toFixed(2));
  console.log('   ----------------------------------------');
  console.log('   TOTAL LTV: $' + totalLTV.toFixed(2));

  console.log('\n===================================================');
  console.log('  RECOMMENDATION');
  console.log('===================================================\n');

  const conservativeTargetCPA = Math.round(totalLTV * 0.3);
  const aggressiveTargetCPA = Math.round(totalLTV * 0.5);

  console.log('Conversion Value (for gtag):', Math.round(totalLTV));
  console.log('');
  console.log('Target CPA (conservative, 30%):', conservativeTargetCPA);
  console.log('Target CPA (aggressive, 50%):', aggressiveTargetCPA);
  console.log('');
  console.log('Expected ROI:');
  console.log('   Conservative:', Math.round((totalLTV / conservativeTargetCPA - 1) * 100) + '%');
  console.log('   Aggressive:', Math.round((totalLTV / aggressiveTargetCPA - 1) * 100) + '%');

  console.log('\n===================================================');
  console.log('  NEW FLOW PREDICTION (Day 1: $3, Day 3: $49, Day 33: $49...)');
  console.log('===================================================\n');

  // Assuming 50% conversion rate and similar retention
  const newFlowConversionRate = 0.5; // User said 50%
  const estimatedRecurringPayments = 3; // Conservative estimate based on old data

  const newFlowTrialRevenue = 3;
  const newFlowRecurringRevenue = newFlowConversionRate * estimatedRecurringPayments * 49;
  const newFlowTotalLTV = newFlowTrialRevenue + newFlowRecurringRevenue;

  console.log('New Flow LTV (estimated):');
  console.log('   Trial: $3.00');
  console.log('   Recurring: $49 x ' + (newFlowConversionRate * estimatedRecurringPayments).toFixed(2) + ' = $' + newFlowRecurringRevenue.toFixed(2));
  console.log('   ----------------------------------------');
  console.log('   TOTAL LTV: $' + newFlowTotalLTV.toFixed(2));
  console.log('');
  console.log('Recommended Conversion Value:', Math.round(newFlowTotalLTV));
  console.log('Recommended Target CPA (30%):', Math.round(newFlowTotalLTV * 0.3));
  console.log('Recommended Target CPA (50%):', Math.round(newFlowTotalLTV * 0.5));

})();
