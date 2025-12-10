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

    // Get token from environment variable
    const token = process.env.CLEARVIN_API_TOKEN;
    if (!token) {
      return res.status(500).json({ error: 'ClearVin API token not configured' });
    }

    // If PDF format requested, return PDF directly
    if (reportFormat === 'pdf') {
      const pdfUrl = `https://www.clearvin.com/rest/vendor/report?vin=${cleanVin}&format=pdf&reportTemplate=2021`;
      
      console.log('Fetching PDF report for VIN:', cleanVin);
      
      const pdfResponse = await fetch(pdfUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/pdf'
        }
      });
      
      if (!pdfResponse.ok) {
        const errorText = await pdfResponse.text().catch(() => 'Unknown error');
        return res.status(pdfResponse.status).json({ 
          error: 'Failed to fetch PDF report',
          details: errorText 
        });
      }
      
      const pdfBuffer = await pdfResponse.arrayBuffer();
      
      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="VIN-Report-${cleanVin}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.byteLength);
      
      return res.send(Buffer.from(pdfBuffer));
    }

    // Fetch HTML report from ClearVin (use cleaned VIN)
    // Try Report API first (returns HTML directly or JSON with html_report)
    const reportUrl = `https://www.clearvin.com/rest/vendor/report?vin=${cleanVin}&format=html&reportTemplate=2021`;
    
    console.log('Fetching ClearVin report for VIN:', cleanVin);
    console.log('Report URL:', reportUrl);
    
    const response = await fetch(reportUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'text/html, application/json',
        'User-Agent': 'VINTrust/1.0'
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

      if (response.status === 401) {
        return res.status(401).json({ error: 'ClearVin API authorization failed', details: errorData });
      }
      
      return res.status(response.status).json({ 
        error: errorData.message || 'Failed to fetch report from ClearVin',
        details: errorData
      });
    }

    // Check if response is JSON or HTML
    const contentType = response.headers.get('content-type') || '';
    let htmlReport;
    
    // First, try to read as text to see what we got
    const responseText = await response.text();
    console.log('Response text length:', responseText.length);
    console.log('Response text preview (first 500 chars):', responseText.substring(0, 500));
    
    // Try to parse as JSON first
    if (contentType.includes('application/json') || responseText.trim().startsWith('{')) {
      try {
        const jsonData = JSON.parse(responseText);
        console.log('ClearVin API returned JSON:', JSON.stringify(jsonData).substring(0, 500));
        
        if (jsonData.status === 'ok' && jsonData.result && jsonData.result.html_report) {
          htmlReport = jsonData.result.html_report;
          console.log('Extracted html_report from result.html_report, length:', htmlReport?.length || 0);
          console.log('html_report preview (first 200 chars):', htmlReport?.substring(0, 200) || 'null');
        } else if (jsonData.html_report) {
          htmlReport = jsonData.html_report;
          console.log('Extracted html_report from root, length:', htmlReport?.length || 0);
          console.log('html_report preview (first 200 chars):', htmlReport?.substring(0, 200) || 'null');
        } else if (jsonData.status === 'ok' && jsonData.result && jsonData.result.id) {
          // If no html_report, try to get report ID and fetch it separately
          const reportId = jsonData.result.id;
          console.log('Got report ID, trying to fetch by ID:', reportId);
          
          // Try to fetch report by ID
          const reportByIdUrl = `https://www.clearvin.com/rest/vendor/report?reportId=${reportId}&format=html&reportTemplate=2021`;
          const reportByIdResponse = await fetch(reportByIdUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'text/html, application/json',
              'User-Agent': 'VINTrust/1.0'
            }
          });
          
          if (reportByIdResponse.ok) {
            const reportByIdText = await reportByIdResponse.text();
            const reportByIdContentType = reportByIdResponse.headers.get('content-type') || '';
            
            if (reportByIdContentType.includes('application/json') || reportByIdText.trim().startsWith('{')) {
              try {
                const reportByIdData = JSON.parse(reportByIdText);
                if (reportByIdData.status === 'ok' && reportByIdData.result && reportByIdData.result.html_report) {
                  htmlReport = reportByIdData.result.html_report;
                } else if (reportByIdData.html_report) {
                  htmlReport = reportByIdData.html_report;
                } else {
                  htmlReport = reportByIdText; // Fallback to raw text
                }
              } catch {
                htmlReport = reportByIdText; // If not JSON, use as HTML
              }
            } else {
              htmlReport = reportByIdText;
            }
          }
        }
        
        // If still no htmlReport, try using the raw JSON response text as fallback
        if (!htmlReport || htmlReport.trim().length === 0) {
          console.log('No html_report found, checking if response text contains HTML...');
          console.log('JSON keys:', Object.keys(jsonData));
          if (jsonData.result) {
            console.log('result keys:', Object.keys(jsonData.result));
          }
          // Check if response text itself contains HTML tags
          if (responseText.includes('<html') || responseText.includes('<body') || responseText.includes('<div')) {
            htmlReport = responseText;
            console.log('Using response text as HTML (contains HTML tags)');
          } else {
            // Try to find HTML in nested structures
            const searchForHtml = (obj, depth = 0) => {
              if (depth > 3) return null; // Prevent infinite recursion
              if (typeof obj === 'string' && (obj.includes('<html') || obj.includes('<body') || obj.includes('<div'))) {
                return obj;
              }
              if (typeof obj === 'object' && obj !== null) {
                for (const key in obj) {
                  const result = searchForHtml(obj[key], depth + 1);
                  if (result) return result;
                }
              }
              return null;
            };
            const foundHtml = searchForHtml(jsonData);
            if (foundHtml) {
              htmlReport = foundHtml;
              console.log('Found HTML in nested structure');
            } else {
              return res.status(500).json({ 
                error: 'HTML report not found in API response',
                details: jsonData,
                debug: {
                  responseLength: responseText.length,
                  responsePreview: responseText.substring(0, 200),
                  jsonKeys: Object.keys(jsonData),
                  hasResult: !!jsonData.result,
                  resultKeys: jsonData.result ? Object.keys(jsonData.result) : []
                }
              });
            }
          }
        }
      } catch (jsonError) {
        // If JSON parsing fails, treat as HTML
        console.log('Failed to parse as JSON, treating as HTML:', jsonError.message);
        htmlReport = responseText;
      }
    } else {
      // API returned HTML directly
      htmlReport = responseText;
      console.log('API returned HTML directly, length:', htmlReport.length);
    }

    // Check if HTML report is empty or just whitespace
    if (!htmlReport || htmlReport.trim().length === 0) {
      console.error('HTML report is empty or whitespace only. Length:', htmlReport?.length || 0);
      console.error('First 200 chars:', htmlReport?.substring(0, 200) || 'null');
      
      // Try alternative: maybe we need to use format=json and extract differently
      // Or the report needs to be generated first via preview endpoint
      return res.status(500).json({ 
        error: 'Empty HTML report received from ClearVin',
        details: 'The report content is empty. Possible reasons: 1) Report is still being generated (try again in 10-30 seconds), 2) VIN not found in database, 3) API format issue. Check Vercel logs for more details.',
        debug: {
          vin: cleanVin,
          reportLength: htmlReport?.length || 0,
          reportPreview: htmlReport?.substring(0, 100) || 'null'
        }
      });
    }
    
    // Check if report has meaningful content (not just empty HTML tags)
    const reportText = htmlReport.replace(/<[^>]*>/g, '').trim();
    if (reportText.length < 50) {
      console.warn('Report has very little text content:', reportText.length, 'characters');
      console.warn('Full HTML length:', htmlReport.length);
      console.warn('Report preview (first 500 chars):', htmlReport.substring(0, 500));
      
      return res.status(500).json({ 
        error: 'Report content is too short',
        details: 'The report appears to be empty or incomplete. Possible reasons: 1) Report is still being generated (try again in 10-30 seconds), 2) VIN not found in database, 3) API returned incomplete data.',
        debug: {
          vin: cleanVin,
          htmlLength: htmlReport.length,
          textLength: reportText.length,
          reportPreview: htmlReport.substring(0, 200)
        }
      });
    }
    
    console.log('Successfully extracted HTML report, length:', htmlReport.length);
    console.log('Report text content length (without HTML tags):', reportText.length);

    return res.status(200).json({
      success: true,
      report: htmlReport,
      vin: cleanVin
    });
  } catch (error) {
    console.error('ClearVin API error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch report',
      message: error.message 
    });
  }
}
