/**
 * Google Ads Click Conversion Upload
 *
 * Server-side attribution for recurring $49 subscription payments.
 * Uses the Google Ads API uploadClickConversions endpoint with the GCLID
 * that was captured at the time the user first paid the $2.99 trial.
 *
 * Google Ads Docs:
 * https://developers.google.com/google-ads/api/reference/rpc/v18/ConversionUploadService
 */

/**
 * Get a short-lived OAuth2 access token using the stored refresh token.
 */
async function getAccessToken() {
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_ADS_CLIENT_ID,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
      grant_type:    'refresh_token',
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`OAuth2 token request failed: ${resp.status} ${err}`);
  }

  const data = await resp.json();
  if (!data.access_token) {
    throw new Error(`No access_token in OAuth2 response: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

/**
 * Format a JS Date → "yyyy-mm-dd hh:mm:ss+00:00"
 * Google Ads requires this exact format with timezone offset.
 */
function formatConversionDateTime(date) {
  const pad = (n) => String(n).padStart(2, '0');
  const d = new Date(date);
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}+00:00`
  );
}

/**
 * Upload a single click conversion to Google Ads.
 *
 * @param {Object} opts
 * @param {string}  opts.gclid              - Google Click ID (from Stripe customer metadata)
 * @param {string}  opts.conversionActionId - Numeric ID of the conversion action
 * @param {number}  opts.value              - Conversion value in USD
 * @param {string}  [opts.currency='USD']
 * @param {Date|number} opts.conversionTime - When the payment occurred
 * @param {string}  opts.orderId            - Stripe invoice/charge ID for dedup
 */
export async function uploadClickConversion({
  gclid,
  conversionActionId,
  value,
  currency = 'USD',
  conversionTime,
  orderId,
}) {
  const customerId    = process.env.GOOGLE_ADS_CUSTOMER_ID;   // e.g. "1234567890" (no dashes)
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;

  // Check required env vars
  const missing = [];
  if (!customerId)          missing.push('GOOGLE_ADS_CUSTOMER_ID');
  if (!developerToken)       missing.push('GOOGLE_ADS_DEVELOPER_TOKEN');
  if (!process.env.GOOGLE_ADS_CLIENT_ID)     missing.push('GOOGLE_ADS_CLIENT_ID');
  if (!process.env.GOOGLE_ADS_CLIENT_SECRET) missing.push('GOOGLE_ADS_CLIENT_SECRET');
  if (!process.env.GOOGLE_ADS_REFRESH_TOKEN) missing.push('GOOGLE_ADS_REFRESH_TOKEN');

  if (missing.length > 0) {
    console.warn(`[GADS] ⚠️  Missing env vars: ${missing.join(', ')} — skipping upload`);
    return { success: false, reason: 'missing_env_vars', missing };
  }

  if (!gclid) {
    console.log('[GADS] ℹ️  No GCLID for this customer — upload skipped');
    return { success: false, reason: 'no_gclid' };
  }

  const conversionDateTime = formatConversionDateTime(conversionTime || Date.now());
  const conversionAction = `customers/${customerId}/conversionActions/${conversionActionId}`;

  let accessToken;
  try {
    accessToken = await getAccessToken();
  } catch (err) {
    console.error('[GADS] ❌ Failed to get access token:', err.message);
    return { success: false, reason: 'auth_error', error: err.message };
  }

  const payload = {
    conversions: [
      {
        gclid,
        conversion_action: conversionAction,
        conversion_date_time: conversionDateTime,
        conversion_value: value,
        currency_code: currency,
        order_id: orderId, // dedup key — Google ignores same order_id twice
      },
    ],
    partial_failure: true, // return partial results, don't fail the whole batch
  };

  console.log('[GADS] 📤 Uploading conversion:', {
    gclid: gclid.substring(0, 15) + '...',
    conversionAction,
    value,
    conversionDateTime,
    orderId,
  });

  try {
    const resp = await fetch(
      `https://googleads.googleapis.com/v18/customers/${customerId}:uploadClickConversions`,
      {
        method: 'POST',
        headers: {
          Authorization:    `Bearer ${accessToken}`,
          'developer-token': developerToken,
          'Content-Type':   'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    const result = await resp.json();

    if (!resp.ok) {
      console.error('[GADS] ❌ API error:', resp.status, JSON.stringify(result));
      return { success: false, reason: 'api_error', status: resp.status, result };
    }

    // Check partial_failure_error
    if (result.partial_failure_error) {
      console.error('[GADS] ❌ Partial failure:', JSON.stringify(result.partial_failure_error));
      return { success: false, reason: 'partial_failure', result };
    }

    console.log('[GADS] ✅ Conversion uploaded successfully:', JSON.stringify(result));
    return { success: true, result };

  } catch (err) {
    console.error('[GADS] ❌ Network error:', err.message);
    return { success: false, reason: 'network_error', error: err.message };
  }
}
