import Stripe from 'stripe';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY not found in environment');
  console.error('Please run: vercel env pull .env.local');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Период анализа
const START_DATE = new Date('2026-01-01T00:00:00Z');
const END_DATE = new Date('2026-02-22T23:59:59Z');
const TRAFFIC_COST = 800; // USD потрачено на трафик

console.log('═══════════════════════════════════════════════════════════');
console.log('📊 STRIPE ANALYTICS REPORT');
console.log('═══════════════════════════════════════════════════════════');
console.log(`Period: ${START_DATE.toISOString().split('T')[0]} → ${END_DATE.toISOString().split('T')[0]}`);
console.log(`Traffic Cost: $${TRAFFIC_COST}`);
console.log('═══════════════════════════════════════════════════════════\n');

async function analyzeStripeData() {
  try {
    const startTimestamp = Math.floor(START_DATE.getTime() / 1000);
    const endTimestamp = Math.floor(END_DATE.getTime() / 1000);

    // ═════════════════════════════════════════════════════════════════
    // 1. ПОЛУЧАЕМ ВСЕ ПЛАТЕЖИ
    // ═════════════════════════════════════════════════════════════════
    console.log('🔄 Fetching payment data from Stripe...\n');
    
    const charges = [];
    let hasMore = true;
    let startingAfter = null;

    while (hasMore) {
      const params = {
        limit: 100,
        created: {
          gte: startTimestamp,
          lte: endTimestamp,
        },
      };
      
      if (startingAfter) {
        params.starting_after = startingAfter;
      }

      const response = await stripe.charges.list(params);
      charges.push(...response.data);
      hasMore = response.has_more;
      if (hasMore) {
        startingAfter = response.data[response.data.length - 1].id;
      }
    }

    console.log(`✅ Fetched ${charges.length} charges\n`);

    // ═════════════════════════════════════════════════════════════════
    // 2. ПОЛУЧАЕМ DISPUTES
    // ═════════════════════════════════════════════════════════════════
    const disputes = [];
    hasMore = true;
    startingAfter = null;

    while (hasMore) {
      const params = {
        limit: 100,
        created: {
          gte: startTimestamp,
          lte: endTimestamp,
        },
      };
      
      if (startingAfter) {
        params.starting_after = startingAfter;
      }

      const response = await stripe.disputes.list(params);
      disputes.push(...response.data);
      hasMore = response.has_more;
      if (hasMore) {
        startingAfter = response.data[response.data.length - 1].id;
      }
    }

    console.log(`✅ Fetched ${disputes.length} disputes\n`);

    // ═════════════════════════════════════════════════════════════════
    // 3. ПОЛУЧАЕМ CUSTOMERS
    // ═════════════════════════════════════════════════════════════════
    const customers = [];
    hasMore = true;
    startingAfter = null;

    while (hasMore) {
      const params = {
        limit: 100,
        created: {
          gte: startTimestamp,
          lte: endTimestamp,
        },
      };
      
      if (startingAfter) {
        params.starting_after = startingAfter;
      }

      const response = await stripe.customers.list(params);
      customers.push(...response.data);
      hasMore = response.has_more;
      if (hasMore) {
        startingAfter = response.data[response.data.length - 1].id;
      }
    }

    console.log(`✅ Fetched ${customers.length} customers\n`);

    // ═════════════════════════════════════════════════════════════════
    // 4. АНАЛИЗ ДАННЫХ
    // ═════════════════════════════════════════════════════════════════

    // Успешные платежи
    const successfulCharges = charges.filter(c => c.status === 'succeeded');
    const totalRevenue = successfulCharges.reduce((sum, c) => sum + c.amount, 0) / 100;
    
    // Платежи по типам
    const trialPayments = successfulCharges.filter(c => c.amount === 299); // $2.99
    const recurringPayments = successfulCharges.filter(c => c.amount === 4900); // $49
    
    const trialRevenue = trialPayments.reduce((sum, c) => sum + c.amount, 0) / 100;
    const recurringRevenue = recurringPayments.reduce((sum, c) => sum + c.amount, 0) / 100;

    // Disputes анализ
    const disputesByStatus = {
      won: disputes.filter(d => d.status === 'won').length,
      lost: disputes.filter(d => d.status === 'lost').length,
      under_review: disputes.filter(d => d.status === 'under_review').length,
      needs_response: disputes.filter(d => d.status === 'needs_response').length,
    };

    const disputedAmount = disputes.reduce((sum, d) => sum + d.amount, 0) / 100;
    const lostDisputeAmount = disputes.filter(d => d.status === 'lost').reduce((sum, d) => sum + d.amount, 0) / 100;

    // Источники трафика (из metadata customers)
    const sourceStats = {};
    const sourceRetention = {};

    for (const customer of customers) {
      const source = customer.metadata?.utm_source || 'direct';
      
      if (!sourceStats[source]) {
        sourceStats[source] = {
          customers: 0,
          revenue: 0,
          trial_paid: 0,
          recurring_paid: 0,
        };
      }

      sourceStats[source].customers++;

      // Находим платежи этого customer
      const customerCharges = successfulCharges.filter(c => c.customer === customer.id);
      const customerRevenue = customerCharges.reduce((sum, c) => sum + c.amount, 0) / 100;
      sourceStats[source].revenue += customerRevenue;

      // Подсчитываем trial и recurring
      const hasTrial = customerCharges.some(c => c.amount === 299);
      const hasRecurring = customerCharges.some(c => c.amount === 4900);

      if (hasTrial) sourceStats[source].trial_paid++;
      if (hasRecurring) sourceStats[source].recurring_paid++;

      // Retention = кто заплатил $49 после $2.99
      if (hasTrial && hasRecurring) {
        if (!sourceRetention[source]) {
          sourceRetention[source] = { total: 0, retained: 0 };
        }
        sourceRetention[source].retained++;
      }
      
      if (hasTrial) {
        if (!sourceRetention[source]) {
          sourceRetention[source] = { total: 0, retained: 0 };
        }
        sourceRetention[source].total++;
      }
    }

    // Retention общий
    const customersWithTrial = customers.filter(c => {
      const charges = successfulCharges.filter(ch => ch.customer === c.id);
      return charges.some(ch => ch.amount === 299);
    });

    const customersWithRecurring = customers.filter(c => {
      const charges = successfulCharges.filter(ch => ch.customer === c.id);
      return charges.some(ch => ch.amount === 4900);
    });

    const retainedCustomers = customers.filter(c => {
      const charges = successfulCharges.filter(ch => ch.customer === c.id);
      return charges.some(ch => ch.amount === 299) && charges.some(ch => ch.amount === 4900);
    });

    const retentionRate = customersWithTrial.length > 0 
      ? (retainedCustomers.length / customersWithTrial.length * 100).toFixed(2)
      : 0;

    // ROI
    const netProfit = totalRevenue - lostDisputeAmount - TRAFFIC_COST;
    const roi = ((netProfit / TRAFFIC_COST) * 100).toFixed(2);

    // ═════════════════════════════════════════════════════════════════
    // 5. ВЫВОД РЕЗУЛЬТАТОВ
    // ═════════════════════════════════════════════════════════════════

    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('💰 REVENUE SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Total Charges:           ${charges.length}`);
    console.log(`Successful Charges:      ${successfulCharges.length}`);
    console.log(`Total Revenue:           $${totalRevenue.toFixed(2)}`);
    console.log('');
    console.log(`Trial Payments ($2.99):  ${trialPayments.length} × $2.99 = $${trialRevenue.toFixed(2)}`);
    console.log(`Recurring ($49):         ${recurringPayments.length} × $49 = $${recurringRevenue.toFixed(2)}`);
    console.log('');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('⚠️  DISPUTES ANALYSIS');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Total Disputes:          ${disputes.length}`);
    console.log(`├─ Won:                  ${disputesByStatus.won}`);
    console.log(`├─ Lost:                 ${disputesByStatus.lost}`);
    console.log(`├─ Under Review:         ${disputesByStatus.under_review}`);
    console.log(`└─ Needs Response:       ${disputesByStatus.needs_response}`);
    console.log('');
    console.log(`Total Disputed Amount:   $${disputedAmount.toFixed(2)}`);
    console.log(`Lost Dispute Amount:     $${lostDisputeAmount.toFixed(2)}`);
    console.log(`Dispute Rate:            ${(disputes.length / successfulCharges.length * 100).toFixed(2)}%`);
    console.log('');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('📈 RETENTION ANALYSIS');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Total Customers:         ${customers.length}`);
    console.log(`Paid Trial ($2.99):      ${customersWithTrial.length}`);
    console.log(`Paid Recurring ($49):    ${customersWithRecurring.length}`);
    console.log(`Retained (Trial→$49):    ${retainedCustomers.length}`);
    console.log('');
    console.log(`RETENTION RATE:          ${retentionRate}%`);
    console.log('');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('💵 ROI ANALYSIS (Traffic: $' + TRAFFIC_COST + ')');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Gross Revenue:           $${totalRevenue.toFixed(2)}`);
    console.log(`Lost Disputes:           -$${lostDisputeAmount.toFixed(2)}`);
    console.log(`Traffic Cost:            -$${TRAFFIC_COST}`);
    console.log('─────────────────────────────────────────────────────────');
    console.log(`Net Profit:              $${netProfit.toFixed(2)}`);
    console.log(`ROI:                     ${roi}%`);
    console.log(`Cost per Customer:       $${(TRAFFIC_COST / customers.length).toFixed(2)}`);
    console.log(`Revenue per Customer:    $${(totalRevenue / customers.length).toFixed(2)}`);
    console.log(`LTV (Lifetime Value):    $${(totalRevenue / customers.length).toFixed(2)}`);
    console.log('');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🌐 TRAFFIC SOURCES BREAKDOWN');
    console.log('═══════════════════════════════════════════════════════════');
    
    // Сортируем по revenue
    const sortedSources = Object.entries(sourceStats)
      .sort((a, b) => b[1].revenue - a[1].revenue);

    for (const [source, stats] of sortedSources) {
      const retention = sourceRetention[source];
      const retRate = retention && retention.total > 0 
        ? ((retention.retained / retention.total) * 100).toFixed(1)
        : '0.0';
      
      const cpa = (TRAFFIC_COST * (stats.customers / customers.length)).toFixed(2);
      const sourceRevenue = stats.revenue.toFixed(2);
      const sourceROI = stats.revenue > 0 
        ? (((stats.revenue - parseFloat(cpa)) / parseFloat(cpa)) * 100).toFixed(1)
        : '0.0';

      console.log(`\n📍 Source: ${source.toUpperCase()}`);
      console.log(`   Customers:       ${stats.customers} (${(stats.customers/customers.length*100).toFixed(1)}%)`);
      console.log(`   Revenue:         $${sourceRevenue}`);
      console.log(`   Trial→Recurring: ${retention?.retained || 0}/${retention?.total || 0} (${retRate}% retention)`);
      console.log(`   Est. CPA:        $${cpa}`);
      console.log(`   ROI:             ${sourceROI}%`);
    }

    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 RETENTION BY SOURCE (Trial → $49)');
    console.log('═══════════════════════════════════════════════════════════');
    
    const retentionSorted = Object.entries(sourceRetention)
      .filter(([_, data]) => data.total > 0)
      .sort((a, b) => (b[1].retained / b[1].total) - (a[1].retained / a[1].total));

    for (const [source, data] of retentionSorted) {
      const rate = ((data.retained / data.total) * 100).toFixed(1);
      const bar = '█'.repeat(Math.floor(rate / 5));
      console.log(`${source.padEnd(20)} ${data.retained.toString().padStart(3)}/${data.total.toString().padStart(3)} (${rate.padStart(5)}%) ${bar}`);
    }

    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎯 KEY METRICS SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Total Revenue:           $${totalRevenue.toFixed(2)}`);
    console.log(`Net Profit:              $${netProfit.toFixed(2)}`);
    console.log(`ROI:                     ${roi}%`);
    console.log(`Retention Rate:          ${retentionRate}%`);
    console.log(`Dispute Rate:            ${(disputes.length / successfulCharges.length * 100).toFixed(2)}%`);
    console.log(`Customers:               ${customers.length}`);
    console.log(`Revenue per Customer:    $${(totalRevenue / customers.length).toFixed(2)}`);
    console.log('═══════════════════════════════════════════════════════════');

    // Дополнительно: сохраняем в файл
    const report = {
      period: {
        start: START_DATE.toISOString(),
        end: END_DATE.toISOString(),
      },
      summary: {
        customers: customers.length,
        charges: successfulCharges.length,
        revenue: totalRevenue,
        disputes: disputes.length,
        disputedAmount,
        lostDisputeAmount,
        retentionRate: parseFloat(retentionRate),
        netProfit,
        roi: parseFloat(roi),
      },
      bySource: sourceStats,
      retentionBySource: sourceRetention,
    };

    const fs = await import('fs');
    const reportPath = './stripe-report-' + new Date().toISOString().split('T')[0] + '.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved to: ${reportPath}\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run analysis
analyzeStripeData();
