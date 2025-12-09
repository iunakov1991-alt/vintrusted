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

    // ТРИЗ: Проверка кэша перед API вызовом
    // Принцип: Максимальное использование ресурсов - не делаем повторные API вызовы
    const { VINReportCache } = require('./_lib/vin-report-cache');
    const reportCache = new VINReportCache();
    
    const cachedReport = reportCache.getReport(cleanVin);
    if (cachedReport) {
      console.log('Returning cached report for VIN:', cleanVin);
      return res.status(200).json({
        success: true,
        report: cachedReport.report,
        vin: cleanVin,
        cached: true,
        savedAt: cachedReport.savedAt
      });
    }

    // Get token from environment variable
    const token = process.env.CLEARVIN_API_TOKEN;
    const useMockMode = !token || process.env.USE_MOCK_REPORTS === 'true';
    
    if (useMockMode) {
      console.log('⚠️ MOCK MODE: ClearVin API token not configured or mock mode enabled');
      console.log('Returning demo report for VIN:', cleanVin);
      
      // Return a demo/mock report
      const mockReport = generateMockReport(cleanVin);
      
      return res.status(200).json({
        success: true,
        report: mockReport,
        vin: cleanVin,
        cached: false,
        mock: true,
        message: 'Demo report - ClearVin API not available'
      });
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

    // ТРИЗ: Сохранение отчета в кэш после получения
    // Принцип: Минимальный шаг - максимальный эффект - один раз получили, используем многократно
    try {
      await reportCache.saveReport(cleanVin, htmlReport, 'clearvin-api');
      console.log('Report cached for VIN:', cleanVin);
    } catch (cacheError) {
      console.error('Error caching report:', cacheError.message);
      // Не прерываем ответ, если кэширование не удалось
    }

    return res.status(200).json({
      success: true,
      report: htmlReport,
      vin: cleanVin,
      cached: false
    });
  } catch (error) {
    console.error('ClearVin API error:', error);
    
    // If API fails, return mock report as fallback
    console.log('⚠️ API failed, returning mock report as fallback');
    const mockReport = generateMockReport(req.query.vin);
    
    return res.status(200).json({
      success: true,
      report: mockReport,
      vin: req.query.vin,
      cached: false,
      mock: true,
      fallback: true,
      message: 'Demo report - ClearVin API unavailable'
    });
  }
}

// Generate a mock/demo report for testing
function generateMockReport(vin) {
  const cleanVin = vin.toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VIN Report - ${cleanVin}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            background: #f5f5f5;
            padding: 20px;
            line-height: 1.6;
        }
        .report-container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 20px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .report-header {
            background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
            color: #1a1a1a;
            padding: 30px;
            text-align: center;
        }
        .report-header h1 {
            font-size: 2rem;
            margin-bottom: 10px;
            font-weight: 700;
        }
        .vin-display {
            font-size: 1.3rem;
            font-family: monospace;
            background: rgba(0,0,0,0.1);
            padding: 10px 20px;
            border-radius: 8px;
            display: inline-block;
            margin-top: 10px;
        }
        .demo-badge {
            background: #ff4444;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.9rem;
            font-weight: 600;
            display: inline-block;
            margin-top: 15px;
        }
        .report-content {
            padding: 30px;
        }
        .section {
            margin-bottom: 30px;
            padding: 20px;
            background: #f9f9f9;
            border-radius: 8px;
            border-left: 4px solid #FFD700;
        }
        .section h2 {
            color: #1a1a1a;
            margin-bottom: 15px;
            font-size: 1.4rem;
        }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        .info-item {
            background: white;
            padding: 15px;
            border-radius: 6px;
            border: 1px solid #e0e0e0;
        }
        .info-label {
            font-size: 0.85rem;
            color: #666;
            margin-bottom: 5px;
            text-transform: uppercase;
            font-weight: 600;
        }
        .info-value {
            font-size: 1.1rem;
            color: #1a1a1a;
            font-weight: 500;
        }
        .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.9rem;
            font-weight: 600;
        }
        .status-clean {
            background: #d4edda;
            color: #155724;
        }
        .status-warning {
            background: #fff3cd;
            color: #856404;
        }
        .alert-box {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .alert-box h3 {
            color: #856404;
            margin-bottom: 10px;
        }
        .footer {
            background: #f5f5f5;
            padding: 20px;
            text-align: center;
            color: #666;
            font-size: 0.9rem;
        }
        .source {
            margin-top: 10px;
            font-weight: 600;
            color: #FFD700;
        }
    </style>
</head>
<body>
    <div class="report-container">
        <div class="report-header">
            <h1>🚗 Vehicle History Report</h1>
            <div class="vin-display">VIN: ${cleanVin}</div>
            <div class="demo-badge">⚠️ DEMO REPORT - For Testing Only</div>
        </div>
        
        <div class="report-content">
            <div class="alert-box">
                <h3>⚠️ Demo Mode Active</h3>
                <p>This is a demonstration report. ClearVin API is currently unavailable or not configured.</p>
                <p style="margin-top: 10px;">In production, this would show the full vehicle history report from ClearVin.</p>
            </div>
            
            <div class="section">
                <h2>📋 Vehicle Information</h2>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Year</div>
                        <div class="info-value">2018</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Make</div>
                        <div class="info-value">Honda</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Model</div>
                        <div class="info-value">Accord</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Body Style</div>
                        <div class="info-value">Sedan</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Engine</div>
                        <div class="info-value">2.0L 4-Cylinder</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Transmission</div>
                        <div class="info-value">Automatic CVT</div>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <h2>✅ Title & Registration</h2>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Title Status</div>
                        <div class="info-value">
                            <span class="status-badge status-clean">Clean Title</span>
                        </div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Registration State</div>
                        <div class="info-value">California</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Odometer</div>
                        <div class="info-value">45,230 miles</div>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <h2>🔍 Accident History</h2>
                <div class="info-item">
                    <div class="info-label">Reported Accidents</div>
                    <div class="info-value">
                        <span class="status-badge status-clean">No Accidents Reported</span>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <h2>🔧 Service Records</h2>
                <div class="info-item">
                    <div class="info-label">Service History</div>
                    <div class="info-value">12 service records found</div>
                </div>
                <p style="margin-top: 15px; color: #666;">
                    Regular maintenance performed at authorized dealers. Last service: Oil change at 44,500 miles.
                </p>
            </div>
            
            <div class="section">
                <h2>⚠️ Recalls & Safety</h2>
                <div class="info-item">
                    <div class="info-label">Open Recalls</div>
                    <div class="info-value">
                        <span class="status-badge status-warning">1 Open Recall</span>
                    </div>
                </div>
                <p style="margin-top: 15px; color: #666;">
                    Recall: Fuel pump replacement - Contact your Honda dealer for free repair.
                </p>
            </div>
        </div>
        
        <div class="footer">
            <p>This is a demonstration report for testing purposes.</p>
            <p class="source">SOURCE: VINTRUST (Demo Mode)</p>
            <p style="margin-top: 10px;">Generated: ${new Date().toLocaleString()}</p>
        </div>
    </div>
</body>
</html>
  `.trim();
}

