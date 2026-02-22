import { kv } from '@vercel/kv';
import { checkRateLimit, sendRateLimitError } from './_lib/rate-limit.js';

// ✅ FINAL: KV retry logic
async function kvGetWithRetry(key, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await kv.get(key);
    } catch (error) {
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
      if (attempt === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 200 * (attempt + 1)));
    }
  }
}

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

  // ✅ FINAL: Rate limiting (защита от abuse)
  const rateLimitCheck = await checkRateLimit(req, 'read');
  if (!rateLimitCheck.success) {
    return sendRateLimitError(res, rateLimitCheck);
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const customerKey = `customer:email:${normalizedEmail}`;
    
    const customerData = await kvGetWithRetry(customerKey);

    if (!customerData) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Устанавливаем флаг
    customerData.first_report_viewed = true;
    customerData.first_report_viewed_at = new Date().toISOString();
    
    await kvSetWithRetry(customerKey, customerData);
    
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
