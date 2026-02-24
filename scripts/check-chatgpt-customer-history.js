#!/usr/bin/env node
/**
 * Check full history for ChatGPT customer
 */

require('dotenv').config();
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const CUSTOMER_ID = 'cus_U2AT213Rp6guCk';
const EMAIL = 'Enisbisevic5@gmail.com';

async function checkHistory() {
  console.log('🔍 Checking full history...\n');
  
  try {
    // 1. Get all payment intents
    console.log('═══════════════════════════════════════════════════');
    console.log('💳 PAYMENT INTENTS');
    console.log('═══════════════════════════════════════════════════\n');
    
    const paymentIntents = await stripe.paymentIntents.list({
      customer: CUSTOMER_ID,
      limit: 20
    });
    
    console.log(`Found ${paymentIntents.data.length} PaymentIntent(s)\n`);
    
    if (paymentIntents.data.length > 0) {
      paymentIntents.data.forEach((pi, i) => {
        console.log(`${i + 1}. ${pi.id}`);
        console.log(`   Amount: $${pi.amount / 100}`);
        console.log(`   Status: ${pi.status}`);
        console.log(`   Created: ${new Date(pi.created * 1000).toISOString()}`);
        console.log(`   Description: ${pi.description || 'N/A'}`);
        
        if (pi.metadata && Object.keys(pi.metadata).length > 0) {
          console.log('   Metadata:');
          Object.entries(pi.metadata).forEach(([k, v]) => {
            console.log(`      ${k}: ${v}`);
          });
        }
        console.log('');
      });
    } else {
      console.log('   ℹ️  No PaymentIntents (using SetupIntent flow)\n');
    }
    
    // 2. Check invoices
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📄 INVOICES');
    console.log('═══════════════════════════════════════════════════\n');
    
    const invoices = await stripe.invoices.list({
      customer: CUSTOMER_ID,
      limit: 20
    });
    
    console.log(`Found ${invoices.data.length} invoice(s)\n`);
    
    invoices.data.forEach((inv, i) => {
      console.log(`${i + 1}. ${inv.id}`);
      console.log(`   Amount: $${inv.amount_due / 100}`);
      console.log(`   Status: ${inv.status}`);
      console.log(`   Paid: ${inv.paid ? '✅' : '❌'}`);
      console.log(`   Created: ${new Date(inv.created * 1000).toISOString()}`);
      console.log(`   Subscription: ${inv.subscription || 'none'}`);
      console.log('');
    });
    
    // 3. Check subscription schedules
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📅 SUBSCRIPTION SCHEDULES');
    console.log('═══════════════════════════════════════════════════\n');
    
    const schedules = await stripe.subscriptionSchedules.list({
      customer: CUSTOMER_ID,
      limit: 10
    });
    
    console.log(`Found ${schedules.data.length} schedule(s)\n`);
    
    schedules.data.forEach((sched, i) => {
      console.log(`${i + 1}. ${sched.id}`);
      console.log(`   Status: ${sched.status}`);
      console.log(`   Created: ${new Date(sched.created * 1000).toISOString().split('T')[0]}`);
      
      if (sched.phases && sched.phases.length > 0) {
        console.log('   Phases:');
        sched.phases.forEach((phase, j) => {
          const startDate = new Date(phase.start_date * 1000).toISOString().split('T')[0];
          const endDate = phase.end_date ? new Date(phase.end_date * 1000).toISOString().split('T')[0] : 'ongoing';
          console.log(`      Phase ${j + 1}: ${startDate} → ${endDate}`);
          
          if (phase.items && phase.items.length > 0) {
            phase.items.forEach(item => {
              console.log(`         Price: ${item.price}`);
            });
          }
        });
      }
      console.log('');
    });
    
    console.log('═══════════════════════════════════════════════════\n');
    
    // 4. Summary
    console.log('💡 SUMMARY FOR Enisbisevic5@gmail.com:\n');
    console.log(`   ✅ Trial payment: $2.99 (NEW price!)`);
    console.log(`   📅 Date: 2026-02-23`);
    console.log(`   📍 Source: chatgpt.com`);
    console.log(`   🚗 VIN: 1N6AA1E53JN529679`);
    console.log(`   💳 Card: Amex 3007`);
    console.log('');
    
    if (subscriptions.data.length === 0 && invoices.data.length === 0 && schedules.data.length === 0) {
      console.log('   ⚠️  STATUS: TRIAL ONLY - NO RECURRING SETUP');
      console.log('');
      console.log('   Возможные причины:');
      console.log('   1. Это one-time payment без subscription');
      console.log('   2. Subscription не была создана (баг в коде?)');
      console.log('   3. Клиент отменил подписку сразу после trial');
      console.log('');
    }
    
    console.log('═══════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkHistory()
  .then(() => {
    console.log('✅ History check complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
