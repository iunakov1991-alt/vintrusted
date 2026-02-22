/**
 * Анализ эффективности tier-based валидации
 * 
 * Сравниваем:
 * - Все $2.99 платежи с gclid за январь
 * - Сколько из них успешно оплатили $49 через 3+ дня
 * - Какие tier были присвоены (Premium/Medium/Fraud)
 * - Корреляция между tier и успехом $49
 */

const Stripe = require('stripe');
const { kv } = require('@vercel/kv');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Период анализа - все платежи с начала проекта
const START_DATE = new Date('2026-01-01T00:00:00Z');
const END_DATE = new Date('2026-02-28T23:59:59Z');

async function analyzeTierEffectiveness() {
  console.log('🔍 Analyzing tier-based validation effectiveness...');
  console.log('📅 Period:', START_DATE.toDateString(), '→', END_DATE.toDateString());
  console.log('');

  // 1. Получаем все PaymentIntents за период (trial платежи)
  console.log('📥 Fetching all trial payments (initial $1/$2.99)...');
  
  const allPayments = [];
  let hasMore = true;
  let startingAfter = null;
  
  while (hasMore) {
    const params = {
      limit: 100,
      created: {
        gte: Math.floor(START_DATE.getTime() / 1000),
        lte: Math.floor(END_DATE.getTime() / 1000)
      }
    };
    
    if (startingAfter) {
      params.starting_after = startingAfter;
    }
    
    const paymentIntents = await stripe.paymentIntents.list(params);
    
    // Фильтруем только trial платежи: $1 (100 cents) или $2.99 (299 cents), успешные, с gclid
    const filtered = paymentIntents.data.filter(pi => 
      (pi.amount === 100 || pi.amount === 299) && 
      pi.status === 'succeeded' &&
      pi.metadata?.gclid // Только из Google Ads
    );
    
    allPayments.push(...filtered);
    
    hasMore = paymentIntents.has_more;
    if (hasMore) {
      startingAfter = paymentIntents.data[paymentIntents.data.length - 1].id;
    }
    
    console.log(`  Fetched ${paymentIntents.data.length} payments, found ${filtered.length} trial with gclid`);
  }
  
  console.log('');
  console.log(`✅ Total trial payments with gclid: ${allPayments.length}`);
  console.log('');

  if (allPayments.length === 0) {
    console.log('❌ No payments found for analysis');
    return;
  }

  // 2. Для каждого платежа проверяем:
  //    - Tier (Premium/Medium/Fraud)
  //    - Был ли успешный $49 платеж от того же customer
  
  const results = {
    premium: { total: 0, successful_49: 0, failed_49: 0, pending: 0 },
    medium: { total: 0, successful_49: 0, failed_49: 0, pending: 0 },
    unknown: { total: 0, successful_49: 0, failed_49: 0, pending: 0 }
  };
  
  const detailedLogs = [];

  console.log('🔍 Analyzing each payment...');
  console.log('');

  for (const pi of allPayments) {
    const customerId = pi.customer;
    const paymentDate = new Date(pi.created * 1000);
    const gclid = pi.metadata?.gclid || 'N/A';
    
    // Определяем tier
    let tier = 'unknown';
    try {
      const pm = await stripe.paymentMethods.retrieve(pi.payment_method);
      const charge = pi.charges?.data[0];
      const outcome = charge?.outcome;
      const card = pm.card;
      
      if (outcome?.risk_level === 'highest' || card?.checks?.cvc_check === 'fail') {
        tier = 'fraud';
      } else if ((card?.funding === 'credit' || card?.funding === 'debit') && card?.checks?.cvc_check === 'pass') {
        tier = 'premium';
      } else if (card?.funding === 'prepaid' || !card?.checks?.cvc_check) {
        tier = 'medium';
      }
      
      // Проверяем был ли успешный $49 платеж (3+ дня после $2.99)
      const dayThreeTimestamp = Math.floor(paymentDate.getTime() / 1000) + (3 * 86400);
      const now = Math.floor(Date.now() / 1000);
      
      let status49 = 'pending'; // pending | successful | failed
      
      if (now > dayThreeTimestamp) {
        // Время прошло, проверяем были ли $49 платежи
        const invoices = await stripe.invoices.list({
          customer: customerId,
          limit: 50
        });
        
        // Ищем invoice за $49 (4900 cents)
        const has49Success = invoices.data.some(inv => 
          inv.amount_paid === 4900 && 
          inv.status === 'paid' &&
          inv.created > pi.created + (2 * 86400) // Минимум через 2 дня после $2.99
        );
        
        const has49Failed = invoices.data.some(inv => 
          inv.amount_due === 4900 && 
          (inv.status === 'open' || inv.status === 'uncollectible') &&
          inv.created > pi.created + (2 * 86400)
        );
        
        if (has49Success) {
          status49 = 'successful';
        } else if (has49Failed) {
          status49 = 'failed';
        } else {
          // Возможно подписка была отменена до $49 charge
          const subs = await stripe.subscriptions.list({
            customer: customerId,
            limit: 10
          });
          
          const hasCanceled = subs.data.some(sub => sub.status === 'canceled');
          status49 = hasCanceled ? 'failed' : 'pending';
        }
      }
      
      // Записываем результаты
      results[tier].total++;
      
      if (status49 === 'successful') {
        results[tier].successful_49++;
      } else if (status49 === 'failed') {
        results[tier].failed_49++;
      } else {
        results[tier].pending++;
      }
      
      detailedLogs.push({
        payment_id: pi.id,
        customer_id: customerId,
        date: paymentDate.toISOString().split('T')[0],
        tier,
        funding: card?.funding || 'N/A',
        cvc_check: card?.checks?.cvc_check || 'N/A',
        risk_level: outcome?.risk_level || 'N/A',
        status_49: status49,
        gclid: gclid.substring(0, 15) + '...'
      });
      
    } catch (error) {
      console.error(`❌ Error analyzing ${pi.id}:`, error.message);
      results.unknown.total++;
    }
  }
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 РЕЗУЛЬТАТЫ АНАЛИЗА');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  
  // Функция для расчета success rate
  const calcRate = (successful, total) => {
    if (total === 0) return 'N/A';
    return `${((successful / total) * 100).toFixed(1)}%`;
  };
  
  // Premium
  console.log('🟢 PREMIUM ($25 tier)');
  console.log(`   Total: ${results.premium.total}`);
  console.log(`   ✅ $49 Successful: ${results.premium.successful_49} (${calcRate(results.premium.successful_49, results.premium.total)})`);
  console.log(`   ❌ $49 Failed: ${results.premium.failed_49} (${calcRate(results.premium.failed_49, results.premium.total)})`);
  console.log(`   ⏳ Pending: ${results.premium.pending}`);
  console.log('');
  
  // Medium
  console.log('🟡 MEDIUM ($5 tier)');
  console.log(`   Total: ${results.medium.total}`);
  console.log(`   ✅ $49 Successful: ${results.medium.successful_49} (${calcRate(results.medium.successful_49, results.medium.total)})`);
  console.log(`   ❌ $49 Failed: ${results.medium.failed_49} (${calcRate(results.medium.failed_49, results.medium.total)})`);
  console.log(`   ⏳ Pending: ${results.medium.pending}`);
  console.log('');
  
  // Unknown
  console.log('⚪ UNKNOWN (no tier data)');
  console.log(`   Total: ${results.unknown.total}`);
  console.log(`   ✅ $49 Successful: ${results.unknown.successful_49} (${calcRate(results.unknown.successful_49, results.unknown.total)})`);
  console.log(`   ❌ $49 Failed: ${results.unknown.failed_49} (${calcRate(results.unknown.failed_49, results.unknown.total)})`);
  console.log(`   ⏳ Pending: ${results.unknown.pending}`);
  console.log('');
  
  // Общая статистика
  const totalAnalyzed = results.premium.total + results.medium.total + results.unknown.total;
  const totalSuccessful = results.premium.successful_49 + results.medium.successful_49 + results.unknown.successful_49;
  const totalFailed = results.premium.failed_49 + results.medium.failed_49 + results.unknown.failed_49;
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📈 ОБЩАЯ СТАТИСТИКА');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Total analyzed: ${totalAnalyzed}`);
  console.log(`✅ $49 Successful: ${totalSuccessful} (${calcRate(totalSuccessful, totalAnalyzed)})`);
  console.log(`❌ $49 Failed: ${totalFailed} (${calcRate(totalFailed, totalAnalyzed)})`);
  console.log('');
  
  // Эффективность tier-based
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🎯 ЭФФЕКТИВНОСТЬ TIER-BASED ВАЛИДАЦИИ');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  
  const premiumSuccessRate = results.premium.total > 0 
    ? (results.premium.successful_49 / results.premium.total) * 100 
    : 0;
  const mediumSuccessRate = results.medium.total > 0 
    ? (results.medium.successful_49 / results.medium.total) * 100 
    : 0;
  const diff = premiumSuccessRate - mediumSuccessRate;
  
  console.log(`Premium Success Rate: ${premiumSuccessRate.toFixed(1)}%`);
  console.log(`Medium Success Rate: ${mediumSuccessRate.toFixed(1)}%`);
  console.log(`Difference: ${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`);
  console.log('');
  
  if (Math.abs(diff) < 5) {
    console.log('❌ ВЕРДИКТ: Tier-based валидация НЕ РАБОТАЕТ');
    console.log('   Разница < 5% - tier не предсказывает успех $49');
  } else if (diff > 15) {
    console.log('✅ ВЕРДИКТ: Tier-based валидация РАБОТАЕТ');
    console.log('   Premium значительно лучше предсказывает успех');
  } else {
    console.log('🟡 ВЕРДИКТ: Tier-based валидация СЛАБО РАБОТАЕТ');
    console.log('   Есть корреляция, но не достаточная для принятия решений');
  }
  console.log('');
  
  // Детальный лог (первые 20 записей)
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📋 ДЕТАЛЬНЫЙ ЛОГ (первые 20 записей)');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  
  detailedLogs.slice(0, 20).forEach((log, idx) => {
    const tierEmoji = log.tier === 'premium' ? '🟢' : log.tier === 'medium' ? '🟡' : '⚪';
    const statusEmoji = log.status_49 === 'successful' ? '✅' : log.status_49 === 'failed' ? '❌' : '⏳';
    
    console.log(`${idx + 1}. ${tierEmoji} ${log.tier.toUpperCase().padEnd(8)} | ${statusEmoji} $49: ${log.status_49.padEnd(10)} | ${log.date}`);
    console.log(`   Customer: ${log.customer_id}`);
    console.log(`   Card: ${log.funding} | CVC: ${log.cvc_check} | Risk: ${log.risk_level}`);
    console.log(`   GCLID: ${log.gclid}`);
    console.log('');
  });
  
  if (detailedLogs.length > 20) {
    console.log(`... и еще ${detailedLogs.length - 20} записей`);
    console.log('');
  }
  
  // Рекомендации
  console.log('═══════════════════════════════════════════════════════════');
  console.log('💡 РЕКОМЕНДАЦИИ');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  
  if (Math.abs(diff) < 5) {
    console.log('1. ❌ Убрать tier-based валидацию - она не работает');
    console.log('2. ✅ Переключиться на "Скачать отчет" как конверсию');
    console.log('3. ✅ Использовать auto-blacklist после failed $49');
  } else if (diff > 15) {
    console.log('1. ✅ Tier-based работает - можно оставить');
    console.log('2. 💰 Увеличить bid adjustment для Premium tier');
    console.log('3. 📉 Уменьшить bid для Medium tier или вообще отключить');
  } else {
    console.log('1. 🟡 Tier-based имеет слабый эффект');
    console.log('2. 🤔 Рассмотреть комбо: tier + "Скачать отчет"');
    console.log('3. 📊 Собрать больше данных для точности');
  }
  
  console.log('');
}

// Запуск
analyzeTierEffectiveness()
  .then(() => {
    console.log('✅ Analysis complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
