/**
 * MONSTER 7.1 — OPTIMIZED SECTIONED CONTENT GENERATOR
 * 
 * ТРИЗ-оптимизации для ускорения без потери качества:
 * 1. Параллелизация секций (принцип "Динамичность")
 * 2. Кэширование повторяющихся частей (принцип "Использование ресурсов")
 * 3. Умная очередь с приоритетами (принцип "Обратная связь")
 */

const fs = require('fs');
const path = require('path');

class OptimizedSectionedContentGenerator {
  constructor(config) {
    this.config = config;
    this.outputPath = path.join(process.cwd(), 'public/seo-pages');
    this.phi3Profile = config.phi3Profile || {
      maxInputTokens: 500,
      maxOutputTokens: 1000,
      callsPerPage: 15,
      timeout: 60000
    };
    
    // M1 оптимизация: количество параллельных вызовов
    this.parallelLimit = config.m1Limits?.maxConcurrency || 2;
    
    // Кэш для повторяющихся секций
    const SectionCache = require('../utils/section-cache');
    this.sectionCache = new SectionCache(config);
    
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
      console.warn('[OPTIMIZED-CG] LocalAIProvider not available:', error.message);
    }
  }

  /**
   * Генерация секции с кэшированием
   */
  async generateSection(sectionType, sectionIndex, context) {
    // Используем кэш для повторяющихся секций
    return await this.sectionCache.getOrGenerate(
      sectionType,
      context,
      async (type, ctx) => {
        return await this.generateSectionInternal(type, sectionIndex, ctx);
      }
    );
  }

  /**
   * Внутренняя генерация секции (без кэша)
   */
  async generateSectionInternal(sectionType, sectionIndex, context) {
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
      console.warn(`[OPTIMIZED-CG] Section generation failed:`, error.message);
    }

    return this.generateSectionFallback(sectionType, sectionIndex, context);
  }

  /**
   * Параллельная генерация секций (батчами)
   */
  async generateSectionsParallel(sectionType, count, context, batchSize = null) {
    const batch = batchSize || this.parallelLimit;
    const sections = [];

    // Генерируем секции батчами
    for (let i = 0; i < count; i += batch) {
      const batchPromises = [];
      
      for (let j = 0; j < batch && (i + j) < count; j++) {
        const sectionIndex = i + j + 1;
        batchPromises.push(this.generateSection(sectionType, sectionIndex, context));
      }
      
      // Параллельная генерация батча
      const batchResults = await Promise.all(batchPromises);
      sections.push(...batchResults);
      
      console.log(`[OPTIMIZED-CG] Generated batch ${Math.floor(i / batch) + 1}: ${batchResults.length} sections`);
    }

    return sections;
  }

  /**
   * Генерация полной страницы (оптимизированная)
   */
  async generatePage(priority, context) {
    const startTime = Date.now();
    
    // 1. Критические секции (генерируем первыми, последовательно)
    console.log('[OPTIMIZED-CG] Generating critical sections...');
    const intro = await this.generateSection('introduction', 0, context);
    const firstSection = await this.generateSection('main', 1, context);
    const secondSection = await this.generateSection('main', 2, context);
    
    const criticalSections = [intro, firstSection, secondSection];
    console.log(`[OPTIMIZED-CG] Critical sections done: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);

    // 2. Остальные секции (параллельно, батчами)
    console.log('[OPTIMIZED-CG] Generating remaining sections in parallel...');
    const remainingSections = await this.generateSectionsParallel('main', 8, context, this.parallelLimit);
    const allSections = [...criticalSections, ...remainingSections];
    console.log(`[OPTIMIZED-CG] All sections done: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);

    // 3. Таблицы и FAQ (параллельно)
    console.log('[OPTIMIZED-CG] Generating tables and FAQ in parallel...');
    const [tables, faqBlocks] = await Promise.all([
      // Таблицы параллельно
      Promise.all([
        this.generateTable('table-0', context),
        this.generateTable('table-1', context)
      ]),
      // FAQ блоки параллельно
      Promise.all([
        this.generateFAQBlock(5, context),
        this.generateFAQBlock(5, context),
        this.generateFAQBlock(2, context)
      ])
    ]);
    
    const faqQuestions = faqBlocks.flatMap(block => block.questions || []);
    console.log(`[OPTIMIZED-CG] Tables and FAQ done: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);

    // 4. Сборка финальной страницы (без AI)
    const page = this.buildPage(allSections, tables.filter(Boolean), faqQuestions, context);
    
    const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
    console.log(`[OPTIMIZED-CG] Page generation completed in ${totalTime} minutes`);

    return page;
  }

  /**
   * Промпт для секции (адаптивный)
   */
  buildSectionPrompt(sectionType, sectionIndex, context) {
    const { theme, intent, keywords } = context;
    
    // Адаптивные промпты в зависимости от важности
    let promptDetail = 'detailed';
    if (sectionIndex <= 3) {
      promptDetail = 'very detailed'; // Первые секции — детальные
    } else if (sectionIndex <= 7) {
      promptDetail = 'detailed'; // Средние секции — стандартные
    } else {
      promptDetail = 'concise'; // Последние секции — короткие (быстрее)
    }
    
    return `You are an expert SEO content writer. Write ONE section of an article about "${theme}".

Section type: ${sectionType}
Section index: ${sectionIndex}
Topic: ${theme}
Keywords: ${keywords?.join(', ') || 'none'}
Detail level: ${promptDetail}

Requirements:
- Section heading (H2): Clear, descriptive, keyword-rich
- Content: ${promptDetail === 'very detailed' ? '400-500' : promptDetail === 'detailed' ? '300-400' : '250-350'} words, expert-level
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
   * Генерация таблицы (из базового класса)
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
      console.warn(`[OPTIMIZED-CG] Table generation failed:`, error.message);
    }

    return this.generateTableFallback(tableType, context);
  }

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
      console.warn('[OPTIMIZED-CG] Failed to parse table:', error.message);
    }
    return null;
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

  /**
   * Генерация FAQ блока (из базового класса)
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
      console.warn(`[OPTIMIZED-CG] FAQ generation failed:`, error.message);
    }

    return this.generateFAQFallback(questionsCount, context);
  }

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
      console.warn('[OPTIMIZED-CG] Failed to parse FAQ:', error.message);
    }
    return { type: 'faq', questions: [] };
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

  /**
   * Парсинг секции (из базового класса)
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
      console.warn('[OPTIMIZED-CG] Failed to parse section:', error.message);
    }

    return {
      type: 'main',
      heading: `Section ${sectionType}`,
      content: response.substring(0, 500)
    };
  }

  generateSectionFallback(sectionType, sectionIndex, context) {
    return {
      type: 'main',
      heading: `${context.theme} - Section ${sectionIndex}`,
      content: `This section covers important aspects of ${context.theme}.`
    };
  }

  /**
   * Сборка HTML страницы (из базового класса)
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

  async savePage(page, slug) {
    const fs = require('fs');
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

module.exports = OptimizedSectionedContentGenerator;

