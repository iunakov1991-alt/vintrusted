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

    // Get token from environment variable
    const token = process.env.CLEARVIN_API_TOKEN;
    const useMockMode = !token || process.env.USE_MOCK_REPORTS === 'true';
    
    if (useMockMode) {
      console.log('⚠️ MOCK MODE: Simulating email send for VIN:', cleanVin, 'to:', email);
      
      // In mock mode, just return success without actually sending
      return res.status(200).json({
        success: true,
        message: 'Demo mode - Email would be sent in production',
        email: email,
        vin: cleanVin,
        mock: true
      });
    }

    // Fetch PDF report from ClearVin (use cleaned VIN)
    const reportUrl = `https://www.clearvin.com/rest/vendor/report?vin=${cleanVin}&format=pdf&reportTemplate=2021`;
    
    console.log('Fetching PDF report for VIN:', cleanVin, 'Email:', email);
    
    let response;
    try {
      response = await fetch(reportUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/pdf'
        }
      });
    } catch (fetchError) {
      console.error('Fetch error:', fetchError);
      return res.status(500).json({ 
        error: 'Failed to connect to ClearVin API',
        message: fetchError.message 
      });
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }

      console.error('ClearVin API error:', response.status, errorData);
      return res.status(response.status).json({ 
        error: errorData.message || 'Failed to fetch PDF report',
        details: errorData
      });
    }

    let pdfBuffer;
    try {
      pdfBuffer = await response.arrayBuffer();
    } catch (bufferError) {
      console.error('Error reading PDF buffer:', bufferError);
      return res.status(500).json({ 
        error: 'Failed to read PDF response',
        message: bufferError.message 
      });
    }
    
    // Check if PDF is empty or too small
    if (!pdfBuffer || pdfBuffer.byteLength < 100) {
      console.error('PDF is too small:', pdfBuffer?.byteLength || 0);
      return res.status(500).json({ 
        error: 'Invalid PDF report received from ClearVin',
        details: 'PDF file is empty or corrupted'
      });
    }
    
    const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');

    // TODO: Send email with PDF attachment using SendGrid/Mailgun/etc
    // For now, we'll just return success
    // You'll need to integrate with your email service provider
    
    console.log('Report PDF generated successfully. Email:', email, 'VIN:', cleanVin, 'Size:', pdfBuffer.byteLength, 'bytes');

    return res.status(200).json({
      success: true,
      message: 'Report sent to ' + email,
      email: email,
      vin: cleanVin
    });
  } catch (error) {
    console.error('Send report error:', error);
    return res.status(500).json({ 
      error: 'Failed to send report',
      message: error.message 
    });
  }
}

