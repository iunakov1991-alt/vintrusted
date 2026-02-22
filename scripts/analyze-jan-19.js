const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

(async () => {
  try {
    // 19 января 2026: 00:00:00 - 23:59:59 UTC
    const startDate = new Date('2026-01-19T00:00:00Z');
    const endDate = new Date('2026-01-19T23:59:59Z');
    
    const startTimestamp = Math.floor(startDate.getTime() / 1000);
    const endTimestamp = Math.floor(endDate.getTime() / 1000);
    
    console.log('📅 АНАЛИЗ ПЛАТЕЖЕЙ ЗА 19 ЯНВАРЯ 2026:');
    console.log('='.repeat(80));
    console.log(`Период: ${startDate.toLocaleString('ru-RU')} - ${endDate.toLocaleString('ru-RU')}\n`);
    
    // Получаем все PaymentIntents за период
    const paymentIntents = await stripe.paymentIntents.list({
      created: {
        gte: startTimestamp,
        lte: endTimestamp
      },
      limit: 100
    });
    
    // Фильтруем успешные триалы ($1)
    const trials = paymentIntents.data.filter(pi => 
      pi.amount === 100 && 
      pi.status === 'succeeded'
    );
    
    // Фильтруем успешные $49 платежи
    const fullPayments = paymentIntents.data.filter(pi => 
      pi.amount === 4900 && 
      pi.status === 'succeeded'
    );
    
    console.log(`💰 ВСЕГО ПЛАТЕЖЕЙ: ${paymentIntents.data.length}`);
    console.log(`   Триалы ($1): ${trials.length}`);
    console.log(`   Полные ($49): ${fullPayments.length}`);
    console.log('='.repeat(80));
    
    if (trials.length === 0) {
      console.log('\n⚠️  Нет триалов за 19 января!');
      return;
    }
    
    console.log('\n🕐 РАСПРЕДЕЛЕНИЕ ТРИАЛОВ ПО ВРЕМЕНИ:\n');
    
    for (const pi of trials) {
      const date = new Date(pi.created * 1000);
      const timeUTC = date.toLocaleTimeString('ru-RU', { timeZone: 'UTC', hour12: false });
      const timeMoscow = date.toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow', hour12: false });
      const timeLocal = date.toLocaleTimeString('ru-RU', { hour12: false });
      
      // Получаем charge
      let charge = null;
      if (pi.latest_charge) {
        try {
          charge = await stripe.charges.retrieve(pi.latest_charge);
        } catch (err) {}
      }
      
      // Получаем payment method
      let pm = null;
      try {
        pm = await stripe.paymentMethods.retrieve(pi.payment_method);
      } catch (err) {}
      
      // Получаем customer
      let customer = null;
      try {
        customer = await stripe.customers.retrieve(pi.customer);
      } catch (err) {}
      
      // Определяем tier
      let tier = 'unknown';
      let value = 0;
      
      if (pm) {
        if (pm.type === 'link') {
          tier = 'PREMIUM';
          value = 25.00;
        } else if (pm.card && charge) {
          const riskScore = charge.outcome?.risk_score || 0;
          const riskLevel = charge.outcome?.risk_level || 'normal';
          
          if (riskScore > 65 || riskLevel === 'highest' || riskLevel === 'elevated') {
            tier = 'FRAUD';
            value = 0;
          } else if (pm.card.funding === 'credit' && pm.card.country === 'US' && riskLevel === 'normal') {
            tier = 'PREMIUM';
            value = 25.00;
          } else {
            tier = 'MEDIUM';
            value = 5.00;
          }
        }
      }
      
      // GCLID
      const gclid = pi.metadata?.gclid || 'Нет';
      const hasGclid = gclid !== 'Нет' ? '✅' : '❌';
      
      console.log(`⏰ ${timeLocal} (местное) / ${timeMoscow} (MSK) / ${timeUTC} (UTC)`);
      console.log(`   Email: ${customer?.email || 'N/A'}`);
      console.log(`   PaymentIntent: ${pi.id}`);
      console.log(`   Tier: ${tier} ($${value})`);
      console.log(`   GCLID: ${hasGclid} ${gclid === 'Нет' ? '(прямой заход)' : ''}`);
      if (pm?.card) {
        console.log(`   Карта: ${pm.card.brand} ****${pm.card.last4} (${pm.card.country}, ${pm.card.funding})`);
      } else if (pm?.link) {
        console.log(`   Способ: Stripe Link`);
      }
      if (charge?.outcome?.risk_score) {
        console.log(`   Risk Score: ${charge.outcome.risk_score}`);
      }
      console.log('');
    }
    
    // Группировка по часам
    console.log('='.repeat(80));
    console.log('\n📊 РАСПРЕДЕЛЕНИЕ ПО ЧАСАМ (местное время):\n');
    
    const hourMap = {};
    for (const pi of trials) {
      const date = new Date(pi.created * 1000);
      const hour = date.getHours();
      if (!hourMap[hour]) {
        hourMap[hour] = [];
      }
      hourMap[hour].push(pi);
    }
    
    // Сортируем по часам
    const sortedHours = Object.keys(hourMap).map(Number).sort((a, b) => a - b);
    
    for (const hour of sortedHours) {
      const count = hourMap[hour].length;
      const bar = '█'.repeat(count * 5);
      console.log(`${String(hour).padStart(2, '0')}:00 - ${String(hour).padStart(2, '0')}:59 │ ${bar} (${count})`);
    }
    
    console.log('\n='.repeat(80));
    console.log('\n💡 РЕКОМЕНДАЦИИ ДЛЯ AD SCHEDULE:\n');
    
    if (sortedHours.length > 0) {
      const minHour = Math.min(...sortedHours);
      const maxHour = Math.max(...sortedHours);
      
      console.log(`✅ АКТИВНЫЕ ЧАСЫ: ${minHour}:00 - ${maxHour + 1}:00`);
      
      if (minHour > 0) {
        console.log(`❌ ОТКЛЮЧИТЬ: 00:00 - ${minHour}:00 (нет конверсий)`);
      }
      
      if (maxHour < 23) {
        console.log(`❌ ОТКЛЮЧИТЬ: ${maxHour + 1}:00 - 23:59 (нет конверсий)`);
      }
    }
    
    console.log('\n='.repeat(80));
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
})();
