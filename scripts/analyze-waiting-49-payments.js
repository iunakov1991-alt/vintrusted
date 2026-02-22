/**
 * Анализ карт ожидающих списания $49
 * 
 * Этот скрипт:
 * 1. Находит всех customers с активными subscription schedules
 * 2. Определяет tier карты (Premium/Medium/Fraud) 
 * 3. Смотрит когда следующее списание $49
 * 4. Предсказывает вероятность успеха
 * 
 * Запуск: node scripts/analyze-waiting-49-payments.js
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
 * Определяет tier карты (из api/validate.js логики)
 */
function getCardTier(paymentMethod) {
  const card = paymentMethod.card;
  
  if (!card) {
    return { tier: 'unknown', score: 0 };
  }

  // Fraud tier
  if (card.checks?.cvc_check === 'fail') {
    return { tier: 'fraud', score: 0 };
  }

  // Premium tier
  if ((card.funding === 'credit' || card.funding === 'debit') && card.checks?.cvc_check === 'pass') {
    return { tier: 'premium', score: 90 };
  }

  // Medium tier
  if (card.funding === 'prepaid' || card.funding === 'unknown') {
    return { tier: 'medium', score: 50 };
  }

  // Default Medium
  return { tier: 'medium', score: 60 };
}

/**
 * Предсказывает вероятность успеха $49 платежа
 */
function predictSuccess(tier, funding, cvcCheck) {
  // Premium: высокая вероятность
  if (tier === 'premium') {
    return { probability: '80-90%', status: '🟢 HIGH' };
  }
  
  // Medium: средняя вероятность
  if (tier === 'medium') {
    if (funding === 'prepaid') {
      return { probability: '30-50%', status: '🟡 MEDIUM (prepaid risk)' };
    }
    if (funding === 'unknown') {
      return { probability: '40-60%', status: '🟡 MEDIUM (unknown)' };
    }
    return { probability: '50-70%', status: '🟡 MEDIUM' };
  }
  
  // Fraud: низкая вероятность
  return { probability: '0-10%', status: '🔴 LOW (fraud risk)' };
}

async function analyzeWaiting49Payments() {
  console.log('🔍 Analyzing customers waiting for $49 payments...\n');

  try {
    // Получаем все subscription schedules
    const schedules = await stripe.subscriptionSchedules.list({
      limit: 100
    });

    // Фильтруем только активные и not_started
    const activeSchedules = schedules.data.filter(s => 
      s.status === 'active' || s.status === 'not_started'
    );

    if (activeSchedules.length === 0) {
      console.log('❌ No active subscription schedules found');
      return;
    }

    console.log(`✅ Found ${activeSchedules.length} active subscription schedules\n`);

    const results = [];

    // Анализируем каждый subscription schedule
    for (const schedule of activeSchedules) {
      try {
        const customerId = schedule.customer;
        
        // Получаем customer
        const customer = await stripe.customers.retrieve(customerId);
        
        // Получаем payment method
        const defaultPaymentMethod = customer.invoice_settings?.default_payment_method;
        if (!defaultPaymentMethod) {
          console.log(`⚠️ Customer ${customerId} has no payment method`);
          continue;
        }

        const pm = await stripe.paymentMethods.retrieve(defaultPaymentMethod);
        
        // Определяем tier
        const { tier, score } = getCardTier(pm);
        
        // Предсказываем успех
        const prediction = predictSuccess(tier, pm.card?.funding, pm.card?.checks?.cvc_check);
        
        // Определяем когда следующий $49 payment
        const currentPhase = schedule.phases.find(phase => 
          phase.start_date <= Math.floor(Date.now() / 1000) &&
          (!phase.end_date || phase.end_date > Math.floor(Date.now() / 1000))
        );
        
        let nextPaymentInfo = 'Unknown';
        let nextPaymentDate = null;
        
        if (currentPhase) {
          // Проверяем это $49 фаза или еще $1 фаза
          const price = currentPhase.items[0]?.price;
          if (price) {
            // Смотрим сколько уже было списаний
            const invoices = await stripe.invoices.list({
              customer: customerId,
              subscription: schedule.subscription,
              limit: 10
            });
            
            const paidInvoices = invoices.data.filter(inv => inv.status === 'paid');
            
            // Ищем следующее scheduled invoice
            const upcomingInvoices = invoices.data.filter(inv => 
              inv.status === 'draft' || inv.status === 'open'
            );
            
            if (upcomingInvoices.length > 0) {
              const nextInvoice = upcomingInvoices[0];
              nextPaymentDate = new Date(nextInvoice.created * 1000);
              nextPaymentInfo = `Next: $${(nextInvoice.amount_due / 100).toFixed(2)} on ${nextPaymentDate.toLocaleDateString()}`;
            } else {
              nextPaymentInfo = `Phase ${paidInvoices.length} payments done`;
            }
          }
        }
        
        results.push({
          customerId: customer.id,
          email: customer.email || 'N/A',
          created: new Date(customer.created * 1000).toISOString().split('T')[0],
          tier,
          funding: pm.card?.funding || 'unknown',
          brand: pm.card?.brand || 'unknown',
          last4: pm.card?.last4 || '****',
          cvcCheck: pm.card?.checks?.cvc_check || 'N/A',
          nextPayment: nextPaymentInfo,
          prediction: prediction.status,
          probability: prediction.probability,
          score
        });

      } catch (error) {
        console.log(`⚠️ Error processing schedule ${schedule.id}:`, error.message);
      }
    }

    // Сортируем по tier (premium first, then medium, then fraud)
    results.sort((a, b) => b.score - a.score);

    // Выводим результаты
    console.log('============================================================');
    console.log('📊 CUSTOMERS WAITING FOR $49 PAYMENTS:');
    console.log('============================================================\n');

    // Группируем по tier
    const premium = results.filter(r => r.tier === 'premium');
    const medium = results.filter(r => r.tier === 'medium');
    const fraud = results.filter(r => r.tier === 'fraud');
    const unknown = results.filter(r => r.tier === 'unknown');

    console.log(`🟢 PREMIUM TIER: ${premium.length} customers (80-90% success rate)`);
    console.log(`🟡 MEDIUM TIER: ${medium.length} customers (30-70% success rate)`);
    console.log(`🔴 FRAUD TIER: ${fraud.length} customers (0-10% success rate)`);
    console.log(`⚪ UNKNOWN: ${unknown.length} customers\n`);

    console.log('============================================================');
    console.log('📋 DETAILED LIST:');
    console.log('============================================================\n');

    results.forEach((r, idx) => {
      console.log(`${idx + 1}. ${r.email}`);
      console.log(`   Customer ID: ${r.customerId}`);
      console.log(`   Created: ${r.created}`);
      console.log(`   Card: ${r.brand} *${r.last4} (${r.funding})`);
      console.log(`   CVC Check: ${r.cvcCheck}`);
      console.log(`   Tier: ${r.tier.toUpperCase()}`);
      console.log(`   Next Payment: ${r.nextPayment}`);
      console.log(`   Success Probability: ${r.probability} ${r.prediction}`);
      console.log('');
    });

    // Статистика
    console.log('============================================================');
    console.log('📈 PREDICTED OUTCOME:');
    console.log('============================================================');
    
    const totalRevenue49 = results.length * 49;
    const expectedRevenuePremium = premium.length * 49 * 0.85; // 85% success
    const expectedRevenueMedium = medium.length * 49 * 0.45; // 45% success
    const expectedRevenueFraud = fraud.length * 49 * 0.05; // 5% success
    const totalExpectedRevenue = expectedRevenuePremium + expectedRevenueMedium + expectedRevenueFraud;

    console.log(`Total customers: ${results.length}`);
    console.log(`Potential revenue (if all pay): $${totalRevenue49.toFixed(2)}`);
    console.log('');
    console.log('Expected revenue by tier:');
    console.log(`  Premium: ${premium.length} × $49 × 85% = $${expectedRevenuePremium.toFixed(2)}`);
    console.log(`  Medium: ${medium.length} × $49 × 45% = $${expectedRevenueMedium.toFixed(2)}`);
    console.log(`  Fraud: ${fraud.length} × $49 × 5% = $${expectedRevenueFraud.toFixed(2)}`);
    console.log('');
    console.log(`💰 Total expected revenue: $${totalExpectedRevenue.toFixed(2)}`);
    console.log(`📉 Expected loss: $${(totalRevenue49 - totalExpectedRevenue).toFixed(2)}`);
    console.log(`📊 Overall success rate: ${((totalExpectedRevenue / totalRevenue49) * 100).toFixed(1)}%`);
    console.log('============================================================');

    // Рекомендации
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('============================================================');
    
    if (medium.length > premium.length) {
      console.log('⚠️ You have more MEDIUM than PREMIUM customers!');
      console.log('   → This is why Payment CR is low (8.6%)');
      console.log('   → After Max Conversion Value, Premium % should increase');
    }

    if (fraud.length > 0) {
      console.log(`🔴 You have ${fraud.length} FRAUD tier customers waiting for $49`);
      console.log('   → These will likely fail');
      console.log('   → Consider cancelling their subscriptions');
    }

    const prepaidCount = results.filter(r => r.funding === 'prepaid').length;
    if (prepaidCount > results.length * 0.3) {
      console.log(`⚠️ ${prepaidCount} prepaid cards (${((prepaidCount/results.length)*100).toFixed(0)}%)`);
      console.log('   → High risk of insufficient funds on $49');
      console.log('   → Consider Radar rule: Block prepaid + risk > 50');
    }

    console.log('============================================================');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

analyzeWaiting49Payments().catch(console.error);
