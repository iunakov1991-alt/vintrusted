import Stripe from 'stripe';
import { checkRateLimit, sendRateLimitError } from './_lib/rate-limit.js';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Parse cookies from request headers
function parseCookies(req) {
  const cookieHeader = req.headers?.cookie || '';
  const cookies = {};
  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.split('=');
    const value = rest.join('=').trim();
    if (name) {
      cookies[name.trim()] = decodeURIComponent(value);
    }
  });
  return cookies;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  // ✅ FINAL: Rate limiting (защита от card testing)
  const rateLimitCheck = await checkRateLimit(req, 'checkout');
  if (!rateLimitCheck.success) {
    return sendRateLimitError(res, rateLimitCheck);
  }
  
  try {
    const { 
      vin,
      ab_variant,
      utm_source,
      utm_medium,
      utm_campaign,
      gclid: gclidFromBody,
      gclid_source,
      is_google_ads
    } = req.body || {};
    
    // Get gclid from multiple sources (ENHANCED)
    const cookies = parseCookies(req);
    let gclid = gclidFromBody || cookies.gclid || '';
    let finalGclidSource = gclid_source || 'cookie';
    
    // Fallback: Try to extract from Google's _gcl_aw cookie
    if (!gclid && cookies._gcl_aw) {
      const parts = cookies._gcl_aw.split('.');
      if (parts.length >= 3) {
        gclid = parts.slice(2).join('.');
        finalGclidSource = '_gcl_aw_cookie';
        console.log('[CREATE-SETUP-INTENT] 🎯 GCLID extracted from _gcl_aw cookie');
      }
    }
    
    // Get IP address (для банов)
    const ip_address = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                       req.headers['x-real-ip'] || 
                       req.connection?.remoteAddress || 
                       'unknown';
    
    console.log('[CREATE-SETUP-INTENT] 📊 Request tracking:');
    console.log('[CREATE-SETUP-INTENT]    GCLID:', gclid ? `✅ ${gclid.substring(0, 15)}...` : '❌ NOT FOUND');
    console.log('[CREATE-SETUP-INTENT]    GCLID Source:', finalGclidSource);
    console.log('[CREATE-SETUP-INTENT]    Is Google Ads:', is_google_ads ? '✅ YES' : '🌐 NO');
    console.log('[CREATE-SETUP-INTENT]    UTM Source:', utm_source || 'none');
    console.log('[CREATE-SETUP-INTENT]    IP:', ip_address);
    
    // Build metadata
    const metadata = {};
    
    if (vin) {
      metadata.vin = vin.toUpperCase().replace(/[^A-Z0-9]/g, '');
    }
    
    if (ab_variant) {
      metadata.ab_variant = ab_variant;
    }
    
    if (utm_source) {
      metadata.utm_source = utm_source;
    }
    
    if (utm_medium) {
      metadata.utm_medium = utm_medium;
    }
    
    if (utm_campaign) {
      metadata.utm_campaign = utm_campaign;
    }
    
    // Save gclid_source for debugging
    if (gclid && finalGclidSource) {
      metadata.gclid_source = finalGclidSource;
    }
    
    // Mark if this is Google Ads traffic (even without GCLID)
    if (is_google_ads || gclid || (utm_source === 'google' && utm_medium === 'cpc')) {
      metadata.traffic_type = 'google_ads';
    } else if (utm_source) {
      metadata.traffic_type = utm_source;
    } else {
      metadata.traffic_type = 'organic_or_direct';
    }
    
    // CRITICAL: Save gclid for Google Ads conversion tracking
    if (gclid) {
      metadata.gclid = gclid;
    }
    
    // Save IP address for fraud prevention
    if (ip_address && ip_address !== 'unknown') {
      metadata.ip_address = ip_address;
    }
    
    console.log('Creating SetupIntent with metadata:', metadata);
    
    // Создаём SetupIntent для Payment Element (кошельки/карта). Customer пока не обязателен.
    const setupIntent = await stripe.setupIntents.create({
      usage: 'off_session',
      metadata
    });
    res.status(200).json({ client_secret: setupIntent.client_secret, id: setupIntent.id });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}