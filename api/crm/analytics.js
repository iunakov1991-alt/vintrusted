import Stripe from 'stripe';
import { kv } from '@vercel/kv';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Простая аутентификация
const CRM_PASSWORD = process.env.CRM_PASSWORD || 'vintrusted2026';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Проверка пароля
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${CRM_PASSWORD}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Параметры из query
    const startDate = req.query.start || new Date('2026-01-01').toISOString();
    const endDate = req.query.end || new Date().toISOString();
    const trafficCost = parseFloat(req.query.budget) || 0;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const startTimestamp = Math.floor(start.getTime() / 1000);
    const endTimestamp = Math.floor(end.getTime() / 1000);

    // Получаем данные из Stripe
    console.log('Fetching charges...');
    const charges = [];
    let hasMore = true;
    let startingAfter = null;

    while (hasMore) {
      const params = {
        limit: 100,
        created: { gte: startTimestamp, lte: endTimestamp },
      };
      if (startingAfter) params.starting_after = startingAfter;

      const response = await stripe.charges.list(params);
      charges.push(...response.data);
      hasMore = response.has_more;
      if (hasMore) startingAfter = response.data[response.data.length - 1].id;
    }

    console.log('Fetching disputes...');
    const disputes = [];
    hasMore = true;
    startingAfter = null;

    while (hasMore) {
      const params = {
        limit: 100,
        created: { gte: startTimestamp, lte: endTimestamp },
      };
      if (startingAfter) params.starting_after = startingAfter;

      const response = await stripe.disputes.list(params);
      disputes.push(...response.data);
      hasMore = response.has_more;
      if (hasMore) startingAfter = response.data[response.data.length - 1].id;
    }

    console.log('Fetching customers...');
    const customers = [];
    hasMore = true;
    startingAfter = null;

    while (hasMore) {
      const params = {
        limit: 100,
        created: { gte: startTimestamp, lte: endTimestamp },
      };
      if (startingAfter) params.starting_after = startingAfter;

      const response = await stripe.customers.list(params);
      customers.push(...response.data);
      hasMore = response.has_more;
      if (hasMore) startingAfter = response.data[response.data.length - 1].id;
    }

    // Анализ
    const successfulCharges = charges.filter(c => c.status === 'succeeded');
    const totalRevenue = successfulCharges.reduce((sum, c) => sum + c.amount, 0) / 100;

    const trialPayments = successfulCharges.filter(c => c.amount === 299);
    const recurringPayments = successfulCharges.filter(c => c.amount === 4900);

    const trialRevenue = trialPayments.length * 2.99;
    const recurringRevenue = recurringPayments.length * 49;

    // Disputes
    const disputesByStatus = {
      won: disputes.filter(d => d.status === 'won').length,
      lost: disputes.filter(d => d.status === 'lost').length,
      under_review: disputes.filter(d => d.status === 'under_review').length,
      needs_response: disputes.filter(d => d.status === 'needs_response').length,
    };

    const disputedAmount = disputes.reduce((sum, d) => sum + d.amount, 0) / 100;
    const lostDisputeAmount = disputes.filter(d => d.status === 'lost').reduce((sum, d) => sum + d.amount, 0) / 100;

    // Sources
    const sourceStats = {};
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

      const customerCharges = successfulCharges.filter(c => c.customer === customer.id);
      const customerRevenue = customerCharges.reduce((sum, c) => sum + c.amount, 0) / 100;
      sourceStats[source].revenue += customerRevenue;

      const hasTrial = customerCharges.some(c => c.amount === 299);
      const hasRecurring = customerCharges.some(c => c.amount === 4900);

      if (hasTrial) sourceStats[source].trial_paid++;
      if (hasRecurring) sourceStats[source].recurring_paid++;
    }

    // Retention
    const customersWithTrial = customers.filter(c => {
      const charges = successfulCharges.filter(ch => ch.customer === c.id);
      return charges.some(ch => ch.amount === 299);
    });

    const retainedCustomers = customers.filter(c => {
      const charges = successfulCharges.filter(ch => ch.customer === c.id);
      return charges.some(ch => ch.amount === 299) && charges.some(ch => ch.amount === 4900);
    });

    const retentionRate = customersWithTrial.length > 0 
      ? (retainedCustomers.length / customersWithTrial.length * 100)
      : 0;

    // Платящие клиенты (хотя бы один успешный платеж)
    const payingCustomers = customers.filter(c => {
      return successfulCharges.some(ch => ch.customer === c.id);
    }).length;

    // ROI расчеты
    const netProfit = totalRevenue - lostDisputeAmount - trafficCost;
    const roi = trafficCost > 0 ? ((netProfit / trafficCost) * 100) : 0;

    // Цена лида и платящего лида
    const leadCost = trafficCost > 0 && customers.length > 0 
      ? trafficCost / customers.length 
      : 0;
    
    const payingLeadCost = trafficCost > 0 && payingCustomers > 0
      ? trafficCost / payingCustomers
      : 0;

    // Timeline данные (по дням)
    const dailyStats = {};
    for (const charge of successfulCharges) {
      const date = new Date(charge.created * 1000).toISOString().split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { revenue: 0, charges: 0 };
      }
      dailyStats[date].revenue += charge.amount / 100;
      dailyStats[date].charges += 1;
    }

    // Response
    return res.status(200).json({
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
        days: Math.ceil((end - start) / (1000 * 60 * 60 * 24)),
      },
      summary: {
        customers: customers.length,
        payingCustomers,
        charges: successfulCharges.length,
        revenue: totalRevenue,
        trialRevenue,
        recurringRevenue,
        disputes: disputes.length,
        disputedAmount,
        lostDisputeAmount,
        retentionRate: parseFloat(retentionRate.toFixed(2)),
        netProfit,
        roi: parseFloat(roi.toFixed(2)),
        trafficCost,
        leadCost: parseFloat(leadCost.toFixed(2)),
        payingLeadCost: parseFloat(payingLeadCost.toFixed(2)),
      },
      breakdown: {
        trialPayments: trialPayments.length,
        recurringPayments: recurringPayments.length,
      },
      disputes: {
        total: disputes.length,
        won: disputesByStatus.won,
        lost: disputesByStatus.lost,
        underReview: disputesByStatus.under_review,
        needsResponse: disputesByStatus.needs_response,
      },
      sources: sourceStats,
      timeline: dailyStats,
    });

  } catch (error) {
    console.error('CRM Analytics Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
    });
  }
}
