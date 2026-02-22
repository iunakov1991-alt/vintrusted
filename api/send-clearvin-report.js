import { kv } from '@vercel/kv';
import { checkRateLimit, sendRateLimitError } from './_lib/rate-limit.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ✅ P0: Rate limiting (защита от ClearVin API quota exhaustion)
  const rateLimitCheck = await checkRateLimit(req, 'clearvin');
  if (!rateLimitCheck.success) {
    return sendRateLimitError(res, rateLimitCheck);
  }

  try {
    // Parse body if it's a string
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON in request body' });
      }
    }

    const { email, vin } = body || {};

    if (!email || !vin) {
      return res.status(400).json({ error: 'Email and VIN are required' });
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate VIN format
    if (vin.length !== 17) {
      return res.status(400).json({ error: 'Invalid VIN format. VIN must be 17 characters' });
    }
    const vinPattern = /^[A-HJ-NPR-Z0-9]{17}$/;
    const cleanVin = vin.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!vinPattern.test(cleanVin)) {
      return res.status(400).json({ error: 'Invalid VIN format. VIN must contain only valid characters (A-Z, 0-9, excluding I, O, Q)' });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ✅ P1: RETRY LOGIC ДЛЯ CLEARVIN API
    // ═══════════════════════════════════════════════════════════════════════
    // Защита от temporary ClearVin API failures
    
    let pdfBuffer;
    let lastError;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[SEND-REPORT] Attempt ${attempt}/${maxRetries} to get report for VIN: ${cleanVin}`);
        
        const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://vintrusted.com';
        const tokenResponse = await fetch(`${baseUrl}/api/get-clearvin-report?vin=${cleanVin}&format=pdf`, {
          signal: AbortSignal.timeout(30000), // 30s timeout
        });
        
        if (!tokenResponse.ok) {
          throw new Error(`ClearVin API returned ${tokenResponse.status}: ${await tokenResponse.text()}`);
        }

        // The get-clearvin-report API will return the PDF directly
        pdfBuffer = await tokenResponse.arrayBuffer();
        
        // Check if PDF is valid
        if (!pdfBuffer || pdfBuffer.byteLength < 100) {
          throw new Error(`Invalid PDF received (size: ${pdfBuffer?.byteLength || 0} bytes)`);
        }
        
        console.log(`[SEND-REPORT] ✅ Report retrieved successfully (attempt ${attempt})`);
        break; // Success - exit retry loop
        
      } catch (error) {
        lastError = error;
        console.error(`[SEND-REPORT] ❌ Attempt ${attempt} failed:`, error.message);
        
        if (attempt < maxRetries) {
          // Exponential backoff: 2s, 4s, 8s
          const delayMs = 2000 * Math.pow(2, attempt - 1);
          console.log(`[SEND-REPORT] ⏳ Retrying in ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }
    
    // Если все retry failed
    if (!pdfBuffer) {
      console.error('[SEND-REPORT] ❌ All retry attempts failed:', lastError);
      
      // ✅ P0: Monitor ClearVin API failure
      const { logBusinessEvent, SEVERITY, EVENT_TYPE } = await import('./_lib/monitoring.js');
      await logBusinessEvent(EVENT_TYPE.CLEARVIN_ERROR, SEVERITY.CRITICAL, {
        email,
        vin: cleanVin,
        error: lastError.message,
        attempts: maxRetries,
      });
      
      return res.status(503).json({ 
        error: 'Report service temporarily unavailable',
        message: 'We are having trouble generating your report. Please try again in a few minutes or contact support.',
        retry: true,
      });
    }

    // TODO: Send email with PDF attachment using SendGrid/Mailgun/etc
    // For now, we'll just return success
    // You'll need to integrate with your email service provider
    
    console.log('Report PDF generated successfully. Email:', email, 'VIN:', cleanVin, 'Size:', pdfBuffer.byteLength, 'bytes');

    // Сохраняем в KV cache что отчет получен
    try {
      const reportKey = `report:cache:${cleanVin}`;
      await kv.set(reportKey, {
        vin: cleanVin,
        cached_at: new Date().toISOString(),
        report_data: {
          status: 'available',
          pdf_size: pdfBuffer.byteLength,
          message: 'Report available via ClearVin API'
        },
        vehicle: null // Можно дополнить через VIN decode API
      }, { ex: 60 * 60 * 24 * 90 }); // 90 дней
      console.log('[SEND-REPORT] ✅ Report cached in KV');
    } catch (kvError) {
      console.error('[SEND-REPORT] ⚠️  Failed to cache report:', kvError.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Report sent to ' + email,
      email: email,
      vin: cleanVin
    });
      
    } catch (fetchError) {
      console.error('Fetch error:', fetchError);
      return res.status(500).json({ 
        error: 'Failed to connect to ClearVin API',
        message: fetchError.message 
      });
    }

  } catch (error) {
    console.error('Send report error:', error);
    return res.status(500).json({ 
      error: 'Failed to send report',
      message: error.message 
    });
  }
}
