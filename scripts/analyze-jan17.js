/**
 * Анализ конверсий за 17 января 2026
 * 
 * Запуск: node scripts/analyze-jan17.js
 */

import Stripe from 'stripe';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, '../.env.local') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

console.log('📊 CONVERSION ANALYSIS: January 17, 2026\n');
console.log('='.repeat(60));

// Jan 17: 00:00:00 to 23:59:59 (in seconds)
const jan17Start = Math.floor(new Date('2026-01-17T00:00:00').getTime() / 1000);
const jan17End = Math.floor(new Date('2026-01-17T23:59:59').getTime() / 1000);

console.log(`Period: ${new Date(jan17Start * 1000).toLocaleString()} → ${new Date(jan17End * 1000).toLocaleString()}\n`);

// Tier classification
function getCardTier(paymentMethod) {
  const card = paymentMethod?.card;
  if (!card) return 'unknown';
  
  if (card.checks?.cvc_check === 'fail') return 'fraud';
  if ((card.funding === 'credit' || card.funding === 'debit') && card.checks?.cvc_check === 'pass') {
    return 'premium';
  }
  if (card.funding === 'prepaid') return 'prepaid';
  return 'medium';
}

async function analyzeJan17() {
  try {
    // Get all $1 payments for Jan 17
    let allPayments = [];
    let hasMore = true;
    let startingAfter = undefined;

    while (hasMore) {
      const paymentIntents = await stripe.paymentIntents.list({
        limit: 100,
        created: { gte: jan17Start, lte: jan17End },
        starting_after: startingAfter
      });

      const filteredIntents = paymentIntents.data.filter(pi =>
        pi.status === 'succeeded' && pi.amount === 100
      );

      allPayments = allPayments.concat(filteredIntents);
      hasMore = paymentIntents.has_more;
      if (hasMore) {
        startingAfter = paymentIntents.data[paymentIntents.data.length - 1].id;
      }
    }

    console.log(`✅ Successful $1 payments: ${allPayments.length}\n`);

    if (allPayments.length === 0) {
      console.log('❌ No payments found for Jan 17, 2026\n');
      return;
    }

    // Analyze each payment
    const byTier = { premium: [], medium: [], prepaid: [], fraud: [], unknown: [] };
    const details = [];

    for (const pi of allPayments) {
      try {
        const customerId = pi.customer;
        let customer, pm, tier = 'unknown';
        
        if (customerId) {
          try {
            customer = await stripe.customers.retrieve(customerId);
          } catch (e) {}
        }
        
        if (pi.payment_method) {
          try {
            pm = await stripe.paymentMethods.retrieve(pi.payment_method);
            tier = getCardTier(pm);
          } catch (e) {}
        }
        
        const time = new Date(pi.created * 1000).toLocaleTimeString();
        const email = customer?.email || 'N/A';
        const funding = pm?.card?.funding || 'unknown';
        const last4 = pm?.card?.last4 || 'N/A';
        const cvc = pm?.card?.checks?.cvc_check || 'N/A';
        const metadata = customer?.metadata || {};
        
        byTier[tier].push({ time, email, funding, last4, cvc, amount: pi.amount / 100 });
        details.push({ time, email, tier, funding, last4, cvc, metadata });
      } catch (error) {
        byTier.unknown.push({ time: new Date(pi.created * 1000).toLocaleTimeString(), error: error.message });
      }
    }

    console.log('🎯 TIER DISTRIBUTION:\n');
    console.log(`🟢 Premium (Credit/Debit + CVC Pass): ${byTier.premium.length} (${((byTier.premium.length/allPayments.length)*100).toFixed(0)}%)`);
    console.log(`🟡 Medium (Unknown funding): ${byTier.medium.length} (${((byTier.medium.length/allPayments.length)*100).toFixed(0)}%)`);
    console.log(`🟡 Prepaid: ${byTier.prepaid.length} (${((byTier.prepaid.length/allPayments.length)*100).toFixed(0)}%)`);
    if (byTier.fraud.length > 0) {
      console.log(`🔴 Fraud (CVC Fail): ${byTier.fraud.length} (${((byTier.fraud.length/allPayments.length)*100).toFixed(0)}%)`);
    }
    if (byTier.unknown.length > 0) {
      console.log(`⚫ Unknown: ${byTier.unknown.length} (${((byTier.unknown.length/allPayments.length)*100).toFixed(0)}%)`);
    }

    console.log(`\nTotal: ${allPayments.length} payments\n`);

    // Show details
    console.log('='.repeat(60));
    console.log('📋 PAYMENT DETAILS:\n');

    details.sort((a, b) => a.time.localeCompare(b.time));

    details.forEach((d, i) => {
      const tierIcon = d.tier === 'premium' ? '🟢' : d.tier === 'prepaid' ? '🟡' : d.tier === 'medium' ? '🟡' : d.tier === 'fraud' ? '🔴' : '⚫';
      console.log(`${i+1}. ${d.time} - ${tierIcon} ${d.tier.toUpperCase()}`);
      console.log(`   Email: ${d.email}`);
      console.log(`   Card: ${d.funding} ****${d.last4} (CVC: ${d.cvc})`);
      
      // Show source if available
      if (d.metadata.utm_source) {
        console.log(`   Source: ${d.metadata.utm_source}`);
      }
      console.log('');
    });

    console.log('='.repeat(60));
    console.log('💰 PROJECTED MRR FROM JAN 17 COHORT:\n');

    // Success rates
    const premiumSuccess = 0.85;
    const mediumSuccess = 0.60;
    const prepaidSuccess = 0.40;

    const premiumRevenue = byTier.premium.length * 49 * premiumSuccess;
    const mediumRevenue = byTier.medium.length * 49 * mediumSuccess;
    const prepaidRevenue = byTier.prepaid.length * 49 * prepaidSuccess;

    console.log(`🟢 Premium: ${byTier.premium.length} × $49 × 85% = $${premiumRevenue.toFixed(2)}`);
    console.log(`🟡 Medium: ${byTier.medium.length} × $49 × 60% = $${mediumRevenue.toFixed(2)}`);
    console.log(`🟡 Prepaid: ${byTier.prepaid.length} × $49 × 40% = $${prepaidRevenue.toFixed(2)}`);
    console.log(`\nTotal projected: $${(premiumRevenue + mediumRevenue + prepaidRevenue).toFixed(2)}`);
    console.log(`Expected Payment CR: ${(((byTier.premium.length * premiumSuccess + byTier.medium.length * mediumSuccess + byTier.prepaid.length * prepaidSuccess) / allPayments.length) * 100).toFixed(1)}%\n`);

    console.log('='.repeat(60));
    console.log('📈 COMPARISON WITH RECENT DAYS:\n');

    // Compare with Jan 14-16
    const recentDays = [
      { date: 'Jan 14', start: new Date('2026-01-14T00:00:00'), end: new Date('2026-01-14T23:59:59') },
      { date: 'Jan 15', start: new Date('2026-01-15T00:00:00'), end: new Date('2026-01-15T23:59:59') },
      { date: 'Jan 16', start: new Date('2026-01-16T00:00:00'), end: new Date('2026-01-16T23:59:59') }
    ];

    for (const day of recentDays) {
      const dayStart = Math.floor(day.start.getTime() / 1000);
      const dayEnd = Math.floor(day.end.getTime() / 1000);
      
      let dayPayments = [];
      let hasMoreDay = true;
      let startingAfterDay = undefined;

      while (hasMoreDay) {
        const pis = await stripe.paymentIntents.list({
          limit: 100,
          created: { gte: dayStart, lte: dayEnd },
          starting_after: startingAfterDay
        });

        const filtered = pis.data.filter(pi => pi.status === 'succeeded' && pi.amount === 100);
        dayPayments = dayPayments.concat(filtered);
        hasMoreDay = pis.has_more;
        if (hasMoreDay) {
          startingAfterDay = pis.data[pis.data.length - 1].id;
        }
      }

      console.log(`${day.date}: ${dayPayments.length} payments`);
    }

    console.log(`Jan 17: ${allPayments.length} payments ← TODAY\n`);

    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

analyzeJan17().catch(console.error);
