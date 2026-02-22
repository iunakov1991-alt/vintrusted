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

    // 2. Проверяем квоту
    const quota = customerData.quota || { total: 0, used: 0, remaining: 0 };

    if (quota.remaining <= 0) {
      console.log('[USE-QUOTA] ❌ No quota remaining');
      return res.status(403).json({ 
        error: 'No quota remaining',
        message: 'You have used all reports for this billing period'
      });
    }

    // 3. Проверяем, не покупал ли уже этот VIN
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

    // 4. Вычитаем квоту
    quota.used += 1;
    quota.remaining -= 1;

    // 5. Добавляем VIN в список отчетов
    if (!customerData.reports) {
      customerData.reports = [];
    }

    customerData.reports.push({
      vin: normalizedVin,
      purchased_at: new Date().toISOString(),
      period: customerData.subscription?.status === 'active' ? 'subscription' : 'trial'
    });

    // 6. Обновляем в KV
    customerData.quota = quota;
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
