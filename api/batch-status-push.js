/**
 * Вспомогательный скрипт для отправки статуса из build_topics_batch_parallel.js
 * Можно вызывать периодически во время выполнения партии
 */

const https = require('https');

async function pushStatusToAPI(status) {
  const vercelUrl = process.env.VERCEL_URL || 'https://vintrusted.com';
  const batchStatusToken = process.env.BATCH_STATUS_TOKEN;
  
  if (!batchStatusToken) {
    console.warn('[Batch Status Push] BATCH_STATUS_TOKEN not set, skipping push');
    return;
  }
  
  const apiUrl = `${vercelUrl}/api/batch-status`;
  const postData = JSON.stringify(status);
  
  return new Promise((resolve, reject) => {
    const url = new URL(apiUrl);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${batchStatusToken}`
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('[Batch Status Push] Status pushed successfully');
          resolve(JSON.parse(data));
        } else {
          console.warn(`[Batch Status Push] Failed with status ${res.statusCode}: ${data}`);
          resolve(null);
        }
      });
    });
    
    req.on('error', (err) => {
      console.warn('[Batch Status Push] Error:', err.message);
      resolve(null);
    });
    
    req.write(postData);
    req.end();
  });
}

module.exports = { pushStatusToAPI };

