const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

(async () => {
  try {
    console.log('💰 АНАЛИЗ ВСЕХ $49 ПЛАТЕЖЕЙ:\n');
    console.log('='.repeat(100));
    
    // Получаем все PaymentIntents
    let allPaymentIntents = [];
    let hasMore = true;
    let startingAfter = null;
    
    console.log('⏳ Загружаю все платежи...\n');
    
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
    
    // Фильтруем все $49 платежи
    const payments49 = allPaymentIntents.filter(pi => pi.amount === 4900);
    
    console.log(`💰 ВСЕГО $49 ПЛАТЕЖЕЙ (любой статус): ${payments49.length}\n`);
    console.log('='.repeat(100));
    
    // Группируем по статусам
    const succeeded = payments49.filter(p => p.status === 'succeeded');
    const failed = payments49.filter(p => p.status === 'requires_payment_method' || p.status === 'canceled');
    const pending = payments49.filter(p => p.status === 'processing' || p.status === 'requires_action');
    
    console.log('\n📊 РАЗБИВКА ПО СТАТУСАМ:\n');
    console.log(`✅ Успешные (succeeded):           ${succeeded.length}`);
    console.log(`❌ Неуспешные (failed/canceled):   ${failed.length}`);
    console.log(`⏳ В процессе (processing):        ${pending.length}`);
    console.log('\n' + '='.repeat(100));
    
    // Анализируем успешные
    console.log('\n✅ УСПЕШНЫЕ $49 ПЛАТЕЖИ:\n');
    
    const successfulCustomers = new Set();
    let totalSuccessRevenue = 0;
    
    for (let i = 0; i < succeeded.length; i++) {
      const p = succeeded[i];
      const customer = await stripe.customers.retrieve(p.customer);
      const date = new Date(p.created * 1000);
      
      successfulCustomers.add(p.customer);
      totalSuccessRevenue += 49;
      
      console.log(`${i + 1}. ${customer.email || 'N/A'}`);
      console.log(`   Customer: ${p.customer}`);
      console.log(`   Date: ${date.toLocaleDateString('ru-RU')} ${date.toLocaleTimeString('ru-RU')}`);
      console.log(`   Amount: $49.00`);
      console.log(`   Invoice: ${p.invoice || 'N/A'}`);
      console.log('');
    }
    
    console.log('='.repeat(100));
    
    // Анализируем неуспешные
    console.log('\n❌ НЕУСПЕШНЫЕ $49 ПЛАТЕЖИ:\n');
    
    const failedCustomers = new Set();
    
    for (let i = 0; i < failed.length; i++) {
      const p = failed[i];
      const customer = await stripe.customers.retrieve(p.customer);
      const date = new Date(p.created * 1000);
      
      failedCustomers.add(p.customer);
      
      console.log(`${i + 1}. ${customer.email || 'N/A'}`);
      console.log(`   Customer: ${p.customer}`);
      console.log(`   Date: ${date.toLocaleDateString('ru-RU')} ${date.toLocaleTimeString('ru-RU')}`);
      console.log(`   Status: ${p.status}`);
      console.log(`   Error: ${p.last_payment_error?.message || 'N/A'}`);
      console.log(`   Invoice: ${p.invoice || 'N/A'}`);
      console.log('');
    }
    
    console.log('='.repeat(100));
    
    // Уникальные клиенты
    const uniqueSuccessCustomers = successfulCustomers.size;
    const uniqueFailedCustomers = failedCustomers.size;
    
    console.log('\n📈 СТАТИСТИКА ПО КЛИЕНТАМ:\n');
    console.log(`Уникальных клиентов с успешными $49:   ${uniqueSuccessCustomers}`);
    console.log(`Уникальных клиентов с неуспешными $49: ${uniqueFailedCustomers}`);
    console.log('');
    console.log(`Всего успешных $49 платежей:           ${succeeded.length}`);
    console.log(`Общая выручка от $49:                   $${totalSuccessRevenue}`);
    console.log('');
    
    // Средний чек
    if (uniqueSuccessCustomers > 0) {
      const avgPerCustomer = totalSuccessRevenue / uniqueSuccessCustomers;
      console.log(`Средняя выручка на успешного клиента:   $${avgPerCustomer.toFixed(2)}`);
      
      // Пытаемся понять, на каком этапе они
      const paymentsPerCustomer = succeeded.length / uniqueSuccessCustomers;
      console.log(`Среднее кол-во платежей на клиента:     ${paymentsPerCustomer.toFixed(1)}`);
      
      if (paymentsPerCustomer >= 2.5) {
        console.log(`   → Большинство прошли все 3 этапа! ✅`);
      } else if (paymentsPerCustomer >= 1.5) {
        console.log(`   → Большинство на 2-м этапе ⚠️`);
      } else {
        console.log(`   → Большинство на 1-м этапе ⏳`);
      }
    }
    
    console.log('\n' + '='.repeat(100));
    
    // Проверяем subscriptions
    console.log('\n🔄 АКТИВНЫЕ РЕКУРРЕНТНЫЕ ПОДПИСКИ:\n');
    
    const subscriptions = await stripe.subscriptions.list({ 
      status: 'active',
      limit: 100 
    });
    
    console.log(`Активных подписок: ${subscriptions.data.length}`);
    
    if (subscriptions.data.length > 0) {
      console.log('\nДетали:\n');
      for (let i = 0; i < subscriptions.data.length; i++) {
        const sub = subscriptions.data[i];
        const customer = await stripe.customers.retrieve(sub.customer);
        const nextBilling = new Date(sub.current_period_end * 1000);
        
        console.log(`${i + 1}. ${customer.email || 'N/A'}`);
        console.log(`   Plan: $${(sub.items.data[0].price.unit_amount / 100).toFixed(2)}/month`);
        console.log(`   Next billing: ${nextBilling.toLocaleDateString('ru-RU')}`);
        console.log('');
      }
    }
    
    console.log('='.repeat(100));
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
})();
