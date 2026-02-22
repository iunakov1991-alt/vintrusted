const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

(async () => {
  try {
    // Получаем последние PaymentIntents
    const paymentIntents = await stripe.paymentIntents.list({
      limit: 20,
    });
    
    // Фильтруем только триалы ($2.99 = 299 центов)
    const trials = paymentIntents.data.filter(pi => pi.amount === 100 && pi.status === 'succeeded');
    
    console.log('📊 ПОСЛЕДНИЕ 3 ТРИАЛА ($1.00):');
    console.log('='.repeat(80));
    
    for (let i = 0; i < Math.min(3, trials.length); i++) {
      const pi = trials[i];
      
      // Получаем полные данные PaymentIntent
      const fullPI = await stripe.paymentIntents.retrieve(pi.id);
      
      // Получаем charge через latest_charge
      let charge = null;
      if (fullPI.latest_charge) {
        try {
          charge = await stripe.charges.retrieve(fullPI.latest_charge);
        } catch (err) {
          console.log(`\n⚠️  ТРИАЛ #${i + 1}: Could not retrieve charge`);
          continue;
        }
      }
      
      if (!charge) {
        console.log(`\n⚠️  ТРИАЛ #${i + 1}: No charge data available`);
        continue;
      }
      
      const pm = await stripe.paymentMethods.retrieve(fullPI.payment_method);
      const customer = await stripe.customers.retrieve(fullPI.customer);
      
      console.log(`\n🔹 ТРИАЛ #${i + 1}:`);
      console.log(`   ID: ${fullPI.id}`);
      console.log(`   Дата: ${new Date(fullPI.created * 1000).toLocaleString('ru-RU')}`);
      console.log(`   Email: ${customer.email}`);
      console.log(`   Сумма: $${(fullPI.amount / 100).toFixed(2)}`);
      console.log(`   Статус: ${fullPI.status}`);
      
      console.log(`\n   💳 КАРТА:`);
      console.log(`   Тип: ${pm.type}`);
      if (pm.card) {
        console.log(`   Бренд: ${pm.card.brand}`);
        console.log(`   Последние 4: ****${pm.card.last4}`);
        console.log(`   Страна: ${pm.card.country || 'N/A'}`);
        console.log(`   Funding: ${pm.card.funding}`);
        console.log(`   3DS: ${pm.card.three_d_secure_usage?.supported ? 'Supported' : 'Not supported'}`);
      } else if (pm.link) {
        console.log(`   Stripe Link Email: ${pm.link.email}`);
      }
      
      console.log(`\n   🛡️ RISK & FRAUD:`);
      console.log(`   Risk Level: ${charge.outcome?.risk_level || 'N/A'}`);
      console.log(`   Risk Score: ${charge.outcome?.risk_score || 'N/A'}`);
      console.log(`   Radar Rule: ${charge.outcome?.rule || 'N/A'}`);
      console.log(`   Seller Message: ${charge.outcome?.seller_message || 'N/A'}`);
      
      // Определяем tier
      let tier = 'unknown';
      let value = 0;
      
      if (pm.type === 'link') {
        tier = 'PREMIUM';
        value = 25.00;
      } else if (pm.card) {
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
      
      console.log(`\n   🎯 TIER CLASSIFICATION:`);
      console.log(`   Tier: ${tier}`);
      console.log(`   Value: $${value.toFixed(2)}`);
      
      console.log(`\n   ✅ CONVERSION:`);
      console.log(`   Google Ads Value: $${value.toFixed(2)}`);
      console.log(`   Transaction ID: ${fullPI.id}`);
      
      console.log('='.repeat(80));
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
})();
