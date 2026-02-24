#!/usr/bin/env node
/**
 * Release subscriptions from schedules and migrate to new flow
 */

require('dotenv').config();
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const NEW_PRICE_33D = 'price_1T3WgyEvbp6Wl4QE21P1zcSt';

const migrations = [
  {
    email: 'Jessegonzales100@gmail.com',
    oldSub: 'sub_1T0kfHEvbp6Wl4QEHyJaGvG3',
    schedule: 'sub_sched_1Sx7t2Evbp6Wl4QEWi75mb1a',
    lastPayment: '2026-02-14',
    nextBilling: '2026-03-19'
  },
  {
    email: 'thegentch@gmail.com',
    oldSub: 'sub_1SzLmgEvbp6Wl4QEMGVCfQJe',
    schedule: 'sub_sched_1Svj0LEvbp6Wl4QEAYdc1XvD',
    lastPayment: '2026-02-20',
    nextBilling: '2026-03-25'
  },
  {
    email: 'Khalid2000yaseni@gmail.com',
    oldSub: 'sub_1Sv02DEvbp6Wl4QEnSCXLevw',
    schedule: 'sub_sched_1SrNFrEvbp6Wl4QEN8sBOncB',
    lastPayment: '2026-02-18',
    nextBilling: '2026-03-23'
  },
  {
    email: 'Lopez2_jc@yahoo.com',
    oldSub: 'sub_1SuEtIEvbp6Wl4QENSPTqcFQ',
    schedule: 'sub_sched_1Sqc6mEvbp6Wl4QEsEnlRwqm',
    lastPayment: '2026-02-16',
    nextBilling: '2026-03-21'
  },
  {
    email: 'maodarin@gmail.com',
    oldSub: 'sub_1StZtbEvbp6Wl4QEWXXQO0HQ',
    schedule: 'sub_sched_1Spx7nEvbp6Wl4QE53vGCLyN',
    lastPayment: '2026-02-14',
    nextBilling: '2026-03-19'
  }
];

async function releaseAndMigrate() {
  console.log('🔄 Release from Schedules and Migrate\n');
  
  const results = {
    success: [],
    failed: []
  };
  
  try {
    console.log('═══════════════════════════════════════════════════');
    console.log('🔓 STEP 1: Release subscriptions from schedules');
    console.log('═══════════════════════════════════════════════════\n');
    
    for (const m of migrations) {
      console.log(`🔓 Releasing ${m.email}...`);
      
      try {
        // Release subscription from schedule
        await stripe.subscriptionSchedules.release(m.schedule);
        console.log(`   ✅ Released from schedule: ${m.schedule}\n`);
      } catch (e) {
        console.log(`   ⚠️  Could not release: ${e.message}\n`);
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log('🔄 STEP 2: Update subscriptions to new flow');
    console.log('═══════════════════════════════════════════════════\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    for (const m of migrations) {
      console.log(`📝 Migrating ${m.email}...`);
      
      try {
        // Get current subscription
        const sub = await stripe.subscriptions.retrieve(m.oldSub);
        
        const nextBillingTimestamp = Math.floor(new Date(m.nextBilling).getTime() / 1000);
        
        // Update subscription to new price
        const updated = await stripe.subscriptions.update(m.oldSub, {
          items: [{
            id: sub.items.data[0].id,
            price: NEW_PRICE_33D
          }],
          billing_cycle_anchor: nextBillingTimestamp,
          proration_behavior: 'none',
          metadata: {
            migrated_to_33_days: 'true',
            migration_date: new Date().toISOString().split('T')[0],
            old_flow: '10_days',
            new_flow: '33_days'
          }
        });
        
        console.log(`   ✅ Updated to 33-day flow`);
        console.log(`   📅 Next billing: ${m.nextBilling}`);
        console.log('');
        
        results.success.push({
          email: m.email,
          subscription: m.oldSub,
          nextBilling: m.nextBilling
        });
        
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}\n`);
        results.failed.push({
          email: m.email,
          error: error.message
        });
      }
    }
    
    // Summary
    console.log('═══════════════════════════════════════════════════');
    console.log('📊 MIGRATION COMPLETE');
    console.log('═══════════════════════════════════════════════════\n');
    
    console.log(`✅ Successfully migrated: ${results.success.length} / ${migrations.length}`);
    console.log(`❌ Failed: ${results.failed.length}\n`);
    
    if (results.success.length > 0) {
      console.log('✅ SUCCESSFUL MIGRATIONS:\n');
      results.success.forEach((r, i) => {
        console.log(`   ${i + 1}. ${r.email}`);
        console.log(`      Subscription: ${r.subscription}`);
        console.log(`      Next billing (33-day cycle): ${r.nextBilling}`);
        console.log('');
      });
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      console.log('💰 UPDATED MRR:\n');
      console.log(`   Customers on 33-day flow: ${results.success.length}`);
      console.log(`   MRR: $${results.success.length * 49}/month`);
      console.log('');
      
      console.log('💡 WHAT CHANGED:\n');
      console.log('   ✅ Billing interval: 10 days → 33 days');
      console.log('   ✅ Next charge date: Based on last payment + 33 days');
      console.log('   ✅ Price: Still $49 (unchanged)');
      console.log('   ✅ Less frequent charges = lower dispute rate\n');
    }
    
    if (results.failed.length > 0) {
      console.log('❌ FAILED MIGRATIONS:\n');
      results.failed.forEach((r, i) => {
        console.log(`   ${i + 1}. ${r.email}`);
        console.log(`      Error: ${r.error}`);
        console.log('');
      });
    }
    
    console.log('═══════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

releaseAndMigrate()
  .then(() => {
    console.log('✅ Migration script complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
