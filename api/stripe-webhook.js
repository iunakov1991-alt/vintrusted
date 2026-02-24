import Stripe from 'stripe';
import { kv } from '@vercel/kv';
import { logWebhookError, logBusinessEvent, SEVERITY, EVENT_TYPE } from './_lib/monitoring.js';
import { uploadClickConversion } from './_lib/google-ads-conversions.js';
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

// ✅ ЗАЩИТА: KV operations с retry logic
async function kvGetWithRetry(key, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await kv.get(key);
    } catch (error) {
      console.error(`[KV-RETRY] get(${key}) attempt ${attempt + 1} failed:`, error.message);
      if (attempt === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 200 * (attempt + 1)));
    }
  }
}

async function kvSetWithRetry(key, value, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await kv.set(key, value);
    } catch (error) {
      console.error(`[KV-RETRY] set(${key}) attempt ${attempt + 1} failed:`, error.message);
      if (attempt === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 200 * (attempt + 1)));
    }
  }
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
    await logWebhookError('signature_verification', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ✅ P1 & P2: WEBHOOK IDEMPOTENCY & ORDERING
  // ═══════════════════════════════════════════════════════════════════════
  // Защита от duplicate webhook processing и race conditions
  
  try {
    // 1. Проверяем idempotency (уже обработали этот webhook?)
    const webhookIdKey = `webhook:processed:${event.id}`;
    const alreadyProcessed = await kv.exists(webhookIdKey);
    
    if (alreadyProcessed) {
      console.log(`[WEBHOOK] ⚠️  Duplicate webhook detected: ${event.id} - SKIPPING`);
      return res.status(200).json({ 
        received: true, 
        duplicate: true,
        event_id: event.id 
      });
    }
    
    // 2. Проверяем timestamp (игнорируем старые webhooks если есть новые)
    // Это защищает от out-of-order delivery
    const eventTimestamp = event.created; // Unix timestamp в секундах
    
    // Для customer-specific webhooks - проверяем последний обработанный timestamp
    let customerEmail = null;
    try {
      if (event.type.includes('subscription') || event.type.includes('invoice')) {
        const obj = event.data.object;
        if (obj.customer) {
          const customer = await stripe.customers.retrieve(obj.customer);
          customerEmail = customer.email?.toLowerCase().trim();
          
          if (customerEmail) {
            const lastWebhookKey = `webhook:last:${customerEmail}`;
            const lastProcessedTimestamp = await kv.get(lastWebhookKey);
            
            if (lastProcessedTimestamp && eventTimestamp < lastProcessedTimestamp) {
              console.log(`[WEBHOOK] ⚠️  Out-of-order webhook for ${customerEmail}: ${event.type} (event: ${eventTimestamp}, last: ${lastProcessedTimestamp}) - PROCESSING ANYWAY WITH CAUTION`);
              // Обрабатываем anyway, но логируем warning
              // Не skip, потому что могут быть legitimate cases (например, 2 subscriptions)
            }
          }
        }
      }
    } catch (timestampError) {
      console.error('[WEBHOOK] Error checking timestamp ordering:', timestampError.message);
      // Продолжаем обработку - это не критично
    }
    
    // 3. Помечаем webhook как processed ДО обработки (для idempotency)
    // TTL = 7 days (Stripe не отправляет старые webhooks)
    await kv.set(webhookIdKey, {
      event_type: event.type,
      processed_at: new Date().toISOString(),
      event_created: eventTimestamp,
    }, { ex: 60 * 60 * 24 * 7 });
    
    // 4. Обновляем last processed timestamp для customer (для ordering)
    if (customerEmail) {
      const lastWebhookKey = `webhook:last:${customerEmail}`;
      await kv.set(lastWebhookKey, eventTimestamp, { ex: 60 * 60 * 24 * 7 });
    }
    
    console.log(`[WEBHOOK] ✅ Idempotency check passed: ${event.id} (${event.type})`);
    
  } catch (idempotencyError) {
    console.error('[WEBHOOK] Error in idempotency check:', idempotencyError.message);
    // Fail open: если idempotency check сломался - обрабатываем webhook
    // Альтернатива: fail closed (return error)
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
        let customerData = await kvGetWithRetry(customerKey);
        
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
        
        // ✅ ИСПРАВЛЕНО: Проверяем metadata для renewal
        const isRenewal = subscription.metadata?.renewal === 'true';
        
        if (isRenewal) {
          // ═══════════════════════════════════════════════════════════
          // MANUAL RENEWAL (пользователь кликнул "Renew Subscription")
          // ═══════════════════════════════════════════════════════════
          console.log('[WEBHOOK] 🔄 Processing manual renewal');
          
          // ВСЕГДА сбрасываем квоту для renewal (даже если она существует)
          customerData.quota = {
            total: 2,
            used: 0,
            remaining: 2
          };
          console.log('[WEBHOOK] ✅ Quota reset for renewal: 2/2');
          
          // Сохраняем старые reports (они уже в customerData.reports)
          
        } else {
          // ═══════════════════════════════════════════════════════════
          // ОБЫЧНАЯ ПЕРВАЯ ПОДПИСКА (через checkout $2.99 → $49)
          // ═══════════════════════════════════════════════════════════
          
          // Если quota еще не существует (новый customer) - создаем с 2/2
          if (!customerData.quota) {
            console.log('[WEBHOOK] ℹ️  Creating initial quota for new customer');
            customerData.quota = {
              total: 2,
              used: 0,
              remaining: 2
            };
          } else {
            // Quota существует (из trial периода) - сохраняем
            console.log('[WEBHOOK] ℹ️  Preserving existing quota from trial period:', customerData.quota);
          }
        }
        
        await kvSetWithRetry(customerKey, customerData);
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
        const customerData = await kvGetWithRetry(customerKey);
        
        if (customerData) {
          const oldStatus = customerData.subscription?.status;
          const newStatus = subscription.status;
          
          customerData.subscription = {
            subscription_id: subscription.id,
            subscription_schedule_id: customerData.subscription?.subscription_schedule_id || null,
            status: newStatus,
            start_date: new Date(subscription.current_period_start * 1000).toISOString(),
            end_date: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end
          };
          
          // ✅ Логирование для cancel_at_period_end
          if (subscription.cancel_at_period_end) {
            console.log('[WEBHOOK] ℹ️  Subscription set to cancel at period end - quota remains active until', customerData.subscription.end_date);
          }
          
          // КРИТИЧНО: Управление quota при изменении статуса
          if (oldStatus === 'active' && (newStatus === 'past_due' || newStatus === 'unpaid')) {
            console.log('[WEBHOOK] ⚠️  Subscription went past_due - blocking remaining quota');
            // Сохраняем старое значение для возможного восстановления
            customerData.quota_before_past_due = customerData.quota?.remaining || 0;
            customerData.quota.remaining = 0;
          }
          
          // Восстановление после past_due (когда пользователь обновил payment method)
          if ((oldStatus === 'past_due' || oldStatus === 'unpaid') && newStatus === 'active') {
            console.log('[WEBHOOK] ✅ Subscription recovered from past_due');
            
            // Проверяем - был ли уже quota reset через invoice.payment_succeeded
            const currentQuota = customerData.quota?.remaining || 0;
            
            if (currentQuota === 2) {
              // invoice.payment_succeeded уже сработал и reset quota - не трогаем
              console.log('[WEBHOOK] ℹ️  Quota already reset by invoice.payment_succeeded');
            } else {
              // Восстанавливаем сохраненное значение (если есть)
              const restoredQuota = customerData.quota_before_past_due || 0;
              customerData.quota.remaining = restoredQuota;
              console.log('[WEBHOOK] ℹ️  Quota restored:', restoredQuota);
            }
            
            delete customerData.quota_before_past_due; // Очищаем временное поле
          }
          
          await kvSetWithRetry(customerKey, customerData);
          console.log('[WEBHOOK] ✅ Customer subscription status synced:', oldStatus, '→', newStatus);
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
        const customerData = await kvGetWithRetry(customerKey);
        
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
          
          await kvSetWithRetry(customerKey, customerData);
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
    console.log('[WEBHOOK] Invoice paid:', invoice.id, 'Subscription:', invoice.subscription, 'Billing reason:', invoice.billing_reason);
    
    // Обрабатываем успешные subscription invoices
    // subscription_cycle = recurring charge (RESET quota)
    // subscription_create = first charge after trial (НЕ СБРАСЫВАЕМ quota - она уже установлена в trial)
    // subscription_update = recovery from past_due (RESET quota)
    
    if (invoice.subscription) {
      try {
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        const customer = await stripe.customers.retrieve(subscription.customer);
        
        if (customer.email) {
          const normalizedEmail = customer.email.toLowerCase().trim();
          const customerKey = `customer:email:${normalizedEmail}`;
          const customerData = await kvGetWithRetry(customerKey);
          
          if (customerData) {
            const billingReason = invoice.billing_reason;
            
            // ✅ ИСПРАВЛЕНО: Проверяем metadata renewal
            const isRenewal = subscription.metadata?.renewal === 'true';
            
            // ✅ ИСПРАВЛЕНО: Сбрасываем quota для ВСЕХ subscription_create (не только renewal)
            // КРИТИЧНО: Первый $49 платеж ДОЛЖЕН reset quota с 0 (после trial) на 2
            // Иначе если у пользователя осталась квота 1 (не использовал) → получит 3 отчета вместо 2
            const shouldResetQuota = 
              billingReason === 'subscription_cycle' || 
              billingReason === 'subscription_update' ||
              billingReason === 'subscription_create'; // ← Убрали проверку isRenewal
            
            if (shouldResetQuota) {
              let resetReason = 'Unknown';
              if (billingReason === 'subscription_cycle') resetReason = '🔄 Recurring payment';
              if (billingReason === 'subscription_update') resetReason = '🔧 Payment recovery';
              if (billingReason === 'subscription_create' && isRenewal) resetReason = '🔄 Manual renewal';
              if (billingReason === 'subscription_create' && !isRenewal) resetReason = '💳 First $49 payment';
              
              console.log('[WEBHOOK]', resetReason, '- resetting quota to 2/2');
              
              // RESET QUOTA на новый цикл
              customerData.quota = {
                total: 2,
                used: 0,
                remaining: 2
              };
              
              // ══════════════════════════════════════════════════════════════
              // 🎯 GOOGLE ADS: Upload $49 recurring conversion
              // We send every paid $49 invoice so Google Ads can:
              //   • See real LTV per click
              //   • Optimize bidding with Target ROAS
              //   • Report accurate revenue attribution
              //
              // Conversion action IDs (set in .env.local):
              //   GOOGLE_ADS_CONVERSION_ACTION_FIRST     — first $49 after trial
              //   GOOGLE_ADS_CONVERSION_ACTION_RECURRING — all subsequent $49
              // ══════════════════════════════════════════════════════════════
              try {
                // Get GCLID from customer metadata (saved at trial checkout)
                const gclid = customer.metadata?.gclid || '';
                
                if (gclid) {
                  const isFirstPayment = billingReason === 'subscription_create' && !isRenewal;
                  
                  const conversionActionId = isFirstPayment
                    ? process.env.GOOGLE_ADS_CONVERSION_ACTION_FIRST
                    : process.env.GOOGLE_ADS_CONVERSION_ACTION_RECURRING;
                  
                  if (conversionActionId) {
                    const invoiceAmountDollars = (invoice.amount_paid || 4900) / 100;
                    
                    const gadsResult = await uploadClickConversion({
                      gclid,
                      conversionActionId,
                      value: invoiceAmountDollars,
                      currency: (invoice.currency || 'usd').toUpperCase(),
                      conversionTime: invoice.status_transitions?.paid_at
                        ? invoice.status_transitions.paid_at * 1000
                        : Date.now(),
                      orderId: invoice.id, // dedup: same invoice_id → ignored on retry
                    });
                    
                    console.log(
                      `[WEBHOOK] 🎯 Google Ads conversion upload (${isFirstPayment ? 'first $49' : 'recurring $49'}):`,
                      gadsResult.success ? '✅ OK' : `❌ ${gadsResult.reason}`
                    );
                  } else {
                    console.log('[WEBHOOK] ℹ️  GOOGLE_ADS_CONVERSION_ACTION not set yet — skipping upload');
                  }
                } else {
                  console.log('[WEBHOOK] ℹ️  No GCLID on customer — Google Ads upload skipped (organic/unknown source)');
                }
              } catch (gadsErr) {
                // Non-critical: never block quota reset or KV save because of Ads upload failure
                console.error('[WEBHOOK] ⚠️  Google Ads upload error (non-critical):', gadsErr.message);
              }
            }
            
            // Обновляем даты подписки
            customerData.subscription.current_period_start = new Date(subscription.current_period_start * 1000).toISOString();
            customerData.subscription.current_period_end = new Date(subscription.current_period_end * 1000).toISOString();
            customerData.subscription.end_date = new Date(subscription.current_period_end * 1000).toISOString();
            customerData.last_payment_at = new Date().toISOString();
            
            await kvSetWithRetry(customerKey, customerData);
            console.log('[WEBHOOK] ✅ Quota reset after payment');
          } else {
            console.log('[WEBHOOK] ⚠️  Customer not found in KV for invoice payment (will be created by subscription.created)');
          }
        }
      } catch (err) {
        console.error('[WEBHOOK] Error handling invoice payment:', err.message);
      }
    } else {
      // ✅ НОВАЯ ЛОГИКА: Trial payment БЕЗ subscription (edge case)
      console.log('[WEBHOOK] 💳 Trial payment succeeded (no subscription):', invoice.id);
      
      try {
        const customer = await stripe.customers.retrieve(invoice.customer);
        if (customer.email) {
          const normalizedEmail = customer.email.toLowerCase().trim();
          const customerKey = `customer:email:${normalizedEmail}`;
          const customerData = await kvGetWithRetry(customerKey);
          
          if (customerData) {
            customerData.trial_payment_at = new Date().toISOString();
            customerData.trial_payment_invoice = invoice.id;
            await kvSetWithRetry(customerKey, customerData);
            console.log('[WEBHOOK] ✅ Trial payment recorded');
          }
        }
      } catch (err) {
        console.error('[WEBHOOK] Error handling trial payment:', err.message);
      }
    }
  }

  // Обработка активации subscription schedule (на 3 день после trial)
  if (event.type === 'customer.subscription.created' && event.data.object.schedule) {
    console.log('[WEBHOOK] Subscription created from schedule:', event.data.object.schedule);
    // Обрабатывается выше в customer.subscription.created
  }

  // КРИТИЧНО: Обработка отмены subscription schedule (в период 'trialing')
  if (event.type === 'subscription_schedule.canceled') {
    const schedule = event.data.object;
    console.log('[WEBHOOK] Subscription schedule canceled:', schedule.id);
    
    try {
      const customer = await stripe.customers.retrieve(schedule.customer);
      if (customer.email) {
        const normalizedEmail = customer.email.toLowerCase().trim();
        const customerKey = `customer:email:${normalizedEmail}`;
        const customerData = await kvGetWithRetry(customerKey);
        
        if (customerData && customerData.subscription?.subscription_schedule_id === schedule.id) {
          console.log('[WEBHOOK] ℹ️  Canceling trialing subscription in KV');
          
          // Обновляем статус на canceled
          customerData.subscription.status = 'canceled';
          customerData.subscription.canceled_at = new Date().toISOString();
          
          // ВАЖНО: НЕ обнуляем оставшуюся квоту сразу
          // Пользователь заплатил $2.99 и должен иметь доступ к купленным отчетам
          // Но блокируем создание НОВЫХ отчетов через remaining=0
          if (customerData.quota) {
            customerData.quota.remaining = 0;
          }
          
          await kvSetWithRetry(customerKey, customerData);
          console.log('[WEBHOOK] ✅ Trialing subscription canceled, remaining quota set to 0');
        }
      }
    } catch (err) {
      console.error('[WEBHOOK] Error handling schedule cancellation:', err.message);
    }
  }

  // КРИТИЧНО: Обработка неудачных платежей
  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object;
    console.log('[WEBHOOK] ❌ Payment failed:', invoice.id, 'Subscription:', invoice.subscription, 'Billing reason:', invoice.billing_reason);
    
    if (invoice.subscription) {
      try {
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        const customer = await stripe.customers.retrieve(subscription.customer);
        
        if (customer.email) {
          const normalizedEmail = customer.email.toLowerCase().trim();
          const customerKey = `customer:email:${normalizedEmail}`;
          const customerData = await kvGetWithRetry(customerKey);
          
          if (customerData) {
            const oldQuota = customerData.quota?.remaining || 0;
            console.log('[WEBHOOK] ⚠️  Payment failed - blocking quota');
            
            // Обновляем статус (Stripe автоматически меняет на past_due)
            customerData.subscription.status = subscription.status; // past_due или unpaid
            customerData.last_payment_failed_at = new Date().toISOString();
            
            // ВАЖНО: Обнуляем remaining quota - пользователь не может использовать сервис
            // пока не обновит payment method и invoice не будет оплачен
            if (customerData.quota) {
              customerData.quota.remaining = 0;
            } else {
              // Если quota еще не была создана (очень редкий edge case)
              customerData.quota = { total: 0, used: 0, remaining: 0 };
            }
            
            await kvSetWithRetry(customerKey, customerData);
            console.log('[WEBHOOK] ✅ Subscription marked as', subscription.status, '- quota:', oldQuota, '→ 0');
            
            // ┌─────────────────────────────────────────────────────────────┐
            // │ АВТОМАТИЧЕСКАЯ БЛОКИРОВКА МОШЕННИКОВ                         │
            // │ Если failed первый $49 платеж - добавляем в blacklist       │
            // └─────────────────────────────────────────────────────────────┘
            const isFirstSubscriptionPayment = invoice.billing_reason === 'subscription_create';
            
            if (isFirstSubscriptionPayment) {
              console.log('[WEBHOOK] 🚨 FIRST $49 PAYMENT FAILED - Adding to blacklist');
              
              // 1. Блокируем card fingerprint (с fallback если нет в metadata)
              let cardFingerprint = customer.metadata?.card_fingerprint;
              
              if (!cardFingerprint) {
                console.log('[WEBHOOK] ⚠️  Card fingerprint not in metadata - attempting to fetch from payment method');
                
                try {
                  const paymentMethods = await stripe.paymentMethods.list({
                    customer: customer.id,
                    type: 'card'
                  });
                  
                  if (paymentMethods.data.length > 0) {
                    cardFingerprint = paymentMethods.data[0].card?.fingerprint;
                    console.log('[WEBHOOK] ✅ Card fingerprint retrieved from payment method:', cardFingerprint);
                  }
                } catch (pmError) {
                  console.error('[WEBHOOK] Error fetching payment methods:', pmError.message);
                }
              }
              
              if (cardFingerprint) {
                const blockedCardKey = `blocked:card:${cardFingerprint}`;
                await kvSetWithRetry(blockedCardKey, {
                  fingerprint: cardFingerprint,
                  email: normalizedEmail,
                  customer_id: customer.id,
                  reason: 'First $49 payment failed',
                  blocked_at: new Date().toISOString(),
                  invoice_id: invoice.id
                });
                console.log('[WEBHOOK] 🚫 Card fingerprint blocked:', cardFingerprint);
              } else {
                console.log('[WEBHOOK] ⚠️  CANNOT BLOCK BY CARD - fingerprint unavailable');
              }
              
              // 2. Помечаем email как "failed_first_payment" (не полная блокировка, но флаг)
              customerData.failed_first_payment = true;
              customerData.failed_first_payment_at = new Date().toISOString();
              await kvSetWithRetry(customerKey, customerData);
              
              // 3. Блокируем IP если есть в metadata
              const ipAddress = customer.metadata?.ip_address;
              if (ipAddress && ipAddress !== 'unknown') {
                const blockedIpKey = `blocked:ip:${ipAddress}`;
                await kvSetWithRetry(blockedIpKey, {
                  ip: ipAddress,
                  email: normalizedEmail,
                  customer_id: customer.id,
                  reason: 'First $49 payment failed',
                  blocked_at: new Date().toISOString()
                });
                console.log('[WEBHOOK] 🚫 IP address blocked:', ipAddress);
              }
              
              console.log('[WEBHOOK] ✅ Fraudster blacklisted - card, email marked, IP blocked');
            }
          } else {
            console.log('[WEBHOOK] ⚠️  Customer not found in KV for failed payment (may be created later by subscription.created)');
          }
        }
      } catch (err) {
        console.error('[WEBHOOK] Error handling payment failure:', err.message);
      }
    }
  }

  // КРИТИЧНО: Обработка dispute/chargeback
  if (event.type === 'charge.dispute.created') {
    const dispute = event.data.object;
    console.log('[WEBHOOK] 🚨 DISPUTE CREATED:', dispute.id, 'Charge:', dispute.charge);
    
    try {
      const charge = await stripe.charges.retrieve(dispute.charge);
      const customer = charge.customer ? await stripe.customers.retrieve(charge.customer) : null;
      
      if (customer && customer.email) {
        const normalizedEmail = customer.email.toLowerCase().trim();
        const customerKey = `customer:email:${normalizedEmail}`;
        const customerData = await kvGetWithRetry(customerKey);
        
        if (customerData) {
          console.log('[WEBHOOK] ⚠️  DISPUTE - Marking customer and blocking future purchases');
          
          // ✅ P0: Monitor critical business event
          await logBusinessEvent(EVENT_TYPE.DISPUTE_CREATED, SEVERITY.CRITICAL, {
            email: normalizedEmail,
            customer_id: customer.id,
            dispute_id: dispute.id,
            amount: dispute.amount / 100,
            reason: dispute.reason,
          });
          
          // Помечаем customer как disputed
          customerData.disputed = true;
          customerData.dispute_created_at = new Date().toISOString();
          customerData.dispute_id = dispute.id;
          
          // Обнуляем квоту
          customerData.quota = {
            total: 0,
            used: customerData.quota?.used || 0,
            remaining: 0
          };
          
          // Отменяем подписку если активна
          if (customerData.subscription?.status === 'active' || customerData.subscription?.status === 'trialing') {
            customerData.subscription.status = 'disputed';
          }
          
          await kvSetWithRetry(customerKey, customerData);
          
          // Добавляем card fingerprint в blacklist если есть
          if (customer.metadata?.card_fingerprint) {
            console.log('[WEBHOOK] 🚫 Adding card to blacklist:', customer.metadata.card_fingerprint);
            // TODO: Автоматически добавлять в BLOCKED_CARD_FINGERPRINTS
          }
          
          console.log('[WEBHOOK] ✅ Dispute handled - customer blocked');
        }
      }
    } catch (err) {
      console.error('[WEBHOOK] Error handling dispute:', err.message);
    }
  }

  // ✅ НОВАЯ ЛОГИКА: Обработка dispute.closed (разблокировка если выиграли)
  if (event.type === 'charge.dispute.closed') {
    const dispute = event.data.object;
    console.log('[WEBHOOK] 🏁 DISPUTE CLOSED:', dispute.id, 'Status:', dispute.status);
    
    try {
      const charge = await stripe.charges.retrieve(dispute.charge);
      const customer = charge.customer ? await stripe.customers.retrieve(charge.customer) : null;
      
      if (customer && customer.email) {
        const normalizedEmail = customer.email.toLowerCase().trim();
        const customerKey = `customer:email:${normalizedEmail}`;
        const customerData = await kvGetWithRetry(customerKey);
        
        if (customerData && customerData.disputed) {
          if (dispute.status === 'won') {
            console.log('[WEBHOOK] ✅ DISPUTE WON - Unblocking customer');
            
            customerData.disputed = false;
            customerData.dispute_won_at = new Date().toISOString();
            
            // Восстанавливаем quota если подписка активна
            if (customerData.subscription?.status === 'active') {
              customerData.quota = {
                total: 2,
                used: 0,
                remaining: 2
              };
              console.log('[WEBHOOK] ✅ Quota restored to 2/2');
            }
            
            await kvSetWithRetry(customerKey, customerData);
            console.log('[WEBHOOK] ✅ Customer unblocked after winning dispute');
            
          } else if (dispute.status === 'lost') {
            console.log('[WEBHOOK] ❌ DISPUTE LOST - Customer remains blocked');
            customerData.dispute_lost_at = new Date().toISOString();
            await kvSetWithRetry(customerKey, customerData);
          }
        }
      }
    } catch (err) {
      console.error('[WEBHOOK] Error handling dispute closure:', err.message);
    }
  }

  return res.status(200).json({ received: true });
}

