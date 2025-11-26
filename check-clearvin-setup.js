#!/usr/bin/env node
/**
 * Script to check ClearVin API setup
 * Run: node check-clearvin-setup.js
 */

const https = require('https');

// Test VIN from documentation
const TEST_VIN = '5TDYK3DC8DS290235';
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbnZpcm9ubWVudCI6InRlc3QiLCJ1c2VyIjp7ImlkIjoyNjYyNDIsImVtYWlsIjoicmVkc3RlcGxlckBnbWFpbC5jb20ifSwidmVuZG9yIjp7ImlkIjo0MzAsInN0YXR1cyI6ImFjdGl2ZSJ9LCJpYXQiOjE3NjI5NjYxNzIsImV4cCI6MTc2NTU1ODE3Mn0.xDK0eAie7Jo-PTgXabjeRPk7s-T21TRcp5d7CbHYo4';

console.log('🔍 Checking ClearVin API Setup...\n');

// Check 1: Test token format
console.log('1️⃣  Checking test token format...');
try {
  const tokenParts = TEST_TOKEN.split('.');
  if (tokenParts.length === 3) {
    console.log('   ✅ Token format is valid (JWT with 3 parts)');
  } else {
    console.log('   ❌ Token format is invalid');
  }
} catch (e) {
  console.log('   ❌ Error checking token:', e.message);
}

// Check 2: Test API endpoint directly
console.log('\n2️⃣  Testing ClearVin API directly...');
const apiUrl = `https://www.clearvin.com/rest/vendor/report?vin=${TEST_VIN}&format=html&reportTemplate=2021`;

const options = {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${TEST_TOKEN}`,
    'Accept': 'text/html, application/json',
    'User-Agent': 'VINTrust-Test/1.0'
  }
};

https.get(apiUrl, options, (res) => {
  let data = '';
  
  console.log(`   Status Code: ${res.statusCode}`);
  console.log(`   Content-Type: ${res.headers['content-type']}`);
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('   ✅ API request successful');
      console.log(`   Response length: ${data.length} bytes`);
      
      // Try to parse as JSON
      try {
        const json = JSON.parse(data);
        console.log('   📄 Response is JSON');
        console.log(`   JSON keys: ${Object.keys(json).join(', ')}`);
        
        if (json.status === 'ok') {
          console.log('   ✅ Status: OK');
          
          if (json.result && json.result.html_report) {
            const htmlLength = json.result.html_report.length;
            console.log(`   ✅ Found html_report: ${htmlLength} characters`);
            if (htmlLength > 100) {
              console.log('   ✅ HTML report is not empty');
            } else {
              console.log('   ⚠️  HTML report is very short (might be empty)');
            }
          } else if (json.html_report) {
            const htmlLength = json.html_report.length;
            console.log(`   ✅ Found html_report (root): ${htmlLength} characters`);
          } else {
            console.log('   ⚠️  No html_report found in response');
            if (json.result && json.result.id) {
              console.log(`   ℹ️  Found report ID: ${json.result.id}`);
            }
          }
        } else {
          console.log(`   ⚠️  Status: ${json.status || 'unknown'}`);
          if (json.message) {
            console.log(`   Message: ${json.message}`);
          }
        }
      } catch (e) {
        // Not JSON, might be HTML
        if (data.includes('<html') || data.includes('<body') || data.includes('<div')) {
          console.log('   ✅ Response is HTML (direct)');
          console.log(`   ✅ HTML length: ${data.length} characters`);
        } else {
          console.log('   ⚠️  Response is neither JSON nor HTML');
          console.log(`   Preview: ${data.substring(0, 200)}`);
        }
      }
    } else if (res.statusCode === 401) {
      console.log('   ❌ Unauthorized - Token is invalid or expired');
      console.log(`   Response: ${data.substring(0, 200)}`);
    } else {
      console.log(`   ❌ API request failed with status ${res.statusCode}`);
      console.log(`   Response: ${data.substring(0, 200)}`);
    }
    
    console.log('\n3️⃣  Summary:');
    console.log('   - Test token is configured');
    console.log('   - API endpoint is accessible');
    console.log('   - Next: Add CLEARVIN_API_TOKEN to Vercel environment variables');
    console.log('   - Next: Test your Vercel function: /api/get-clearvin-report?vin=' + TEST_VIN);
  });
}).on('error', (e) => {
  console.log(`   ❌ Error: ${e.message}`);
  console.log('\n   Make sure you have internet connection');
});

