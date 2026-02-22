import Stripe from 'stripe';
import { kv } from '@vercel/kv';
import { checkRateLimit, sendRateLimitError } from './_lib/rate-limit.js';
import { isDisposableEmailWithWhitelist } from './_lib/disposable-emails.js';
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
  
  // ✅ P0: Rate limiting (защита от card testing/carding)
  const rateLimitCheck = await checkRateLimit(req, 'checkout');
  if (!rateLimitCheck.success) {
    return sendRateLimitError(res, rateLimitCheck);
  }
  
  console.log('Checkout request:', req.body);
  
  try {
    const { setup_intent_id, email, vin } = req.body || {};
    if (!setup_intent_id) throw new Error('setup_intent_id is required');
    
    // ✅ КРИТИЧНО: Проверяем env variables ДО создания customer
    const priceEvery33D = process.env.PRICE_49_EVERY_33D?.trim();
    if (!priceEvery33D) {
      console.error('[CHECKOUT] ❌ PRICE_49_EVERY_33D not configured');
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'Subscription price not configured. Please contact support.'
      });
    }
    
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('[CHECKOUT] ❌ STRIPE_SECRET_KEY not configured');
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'Payment system not configured. Please contact support.'
      });
    }

    // ┌─────────────────────────────────────────────────────────────┐
    // │ ПЕРВИЧНАЯ ПРОВЕРКА: Disposable email & существующий customer│
    // │ КРИТИЧНО: Блокируем ДО всех Stripe API calls               │
    // └─────────────────────────────────────────────────────────────┘
    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      
      // ✅ P2: Block disposable emails
      const disposableCheck = isDisposableEmailWithWhitelist(normalizedEmail);
      if (disposableCheck.isDisposable) {
        console.log('[ANTI-FRAUD] 🚫 DISPOSABLE EMAIL BLOCKED:', {
          email: normalizedEmail.substring(0, 20) + '...',
          reason: disposableCheck.reason,
          domain: disposableCheck.domain,
        });
        
        return res.status(403).json({ 
          error: 'Invalid email address',
          message: 'Temporary or disposable email addresses are not allowed. Please use a permanent email address.',
        });
      }
      
      console.log('[ANTI-FRAUD] 🔍 Checking for existing customer by email (BEFORE Stripe calls)...');
      const customerKey = `customer:email:${normalizedEmail}`;
      const existingCustomer = await kv.get(customerKey);
      
      if (existingCustomer) {
        console.log('[ANTI-FRAUD] 🚫 EXISTING CUSTOMER BLOCKED FROM TRIAL');
        console.log('[ANTI-FRAUD] Customer:', existingCustomer.customer_id, 'Status:', existingCustomer.subscription?.status);
        
        // Блокируем disputed customers
        if (existingCustomer.disputed) {
          return res.status(403).json({ 
            error: 'Account suspended',
            message: 'Your account has been suspended due to a payment dispute. Please contact support.'
          });
        }
        
        // КРИТИЧНО: Блокируем мошенников у которых failed первый $49 платеж
        if (existingCustomer.failed_first_payment) {
          console.log('[ANTI-FRAUD] 🚨 FRAUDSTER DETECTED - Failed first $49 payment');
          return res.status(403).json({ 
            error: 'Payment method declined',
            message: 'Your previous payment failed. Please update your payment method or contact support.',
            redirect_to: `/my-reports.html?email=${encodeURIComponent(normalizedEmail)}`
          });
        }
        
        // Блокируем ЛЮБОГО existing customer от $2.99 trial (даже canceled)
        return res.status(403).json({ 
          error: 'Trial not available for existing customers',
          message: 'The $2.99 trial is only for new customers. Please renew your subscription from your account page for $49.',
          redirect_to: `/my-reports.html?email=${encodeURIComponent(normalizedEmail)}`
        });
      }
      
      console.log('[ANTI-FRAUD] ✅ New customer - proceeding with Stripe checks');
    }

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
    
    // 1. Проверка заблокированных IP (статический список)
    if (ipAddress && ipAddress !== 'unknown' && BLOCKED_IP_ADDRESSES.includes(ipAddress)) {
      console.log('[ANTI-FRAUD] 🚫 BLOCKED IP DETECTED (static list):', ipAddress);
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'This request has been blocked. Please contact support if you believe this is an error.'
      });
    }
    
    // 2. Проверка заблокированных IP (динамический KV blacklist)
    if (ipAddress && ipAddress !== 'unknown') {
      const blockedIpKey = `blocked:ip:${ipAddress}`;
      const blockedIpData = await kv.get(blockedIpKey);
      if (blockedIpData) {
        console.log('[ANTI-FRAUD] 🚫 BLOCKED IP DETECTED (KV blacklist):', ipAddress, 'Reason:', blockedIpData.reason);
        return res.status(403).json({ 
          error: 'Access denied',
          message: 'This request has been blocked. Please contact support if you believe this is an error.'
        });
      }
    }
    
    // 3. Проверка заблокированных карт (статический список)
    if (cardFingerprint && BLOCKED_CARD_FINGERPRINTS.includes(cardFingerprint)) {
      console.log('[ANTI-FRAUD] 🚫 BLOCKED CARD DETECTED (static list):', cardFingerprint);
      return res.status(403).json({ 
        error: 'Payment method blocked',
        message: 'This payment method cannot be used. Please contact support.'
      });
    }
    
    // 4. Проверка заблокированных карт (динамический KV blacklist)
    if (cardFingerprint) {
      const blockedCardKey = `blocked:card:${cardFingerprint}`;
      const blockedCardData = await kv.get(blockedCardKey);
      if (blockedCardData) {
        console.log('[ANTI-FRAUD] 🚫 BLOCKED CARD DETECTED (KV blacklist):', cardFingerprint, 'Reason:', blockedCardData.reason);
        return res.status(403).json({ 
          error: 'Payment method blocked',
          message: 'This payment method cannot be used. Please contact support.'
        });
      }
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
      
      // Фильтруем - исключаем customers с тем же email (renewal разрешен)
      const normalizedEmail = email ? email.toLowerCase().trim() : null;
      const otherCustomersWithCard = existingCustomers.data.filter(c => {
        return c.email && c.email.toLowerCase().trim() !== normalizedEmail;
      });
      
      // Если нашли customers с ДРУГИМ email - блокируем
      if (otherCustomersWithCard.length > 0) {
        console.log('[ANTI-FRAUD] 🚫 DUPLICATE PURCHASE - Card used by different email');
        console.log('[ANTI-FRAUD] Other customers:', otherCustomersWithCard.map(c => `${c.id} (${c.email})`));
        
        return res.status(403).json({ 
          error: 'Duplicate purchase',
          message: 'This payment method has already been used to purchase a report. Each card can only be used once.'
        });
      }
      
      console.log('[ANTI-FRAUD] ✅ Card OK (same user renewal or first purchase)');
    }
    
    // Email check уже выполнен в начале функции (до Stripe API calls)
    
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
    
    // 2.5) Определяем tier для Google Ads конверсии (сохраним в KV для отправки при клике на кнопку)
    let tierData = { tier: 'medium', value: 5.00 }; // Default
    try {
      const outcome = pi.charges?.data[0]?.outcome;
      const card = pm.card;
      
      if (pm.type === 'link') {
        tierData = { tier: 'premium', value: 25.00 };
        console.log('[CHECKOUT] 🔗 Stripe Link payment → PREMIUM tier');
      } else if (card) {
        // Fraud tier
        if (outcome?.risk_level === 'highest' || card.checks?.cvc_check === 'fail') {
          tierData = { tier: 'fraud', value: 0.00 };
          console.log('[CHECKOUT] 🚨 Fraud detected → FRAUD tier');
        }
        // Premium tier
        else if ((card.funding === 'credit' || card.funding === 'debit') && card.checks?.cvc_check === 'pass') {
          tierData = { tier: 'premium', value: 25.00 };
          console.log('[CHECKOUT] 🟢 Credit/Debit + CVC pass → PREMIUM tier');
        }
        // Medium tier (default)
        else {
          tierData = { tier: 'medium', value: 5.00 };
          console.log('[CHECKOUT] 🟡 Prepaid or no CVC → MEDIUM tier');
        }
      }
    } catch (tierError) {
      console.error('[CHECKOUT] ⚠️  Error determining tier:', tierError.message);
      // Keep default medium tier
    }
    console.log('[CHECKOUT] ✅ Tier determined:', tierData);

    // 3) План: $49 каждые 33 дня бесконечно (начинается на день 3)
    let schedule = null;
    // ✅ priceEvery33D уже проверен в начале функции
    
    console.log('[CHECKOUT] Price ID for subscription:', priceEvery33D);
    
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
        // ✅ КРИТИЧНО: Если subscription НЕ создался - это серьезная ошибка
        // Пользователь заплатил $2.99 но НЕ получит recurring subscription
        throw new Error('Failed to create subscription: ' + scheduleError.message);
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
            status: 'trialing', // ✅ ИСПРАВЛЕНИЕ: 'trialing' вместо 'active' до активации schedule
            start_date: schedule ? new Date(startTimestamp * 1000).toISOString() : null,
            end_date: schedule ? new Date(endTimestamp * 1000).toISOString() : null
          },
          quota: {
            total: 1,  // ✅ ИСПРАВЛЕНО: Trial period = только 1 отчет за $2.99
            used: finalVin ? 1 : 0, // Используем квоту только если VIN передан
            remaining: finalVin ? 0 : 1  // ✅ ИСПРАВЛЕНО: 0 если VIN использован
          },
          reports: finalVin ? [{
            vin: finalVin.toUpperCase().replace(/[^A-Z0-9]/g, ''), // ✅ Полная normalization
            purchased_at: new Date().toISOString(),
            vehicle_name: '',
            period: 'trial'
          }] : [],
          // ✅ Сохраняем tier для отправки Google Ads конверсии при клике на кнопку
          tier: tierData.tier, // 'premium', 'medium', или 'fraud'
          tier_value: tierData.value, // 25.00, 5.00, или 0.00
          tier_determined_at: new Date().toISOString(),
          // ✅ Флаг для определения первого визита (защита от дублей конверсий)
          first_report_viewed: false,
          first_report_viewed_at: null
        };
        
        // ✅ КРИТИЧНО: KV save с retry logic (3 попытки)
        let kvSaved = false;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            await kv.set(customerKey, customerRecord);
            console.log('[CHECKOUT] ✅ Customer saved to KV:', customerKey, `(attempt ${attempt + 1})`);
            kvSaved = true;
            break;
          } catch (kvRetryError) {
            console.error(`[CHECKOUT] ⚠️  KV save attempt ${attempt + 1} failed:`, kvRetryError.message);
            if (attempt < 2) {
              // Wait before retry: 200ms, 500ms
              await new Promise(resolve => setTimeout(resolve, 200 * (attempt + 1)));
            }
          }
        }
        
        if (!kvSaved) {
          console.error('[CHECKOUT] ❌ CRITICAL: Could not save customer record to KV after 3 attempts');
          console.error('[CHECKOUT] ⚠️  Webhook will create KV record on first payment, but tier data may be lost');
          // Продолжаем - PaymentIntent создан, webhook восстановит базовые данные
          // НО: tier_value может быть потерян (webhook не знает tier)
        }
        
        // Примечание: Report cache будет создан после получения реальных данных из ClearVin API
        // Не создаем placeholder cache с null данными
      } catch (kvError) {
        console.error('[CHECKOUT] ⚠️  Failed to save to KV:', kvError.message);
        // Webhook создаст запись
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
    if (email) {
      params.append('email', email); // ✅ Передаем email для редиректа на my-reports.html
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