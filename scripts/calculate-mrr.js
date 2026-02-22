/**
 * Расчет MRR (Monthly Recurring Revenue)
 * 
 * Этот скрипт:
 * 1. Анализирует все subscription schedules
 * 2. Определяет на какой фазе каждый customer
 * 3. Считает текущий и projected MRR
 * 
 * Запуск: node scripts/calculate-mrr.js
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
    return { tier: 'unknown', successRate: 0 };
  }

  if (card.checks?.cvc_check === 'fail') {
    return { tier: 'fraud', successRate: 0.05 };
  }

  if ((card.funding === 'credit' || card.funding === 'debit') && card.checks?.cvc_check === 'pass') {
    return { tier: 'premium', successRate: 0.85 };
  }

  if (card.funding === 'prepaid') {
    return { tier: 'medium-prepaid', successRate: 0.40 };
  }

  return { tier: 'medium', successRate: 0.60 };
}

async function calculateMRR() {
  console.log('💰 Calculating MRR (Monthly Recurring Revenue)...\n');

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

    console.log(`✅ Found ${activeSchedules.length} active subscriptions\n`);

    let currentMRR = 0;
    let projectedMRR = 0;
    
    const breakdown = {
      phase1_every10days: { count: 0, current: 0, projected: 0 },
      phase2_monthly: { count: 0, current: 0, projected: 0 },
      unknown: { count: 0, current: 0, projected: 0 }
    };

    const details = [];

    // Анализируем каждый subscription
    for (const schedule of activeSchedules) {
      try {
        const customerId = schedule.customer;
        const customer = await stripe.customers.retrieve(customerId);
        
        // Получаем payment method
        const defaultPaymentMethod = customer.invoice_settings?.default_payment_method;
        let tier = { tier: 'unknown', successRate: 0 };
        
        if (defaultPaymentMethod) {
          const pm = await stripe.paymentMethods.retrieve(defaultPaymentMethod);
          tier = getCardTier(pm);
        }

        // Определяем текущую фазу
        const now = Math.floor(Date.now() / 1000);
        const currentPhase = schedule.phases.find(phase => 
          phase.start_date <= now && (!phase.end_date || phase.end_date > now)
        );

        if (!currentPhase) {
          breakdown.unknown.count++;
          continue;
        }

        // Получаем все invoices для подсчета платежей
        const invoices = await stripe.invoices.list({
          customer: customerId,
          subscription: schedule.subscription,
          limit: 20,
          status: 'paid'
        });

        const paidCount = invoices.data.filter(inv => 
          inv.amount_paid >= 4900 // $49 payments
        ).length;

        // Определяем фазу
        let phaseType = 'unknown';
        let monthlyAmount = 0;

        // Проверяем interval из price
        const priceId = currentPhase.items[0]?.price;
        if (typeof priceId === 'string') {
          // Это price ID, получаем его
          try {
            const price = await stripe.prices.retrieve(priceId);
            if (price.recurring?.interval === 'month') {
              phaseType = 'phase2_monthly';
              monthlyAmount = price.unit_amount / 100;
            } else {
              phaseType = 'phase1_every10days';
              // $49 каждые 10 дней = $49 * 3 = $147 в месяц (примерно)
              monthlyAmount = 49 * 3;
            }
          } catch (e) {
            phaseType = 'unknown';
          }
        }

        // Текущий MRR (то что уже есть)
        const currentRevenue = monthlyAmount;
        
        // Projected MRR (с учетом success rate)
        const projectedRevenue = monthlyAmount * tier.successRate;

        // Добавляем к общему MRR
        currentMRR += currentRevenue;
        projectedMRR += projectedRevenue;

        // Добавляем к breakdown
        if (breakdown[phaseType]) {
          breakdown[phaseType].count++;
          breakdown[phaseType].current += currentRevenue;
          breakdown[phaseType].projected += projectedRevenue;
        }

        details.push({
          email: customer.email || 'N/A',
          customerId: customer.id,
          tier: tier.tier,
          successRate: tier.successRate,
          phase: phaseType,
          paidCount,
          monthlyAmount,
          projectedRevenue: projectedRevenue.toFixed(2)
        });

      } catch (error) {
        console.log(`⚠️ Error processing schedule ${schedule.id}:`, error.message);
      }
    }

    // Выводим результаты
    console.log('============================================================');
    console.log('💰 MRR ANALYSIS:');
    console.log('============================================================\n');

    console.log('📊 BREAKDOWN BY PHASE:\n');

    console.log(`🔄 Phase 1 (Every 10 days, 3 payments):`);
    console.log(`   Customers: ${breakdown.phase1_every10days.count}`);
    console.log(`   Current MRR: $${breakdown.phase1_every10days.current.toFixed(2)}`);
    console.log(`   Projected MRR: $${breakdown.phase1_every10days.projected.toFixed(2)}`);
    console.log(`   (Assuming ${((breakdown.phase1_every10days.projected / breakdown.phase1_every10days.current) * 100).toFixed(0)}% success rate)\n`);

    console.log(`📅 Phase 2 (Monthly recurring):`);
    console.log(`   Customers: ${breakdown.phase2_monthly.count}`);
    console.log(`   Current MRR: $${breakdown.phase2_monthly.current.toFixed(2)}`);
    console.log(`   Projected MRR: $${breakdown.phase2_monthly.projected.toFixed(2)}`);
    console.log(`   (Assuming ${breakdown.phase2_monthly.current > 0 ? ((breakdown.phase2_monthly.projected / breakdown.phase2_monthly.current) * 100).toFixed(0) : 0}% success rate)\n`);

    if (breakdown.unknown.count > 0) {
      console.log(`⚪ Unknown/Invalid:`);
      console.log(`   Customers: ${breakdown.unknown.count}`);
      console.log(`   (No valid payment method)\n`);
    }

    console.log('============================================================');
    console.log('💵 TOTAL MRR:');
    console.log('============================================================\n');

    console.log(`📈 Current MRR (if all pay):     $${currentMRR.toFixed(2)}`);
    console.log(`📊 Projected MRR (realistic):    $${projectedMRR.toFixed(2)}`);
    console.log(`📉 Expected loss:                $${(currentMRR - projectedMRR).toFixed(2)}`);
    console.log(`📊 Overall collection rate:      ${currentMRR > 0 ? ((projectedMRR / currentMRR) * 100).toFixed(1) : 0}%\n`);

    // Годовой ARR
    const projectedARR = projectedMRR * 12;
    console.log(`📆 Projected ARR (Annual):       $${projectedARR.toFixed(2)}\n`);

    console.log('============================================================');
    console.log('📋 CUSTOMER DETAILS:');
    console.log('============================================================\n');

    // Сортируем по projected revenue
    details.sort((a, b) => parseFloat(b.projectedRevenue) - parseFloat(a.projectedRevenue));

    details.forEach((d, idx) => {
      const phaseLabel = d.phase === 'phase1_every10days' ? '🔄 Phase 1 (every 10d)' : 
                         d.phase === 'phase2_monthly' ? '📅 Phase 2 (monthly)' : 
                         '⚪ Unknown';
      console.log(`${idx + 1}. ${d.email}`);
      console.log(`   Customer: ${d.customerId}`);
      console.log(`   Tier: ${d.tier.toUpperCase()} (${(d.successRate * 100).toFixed(0)}% success)`);
      console.log(`   Phase: ${phaseLabel}`);
      console.log(`   Paid so far: ${d.paidCount} × $49`);
      console.log(`   Monthly value: $${d.monthlyAmount.toFixed(2)}`);
      console.log(`   Projected: $${d.projectedRevenue}/month\n`);
    });

    console.log('============================================================');
    console.log('💡 INSIGHTS:');
    console.log('============================================================\n');

    // Insights
    const totalCustomers = details.length;
    const phase1Customers = breakdown.phase1_every10days.count;
    const phase2Customers = breakdown.phase2_monthly.count;

    if (phase1Customers > 0 && phase2Customers === 0) {
      console.log('⚠️ All customers still in Phase 1 (every 10 days)');
      console.log('   → No one has reached Phase 2 (monthly) yet');
      console.log('   → Wait for first 3 × $49 payments to complete\n');
    }

    if (phase2Customers > 0) {
      console.log(`✅ ${phase2Customers} customers reached Phase 2 (monthly recurring)`);
      console.log(`   → These are your stable MRR base\n`);
    }

    const averageProjectedMRR = totalCustomers > 0 ? projectedMRR / totalCustomers : 0;
    console.log(`📊 Average projected MRR per customer: $${averageProjectedMRR.toFixed(2)}/month`);
    
    const lifetimeValue = averageProjectedMRR * 3; // Предполагаем 3 месяца retention
    console.log(`📊 Estimated LTV per customer: $${lifetimeValue.toFixed(2)}`);
    
    console.log('\n💰 To reach $1,000 MRR, you need:');
    const customersNeeded = Math.ceil(1000 / averageProjectedMRR);
    console.log(`   ${customersNeeded} customers (like current mix)`);
    
    console.log('\n💰 To reach $10,000 MRR, you need:');
    const customersNeeded10k = Math.ceil(10000 / averageProjectedMRR);
    console.log(`   ${customersNeeded10k} customers (like current mix)`);

    console.log('\n============================================================');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

calculateMRR().catch(console.error);
