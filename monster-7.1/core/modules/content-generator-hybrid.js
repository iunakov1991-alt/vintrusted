/**
 * MONSTER 7.2 — HYBRID CONTENT GENERATOR (Phi-3 + DeepSeek)
 * 
 * Гибридный подход:
 * - Phi-3 (локально): простые секции, кэширование, вспомогательные задачи
 * - DeepSeek (API): введение, заключение, сложные секции, таблицы, FAQ
 */

const fs = require('fs');
const path = require('path');
const { DeepSeekAPIClient } = require('../../../scripts/seo/utils/api-client');

class HybridContentGenerator {
  constructor(config) {
    this.config = config;
    this.outputPath = path.join(process.cwd(), 'public/seo-pages');
    
    // Phi-3 профиль
    this.phi3Profile = config.phi3Profile || {
      maxInputTokens: 500,
      maxOutputTokens: 1000,
      timeout: 60000
    };
    
    // DeepSeek профиль
    this.deepseekProfile = config.deepseekProfile || {
      maxInputTokens: 2000,
      maxOutputTokens: 4000,
      timeout: 30000
    };
    
    // Инициализация AI провайдеров
    this.localAI = null;
    this.deepseekAI = null;
    this.initLocalAI();
    this.initDeepSeek();
  }

  initLocalAI() {
    try {
      const localAIPath = path.join(process.cwd(), 'scripts', 'seo', 'ai', 'local-ai-provider.js');
      const LocalAIProviderModule = require(localAIPath);
      const LocalAIProvider = LocalAIProviderModule.LocalAIProvider || LocalAIProviderModule;
      this.localAI = new LocalAIProvider({
        localAIModel: this.config.modules?.aiKnowledgeCore?.model || 'phi3'
      });
      console.log('[HYBRID-CG] Phi-3 (локально) инициализирован');
    } catch (error) {
      console.warn('[HYBRID-CG] LocalAIProvider not available:', error.message);
    }
  }

  initDeepSeek() {
    try {
      this.deepseekAI = new DeepSeekAPIClient({
        timeout: this.deepseekProfile.timeout
      });
      console.log('[HYBRID-CG] DeepSeek API инициализирован');
    } catch (error) {
      console.warn('[HYBRID-CG] DeepSeek API not available:', error.message);
    }
  }

  /**
   * Генерация введения (DeepSeek)
   */
  async generateIntroduction(context) {
    const prompt = this.buildIntroductionPrompt(context);
    
    if (!this.deepseekAI) {
      return this.generateIntroductionFallback(context);
    }

    try {
      const response = await this.deepseekAI.generateText(prompt, {
        maxTokens: this.deepseekProfile.maxOutputTokens
      });

      if (response) {
        return this.parseSection(response, 'introduction');
      }
    } catch (error) {
      console.warn('[HYBRID-CG] Introduction generation failed, using fallback:', error.message);
    }

    return this.generateIntroductionFallback(context);
  }

  buildIntroductionPrompt(context) {
    const { theme, intent, keywords } = context;
    
    return `Write a compelling introduction for an SEO article about "${theme}".

Topic: ${theme}
Intent: ${intent}
Keywords: ${keywords?.join(', ') || 'none'}

Requirements:
- Engaging opening hook (first 2-3 sentences)
- Clear value proposition
- Overview of what the article covers
- 400-600 words
- Professional, authoritative tone
- Include relevant keywords naturally

Output JSON:
{
  "heading": "Introduction Heading",
  "content": "Introduction content in markdown format..."
}`;
  }

  /**
   * Генерация секции (выбор провайдера по сложности)
   */
  async generateSection(sectionType, sectionIndex, context) {
    // Сложные секции (1-2, 9-10) → DeepSeek
    // Простые секции (3-8) → Phi-3
    const isComplex = sectionIndex <= 2 || sectionIndex >= 9;
    
    if (isComplex && this.deepseekAI) {
      return await this.generateSectionDeepSeek(sectionType, sectionIndex, context);
    } else if (this.localAI) {
      return await this.generateSectionPhi3(sectionType, sectionIndex, context);
    } else {
      return this.generateSectionFallback(sectionType, sectionIndex, context);
    }
  }

  async generateSectionDeepSeek(sectionType, sectionIndex, context) {
    const prompt = this.buildComplexSectionPrompt(sectionType, sectionIndex, context);
    
    try {
      const response = await this.deepseekAI.generateText(prompt, {
        maxTokens: this.deepseekProfile.maxOutputTokens
      });

      if (response) {
        return this.parseSection(response, sectionType);
      }
    } catch (error) {
      console.warn(`[HYBRID-CG] DeepSeek section generation failed:`, error.message);
      // Fallback на Phi-3
      if (this.localAI) {
        return await this.generateSectionPhi3(sectionType, sectionIndex, context);
      }
    }

    return this.generateSectionFallback(sectionType, sectionIndex, context);
  }

  async generateSectionPhi3(sectionType, sectionIndex, context) {
    const prompt = this.buildSimpleSectionPrompt(sectionType, sectionIndex, context);
    
    try {
      const response = await this.localAI.generateText(prompt, {
        maxTokens: this.phi3Profile.maxOutputTokens
      });

      if (response) {
        return this.parseSection(response, sectionType);
      }
    } catch (error) {
      console.warn(`[HYBRID-CG] Phi-3 section generation failed:`, error.message);
    }

    return this.generateSectionFallback(sectionType, sectionIndex, context);
  }

  buildComplexSectionPrompt(sectionType, sectionIndex, context) {
    const { theme, intent, keywords } = context;
    
    return `Write an expert-level section for an SEO article about "${theme}".

Section type: ${sectionType}
Section index: ${sectionIndex}
Topic: ${theme}
Keywords: ${keywords?.join(', ') || 'none'}

Requirements:
- Expert-level, in-depth content
- 800-1200 words
- Include real examples, data, statistics
- Actionable advice and best practices
- Professional, authoritative tone
- Format: Markdown

Output JSON:
{
  "heading": "Section Heading",
  "content": "Section content in markdown format..."
}`;
  }

  buildSimpleSectionPrompt(sectionType, sectionIndex, context) {
    const { theme, intent, keywords } = context;
    
    return `Write ONE section of an article about "${theme}".

Section type: ${sectionType}
Section index: ${sectionIndex}
Topic: ${theme}
Keywords: ${keywords?.join(', ') || 'none'}

Requirements:
- Section heading (H2): Clear, descriptive, keyword-rich
- Content: 300-500 words, expert-level, detailed
- Include: Real examples, data, actionable advice
- Tone: Professional, authoritative, engaging
- Format: Markdown

Output JSON:
{
  "heading": "Section Heading",
  "content": "Section content in markdown format..."
}`;
  }

  /**
   * Генерация таблицы (DeepSeek)
   */
  async generateTable(tableType, context) {
    const prompt = this.buildTablePrompt(tableType, context);
    
    if (!this.deepseekAI) {
      return this.generateTableFallback(tableType, context);
    }

    try {
      const response = await this.deepseekAI.generateText(prompt, {
        maxTokens: 1500
      });

      if (response) {
        return this.parseTable(response, tableType);
      }
    } catch (error) {
      console.warn(`[HYBRID-CG] Table generation failed:`, error.message);
    }

    return this.generateTableFallback(tableType, context);
  }

  buildTablePrompt(tableType, context) {
    return `Create a comprehensive Markdown table about "${context.theme}" for type "${tableType}".

Requirements:
- 4-6 columns
- 8-12 rows
- Clear, descriptive headers
- Relevant, accurate data
- Include examples and comparisons

Output JSON:
{
  "title": "Table Title",
  "headers": ["Header1", "Header2", "Header3", "Header4"],
  "rows": [["Data1", "Data2", "Data3", "Data4"], ...]
}`;
  }

  /**
   * Генерация FAQ (DeepSeek)
   */
  async generateFAQBlock(questionsCount, context) {
    const prompt = this.buildFAQPrompt(questionsCount, context);
    
    if (!this.deepseekAI) {
      return this.generateFAQFallback(questionsCount, context);
    }

    try {
      const response = await this.deepseekAI.generateText(prompt, {
        maxTokens: 2500
      });

      if (response) {
        return this.parseFAQ(response);
      }
    } catch (error) {
      console.warn(`[HYBRID-CG] FAQ generation failed:`, error.message);
    }

    return this.generateFAQFallback(questionsCount, context);
  }

  buildFAQPrompt(questionsCount, context) {
    return `Generate ${questionsCount} comprehensive FAQ questions and answers about "${context.theme}".

Requirements:
- Questions: Clear, common, relevant, user-focused
- Answers: 300-500 words each, detailed, expert-level
- Include examples, data, actionable advice
- Professional, helpful tone

Output JSON:
{
  "questions": [
    {"q": "Question 1?", "a": "Comprehensive answer 1..."},
    {"q": "Question 2?", "a": "Comprehensive answer 2..."}
  ]
}`;
  }

  /**
   * Генерация заключения (DeepSeek)
   */
  async generateConclusion(sections, context) {
    const prompt = this.buildConclusionPrompt(sections, context);
    
    if (!this.deepseekAI) {
      return this.generateConclusionFallback(context);
    }

    try {
      const response = await this.deepseekAI.generateText(prompt, {
        maxTokens: this.deepseekProfile.maxOutputTokens
      });

      if (response) {
        return this.parseSection(response, 'conclusion');
      }
    } catch (error) {
      console.warn('[HYBRID-CG] Conclusion generation failed, using fallback:', error.message);
    }

    return this.generateConclusionFallback(context);
  }

  buildConclusionPrompt(sections, context) {
    const sectionSummaries = sections.slice(0, 5).map(s => s.heading).join(', ');
    
    return `Write a compelling conclusion for an SEO article about "${context.theme}".

Article covered: ${sectionSummaries}
Topic: ${context.theme}

Requirements:
- Summarize key points
- Reinforce main message
- Include call-to-action
- 400-600 words
- Professional, authoritative tone

Output JSON:
{
  "heading": "Conclusion Heading",
  "content": "Conclusion content in markdown format..."
}`;
  }

  /**
   * Парсинг секции
   */
  parseSection(response, sectionType) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          type: 'main',
          heading: parsed.heading || `Section ${sectionType}`,
          content: parsed.content || ''
        };
      }
    } catch (error) {
      console.warn('[HYBRID-CG] Failed to parse section:', error.message);
    }

    return {
      type: 'main',
      heading: `Section ${sectionType}`,
      content: response.substring(0, 1000)
    };
  }

  /**
   * Парсинг таблицы
   */
  parseTable(response, tableType) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          type: 'table',
          title: parsed.title || `Table: ${tableType}`,
          headers: parsed.headers || [],
          rows: parsed.rows || []
        };
      }
    } catch (error) {
      console.warn('[HYBRID-CG] Failed to parse table:', error.message);
    }

    return null;
  }

  /**
   * Парсинг FAQ
   */
  parseFAQ(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          type: 'faq',
          questions: parsed.questions || []
        };
      }
    } catch (error) {
      console.warn('[HYBRID-CG] Failed to parse FAQ:', error.message);
    }

    return { type: 'faq', questions: [] };
  }

  /**
   * Fallback методы
   */
  generateIntroductionFallback(context) {
    return {
      type: 'main',
      heading: `Introduction: ${context.theme}`,
      content: `Welcome to our comprehensive guide about ${context.theme}. This article will provide you with expert insights and detailed information.`
    };
  }

  generateSectionFallback(sectionType, sectionIndex, context) {
    return {
      type: 'main',
      heading: `${context.theme} - Section ${sectionIndex}`,
      content: `This section covers important aspects of ${context.theme}.`
    };
  }

  generateTableFallback(tableType, context) {
    return {
      type: 'table',
      title: `Table: ${tableType}`,
      headers: ['Column 1', 'Column 2', 'Column 3'],
      rows: [
        ['Data 1', 'Data 2', 'Data 3'],
        ['Data 4', 'Data 5', 'Data 6']
      ]
    };
  }

  generateFAQFallback(questionsCount, context) {
    const questions = [];
    for (let i = 1; i <= questionsCount; i++) {
      questions.push({
        q: `What is ${context.theme}?`,
        a: `${context.theme} is an important topic that requires expert understanding.`
      });
    }
    return { type: 'faq', questions };
  }

  generateConclusionFallback(context) {
    return {
      type: 'main',
      heading: `Conclusion: ${context.theme}`,
      content: `In conclusion, ${context.theme} is an important topic that requires careful consideration and expert knowledge.`
    };
  }

  /**
   * Генерация полной страницы (гибридный подход)
   */
  async generatePage(priority, context) {
    const sections = [];
    const tables = [];
    const faqBlocks = [];

    console.log('[HYBRID-CG] Starting page generation...');

    // 1. Введение (DeepSeek)
    console.log('[HYBRID-CG] Generating introduction (DeepSeek)...');
    const intro = await this.generateIntroduction(context);
    sections.push(intro);

    // 2. Основные секции (10 секций)
    console.log('[HYBRID-CG] Generating main sections...');
    for (let i = 1; i <= 10; i++) {
      const provider = (i <= 2 || i >= 9) ? 'DeepSeek' : 'Phi-3';
      console.log(`[HYBRID-CG] Generating section ${i} (${provider})...`);
      const section = await this.generateSection('main', i, context);
      sections.push(section);
    }

    // 3. Таблицы (2 таблицы, DeepSeek)
    console.log('[HYBRID-CG] Generating tables (DeepSeek)...');
    for (let i = 0; i < 2; i++) {
      const table = await this.generateTable(`table-${i}`, context);
      if (table) {
        tables.push(table);
      }
    }

    // 4. FAQ (15 вопросов, DeepSeek, по 5 за раз)
    console.log('[HYBRID-CG] Generating FAQ (DeepSeek)...');
    const totalFAQ = 15;
    const faqBlocksCount = Math.ceil(totalFAQ / 5);
    for (let i = 0; i < faqBlocksCount; i++) {
      const faqBlock = await this.generateFAQBlock(5, context);
      if (faqBlock && faqBlock.questions) {
        faqBlocks.push(...faqBlock.questions);
      }
    }

    // 5. Заключение (DeepSeek)
    console.log('[HYBRID-CG] Generating conclusion (DeepSeek)...');
    const conclusion = await this.generateConclusion(sections, context);
    sections.push(conclusion);

    // 6. Сборка финальной страницы
    console.log('[HYBRID-CG] Building final page...');
    return this.buildPage(sections, tables, faqBlocks, context);
  }

  /**
   * Сборка HTML страницы
   */
  buildPage(sections, tables, faqQuestions, context) {
    const { theme, intent, keywords } = context;
    
    const title = `${theme} - Complete Guide | VINTrusted`;
    const h1 = `Complete Guide to ${theme}`;
    const metaDescription = `Learn everything about ${theme}. Expert guide with detailed information, examples, and best practices.`;

    const html = this.renderHTML(title, h1, metaDescription, sections, tables, faqQuestions, context);

    return {
      title,
      h1,
      metaDescription,
      sections,
      tables,
      faqQuestions,
      html,
      wordCount: this.calculateWordCount(sections, tables, faqQuestions),
      qualityScore: this.calculateQualityScore(sections, tables, faqQuestions)
    };
  }

  calculateWordCount(sections, tables, faqQuestions) {
    let words = 0;
    
    sections.forEach(s => {
      words += (s.content || '').split(/\s+/).length;
    });
    
    faqQuestions.forEach(q => {
      words += (q.a || '').split(/\s+/).length;
    });

    return words;
  }

  calculateQualityScore(sections, tables, faqQuestions) {
    let score = 0;
    
    if (sections.length >= 8) score += 0.3;
    if (sections.length >= 12) score += 0.1;
    if (tables.length >= 2) score += 0.2;
    if (faqQuestions.length >= 10) score += 0.2;
    
    const wordCount = this.calculateWordCount(sections, tables, faqQuestions);
    if (wordCount >= 3000) score += 0.2;

    return Math.min(score, 1.0);
  }

  renderHTML(title, h1, metaDescription, sections, tables, faqQuestions, context) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${metaDescription}">
    <meta name="keywords" content="${context.keywords?.join(', ') || ''}">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
        }
        h2 {
            color: #34495e;
            margin-top: 40px;
        }
        h3 {
            color: #555;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        th {
            background-color: #3498db;
            color: white;
        }
        .faq {
            margin-top: 40px;
        }
        .faq-item {
            margin-bottom: 30px;
        }
        .faq-question {
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <h1>${h1}</h1>
    ${sections.map(s => `<section><h2>${s.heading}</h2><div>${s.content}</div></section>`).join('\n')}
    ${tables.map(t => this.renderTable(t)).join('\n')}
    <section class="faq">
        <h2>Frequently Asked Questions</h2>
        ${faqQuestions.map(q => `<div class="faq-item"><div class="faq-question">${q.q}</div><div>${q.a}</div></div>`).join('\n')}
    </section>
</body>
</html>`;
  }

  renderTable(table) {
    if (!table.headers || !table.rows) return '';
    
    let html = `<h3>${table.title}</h3><table><thead><tr>`;
    table.headers.forEach(h => html += `<th>${h}</th>`);
    html += `</tr></thead><tbody>`;
    
    table.rows.forEach(row => {
      html += `<tr>`;
      row.forEach(cell => html += `<td>${cell}</td>`);
      html += `</tr>`;
    });
    
    html += `</tbody></table>`;
    return html;
  }

  /**
   * Сохранение страницы
   */
  async savePage(page, slug) {
    const pageDir = path.join(this.outputPath, slug);
    if (!fs.existsSync(pageDir)) {
      fs.mkdirSync(pageDir, { recursive: true });
    }

    const htmlPath = path.join(pageDir, 'index.html');
    fs.writeFileSync(htmlPath, page.html, 'utf8');

    return {
      path: htmlPath,
      slug,
      url: `/seo-pages/${slug}/`,
      wordCount: page.wordCount,
      qualityScore: page.qualityScore
    };
  }
}

module.exports = HybridContentGenerator;



















