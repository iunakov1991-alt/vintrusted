/**
 * Stripe Analytics Report - SAFE VERSION
 * Анализирует данные из KV вместо прямого обращения к Stripe API
 * (для случаев когда Stripe API key недоступен локально)
 */

import { kv } from '@vercel/kv';
import dotenv from 'dotenv';

// Load from .env.local (pulled from Vercel)
dotenv.config({ path: '.env.local' });

const START_DATE = new Date('2026-01-01T00:00:00Z');
const END_DATE = new Date('2026-02-22T23:59:59Z');
const TRAFFIC_COST = 800;

console.log('═══════════════════════════════════════════════════════════');
console.log('📊 VINTRUSTED ANALYTICS (from KV Database)');
console.log('═══════════════════════════════════════════════════════════');
console.log(`Period: ${START_DATE.toISOString().split('T')[0]} → ${END_DATE.toISOString().split('T')[0]}`);
console.log(`Traffic Cost: $${TRAFFIC_COST}`);
console.log('═══════════════════════════════════════════════════════════\n');

async function analyzeKVData() {
  try {
    console.log('🔄 Fetching customer data from KV...\n');

    // Получаем все customer keys
    const customerKeys = await kv.keys('customer:email:*');
    console.log(`✅ Found ${customerKeys.length} customers in KV\n`);

    const allCustomers = [];
    
    for (const key of customerKeys) {
      try {
        const customerData = await kv.get(key);
        if (customerData && customerData.created_at) {
          const createdAt = new Date(customerData.created_at);
          if (createdAt >= START_DATE && createdAt <= END_DATE) {
            allCustomers.push(customerData);
          }
        }
      } catch (error) {
        console.error(`⚠️  Error reading ${key}:`, error.message);
      }
    }

    console.log(`✅ Filtered ${allCustomers.length} customers in date range\n`);

    // ═════════════════════════════════════════════════════════════════
    // АНАЛИЗ
    // ═════════════════════════════════════════════════════════════════

    // Revenue calculation (из quota и subscription status)
    let trialCount = 0;
    let recurringCount = 0;
    let activeSubscriptions = 0;
    let disputedCustomers = 0;
    let failedFirstPayment = 0;

    const sourceStats = {};
    const tierStats = { premium: 0, medium: 0, fraud: 0, unknown: 0 };

    for (const customer of allCustomers) {
      // Trial payments (все customers заплатили $2.99 minimum)
      trialCount++;

      // Recurring payments (если subscription active/trialing и есть history)
      const subStatus = customer.subscription?.status;
      if (subStatus === 'active' || subStatus === 'trialing') {
        activeSubscriptions++;
      }

      // Disputes
      if (customer.disputed) {
        disputedCustomers++;
      }

      // Failed first payment
      if (customer.failed_first_payment) {
        failedFirstPayment++;
      }

      // Tier stats
      const tier = customer.tier || 'unknown';
      tierStats[tier] = (tierStats[tier] || 0) + 1;

      // Checking for recurring payments via reports count
      // Trial = 1 report, Recurring = 2+ reports = paid $49
      const reportCount = customer.reports?.length || 0;
      if (reportCount > 1) {
        recurringCount++;
      }

      // Source stats (из metadata - может не быть)
      const source = 'unknown'; // KV не хранит utm_source напрямую
      if (!sourceStats[source]) {
        sourceStats[source] = {
          customers: 0,
          retained: 0,
        };
      }
      sourceStats[source].customers++;
      if (reportCount > 1) {
        sourceStats[source].retained++;
      }
    }

    // Calculations
    const trialRevenue = trialCount * 2.99;
    const recurringRevenue = recurringCount * 49;
    const totalRevenue = trialRevenue + recurringRevenue;

    const retentionRate = trialCount > 0 
      ? ((recurringCount / trialCount) * 100).toFixed(2)
      : 0;

    const disputeRate = ((disputedCustomers / allCustomers.length) * 100).toFixed(2);
    const failedPaymentRate = ((failedFirstPayment / trialCount) * 100).toFixed(2);

    const netProfit = totalRevenue - TRAFFIC_COST;
    const roi = ((netProfit / TRAFFIC_COST) * 100).toFixed(2);

    // ═════════════════════════════════════════════════════════════════
    // ВЫВОД
    // ═════════════════════════════════════════════════════════════════

    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('💰 REVENUE SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Total Customers:         ${allCustomers.length}`);
    console.log(`Trial Payments ($2.99):  ${trialCount} × $2.99 = $${trialRevenue.toFixed(2)}`);
    console.log(`Recurring Payments ($49): ${recurringCount} × $49 = $${recurringRevenue.toFixed(2)}`);
    console.log(`Total Revenue:           $${totalRevenue.toFixed(2)}`);
    console.log('');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('⚠️  DISPUTES & PROBLEMS');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Disputed Customers:      ${disputedCustomers} (${disputeRate}%)`);
    console.log(`Failed First Payment:    ${failedFirstPayment} (${failedPaymentRate}%)`);
    console.log(`Active Subscriptions:    ${activeSubscriptions}`);
    console.log('');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('📈 RETENTION ANALYSIS');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Paid Trial ($2.99):      ${trialCount}`);
    console.log(`Paid Recurring ($49):    ${recurringCount}`);
    console.log(`Retained (Trial→$49):    ${recurringCount}`);
    console.log('');
    console.log(`RETENTION RATE:          ${retentionRate}%`);
    console.log('');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('💵 ROI ANALYSIS (Traffic: $' + TRAFFIC_COST + ')');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Gross Revenue:           $${totalRevenue.toFixed(2)}`);
    console.log(`Traffic Cost:            -$${TRAFFIC_COST}`);
    console.log('─────────────────────────────────────────────────────────');
    console.log(`Net Profit:              $${netProfit.toFixed(2)}`);
    console.log(`ROI:                     ${roi}%`);
    console.log(`Cost per Customer:       $${(TRAFFIC_COST / allCustomers.length).toFixed(2)}`);
    console.log(`Revenue per Customer:    $${(totalRevenue / allCustomers.length).toFixed(2)}`);
    console.log('');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎯 TIER DISTRIBUTION');
    console.log('═══════════════════════════════════════════════════════════');
    for (const [tier, count] of Object.entries(tierStats)) {
      if (count > 0) {
        const percent = ((count / allCustomers.length) * 100).toFixed(1);
        const emoji = tier === 'premium' ? '🟢' : tier === 'medium' ? '🟡' : tier === 'fraud' ? '🔴' : '⚪';
        console.log(`${emoji} ${tier.toUpperCase().padEnd(15)} ${count.toString().padStart(4)} (${percent.padStart(5)}%)`);
      }
    }

    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎯 KEY METRICS');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Total Revenue:           $${totalRevenue.toFixed(2)}`);
    console.log(`Net Profit:              $${netProfit.toFixed(2)}`);
    console.log(`ROI:                     ${roi}%`);
    console.log(`Retention Rate:          ${retentionRate}%`);
    console.log(`Dispute Rate:            ${disputeRate}%`);
    console.log(`Failed Payment Rate:     ${failedPaymentRate}%`);
    console.log('═══════════════════════════════════════════════════════════');

    console.log('\n⚠️  NOTE: Source breakdown недоступен - KV не хранит utm_source.');
    console.log('Для полной аналитики по источникам используйте Stripe Dashboard или stripe-analytics.js с API key.\n');

    // Save report
    const report = {
      period: {
        start: START_DATE.toISOString(),
        end: END_DATE.toISOString(),
      },
      summary: {
        customers: allCustomers.length,
        trialCount,
        recurringCount,
        trialRevenue: parseFloat(trialRevenue.toFixed(2)),
        recurringRevenue: parseFloat(recurringRevenue.toFixed(2)),
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        disputedCustomers,
        failedFirstPayment,
        activeSubscriptions,
        retentionRate: parseFloat(retentionRate),
        disputeRate: parseFloat(disputeRate),
        failedPaymentRate: parseFloat(failedPaymentRate),
        netProfit: parseFloat(netProfit.toFixed(2)),
        roi: parseFloat(roi),
      },
      tierStats,
      note: 'Source breakdown unavailable - KV does not store utm_source data',
    };

    const fs = await import('fs');
    const reportPath = './kv-analytics-report-' + new Date().toISOString().split('T')[0] + '.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Report saved to: ${reportPath}\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

analyzeKVData();
