import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { vin, email } = req.query;
    
    if (!vin) {
      return res.status(400).json({ error: 'VIN required' });
    }

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const normalizedVin = vin.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const normalizedEmail = email.toLowerCase().trim();

    console.log('[GET-CACHED-REPORT] VIN:', normalizedVin, 'Email:', normalizedEmail);

    // 1. Проверяем права customer
    const customerKey = `customer:email:${normalizedEmail}`;
    const customerData = await kv.get(customerKey);

    if (!customerData) {
      return res.status(403).json({ error: 'Customer not found' });
    }

    // 2. Проверяем, покупал ли customer этот VIN
    const hasVin = customerData.reports?.some(r => r.vin === normalizedVin);

    if (!hasVin) {
      return res.status(403).json({ 
        error: 'VIN not purchased',
        message: 'You have not purchased this VIN report'
      });
    }

    // 3. Получаем отчет из кеша
    const reportKey = `report:cache:${normalizedVin}`;
    const cachedReport = await kv.get(reportKey);

    if (!cachedReport) {
      return res.status(404).json({ 
        error: 'Report not cached',
        message: 'Report cache expired. Please contact support.'
      });
    }

    console.log('[GET-CACHED-REPORT] ✅ Returning cached report (no API call)');

    return res.status(200).json({
      vin: normalizedVin,
      report: cachedReport.report_data,
      vehicle: cachedReport.vehicle,
      cached_at: cachedReport.cached_at,
      from_cache: true
    });

  } catch (error) {
    console.error('[GET-CACHED-REPORT] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
