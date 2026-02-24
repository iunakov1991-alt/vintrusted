import { kv } from '@vercel/kv';

/**
 * Pre-log lead source before payment
 * This creates a backup record we can use if Stripe metadata is incomplete
 */
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      vin,
      gclid,
      gclid_source,
      utm_source,
      utm_medium,
      utm_campaign,
      ab_variant,
      is_google_ads,
      timestamp
    } = req.body;

    if (!vin) {
      return res.status(400).json({ error: 'VIN required' });
    }

    // Get IP
    const ip_address = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                       req.headers['x-real-ip'] || 
                       'unknown';

    // Create lead source record
    const leadSource = {
      vin: vin.toUpperCase(),
      gclid: gclid || null,
      gclid_source: gclid_source || null,
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
      ab_variant: ab_variant || 'unknown',
      is_google_ads: is_google_ads || false,
      ip_address,
      timestamp: timestamp || Date.now(),
      logged_at: Date.now(),
      user_agent: req.headers['user-agent'] || 'unknown'
    };

    // Save to KV with 30-day TTL
    const key = `lead_source:${vin.toUpperCase()}:${Date.now()}`;
    await kv.set(key, leadSource);
    await kv.expire(key, 30 * 24 * 60 * 60); // 30 days

    // Also save by VIN (latest only)
    const vinKey = `lead_source:latest:${vin.toUpperCase()}`;
    await kv.set(vinKey, leadSource);
    await kv.expire(vinKey, 7 * 24 * 60 * 60); // 7 days

    console.log('✅ Lead source logged:', {
      vin: vin.toUpperCase(),
      gclid: gclid ? `${gclid.substring(0, 10)}...` : 'none',
      source: utm_source || 'none',
      is_google_ads
    });

    return res.status(200).json({
      success: true,
      message: 'Lead source logged',
      is_google_ads: leadSource.is_google_ads
    });

  } catch (error) {
    console.error('❌ Error logging lead source:', error);
    return res.status(500).json({
      error: 'Failed to log lead source',
      message: error.message
    });
  }
}
