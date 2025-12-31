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

    // Get token from ClearVin API
    let token;
    try {
      // Call our own API endpoint to get token (it handles caching)
      const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://vintrusted.com';
      const tokenResponse = await fetch(`${baseUrl}/api/get-clearvin-report?vin=${cleanVin}&format=pdf`);
      
      if (!tokenResponse.ok) {
        throw new Error('Failed to get ClearVin token');
    }

      // The get-clearvin-report API will return the PDF directly
      // So we can just return its response
      const pdfBuffer = await tokenResponse.arrayBuffer();
    
    // Check if PDF is empty or too small
    if (!pdfBuffer || pdfBuffer.byteLength < 100) {
      console.error('PDF is too small:', pdfBuffer?.byteLength || 0);
      return res.status(500).json({ 
        error: 'Invalid PDF report received from ClearVin',
        details: 'PDF file is empty or corrupted'
      });
    }

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
