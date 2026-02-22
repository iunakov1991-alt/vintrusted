import { kv } from '@vercel/kv';

/**
 * Устанавливает флаг first_report_viewed в KV
 * Вызывается при первом просмотре отчета
 */
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

    // Устанавливаем флаг
    customerData.first_report_viewed = true;
    customerData.first_report_viewed_at = new Date().toISOString();
    
    await kv.set(customerKey, customerData);
    
    console.log('[MARK-VIEWED] ✅ First report viewed flag set for:', normalizedEmail);

    return res.status(200).json({ 
      success: true,
      first_report_viewed: true 
    });

  } catch (error) {
    console.error('[MARK-VIEWED] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
