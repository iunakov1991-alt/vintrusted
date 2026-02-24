#!/usr/bin/env node
/**
 * Check recent charges for migrated customers
 */

require('dotenv').config();
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const customers = [
  { email: 'Jessegonzales100@gmail.com', sub: 'sub_1T0kfHEvbp6Wl4QEHyJaGvG3' },
  { email: 'thegentch@gmail.com', sub: 'sub_1SzLmgEvbp6Wl4QEMGVCfQJe' },
  { email: 'Khalid2000yaseni@gmail.com', sub: 'sub_1Sv02DEvbp6Wl4QEnSCXLevw' },
  { email: 'Lopez2_jc@yahoo.com', sub: 'sub_1SuEtIEvbp6Wl4QENSPTqcFQ' },
  { email: 'maodarin@gmail.com', sub: 'sub_1StZtbEvbp6Wl4QEWXXQO0HQ' }
];

async function checkRecentCharges() {
  console.log('🔍 Checking recent charges (last 2 hours)...\n');
  
  // Get charges from last 2 hours
  const twoHoursAgo = Math.floor((Date.now() - 2 * 60 * 60 * 1000) / 1000);
  
  try {
    const charges = await stripe.charges.list({
      created: { gte: twoHoursAgo },
      limit: 100
    });
    
    console.log(`✅ Found ${charges.data.length} charges in last 2 hours\n`);
    
    console.log('═══════════════════════════════════════════════════');
    console.log('💳 RECENT CHARGES');
    console.log('═══════════════════════════════════════════════════\n');
    
    for (const customer of customers) {
      console.log(`📋 ${customer.email}`);
      
      // Get subscription to find customer ID
      const sub = await stripe.subscriptions.retrieve(customer.sub);
      const customerId = sub.customer;
      
      // Filter charges for this customer
      const customerCharges = charges.data.filter(ch => ch.customer === customerId);
      
      if (customerCharges.length === 0) {
        console.log(`   ℹ️  No charges in last 2 hours\n`);
      } else {
        customerCharges.forEach(charge => {
          const time = new Date(charge.created * 1000);
          console.log(`   💳 Charge: ${charge.id}`);
          console.log(`      Amount: $${charge.amount / 100}`);
          console.log(`      Status: ${charge.status}`);
          console.log(`      Paid: ${charge.paid ? '✅' : '❌'}`);
          console.log(`      Time: ${time.toISOString()}`);
          console.log(`      Description: ${charge.description || 'N/A'}`);
          
          if (charge.failure_message) {
            console.log(`      ❌ Failure: ${charge.failure_message}`);
          }
          
          console.log('');
        });
      }
    }
    
    console.log('═══════════════════════════════════════════════════\n');
    
    // Get subscription details
    console.log('═══════════════════════════════════════════════════');
    console.log('📊 CURRENT SUBSCRIPTION STATUS');
    console.log('═══════════════════════════════════════════════════\n');
    
    for (const customer of customers) {
      const sub = await stripe.subscriptions.retrieve(customer.sub, {
        expand: ['latest_invoice']
      });
      
      const price = sub.items.data[0].price;
      
      console.log(`📋 ${customer.email}`);
      console.log(`   Subscription: ${sub.id}`);
      console.log(`   Status: ${sub.status}`);
      console.log(`   Price: $${price.unit_amount / 100} every ${price.recurring.interval_count} ${price.recurring.interval}(s)`);
      console.log(`   Current period: ${new Date(sub.current_period_start * 1000).toISOString().split('T')[0]} → ${new Date(sub.current_period_end * 1000).toISOString().split('T')[0]}`);
      
      if (sub.latest_invoice && typeof sub.latest_invoice === 'object') {
        const invoice = sub.latest_invoice;
        console.log(`   Latest invoice: ${invoice.id}`);
        console.log(`   Invoice status: ${invoice.status}`);
        console.log(`   Invoice amount: $${invoice.amount_due / 100}`);
        console.log(`   Invoice paid: ${invoice.paid ? '✅' : '❌'}`);
        
        if (!invoice.paid && invoice.attempted) {
          console.log(`   ⚠️  Payment attempted but failed`);
        }
      }
      
      console.log('');
    }
    
    console.log('═══════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkRecentCharges()
  .then(() => {
    console.log('✅ Check complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
