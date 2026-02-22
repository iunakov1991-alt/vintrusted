/**
 * Тест распределения tier (Premium/Medium/Fraud) на реальных транзакциях
 * 
 * Этот скрипт:
 * 1. Получает все успешные $1 PaymentIntents с 12 января
 * 2. Для каждого применяет логику getCardTier()
 * 3. Выводит статистику распределения tier
 * 4. Помогает решить: нужно ли поднимать Medium с $5 до $10
 * 
 * Запуск: node scripts/test-tier-distribution.js
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
 * Определяет tier карты на основе Stripe PaymentIntent и PaymentMethod
 * 
 * Tier 1 (Premium): $25
 * - funding = credit/debit
 * - cvc_check = pass
 * - risk_level != highest
 * 
 * Tier 2 (Medium): $5
 * - funding = prepaid/unknown
 * - cvc_check = pass (или unavailable)
 * - risk_level != highest
 * 
 * Tier 3 (Fraud): $0
 * - risk_level = highest
 * - cvc_check = fail
 */
function getCardTier(paymentIntent, paymentMethod) {
  const card = paymentMethod.card;
  const outcome = paymentIntent.charges?.data[0]?.outcome;

  // Проверяем наличие данных
  if (!card) {
    console.log('⚠️ No card data, defaulting to Medium');
    return 'medium';
  }

  // Tier 3 (Fraud): блокируем
  if (outcome?.risk_level === 'highest') {
    return 'fraud';
  }

  if (card.checks?.cvc_check === 'fail') {
    return 'fraud';
  }

  // Tier 1 (Premium): лучшие карты
  if ((card.funding === 'credit' || card.funding === 'debit') && card.checks?.cvc_check === 'pass') {
    return 'premium';
  }

  // Tier 2 (Medium): prepaid, unknown, или нет cvc_check
  if (card.funding === 'prepaid' || card.funding === 'unknown') {
    return 'medium';
  }

  // Default: Medium (на всякий случай)
  return 'medium';
}

async function testTierDistribution() {
  console.log('🔍 Fetching all $1 PaymentIntents since January 12, 2026...\n');

  try {
    const startDate = new Date('2026-01-12T00:00:00Z');
    const startTimestamp = Math.floor(startDate.getTime() / 1000);

    let allPaymentIntents = [];
    let hasMore = true;
    let startingAfter = undefined;

    // Fetching all PaymentIntents
    while (hasMore) {
      const response = await stripe.paymentIntents.list({
        limit: 100,
        created: { gte: startTimestamp },
        starting_after: startingAfter
      });

      allPaymentIntents = allPaymentIntents.concat(response.data);
      hasMore = response.has_more;
      if (hasMore && response.data.length > 0) {
        startingAfter = response.data[response.data.length - 1].id;
      }
    }

    // Фильтруем только успешные $2.99 платежи
    const trialPayments = allPaymentIntents.filter(pi => 
      pi.amount === 100 && pi.status === 'succeeded'
    );

    console.log(`✅ Found ${trialPayments.length} successful $1 trial payments\n`);

    if (trialPayments.length === 0) {
      console.log('❌ No trial payments found. Exiting.');
      return;
    }

    // Статистика по tier
    const tierStats = {
      premium: 0,
      medium: 0,
      fraud: 0
    };

    const tierDetails = [];

    // Анализируем каждый PaymentIntent
    for (const pi of trialPayments) {
      const paymentMethodId = pi.payment_method;
      if (!paymentMethodId) {
        console.log(`⚠️ PaymentIntent ${pi.id} has no payment_method, skipping`);
        continue;
      }

      try {
        const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
        const tier = getCardTier(pi, pm);
        tierStats[tier]++;

        tierDetails.push({
          id: pi.id,
          created: new Date(pi.created * 1000).toISOString(),
          email: pi.receipt_email || pi.charges?.data[0]?.billing_details?.email || 'N/A',
          funding: pm.card?.funding || 'unknown',
          brand: pm.card?.brand || 'unknown',
          cvc_check: pm.card?.checks?.cvc_check || 'N/A',
          risk_level: pi.charges?.data[0]?.outcome?.risk_level || 'N/A',
          tier: tier
        });
      } catch (error) {
        console.log(`⚠️ Error retrieving PaymentMethod ${paymentMethodId}:`, error.message);
      }
    }

    // Выводим статистику
    console.log('============================================================');
    console.log('📊 TIER DISTRIBUTION:');
    console.log('============================================================');
    console.log(`🟢 Premium (credit/debit, cvc_pass): ${tierStats.premium} (${((tierStats.premium / trialPayments.length) * 100).toFixed(1)}%)`);
    console.log(`🟡 Medium (prepaid/unknown): ${tierStats.medium} (${((tierStats.medium / trialPayments.length) * 100).toFixed(1)}%)`);
    console.log(`🔴 Fraud (risk_highest, cvc_fail): ${tierStats.fraud} (${((tierStats.fraud / trialPayments.length) * 100).toFixed(1)}%)`);
    console.log('============================================================\n');

    // Рекомендации
    const premiumPercent = (tierStats.premium / trialPayments.length) * 100;
    const mediumPercent = (tierStats.medium / trialPayments.length) * 100;

    console.log('💡 RECOMMENDATIONS:');
    console.log('============================================================');
    if (premiumPercent < 30) {
      console.log('⚠️ Premium < 30% → Рассмотри повышение Medium с $5 до $10');
      console.log('   Причина: слишком мало "качественных" конверсий для обучения');
    } else if (premiumPercent > 70) {
      console.log('✅ Premium > 70% → Текущие значения ($25/$5) оптимальны');
      console.log('   Google Ads получает достаточно сильных сигналов');
    } else {
      console.log('✅ Premium 30-70% → Текущие значения ($25/$5) хороши');
      console.log('   Сбалансированное распределение для обучения алгоритма');
    }

    if (mediumPercent > 50) {
      console.log('⚠️ Medium > 50% → Много prepaid/unknown карт');
      console.log('   Рассмотри использование BIN-checker для доп. фильтрации');
    }

    console.log('============================================================\n');

    // Выводим детали (первые 10)
    console.log('📋 SAMPLE DETAILS (first 10):');
    console.log('============================================================');
    tierDetails.slice(0, 10).forEach((detail, idx) => {
      console.log(`${idx + 1}. ${detail.id}`);
      console.log(`   Created: ${detail.created}`);
      console.log(`   Email: ${detail.email}`);
      console.log(`   Card: ${detail.brand} ${detail.funding}`);
      console.log(`   CVC: ${detail.cvc_check}, Risk: ${detail.risk_level}`);
      console.log(`   ➡️ Tier: ${detail.tier.toUpperCase()}`);
      console.log('');
    });

    // Экспорт в CSV (опционально)
    console.log('💾 Want to export to CSV? Add this code:\n');
    console.log('const csv = tierDetails.map(d => `${d.id},${d.created},${d.email},${d.funding},${d.cvc_check},${d.risk_level},${d.tier}`).join("\\n");');
    console.log('fs.writeFileSync("tier-distribution.csv", csv);');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testTierDistribution().catch(console.error);
