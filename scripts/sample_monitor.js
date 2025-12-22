#!/usr/bin/env node

/**
 * MONSTER 7.x: Sample Monitor
 * Выбирает страницы для golden reports (примерно каждая 37-я)
 */

const fs = require('fs');
const path = require('path');

function shouldSample(vin) {
  if (!vin) return false;
  const hash = [...vin].reduce((a, c) => a + c.charCodeAt(0), 0);
  return hash % 37 === 0; // ~каждая 37-я страница
}

function saveSample(vin, html) {
  const goldenDir = path.join(process.cwd(), 'golden_reports');
  if (!fs.existsSync(goldenDir)) {
    fs.mkdirSync(goldenDir, { recursive: true });
  }
  
  const filePath = path.join(goldenDir, `${vin}.html`);
  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`✅ Saved golden sample: ${filePath}`);
}

function saveSampleJSON(vin, data) {
  const goldenDir = path.join(process.cwd(), 'golden_reports');
  if (!fs.existsSync(goldenDir)) {
    fs.mkdirSync(goldenDir, { recursive: true });
  }
  
  const filePath = path.join(goldenDir, `${vin}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`✅ Saved golden sample JSON: ${filePath}`);
}

module.exports = { shouldSample, saveSample, saveSampleJSON };









