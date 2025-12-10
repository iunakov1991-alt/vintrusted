#!/usr/bin/env node
/**
 * Утилита для отправки прогресса в локальный дашборд
 * Usage: node scripts/report_progress.js <topicsDone>
 */

const http = require('http');

const topicsDone = parseInt(process.argv[2], 10);
if (isNaN(topicsDone)) {
  console.error('[progress] Invalid topicsDone:', process.argv[2]);
  process.exit(1);
}

const postData = JSON.stringify({ topicsDone });

const options = {
  hostname: 'localhost',
  port: 3030,
  path: '/api/local-progress',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    if (res.statusCode === 200) {
      try {
        const result = JSON.parse(data);
        console.log(`[progress] Updated: ${topicsDone} topics, ${result.progress}% complete, ${result.estimatedTimeLeft}s left`);
      } catch (err) {
        console.log(`[progress] Updated: ${topicsDone} topics`);
      }
    } else {
      console.error(`[progress] Failed to update: ${res.statusCode}`);
    }
  });
});

req.on('error', (err) => {
  // Тихо игнорируем ошибки (дашборд может быть не запущен)
});

req.write(postData);
req.end();

