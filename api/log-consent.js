/**
 * API: Log Terms & Conditions Consent
 * Non-blocking consent logging for legal compliance
 */

module.exports = async (req, res) => {
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
    const { vin, terms_version, consent_given, timestamp, user_agent, page } = req.body;

    if (!vin || !consent_given) {
      return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }

    const consentRecord = {
      timestamp: timestamp || new Date().toISOString(),
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown',
      vin: vin,
      terms_version: terms_version || 'v1.0_20251211',
      consent_given: consent_given === true,
      user_agent: user_agent || req.headers['user-agent'] || 'unknown',
      page: page || 'unknown',
      referer: req.headers['referer'] || 'unknown'
    };

    // Log to Vercel console (searchable in dashboard)
    console.log('[CONSENT-LOG]', JSON.stringify(consentRecord));

    return res.status(200).json({
      ok: true,
      message: 'Consent logged',
      consent_id: generateConsentId(consentRecord)
    });

  } catch (error) {
    console.error('[CONSENT-LOG] Error:', error.message);
    
    // Return success even on error (non-blocking)
    return res.status(200).json({
      ok: true,
      message: 'Consent logged (with errors)',
      error: error.message
    });
  }
};

function generateConsentId(record) {
  const hash = require('crypto')
    .createHash('md5')
    .update(JSON.stringify(record))
    .digest('hex');
  return `consent_${hash.substring(0, 16)}`;
}
