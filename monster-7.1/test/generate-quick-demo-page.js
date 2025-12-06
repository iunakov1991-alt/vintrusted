#!/usr/bin/env node

/**
 * Быстрая генерация демо-страницы для продакшена
 * Использует только DeepSeek для быстрой генерации
 */

const fs = require('fs');
const path = require('path');
const { DeepSeekAPIClient } = require('../../scripts/seo/utils/api-client');

async function generateQuickDemoPage() {
  console.log('🚀 Быстрая генерация демо-страницы (DeepSeek)\n');

  const deepseekAI = new DeepSeekAPIClient({ timeout: 30000 });
  const context = {
    theme: 'VIN Check',
    intent: 'vin_check',
    keywords: ['VIN check', 'vehicle history', 'VIN lookup', 'car history report']
  };

  // Генерируем только ключевые части для демо
  console.log('Генерация введения...');
  const intro = await generateIntro(deepseekAI, context);
  
  console.log('Генерация 3 основных секций...');
  const sections = [];
  for (let i = 1; i <= 3; i++) {
    const section = await generateSection(deepseekAI, i, context);
    sections.push(section);
  }
  
  console.log('Генерация таблицы...');
  const table = await generateTable(deepseekAI, context);
  
  console.log('Генерация FAQ (5 вопросов)...');
  const faq = await generateFAQ(deepseekAI, context);
  
  console.log('Генерация заключения...');
  const conclusion = await generateConclusion(deepseekAI, context, sections);

  // Сборка страницы
  const allSections = [intro, ...sections, conclusion];
  const html = buildHTML(context, allSections, table, faq);
  
  // Сохранение
  const slug = 'vin-check-hybrid-demo';
  const pageDir = path.join(process.cwd(), 'public/seo-pages', slug);
  if (!fs.existsSync(pageDir)) {
    fs.mkdirSync(pageDir, { recursive: true });
  }
  
  fs.writeFileSync(path.join(pageDir, 'index.html'), html, 'utf8');
  
  const domain = 'https://vintrusted.com';
  const fullUrl = `${domain}/seo-pages/${slug}/`;
  
  console.log('\n✅ Страница сгенерирована!');
  console.log(`📄 Путь: public/seo-pages/${slug}/index.html`);
  console.log(`🌐 URL: ${fullUrl}\n`);
  
  return { slug, url: fullUrl, path: pageDir };
}

async function generateIntro(ai, context) {
  const prompt = `Write a compelling 400-word introduction for an SEO article about "${context.theme}". Include hook, value proposition, and overview. Output JSON: {"heading": "...", "content": "..."}`;
  const response = await ai.generateText(prompt, { maxTokens: 800 });
  if (!response) {
    return { heading: `Introduction: ${context.theme}`, content: `Welcome to our comprehensive guide about ${context.theme}. This article provides expert insights and detailed information.` };
  }
  return parseSection(response, 'Introduction');
}

async function generateSection(ai, index, context) {
  const prompt = `Write a 500-word expert section ${index} about "${context.theme}". Include examples and data. Output JSON: {"heading": "...", "content": "..."}`;
  const response = await ai.generateText(prompt, { maxTokens: 1000 });
  if (!response) {
    return { heading: `${context.theme} - Section ${index}`, content: `This section covers important aspects of ${context.theme}.` };
  }
  return parseSection(response, `Section ${index}`);
}

async function generateTable(ai, context) {
  const prompt = `Create a table about "${context.theme}" with 4 columns and 8 rows. Output JSON: {"title": "...", "headers": [...], "rows": [...]}`;
  const response = await ai.generateText(prompt, { maxTokens: 800 });
  if (!response) {
    return { title: `Table: ${context.theme}`, headers: ['Column 1', 'Column 2', 'Column 3', 'Column 4'], rows: [['1', '2', '3', '4'], ['5', '6', '7', '8']] };
  }
  return parseTable(response);
}

async function generateFAQ(ai, context) {
  const prompt = `Generate 5 FAQ questions and answers about "${context.theme}". Each answer 200 words. Output JSON: {"questions": [{"q": "...", "a": "..."}]}`;
  const response = await ai.generateText(prompt, { maxTokens: 2000 });
  if (!response) {
    return [{ q: `What is ${context.theme}?`, a: `${context.theme} is an important topic.` }];
  }
  return parseFAQ(response);
}

async function generateConclusion(ai, context, sections) {
  const summaries = sections.map(s => s.heading).join(', ');
  const prompt = `Write a 400-word conclusion for article about "${context.theme}" covering: ${summaries}. Include CTA. Output JSON: {"heading": "...", "content": "..."}`;
  const response = await ai.generateText(prompt, { maxTokens: 800 });
  if (!response) {
    return { heading: `Conclusion: ${context.theme}`, content: `In conclusion, ${context.theme} is an important topic.` };
  }
  return parseSection(response, 'Conclusion');
}

function parseSection(response, defaultHeading) {
  if (!response) {
    return { heading: defaultHeading, content: 'Content not available.' };
  }
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        heading: parsed.heading || defaultHeading,
        content: parsed.content || response.substring(0, 500)
      };
    }
  } catch (e) {}
  return { heading: defaultHeading, content: response ? response.substring(0, 500) : 'Content not available.' };
}

function parseTable(response) {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {}
  return { title: 'Table', headers: ['Col1', 'Col2', 'Col3'], rows: [['1', '2', '3']] };
}

function parseFAQ(response) {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.questions || [];
    }
  } catch (e) {}
  return [{ q: 'Question?', a: 'Answer.' }];
}

function buildHTML(context, sections, table, faq) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${context.theme} - Complete Guide | VINTrusted</title>
    <meta name="description" content="Learn everything about ${context.theme}. Expert guide with detailed information.">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 1200px; margin: 0 auto; padding: 20px; color: #333; }
        h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
        h2 { color: #34495e; margin-top: 40px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #3498db; color: white; }
        .faq { margin-top: 40px; }
        .faq-item { margin-bottom: 30px; }
        .faq-question { font-weight: bold; color: #2c3e50; margin-bottom: 10px; }
    </style>
</head>
<body>
    <h1>Complete Guide to ${context.theme}</h1>
    ${sections.map(s => `<section><h2>${s.heading}</h2><div>${s.content}</div></section>`).join('\n')}
    ${table ? `<h3>${table.title}</h3><table><thead><tr>${table.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${table.rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>` : ''}
    <section class="faq">
        <h2>Frequently Asked Questions</h2>
        ${faq.map(q => `<div class="faq-item"><div class="faq-question">${q.q}</div><div>${q.a}</div></div>`).join('\n')}
    </section>
</body>
</html>`;
}

if (require.main === module) {
  generateQuickDemoPage().catch(console.error);
}

module.exports = { generateQuickDemoPage };

