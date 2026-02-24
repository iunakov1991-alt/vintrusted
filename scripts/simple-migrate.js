#!/usr/bin/env node
/**
 * Simple migration: just update price to 33-day interval
 */

require('dotenv').config();
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const NEW_PRICE_33D = 'price_1T3WgyEvbp6Wl4QE21P1zcSt';

const migrations = [
  { email: 'Jessegonzales100@gmail.com', sub: 'sub_1T0kfHEvbp6Wl4QEHyJaGvG3' },
  { email: 'thegentch@gmail.com', sub: 'sub_1SzLmgEvbp6Wl4QEMGVCfQJe' },
  { email: 'Khalid2000yaseni@gmail.com', sub: 'sub_1Sv02DEvbp6Wl4QEnSCXLevw' },
  { email: 'Lopez2_jc@yahoo.com', sub: 'sub_1SuEtIEvbp6Wl4QENSPTqcFQ' },
  { email: 'maodarin@gmail.com', sub: 'sub_1StZtbEvbp6Wl4QEWXXQO0HQ' }
];

async function simpleMigrate() {
  console.log('🔄 Migrating to 33-day flow (simple update)\n');
  
  const results = { success: [], failed: [] };
  
  for (const m of migrations) {
    console.log(`📝 ${m.email}...`);
    
    try {
      const sub = await stripe.subscriptions.retrieve(m.sub);
      
      const currentPeriodEnd = new Date(sub.current_period_end * 1000);
      console.log(`   Current period ends: ${currentPeriodEnd.toISOString().split('T')[0]}`);
      
      // Update to new price
      const updated = await stripe.subscriptions.update(m.sub, {
        items: [{
          id: sub.items.data[0].id,
          price: NEW_PRICE_33D
        }],
        proration_behavior: 'none',
        metadata: {
          migrated_to_33_days: 'true',
          migration_date: new Date().toISOString().split('T')[0],
          old_interval: '10_days',
          new_interval: '33_days'
        }
      });
      
      const newPeriodEnd = new Date(updated.current_period_end * 1000);
      
      console.log(`   ✅ Migrated to 33-day cycle`);
      console.log(`   📅 Next charge: ${newPeriodEnd.toISOString().split('T')[0]}`);
      console.log('');
      
      results.success.push({
        email: m.email,
        subscription: m.sub,
        oldPeriodEnd: currentPeriodEnd.toISOString().split('T')[0],
        newPeriodEnd: newPeriodEnd.toISOString().split('T')[0]
      });
      
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}\n`);
      results.failed.push({ email: m.email, error: error.message });
    }
  }
  
  // Summary
  console.log('═══════════════════════════════════════════════════');
  console.log('📊 MIGRATION SUMMARY');
  console.log('═══════════════════════════════════════════════════\n');
  
  console.log(`✅ Successfully migrated: ${results.success.length} / ${migrations.length}`);
  console.log(`❌ Failed: ${results.failed.length}\n`);
  
  if (results.success.length > 0) {
    console.log('✅ MIGRATED CUSTOMERS:\n');
    results.success.forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.email}`);
      console.log(`      Subscription: ${r.subscription}`);
      console.log(`      Old end date: ${r.oldPeriodEnd}`);
      console.log(`      New end date: ${r.newPeriodEnd}`);
      console.log('');
    });
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('💰 UPDATED MRR:\n');
    console.log(`   Customers on 33-day flow: ${results.success.length}`);
    console.log(`   MRR: $${results.success.length * 49}/month`);
    console.log('');
    console.log('💡 BILLING CHANGES:\n');
    console.log('   ✅ Interval: 10 days → 33 days');
    console.log('   ✅ Price: $49 (unchanged)');
    console.log('   ✅ Next charge will happen at new period end');
    console.log('   ✅ Less frequent charges = potentially lower dispute rate\n');
  }
  
  if (results.failed.length > 0) {
    console.log('❌ FAILED:\n');
    results.failed.forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.email}: ${r.error}`);
    });
    console.log('');
  }
  
  console.log('═══════════════════════════════════════════════════\n');
}

simpleMigrate()
  .then(() => {
    console.log('✅ Migration complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
