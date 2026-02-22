/**
 * Анализ недавних $1 trial payments
 * 
 * Этот скрипт:
 * 1. Находит все $1 PaymentIntents за последние 7 дней
 * 2. Проверяет есть ли у них subscription
 * 3. Проверяет был ли уже первый $49 payment
 * 4. Показывает "pipeline" и "converted"
 * 
 * Запуск: node scripts/analyze-recent-trials.js
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
    return { tier: 'unknown', successRate: 0, emoji: '⚪' };
  }

  if (card.checks?.cvc_check === 'fail') {
    return { tier: 'fraud', successRate: 0.05, emoji: '🔴' };
  }

  if ((card.funding === 'credit' || card.funding === 'debit') && card.checks?.cvc_check === 'pass') {
    return { tier: 'premium', successRate: 0.85, emoji: '🟢' };
  }

  if (card.funding === 'prepaid') {
    return { tier: 'medium-prepaid', successRate: 0.40, emoji: '🟡' };
  }

  return { tier: 'medium', successRate: 0.60, emoji: '🟡' };
}

/**
 * Форматирует дату
 */
function formatDate(timestamp) {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diffDays = Math.floor((date - now) / (1000 * 60 * 60 * 24));
  
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  
  if (diffDays < 0) {
    return `${dateStr} (${Math.abs(diffDays)}d ago)`;
  } else if (diffDays === 0) {
    return `${dateStr} (TODAY)`;
  } else if (diffDays === 1) {
    return `${dateStr} (tomorrow)`;
  } else {
    return `${dateStr} (in ${diffDays}d)`;
  }
}

async function analyzeRecentTrials() {
  console.log('💰 Analyzing recent $1 trial payments...\n');

  try {
    // Получаем все $2.99 PaymentIntents за последние 7 дней
    const sevenDaysAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
    
    let allPaymentIntents = [];
    let hasMore = true;
    let startingAfter = undefined;

    while (hasMore) {
      const paymentIntents = await stripe.paymentIntents.list({
        limit: 100,
        created: { gte: sevenDaysAgo },
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

    console.log(`✅ Found ${allPaymentIntents.length} successful $1 trial payments in last 7 days\n`);

    if (allPaymentIntents.length === 0) {
      console.log('❌ No $1 payments found');
      return;
    }

    const results = {
      pipeline: [], // Paid $1, waiting for first $49
      converted: [], // Paid $1 and already paid at least one $49
      noSubscription: [] // Paid $1 but no subscription created
    };

    let totalProjectedRevenue = 0;

    // Анализируем каждый $1 payment
    for (const pi of allPaymentIntents) {
      try {
        const customerId = pi.customer;
        
        if (!customerId) {
          results.noSubscription.push({
            paymentIntentId: pi.id,
            created: formatDate(pi.created),
            email: pi.receipt_email || 'N/A',
            reason: 'No customer ID'
          });
          continue;
        }

        const customer = await stripe.customers.retrieve(customerId);
        
        // Получаем payment method
        const paymentMethodId = pi.payment_method;
        let cardInfo = { tier: 'unknown', successRate: 0, emoji: '⚪' };
        let cardDetails = 'N/A';
        
        if (paymentMethodId) {
          const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
          cardInfo = getCardTier(pm);
          if (pm.card) {
            cardDetails = `${pm.card.brand} *${pm.card.last4} (${pm.card.funding || 'unknown'})`;
          }
        }

        // Проверяем есть ли subscription schedule
        const schedules = await stripe.subscriptionSchedules.list({
          customer: customerId,
          limit: 10
        });

        if (schedules.data.length === 0) {
          results.noSubscription.push({
            paymentIntentId: pi.id,
            created: formatDate(pi.created),
            email: customer.email || pi.receipt_email || 'N/A',
            customerId: customer.id,
            reason: 'No subscription schedule',
            tier: cardInfo.tier
          });
          continue;
        }

        // Получаем все invoices для этого customer
        const invoices = await stripe.invoices.list({
          customer: customerId,
          limit: 50
        });

        const paid49Count = invoices.data.filter(inv => 
          inv.status === 'paid' && inv.amount_paid >= 4900
        ).length;

        // Считаем когда ожидается первый $49
        const expected49Timestamp = pi.created + (10 * 24 * 60 * 60); // +10 days after $1
        const expected49Date = formatDate(expected49Timestamp);

        const customerData = {
          email: customer.email || pi.receipt_email || 'N/A',
          customerId: customer.id,
          paymentIntentId: pi.id,
          trialDate: formatDate(pi.created),
          expected49Date,
          expected49Timestamp,
          tier: cardInfo.tier,
          emoji: cardInfo.emoji,
          successRate: cardInfo.successRate,
          cardDetails,
          paid49Count
        };

        if (paid49Count === 0) {
          // Pipeline: заплатил $1, ждет первого $49
          const monthlyValue = 147; // $49 × 3 every 10 days
          const projectedRevenue = monthlyValue * cardInfo.successRate;
          totalProjectedRevenue += projectedRevenue;
          
          customerData.projectedRevenue = projectedRevenue.toFixed(2);
          results.pipeline.push(customerData);
        } else {
          // Converted: уже заплатил хотя бы один $49
          results.converted.push(customerData);
        }

      } catch (error) {
        console.log(`⚠️ Error processing PI ${pi.id}:`, error.message);
      }
    }

    // Выводим результаты
    console.log('============================================================');
    console.log('📊 RECENT $1 TRIAL ANALYSIS (Last 7 days):');
    console.log('============================================================\n');

    console.log(`💰 Pipeline (paid $1, waiting for 1st $49): ${results.pipeline.length}`);
    console.log(`✅ Converted (paid $1 + at least one $49): ${results.converted.length}`);
    console.log(`⚠️ No subscription: ${results.noSubscription.length}\n`);

    const conversionRate = allPaymentIntents.length > 0 
      ? ((results.converted.length / allPaymentIntents.length) * 100).toFixed(1)
      : 0;
    
    console.log(`📈 Early conversion rate: ${conversionRate}%`);
    console.log(`   (${results.converted.length} out of ${allPaymentIntents.length} trials paid first $49)\n`);

    // PIPELINE DETAILS
    if (results.pipeline.length > 0) {
      console.log('============================================================');
      console.log('💰 PIPELINE (waiting for 1st $49):');
      console.log('============================================================\n');

      // Группируем по tier
      const byTier = {
        premium: results.pipeline.filter(p => p.tier === 'premium'),
        medium: results.pipeline.filter(p => p.tier.startsWith('medium')),
        fraud: results.pipeline.filter(p => p.tier === 'fraud'),
        unknown: results.pipeline.filter(p => p.tier === 'unknown')
      };

      console.log('📈 Breakdown by tier:');
      console.log(`   🟢 Premium: ${byTier.premium.length} (85% success)`);
      console.log(`   🟡 Medium: ${byTier.medium.length} (40-60% success)`);
      console.log(`   🔴 Fraud: ${byTier.fraud.length} (5% success)`);
      console.log(`   ⚪ Unknown: ${byTier.unknown.length} (0% success)\n`);

      console.log(`💵 Projected MRR from pipeline: $${totalProjectedRevenue.toFixed(2)}\n`);

      // Сортируем по дате ожидаемого платежа
      results.pipeline.sort((a, b) => a.expected49Timestamp - b.expected49Timestamp);

      console.log('📋 Details:\n');
      results.pipeline.forEach((p, idx) => {
        console.log(`${idx + 1}. ${p.email}`);
        console.log(`   ${p.emoji} Tier: ${p.tier.toUpperCase()} (${(p.successRate * 100).toFixed(0)}% success)`);
        console.log(`   Card: ${p.cardDetails}`);
        console.log(`   Trial: ${p.trialDate}`);
        console.log(`   Expected 1st $49: ${p.expected49Date}`);
        console.log(`   Projected MRR: $${p.projectedRevenue}/month\n`);
      });
    } else {
      console.log('✅ Pipeline is empty - all recent trials already converted!\n');
    }

    // CONVERTED DETAILS
    if (results.converted.length > 0) {
      console.log('============================================================');
      console.log('✅ CONVERTED (already paid 1st $49):');
      console.log('============================================================\n');

      results.converted.forEach((c, idx) => {
        console.log(`${idx + 1}. ${c.email}`);
        console.log(`   ${c.emoji} Tier: ${c.tier.toUpperCase()}`);
        console.log(`   Card: ${c.cardDetails}`);
        console.log(`   Trial: ${c.trialDate}`);
        console.log(`   Paid $49: ${c.paid49Count} time(s) ✅\n`);
      });
    }

    // NO SUBSCRIPTION
    if (results.noSubscription.length > 0) {
      console.log('============================================================');
      console.log('⚠️ NO SUBSCRIPTION (paid $1 but no subscription created):');
      console.log('============================================================\n');

      results.noSubscription.forEach((n, idx) => {
        console.log(`${idx + 1}. ${n.email}`);
        console.log(`   Customer: ${n.customerId || 'N/A'}`);
        console.log(`   Payment: ${n.paymentIntentId}`);
        console.log(`   Created: ${n.created}`);
        console.log(`   Reason: ${n.reason}\n`);
      });
    }

    console.log('============================================================');
    console.log('💡 SUMMARY:');
    console.log('============================================================\n');

    console.log(`📊 Total $1 trials (last 7 days): ${allPaymentIntents.length}`);
    console.log(`💰 In pipeline (waiting for $49): ${results.pipeline.length}`);
    console.log(`✅ Already converted to $49: ${results.converted.length}`);
    console.log(`⚠️ No subscription created: ${results.noSubscription.length}\n`);

    if (results.pipeline.length > 0) {
      const byTier = {
        premium: results.pipeline.filter(p => p.tier === 'premium'),
        medium: results.pipeline.filter(p => p.tier.startsWith('medium')),
        fraud: results.pipeline.filter(p => p.tier === 'fraud'),
        unknown: results.pipeline.filter(p => p.tier === 'unknown')
      };
      const premiumPercent = (byTier.premium.length / results.pipeline.length) * 100;
      console.log(`🎯 Pipeline quality: ${premiumPercent.toFixed(0)}% Premium tier`);
      
      if (premiumPercent >= 50) {
        console.log(`   ✅ GOOD - Quality leads are coming in!\n`);
      } else if (premiumPercent < 30) {
        console.log(`   ⚠️ LOW - Too many Medium/Fraud tier customers\n`);
      }
    }

    if (results.converted.length > 0) {
      console.log(`📈 ${results.converted.length} customers successfully paid first $49`);
      console.log(`   → These will continue paying every 10 days\n`);
    }

    console.log('============================================================');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

analyzeRecentTrials().catch(console.error);
