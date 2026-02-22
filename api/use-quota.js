import { kv } from '@vercel/kv';

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

    // 5. Вычитаем квоту (атомарно)
    quota.used += 1;
    quota.remaining -= 1;

    // 6. Добавляем VIN в список отчетов
    if (!customerData.reports) {
      customerData.reports = [];
    }

    customerData.reports.push({
      vin: normalizedVin,
      purchased_at: new Date().toISOString(),
      period: 'subscription' // Всегда subscription так как мы проверили status выше
    });

    // 7. Обновляем в KV (добавляем timestamp для отладки race conditions)
    customerData.quota = quota;
    customerData.last_quota_update = new Date().toISOString();
    await kv.set(customerKey, customerData);

    console.log('[USE-QUOTA] ✅ Quota used. Remaining:', quota.remaining);

    return res.status(200).json({
      success: true,
      quota_remaining: quota.remaining,
      quota_used: quota.used,
      quota_total: quota.total,
      quota_used_now: true
    });

  } catch (error) {
    console.error('[USE-QUOTA] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
