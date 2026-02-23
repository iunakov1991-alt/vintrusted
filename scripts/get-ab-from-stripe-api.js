#!/usr/bin/env node
/**
 * Get A/B Test data from Stripe via deployed API
 */

const https = require('https');

function fetchAPI(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'Authorization': 'Bearer vintrusted2026'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON: ${data.substring(0, 200)}`));
        }
      });
    }).on('error', reject);
  });
}

async function analyzeABTest() {
  console.log('🔍 Fetching conversion data from Stripe via API...\n');
  
  try {
    // Fetch analytics data
    const url = 'https://vintrusted.com/api/crm/analytics?start=2026-01-01&end=2026-02-23&budget=800';
    console.log(`📡 API URL: ${url}\n`);
    
    const data = await fetchAPI(url);
    
    console.log('✅ Data received!\n');
    console.log('═══════════════════════════════════════════════════');
    console.log('📊 RAW DATA FROM API');
    console.log('═══════════════════════════════════════════════════\n');
    console.log(JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

analyzeABTest();
