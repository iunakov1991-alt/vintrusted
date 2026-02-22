import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const START_DATE = new Date('2026-01-01T00:00:00Z');
const END_DATE = new Date('2026-02-22T23:59:59Z');
const TRAFFIC_COST = 800;

console.log('═══════════════════════════════════════════════════════════');
console.log('📊 ДЕТАЛЬНАЯ АНАЛИТИКА STRIPE');
console.log('═══════════════════════════════════════════════════════════');
console.log(`Period: 01.01.2026 - 22.02.2026`);
console.log(`Traffic Cost: $${TRAFFIC_COST}`);
console.log('═══════════════════════════════════════════════════════════\n');

async function detailedAnalysis() {
  try {
    const startTimestamp = Math.floor(START_DATE.getTime() / 1000);
    const endTimestamp = Math.floor(END_DATE.getTime() / 1000);

    // Получаем все customers
    console.log('🔄 Loading customers from Stripe...');
    const customersResponse = await stripe.customers.list({
      limit: 100,
      created: { gte: startTimestamp, lte: endTimestamp },
    });
    const customers = customersResponse.data;
    console.log(`✅ ${customers.length} customers loaded\n`);

    // Для каждого customer получаем его charges
    console.log('🔄 Analyzing customer charges...\n');
    
    const customerAnalysis = [];
    
    for (const customer of customers) {
      // Получаем charges
      const charges = await stripe.charges.list({
        customer: customer.id,
        limit: 100,
      });

      const successfulCharges = charges.data.filter(c => c.status === 'succeeded');
      const trialCharge = successfulCharges.find(c => c.amount === 299);
      const recurringCharges = successfulCharges.filter(c => c.amount === 4900);

      const source = customer.metadata?.utm_source || 'direct';
      const hasTrial = !!trialCharge;
      const hasRecurring = recurringCharges.length > 0;
      const totalRevenue = successfulCharges.reduce((sum, c) => sum + c.amount, 0) / 100;

      // Disputes для этого customer
      const customerDisputes = await stripe.disputes.list({
        limit: 10,
        charge: charges.data.map(c => c.id),
      });

      customerAnalysis.push({
        email: customer.email,
        customerId: customer.id,
        source,
        hasTrial,
        hasRecurring,
        recurringPayments: recurringCharges.length,
        totalCharges: successfulCharges.length,
        totalRevenue,
        disputes: customerDisputes.data.length,
        createdAt: new Date(customer.created * 1000).toISOString().split('T')[0],
      });
    }

    // Получаем все disputes для периода
    console.log('🔄 Loading disputes...');
    const allDisputes = await stripe.disputes.list({
      limit: 100,
      created: { gte: startTimestamp, lte: endTimestamp },
    });
    console.log(`✅ ${allDisputes.data.length} disputes found\n`);

    // Анализ по источникам
    const sourceBreakdown = {};
    
    for (const analysis of customerAnalysis) {
      const { source, hasTrial, hasRecurring, totalRevenue, disputes } = analysis;
      
      if (!sourceBreakdown[source]) {
        sourceBreakdown[source] = {
          customers: 0,
          trialCustomers: 0,
          recurringCustomers: 0,
          revenue: 0,
          disputes: 0,
        };
      }

      sourceBreakdown[source].customers++;
      sourceBreakdown[source].revenue += totalRevenue;
      sourceBreakdown[source].disputes += disputes;

      if (hasTrial) sourceBreakdown[source].trialCustomers++;
      if (hasRecurring) sourceBreakdown[source].recurringCustomers++;
    }

    // Расчеты
    const totalCustomers = customerAnalysis.length;
    const trialCustomers = customerAnalysis.filter(c => c.hasTrial).length;
    const recurringCustomers = customerAnalysis.filter(c => c.hasRecurring).length;
    const retainedCustomers = customerAnalysis.filter(c => c.hasTrial && c.hasRecurring).length;

    const totalRevenue = customerAnalysis.reduce((sum, c) => sum + c.totalRevenue, 0);
    const trialRevenue = trialCustomers * 2.99;
    const recurringRevenue = totalRevenue - trialRevenue;

    const totalDisputes = allDisputes.data.length;
    const disputesWon = allDisputes.data.filter(d => d.status === 'won').length;
    const disputesLost = allDisputes.data.filter(d => d.status === 'lost').length;
    const disputesUnderReview = allDisputes.data.filter(d => d.status === 'under_review' || d.status === 'needs_response').length;

    const disputedAmount = allDisputes.data.reduce((sum, d) => sum + d.amount, 0) / 100;
    const lostDisputeAmount = allDisputes.data.filter(d => d.status === 'lost').reduce((sum, d) => sum + d.amount, 0) / 100;

    const retentionRate = trialCustomers > 0 ? (retainedCustomers / trialCustomers * 100).toFixed(2) : '0.00';
    const disputeRate = (totalDisputes / totalCustomers * 100).toFixed(2);

    const netProfit = totalRevenue - lostDisputeAmount - TRAFFIC_COST;
    const roi = ((netProfit / TRAFFIC_COST) * 100).toFixed(2);

    // ═══════════════════════════════════════════════════════════════════
    // ВЫВОД
    // ═══════════════════════════════════════════════════════════════════

    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('💰 ВЫРУЧКА (1 января - 22 февраля 2026)');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Всего клиентов:          ${totalCustomers}`);
    console.log(`Оплатили Trial ($2.99):  ${trialCustomers} × $2.99 = $${trialRevenue.toFixed(2)}`);
    console.log(`Оплатили $49:            ${recurringCustomers} (≈${(recurringRevenue/49).toFixed(0)} платежей)`);
    console.log('');
    console.log(`ИТОГО ВЫРУЧКА:           $${totalRevenue.toFixed(2)}`);
    console.log('');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('⚠️  ДИСПУТЫ (Chargebacks)');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Всего диспутов:          ${totalDisputes}`);
    console.log(`├─ Выиграно:             ${disputesWon}`);
    console.log(`├─ Проиграно:            ${disputesLost}`);
    console.log(`└─ На рассмотрении:      ${disputesUnderReview}`);
    console.log('');
    console.log(`Сумма диспутов:          $${disputedAmount.toFixed(2)}`);
    console.log(`Потеряно (проиграно):    $${lostDisputeAmount.toFixed(2)}`);
    console.log(`Dispute Rate:            ${disputeRate}%`);
    console.log('');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('📈 УДЕРЖАНИЕ (Retention: Trial → $49)');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Оплатили Trial ($2.99):  ${trialCustomers}`);
    console.log(`Оплатили потом $49:      ${retainedCustomers}`);
    console.log('');
    console.log(`RETENTION RATE:          ${retentionRate}%`);
    console.log('');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('💵 ROI (Потрачено на трафик: $' + TRAFFIC_COST + ')');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Валовая выручка:         $${totalRevenue.toFixed(2)}`);
    console.log(`Потери (disputes):       -$${lostDisputeAmount.toFixed(2)}`);
    console.log(`Траты на трафик:         -$${TRAFFIC_COST.toFixed(2)}`);
    console.log('─────────────────────────────────────────────────────────');
    console.log(`Чистая прибыль:          $${netProfit.toFixed(2)}`);
    console.log(`ROI:                     ${roi}%`);
    console.log('');
    console.log(`Стоимость клиента (CPA): $${(TRAFFIC_COST / totalCustomers).toFixed(2)}`);
    console.log(`Выручка на клиента (LTV): $${(totalRevenue / totalCustomers).toFixed(2)}`);
    console.log('');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🌐 РАЗБИВКА ПО ИСТОЧНИКАМ');
    console.log('═══════════════════════════════════════════════════════════');

    const sortedSources = Object.entries(sourceBreakdown)
      .sort((a, b) => b[1].revenue - a[1].revenue);

    for (const [source, stats] of sortedSources) {
      const retention = stats.trialCustomers > 0 
        ? ((stats.recurringCustomers / stats.trialCustomers) * 100).toFixed(1)
        : 'N/A';
      
      const sourceShare = (stats.customers / totalCustomers * 100).toFixed(1);
      const sourceCPA = ((TRAFFIC_COST * stats.customers / totalCustomers)).toFixed(2);
      const sourceROI = sourceCPA > 0 
        ? (((stats.revenue - parseFloat(sourceCPA)) / parseFloat(sourceCPA)) * 100).toFixed(1)
        : 'N/A';

      console.log(`\n📍 ${source.toUpperCase()}`);
      console.log(`   Клиентов:            ${stats.customers} (${sourceShare}%)`);
      console.log(`   Выручка:             $${stats.revenue.toFixed(2)}`);
      console.log(`   Trial клиентов:      ${stats.trialCustomers}`);
      console.log(`   Recurring клиентов:  ${stats.recurringCustomers}`);
      console.log(`   Retention:           ${retention}%`);
      console.log(`   Disputes:            ${stats.disputes}`);
      console.log(`   Расч. CPA:           $${sourceCPA}`);
      console.log(`   ROI источника:       ${sourceROI}%`);
    }

    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 УДЕРЖАНИЕ ПО ИСТОЧНИКАМ');
    console.log('═══════════════════════════════════════════════════════════');

    for (const [source, stats] of sortedSources) {
      if (stats.trialCustomers > 0) {
        const rate = ((stats.recurringCustomers / stats.trialCustomers) * 100).toFixed(1);
        const bar = '█'.repeat(Math.floor(parseFloat(rate) / 5));
        console.log(`${source.padEnd(20)} ${stats.recurringCustomers.toString().padStart(2)}/${stats.trialCustomers.toString().padStart(2)} (${rate.padStart(5)}%) ${bar}`);
      }
    }

    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎯 ИТОГОВЫЕ МЕТРИКИ');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Период:                  01.01.2026 - 22.02.2026 (53 дня)`);
    console.log(`Всего клиентов:          ${totalCustomers}`);
    console.log(`Выручка:                 $${totalRevenue.toFixed(2)}`);
    console.log(`Чистая прибыль:          $${netProfit.toFixed(2)}`);
    console.log(`ROI:                     ${roi}%`);
    console.log(`Retention:               ${retentionRate}%`);
    console.log(`Dispute Rate:            ${disputeRate}%`);
    console.log(`CPA:                     $${(TRAFFIC_COST / totalCustomers).toFixed(2)}`);
    console.log(`LTV:                     $${(totalRevenue / totalCustomers).toFixed(2)}`);
    console.log('═══════════════════════════════════════════════════════════');

    // Топ источники
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🏆 ТОП-3 ИСТОЧНИКА ПО ROI');
    console.log('═══════════════════════════════════════════════════════════');

    const sourcesWithROI = sortedSources
      .map(([source, stats]) => {
        const sourceCPA = (TRAFFIC_COST * stats.customers / totalCustomers);
        const sourceROI = sourceCPA > 0 
          ? ((stats.revenue - sourceCPA) / sourceCPA) * 100
          : 0;
        return { source, stats, roi: sourceROI };
      })
      .sort((a, b) => b.roi - a.roi)
      .slice(0, 3);

    for (let i = 0; i < sourcesWithROI.length; i++) {
      const { source, stats, roi } = sourcesWithROI[i];
      const medal = ['🥇', '🥈', '🥉'][i];
      console.log(`${medal} ${source.toUpperCase()}`);
      console.log(`   ROI: ${roi.toFixed(1)}%`);
      console.log(`   Выручка: $${stats.revenue.toFixed(2)}`);
      console.log(`   Клиентов: ${stats.customers}`);
    }

    console.log('\n\n');

    // Сохраняем детальный отчет
    const report = {
      period: '01.01.2026 - 22.02.2026',
      summary: {
        customers: totalCustomers,
        revenue: totalRevenue,
        netProfit,
        roi: parseFloat(roi),
        retention: parseFloat(retentionRate),
        disputes: totalDisputes,
        disputeRate: parseFloat(disputeRate),
      },
      breakdown: {
        trialCustomers,
        recurringCustomers,
        retainedCustomers,
        trialRevenue,
        recurringRevenue,
      },
      disputes: {
        total: totalDisputes,
        won: disputesWon,
        lost: disputesLost,
        underReview: disputesUnderReview,
        amount: disputedAmount,
        lostAmount: lostDisputeAmount,
      },
      sources: sourceBreakdown,
      topSources: sourcesWithROI,
    };

    const fs = await import('fs');
    const reportPath = './detailed-stripe-report-' + new Date().toISOString().split('T')[0] + '.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Детальный отчет сохранен: ${reportPath}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

detailedAnalysis();
