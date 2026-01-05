// Token cache to avoid frequent login requests
let cachedToken = null;
let tokenExpiry = null;

// Function to get fresh token from ClearVin
async function getClearVinToken() {
  // Check if we have a valid cached token
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    console.log('✅ Using cached token (expires in', Math.round((tokenExpiry - Date.now()) / 1000 / 60), 'minutes)');
    return cachedToken;
  }

  console.log('🔑 Fetching new token from ClearVin...');
  
  const loginUrl = 'https://www.clearvin.com/rest/vendor/login';
  const credentials = {
    email: process.env.CLEARVIN_EMAIL || 'redstepler@gmail.com',
    password: process.env.CLEARVIN_PASSWORD || 't1sih81s68!36'
  };

  try {
    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Login failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    
    if (data.status === 'ok' && data.token) {
      cachedToken = data.token;
      // Token expires in 120 minutes, refresh 5 minutes before expiry
      tokenExpiry = Date.now() + (115 * 60 * 1000); // 115 minutes
      console.log('✅ Token obtained successfully, expires in 120 minutes');
      return cachedToken;
    } else {
      throw new Error('Invalid login response: ' + JSON.stringify(data));
    }
  } catch (error) {
    console.error('❌ Failed to get ClearVin token:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  // Enable CORS
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
    const { vin, format } = req.query;
    const reportFormat = format || 'html'; // Default to HTML, but support PDF

    if (!vin || vin.length !== 17) {
      return res.status(400).json({ error: 'Valid VIN is required (17 characters)' });
    }

    // Validate VIN format (A-Z, 0-9, excluding I, O, Q)
    const vinPattern = /^[A-HJ-NPR-Z0-9]{17}$/;
    const cleanVin = vin.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!vinPattern.test(cleanVin)) {
      return res.status(400).json({ error: 'Invalid VIN format. VIN must contain only valid characters (A-Z, 0-9, excluding I, O, Q)' });
    }

    // Get fresh token
    let token;
    try {
      token = await getClearVinToken();
    } catch (error) {
      return res.status(500).json({ 
        error: 'ClearVin authentication failed',
        details: error.message 
      });
    }

    // If PDF format requested, return PDF directly
    if (reportFormat === 'pdf') {
      const pdfUrl = `https://www.clearvin.com/rest/vendor/report?vin=${cleanVin}&format=pdf&reportTemplate=2021`;
      
      console.log('📄 Fetching PDF report for VIN:', cleanVin);
      
      const pdfResponse = await fetch(pdfUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/pdf'
        }
      });
      
      if (!pdfResponse.ok) {
        const errorText = await pdfResponse.text().catch(() => 'Unknown error');
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        
        return res.status(pdfResponse.status).json({ 
          error: errorData.message || 'Failed to fetch PDF report',
          details: errorData 
        });
      }
      
      const pdfBuffer = await pdfResponse.arrayBuffer();
      
      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="VIN-Report-${cleanVin}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.byteLength);
      
      return res.send(Buffer.from(pdfBuffer));
    }

    // Fetch HTML report from ClearVin
    const reportUrl = `https://www.clearvin.com/rest/vendor/report?vin=${cleanVin}&format=html&reportTemplate=2021`;
    
    console.log('📊 Fetching HTML report for VIN:', cleanVin);
    console.log('URL:', reportUrl);
    
    const response = await fetch(reportUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'text/html, application/json'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response content-type:', response.headers.get('content-type'));

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }

      // If unauthorized, clear cached token and retry
      if (response.status === 401) {
        console.log('⚠️ Token expired, clearing cache...');
        cachedToken = null;
        tokenExpiry = null;
        
        return res.status(401).json({ 
          error: 'ClearVin API authorization expired. Please try again.',
          details: errorData 
        });
      }
      
      return res.status(response.status).json({ 
        error: errorData.message || 'Failed to fetch report from ClearVin',
        details: errorData
      });
    }

    // Read response as text
    const responseText = await response.text();
    console.log('Response length:', responseText.length);
    
    let htmlReport = null;
    
    // Check if response is JSON
    if (responseText.trim().startsWith('{')) {
      try {
        const jsonData = JSON.parse(responseText);
        console.log('JSON response:', JSON.stringify(jsonData).substring(0, 200));
        
        if (jsonData.status === 'error') {
          return res.status(400).json({
            error: jsonData.message || 'ClearVin API error',
            details: jsonData
          });
        }
        
        if (jsonData.status === 'ok' && jsonData.result) {
          // Check if html_report exists and is not empty
          if (jsonData.result.html_report) {
            const reportText = jsonData.result.html_report.replace(/<[^>]*>/g, '').trim();
            
            // If html_report is empty or too short, try to get by reportId
            if (reportText.length < 100 && jsonData.result.id) {
              console.log('⚠️ html_report is empty, fetching by reportId:', jsonData.result.id);
          
              // Fetch full report by ID
              const reportByIdUrl = `https://www.clearvin.com/rest/vendor/report?reportId=${jsonData.result.id}&format=html&reportTemplate=2021`;
          const reportByIdResponse = await fetch(reportByIdUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
                  'Accept': 'text/html'
            }
          });
          
          if (reportByIdResponse.ok) {
                htmlReport = await reportByIdResponse.text();
                console.log('✅ Got report by ID, length:', htmlReport.length);
                } else {
                console.error('❌ Failed to fetch report by ID:', reportByIdResponse.status);
                htmlReport = jsonData.result.html_report; // Use what we have
              }
            } else {
              htmlReport = jsonData.result.html_report;
            }
          } else if (jsonData.result.id) {
            // No html_report at all, fetch by ID
            console.log('📄 No html_report, fetching by reportId:', jsonData.result.id);
            
            const reportByIdUrl = `https://www.clearvin.com/rest/vendor/report?reportId=${jsonData.result.id}&format=html&reportTemplate=2021`;
            const reportByIdResponse = await fetch(reportByIdUrl, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'text/html'
                }
            });
            
            if (reportByIdResponse.ok) {
              htmlReport = await reportByIdResponse.text();
              console.log('✅ Got report by ID, length:', htmlReport.length);
            }
          }
        }
      } catch (e) {
        console.log('Not JSON or parse error:', e.message);
        htmlReport = responseText;
      }
    } else {
      // Direct HTML response
      htmlReport = responseText;
    }

    // Validate HTML report
    if (!htmlReport || htmlReport.trim().length === 0) {
      console.error('❌ Empty HTML report received');
      return res.status(500).json({ 
        error: 'Empty report received from ClearVin',
        details: 'The report content is empty. VIN may not be found in database.'
      });
    }
    
    // Check if report has meaningful content
    const reportText = htmlReport.replace(/<[^>]*>/g, '').trim();
    if (reportText.length < 50) {
      console.warn('⚠️ Report has very little text content:', reportText.length, 'characters');
      return res.status(500).json({ 
        error: 'Report content is too short',
        details: 'VIN may not be found or report is incomplete.'
      });
    }
    
    console.log('✅ HTML report retrieved successfully, length:', htmlReport.length);

    // Remove <base> tag to avoid CSP violation
    // ClearVin returns <base href="https://www.clearvin.com/"> which violates base-uri 'self'
    htmlReport = htmlReport.replace(/<base[^>]*>/gi, '');
    console.log('✅ Removed <base> tags for CSP compatibility');

    return res.status(200).json({
      success: true,
      report: htmlReport,
      vin: cleanVin
    });
  } catch (error) {
    console.error('❌ ClearVin API error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch report',
      message: error.message 
    });
  }
}
