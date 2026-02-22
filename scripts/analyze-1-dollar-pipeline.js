/**
 * Анализ $1 trial pipeline
 * 
 * Этот скрипт:
 * 1. Находит всех customers кто заплатил $1 trial
 * 2. Но еще НЕ заплатил первый $49
 * 3. Показывает когда ожидается первый $49 payment
 * 4. Считает projected revenue от них
 * 
 * Запуск: node scripts/analyze-1-dollar-pipeline.js
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
  
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  
  if (diffDays < 0) {
    return `${dateStr} (${Math.abs(diffDays)}d ago) ⚠️ OVERDUE`;
  } else if (diffDays === 0) {
    return `${dateStr} (TODAY!) 🔥`;
  } else if (diffDays === 1) {
    return `${dateStr} (tomorrow)`;
  } else if (diffDays <= 3) {
    return `${dateStr} (in ${diffDays}d) 🔜`;
  } else {
    return `${dateStr} (in ${diffDays}d)`;
  }
}

async function analyzePipeline() {
  console.log('💰 Analyzing $1 trial pipeline...\n');
  console.log('Looking for customers who paid $1 but haven\'t paid $49 yet...\n');

  try {
    // Получаем все subscription schedules
    const schedules = await stripe.subscriptionSchedules.list({
      limit: 100
    });

    const activeSchedules = schedules.data.filter(s => 
      s.status === 'active' || s.status === 'not_started'
    );

    if (activeSchedules.length === 0) {
      console.log('❌ No active subscriptions');
      return;
    }

    const pipeline = [];
    let totalProjectedRevenue = 0;

    // Анализируем каждый subscription
    for (const schedule of activeSchedules) {
      try {
        const customerId = schedule.customer;
        const customer = await stripe.customers.retrieve(customerId);
        
        // Получаем payment method
        const defaultPaymentMethod = customer.invoice_settings?.default_payment_method;
        let cardInfo = { tier: 'unknown', successRate: 0, emoji: '⚪' };
        let cardDetails = 'N/A';
        
        if (defaultPaymentMethod) {
          const pm = await stripe.paymentMethods.retrieve(defaultPaymentMethod);
          cardInfo = getCardTier(pm);
          if (pm.card) {
            cardDetails = `${pm.card.brand} *${pm.card.last4} (${pm.card.funding || 'unknown'})`;
          }
        }

        // Получаем все invoices
        const invoices = await stripe.invoices.list({
          customer: customerId,
          limit: 50,
          expand: ['data.subscription']
        });

        // Считаем платежи
        const paid1Dollar = invoices.data.some(inv => 
          inv.status === 'paid' && inv.amount_paid === 100
        );
        
        const paid49 = invoices.data.filter(inv => 
          inv.status === 'paid' && inv.amount_paid >= 4900
        ).length;

        // Если заплатил $1 но еще не платил $49 - это наш pipeline!
        if (paid1Dollar && paid49 === 0) {
          // Ищем когда был $1 payment
          const dollarInvoice = invoices.data.find(inv => 
            inv.status === 'paid' && inv.amount_paid === 100
          );
          
          const trialDate = dollarInvoice ? new Date(dollarInvoice.created * 1000) : null;
          
          // Считаем когда должен быть первый $49 (через 10 дней после $1)
          let expected49Date = null;
          let expected49Timestamp = null;
          
          if (dollarInvoice) {
            expected49Timestamp = dollarInvoice.created + (10 * 24 * 60 * 60); // +10 days
            expected49Date = formatDate(expected49Timestamp);
          }

          // Считаем projected revenue от этого customer
          // Phase 1: $49 × 3 = $147/month
          const monthlyValue = 147;
          const projectedRevenue = monthlyValue * cardInfo.successRate;
          totalProjectedRevenue += projectedRevenue;

          pipeline.push({
            email: customer.email || 'N/A',
            customerId: customer.id,
            trialDate: trialDate ? trialDate.toLocaleDateString() : 'N/A',
            expected49Date: expected49Date || 'Unknown',
            expected49Timestamp: expected49Timestamp || 0,
            tier: cardInfo.tier,
            emoji: cardInfo.emoji,
            successRate: cardInfo.successRate,
            cardDetails,
            monthlyValue,
            projectedRevenue: projectedRevenue.toFixed(2)
          });
        }

      } catch (error) {
        console.log(`⚠️ Error processing schedule ${schedule.id}:`, error.message);
      }
    }

    if (pipeline.length === 0) {
      console.log('✅ No customers in $1 pipeline (all either paid $49 or haven\'t paid $1)');
      return;
    }

    // Сортируем по дате ожидаемого платежа
    pipeline.sort((a, b) => a.expected49Timestamp - b.expected49Timestamp);

    // Выводим результаты
    console.log('============================================================');
    console.log('💰 $1 TRIAL PIPELINE:');
    console.log('============================================================\n');

    console.log(`📊 Total customers in pipeline: ${pipeline.length}`);
    console.log(`💵 Projected MRR from pipeline: $${totalProjectedRevenue.toFixed(2)}\n`);

    // Группируем по tier
    const byTier = {
      premium: pipeline.filter(p => p.tier === 'premium'),
      medium: pipeline.filter(p => p.tier.startsWith('medium')),
      fraud: pipeline.filter(p => p.tier === 'fraud'),
      unknown: pipeline.filter(p => p.tier === 'unknown')
    };

    console.log('📈 Breakdown by tier:');
    console.log(`   🟢 Premium: ${byTier.premium.length} (85% success) → $${byTier.premium.reduce((sum, p) => sum + parseFloat(p.projectedRevenue), 0).toFixed(2)} MRR`);
    console.log(`   🟡 Medium: ${byTier.medium.length} (40-60% success) → $${byTier.medium.reduce((sum, p) => sum + parseFloat(p.projectedRevenue), 0).toFixed(2)} MRR`);
    console.log(`   🔴 Fraud: ${byTier.fraud.length} (5% success) → $${byTier.fraud.reduce((sum, p) => sum + parseFloat(p.projectedRevenue), 0).toFixed(2)} MRR`);
    console.log(`   ⚪ Unknown: ${byTier.unknown.length} (0% success) → $${byTier.unknown.reduce((sum, p) => sum + parseFloat(p.projectedRevenue), 0).toFixed(2)} MRR\n`);

    console.log('============================================================');
    console.log('📋 DETAILED LIST (sorted by expected $49 date):');
    console.log('============================================================\n');

    pipeline.forEach((p, idx) => {
      console.log(`${idx + 1}. ${p.email}`);
      console.log(`   ${p.emoji} Tier: ${p.tier.toUpperCase()} (${(p.successRate * 100).toFixed(0)}% success)`);
      console.log(`   Customer: ${p.customerId}`);
      console.log(`   Card: ${p.cardDetails}`);
      console.log(`   Trial date: ${p.trialDate}`);
      console.log(`   Expected 1st $49: ${p.expected49Date}`);
      console.log(`   Projected MRR: $${p.projectedRevenue}/month\n`);
    });

    console.log('============================================================');
    console.log('💡 INSIGHTS:');
    console.log('============================================================\n');

    // Считаем сколько ожидается в ближайшие дни
    const now = Math.floor(Date.now() / 1000);
    const next3Days = pipeline.filter(p => 
      p.expected49Timestamp > 0 && 
      p.expected49Timestamp <= now + (3 * 24 * 60 * 60)
    );
    
    const next7Days = pipeline.filter(p => 
      p.expected49Timestamp > 0 && 
      p.expected49Timestamp <= now + (7 * 24 * 60 * 60)
    );

    if (next3Days.length > 0) {
      const next3DaysRevenue = next3Days.reduce((sum, p) => sum + parseFloat(p.projectedRevenue), 0);
      const next3DaysActual = next3Days.length * 49;
      console.log(`🔜 Next 3 days: ${next3Days.length} customers expecting 1st $49`);
      console.log(`   Potential: $${next3DaysActual} (if all pay)`);
      console.log(`   Projected: $${next3DaysRevenue.toFixed(2)} (realistic)\n`);
    }

    if (next7Days.length > next3Days.length) {
      const next7DaysRevenue = next7Days.reduce((sum, p) => sum + parseFloat(p.projectedRevenue), 0);
      const next7DaysActual = next7Days.length * 49;
      console.log(`📅 Next 7 days: ${next7Days.length} customers expecting 1st $49`);
      console.log(`   Potential: $${next7DaysActual} (if all pay)`);
      console.log(`   Projected: $${next7DaysRevenue.toFixed(2)} (realistic)\n`);
    }

    // Overdue payments
    const overdue = pipeline.filter(p => 
      p.expected49Timestamp > 0 && 
      p.expected49Timestamp < now
    );

    if (overdue.length > 0) {
      console.log(`⚠️ OVERDUE: ${overdue.length} customers missed their 1st $49 payment`);
      console.log(`   These should have been charged already!`);
      console.log(`   → Check Stripe for failed payment attempts\n`);
      
      overdue.forEach(p => {
        console.log(`   - ${p.email} (${p.tier}) - expected ${p.expected49Date}`);
      });
      console.log('');
    }

    // Recommendations
    const premiumPercent = (byTier.premium.length / pipeline.length) * 100;
    
    if (premiumPercent < 30) {
      console.log('⚠️ Only ' + premiumPercent.toFixed(0) + '% Premium tier in pipeline');
      console.log('   → Max Conversion Value will help increase this\n');
    } else if (premiumPercent >= 50) {
      console.log('✅ ' + premiumPercent.toFixed(0) + '% Premium tier in pipeline - GOOD!');
      console.log('   → Quality leads are coming in\n');
    }

    const avgProjectedMRR = totalProjectedRevenue / pipeline.length;
    console.log(`📊 Average projected MRR per pipeline customer: $${avgProjectedMRR.toFixed(2)}`);
    console.log(`📊 If all convert to Phase 2: +$${(pipeline.length * 49 * 0.65).toFixed(2)} stable MRR\n`);

    console.log('============================================================');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

analyzePipeline().catch(console.error);
