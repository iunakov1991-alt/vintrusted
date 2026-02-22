const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Вероятности конверсии по tier
const CONVERSION_RATES = {
  PREMIUM: {
    first: 0.60,   // Консервативно с учетом реальных данных
    second: 0.50,
    third: 0.40
  },
  MEDIUM: {
    first: 0.30,
    second: 0.20,
    third: 0.15
  }
};

(async () => {
  try {
    // 4 января 2026 00:00:00 UTC
    const startDate = new Date('2026-01-04T00:00:00Z');
    const startTimestamp = Math.floor(startDate.getTime() / 1000);
    
    console.log('📊 АНАЛИЗ С 4 ЯНВАРЯ 2026:\n');
    console.log('='.repeat(100));
    console.log(`Период: С ${startDate.toLocaleDateString('ru-RU')}\n`);
    
    // Получаем все PaymentIntents с 4 января
    let allPaymentIntents = [];
    let hasMore = true;
    let startingAfter = null;
    
    while (hasMore) {
      const params = { 
        limit: 100,
        created: { gte: startTimestamp }
      };
      if (startingAfter) {
        params.starting_after = startingAfter;
      }
      
      const response = await stripe.paymentIntents.list(params);
      allPaymentIntents = allPaymentIntents.concat(response.data);
      
      hasMore = response.has_more;
      if (hasMore) {
        startingAfter = response.data[response.data.length - 1].id;
      }
    }
    
    // Фильтруем триалы и $49 платежи
    const trials = allPaymentIntents.filter(pi => pi.amount === 100 && pi.status === 'succeeded');
    const payments49All = allPaymentIntents.filter(pi => pi.amount === 4900);
    const payments49Success = payments49All.filter(p => p.status === 'succeeded');
    const payments49Failed = payments49All.filter(p => p.status === 'requires_payment_method' || p.status === 'canceled');
    
    console.log(`💰 ТРИАЛЫ ($1):                      ${trials.length}`);
    console.log(`💰 $49 ПЛАТЕЖЕЙ УСПЕШНЫХ:            ${payments49Success.length}`);
    console.log(`💰 $49 ПЛАТЕЖЕЙ НЕУСПЕШНЫХ:          ${payments49Failed.length}`);
    console.log('\n' + '='.repeat(100));
    
    // Анализ триалов
    console.log('\n📋 ТРИАЛЫ ($1) С 4 ЯНВАРЯ:\n');
    
    const trialData = [];
    
    for (const trial of trials) {
      const customer = await stripe.customers.retrieve(trial.customer);
      
      let tier = 'unknown';
      let pm = null;
      let charge = null;
      let cardInfo = '';
      
      try {
        pm = await stripe.paymentMethods.retrieve(trial.payment_method);
        if (trial.latest_charge) {
          charge = await stripe.charges.retrieve(trial.latest_charge);
        }
      } catch (err) {}
      
      if (pm) {
        if (pm.type === 'link') {
          tier = 'PREMIUM';
          cardInfo = 'Stripe Link';
        } else if (pm.card && charge) {
          const riskScore = charge.outcome?.risk_score || 0;
          const riskLevel = charge.outcome?.risk_level || 'normal';
          
          if (riskScore > 65 || riskLevel === 'highest' || riskLevel === 'elevated') {
            tier = 'FRAUD';
          } else if (pm.card.funding === 'credit' && pm.card.country === 'US' && riskLevel === 'normal') {
            tier = 'PREMIUM';
          } else {
            tier = 'MEDIUM';
          }
          
          cardInfo = `${pm.card.brand} ****${pm.card.last4} (${pm.card.country}, ${pm.card.funding})`;
        }
      }
      
      const rates = CONVERSION_RATES[tier] || CONVERSION_RATES.MEDIUM;
      const expectedRevenue = 1 + (rates.first * 49) + (rates.second * 49) + (rates.third * 49);
      
      trialData.push({
        email: customer.email || 'N/A',
        date: new Date(trial.created * 1000),
        tier: tier,
        cardInfo: cardInfo,
        riskScore: charge?.outcome?.risk_score || 'N/A',
        customerId: trial.customer,
        expectedRevenue: expectedRevenue,
        prob1: rates.first * 100,
        prob2: rates.second * 100,
        prob3: rates.third * 100
      });
    }
    
    trialData.sort((a, b) => b.date - a.date);
    
    for (let i = 0; i < trialData.length; i++) {
      const t = trialData[i];
      const dateStr = t.date.toLocaleDateString('ru-RU');
      const timeStr = t.date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      
      console.log(`${(i + 1).toString().padStart(2)}. ${t.email}`);
      console.log(`    Дата: ${dateStr} ${timeStr}`);
      console.log(`    Tier: ${t.tier.padEnd(7)} | ${t.cardInfo}`);
      console.log(`    Risk: ${t.riskScore}`);
      console.log(`    Вероятности: 1-й (${t.prob1.toFixed(0)}%) | 2-й (${t.prob2.toFixed(0)}%) | 3-й (${t.prob3.toFixed(0)}%)`);
      console.log(`    Ожидаемо: $${t.expectedRevenue.toFixed(2)}`);
      console.log('');
    }
    
    console.log('='.repeat(100));
    
    // Статистика по tier
    const premiumTrials = trialData.filter(t => t.tier === 'PREMIUM');
    const mediumTrials = trialData.filter(t => t.tier === 'MEDIUM');
    const fraudTrials = trialData.filter(t => t.tier === 'FRAUD');
    
    const totalExpected = trialData.reduce((sum, t) => sum + t.expectedRevenue, 0);
    const premiumExpected = premiumTrials.reduce((sum, t) => sum + t.expectedRevenue, 0);
    const mediumExpected = mediumTrials.reduce((sum, t) => sum + t.expectedRevenue, 0);
    
    console.log('\n📈 СТАТИСТИКА ПО TIER (ТРИАЛЫ):\n');
    console.log(`🏆 PREMIUM: ${premiumTrials.length} клиентов (${((premiumTrials.length / trialData.length) * 100).toFixed(1)}%)`);
    console.log(`   Ожидаемая выручка: $${premiumExpected.toFixed(2)}`);
    if (premiumTrials.length > 0) {
      console.log(`   Средняя на клиента: $${(premiumExpected / premiumTrials.length).toFixed(2)}`);
    }
    console.log('');
    
    console.log(`⚠️  MEDIUM: ${mediumTrials.length} клиентов (${((mediumTrials.length / trialData.length) * 100).toFixed(1)}%)`);
    console.log(`   Ожидаемая выручка: $${mediumExpected.toFixed(2)}`);
    if (mediumTrials.length > 0) {
      console.log(`   Средняя на клиента: $${(mediumExpected / mediumTrials.length).toFixed(2)}`);
    }
    console.log('');
    
    if (fraudTrials.length > 0) {
      console.log(`❌ FRAUD: ${fraudTrials.length} клиентов`);
      console.log('');
    }
    
    console.log('='.repeat(100));
    
    // Анализ $49 платежей
    console.log('\n💰 $49 ПЛАТЕЖИ С 4 ЯНВАРЯ:\n');
    
    console.log(`✅ УСПЕШНЫЕ: ${payments49Success.length}\n`);
    
    const successRevenue = payments49Success.length * 49;
    
    for (let i = 0; i < payments49Success.length; i++) {
      const p = payments49Success[i];
      const customer = await stripe.customers.retrieve(p.customer);
      const date = new Date(p.created * 1000);
      
      console.log(`${i + 1}. ${customer.email || 'N/A'}`);
      console.log(`   Дата: ${date.toLocaleDateString('ru-RU')} ${date.toLocaleTimeString('ru-RU')}`);
      console.log(`   Amount: $49.00`);
      console.log('');
    }
    
    console.log('─'.repeat(100));
    console.log(`\n❌ НЕУСПЕШНЫЕ: ${payments49Failed.length}\n`);
    
    const failureReasons = {};
    
    for (let i = 0; i < payments49Failed.length; i++) {
      const p = payments49Failed[i];
      const customer = await stripe.customers.retrieve(p.customer);
      const date = new Date(p.created * 1000);
      const error = p.last_payment_error?.message || 'Unknown';
      
      failureReasons[error] = (failureReasons[error] || 0) + 1;
      
      console.log(`${i + 1}. ${customer.email || 'N/A'}`);
      console.log(`   Дата: ${date.toLocaleDateString('ru-RU')} ${date.toLocaleTimeString('ru-RU')}`);
      console.log(`   Причина: ${error}`);
      console.log('');
    }
    
    console.log('='.repeat(100));
    
    // Итоговая статистика
    console.log('\n🎯 ИТОГОВАЯ СТАТИСТИКА С 4 ЯНВАРЯ:\n');
    
    console.log('ТРИАЛЫ:');
    console.log(`   Количество: ${trials.length}`);
    console.log(`   Выручка: $${trials.length}`);
    console.log(`   Premium tier: ${premiumTrials.length} (${((premiumTrials.length / trials.length) * 100).toFixed(1)}%)`);
    console.log(`   Medium tier: ${mediumTrials.length} (${((mediumTrials.length / trials.length) * 100).toFixed(1)}%)`);
    console.log('');
    
    console.log('$49 ПЛАТЕЖИ:');
    console.log(`   Успешные: ${payments49Success.length}`);
    console.log(`   Неуспешные: ${payments49Failed.length}`);
    console.log(`   Конверсия: ${payments49Success.length + payments49Failed.length > 0 ? ((payments49Success.length / (payments49Success.length + payments49Failed.length)) * 100).toFixed(1) : 0}%`);
    console.log(`   Выручка от $49: $${successRevenue}`);
    console.log('');
    
    if (Object.keys(failureReasons).length > 0) {
      console.log('ПРИЧИНЫ ОТКАЗОВ:');
      for (const [reason, count] of Object.entries(failureReasons).sort((a, b) => b[1] - a[1])) {
        const percent = ((count / payments49Failed.length) * 100).toFixed(1);
        console.log(`   ${reason}: ${count} (${percent}%)`);
      }
      console.log('');
    }
    
    console.log('ПРОГНОЗ ОТ ТРИАЛОВ:');
    console.log(`   Ожидаемая выручка: $${totalExpected.toFixed(2)}`);
    console.log(`   Максимальная: $${(trials.length * 148).toFixed(2)}`);
    console.log(`   Вероятность реализации: ${((totalExpected / (trials.length * 148)) * 100).toFixed(1)}%`);
    console.log('');
    
    const stage1Expected = trialData.reduce((sum, t) => sum + (t.prob1 / 100), 0);
    const stage2Expected = trialData.reduce((sum, t) => sum + (t.prob2 / 100), 0);
    const stage3Expected = trialData.reduce((sum, t) => sum + (t.prob3 / 100), 0);
    
    console.log('ОЖИДАЕМЫЕ ПЛАТЕЖИ ПО ЭТАПАМ:');
    console.log(`   1-й платеж $49: ~${stage1Expected.toFixed(1)} клиентов → $${(stage1Expected * 49).toFixed(2)}`);
    console.log(`   2-й платеж $49: ~${stage2Expected.toFixed(1)} клиентов → $${(stage2Expected * 49).toFixed(2)}`);
    console.log(`   3-й платеж $49: ~${stage3Expected.toFixed(1)} клиентов → $${(stage3Expected * 49).toFixed(2)}`);
    console.log('');
    
    const recurringExpected = stage3Expected * 0.75;
    console.log('РЕКУРРЕНТНЫЕ:');
    console.log(`   Ожидается: ~${recurringExpected.toFixed(1)} клиентов`);
    console.log(`   Месячная выручка: $${(recurringExpected * 49).toFixed(2)}/мес`);
    console.log('');
    
    console.log('ВСЕГО:');
    console.log(`   Уже получено: $${trials.length + successRevenue}`);
    console.log(`   Ожидается от триалов: $${totalExpected.toFixed(2)}`);
    console.log(`   ИТОГО: $${(trials.length + successRevenue + totalExpected).toFixed(2)}`);
    console.log('');
    
    console.log('='.repeat(100));
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
})();
