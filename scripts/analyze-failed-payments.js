import Stripe from 'stripe';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, '../.env.local') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function analyzeFailedPayments() {
  // Дата начала: 1 января 2026
  const startDate = new Date('2026-01-01T00:00:00Z');
  const startTimestamp = Math.floor(startDate.getTime() / 1000);
  
  console.log('🔍 Анализ неудачных платежей с', startDate.toISOString());
  console.log('============================================================\n');

  let failedPayments = [];
  let hasMore = true;
  let startingAfter = null;

  // 1. Собираем все PaymentIntents
  console.log('📊 Собираю PaymentIntents...');
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
      // Интересуют платежи на $49 (4900 cents) которые failed
      if (pi.amount === 4900 && ['failed', 'canceled', 'requires_payment_method'].includes(pi.status)) {
        failedPayments.push({
          id: pi.id,
          amount: pi.amount / 100,
          status: pi.status,
          created: new Date(pi.created * 1000).toISOString(),
          customer: pi.customer,
          failure_code: pi.last_payment_error?.code,
          failure_message: pi.last_payment_error?.message,
          decline_code: pi.last_payment_error?.decline_code,
          payment_method_type: pi.payment_method_types?.[0],
        });
      }
    }

    if (payments.data.length > 0) {
      startingAfter = payments.data[payments.data.length - 1].id;
    }
    hasMore = payments.has_more;
  }

  // 2. Собираем failed Invoices
  console.log('📊 Собираю failed Invoices...');
  hasMore = true;
  startingAfter = null;

  while (hasMore) {
    const listParams = {
      limit: 100,
      created: { gte: startTimestamp },
    };
    if (startingAfter) {
      listParams.starting_after = startingAfter;
    }
    const invoices = await stripe.invoices.list(listParams);

    for (const invoice of invoices.data) {
      if (invoice.status === 'uncollectible' || invoice.attempted && !invoice.paid) {
        failedPayments.push({
          id: invoice.id,
          amount: invoice.amount_due / 100,
          status: 'invoice_failed',
          created: new Date(invoice.created * 1000).toISOString(),
          customer: invoice.customer,
          failure_code: invoice.last_finalization_error?.code,
          failure_message: invoice.last_finalization_error?.message,
          attempt_count: invoice.attempt_count,
          payment_method_type: 'subscription',
        });
      }
    }

    if (invoices.data.length > 0) {
      startingAfter = invoices.data[invoices.data.length - 1].id;
    }
    hasMore = invoices.has_more;
  }

  // 3. Получаем информацию о картах для каждого failed payment
  console.log('🔍 Анализирую карты...\n');
  
  for (const payment of failedPayments) {
    try {
      const customer = await stripe.customers.retrieve(payment.customer);
      const pmId = customer.invoice_settings?.default_payment_method;
      
      if (pmId) {
        const pm = await stripe.paymentMethods.retrieve(pmId);
        payment.card_brand = pm.card?.brand;
        payment.card_funding = pm.card?.funding; // credit, debit, prepaid, unknown
        payment.card_last4 = pm.card?.last4;
        payment.card_fingerprint = pm.card?.fingerprint;
      }
    } catch (error) {
      console.log(`⚠️  Не удалось получить данные карты для ${payment.id}`);
    }
  }

  // 4. Статистика
  console.log('============================================================');
  console.log('📈 СТАТИСТИКА НЕУДАЧНЫХ ПЛАТЕЖЕЙ:');
  console.log('============================================================\n');
  
  console.log(`Всего неудачных платежей: ${failedPayments.length}`);
  
  // Группируем по типу карты
  const byFunding = {};
  const byFailureCode = {};
  const byDeclineCode = {};
  
  for (const payment of failedPayments) {
    // По типу финансирования
    const funding = payment.card_funding || 'unknown';
    byFunding[funding] = (byFunding[funding] || 0) + 1;
    
    // По коду ошибки
    const failureCode = payment.failure_code || 'unknown';
    byFailureCode[failureCode] = (byFailureCode[failureCode] || 0) + 1;
    
    // По decline коду
    const declineCode = payment.decline_code || 'N/A';
    if (declineCode !== 'N/A') {
      byDeclineCode[declineCode] = (byDeclineCode[declineCode] || 0) + 1;
    }
  }
  
  console.log('\n📊 ПО ТИПУ КАРТЫ:');
  Object.entries(byFunding).forEach(([type, count]) => {
    const emoji = type === 'prepaid' ? '💳' : type === 'credit' ? '💎' : type === 'debit' ? '🏦' : '❓';
    console.log(`  ${emoji} ${type}: ${count} (${((count/failedPayments.length)*100).toFixed(1)}%)`);
  });
  
  console.log('\n❌ ПО КОДУ ОШИБКИ:');
  Object.entries(byFailureCode).sort((a, b) => b[1] - a[1]).forEach(([code, count]) => {
    console.log(`  ${code}: ${count} (${((count/failedPayments.length)*100).toFixed(1)}%)`);
  });
  
  if (Object.keys(byDeclineCode).length > 0) {
    console.log('\n🚫 ПО DECLINE CODE:');
    Object.entries(byDeclineCode).sort((a, b) => b[1] - a[1]).forEach(([code, count]) => {
      console.log(`  ${code}: ${count}`);
    });
  }
  
  // 5. Детальный список
  console.log('\n============================================================');
  console.log('📋 ДЕТАЛЬНЫЙ СПИСОК (последние 20):');
  console.log('============================================================\n');
  
  failedPayments.slice(0, 20).forEach((payment, index) => {
    console.log(`${index + 1}. [${payment.created}]`);
    console.log(`   ID: ${payment.id}`);
    console.log(`   Amount: $${payment.amount}`);
    console.log(`   Status: ${payment.status}`);
    console.log(`   Card: ${payment.card_brand || 'N/A'} *${payment.card_last4 || 'N/A'} (${payment.card_funding || 'unknown'})`);
    console.log(`   Error: ${payment.failure_code || 'N/A'} - ${payment.decline_code || 'N/A'}`);
    console.log(`   Message: ${payment.failure_message || 'N/A'}`);
    console.log('');
  });
  
  // 6. Рассчитываем Success Rate для $49 платежей
  console.log('============================================================');
  console.log('💰 SUCCESS RATE ДЛЯ $49 ПЛАТЕЖЕЙ:');
  console.log('============================================================\n');
  
  // Считаем все попытки $49 (успешные + неудачные)
  hasMore = true;
  startingAfter = null;
  let successfulCount = 0;
  
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
      if (pi.amount === 4900 && pi.status === 'succeeded') {
        successfulCount++;
      }
    }

    if (payments.data.length > 0) {
      startingAfter = payments.data[payments.data.length - 1].id;
    }
    hasMore = payments.has_more;
  }
  
  const totalAttempts = successfulCount + failedPayments.length;
  const successRate = totalAttempts > 0 ? (successfulCount / totalAttempts * 100).toFixed(1) : 0;
  
  console.log(`✅ Успешных платежей $49: ${successfulCount}`);
  console.log(`❌ Неудачных платежей $49: ${failedPayments.length}`);
  console.log(`📊 Всего попыток: ${totalAttempts}`);
  console.log(`🎯 Success Rate: ${successRate}%`);
  console.log(`💸 Потери из-за failed платежей: $${(failedPayments.length * 49).toFixed(2)}`);
  
  console.log('\n============================================================');
}

analyzeFailedPayments().catch(console.error);
