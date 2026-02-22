const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Вероятности конверсии по tier
const CONVERSION_RATES = {
  PREMIUM: {
    first: 0.70,   // 70% пройдут 1-й платеж
    second: 0.60,  // 60% пройдут 2-й платеж
    third: 0.50    // 50% пройдут 3-й платеж
  },
  MEDIUM: {
    first: 0.40,   // 40% пройдут 1-й платеж
    second: 0.30,  // 30% пройдут 2-й платеж
    third: 0.20    // 20% пройдут 3-й платеж
  },
  FRAUD: {
    first: 0.05,
    second: 0.02,
    third: 0.01
  }
};

(async () => {
  try {
    console.log('💰 ПОЛНЫЙ ПРОГНОЗ ДЛЯ ВСЕХ ТРИАЛ-КЛИЕНТОВ:\n');
    console.log('='.repeat(100));
    
    // Получаем все PaymentIntents
    let allPaymentIntents = [];
    let hasMore = true;
    let startingAfter = null;
    
    while (hasMore) {
      const params = { limit: 100 };
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
    
    // Фильтруем успешные триалы
    const trials = allPaymentIntents.filter(pi => 
      pi.amount === 100 && 
      pi.status === 'succeeded'
    );
    
    console.log(`\n📋 ВСЕГО ТРИАЛОВ: ${trials.length}\n`);
    console.log('='.repeat(100));
    
    // Анализируем каждый триал
    const analysis = [];
    
    for (const trial of trials) {
      const customer = await stripe.customers.retrieve(trial.customer);
      
      // Получаем payment method и charge для tier
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
      
      // Определяем tier
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
      
      // Рассчитываем вероятности
      const rates = CONVERSION_RATES[tier] || CONVERSION_RATES.MEDIUM;
      
      const prob1 = rates.first * 100;
      const prob2 = rates.second * 100;
      const prob3 = rates.third * 100;
      
      // Ожидаемая выручка
      const expectedRevenue = 1 + (rates.first * 49) + (rates.second * 49) + (rates.third * 49);
      const maxRevenue = 1 + 147;
      
      analysis.push({
        email: customer.email || 'N/A',
        date: new Date(trial.created * 1000),
        tier: tier,
        cardInfo: cardInfo,
        riskScore: charge?.outcome?.risk_score || 'N/A',
        prob1: prob1,
        prob2: prob2,
        prob3: prob3,
        expectedRevenue: expectedRevenue,
        maxRevenue: maxRevenue
      });
    }
    
    // Сортируем по дате (новые сверху)
    analysis.sort((a, b) => b.date - a.date);
    
    // Выводим таблицу
    console.log('\n📊 ДЕТАЛЬНЫЙ ПРОГНОЗ ПО КАЖДОМУ КЛИЕНТУ:\n');
    console.log('='.repeat(100));
    console.log('');
    
    let totalExpected = 0;
    let totalMax = 0;
    
    for (let i = 0; i < analysis.length; i++) {
      const a = analysis[i];
      const dateStr = a.date.toLocaleDateString('ru-RU');
      const timeStr = a.date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      
      console.log(`${(i + 1).toString().padStart(2)}. ${a.email}`);
      console.log(`    Дата: ${dateStr} ${timeStr}`);
      console.log(`    Tier: ${a.tier.padEnd(7)} | Карта: ${a.cardInfo}`);
      console.log(`    Risk: ${a.riskScore}`);
      console.log(`    Вероятности: 1-й=$${49} (${a.prob1.toFixed(0)}%) | 2-й=$${49} (${a.prob2.toFixed(0)}%) | 3-й=$${49} (${a.prob3.toFixed(0)}%)`);
      console.log(`    Ожидаемо: $${a.expectedRevenue.toFixed(2)} из $${a.maxRevenue}`);
      console.log('');
      
      totalExpected += a.expectedRevenue;
      totalMax += a.maxRevenue;
    }
    
    console.log('='.repeat(100));
    
    // Статистика по tier
    const premiumCount = analysis.filter(a => a.tier === 'PREMIUM').length;
    const mediumCount = analysis.filter(a => a.tier === 'MEDIUM').length;
    const fraudCount = analysis.filter(a => a.tier === 'FRAUD').length;
    
    const premiumExpected = analysis.filter(a => a.tier === 'PREMIUM').reduce((sum, a) => sum + a.expectedRevenue, 0);
    const mediumExpected = analysis.filter(a => a.tier === 'MEDIUM').reduce((sum, a) => sum + a.expectedRevenue, 0);
    
    console.log('\n📈 СТАТИСТИКА ПО TIER:\n');
    console.log(`🏆 PREMIUM: ${premiumCount} клиентов`);
    console.log(`   Ожидаемая выручка: $${premiumExpected.toFixed(2)}`);
    console.log(`   Средняя на клиента: $${(premiumExpected / premiumCount).toFixed(2)}`);
    console.log('');
    
    console.log(`⚠️  MEDIUM: ${mediumCount} клиентов`);
    console.log(`   Ожидаемая выручка: $${mediumExpected.toFixed(2)}`);
    console.log(`   Средняя на клиента: $${(mediumExpected / mediumCount).toFixed(2)}`);
    console.log('');
    
    if (fraudCount > 0) {
      console.log(`❌ FRAUD: ${fraudCount} клиентов`);
      console.log('');
    }
    
    console.log('='.repeat(100));
    
    // Прогноз по этапам
    const stage1Expected = analysis.reduce((sum, a) => sum + (a.prob1 / 100), 0);
    const stage2Expected = analysis.reduce((sum, a) => sum + (a.prob2 / 100), 0);
    const stage3Expected = analysis.reduce((sum, a) => sum + (a.prob3 / 100), 0);
    
    console.log('\n💰 ПРОГНОЗ ПО ЭТАПАМ:\n');
    console.log(`1-Й ПЛАТЕЖ ($49 через 10 дней):`);
    console.log(`   Ожидается: ${stage1Expected.toFixed(1)} клиентов из ${analysis.length}`);
    console.log(`   Выручка: $${(stage1Expected * 49).toFixed(2)}`);
    console.log('');
    
    console.log(`2-Й ПЛАТЕЖ ($49 через 20 дней):`);
    console.log(`   Ожидается: ${stage2Expected.toFixed(1)} клиентов из ${analysis.length}`);
    console.log(`   Выручка: $${(stage2Expected * 49).toFixed(2)}`);
    console.log('');
    
    console.log(`3-Й ПЛАТЕЖ ($49 через 30 дней):`);
    console.log(`   Ожидается: ${stage3Expected.toFixed(1)} клиентов из ${analysis.length}`);
    console.log(`   Выручка: $${(stage3Expected * 49).toFixed(2)}`);
    console.log('');
    
    console.log('='.repeat(100));
    
    // Итоговый прогноз
    console.log('\n🎯 ИТОГОВЫЙ ПРОГНОЗ:\n');
    console.log(`Всего триал-клиентов: ${analysis.length}`);
    console.log(`Уже оплачено (триалы): $${analysis.length}`);
    console.log('');
    console.log(`МАКСИМАЛЬНАЯ ВЫРУЧКА (если все оплатят все 3 раза):`);
    console.log(`   $${totalMax.toFixed(2)}`);
    console.log('');
    console.log(`ОЖИДАЕМАЯ ВЫРУЧКА (по статистике tier):`);
    console.log(`   $${totalExpected.toFixed(2)}`);
    console.log('');
    console.log(`ВЕРОЯТНОСТЬ РЕАЛИЗАЦИИ: ${((totalExpected / totalMax) * 100).toFixed(1)}%`);
    console.log('');
    
    // Рекуррентные клиенты
    const recurringExpected = stage3Expected * 0.75; // 75% тех, кто прошел 3 платежа, останутся
    console.log(`РЕКУРРЕНТНЫЕ КЛИЕНТЫ ($49/месяц):`);
    console.log(`   Ожидается: ${recurringExpected.toFixed(1)} клиентов`);
    console.log(`   Месячная выручка: $${(recurringExpected * 49).toFixed(2)}/мес`);
    console.log(`   Годовая выручка: $${(recurringExpected * 49 * 12).toFixed(2)}/год`);
    console.log('');
    
    console.log('='.repeat(100));
    
    // График по датам
    console.log('\n📅 КОГДА ЖДАТЬ ПЛАТЕЖИ:\n');
    
    // Группируем по неделям
    const firstPayments = new Map();
    
    for (const a of analysis) {
      const firstPaymentDate = new Date(a.date);
      firstPaymentDate.setDate(firstPaymentDate.getDate() + 10);
      const dateKey = firstPaymentDate.toLocaleDateString('ru-RU');
      
      if (!firstPayments.has(dateKey)) {
        firstPayments.set(dateKey, { count: 0, expected: 0 });
      }
      
      const data = firstPayments.get(dateKey);
      data.count += 1;
      data.expected += (a.prob1 / 100);
      firstPayments.set(dateKey, data);
    }
    
    console.log('1-Й ПЛАТЕЖ ($49):');
    const sortedDates = Array.from(firstPayments.keys()).sort((a, b) => {
      const [da, ma, ya] = a.split('.');
      const [db, mb, yb] = b.split('.');
      return new Date(ya, ma - 1, da) - new Date(yb, mb - 1, db);
    });
    
    for (const dateKey of sortedDates) {
      const data = firstPayments.get(dateKey);
      const revenue = data.expected * 49;
      console.log(`   ${dateKey}: ${data.count} попыток → ~${data.expected.toFixed(1)} успешных → $${revenue.toFixed(2)}`);
    }
    
    console.log('\n='.repeat(100));
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
})();
