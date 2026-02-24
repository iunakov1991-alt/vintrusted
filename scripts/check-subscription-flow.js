#!/usr/bin/env node
/**
 * Check which flow active customers are on
 * OLD: 1($1)/10($49)/10($49)/10($49)
 * NEW: 1($3)/3($49)/33($49)
 */

require('dotenv').config();
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

async function checkFlows() {
  console.log('🔍 Checking subscription flows...\n');
  
  try {
    // 1. Get all active subscriptions
    console.log('📡 Fetching active subscriptions...');
    let allSubscriptions = [];
    let hasMore = true;
    let startingAfter = null;
    
    while (hasMore) {
      const params = {
        limit: 100,
        status: 'active',
        expand: ['data.customer', 'data.items.data.price']
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
    }
    
    console.log(`✅ Found ${allSubscriptions.length} active subscriptions\n`);
    
    // 2. Get all disputes
    console.log('📡 Fetching disputes...');
    let allDisputes = [];
    hasMore = true;
    startingAfter = null;
    
    while (hasMore) {
      const params = { limit: 100 };
      if (startingAfter) params.starting_after = startingAfter;
      
      const disputes = await stripe.disputes.list(params);
      allDisputes = allDisputes.concat(disputes.data);
      hasMore = disputes.has_more;
      
      if (hasMore && disputes.data.length > 0) {
        startingAfter = disputes.data[disputes.data.length - 1].id;
      }
    }
    
    // 3. Create set of customer IDs with disputes
    const customersWithDisputes = new Set();
    for (const dispute of allDisputes) {
      if (dispute.charge) {
        try {
          const charge = await stripe.charges.retrieve(dispute.charge);
          if (charge.customer) customersWithDisputes.add(charge.customer);
        } catch (e) {}
      }
    }
    
    console.log(`✅ Found ${allDisputes.length} disputes (${customersWithDisputes.size} unique customers)\n`);
    
    // 4. Filter clean subscriptions
    const cleanSubscriptions = allSubscriptions.filter(sub => {
      return !customersWithDisputes.has(sub.customer);
    });
    
    console.log(`✅ Clean subscriptions (no disputes): ${cleanSubscriptions.length}\n`);
    
    // 5. Analyze flows
    const flows = {
      old_10day: [],      // Old flow: every 10 days
      new_33day: [],      // New flow: every 33 days
      monthly: [],        // Monthly
      other: []           // Unknown
    };
    
    for (const sub of cleanSubscriptions) {
      const priceItem = sub.items.data[0];
      const price = priceItem.price;
      const interval = price.recurring?.interval;
      const intervalCount = price.recurring?.interval_count;
      const amount = price.unit_amount / 100;
      
      const customerEmail = typeof sub.customer === 'object' ? sub.customer.email : 'unknown';
      const customerName = typeof sub.customer === 'object' ? sub.customer.name : 'unknown';
      
      const subInfo = {
        subscriptionId: sub.id,
        customerId: typeof sub.customer === 'object' ? sub.customer.id : sub.customer,
        customerEmail,
        customerName,
        priceId: price.id,
        amount,
        interval,
        intervalCount,
        created: new Date(sub.created * 1000).toISOString().split('T')[0],
        currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString().split('T')[0]
      };
      
      // Categorize by flow
      if (interval === 'day' && intervalCount === 10) {
        flows.old_10day.push(subInfo);
      } else if (interval === 'day' && intervalCount === 33) {
        flows.new_33day.push(subInfo);
      } else if (interval === 'month' && intervalCount === 1) {
        flows.monthly.push(subInfo);
      } else {
        flows.other.push(subInfo);
      }
    }
    
    // 6. Print results
    console.log('═══════════════════════════════════════════════════');
    console.log('📊 SUBSCRIPTION FLOW BREAKDOWN');
    console.log('═══════════════════════════════════════════════════\n');
    
    // OLD FLOW
    console.log('🕐 OLD FLOW (каждые 10 дней):');
    if (flows.old_10day.length === 0) {
      console.log('   ✅ НЕТ - все перешли!\n');
    } else {
      console.log(`   ❌ ${flows.old_10day.length} клиент(ов) все еще на старом флоу\n`);
      flows.old_10day.forEach((sub, i) => {
        console.log(`   ${i + 1}. ${sub.customerEmail || sub.customerId}`);
        console.log(`      Подписка: ${sub.subscriptionId}`);
        console.log(`      Сумма: $${sub.amount} каждые ${sub.intervalCount} дней`);
        console.log(`      Создана: ${sub.created}`);
        console.log(`      Следующее списание: ${sub.currentPeriodEnd}`);
        console.log('');
      });
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // NEW FLOW
    console.log('🆕 NEW FLOW (каждые 33 дня):');
    if (flows.new_33day.length === 0) {
      console.log('   ⚠️  НЕТ - никто не на новом флоу!\n');
    } else {
      console.log(`   ✅ ${flows.new_33day.length} клиент(ов) на новом флоу\n`);
      flows.new_33day.forEach((sub, i) => {
        console.log(`   ${i + 1}. ${sub.customerEmail || sub.customerId}`);
        console.log(`      Подписка: ${sub.subscriptionId}`);
        console.log(`      Сумма: $${sub.amount} каждые ${sub.intervalCount} дней`);
        console.log(`      Создана: ${sub.created}`);
        console.log(`      Следующее списание: ${sub.currentPeriodEnd}`);
        console.log('');
      });
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // MONTHLY
    console.log('📅 MONTHLY (ежемесячно):');
    if (flows.monthly.length === 0) {
      console.log('   НЕТ\n');
    } else {
      console.log(`   ${flows.monthly.length} клиент(ов)\n`);
      flows.monthly.forEach((sub, i) => {
        console.log(`   ${i + 1}. ${sub.customerEmail || sub.customerId}`);
        console.log(`      Подписка: ${sub.subscriptionId}`);
        console.log(`      Сумма: $${sub.amount}/месяц`);
        console.log(`      Создана: ${sub.created}`);
        console.log(`      Следующее списание: ${sub.currentPeriodEnd}`);
        console.log('');
      });
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // OTHER
    if (flows.other.length > 0) {
      console.log('❓ OTHER (неизвестный интервал):');
      console.log(`   ${flows.other.length} подписок\n`);
      flows.other.forEach((sub, i) => {
        console.log(`   ${i + 1}. ${sub.customerEmail || sub.customerId}`);
        console.log(`      Подписка: ${sub.subscriptionId}`);
        console.log(`      Интервал: ${sub.intervalCount} ${sub.interval}`);
        console.log(`      Сумма: $${sub.amount}`);
        console.log('');
      });
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }
    
    // 7. Summary
    const totalClean = flows.old_10day.length + flows.new_33day.length + flows.monthly.length + flows.other.length;
    
    console.log('═══════════════════════════════════════════════════');
    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════════════════\n');
    
    console.log(`📋 Всего активных (без диспутов): ${totalClean}\n`);
    
    console.log(`🕐 Старый флоу (10 дней):  ${flows.old_10day.length} (${(flows.old_10day.length / totalClean * 100).toFixed(1)}%)`);
    console.log(`🆕 Новый флоу (33 дня):    ${flows.new_33day.length} (${(flows.new_33day.length / totalClean * 100).toFixed(1)}%)`);
    console.log(`📅 Monthly:                 ${flows.monthly.length} (${(flows.monthly.length / totalClean * 100).toFixed(1)}%)`);
    if (flows.other.length > 0) {
      console.log(`❓ Other:                   ${flows.other.length} (${(flows.other.length / totalClean * 100).toFixed(1)}%)`);
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // MRR breakdown
    const mrrOld = flows.old_10day.reduce((sum, s) => sum + s.amount, 0);
    const mrrNew = flows.new_33day.reduce((sum, s) => sum + s.amount, 0);
    const mrrMonthly = flows.monthly.reduce((sum, s) => sum + s.amount, 0);
    const mrrOther = flows.other.reduce((sum, s) => sum + s.amount, 0);
    
    console.log('💰 MRR BREAKDOWN:\n');
    console.log(`   Старый флоу: $${mrrOld.toFixed(2)}/месяц`);
    console.log(`   Новый флоу:  $${mrrNew.toFixed(2)}/месяц`);
    console.log(`   Monthly:     $${mrrMonthly.toFixed(2)}/месяц`);
    if (mrrOther > 0) {
      console.log(`   Other:       $${mrrOther.toFixed(2)}/месяц`);
    }
    console.log(`   ─────────────────────────────`);
    console.log(`   TOTAL:       $${(mrrOld + mrrNew + mrrMonthly + mrrOther).toFixed(2)}/месяц\n`);
    
    console.log('═══════════════════════════════════════════════════\n');
    
    // 8. Recommendation
    if (flows.old_10day.length > 0) {
      console.log('💡 РЕКОМЕНДАЦИЯ:\n');
      console.log(`   ⚠️  У вас еще ${flows.old_10day.length} клиент(ов) на СТАРОМ флоу!`);
      console.log(`   💸 Это $${mrrOld.toFixed(2)}/месяц MRR`);
      console.log('\n   Что делать:');
      console.log('   1. Оставить как есть (пока платят)');
      console.log('   2. Мигрировать на новый флоу (33 дня)');
      console.log('   3. Дождаться естественной отмены\n');
      console.log('═══════════════════════════════════════════════════\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkFlows()
  .then(() => {
    console.log('✅ Analysis complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
