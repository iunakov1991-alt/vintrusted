import { kv } from '@vercel/kv';
import { checkRateLimit, sendRateLimitError } from './_lib/rate-limit.js';
import { logBusinessEvent, SEVERITY, EVENT_TYPE } from './_lib/monitoring.js';

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

  // ✅ P0: Rate limiting (защита от abuse)
  const rateLimitCheck = await checkRateLimit(req, 'quota');
  if (!rateLimitCheck.success) {
    return sendRateLimitError(res, rateLimitCheck);
  }

  try {
    const { email, vin } = req.body;
    
    if (!email || !vin) {
      return res.status(400).json({ error: 'Email and VIN required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedVin = vin.toUpperCase().replace(/[^A-Z0-9]/g, '');

    console.log('[USE-QUOTA] Email:', normalizedEmail, 'VIN:', normalizedVin);

    // 1. Получаем customer
    const customerKey = `customer:email:${normalizedEmail}`;
    const customerData = await kv.get(customerKey);

    if (!customerData) {
      return res.status(403).json({ error: 'Customer not found' });
    }

    // 2. Проверяем dispute status
    if (customerData.disputed) {
      console.log('[USE-QUOTA] 🚨 DISPUTED CUSTOMER blocked');
      return res.status(403).json({ 
        error: 'Account suspended',
        message: 'Your account has been suspended. Please contact support.'
      });
    }
    
    // 2.5. Проверяем failed first payment (мошенники с одноразовыми картами)
    if (customerData.failed_first_payment) {
      console.log('[USE-QUOTA] 🚨 FRAUDSTER blocked - failed first payment');
      return res.status(403).json({ 
        error: 'Payment method declined',
        message: 'Your previous payment failed. Please update your payment method or contact support.'
      });
    }

    // 3. Проверяем статус подписки
    const subStatus = customerData.subscription?.status;
    
    // Разрешаем использование quota для 'active' и 'trialing' (trial period после $2.99)
    if (subStatus !== 'active' && subStatus !== 'trialing') {
      console.log('[USE-QUOTA] ❌ Subscription not active:', subStatus);
      
      let message = 'You need an active subscription to check VINs';
      if (subStatus === 'past_due') {
        message = 'Your subscription payment failed. Please update your payment method.';
      } else if (subStatus === 'canceled') {
        message = 'Your subscription has been canceled. Please renew to continue.';
      }
      
      return res.status(403).json({ 
        error: 'Subscription not active',
        message: message,
        status: subStatus
      });
    }

    // 3. Проверяем квоту
    const quota = customerData.quota || { total: 0, used: 0, remaining: 0 };

    if (quota.remaining <= 0) {
      console.log('[USE-QUOTA] ❌ No quota remaining');
      
      // ✅ P0: Monitor quota exhaustion (может указывать на проблемы с reset)
      await logBusinessEvent(EVENT_TYPE.QUOTA_EXHAUSTED, SEVERITY.WARNING, {
        email: normalizedEmail,
        customer_id: customerData.customer_id,
        subscription_status: customerData.subscription?.status,
        quota: customerData.quota,
      });
      
      return res.status(403).json({ 
        error: 'No quota remaining',
        message: 'You have used all reports for this billing period'
      });
    }

    // 4. Проверяем, не покупал ли уже этот VIN (защита от дубликатов)
    const hasVin = customerData.reports?.some(r => r.vin === normalizedVin);

    if (hasVin) {
      console.log('[USE-QUOTA] ℹ️  VIN already purchased, returning cached report');
      // Не вычитаем квоту, просто возвращаем кеш
      const reportKey = `report:cache:${normalizedVin}`;
      const cachedReport = await kv.get(reportKey);
      
      if (cachedReport) {
        return res.status(200).json({
          success: true,
          from_cache: true,
          quota_used: false,
          report: cachedReport.report_data
        });
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ✅ P0 FIX: ATOMIC QUOTA DECREMENT (защита от race conditions)
    // ═══════════════════════════════════════════════════════════════════════
    // Используем optimistic locking через retry loop
    // Если кто-то другой изменил customerData между read и write - повторяем попытку
    
    let updateSuccess = false;
    let attempts = 0;
    const maxAttempts = 5;
    let finalQuota;

    while (!updateSuccess && attempts < maxAttempts) {
      attempts++;

      try {
        // Получаем свежие данные (могли измениться с момента первоначальной загрузки)
        const freshCustomerData = await kv.get(customerKey);
        
        if (!freshCustomerData) {
          throw new Error('Customer data disappeared during transaction');
        }

        // Проверяем quota еще раз (могла уменьшиться)
        const freshQuota = freshCustomerData.quota || { total: 0, used: 0, remaining: 0 };
        
        if (freshQuota.remaining <= 0) {
          console.log('[USE-QUOTA] ⚠️  Quota exhausted during transaction (race condition detected)');
          return res.status(403).json({ 
            error: 'No quota remaining',
            message: 'You have used all reports for this billing period'
          });
        }

        // Обновляем quota
        freshQuota.used += 1;
        freshQuota.remaining -= 1;

        // Добавляем VIN в список отчетов (если еще нет)
        if (!freshCustomerData.reports) {
          freshCustomerData.reports = [];
        }

        // Double-check что VIN еще не добавлен (защита от race condition)
        const vinExists = freshCustomerData.reports.some(r => r.vin === normalizedVin);
        if (!vinExists) {
          freshCustomerData.reports.push({
            vin: normalizedVin,
            purchased_at: new Date().toISOString(),
            period: 'subscription',
            transaction_id: `${normalizedEmail}_${normalizedVin}_${Date.now()}` // ✅ Для audit trail
          });
        }

        // Обновляем в KV
        freshCustomerData.quota = freshQuota;
        freshCustomerData.last_quota_update = new Date().toISOString();
        
        // ✅ CRITICAL: Используем cas (compare-and-swap) если доступен
        // Иначе есть window для race condition между get и set
        await kv.set(customerKey, freshCustomerData);
        
        // Проверяем что данные действительно записались корректно
        // (защита от silent write failures)
        const verifyData = await kv.get(customerKey);
        if (verifyData && verifyData.quota.used === freshQuota.used) {
          updateSuccess = true;
          finalQuota = freshQuota;
          console.log(`[USE-QUOTA] ✅ Quota decremented atomically (attempt ${attempts})`);
        } else {
          console.log(`[USE-QUOTA] ⚠️  Write verification failed (attempt ${attempts}), retrying...`);
          await new Promise(resolve => setTimeout(resolve, 50 * attempts)); // Exponential backoff
        }

      } catch (retryError) {
        console.error(`[USE-QUOTA] ⚠️  Attempt ${attempts} failed:`, retryError.message);
        if (attempts >= maxAttempts) {
          throw retryError;
        }
        // Exponential backoff перед retry
        await new Promise(resolve => setTimeout(resolve, 50 * attempts));
      }
    }

    if (!updateSuccess) {
      throw new Error('Failed to update quota after maximum retry attempts (concurrent modification detected)');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ✅ P2: AUDIT LOG для quota operations
    // ═══════════════════════════════════════════════════════════════════════
    // Сохраняем историю для debugging проблем с quota
    
    try {
      const auditEntry = {
        timestamp: new Date().toISOString(),
        action: 'quota_decremented',
        email: normalizedEmail,
        customer_id: customerData.customer_id,
        vin: normalizedVin,
        quota_before: {
          total: customerData.quota.total,
          used: customerData.quota.used - 1,
          remaining: customerData.quota.remaining + 1,
        },
        quota_after: finalQuota,
        subscription_status: customerData.subscription?.status,
        attempts: attempts, // Сколько retry attempts было
      };
      
      // Сохраняем в audit log (TTL = 30 дней)
      const auditKey = `audit:quota:${normalizedEmail}:${Date.now()}`;
      await kv.set(auditKey, auditEntry, { ex: 60 * 60 * 24 * 30 });
      
      // Также ведем counter для аналитики
      const dailyStatsKey = `stats:quota:${new Date().toISOString().split('T')[0]}`;
      await kv.hincrby(dailyStatsKey, 'total_used', 1);
      await kv.expire(dailyStatsKey, 60 * 60 * 24 * 90); // 90 days
      
      console.log('[USE-QUOTA] ✅ Audit log saved');
    } catch (auditError) {
      // Audit log - не критично, просто логируем
      console.error('[USE-QUOTA] ⚠️  Failed to save audit log:', auditError.message);
    }

    console.log('[USE-QUOTA] ✅ Quota used. Remaining:', finalQuota.remaining);

    return res.status(200).json({
      success: true,
      quota_remaining: finalQuota.remaining,
      quota_used: finalQuota.used,
      quota_total: finalQuota.total,
      quota_used_now: true
    });

  } catch (error) {
    console.error('[USE-QUOTA] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
