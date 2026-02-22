const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

(async () => {
  try {
    console.log('📊 АНАЛИЗ КОНВЕРСИИ $1 TRIAL → $49 FULL:\n');
    console.log('='.repeat(80));
    
    // Получаем все PaymentIntents
    let allPaymentIntents = [];
    let hasMore = true;
    let startingAfter = null;
    
    console.log('⏳ Загружаю все платежи из Stripe...\n');
    
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
    
    console.log(`✅ Загружено ${allPaymentIntents.length} платежей\n`);
    
    // Фильтруем успешные триалы ($2.99 = 299 центов)
    const trials = allPaymentIntents.filter(pi => 
      pi.amount === 100 && 
      pi.status === 'succeeded'
    );
    
    // Фильтруем успешные $49 платежи (4900 центов)
    const fullPayments = allPaymentIntents.filter(pi => 
      pi.amount === 4900 && 
      pi.status === 'succeeded'
    );
    
    console.log(`💰 $1 ТРИАЛОВ: ${trials.length}`);
    console.log(`💰 $49 ОПЛАТ: ${fullPayments.length}\n`);
    console.log('='.repeat(80));
    
    // Создаем мапу customer_id → $49 платежи
    const customersWithFullPayment = new Set();
    for (const payment of fullPayments) {
      customersWithFullPayment.add(payment.customer);
    }
    
    // Анализируем каждый триал
    const trialData = [];
    
    for (const trial of trials) {
      const customer = await stripe.customers.retrieve(trial.customer);
      const hasPaid49 = customersWithFullPayment.has(trial.customer);
      
      // Получаем payment method для tier
      let tier = 'unknown';
      let pm = null;
      let charge = null;
      
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
        }
      }
      
      trialData.push({
        email: customer.email,
        customerId: trial.customer,
        trialDate: new Date(trial.created * 1000),
        hasPaid49: hasPaid49,
        tier: tier,
        paymentIntentId: trial.id
      });
    }
    
    // Сортируем по дате (новые сверху)
    trialData.sort((a, b) => b.trialDate - a.trialDate);
    
    // Статистика
    const totalTrials = trialData.length;
    const paidFull = trialData.filter(t => t.hasPaid49).length;
    const notPaidYet = totalTrials - paidFull;
    const conversionRate = totalTrials > 0 ? (paidFull / totalTrials * 100).toFixed(1) : 0;
    
    console.log('\n📈 ОБЩАЯ СТАТИСТИКА:\n');
    console.log(`   Всего триалов ($1): ${totalTrials}`);
    console.log(`   Оплатили $49: ${paidFull}`);
    console.log(`   Не оплатили еще: ${notPaidYet}`);
    console.log(`   Конверсия Trial → $49: ${conversionRate}%\n`);
    console.log('='.repeat(80));
    
    // Статистика по tier
    const premiumTrials = trialData.filter(t => t.tier === 'PREMIUM');
    const mediumTrials = trialData.filter(t => t.tier === 'MEDIUM');
    const fraudTrials = trialData.filter(t => t.tier === 'FRAUD');
    
    const premiumPaid = premiumTrials.filter(t => t.hasPaid49).length;
    const mediumPaid = mediumTrials.filter(t => t.hasPaid49).length;
    const fraudPaid = fraudTrials.filter(t => t.hasPaid49).length;
    
    console.log('\n📊 КОНВЕРСИЯ ПО TIER:\n');
    
    if (premiumTrials.length > 0) {
      const premiumConv = (premiumPaid / premiumTrials.length * 100).toFixed(1);
      console.log(`   🏆 PREMIUM: ${premiumPaid}/${premiumTrials.length} = ${premiumConv}%`);
    }
    
    if (mediumTrials.length > 0) {
      const mediumConv = (mediumPaid / mediumTrials.length * 100).toFixed(1);
      console.log(`   ⚠️  MEDIUM: ${mediumPaid}/${mediumTrials.length} = ${mediumConv}%`);
    }
    
    if (fraudTrials.length > 0) {
      const fraudConv = (fraudPaid / fraudTrials.length * 100).toFixed(1);
      console.log(`   ❌ FRAUD: ${fraudPaid}/${fraudTrials.length} = ${fraudConv}%`);
    }
    
    console.log('\n='.repeat(80));
    
    // Показываем последние 10 триалов
    console.log('\n📋 ПОСЛЕДНИЕ 10 ТРИАЛОВ:\n');
    
    for (let i = 0; i < Math.min(10, trialData.length); i++) {
      const t = trialData[i];
      const status = t.hasPaid49 ? '✅ Оплатил $49' : '⏳ Ждём';
      const dateStr = t.trialDate.toLocaleDateString('ru-RU') + ' ' + t.trialDate.toLocaleTimeString('ru-RU');
      
      console.log(`${i + 1}. ${t.email}`);
      console.log(`   Дата: ${dateStr}`);
      console.log(`   Tier: ${t.tier}`);
      console.log(`   Статус: ${status}`);
      console.log('');
    }
    
    console.log('='.repeat(80));
    
    // Прогноз для последних 3 триалов
    console.log('\n🔮 ПРОГНОЗ ДЛЯ ПОСЛЕДНИХ 3 ТРИАЛОВ (19 ЯНВАРЯ):\n');
    
    const last3 = trialData.slice(0, 3);
    
    for (let i = 0; i < last3.length; i++) {
      const t = last3[i];
      let probability = 0;
      
      // Вероятность на основе tier и общей статистики
      if (t.tier === 'PREMIUM' && premiumTrials.length > 0) {
        probability = (premiumPaid / premiumTrials.length * 100);
      } else if (t.tier === 'MEDIUM' && mediumTrials.length > 0) {
        probability = (mediumPaid / mediumTrials.length * 100);
      } else if (t.tier === 'FRAUD' && fraudTrials.length > 0) {
        probability = (fraudPaid / fraudTrials.length * 100);
      } else {
        probability = parseFloat(conversionRate);
      }
      
      console.log(`${i + 1}. ${t.email}`);
      console.log(`   Tier: ${t.tier}`);
      console.log(`   Вероятность оплаты $49: ${probability.toFixed(1)}%`);
      console.log(`   Статус: ${t.hasPaid49 ? '✅ Уже оплатил!' : '⏳ Ждём...'}`);
      console.log('');
    }
    
    // Ожидаемая выручка
    const expectedRevenue = last3.reduce((sum, t) => {
      let prob = 0;
      if (t.tier === 'PREMIUM' && premiumTrials.length > 0) {
        prob = premiumPaid / premiumTrials.length;
      } else if (t.tier === 'MEDIUM' && mediumTrials.length > 0) {
        prob = mediumPaid / mediumTrials.length;
      } else {
        prob = paidFull / totalTrials;
      }
      return sum + (prob * 49);
    }, 0);
    
    console.log('='.repeat(80));
    console.log(`\n💰 ОЖИДАЕМАЯ ВЫРУЧКА ОТ ПОСЛЕДНИХ 3:\n`);
    console.log(`   Потенциальная максимальная: $${3 * 49} (если все оплатят)`);
    console.log(`   Ожидаемая (по статистике): $${expectedRevenue.toFixed(2)}`);
    console.log(`   Уже оплачено: $${last3.filter(t => t.hasPaid49).length * 49}`);
    console.log('\n='.repeat(80));
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
})();
