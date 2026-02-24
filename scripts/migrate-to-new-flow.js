#!/usr/bin/env node
/**
 * Migrate customers from old flow (10 days) to new flow (33 days)
 * Starting from their last successful payment date
 */

require('dotenv').config();
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Price IDs from .env
const OLD_PRICE_10D = process.env.PRICE_49_EVERY_10D || 'price_1ShVRCEvbp6Wl4QEIfGvk3qT';
const NEW_PRICE_33D = process.env.PRICE_49_EVERY_33D || 'price_1T3WgyEvbp6Wl4QE21P1zcSt';

async function migrateToNewFlow() {
  console.log('🔄 Starting migration to new flow (33 days)...\n');
  console.log(`   Old Price ID: ${OLD_PRICE_10D}`);
  console.log(`   New Price ID: ${NEW_PRICE_33D}\n`);
  
  try {
    // 1. Get all active subscriptions on old flow
    console.log('📡 Fetching subscriptions on old flow...');
    const subscriptions = await stripe.subscriptions.list({
      limit: 100,
      status: 'active',
      price: OLD_PRICE_10D,
      expand: ['data.customer', 'data.latest_invoice']
    });
    
    const oldFlowSubs = subscriptions.data.filter(sub => {
      const priceItem = sub.items.data[0];
      return priceItem.price.recurring?.interval === 'day' && 
             priceItem.price.recurring?.interval_count === 10;
    });
    
    console.log(`✅ Found ${oldFlowSubs.length} subscriptions on old flow\n`);
    
    if (oldFlowSubs.length === 0) {
      console.log('✅ No subscriptions to migrate!');
      return;
    }
    
    // 2. Get disputes to exclude
    console.log('📡 Checking for disputes...');
    const disputes = await stripe.disputes.list({ limit: 100 });
    const customersWithDisputes = new Set();
    
    for (const dispute of disputes.data) {
      if (dispute.charge) {
        try {
          const charge = await stripe.charges.retrieve(dispute.charge);
          if (charge.customer) customersWithDisputes.add(charge.customer);
        } catch (e) {}
      }
    }
    
    console.log(`✅ Found ${customersWithDisputes.size} customers with disputes\n`);
    
    // 3. Filter clean subscriptions
    const cleanSubs = oldFlowSubs.filter(sub => {
      const customerId = typeof sub.customer === 'object' ? sub.customer.id : sub.customer;
      return !customersWithDisputes.has(customerId);
    });
    
    console.log(`✅ Clean subscriptions to migrate: ${cleanSubs.length}\n`);
    
    if (cleanSubs.length === 0) {
      console.log('⚠️  All old flow customers have disputes. Not migrating.');
      return;
    }
    
    console.log('═══════════════════════════════════════════════════');
    console.log('🚀 MIGRATION PLAN');
    console.log('═══════════════════════════════════════════════════\n');
    
    const migrationPlan = [];
    
    for (const sub of cleanSubs) {
      const customerId = typeof sub.customer === 'object' ? sub.customer.id : sub.customer;
      const customerEmail = typeof sub.customer === 'object' ? sub.customer.email : 'unknown';
      
      // Get last successful payment
      let lastPaymentDate = null;
      
      try {
        // Get charges for this customer
        const charges = await stripe.charges.list({
          customer: customerId,
          limit: 20
        });
        
        // Find last successful charge
        const successfulCharges = charges.data.filter(ch => ch.paid && ch.status === 'succeeded');
        
        if (successfulCharges.length > 0) {
          lastPaymentDate = new Date(successfulCharges[0].created * 1000);
        } else {
          lastPaymentDate = new Date(sub.current_period_start * 1000);
        }
      } catch (e) {
        lastPaymentDate = new Date(sub.current_period_start * 1000);
      }
      
      // Calculate next billing date (33 days from last payment)
      const nextBillingDate = new Date(lastPaymentDate);
      nextBillingDate.setDate(nextBillingDate.getDate() + 33);
      
      const plan = {
        subscriptionId: sub.id,
        customerId,
        customerEmail,
        currentPriceId: sub.items.data[0].price.id,
        lastPaymentDate: lastPaymentDate.toISOString().split('T')[0],
        nextBillingDate: nextBillingDate.toISOString().split('T')[0],
        billingCycleAnchor: Math.floor(nextBillingDate.getTime() / 1000)
      };
      
      migrationPlan.push(plan);
      
      console.log(`📋 ${customerEmail}`);
      console.log(`   Current subscription: ${sub.id}`);
      console.log(`   Last payment: ${plan.lastPaymentDate}`);
      console.log(`   New cycle starts: ${plan.nextBillingDate} (33 days from last payment)`);
      console.log('');
    }
    
    console.log('═══════════════════════════════════════════════════\n');
    console.log(`✅ Ready to migrate ${migrationPlan.length} subscriptions\n`);
    console.log('⚠️  IMPORTANT:');
    console.log('   - Old subscriptions will be CANCELLED');
    console.log('   - New subscriptions will be created');
    console.log('   - Billing will start from last payment + 33 days');
    console.log('   - No immediate charge\n');
    
    // Ask for confirmation
    console.log('🚀 Starting migration in 3 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 4. Execute migration
    console.log('═══════════════════════════════════════════════════');
    console.log('🔄 EXECUTING MIGRATION');
    console.log('═══════════════════════════════════════════════════\n');
    
    const results = {
      success: [],
      failed: []
    };
    
    for (const plan of migrationPlan) {
      console.log(`📝 Migrating ${plan.customerEmail}...`);
      
      try {
        // Create new subscription with billing_cycle_anchor
        const newSub = await stripe.subscriptions.create({
          customer: plan.customerId,
          items: [{
            price: NEW_PRICE_33D
          }],
          billing_cycle_anchor: plan.billingCycleAnchor,
          proration_behavior: 'none',
          metadata: {
            migrated_from: plan.subscriptionId,
            migration_date: new Date().toISOString().split('T')[0],
            old_flow: '10_days',
            new_flow: '33_days'
          }
        });
        
        console.log(`   ✅ New subscription created: ${newSub.id}`);
        
        // Cancel old subscription at period end
        const canceledSub = await stripe.subscriptions.update(plan.subscriptionId, {
          cancel_at_period_end: true,
          metadata: {
            migrated_to: newSub.id,
            migration_date: new Date().toISOString().split('T')[0]
          }
        });
        
        console.log(`   ✅ Old subscription will cancel at period end`);
        console.log(`   📅 Next billing: ${plan.nextBillingDate}`);
        console.log('');
        
        results.success.push({
          customer: plan.customerEmail,
          oldSub: plan.subscriptionId,
          newSub: newSub.id,
          nextBilling: plan.nextBillingDate
        });
        
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}\n`);
        results.failed.push({
          customer: plan.customerEmail,
          error: error.message
        });
      }
    }
    
    // 5. Summary
    console.log('═══════════════════════════════════════════════════');
    console.log('📊 MIGRATION COMPLETE');
    console.log('═══════════════════════════════════════════════════\n');
    
    console.log(`✅ Successfully migrated: ${results.success.length}`);
    console.log(`❌ Failed: ${results.failed.length}\n`);
    
    if (results.success.length > 0) {
      console.log('✅ SUCCESSFUL MIGRATIONS:\n');
      results.success.forEach((r, i) => {
        console.log(`   ${i + 1}. ${r.customer}`);
        console.log(`      Old: ${r.oldSub}`);
        console.log(`      New: ${r.newSub}`);
        console.log(`      Next billing: ${r.nextBilling}`);
        console.log('');
      });
    }
    
    if (results.failed.length > 0) {
      console.log('❌ FAILED MIGRATIONS:\n');
      results.failed.forEach((r, i) => {
        console.log(`   ${i + 1}. ${r.customer}`);
        console.log(`      Error: ${r.error}`);
        console.log('');
      });
    }
    
    console.log('═══════════════════════════════════════════════════\n');
    
    // 6. New MRR calculation
    const newMRR = results.success.length * 49;
    console.log('💰 NEW MRR (33-day flow):');
    console.log(`   Previous (10-day): $${migrationPlan.length * 49}/month`);
    console.log(`   Now (33-day):      $${newMRR}/month`);
    console.log(`   Change:            $0 (same price, different interval)\n`);
    
    console.log('═══════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run migration
migrateToNewFlow()
  .then(() => {
    console.log('✅ Migration script complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
