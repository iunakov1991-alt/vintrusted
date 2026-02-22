/**
 * Сравнение модели: 10 дней vs 30 дней до первого $49
 * 
 * Этот скрипт:
 * 1. Анализирует текущую модель (10 дней)
 * 2. Моделирует альтернативу (30 дней)
 * 3. Сравнивает cash flow, churn, Payment CR
 * 
 * Запуск: node scripts/compare-30-day-model.js
 */

import Stripe from 'stripe';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, '../.env.local') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Определяет tier карты
 */
function getCardTier(paymentMethod) {
  const card = paymentMethod?.card;
  
  if (!card) {
    return { tier: 'unknown', successRate10d: 0, successRate30d: 0 };
  }

  if (card.checks?.cvc_check === 'fail') {
    return { tier: 'fraud', successRate10d: 0.05, successRate30d: 0.03 }; // Хуже через 30 дней
  }

  if ((card.funding === 'credit' || card.funding === 'debit') && card.checks?.cvc_check === 'pass') {
    return { 
      tier: 'premium', 
      successRate10d: 0.85, 
      successRate30d: 0.75 // Чуть хуже (забудут, передумают)
    };
  }

  if (card.funding === 'prepaid') {
    return { 
      tier: 'medium-prepaid', 
      successRate10d: 0.40, 
      successRate30d: 0.55 // Лучше (успеют пополнить)
    };
  }

  return { 
    tier: 'medium', 
    successRate10d: 0.60, 
    successRate30d: 0.65 // Немного лучше
  };
}

/**
 * Рассчитывает churn rate (процент кто отпишется до первого платежа)
 */
function getChurnRate(days) {
  // Чем дольше ждать, тем выше churn
  // 10 дней: ~10% отвалятся
  // 30 дней: ~25% отвалятся
  return Math.min(0.10 + (days - 10) * 0.0075, 0.30);
}

async function compareModels() {
  console.log('📊 Comparing: 10 days vs 30 days until first $49 payment\n');

  try {
    // Получаем все $1 payments за последние 30 дней
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
    
    let allPaymentIntents = [];
    let hasMore = true;
    let startingAfter = undefined;

    while (hasMore) {
      const paymentIntents = await stripe.paymentIntents.list({
        limit: 100,
        created: { gte: thirtyDaysAgo },
        starting_after: startingAfter
      });

      const filteredIntents = paymentIntents.data.filter(pi =>
        pi.status === 'succeeded' &&
        pi.amount === 299 // $2.99
      );

      allPaymentIntents = allPaymentIntents.concat(filteredIntents);
      hasMore = paymentIntents.has_more;
      if (hasMore) {
        startingAfter = paymentIntents.data[paymentIntents.data.length - 1].id;
      }
    }

    console.log(`✅ Found ${allPaymentIntents.length} successful $1 trials in last 30 days\n`);

    // Разделяем на когорты
    const now = Math.floor(Date.now() / 1000);
    const tenDaysAgo = now - (10 * 24 * 60 * 60);
    
    const cohort_0_10 = []; // 0-10 дней назад (текущий pipeline 10d модели)
    const cohort_10_30 = []; // 10-30 дней назад (НЕ в pipeline 10d модели, но были бы в 30d)
    const cohort_all = []; // Все (pipeline 30d модели)

    let totalActive = 0; // Customers с валидной картой

    // Анализируем каждый payment
    for (const pi of allPaymentIntents) {
      try {
        const customerId = pi.customer;
        if (!customerId) continue;

        // Проверяем не удален ли customer
        let customer;
        try {
          customer = await stripe.customers.retrieve(customerId);
        } catch (e) {
          if (e.code === 'resource_missing') continue;
          throw e;
        }

        // Проверяем есть ли subscription
        const schedules = await stripe.subscriptionSchedules.list({
          customer: customerId,
          limit: 1
        });

        if (schedules.data.length === 0) continue;

        // Получаем payment method
        const paymentMethodId = pi.payment_method;
        if (!paymentMethodId) continue;

        let pm;
        try {
          pm = await stripe.paymentMethods.retrieve(paymentMethodId);
        } catch (e) {
          continue;
        }

        const cardInfo = getCardTier(pm);
        if (cardInfo.tier === 'unknown') continue;

        totalActive++;

        const daysAgo = (now - pi.created) / (24 * 60 * 60);
        
        const customerData = {
          email: customer.email || 'N/A',
          created: pi.created,
          daysAgo: daysAgo.toFixed(1),
          tier: cardInfo.tier,
          successRate10d: cardInfo.successRate10d,
          successRate30d: cardInfo.successRate30d,
          funding: pm.card?.funding || 'unknown'
        };

        cohort_all.push(customerData);

        if (daysAgo <= 10) {
          cohort_0_10.push(customerData);
        } else {
          cohort_10_30.push(customerData);
        }

      } catch (error) {
        // Пропускаем
      }
    }

    console.log('============================================================');
    console.log('📊 COHORT ANALYSIS:');
    console.log('============================================================\n');

    console.log(`Total active customers (with valid cards): ${totalActive}\n`);

    console.log(`📅 0-10 days old: ${cohort_0_10.length} customers`);
    console.log(`   → In pipeline for 10-day model: YES ✅`);
    console.log(`   → In pipeline for 30-day model: YES ✅\n`);

    console.log(`📅 10-30 days old: ${cohort_10_30.length} customers`);
    console.log(`   → In pipeline for 10-day model: NO ❌ (already charged or churned)`);
    console.log(`   → In pipeline for 30-day model: YES ✅\n`);

    console.log(`📅 All (0-30 days): ${cohort_all.length} customers\n`);

    // Считаем tier distribution для каждой когорты
    function analyzeCohort(cohort, name) {
      const byTier = {
        premium: cohort.filter(c => c.tier === 'premium'),
        medium: cohort.filter(c => c.tier.startsWith('medium') && c.tier !== 'medium-prepaid'),
        prepaid: cohort.filter(c => c.tier === 'medium-prepaid'),
        fraud: cohort.filter(c => c.tier === 'fraud')
      };

      console.log(`\n📊 ${name} (${cohort.length} customers):`);
      console.log(`   🟢 Premium: ${byTier.premium.length} (${((byTier.premium.length/cohort.length)*100).toFixed(0)}%)`);
      console.log(`   🟡 Medium: ${byTier.medium.length} (${((byTier.medium.length/cohort.length)*100).toFixed(0)}%)`);
      console.log(`   🟡 Prepaid: ${byTier.prepaid.length} (${((byTier.prepaid.length/cohort.length)*100).toFixed(0)}%)`);
      if (byTier.fraud.length > 0) {
        console.log(`   🔴 Fraud: ${byTier.fraud.length} (${((byTier.fraud.length/cohort.length)*100).toFixed(0)}%)`);
      }

      return byTier;
    }

    const tier_0_10 = analyzeCohort(cohort_0_10, 'Cohort 0-10 days');
    const tier_10_30 = analyzeCohort(cohort_10_30, 'Cohort 10-30 days');
    const tier_all = analyzeCohort(cohort_all, 'All cohorts (0-30 days)');

    console.log('\n============================================================');
    console.log('💰 MODEL COMPARISON:');
    console.log('============================================================\n');

    // MODEL 1: 10 days (current)
    const churnRate10d = getChurnRate(10);
    const activeAfterChurn10d = cohort_0_10.length * (1 - churnRate10d);
    
    let projectedRevenue10d = 0;
    cohort_0_10.forEach(c => {
      projectedRevenue10d += 49 * c.successRate10d * (1 - churnRate10d);
    });

    console.log('🔵 MODEL 1: First $49 after 10 days (CURRENT)');
    console.log('─────────────────────────────────────────────────────\n');
    console.log(`   Pipeline size: ${cohort_0_10.length} customers`);
    console.log(`   Churn rate: ${(churnRate10d * 100).toFixed(1)}% (customers who cancel before 1st $49)`);
    console.log(`   Active after churn: ${activeAfterChurn10d.toFixed(0)} customers\n`);
    
    // Success rate by tier
    const premiumSuccess10d = tier_0_10.premium.length * 0.85 * (1 - churnRate10d);
    const mediumSuccess10d = tier_0_10.medium.length * 0.60 * (1 - churnRate10d);
    const prepaidSuccess10d = tier_0_10.prepaid.length * 0.40 * (1 - churnRate10d);
    
    console.log('   Expected successful $49 payments:');
    console.log(`      🟢 Premium: ${premiumSuccess10d.toFixed(1)} / ${tier_0_10.premium.length} (${tier_0_10.premium.length > 0 ? ((premiumSuccess10d/tier_0_10.premium.length)*100).toFixed(0) : 0}%)`);
    console.log(`      🟡 Medium: ${mediumSuccess10d.toFixed(1)} / ${tier_0_10.medium.length} (${tier_0_10.medium.length > 0 ? ((mediumSuccess10d/tier_0_10.medium.length)*100).toFixed(0) : 0}%)`);
    console.log(`      🟡 Prepaid: ${prepaidSuccess10d.toFixed(1)} / ${tier_0_10.prepaid.length} (${tier_0_10.prepaid.length > 0 ? ((prepaidSuccess10d/tier_0_10.prepaid.length)*100).toFixed(0) : 0}%)`);
    console.log(`      Total: ${(premiumSuccess10d + mediumSuccess10d + prepaidSuccess10d).toFixed(1)} / ${cohort_0_10.length} (${((premiumSuccess10d + mediumSuccess10d + prepaidSuccess10d)/cohort_0_10.length*100).toFixed(0)}%)\n`);
    
    console.log(`   💰 Projected revenue: $${projectedRevenue10d.toFixed(2)}`);
    console.log(`   📈 Overall Payment CR: ${((premiumSuccess10d + mediumSuccess10d + prepaidSuccess10d) / cohort_0_10.length * 100).toFixed(1)}%\n`);
    console.log(`   ⏱️  Time to first revenue: 10 days`);
    console.log(`   💵 Cash flow: ${cohort_0_10.length} × $1 = $${cohort_0_10.length} (immediate)`);
    console.log(`                + $${projectedRevenue10d.toFixed(2)} (in 10 days)\n`);

    // MODEL 2: 30 days
    const churnRate30d = getChurnRate(30);
    const activeAfterChurn30d = cohort_all.length * (1 - churnRate30d);
    
    let projectedRevenue30d = 0;
    cohort_all.forEach(c => {
      projectedRevenue30d += 49 * c.successRate30d * (1 - churnRate30d);
    });

    console.log('\n🟢 MODEL 2: First $49 after 30 days (ALTERNATIVE)');
    console.log('─────────────────────────────────────────────────────\n');
    console.log(`   Pipeline size: ${cohort_all.length} customers`);
    console.log(`   Churn rate: ${(churnRate30d * 100).toFixed(1)}% (customers who cancel before 1st $49)`);
    console.log(`   Active after churn: ${activeAfterChurn30d.toFixed(0)} customers\n`);
    
    // Success rate by tier (30d has better rates for prepaid/medium, worse for premium)
    const premiumSuccess30d = tier_all.premium.length * 0.75 * (1 - churnRate30d);
    const mediumSuccess30d = tier_all.medium.length * 0.65 * (1 - churnRate30d);
    const prepaidSuccess30d = tier_all.prepaid.length * 0.55 * (1 - churnRate30d);
    
    console.log('   Expected successful $49 payments:');
    console.log(`      🟢 Premium: ${premiumSuccess30d.toFixed(1)} / ${tier_all.premium.length} (${tier_all.premium.length > 0 ? ((premiumSuccess30d/tier_all.premium.length)*100).toFixed(0) : 0}%)`);
    console.log(`      🟡 Medium: ${mediumSuccess30d.toFixed(1)} / ${tier_all.medium.length} (${tier_all.medium.length > 0 ? ((mediumSuccess30d/tier_all.medium.length)*100).toFixed(0) : 0}%)`);
    console.log(`      🟡 Prepaid: ${prepaidSuccess30d.toFixed(1)} / ${tier_all.prepaid.length} (${tier_all.prepaid.length > 0 ? ((prepaidSuccess30d/tier_all.prepaid.length)*100).toFixed(0) : 0}%)`);
    console.log(`      Total: ${(premiumSuccess30d + mediumSuccess30d + prepaidSuccess30d).toFixed(1)} / ${cohort_all.length} (${((premiumSuccess30d + mediumSuccess30d + prepaidSuccess30d)/cohort_all.length*100).toFixed(0)}%)\n`);
    
    console.log(`   💰 Projected revenue: $${projectedRevenue30d.toFixed(2)}`);
    console.log(`   📈 Overall Payment CR: ${((premiumSuccess30d + mediumSuccess30d + prepaidSuccess30d) / cohort_all.length * 100).toFixed(1)}%\n`);
    console.log(`   ⏱️  Time to first revenue: 30 days`);
    console.log(`   💵 Cash flow: ${cohort_all.length} × $1 = $${cohort_all.length} (immediate)`);
    console.log(`                + $${projectedRevenue30d.toFixed(2)} (in 30 days)\n`);

    // COMPARISON
    console.log('\n============================================================');
    console.log('⚖️  COMPARISON:');
    console.log('============================================================\n');

    const revenueDiff = projectedRevenue30d - projectedRevenue10d;
    const paymentCR10d = ((premiumSuccess10d + mediumSuccess10d + prepaidSuccess10d) / cohort_0_10.length * 100);
    const paymentCR30d = ((premiumSuccess30d + mediumSuccess30d + prepaidSuccess30d) / cohort_all.length * 100);
    const crDiff = paymentCR30d - paymentCR10d;

    console.log('📊 Revenue:');
    console.log(`   10-day model: $${projectedRevenue10d.toFixed(2)}`);
    console.log(`   30-day model: $${projectedRevenue30d.toFixed(2)}`);
    console.log(`   Difference: ${revenueDiff >= 0 ? '+' : ''}$${revenueDiff.toFixed(2)} (${((revenueDiff/projectedRevenue10d)*100).toFixed(0)}%)\n`);

    console.log('📈 Payment Conversion Rate:');
    console.log(`   10-day model: ${paymentCR10d.toFixed(1)}%`);
    console.log(`   30-day model: ${paymentCR30d.toFixed(1)}%`);
    console.log(`   Difference: ${crDiff >= 0 ? '+' : ''}${crDiff.toFixed(1)}%\n`);

    console.log('👥 Pipeline Size:');
    console.log(`   10-day model: ${cohort_0_10.length} customers`);
    console.log(`   30-day model: ${cohort_all.length} customers`);
    console.log(`   Difference: +${cohort_all.length - cohort_0_10.length} customers (+${(((cohort_all.length - cohort_0_10.length)/cohort_0_10.length)*100).toFixed(0)}%)\n`);

    console.log('💸 Churn:');
    console.log(`   10-day model: ${(churnRate10d * 100).toFixed(1)}% churn`);
    console.log(`   30-day model: ${(churnRate30d * 100).toFixed(1)}% churn`);
    console.log(`   Difference: +${((churnRate30d - churnRate10d) * 100).toFixed(1)}% (worse)\n`);

    console.log('⏱️  Time to Revenue:');
    console.log(`   10-day model: 10 days`);
    console.log(`   30-day model: 30 days`);
    console.log(`   Difference: +20 days delay\n`);

    console.log('\n============================================================');
    console.log('💡 INSIGHTS & RECOMMENDATIONS:');
    console.log('============================================================\n');

    if (revenueDiff > 0) {
      console.log(`✅ 30-day model generates ${((revenueDiff/projectedRevenue10d)*100).toFixed(0)}% MORE revenue`);
      console.log(`   → Higher Payment CR (${paymentCR30d.toFixed(0)}% vs ${paymentCR10d.toFixed(0)}%)`);
      console.log(`   → Larger pipeline (${cohort_all.length} vs ${cohort_0_10.length})`);
      console.log(`   → Better for prepaid cards (more time to refill)\n`);
    } else {
      console.log(`⚠️ 10-day model generates ${Math.abs((revenueDiff/projectedRevenue10d)*100).toFixed(0)}% MORE revenue`);
      console.log(`   → Lower churn (${(churnRate10d*100).toFixed(0)}% vs ${(churnRate30d*100).toFixed(0)}%)`);
      console.log(`   → Faster cash flow (10 days vs 30 days)\n`);
    }

    console.log('📊 Trade-offs:\n');
    
    console.log('🔵 10-day model PROS:');
    console.log('   ✅ Faster cash flow (10 days vs 30 days)');
    console.log('   ✅ Lower churn (customers forget less)');
    console.log('   ✅ Higher momentum after trial purchase');
    console.log('   ✅ Faster feedback loop for optimization\n');

    console.log('🔵 10-day model CONS:');
    console.log('   ❌ Lower Payment CR (especially prepaid)');
    console.log('   ❌ More "insufficient funds" declines');
    console.log('   ❌ Less time for customers to see value\n');

    console.log('🟢 30-day model PROS:');
    console.log('   ✅ Higher Payment CR (more time to prepare)');
    console.log('   ✅ Better for prepaid cards (can refill)');
    console.log('   ✅ Customers see more value before charge');
    console.log('   ✅ Larger pipeline size\n');

    console.log('🟢 30-day model CONS:');
    console.log('   ❌ Higher churn (customers forget, lose interest)');
    console.log('   ❌ Much slower cash flow (30 days!)');
    console.log('   ❌ Longer time to validate business model');
    console.log('   ❌ Cash flow problems for early startup\n');

    console.log('============================================================');
    console.log('🎯 RECOMMENDATION:');
    console.log('============================================================\n');

    const currentStage = 'early'; // 'early' or 'mature'
    
    if (currentStage === 'early') {
      console.log('💡 KEEP 10-DAY MODEL (current)');
      console.log('\n   Почему:');
      console.log('   • Ты на ранней стадии, нужен быстрый cash flow');
      console.log('   • 30 дней = слишком долго ждать revenue');
      console.log('   • Нужен быстрый feedback loop для оптимизации');
      console.log('   • Churn на 10 днях ниже чем на 30\n');
      
      console.log('   📈 Чтобы улучшить Payment CR на 10 днях:');
      console.log('   1. Используй Max Conversion Value → больше Premium customers');
      console.log('   2. Radar rules → фильтруй prepaid/virtual карты');
      console.log('   3. Email reminders за 2-3 дня до $49 charge');
      console.log('   4. Webhook retry logic для failed payments\n');
    } else {
      console.log('💡 CONSIDER 30-DAY MODEL');
      console.log('\n   Почему:');
      console.log('   • У тебя стабильный cash flow');
      console.log('   • Хочешь максимизировать Payment CR');
      console.log('   • Много prepaid/virtual карт в pipeline');
      console.log('   • Готов пожертвовать скоростью ради качества\n');
    }

    console.log('🔄 Компромисс: PROGRESSIVE PRICING');
    console.log('   → Day 10: $29 (first charge)');
    console.log('   → Day 20: $49 (second charge)');
    console.log('   → Day 30+: $49 monthly');
    console.log('   Плюсы: Faster cash flow + higher conversion\n');

    console.log('============================================================');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

compareModels().catch(console.error);
