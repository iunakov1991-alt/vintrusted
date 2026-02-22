import { kv } from '@vercel/kv';
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const customerKey = `customer:email:${normalizedEmail}`;
    const customerData = await kv.get(customerKey);

    if (!customerData) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const subscriptionId = customerData.subscription?.subscription_id;
    const scheduleId = customerData.subscription?.subscription_schedule_id;

    if (!subscriptionId && !scheduleId) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    let subscription = null;

    // Отменяем активную подписку (если есть)
    if (subscriptionId) {
      subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true
      });
      console.log('[CANCEL-SUBSCRIPTION] Subscription canceled:', subscriptionId);
    }

    // Отменяем subscription schedule (если еще не активирован)
    if (scheduleId) {
      try {
        await stripe.subscriptionSchedules.cancel(scheduleId);
        console.log('[CANCEL-SUBSCRIPTION] Subscription schedule canceled:', scheduleId);
      } catch (scheduleError) {
        // Schedule может быть уже released (превратился в подписку)
        console.log('[CANCEL-SUBSCRIPTION] Could not cancel schedule (may be released):', scheduleError.message);
      }
    }

    // Обновляем в KV
    customerData.subscription.cancel_at_period_end = true;
    customerData.subscription.canceled_at = new Date().toISOString();
    
    // Если отменяем schedule (trialing period) - сразу меняем status на canceled
    // Webhook subscription_schedule.canceled тоже обновит, но делаем сразу для клиента
    if (scheduleId && !subscriptionId) {
      customerData.subscription.status = 'canceled';
      customerData.quota.remaining = 0; // Блокируем новые VIN checks
    }
    
    await kv.set(customerKey, customerData);

    return res.status(200).json({
      success: true,
      canceled_at_period_end: subscription?.cancel_at_period_end || true,
      current_period_end: subscription?.current_period_end || null,
      status: customerData.subscription.status
    });

  } catch (error) {
    console.error('[CANCEL-SUBSCRIPTION] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
