import Stripe from 'stripe';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, '../.env.local') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function analyzeCardsAndPredict() {
  // Дата начала: 12 января 2026
  const startDate = new Date('2026-01-12T00:00:00Z');
  const startTimestamp = Math.floor(startDate.getTime() / 1000);
  const now = Math.floor(Date.now() / 1000);
  
  console.log('🔍 Анализ всех карт с', startDate.toISOString());
  console.log('============================================================\n');

  let cards = [];
  let hasMore = true;
  let startingAfter = null;

  // 1. Собираем все PaymentIntents $1 (initial payments)
  console.log('📊 Собираю начальные платежи $1...');
  while (hasMore) {
    const listParams = {
      limit: 100,
      created: { gte: startTimestamp },
    };
    if (startingAfter) {
      listParams.starting_after = startingAfter;
    }
    const payments = await stripe.paymentIntents.list(listParams);

    for (const pi of payments.data) {
      // Интересуют только успешные $2.99 платежи
      if (pi.amount === 100 && pi.status === 'succeeded' && pi.customer) {
        cards.push({
          payment_intent_id: pi.id,
          customer_id: pi.customer,
          payment_method_id: pi.payment_method,
          created: new Date(pi.created * 1000).toISOString(),
          created_ts: pi.created,
        });
      }
    }

    if (payments.data.length > 0) {
      startingAfter = payments.data[payments.data.length - 1].id;
    }
    hasMore = payments.has_more;
  }

  console.log(`✅ Найдено ${cards.length} начальных платежей $1\n`);

  // 2. Получаем детальную информацию о каждой карте
  console.log('🔍 Анализирую карты...');
  
  for (const card of cards) {
    try {
      // Получаем payment method
      const pm = await stripe.paymentMethods.retrieve(card.payment_method_id);
      
      card.brand = pm.card?.brand;
      card.funding = pm.card?.funding; // credit, debit, prepaid, unknown
      card.last4 = pm.card?.last4;
      card.fingerprint = pm.card?.fingerprint;
      card.country = pm.card?.country;
      
      // Получаем customer для email
      const customer = await stripe.customers.retrieve(card.customer_id);
      card.email = customer.email;
      
      // Проверяем subscription schedule
      const schedules = await stripe.subscriptionSchedules.list({
        customer: card.customer_id,
        limit: 10,
      });
      
      card.has_schedule = schedules.data.length > 0;
      
      if (schedules.data.length > 0) {
        const schedule = schedules.data[0];
        card.schedule_status = schedule.status;
        card.schedule_id = schedule.id;
        
        // Дата первого списания $49 (через 10 дней от начального платежа)
        card.first_charge_date = new Date((card.created_ts + 10 * 86400) * 1000).toISOString();
        card.days_until_charge = Math.ceil((card.created_ts + 10 * 86400 - now) / 86400);
      }
      
      // Проверяем были ли уже попытки списать $49
      const payments49 = await stripe.paymentIntents.list({
        customer: card.customer_id,
        limit: 10,
      });
      
      card.attempts_49 = [];
      for (const pi of payments49.data) {
        if (pi.amount === 4900) {
          card.attempts_49.push({
            id: pi.id,
            status: pi.status,
            created: new Date(pi.created * 1000).toISOString(),
            failure_code: pi.last_payment_error?.code,
            decline_code: pi.last_payment_error?.decline_code,
          });
        }
      }
      
      // Проверяем invoices
      const invoices = await stripe.invoices.list({
        customer: card.customer_id,
        limit: 10,
      });
      
      for (const invoice of invoices.data) {
        if (invoice.amount_due === 4900 && invoice.status !== 'paid') {
          card.attempts_49.push({
            id: invoice.id,
            status: `invoice_${invoice.status}`,
            created: new Date(invoice.created * 1000).toISOString(),
            attempt_count: invoice.attempt_count,
          });
        }
      }
      
    } catch (error) {
      console.log(`⚠️  Ошибка для customer ${card.customer_id}:`, error.message);
    }
  }

  // 3. Прогнозируем риски
  console.log('\n🎯 ПРОГНОЗИРУЮ РИСКИ...\n');
  
  for (const card of cards) {
    // Пропускаем карты с ошибками
    if (!card.funding || !card.attempts_49) {
      continue;
    }
    
    let riskScore = 0;
    let riskFactors = [];
    
    // Фактор 1: Prepaid карта (+50 баллов риска)
    if (card.funding === 'prepaid') {
      riskScore += 50;
      riskFactors.push('Prepaid card (высокий риск)');
    }
    
    // Фактор 2: Unknown funding type (+30 баллов)
    if (card.funding === 'unknown') {
      riskScore += 30;
      riskFactors.push('Unknown card type');
    }
    
    // Фактор 3: Уже были failed попытки списать $49 (+100 баллов - критично!)
    if (card.attempts_49.some(a => ['failed', 'requires_payment_method', 'invoice_open', 'invoice_uncollectible'].includes(a.status))) {
      riskScore += 100;
      riskFactors.push('❌ УЖЕ БЫЛИ FAILED ПЛАТЕЖИ!');
    }
    
    // Фактор 4: Уже прошли успешные $49 платежи (-50 баллов - снижение риска)
    if (card.attempts_49.some(a => a.status === 'succeeded')) {
      riskScore -= 50;
      riskFactors.push('✅ Есть успешные $49 платежи');
    }
    
    // Фактор 5: Нет subscription schedule (+20 баллов)
    if (!card.has_schedule) {
      riskScore += 20;
      riskFactors.push('Нет subscription schedule');
    }
    
    // Фактор 6: Debit карта (нейтрально, 0 баллов)
    if (card.funding === 'debit') {
      riskFactors.push('Debit card (средний риск)');
    }
    
    // Фактор 7: Credit карта (-10 баллов, низкий риск)
    if (card.funding === 'credit') {
      riskScore -= 10;
      riskFactors.push('Credit card (низкий риск)');
    }
    
    card.risk_score = Math.max(0, Math.min(100, riskScore)); // 0-100
    card.risk_factors = riskFactors;
    
    // Категория риска
    if (card.risk_score >= 70) {
      card.risk_category = '🔴 ВЫСОКИЙ';
      card.prediction = 'Скорее всего провалится';
    } else if (card.risk_score >= 40) {
      card.risk_category = '🟡 СРЕДНИЙ';
      card.prediction = '50/50 шанс';
    } else {
      card.risk_category = '🟢 НИЗКИЙ';
      card.prediction = 'Скорее всего успешен';
    }
  }

  // 4. Сортируем по риску (от высокого к низкому)
  cards.sort((a, b) => b.risk_score - a.risk_score);

  // 5. Выводим результаты
  console.log('============================================================');
  console.log('📊 АНАЛИЗ И ПРОГНОЗ ПО КАРТАМ:');
  console.log('============================================================\n');

  // Статистика
  const validCards = cards.filter(c => c.attempts_49 !== undefined);
  const highRisk = validCards.filter(c => c.risk_score >= 70).length;
  const mediumRisk = validCards.filter(c => c.risk_score >= 40 && c.risk_score < 70).length;
  const lowRisk = validCards.filter(c => c.risk_score < 40).length;
  
  const alreadyFailed = validCards.filter(c => c.attempts_49 && c.attempts_49.some(a => ['failed', 'requires_payment_method'].includes(a.status))).length;
  const alreadySucceeded = validCards.filter(c => c.attempts_49 && c.attempts_49.some(a => a.status === 'succeeded')).length;
  const notYetCharged = validCards.filter(c => c.attempts_49 && c.attempts_49.length === 0).length;
  
  console.log('📈 ОБЩАЯ СТАТИСТИКА:');
  console.log(`   Всего карт: ${validCards.length} (найдено ${cards.length}, ${cards.length - validCards.length} с ошибками)`);
  console.log(`   🔴 Высокий риск: ${highRisk} (${validCards.length > 0 ? ((highRisk/validCards.length)*100).toFixed(1) : 0}%)`);
  console.log(`   🟡 Средний риск: ${mediumRisk} (${validCards.length > 0 ? ((mediumRisk/validCards.length)*100).toFixed(1) : 0}%)`);
  console.log(`   🟢 Низкий риск: ${lowRisk} (${validCards.length > 0 ? ((lowRisk/validCards.length)*100).toFixed(1) : 0}%)`);
  console.log('');
  console.log('📊 СТАТУС СПИСАНИЙ:');
  console.log(`   ✅ Уже успешно списано $49: ${alreadySucceeded}`);
  console.log(`   ❌ Уже провалились попытки: ${alreadyFailed}`);
  console.log(`   ⏳ Еще не было попыток: ${notYetCharged}`);
  console.log('');
  
  // Детальный список
  console.log('============================================================');
  console.log('📋 ДЕТАЛЬНЫЙ СПИСОК (топ-30 по риску):');
  console.log('============================================================\n');
  
  cards.slice(0, 30).forEach((card, index) => {
    // Пропускаем карты с ошибками
    if (!card.risk_category || !card.attempts_49) {
      return;
    }
    
    console.log(`${index + 1}. ${card.risk_category} (Risk Score: ${card.risk_score})`);
    console.log(`   Customer: ${card.customer_id}`);
    console.log(`   Card: ${card.brand || 'N/A'} *${card.last4 || 'N/A'} (${card.funding || 'unknown'})`);
    console.log(`   Email: ${card.email || 'N/A'}`);
    console.log(`   Создан: ${card.created}`);
    
    if (card.days_until_charge !== undefined) {
      if (card.days_until_charge > 0) {
        console.log(`   ⏳ До первого списания $49: ${card.days_until_charge} дней (${card.first_charge_date})`);
      } else {
        console.log(`   ⚠️  Списание $49 должно было произойти ${Math.abs(card.days_until_charge)} дней назад`);
      }
    }
    
    if (card.attempts_49 && card.attempts_49.length > 0) {
      console.log(`   Попытки списать $49:`);
      card.attempts_49.forEach(attempt => {
        const statusEmoji = attempt.status === 'succeeded' ? '✅' : '❌';
        console.log(`     ${statusEmoji} ${attempt.status} - ${attempt.created}${attempt.failure_code ? ` (${attempt.failure_code})` : ''}`);
      });
    }
    
    console.log(`   Факторы риска:`);
    card.risk_factors.forEach(factor => {
      console.log(`     • ${factor}`);
    });
    console.log(`   ➡️  ПРОГНОЗ: ${card.prediction}`);
    console.log('');
  });
  
  // Прогноз потерь
  console.log('============================================================');
  console.log('💸 ПРОГНОЗ ФИНАНСОВЫХ ПОТЕРЬ:');
  console.log('============================================================\n');
  
  const potentialRevenue = validCards.length * 49 * 3; // 3 платежа по $49
  const expectedLosses = highRisk * 49 * 3 + mediumRisk * 49 * 1.5;
  const expectedRevenue = potentialRevenue - expectedLosses;
  
  console.log(`Потенциальная выручка (если все заплатят): $${potentialRevenue.toFixed(2)}`);
  console.log(`Ожидаемые потери (высокий + 50% среднего риска): $${expectedLosses.toFixed(2)}`);
  console.log(`Ожидаемая реальная выручка: $${expectedRevenue.toFixed(2)}`);
  console.log(`Прогнозируемый Success Rate: ${potentialRevenue > 0 ? ((expectedRevenue/potentialRevenue)*100).toFixed(1) : 0}%`);
  
  console.log('\n============================================================');
}

analyzeCardsAndPredict().catch(console.error);
