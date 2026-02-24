#!/usr/bin/env node
/**
 * Count Active Paying Customers without Disputes
 */

require('dotenv').config();
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

async function countActivePaying() {
  console.log('🔍 Analyzing active paying customers...\n');
  
  try {
    // 1. Get all active subscriptions
    console.log('📡 Fetching active subscriptions...');
    let allSubscriptions = [];
    let hasMore = true;
    let startingAfter = null;
    
    while (hasMore) {
      const params = {
        limit: 100,
        status: 'active'
      };
      
      if (startingAfter) {
        params.starting_after = startingAfter;
      }
      
      const subs = await stripe.subscriptions.list(params);
      allSubscriptions = allSubscriptions.concat(subs.data);
      hasMore = subs.has_more;
      
      if (hasMore && subs.data.length > 0) {
        startingAfter = subs.data[subs.data.length - 1].id;
      }
      
      console.log(`   ✓ Fetched ${allSubscriptions.length} subscriptions so far...`);
    }
    
    console.log(`\n✅ Total active subscriptions: ${allSubscriptions.length}\n`);
    
    // 2. Get all disputes
    console.log('📡 Fetching disputes...');
    let allDisputes = [];
    hasMore = true;
    startingAfter = null;
    
    while (hasMore) {
      const params = {
        limit: 100
      };
      
      if (startingAfter) {
        params.starting_after = startingAfter;
      }
      
      const disputes = await stripe.disputes.list(params);
      allDisputes = allDisputes.concat(disputes.data);
      hasMore = disputes.has_more;
      
      if (hasMore && disputes.data.length > 0) {
        startingAfter = disputes.data[disputes.data.length - 1].id;
      }
      
      console.log(`   ✓ Fetched ${allDisputes.length} disputes so far...`);
    }
    
    console.log(`\n✅ Total disputes: ${allDisputes.length}\n`);
    
    // 3. Create set of customer IDs with disputes
    const customersWithDisputes = new Set();
    
    for (const dispute of allDisputes) {
      if (dispute.charge) {
        // Get charge to find customer
        try {
          const charge = await stripe.charges.retrieve(dispute.charge);
          if (charge.customer) {
            customersWithDisputes.add(charge.customer);
          }
        } catch (e) {
          console.error(`   ⚠️  Could not retrieve charge ${dispute.charge}`);
        }
      }
    }
    
    console.log(`📊 Customers with disputes: ${customersWithDisputes.size}\n`);
    
    // 4. Filter subscriptions without disputes
    const activeWithoutDisputes = allSubscriptions.filter(sub => {
      return !customersWithDisputes.has(sub.customer);
    });
    
    // 5. Get unique customer count
    const uniqueCustomers = new Set(activeWithoutDisputes.map(sub => sub.customer));
    
    // 6. Calculate MRR (Monthly Recurring Revenue)
    let totalMRR = 0;
    const customerDetails = {};
    
    for (const sub of activeWithoutDisputes) {
      const amount = sub.items.data.reduce((sum, item) => {
        return sum + (item.price.unit_amount || 0);
      }, 0);
      
      totalMRR += amount;
      
      if (!customerDetails[sub.customer]) {
        customerDetails[sub.customer] = {
          subscriptions: [],
          totalAmount: 0
        };
      }
      
      customerDetails[sub.customer].subscriptions.push({
        id: sub.id,
        amount: amount / 100,
        interval: sub.items.data[0]?.price?.recurring?.interval || 'unknown',
        status: sub.status,
        created: new Date(sub.created * 1000).toISOString().split('T')[0]
      });
      
      customerDetails[sub.customer].totalAmount += amount / 100;
    }
    
    // 7. Print results
    console.log('═══════════════════════════════════════════════════');
    console.log('📊 ACTIVE PAYING CUSTOMERS (WITHOUT DISPUTES)');
    console.log('═══════════════════════════════════════════════════\n');
    
    console.log(`👥 TOTAL CUSTOMERS: ${uniqueCustomers.size}`);
    console.log(`📋 TOTAL SUBSCRIPTIONS: ${activeWithoutDisputes.length}`);
    console.log(`💰 MONTHLY RECURRING REVENUE: $${(totalMRR / 100).toFixed(2)}`);
    console.log(`💵 AVERAGE PER CUSTOMER: $${(totalMRR / 100 / uniqueCustomers.size).toFixed(2)}\n`);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // 8. Breakdown by subscription count
    const subscriptionCounts = {};
    for (const customerId in customerDetails) {
      const count = customerDetails[customerId].subscriptions.length;
      subscriptionCounts[count] = (subscriptionCounts[count] || 0) + 1;
    }
    
    console.log('📊 BREAKDOWN BY SUBSCRIPTIONS PER CUSTOMER:\n');
    Object.entries(subscriptionCounts).sort((a, b) => a[0] - b[0]).forEach(([count, customers]) => {
      console.log(`   ${count} subscription(s): ${customers} customer(s)`);
    });
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // 9. Breakdown by interval
    const intervalBreakdown = {
      day: { count: 0, mrr: 0 },
      week: { count: 0, mrr: 0 },
      month: { count: 0, mrr: 0 },
      year: { count: 0, mrr: 0 },
      unknown: { count: 0, mrr: 0 }
    };
    
    for (const sub of activeWithoutDisputes) {
      const interval = sub.items.data[0]?.price?.recurring?.interval || 'unknown';
      const amount = sub.items.data.reduce((sum, item) => sum + (item.price.unit_amount || 0), 0);
      
      if (intervalBreakdown[interval]) {
        intervalBreakdown[interval].count++;
        intervalBreakdown[interval].mrr += amount / 100;
      } else {
        intervalBreakdown.unknown.count++;
        intervalBreakdown.unknown.mrr += amount / 100;
      }
    }
    
    console.log('📊 BREAKDOWN BY BILLING INTERVAL:\n');
    Object.entries(intervalBreakdown).forEach(([interval, data]) => {
      if (data.count > 0) {
        console.log(`   ${interval}: ${data.count} subscriptions ($${data.mrr.toFixed(2)} MRR)`);
      }
    });
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // 10. Excluded customers (with disputes)
    if (customersWithDisputes.size > 0) {
      console.log(`⚠️  EXCLUDED FROM COUNT:\n`);
      console.log(`   Customers with disputes: ${customersWithDisputes.size}`);
      
      const excludedSubs = allSubscriptions.filter(sub => customersWithDisputes.has(sub.customer));
      const excludedMRR = excludedSubs.reduce((sum, sub) => {
        return sum + sub.items.data.reduce((itemSum, item) => itemSum + (item.price.unit_amount || 0), 0);
      }, 0);
      
      console.log(`   Subscriptions excluded: ${excludedSubs.length}`);
      console.log(`   MRR excluded: $${(excludedMRR / 100).toFixed(2)}\n`);
    }
    
    console.log('═══════════════════════════════════════════════════\n');
    
    // 11. Summary
    console.log('💡 SUMMARY:\n');
    console.log(`   ✅ Active paying customers (no disputes): ${uniqueCustomers.size}`);
    console.log(`   ❌ Customers with disputes: ${customersWithDisputes.size}`);
    console.log(`   📊 Total customers in system: ${uniqueCustomers.size + customersWithDisputes.size}`);
    console.log(`   💰 Clean MRR: $${(totalMRR / 100).toFixed(2)}/month`);
    console.log(`   📈 Health rate: ${((uniqueCustomers.size / (uniqueCustomers.size + customersWithDisputes.size)) * 100).toFixed(1)}%\n`);
    
    console.log('═══════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

countActivePaying()
  .then(() => {
    console.log('✅ Analysis complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
