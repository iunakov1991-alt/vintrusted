#!/usr/bin/env node
/**
 * Cleanup failed migration and migrate via Subscription Schedules
 */

require('dotenv').config();
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const NEW_PRICE_33D = 'price_1T3WgyEvbp6Wl4QE21P1zcSt';

const failedMigrations = [
  {
    email: 'Jessegonzales100@gmail.com',
    newSub: 'sub_1T48T7Evbp6Wl4QELePotOaK',
    schedule: 'sub_sched_1Sx7t2Evbp6Wl4QEWi75mb1a',
    nextBilling: '2026-03-19'
  },
  {
    email: 'thegentch@gmail.com',
    newSub: 'sub_1T48T9Evbp6Wl4QEzq4IjHuN',
    schedule: 'sub_sched_1Svj0LEvbp6Wl4QEAYdc1XvD',
    nextBilling: '2026-03-25'
  },
  {
    email: 'Khalid2000yaseni@gmail.com',
    newSub: 'sub_1T48TAEvbp6Wl4QEjklBMiU3',
    schedule: 'sub_sched_1SrNFrEvbp6Wl4QEN8sBOncB',
    nextBilling: '2026-03-23'
  },
  {
    email: 'Lopez2_jc@yahoo.com',
    newSub: 'sub_1T48TAEvbp6Wl4QEsv2XwyCz',
    schedule: 'sub_sched_1Sqc6mEvbp6Wl4QEsEnlRwqm',
    nextBilling: '2026-03-21'
  },
  {
    email: 'maodarin@gmail.com',
    newSub: 'sub_1T48TBEvbp6Wl4QE5fm0YOt3',
    schedule: 'sub_sched_1Spx7nEvbp6Wl4QE53vGCLyN',
    nextBilling: '2026-03-19'
  }
];

async function cleanupAndMigrate() {
  console.log('🧹 Cleanup and Migration via Subscription Schedules\n');
  
  try {
    // Step 1: Cancel the wrongly created subscriptions
    console.log('═══════════════════════════════════════════════════');
    console.log('🧹 STEP 1: Cleanup failed subscriptions');
    console.log('═══════════════════════════════════════════════════\n');
    
    for (const migration of failedMigrations) {
      console.log(`🗑️  Canceling ${migration.email}...`);
      try {
        await stripe.subscriptions.cancel(migration.newSub);
        console.log(`   ✅ Canceled: ${migration.newSub}\n`);
      } catch (e) {
        console.log(`   ⚠️  Failed to cancel: ${e.message}\n`);
      }
    }
    
    console.log('✅ Cleanup complete!\n');
    
    // Step 2: Migrate via Subscription Schedules
    console.log('═══════════════════════════════════════════════════');
    console.log('🔄 STEP 2: Migrate via Subscription Schedules');
    console.log('═══════════════════════════════════════════════════\n');
    
    const results = {
      success: [],
      failed: []
    };
    
    for (const migration of failedMigrations) {
      console.log(`📝 Migrating ${migration.email}...`);
      
      try {
        // Get existing schedule
        const schedule = await stripe.subscriptionSchedules.retrieve(migration.schedule);
        
        const nextBillingTimestamp = Math.floor(new Date(migration.nextBilling).getTime() / 1000);
        
        // Update schedule to switch to new price at next billing
        const updatedSchedule = await stripe.subscriptionSchedules.update(migration.schedule, {
          phases: [
            {
              items: [{
                price: NEW_PRICE_33D,
                quantity: 1
              }],
              start_date: nextBillingTimestamp,
              end_date: null
            }
          ],
          metadata: {
            migrated_to_33_days: 'true',
            migration_date: new Date().toISOString().split('T')[0]
          }
        });
        
        console.log(`   ✅ Schedule updated: ${migration.schedule}`);
        console.log(`   📅 Will switch to 33-day flow on: ${migration.nextBilling}`);
        console.log('');
        
        results.success.push({
          email: migration.email,
          schedule: migration.schedule,
          nextBilling: migration.nextBilling
        });
        
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}\n`);
        results.failed.push({
          email: migration.email,
          error: error.message
        });
      }
    }
    
    // Summary
    console.log('═══════════════════════════════════════════════════');
    console.log('📊 MIGRATION SUMMARY');
    console.log('═══════════════════════════════════════════════════\n');
    
    console.log(`✅ Successfully migrated: ${results.success.length}`);
    console.log(`❌ Failed: ${results.failed.length}\n`);
    
    if (results.success.length > 0) {
      console.log('✅ SUCCESSFUL MIGRATIONS:\n');
      results.success.forEach((r, i) => {
        console.log(`   ${i + 1}. ${r.email}`);
        console.log(`      Schedule: ${r.schedule}`);
        console.log(`      Switches to 33-day flow: ${r.nextBilling}`);
        console.log('');
      });
    }
    
    if (results.failed.length > 0) {
      console.log('❌ FAILED:\n');
      results.failed.forEach((r, i) => {
        console.log(`   ${i + 1}. ${r.email}`);
        console.log(`      Error: ${r.error}`);
        console.log('');
      });
    }
    
    console.log('═══════════════════════════════════════════════════\n');
    
    if (results.success.length > 0) {
      console.log('💡 WHAT HAPPENS NEXT:\n');
      console.log('   ✅ Old subscriptions will continue until next billing date');
      console.log('   ✅ On next billing date, they will automatically switch to 33-day cycle');
      console.log('   ✅ No immediate charges or disruption to customers');
      console.log('   💰 MRR will remain $245/month\n');
      console.log('═══════════════════════════════════════════════════\n');
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

cleanupAndMigrate()
  .then(() => {
    console.log('✅ Migration complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
