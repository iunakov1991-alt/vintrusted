/**
 * MONSTER 7.1 — SECTIONED CONTENT GENERATOR
 * 
 * ТРИЗ-принцип "ДРОБЛЕНИЕ":
 * - Один AI-вызов = одна структурная единица (секция, таблица, сценарий, FAQ-блок)
 * - Финальная HTML-страница собирается локально (JS), без участия AI
 * 
 * Профиль Phi-3:
 * - maxInputTokens: 300-500
 * - maxOutputTokens: 600-1000
 * - callsPerPage: 10-15 (8-12 секций + 2-3 таблицы/сценария)
 */

const fs = require('fs');
const path = require('path');

class SectionedContentGenerator {
  constructor(config) {
    this.config = config;
    this.outputPath = path.join(process.cwd(), 'public/seo-pages');
    this.phi3Profile = config.phi3Profile || {
      maxInputTokens: 500,
      maxOutputTokens: 1000,
      callsPerPage: 15,
      timeout: 60000
    };
    this.localAI = null;
    this.initLocalAI();
  }

  initLocalAI() {
    try {
      const localAIPath = path.join(process.cwd(), 'scripts', 'seo', 'ai', 'local-ai-provider.js');
      const LocalAIProviderModule = require(localAIPath);
      const LocalAIProvider = LocalAIProviderModule.LocalAIProvider || LocalAIProviderModule;
      this.localAI = new LocalAIProvider({
        localAIModel: this.config.modules?.aiKnowledgeCore?.model || 'phi3'
      });
    } catch (error) {
      console.warn('[SECTIONED-CG] LocalAIProvider not available:', error.message);
    }
  }

  /**
   * Генерация одной секции статьи
   */
  async generateSection(sectionType, sectionIndex, context) {
    const prompt = this.buildSectionPrompt(sectionType, sectionIndex, context);
    
    if (!this.localAI) {
      return this.generateSectionFallback(sectionType, sectionIndex, context);
    }

    try {
      const response = await this.localAI.generateText(prompt, {
        maxTokens: this.phi3Profile.maxOutputTokens
      });

      if (response) {
        return this.parseSection(response, sectionType);
      }
    } catch (error) {
      console.warn(`[SECTIONED-CG] Section generation failed, using fallback:`, error.message);
    }

    return this.generateSectionFallback(sectionType, sectionIndex, context);
  }

  /**
   * Промпт для одной секции (короткий, 300-500 токенов)
   */
  buildSectionPrompt(sectionType, sectionIndex, context) {
    const { theme, intent, keywords } = context;
    
    return `You are an expert SEO content writer. Write ONE section of an article about "${theme}".

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
   * Парсинг ответа AI для секции
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
      console.warn('[SECTIONED-CG] Failed to parse section:', error.message);
    }

    return {
      type: 'main',
      heading: `Section ${sectionType}`,
      content: response.substring(0, 500) // Fallback: первые 500 символов
    };
  }

  /**
   * Fallback генерация секции (без AI)
   */
  generateSectionFallback(sectionType, sectionIndex, context) {
    return {
      type: 'main',
      heading: `${context.theme} - Section ${sectionIndex}`,
      content: `This section covers important aspects of ${context.theme}.`
    };
  }

  /**
   * Генерация таблицы
   */
  async generateTable(tableType, context) {
    const prompt = this.buildTablePrompt(tableType, context);
    
    if (!this.localAI) {
      return this.generateTableFallback(tableType, context);
    }

    try {
      const response = await this.localAI.generateText(prompt, {
        maxTokens: 600
      });

      if (response) {
        return this.parseTable(response, tableType);
      }
    } catch (error) {
      console.warn(`[SECTIONED-CG] Table generation failed:`, error.message);
    }

    return this.generateTableFallback(tableType, context);
  }

  /**
   * Промпт для таблицы (короткий)
   */
  buildTablePrompt(tableType, context) {
    return `Create a Markdown table about "${context.theme}" for type "${tableType}".

Requirements:
- 3-5 columns
- 5-8 rows
- Clear headers
- Relevant data

Output JSON:
{
  "title": "Table Title",
  "headers": ["Header1", "Header2", "Header3"],
  "rows": [["Data1", "Data2", "Data3"], ...]
}`;
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
      console.warn('[SECTIONED-CG] Failed to parse table:', error.message);
    }

    return null;
  }

  /**
   * Fallback генерация таблицы
   */
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

  /**
   * Генерация FAQ блока (5 вопросов за раз)
   */
  async generateFAQBlock(questionsCount, context) {
    const prompt = this.buildFAQPrompt(questionsCount, context);
    
    if (!this.localAI) {
      return this.generateFAQFallback(questionsCount, context);
    }

    try {
      const response = await this.localAI.generateText(prompt, {
        maxTokens: 1200
      });

      if (response) {
        return this.parseFAQ(response);
      }
    } catch (error) {
      console.warn(`[SECTIONED-CG] FAQ generation failed:`, error.message);
    }

    return this.generateFAQFallback(questionsCount, context);
  }

  /**
   * Промпт для FAQ (5 вопросов)
   */
  buildFAQPrompt(questionsCount, context) {
    return `Generate ${questionsCount} FAQ questions and answers about "${context.theme}".

Requirements:
- Questions: Clear, common, relevant
- Answers: 100-200 words each, detailed, expert-level
- Include examples where relevant

Output JSON:
{
  "questions": [
    {"q": "Question 1?", "a": "Answer 1..."},
    {"q": "Question 2?", "a": "Answer 2..."}
  ]
}`;
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
      console.warn('[SECTIONED-CG] Failed to parse FAQ:', error.message);
    }

    return { type: 'faq', questions: [] };
  }

  /**
   * Fallback генерация FAQ
   */
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

  /**
   * Генерация полной страницы (по секциям)
   */
  async generatePage(priority, context) {
    const sections = [];
    const tables = [];
    const faqBlocks = [];

    // 1. Генерация введения
    const intro = await this.generateSection('introduction', 0, context);
    sections.push(intro);

    // 2. Генерация основных секций (8-12)
    const mainSectionsCount = 10; // Среднее между 8 и 12
    for (let i = 1; i <= mainSectionsCount; i++) {
      const section = await this.generateSection('main', i, context);
      sections.push(section);
    }

    // 3. Генерация таблиц (2-3)
    const tablesCount = 2;
    for (let i = 0; i < tablesCount; i++) {
      const table = await this.generateTable(`table-${i}`, context);
      if (table) {
        tables.push(table);
      }
    }

    // 4. Генерация FAQ (10-15 вопросов, по 5 за раз)
    const totalFAQ = 12;
    const faqBlocksCount = Math.ceil(totalFAQ / 5);
    for (let i = 0; i < faqBlocksCount; i++) {
      const faqBlock = await this.generateFAQBlock(5, context);
      if (faqBlock && faqBlock.questions) {
        faqBlocks.push(...faqBlock.questions);
      }
    }

    // 5. Сборка финальной страницы (без AI)
    return this.buildPage(sections, tables, faqBlocks, context);
  }

  /**
   * Сборка HTML страницы из частей (локально, без AI)
   */
  buildPage(sections, tables, faqQuestions, context) {
    const { theme, intent, keywords } = context;
    
    // Генерация мета-данных
    const title = `${theme} - Complete Guide | VINTrusted`;
    const h1 = `Complete Guide to ${theme}`;
    const metaDescription = `Learn everything about ${theme}. Expert guide with detailed information, examples, and best practices.`;

    // Сборка HTML
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

  /**
   * Подсчёт слов
   */
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

  /**
   * Расчёт качества (минимальный)
   */
  calculateQualityScore(sections, tables, faqQuestions) {
    let score = 0;
    
    // Базовые проверки
    if (sections.length >= 8) score += 0.3;
    if (sections.length >= 12) score += 0.1;
    if (tables.length >= 2) score += 0.2;
    if (faqQuestions.length >= 10) score += 0.2;
    
    const wordCount = this.calculateWordCount(sections, tables, faqQuestions);
    if (wordCount >= 3000) score += 0.2;

    return Math.min(score, 1.0);
  }

  /**
   * Рендеринг HTML (использует существующий шаблон)
   */
  renderHTML(title, h1, metaDescription, sections, tables, faqQuestions, context) {
    // Используем существующий метод из content-generator.js
    // Или создаём упрощённую версию
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${metaDescription}">
</head>
<body>
    <h1>${h1}</h1>
    ${sections.map(s => `<section><h2>${s.heading}</h2>${s.content}</section>`).join('\n')}
    ${tables.map(t => this.renderTable(t)).join('\n')}
    <section class="faq">
        <h2>Frequently Asked Questions</h2>
        ${faqQuestions.map(q => `<div><h3>${q.q}</h3><p>${q.a}</p></div>`).join('\n')}
    </section>
</body>
</html>`;
  }

  /**
   * Рендеринг таблицы
   */
  renderTable(table) {
    if (!table.headers || !table.rows) return '';
    
    let html = `<table><thead><tr>`;
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
      wordCount: page.wordCount,
      qualityScore: page.qualityScore
    };
  }
}

module.exports = SectionedContentGenerator;
















