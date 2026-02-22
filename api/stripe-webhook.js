import Stripe from 'stripe';
import { kv } from '@vercel/kv';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const { createOrGetReport } = require('./_lib/vinaudit');
const { store } = require('./_lib/store');

function buffer(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  // Handle stripe-config endpoint
  if (req.method === 'GET' && req.url === '/api/stripe-config') {
    return res.status(200).json({
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || '',
    });
  }
  
  // Disable body parsing for raw body access
  req.rawBody = true;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    const rawBody = await buffer(req);
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const cs = event.data.object;

    try {
      // Проверяем mode - для subscription mode подписка уже создана Stripe автоматически
      if (cs.mode === 'subscription') {
        console.log('[WEBHOOK] Checkout Session for subscription mode - subscription already created by Stripe');
        // Для renewal через create-renewal-payment.js подписка уже создана
        // Webhook customer.subscription.created обработает ее
        return res.status(200).json({ received: true, note: 'Subscription handled by subscription.created webhook' });
      }

      // Старая логика для payment mode (legacy flow - больше не используется)
      // ВАЖНО: Этот код оставлен для backward compatibility но не должен выполняться
      console.log('[WEBHOOK] ⚠️  Legacy checkout.session.completed - should not happen with new flow');
      
      // Получаем PM для подписки
      let pmId;
      if (cs.payment_intent) {
        const pi = await stripe.paymentIntents.retrieve(cs.payment_intent);
        pmId = pi.payment_method;
      }

      // ⚠️  DEPRECATED: Старая логика с MONTHLY price
      // Новый флоу использует subscription schedules с PRICE_49_EVERY_33D
      const PRICE_ID = process.env.STRIPE_PRICE_49_MONTHLY || 'price_1SLgSWIyzEAMYCDXa8g7uV6W';
      
      const sub = await stripe.subscriptions.create({
        customer: cs.customer,
        items: [{ price: PRICE_ID }],
        trial_period_days: 7,
        ...(pmId ? { default_payment_method: pmId } : {})
      });

      // Рассчитываем дату отмены после 2 циклов
      const trialEnd = sub.trial_end * 1000;
      const secondCycleEnd = trialEnd + 2 * 30 * 24 * 3600 * 1000;
      
      await stripe.subscriptions.update(sub.id, {
        cancel_at: Math.floor(secondCycleEnd / 1000)
      });

      // Генерация отчёта
      const orderId = cs.id;
      const vin = cs.metadata?.vin || '';
      const plate = cs.metadata?.plate || '';
      const state = cs.metadata?.state || '';

      store.touch(orderId, { status: 'processing' });

      // ТРИЗ: Перехват VIN при оплате (VIN введен + отчет оплачен)
      // Принцип: Конфликты превращены в функции - событие оплаты становится источником данных
      const { VINCollector } = require('./_lib/vin-collector');
      const vinCollector = new VINCollector();
      
      if (vin) {
        vinCollector.savePaidVIN(vin, {
          orderId,
          plate,
          state,
          customerId: cs.customer
        });
      }

      // Асинхронная генерация отчёта
      setImmediate(async () => {
        try {
          const report = await createOrGetReport({ vin, plate, state });
          store.save(orderId, { status: 'ready', report });
          
          // ТРИЗ: Сохранение отчета в кэш после получения
          // Принцип: Максимальное использование ресурсов
          if (vin && report) {
            try {
              const { VINReportCache } = require('./_lib/vin-report-cache');
              const reportCache = new VINReportCache();
              
              // Сохраняем отчет (может быть HTML или объект)
              const reportData = typeof report === 'string' ? report : JSON.stringify(report);
              await reportCache.saveReport(vin, reportData, 'vinaudit-api');
              console.log('Report cached after payment for VIN:', vin);
            } catch (cacheError) {
              console.error('Error caching report after payment:', cacheError.message);
            }
          }
        } catch (e) {
          console.error('Report generation error:', e);
          store.save(orderId, { 
            status: 'error', 
            error: e?.message || 'Report failed' 
          });
        }
      });

    } catch (err) {
      console.error('Webhook processing error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  // Handle subscription events
  if (event.type === 'customer.subscription.created') {
    const subscription = event.data.object;
    console.log('[WEBHOOK] Subscription created:', subscription.id);
    
    try {
      // Обновляем customer record в KV
      const customer = await stripe.customers.retrieve(subscription.customer);
      if (customer.email) {
        const normalizedEmail = customer.email.toLowerCase().trim();
        const customerKey = `customer:email:${normalizedEmail}`;
        let customerData = await kv.get(customerKey);
        
        // Если customer не существует в KV - создаем новую запись (renewal case)
        if (!customerData) {
          console.log('[WEBHOOK] ℹ️  Creating new KV record for renewal customer');
          customerData = {
            customer_id: subscription.customer,
            email: normalizedEmail,
            created_at: new Date().toISOString(),
            reports: [] // Новая подписка, старые reports недоступны
          };
        } else {
          // Обновляем customer_id если он изменился (renewal с новым customer)
          if (customerData.customer_id !== subscription.customer) {
            console.log('[WEBHOOK] ⚠️  Customer ID changed from', customerData.customer_id, 'to', subscription.customer);
            customerData.customer_id = subscription.customer;
            // Сохраняем старые reports при renewal
          }
        }
        
        // Обновляем subscription данные
        customerData.subscription = {
          subscription_id: subscription.id,
          subscription_schedule_id: customerData.subscription?.subscription_schedule_id || null,
          status: subscription.status,
          start_date: new Date(subscription.current_period_start * 1000).toISOString(),
          end_date: new Date(subscription.current_period_end * 1000).toISOString()
        };
        
        // Reset quota на новый цикл (2 reports на 33 дня)
        customerData.quota = {
          total: 2,
          used: 0,
          remaining: 2
        };
        
        await kv.set(customerKey, customerData);
        console.log('[WEBHOOK] ✅ Customer subscription updated in KV');
      }
    } catch (err) {
      console.error('[WEBHOOK] Error updating subscription in KV:', err.message);
    }
  }

  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object;
    console.log('[WEBHOOK] Subscription updated:', subscription.id, 'Status:', subscription.status);
    
    try {
      const customer = await stripe.customers.retrieve(subscription.customer);
      if (customer.email) {
        const normalizedEmail = customer.email.toLowerCase().trim();
        const customerKey = `customer:email:${normalizedEmail}`;
        const customerData = await kv.get(customerKey);
        
        if (customerData) {
          customerData.subscription = {
            subscription_id: subscription.id,
            subscription_schedule_id: customerData.subscription?.subscription_schedule_id || null,
            status: subscription.status,
            start_date: new Date(subscription.current_period_start * 1000).toISOString(),
            end_date: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end
          };
          
          await kv.set(customerKey, customerData);
          console.log('[WEBHOOK] ✅ Customer subscription status synced to KV');
        }
      }
    } catch (err) {
      console.error('[WEBHOOK] Error syncing subscription update:', err.message);
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    console.log('[WEBHOOK] Subscription deleted/canceled:', subscription.id);
    
    try {
      const customer = await stripe.customers.retrieve(subscription.customer);
      if (customer.email) {
        const normalizedEmail = customer.email.toLowerCase().trim();
        const customerKey = `customer:email:${normalizedEmail}`;
        const customerData = await kv.get(customerKey);
        
        if (customerData) {
          customerData.subscription = {
            ...customerData.subscription,
            status: 'canceled',
            canceled_at: new Date().toISOString()
          };
          
          // Обнуляем квоту при отмене
          customerData.quota = {
            total: 0,
            used: customerData.quota?.used || 0,
            remaining: 0
          };
          
          await kv.set(customerKey, customerData);
          console.log('[WEBHOOK] ✅ Subscription canceled in KV');
        }
      }
    } catch (err) {
      console.error('[WEBHOOK] Error handling subscription deletion:', err.message);
    }
  }

  // КРИТИЧНО: Обработка повторных платежей (каждые 33 дня)
  if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object;
    console.log('[WEBHOOK] Invoice paid:', invoice.id, 'Subscription:', invoice.subscription);
    
    // Проверяем что это recurring payment (не первый)
    if (invoice.subscription && invoice.billing_reason === 'subscription_cycle') {
      try {
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        const customer = await stripe.customers.retrieve(subscription.customer);
        
        if (customer.email) {
          const normalizedEmail = customer.email.toLowerCase().trim();
          const customerKey = `customer:email:${normalizedEmail}`;
          const customerData = await kv.get(customerKey);
          
          if (customerData) {
            console.log('[WEBHOOK] 🔄 Recurring payment - resetting quota');
            
            // RESET QUOTA на новый цикл
            customerData.quota = {
              total: 2,
              used: 0,
              remaining: 2
            };
            
            // Обновляем даты подписки
            customerData.subscription.current_period_start = new Date(subscription.current_period_start * 1000).toISOString();
            customerData.subscription.current_period_end = new Date(subscription.current_period_end * 1000).toISOString();
            customerData.subscription.end_date = new Date(subscription.current_period_end * 1000).toISOString();
            customerData.last_payment_at = new Date().toISOString();
            
            await kv.set(customerKey, customerData);
            console.log('[WEBHOOK] ✅ Quota reset for recurring payment');
          }
        }
      } catch (err) {
        console.error('[WEBHOOK] Error handling invoice payment:', err.message);
      }
    }
  }

  // Обработка активации subscription schedule (на 3 день после trial)
  if (event.type === 'customer.subscription.created' && event.data.object.schedule) {
    console.log('[WEBHOOK] Subscription created from schedule:', event.data.object.schedule);
    // Обрабатывается выше в customer.subscription.created
  }

  // КРИТИЧНО: Обработка неудачных платежей
  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object;
    console.log('[WEBHOOK] ❌ Payment failed:', invoice.id, 'Subscription:', invoice.subscription);
    
    if (invoice.subscription) {
      try {
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        const customer = await stripe.customers.retrieve(subscription.customer);
        
        if (customer.email) {
          const normalizedEmail = customer.email.toLowerCase().trim();
          const customerKey = `customer:email:${normalizedEmail}`;
          const customerData = await kv.get(customerKey);
          
          if (customerData) {
            console.log('[WEBHOOK] ⚠️  Payment failed - marking subscription as past_due');
            
            // Обновляем статус (Stripe автоматически меняет на past_due)
            customerData.subscription.status = subscription.status; // past_due или unpaid
            customerData.last_payment_failed_at = new Date().toISOString();
            
            // НЕ обнуляем квоту сразу - даем время исправить payment method
            // Stripe автоматически отменит подписку после retry period
            
            await kv.set(customerKey, customerData);
            console.log('[WEBHOOK] ✅ Subscription marked as', subscription.status);
          }
        }
      } catch (err) {
        console.error('[WEBHOOK] Error handling payment failure:', err.message);
      }
    }
  }

  return res.status(200).json({ received: true });
}

