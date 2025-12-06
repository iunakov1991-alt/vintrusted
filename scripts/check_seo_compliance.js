#!/usr/bin/env node

/**
 * MONSTER8 SEO Compliance Checker
 * Проверяет страницы на соответствие SEO чеклисту
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const CHECKLIST_FILE = path.join(__dirname, '..', 'config', 'seo_ultra_checklist.json');
const PAGE_PATH = process.argv[2] || path.join(__dirname, '..', 'index.html');

if (!fs.existsSync(CHECKLIST_FILE)) {
  console.error('ERROR: Checklist not found. Run install_seo_ultra_checklist.sh first.');
  process.exit(1);
}

if (!fs.existsSync(PAGE_PATH)) {
  console.error(`ERROR: Page not found: ${PAGE_PATH}`);
  process.exit(1);
}

const checklist = JSON.parse(fs.readFileSync(CHECKLIST_FILE, 'utf8'));
const html = fs.readFileSync(PAGE_PATH, 'utf8');
const dom = new JSDOM(html);
const document = dom.window.document;

const results = {
  passed: [],
  failed: [],
  warnings: []
};

function checkMetaBasics() {
  const group = checklist.groups.find(g => g.id === 'meta_basics');
  if (!group) return;

  for (const check of group.checks) {
    let passed = false;
    let message = '';

    switch (check.id) {
      case 'META_TITLE_EXISTS':
        passed = !!document.querySelector('title');
        message = passed ? 'Title exists' : 'Title missing';
        break;
      case 'META_TITLE_LENGTH':
        const title = document.querySelector('title')?.textContent || '';
        passed = title.length >= 50 && title.length <= 60;
        message = `Title length: ${title.length} (target: 50-60)`;
        break;
      case 'META_DESC_EXISTS':
        passed = !!document.querySelector('meta[name="description"]');
        message = passed ? 'Description exists' : 'Description missing';
        break;
      case 'META_DESC_LENGTH':
        const desc = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
        passed = desc.length >= 140 && desc.length <= 160;
        message = `Description length: ${desc.length} (target: 140-160)`;
        break;
      case 'META_VIEWPORT':
        passed = !!document.querySelector('meta[name="viewport"]');
        message = passed ? 'Viewport meta exists' : 'Viewport meta missing';
        break;
      case 'META_CHARSET_UTF8':
        passed = !!document.querySelector('meta[charset="utf-8"], meta[charset="UTF-8"]');
        message = passed ? 'Charset UTF-8 exists' : 'Charset UTF-8 missing';
        break;
      case 'META_CANONICAL':
        passed = !!document.querySelector('link[rel="canonical"]');
        message = passed ? 'Canonical exists' : 'Canonical missing';
        break;
      case 'META_OG_BASIC':
        const ogTitle = document.querySelector('meta[property="og:title"]');
        const ogDesc = document.querySelector('meta[property="og:description"]');
        const ogType = document.querySelector('meta[property="og:type"]');
        const ogUrl = document.querySelector('meta[property="og:url"]');
        passed = !!(ogTitle && ogDesc && ogType && ogUrl);
        message = passed ? 'OG tags complete' : 'OG tags incomplete';
        break;
      case 'META_OG_IMAGE':
        passed = !!document.querySelector('meta[property="og:image"]');
        message = passed ? 'OG image exists' : 'OG image missing';
        break;
      case 'META_TWITTER_CARD':
        passed = !!document.querySelector('meta[name="twitter:card"]');
        message = passed ? 'Twitter card exists' : 'Twitter card missing';
        break;
      case 'META_LANG_HTML':
        const lang = document.documentElement.getAttribute('lang');
        passed = !!lang && (lang === 'en' || lang === 'es');
        message = `HTML lang: ${lang || 'missing'}`;
        break;
      case 'META_FAVICON':
        passed = !!document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
        message = passed ? 'Favicon exists' : 'Favicon missing';
        break;
      case 'META_THEME_COLOR':
        passed = !!document.querySelector('meta[name="theme-color"]');
        message = passed ? 'Theme color exists' : 'Theme color missing';
        break;
      default:
        passed = true;
        message = 'Check not implemented';
    }

    const result = { check: check.id, severity: check.severity, text: check.text, passed, message };
    if (passed) {
      results.passed.push(result);
    } else if (check.severity === 'critical') {
      results.failed.push(result);
    } else {
      results.warnings.push(result);
    }
  }
}

function checkSchema() {
  const group = checklist.groups.find(g => g.id === 'schema_structured_data');
  if (!group) return;

  for (const check of group.checks) {
    let passed = false;
    let message = '';

    switch (check.id) {
      case 'SCHEMA_WEBPAGE':
        const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        const hasWebPage = scripts.some(script => {
          try {
            const data = JSON.parse(script.textContent);
            return data['@type'] === 'WebPage';
          } catch (e) {
            return false;
          }
        });
        passed = hasWebPage;
        message = passed ? 'WebPage schema exists' : 'WebPage schema missing';
        break;
      case 'SCHEMA_ORGANIZATION':
        const orgScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        const hasOrg = orgScripts.some(script => {
          try {
            const data = JSON.parse(script.textContent);
            return data['@type'] === 'Organization';
          } catch (e) {
            return false;
          }
        });
        passed = hasOrg;
        message = passed ? 'Organization schema exists' : 'Organization schema missing';
        break;
      case 'SCHEMA_SEARCHACTION_VIN':
        const searchScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        const hasSearchAction = searchScripts.some(script => {
          try {
            const data = JSON.parse(script.textContent);
            return data.potentialAction?.['@type'] === 'SearchAction' || 
                   data['@type'] === 'WebSite' && data.potentialAction;
          } catch (e) {
            return false;
          }
        });
        passed = hasSearchAction;
        message = passed ? 'SearchAction schema exists' : 'SearchAction schema missing';
        break;
      default:
        passed = true;
        message = 'Check not implemented';
    }

    const result = { check: check.id, severity: check.severity, text: check.text, passed, message };
    if (passed) {
      results.passed.push(result);
    } else if (check.severity === 'critical') {
      results.failed.push(result);
    } else {
      results.warnings.push(result);
    }
  }
}

// Run checks
checkMetaBasics();
checkSchema();

// Print results
console.log('\n=== MONSTER8 SEO COMPLIANCE CHECK ===\n');
console.log(`Page: ${PAGE_PATH}\n`);

if (results.failed.length > 0) {
  console.log('❌ CRITICAL ISSUES:');
  results.failed.forEach(r => {
    console.log(`  [${r.severity.toUpperCase()}] ${r.check}: ${r.text}`);
    console.log(`     → ${r.message}`);
  });
  console.log('');
}

if (results.warnings.length > 0) {
  console.log('⚠️  WARNINGS:');
  results.warnings.forEach(r => {
    console.log(`  [${r.severity.toUpperCase()}] ${r.check}: ${r.text}`);
    console.log(`     → ${r.message}`);
  });
  console.log('');
}

console.log(`✅ PASSED: ${results.passed.length}`);
console.log(`❌ FAILED: ${results.failed.length}`);
console.log(`⚠️  WARNINGS: ${results.warnings.length}\n`);

if (results.failed.length > 0) {
  process.exit(1);
}

