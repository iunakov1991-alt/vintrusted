import Stripe from 'stripe';
import { kv } from '@vercel/kv';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ┌─────────────────────────────────────────────────────────────┐
// │ БЛОКИРОВКА МОШЕННИКОВ ПО FINGERPRINT КАРТЫ И IP              │
// └─────────────────────────────────────────────────────────────┘
// Добавь сюда fingerprint заблокированных карт (из Stripe Dashboard)
const BLOCKED_CARD_FINGERPRINTS = [
  'fSld43eVZnTFqUDo', // Террорист с 8 покупками
  'zwYHnaH0E2dRrT9B', // tomiboss@icloud.com - ban новые покупки (подписка активна, пусть платит)
];

// Заблокированные IP-адреса (добавляй IP мошенников сюда)
const BLOCKED_IP_ADDRESSES = [
  // IP будут добавляться автоматически при обнаружении
];

// ВНИМАНИЕ: предполагается, что PRICE_49_EVERY_33D указывает на price с interval=day, interval_count=33
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  console.log('Checkout request:', req.body);
  
  try {
    const { setup_intent_id, email, vin } = req.body || {};
    if (!setup_intent_id) throw new Error('setup_intent_id is required');

    console.log('Retrieving SetupIntent:', setup_intent_id);
    const si = await stripe.setupIntents.retrieve(setup_intent_id);
    if (!si || !si.payment_method) throw new Error('SetupIntent has no payment_method');
    console.log('SetupIntent OK, payment_method:', si.payment_method);

    // ┌─────────────────────────────────────────────────────────────┐
    // │ ПРОВЕРКА БЛОКИРОВКИ КАРТЫ И IP                               │
    // └─────────────────────────────────────────────────────────────┘
    const pm = await stripe.paymentMethods.retrieve(si.payment_method);
    const cardFingerprint = pm.card?.fingerprint;
    
    // Получаем IP из metadata SetupIntent (сохранен в create-setup-intent.js)
    const ipAddress = si.metadata?.ip_address || 'unknown';
    
    console.log('[ANTI-FRAUD] Card fingerprint:', cardFingerprint);
    console.log('[ANTI-FRAUD] IP address:', ipAddress);
    
    // 1. Проверка заблокированных IP
    if (ipAddress && ipAddress !== 'unknown' && BLOCKED_IP_ADDRESSES.includes(ipAddress)) {
      console.log('[ANTI-FRAUD] 🚫 BLOCKED IP DETECTED:', ipAddress);
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'This request has been blocked. Please contact support if you believe this is an error.'
      });
    }
    
    // 2. Проверка заблокированных карт
    if (cardFingerprint && BLOCKED_CARD_FINGERPRINTS.includes(cardFingerprint)) {
      console.log('[ANTI-FRAUD] 🚫 BLOCKED CARD DETECTED:', cardFingerprint);
      return res.status(403).json({ 
        error: 'Payment method blocked',
        message: 'This payment method cannot be used. Please contact support.'
      });
    }
    
    // 3. Проверка "1 карта = 1 отчет" - ищем предыдущие успешные платежи с этой карты
    if (cardFingerprint) {
      console.log('[ANTI-FRAUD] Checking for previous purchases with this card...');
      
      // Ищем всех customers с этой картой
      const existingCustomers = await stripe.customers.search({
        query: `metadata['card_fingerprint']:'${cardFingerprint}'`,
        limit: 10
      });
      
      console.log('[ANTI-FRAUD] Found customers with this card:', existingCustomers.data.length);
      
      // Если нашли хотя бы одного - карта уже использовалась
      if (existingCustomers.data.length > 0) {
        console.log('[ANTI-FRAUD] 🚫 DUPLICATE PURCHASE ATTEMPT - Card already used');
        console.log('[ANTI-FRAUD] Previous customers:', existingCustomers.data.map(c => c.id));
        
        return res.status(403).json({ 
          error: 'Duplicate purchase',
          message: 'This payment method has already been used to purchase a report. Each card can only be used once.'
        });
      }
      
      console.log('[ANTI-FRAUD] ✅ First purchase with this card');
    }
    
    // 4. Проверка существующего customer по email (защита от повторного trial)
    if (email) {
      console.log('[ANTI-FRAUD] Checking for existing customer by email...');
      const normalizedEmail = email.toLowerCase().trim();
      const customerKey = `customer:email:${normalizedEmail}`;
      const existingCustomer = await kv.get(customerKey);
      
      if (existingCustomer) {
        console.log('[ANTI-FRAUD] ⚠️  Customer exists in KV:', existingCustomer.customer_id);
        console.log('[ANTI-FRAUD] Previous subscription status:', existingCustomer.subscription?.status);
        console.log('[ANTI-FRAUD] Quota remaining:', existingCustomer.quota?.remaining);
        
        // Если подписка активна И есть квота - блокируем (не нужен renewal)
        if (existingCustomer.subscription?.status === 'active' && existingCustomer.quota?.remaining > 0) {
          console.log('[ANTI-FRAUD] 🚫 ACTIVE SUBSCRIPTION WITH QUOTA - No renewal needed');
          return res.status(403).json({ 
            error: 'Active subscription exists',
            message: 'You already have an active subscription with available reports. Please use your account page.'
          });
        }
        
        // Если подписка отменена ИЛИ квота исчерпана - позволяем renewal
        console.log('[ANTI-FRAUD] ℹ️  Allowing renewal (canceled subscription or quota exhausted)');
      }
    }
    
    console.log('[ANTI-FRAUD] ✅ Card is not blocked');

    // 1) Customer с привязанным PM
    // Копируем metadata из SetupIntent в Customer для future charges
    // + сохраняем card_fingerprint для защиты от повторных покупок
    const customerMetadata = {
      ...(si.metadata || {}), // ✅ Копируем metadata (gclid, utm_*, etc.)
      card_fingerprint: cardFingerprint || 'unknown' // ✅ Сохраняем fingerprint для проверки дубликатов
    };
    
    const customer = await stripe.customers.create({
      email: email || undefined,
      payment_method: si.payment_method,
      invoice_settings: { default_payment_method: si.payment_method },
      metadata: customerMetadata
    });
    console.log('[CHECKOUT] Customer created with metadata:', customer.metadata);

    // ВАЖНО: Обновляем SetupIntent с customer ID для verify-payment
    // Обернуто в try-catch, так как SetupIntent может быть уже succeeded
    try {
    await stripe.setupIntents.update(setup_intent_id, {
      customer: customer.id
    });
    console.log('[CHECKOUT] SetupIntent updated with customer:', customer.id);
    } catch (updateError) {
      console.log('[CHECKOUT] ⚠️  Could not update SetupIntent (already succeeded):', updateError.message);
      // Это не критично - customer уже создан
    }

    // 2) Снимаем $2.99 сразу
    // КРИТИЧНО: копируем metadata из SetupIntent (включая gclid для Google Ads конверсий)
    console.log('[CHECKOUT] SetupIntent metadata:', si.metadata);
    const pi = await stripe.paymentIntents.create({
      amount: 299,
      currency: 'usd',
      customer: customer.id,
      payment_method: si.payment_method,
      confirm: true,
      off_session: true,
      statement_descriptor_suffix: 'VIN Report',
      description: 'VIN Report $2.99',
      metadata: si.metadata || {} // ✅ Копируем все metadata (gclid, utm_*, ab_variant, vin)
    });
    console.log('[CHECKOUT] PaymentIntent created with metadata:', pi.metadata);

    // 3) План: $49 каждые 33 дня бесконечно (начинается на день 3)
    let schedule = null;
    const priceEvery33D = process.env.PRICE_49_EVERY_33D;
    
    if (priceEvery33D) {
      try {
        const startAt = Math.floor(Date.now() / 1000) + 3 * 86400; // +3 дня от сегодня
        
        schedule = await stripe.subscriptionSchedules.create({
          customer: customer.id,
          start_date: startAt,
          end_behavior: 'release', // ✅ Подписка продолжается бесконечно
          metadata: si.metadata || {}, // ✅ Копируем metadata (gclid, utm_*, etc.)
          phases: [
            {
              // ФАЗА 1: $49 каждые 33 дня бесконечно (дни 3, 36, 69, 102...)
              // iterations не указываем → бесконечно
              default_payment_method: si.payment_method,
              collection_method: 'charge_automatically',
              proration_behavior: 'none',
              items: [{ price: priceEvery33D }],
              metadata: si.metadata || {} // ✅ Metadata для подписки
            }
          ]
        });
        console.log('[CHECKOUT] ✅ Subscription schedule created:', schedule.id);
        console.log('[CHECKOUT] $49 every 33 days starting on day 3');
      } catch (scheduleError) {
        console.error('[CHECKOUT] ❌ Failed to create subscription schedule:', scheduleError.message);
        // Продолжаем выполнение, даже если подписка не создалась
      }
    } else {
      console.log('[CHECKOUT] ⚠️  Missing PRICE_49_EVERY_33D, skipping subscription schedule');
    }

    // Get VIN from request body, SetupIntent metadata, or customer metadata
    let finalVin = vin || si.metadata?.vin || '';
    
    // If we have a customer, try to get VIN from customer metadata
    if (!finalVin && customer) {
      finalVin = customer.metadata?.vin || '';
    }
    
    // 4) SAVE TO VERCEL KV
    if (email && customer.id) {
      try {
        console.log('[CHECKOUT] 💾 Saving customer to KV...');
        
        const normalizedEmail = email.toLowerCase().trim();
        const customerKey = `customer:email:${normalizedEmail}`;
        
        // Создаем или обновляем customer record
        const startTimestamp = Math.floor(Date.now() / 1000) + 3 * 86400; // День 3
        const endTimestamp = startTimestamp + 33 * 86400; // + 33 дня
        
        const customerRecord = {
          customer_id: customer.id,
          email: normalizedEmail,
          created_at: new Date().toISOString(),
          subscription: {
            subscription_schedule_id: schedule?.id || null,
            subscription_id: null,
            status: 'active',
            start_date: schedule ? new Date(startTimestamp * 1000).toISOString() : null,
            end_date: schedule ? new Date(endTimestamp * 1000).toISOString() : null
          },
          quota: {
            total: 2,
            used: finalVin ? 1 : 0, // Используем квоту только если VIN передан
            remaining: finalVin ? 1 : 2
          },
          reports: finalVin ? [{
            vin: finalVin.toUpperCase(),
            purchased_at: new Date().toISOString(),
            vehicle_name: '',
            period: 'trial'
          }] : []
        };
        
        await kv.set(customerKey, customerRecord);
        console.log('[CHECKOUT] ✅ Customer saved to KV:', customerKey);
        
        // Примечание: Report cache будет создан после получения реальных данных из ClearVin API
        // Не создаем placeholder cache с null данными
      } catch (kvError) {
        console.error('[CHECKOUT] ⚠️  Failed to save to KV:', kvError.message);
      }
    }
    
    // 5) Отправить отчет ClearVin на email (если есть email и VIN)
    if (email && finalVin) {
      try {
        console.log('Sending ClearVin report to:', email, 'for VIN:', finalVin);
        
        // Вызываем API для отправки отчета
        const reportResponse = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://vintrusted.com'}/api/send-clearvin-report`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email,
            vin: finalVin
          })
        });
        
        if (reportResponse.ok) {
          console.log('ClearVin report sent successfully');
        } else {
          const errorData = await reportResponse.json();
          console.error('Failed to send ClearVin report:', errorData);
        }
      } catch (reportError) {
        console.error('Error sending ClearVin report:', reportError.message);
        // Продолжаем выполнение, даже если отчет не отправился
      }
    } else {
      console.log('Skipping ClearVin report - missing email or VIN');
    }
    
    // Build success URL with VIN - redirect to purchase confirmation page first (for PRIMARY conversion)
    const baseUrl = process.env.APP_URL || process.env.RETURN_URL?.replace('/success.html', '').replace('/payment-success', '') || 'https://vintrusted.com';
    let successUrl = `${baseUrl}/purchase-confirmation.html`;
    
    const params = new URLSearchParams();
    if (finalVin) {
      params.append('vin', finalVin);
    }
    if (si.id) {
      params.append('setup_intent', si.id);
    }
    
    if (params.toString()) {
      successUrl += '?' + params.toString();
    }
    
    // Если $2.99 потребовал доп. действия (редко), вернём клиентский secret для confirmCardPayment
    const payload = { success: true, success_url: successUrl };
    if (pi.status === 'requires_action' || pi.status === 'requires_confirmation') {
      payload.next_action = true;
      payload.client_secret = pi.client_secret;
    }

    console.log('Checkout success!');
    res.status(200).json(payload);
  } catch (e) {
    console.error('Checkout error:', e.message, e.type, e.code);
    res.status(400).json({ error: e.message, type: e.type, code: e.code });
  }
}