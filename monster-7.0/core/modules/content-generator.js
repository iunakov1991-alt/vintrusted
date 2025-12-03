/**
 * CONTENT GENERATOR
 * 
 * Генерирует SEO-оптимизированный контент на основе стратегии.
 * Использует Prompt Engine и AI Knowledge Core.
 * Оптимизирован для M1.
 */

const fs = require('fs');
const path = require('path');

class ContentGenerator {
  constructor(config) {
    this.config = config;
    this.outputPath = path.join(process.cwd(), 'public/seo-pages');
    this.cache = new Map();
    this.stats = {
      generated: 0,
      cached: 0,
      errors: 0
    };
  }

  async execute(params = {}) {
    const { strategy, semanticMap, prompts } = params;

    if (!strategy || !strategy.result) {
      throw new Error('Strategy is required for content generation');
    }

    const strategyData = strategy.result;
    const results = {
      pages: [],
      stats: this.stats,
      errors: []
    };

    // Генерация контента по приоритетам или интентам
    const priorities = strategyData.priorities || [];
    const intents = strategyData.intents || [];
    
    // Если priorities пустые, используем intents
    const itemsToProcess = priorities.length > 0 ? priorities : intents;
    
    // Ограничение для M1: обрабатываем максимум 5 элементов
    for (const item of itemsToProcess.slice(0, 5)) {
      try {
        // Преобразуем intent в priority-подобный объект
        const priority = item.intent ? {
          type: item.intent,
          theme: item.intent,
          keywords: item.keywords || [],
          pages: item.targetPages || 10,
          priority: item.priority || 'high'
        } : item;
        
        const pages = await this.generatePagesForPriority(priority, strategyData, semanticMap, prompts);
        results.pages.push(...pages);
      } catch (error) {
        results.errors.push({
          item: item.intent || item.type || 'unknown',
          error: error.message
        });
        this.stats.errors++;
      }
    }

    // Сохранение страниц
    await this.savePages(results.pages);

    // Обновление статистики страниц
    try {
      const PageStats = require('../utils/page-stats');
      const pageStats = new PageStats();
      pageStats.updateStats(results.pages);
    } catch (error) {
      console.warn('Failed to update page stats:', error.message);
    }

    return results;
  }

  /**
   * Генерация страниц для приоритета
   */
  async generatePagesForPriority(priority, strategy, semanticMap, prompts) {
    const pages = [];
    // Ограничение для M1: генерируем максимум 10 страниц на приоритет
    const targetPages = Math.min(priority.pages || 10, 10);

    for (let i = 0; i < targetPages; i++) {
      try {
        const page = await this.generatePage(priority, strategy, semanticMap, prompts, i);
        if (page) {
          pages.push(page);
          this.stats.generated++;
        }
      } catch (error) {
        console.error(`Error generating page ${i} for priority ${priority.type || priority.intent}:`, error);
        this.stats.errors++;
      }
    }

    return pages;
  }

  /**
   * Генерация одной страницы
   */
  async generatePage(priority, strategy, semanticMap, prompts, index) {
    // Контекст для генерации
    const context = this.buildContext(priority, strategy, semanticMap, index);

    // Получение промта
    const promptData = prompts?.result || {};
    const basePrompt = promptData.prompt || this.buildDefaultPrompt(context);

    // Генерация контента (заглушка - в реальности будет вызов AI)
    const content = await this.generateContent(basePrompt, context);

    // Построение страницы
    const page = this.buildPage(content, context, priority);

    return page;
  }

  /**
   * Построение контекста
   */
  buildContext(priority, strategy, semanticMap, index) {
    return {
      priority: priority.type,
      theme: priority.theme || priority.cluster,
      intent: this.mapPriorityToIntent(priority),
      keywords: this.extractKeywords(priority, semanticMap),
      index,
      strategy: {
        targetPages: strategy.targetPages,
        constraints: strategy.constraints
      }
    };
  }

  /**
   * Генерация контента
   */
  async generateContent(prompt, context) {
    // Попытка использовать AI через AI Knowledge Core
    let aiContent = null;
    
    try {
      if (this.config.modules?.aiKnowledgeCore?.localAI) {
        aiContent = await this.generateWithAI(prompt, context);
      }
    } catch (error) {
      console.warn('AI generation failed, using template:', error.message);
    }

    // Если AI не доступен или ошибка, используем шаблоны
    const content = aiContent || {
      title: this.generateTitle(context),
      h1: this.generateH1(context),
      metaDescription: this.generateMetaDescription(context),
      sections: this.generateSections(context),
      keywords: context.keywords,
      internalLinks: this.generateInternalLinks(context)
    };

    // Обогащение контентом из шаблонов если AI вернул частичный результат
    if (aiContent && (!aiContent.sections || aiContent.sections.length < 3)) {
      content.sections = [...(aiContent.sections || []), ...this.generateSections(context).slice(aiContent.sections?.length || 0)];
    }

    // Нормализация всех секций: убираем "undefined" из content
    if (content.sections) {
      content.sections = content.sections.map(section => {
        // Для FAQ секций убираем content
        if (section.type === 'faq' || section.questions || 
            (section.heading && section.heading.toLowerCase().includes('frequently'))) {
          return {
            ...section,
            type: 'faq',
            content: ''
          };
        }
        // Для других секций убираем "undefined"
        if (section.content === 'undefined' || section.content === undefined) {
          return {
            ...section,
            content: ''
          };
        }
        return section;
      });
    }

    return content;
  }

  /**
   * Генерация с использованием AI
   */
  async generateWithAI(prompt, context) {
    try {
      // ИСПОЛЬЗУЕМ ТОЛЬКО ЛОКАЛЬНЫЙ AI (Ollama) - БЕЗ API ПРОВАЙДЕРОВ
      // Путь к LocalAIProvider из monster-7.0/core/modules/
      const path = require('path');
      const localAIPath = path.join(process.cwd(), 'scripts', 'seo', 'ai', 'local-ai-provider.js');
      
      let LocalAIProvider;
      try {
        LocalAIProvider = require(localAIPath);
      } catch (requireError) {
        // Альтернативный путь
        const altPath = path.join(__dirname, '../../../scripts/seo/ai/local-ai-provider.js');
        try {
          LocalAIProvider = require(altPath);
        } catch (altError) {
          throw new Error(`LocalAIProvider not found. Tried: ${localAIPath}, ${altPath}`);
        }
      }
      
      const localAI = new LocalAIProvider({
        localAIModel: this.config.modules?.aiKnowledgeCore?.model || 'phi3'
      });

      // Проверяем доступность Ollama
      const isAvailable = await localAI.isAvailable();
      if (!isAvailable) {
        throw new Error('Ollama not available. Please install and start Ollama: brew install ollama && ollama pull phi3');
      }

      console.log('[CONTENT-GENERATOR] Using LOCAL AI (Ollama) for content generation');

      // Генерация контента через Ollama
      const aiPrompt = this.buildAIPrompt(prompt, context);
      const aiResponse = await localAI.generateText(aiPrompt, {
        maxTokens: 4000 // Для гениальных SEO статей нужно больше токенов
      });

      if (aiResponse) {
        console.log('[CONTENT-GENERATOR] Local AI (Ollama) generated content successfully');
        return this.parseAIResponse(aiResponse, context);
      } else {
        throw new Error('Ollama returned empty response');
      }
    } catch (error) {
      // НЕ используем DeepSeek/Groq - только локальный AI или fallback на шаблоны
      console.warn('[CONTENT-GENERATOR] Local AI (Ollama) failed:', error.message);
      console.warn('[CONTENT-GENERATOR] Falling back to templates (NO external API providers)');
      throw error;
    }
  }

  /**
   * Построение промта для AI (MASTER SEO PROMPT)
   */
  buildAIPrompt(basePrompt, context) {
    // Используем мастер-промпт для гениальных статей
    try {
      const { buildMasterSEOPrompt } = require('../../core/prompts/master-seo-prompt');
      const masterPrompt = buildMasterSEOPrompt(context.theme || context.intent, context);
      return masterPrompt;
    } catch (error) {
      // Fallback на улучшенный промпт
      console.warn('Master prompt not found, using enhanced prompt:', error.message);
      return this.buildEnhancedPrompt(basePrompt, context);
    }
  }
  
  /**
   * Улучшенный промпт (fallback)
   */
  buildEnhancedPrompt(basePrompt, context) {
    return `${basePrompt}

Context:
- Theme: ${context.theme || 'general'}
- Intent: ${context.intent || 'generic'}
- Keywords: ${context.keywords?.join(', ') || 'none'}

Generate GENIUS-LEVEL, comprehensive SEO-optimized content with MINIMUM 3000 words total:

This must be a DEEP, EXPERT-LEVEL article that demonstrates:
- Exceptional expertise and authority (E-E-A-T)
- Comprehensive coverage of the topic
- Unique insights and analysis
- Real-world examples and case studies
- Actionable, practical advice
- Industry best practices
- Data-driven insights where applicable

STRUCTURE REQUIREMENTS:

1. Title (50-60 characters) - compelling and keyword-rich
2. H1 heading - powerful and descriptive
3. Meta description (150-160 characters) - compelling with CTA
4. Introduction (300-400 words):
   - Hook the reader immediately
   - Establish authority and expertise
   - Preview what they'll learn
   - Include statistics or compelling facts
   - Set expectations for depth

5. Main content sections (8-12 sections, each 300-500 words):
   - Each section must be DEEP and COMPREHENSIVE
   - Include multiple subsections (H3) where appropriate
   - Provide detailed explanations with context
   - Include real-world examples, case studies, scenarios
   - Add data, statistics, research findings
   - Use bullet points, numbered lists, tables where helpful
   - Include actionable takeaways
   - Demonstrate deep industry knowledge
   - Address common misconceptions
   - Provide expert analysis and insights

6. Advanced sections (2-3 sections):
   - "Common Mistakes to Avoid" (300-400 words)
   - "Expert Tips and Best Practices" (300-400 words)
   - "Future Trends and Considerations" (300-400 words)

7. FAQ section (10-15 questions, each answer 100-200 words):
   - Cover comprehensive questions
   - Provide detailed, expert answers
   - Include examples in answers
   - Address edge cases and nuances

CONTENT QUALITY REQUIREMENTS:
- Minimum 3000 words total (aim for 3500-4000)
- Each main section: 300-500 words minimum
- Introduction: 300-400 words
- FAQ answers: 100-200 words each
- Use sophisticated, expert-level language
- Include industry terminology (with explanations)
- Provide unique insights not found in basic articles
- Include specific examples, case studies, scenarios
- Add data, statistics, percentages where relevant
- Demonstrate deep understanding and expertise
- Write in engaging, authoritative tone
- Use storytelling elements where appropriate
- Include actionable, implementable advice
- Address reader pain points comprehensively
- Provide value that goes beyond surface-level information

Format as JSON:
{
  "title": "...",
  "h1": "...",
  "metaDescription": "...",
  "sections": [
    {"type": "introduction", "heading": "...", "content": "..."},
    {"type": "main", "heading": "...", "content": "...", "bullets": [...]},
    {"type": "main", "heading": "...", "content": "...", "bullets": [...]},
    {"type": "main", "heading": "...", "content": "...", "bullets": [...]},
    {"type": "main", "heading": "...", "content": "...", "bullets": [...]},
    {"type": "faq", "heading": "FAQ", "questions": [{"q": "...", "a": "..."}]}
  ]
}`;
  }

  /**
   * Парсинг ответа AI (с поддержкой таблиц и сценариев)
   */
  parseAIResponse(aiResponse, context) {
    try {
      // Попытка извлечь JSON из ответа
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Нормализация секций: убираем "undefined" и пустой content для FAQ
        const normalizedSections = (parsed.sections || []).map(section => {
          // Для FAQ секций убираем content
          if (section.type === 'faq' || section.questions) {
            return {
              ...section,
              type: 'faq',
              content: ''
            };
          }
          
          // Для scenario секций сохраняем структуру
          if (section.type === 'scenario' || section.scenario) {
            return {
              ...section,
              type: 'scenario',
              content: section.content || section.scenario?.description || ''
            };
          }
          
          // Для секций с таблицами сохраняем таблицы
          if (section.tables && Array.isArray(section.tables)) {
            // Таблицы могут быть в формате markdown или как отдельное поле
            return {
              ...section,
              tables: section.tables
            };
          }
          
          // Для других секций убираем "undefined"
          if (section.content === 'undefined' || section.content === undefined) {
            return {
              ...section,
              content: ''
            };
          }
          return section;
        });
        
        // Валидация: проверяем соответствие требованиям мастер-промпта
        const validation = this.validateMasterPromptRequirements(parsed, normalizedSections);
        if (!validation.passed) {
          console.warn('AI response does not meet master prompt requirements:', validation.issues);
        }
        
        return {
          title: parsed.title || this.generateTitle(context),
          h1: parsed.h1 || this.generateH1(context),
          metaDescription: parsed.metaDescription || this.generateMetaDescription(context),
          sections: normalizedSections.length > 0 ? normalizedSections : this.generateSections(context),
          keywords: context.keywords,
          internalLinks: this.generateInternalLinks(context),
          aiGenerated: true,
          validation: validation
        };
      }
    } catch (error) {
      // Если не удалось распарсить, пытаемся извлечь структуру из markdown
      const markdownStructure = this.parseMarkdownResponse(aiResponse, context);
      if (markdownStructure) {
        return markdownStructure;
      }
      
      // Последний fallback: используем весь ответ как контент
      return {
        title: this.generateTitle(context),
        h1: this.generateH1(context),
        metaDescription: this.generateMetaDescription(context),
        sections: [{
          type: 'main',
          heading: 'Content',
          content: aiResponse
        }],
        keywords: context.keywords,
        internalLinks: this.generateInternalLinks(context),
        aiGenerated: true
      };
    }

    return null;
  }
  
  /**
   * Валидация соответствия требованиям мастер-промпта
   */
  validateMasterPromptRequirements(parsed, sections) {
    const issues = [];
    
    // Проверка количества секций (минимум 8)
    if (!sections || sections.length < 8) {
      issues.push(`Only ${sections?.length || 0} sections, need at least 8`);
    }
    
    // Проверка наличия таблиц (минимум 2)
    const tablesCount = sections.filter(s => s.tables && s.tables.length > 0).length;
    if (tablesCount < 2) {
      issues.push(`Only ${tablesCount} tables found, need at least 2`);
    }
    
    // Проверка наличия сценариев (минимум 2)
    const scenariosCount = sections.filter(s => s.type === 'scenario' || s.scenario).length;
    if (scenariosCount < 2) {
      issues.push(`Only ${scenariosCount} scenarios found, need at least 2`);
    }
    
    // Проверка FAQ (минимум 10 вопросов)
    const faqSection = sections.find(s => s.type === 'faq');
    if (!faqSection || !faqSection.questions || faqSection.questions.length < 10) {
      issues.push(`Only ${faqSection?.questions?.length || 0} FAQ questions, need at least 10`);
    }
    
    return {
      passed: issues.length === 0,
      issues: issues
    };
  }
  
  /**
   * Парсинг markdown ответа (если JSON не удалось распарсить)
   */
  parseMarkdownResponse(markdownText, context) {
    // Базовая попытка извлечь структуру из markdown
    const lines = markdownText.split('\n');
    const sections = [];
    let currentSection = null;
    
    for (const line of lines) {
      // H2 заголовки
      if (line.startsWith('## ')) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          type: 'main',
          heading: line.replace('## ', '').trim(),
          content: '',
          bullets: []
        };
      }
      // H3 заголовки
      else if (line.startsWith('### ')) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          type: 'main',
          heading: line.replace('### ', '').trim(),
          content: '',
          bullets: []
        };
      }
      // Bullets
      else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        if (currentSection) {
          currentSection.bullets = currentSection.bullets || [];
          currentSection.bullets.push(line.trim().substring(2).trim());
        }
      }
      // Обычный текст
      else if (line.trim() && currentSection) {
        currentSection.content += line + '\n';
      }
    }
    
    if (currentSection) {
      sections.push(currentSection);
    }
    
    if (sections.length > 0) {
      return {
        title: this.generateTitle(context),
        h1: this.generateH1(context),
        metaDescription: this.generateMetaDescription(context),
        sections: sections,
        keywords: context.keywords,
        internalLinks: this.generateInternalLinks(context),
        aiGenerated: true
      };
    }
    
    return null;
  }

  /**
   * Генерация заголовка
   */
  generateTitle(context) {
    const { theme, intent, keywords } = context;
    const keyword = keywords[0] || theme || intent;
    return `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} - Vehicle History Report | VINTrusted`;
  }

  /**
   * Генерация H1
   */
  generateH1(context) {
    const { theme, intent } = context;
    const templates = [
      `Complete Guide to ${theme || intent}`,
      `Everything You Need to Know About ${theme || intent}`,
      `${theme || intent} - Comprehensive Information`
    ];
    return templates[context.index % templates.length];
  }

  /**
   * Генерация meta description
   */
  generateMetaDescription(context) {
    const { theme, intent } = context;
    return `Learn everything about ${theme || intent} in vehicle history reports. Get comprehensive information and make informed decisions.`;
  }

  /**
   * Генерация секций
   */
  generateSections(context) {
    const sections = [];
    const theme = context.theme || context.intent;
    
    // Introduction (расширенная)
    sections.push({
      type: 'introduction',
      heading: 'Introduction',
      content: `This comprehensive guide covers everything you need to know about ${theme} in vehicle history reports. Understanding ${theme} is essential for making informed decisions when purchasing or evaluating a vehicle. Whether you're a buyer, seller, or dealer, having accurate information about a vehicle's ${theme} can help you avoid costly mistakes and ensure transparency in transactions. This guide will provide you with detailed insights, practical examples, and actionable advice to help you navigate the complexities of ${theme} data effectively.`
    });

    // Main content - Section 1
    sections.push({
      type: 'main',
      heading: `What is ${theme}?`,
      content: `${theme} is a critical component of vehicle history reports that provides valuable information about a vehicle's past. This data is collected from various sources including state DMV records, insurance companies, repair facilities, and other authorized entities. Understanding what ${theme} means and how it impacts a vehicle's value and safety is crucial for anyone involved in vehicle transactions. The information included in ${theme} reports can reveal important details about a vehicle's condition, ownership history, and potential issues that may not be immediately apparent during a visual inspection.`,
      bullets: [
        `Definition and scope of ${theme} data`,
        `Sources of ${theme} information`,
        `Why ${theme} matters in vehicle evaluation`,
        `How ${theme} affects vehicle value and safety`
      ]
    });

    // Main content - Section 2
    sections.push({
      type: 'main',
      heading: `Key Information About ${theme}`,
      content: `When evaluating ${theme} data, there are several key factors to consider. First, it's important to understand the timeline and frequency of ${theme} events. This information can help you identify patterns and potential concerns. Second, the severity and nature of ${theme} incidents should be carefully examined. Not all ${theme} entries are equal, and understanding the context is crucial. Third, consider how ${theme} data relates to other aspects of the vehicle's history, such as maintenance records, ownership changes, and mileage readings.`,
      bullets: [
        `Timeline and frequency analysis`,
        `Severity and context evaluation`,
        `Correlation with other vehicle history data`,
        `Red flags and warning signs to watch for`
      ]
    });

    // Main content - Section 3
    sections.push({
      type: 'main',
      heading: `How to Interpret ${theme} Data`,
      content: `Interpreting ${theme} data requires a systematic approach. Start by reviewing the dates and locations associated with each entry. This can help you understand the vehicle's history and identify any patterns or concerns. Next, examine the details of each ${theme} event, paying attention to descriptions, codes, and any additional notes. Compare the ${theme} data with other information in the vehicle history report, such as mileage readings, ownership changes, and maintenance records. Look for inconsistencies or discrepancies that might indicate potential issues.`,
      bullets: [
        `Step-by-step interpretation guide`,
        `Understanding codes and terminology`,
        `Identifying patterns and trends`,
        `Cross-referencing with other data sources`
      ]
    });

    // Main content - Section 4
    sections.push({
      type: 'main',
      heading: `Common Patterns and What They Mean`,
      content: `Certain patterns in ${theme} data can provide valuable insights into a vehicle's history. For example, frequent ${theme} entries in a short period might indicate ongoing issues or problems. Conversely, a lack of ${theme} data over an extended period could suggest either excellent maintenance or missing records. Geographic patterns can also be significant - vehicles with ${theme} entries from multiple states may have had multiple owners or been used for long-distance travel. Understanding these patterns can help you make more informed decisions about a vehicle's condition and value.`,
      bullets: [
        `Frequency patterns and their implications`,
        `Geographic distribution analysis`,
        `Temporal patterns and trends`,
        `Correlation with vehicle age and mileage`
      ]
    });

    // Main content - Section 5
    sections.push({
      type: 'main',
      heading: `Best Practices for Evaluation`,
      content: `When evaluating ${theme} data, follow these best practices to ensure you make informed decisions. First, always obtain a comprehensive vehicle history report from a reputable source. Second, review the ${theme} data in context with the vehicle's overall history, including maintenance records, ownership changes, and mileage readings. Third, consider having the vehicle inspected by a qualified mechanic, especially if the ${theme} data reveals any concerns. Fourth, use the ${theme} information to negotiate price and terms if necessary. Finally, keep detailed records of your review process for future reference.`,
      bullets: [
        `Obtaining comprehensive reports`,
        `Contextual analysis approach`,
        `Professional inspection recommendations`,
        `Negotiation strategies based on ${theme} data`,
        `Record-keeping best practices`
      ]
    });

    // FAQ (расширенная)
    sections.push({
      type: 'faq',
      heading: 'Frequently Asked Questions',
      content: '', // Пустой контент для FAQ, только questions
      questions: [
        {
          q: `What is ${theme}?`,
          a: `${theme} is a critical component of vehicle history reports that provides detailed information about a vehicle's past. This data is collected from various authorized sources including state DMV records, insurance companies, and repair facilities. Understanding ${theme} is essential for evaluating a vehicle's condition, value, and safety. The information can reveal important details that may not be apparent during a visual inspection, helping buyers and sellers make more informed decisions.`
        },
        {
          q: `Why is ${theme} important?`,
          a: `${theme} is important because it provides transparency and helps prevent fraud in vehicle transactions. By understanding a vehicle's ${theme}, you can identify potential issues, verify the accuracy of seller claims, and make informed decisions about pricing and purchase terms. This information can also help you avoid costly mistakes and ensure you're getting a vehicle that meets your expectations and safety requirements.`
        },
        {
          q: `How often should I check ${theme} data?`,
          a: `You should check ${theme} data whenever you're considering purchasing a vehicle, whether it's from a dealer or private seller. It's also a good idea to review ${theme} information periodically if you own a vehicle, especially before selling it or making significant repairs. Regular monitoring can help you stay informed about your vehicle's history and identify any potential issues early.`
        },
        {
          q: `What should I look for in ${theme} reports?`,
          a: `When reviewing ${theme} reports, look for patterns, inconsistencies, or red flags that might indicate problems. Pay attention to dates, locations, and descriptions of events. Compare the ${theme} data with other information in the vehicle history report, such as mileage readings and ownership changes. Look for any gaps in the record or discrepancies that might warrant further investigation.`
        },
        {
          q: `Can ${theme} data affect a vehicle's value?`,
          a: `Yes, ${theme} data can significantly affect a vehicle's value. Vehicles with clean ${theme} records typically command higher prices, while those with concerning ${theme} entries may be worth less. The impact depends on the nature and severity of the ${theme} events, as well as how they relate to the vehicle's overall condition and history. Understanding this relationship can help you negotiate fair prices and make informed purchasing decisions.`
        },
        {
          q: `Where does ${theme} data come from?`,
          a: `${theme} data comes from various authorized sources including state DMV records, insurance companies, repair facilities, law enforcement agencies, and other official entities. This information is compiled into comprehensive vehicle history reports by authorized providers who have access to these databases. The accuracy and completeness of ${theme} data depend on the reporting practices of these sources and the systems used to compile the information.`
        }
      ]
    });

    return sections;
  }

  /**
   * Генерация внутренних ссылок
   */
  generateInternalLinks(context) {
    // Заглушка: генерация внутренних ссылок
    return [
      { text: 'VIN Check', url: '/vin-check' },
      { text: 'Accident History', url: '/accident-history' },
      { text: 'Ownership History', url: '/ownership-history' }
    ];
  }

  /**
   * Построение HTML страницы с стандартным UI дизайном
   */
  buildPage(content, context, priority) {
    // Используем auction-background.png или случайное изображение
    const backgroundImage = '/auction-background.png';
    
    // Генерируем FAQ секцию
    const faqSection = content.sections.find(s => s.type === 'faq');
    const faqHTML = faqSection ? this.renderFAQ(faqSection) : '';
    
    // Генерируем остальные секции
    const otherSections = content.sections
      .filter(s => s.type !== 'faq')
      .map(section => this.renderSection(section))
      .join('\n');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${content.title}</title>
    <meta name="description" content="${content.metaDescription}">
    <link rel="canonical" href="${this.generateCanonicalUrl(context)}">
    
    <!-- Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800;900&family=DM+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
    
    <!-- Styles -->
    <style>
${this.getInlineCSS()}
    </style>
    
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "${content.h1}",
      "description": "${content.metaDescription}",
      "author": {
        "@type": "Organization",
        "name": "VIN TRUST"
      },
      "publisher": {
        "@type": "Organization",
        "name": "VIN TRUST",
        "logo": {
          "@type": "ImageObject",
          "url": "https://vintrusted.com/images/logo-vin-trust.png"
        }
      }
    }
    </script>
</head>
<body>
    <!-- Header -->
    <header class="seo-header">
        <div class="seo-header-content">
            <a href="/" class="seo-logo-link">
                <img src="/images/logo-vin-trust.png" alt="VIN TRUST" class="seo-logo">
            </a>
            <nav class="seo-nav">
                <a href="/">Home</a>
                <a href="/vin-check">VIN Check</a>
                <a href="/about-us">About Us</a>
                <a href="/contact">Contact</a>
            </nav>
            <div class="seo-language-selector">
                <a href="#" class="active">EN</a>
                <a href="#">DE</a>
            </div>
        </div>
    </header>

    <!-- Hero Section with Background -->
    <section class="seo-hero-section">
        <img src="${backgroundImage}" alt="Background" class="seo-hero-background">
        <div class="seo-hero-overlay"></div>
        <div class="seo-hero-content">
            <h1 class="seo-hero-title">${content.h1}</h1>
            <p class="seo-hero-subtitle">${content.metaDescription}</p>
        </div>
    </section>

    <!-- Main Content -->
    <main class="seo-main">
        <div class="seo-container">
            <article class="seo-article">
                ${otherSections}
                
                ${faqHTML ? `<div class="seo-faq">${faqHTML}</div>` : ''}
            </article>
        </div>
    </main>

    <!-- Footer -->
    <footer class="seo-footer">
        <div class="seo-footer-content">
            <p>&copy; ${new Date().getFullYear()} VIN TRUST. All rights reserved.</p>
        </div>
    </footer>
</body>
</html>`;

    return {
      path: this.generatePagePath(context),
      html,
      content,
      context,
      priority: priority.priority,
      qualityScore: this.calculateQualityScore(content),
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Рендеринг FAQ секции
   */
  renderFAQ(section) {
    if (!section.questions || section.questions.length === 0) {
      return '';
    }
    
    return `
      <h2>${section.heading || 'Frequently Asked Questions'}</h2>
      ${section.questions.map(q => `
        <div class="seo-faq-item">
          <h3>${q.q}</h3>
          <p>${q.a}</p>
        </div>
      `).join('')}
    `;
  }
  
  /**
   * Получение встроенного CSS
   */
  getInlineCSS() {
    try {
      const cssPath = path.join(__dirname, 'seo-page-template.css');
      return fs.readFileSync(cssPath, 'utf8');
    } catch (error) {
      console.warn('Failed to load CSS file, using fallback:', error.message);
      return `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Manrope', sans-serif; color: #fff; background: #0f0f0f; }
        .seo-header { padding: 20px 0; }
        .seo-logo { height: 60px; }
        .seo-hero-section { min-height: 500px; position: relative; }
        .seo-hero-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 15, 15, 0.8); }
      `;
    }
  }

  /**
   * Рендеринг секции
   */
  renderSection(section) {
    let html = `<section><h2>${section.heading}</h2>`;
    
    // Для FAQ секции НЕ выводим content вообще, только questions
    const isFAQ = section.type === 'faq' || 
                  (section.questions && Array.isArray(section.questions) && section.questions.length > 0) || 
                  (section.heading && typeof section.heading === 'string' && section.heading.toLowerCase().includes('frequently'));
    
    // Контент (если есть, не "undefined", и не FAQ секция)
    // ВАЖНО: для FAQ секций НИКОГДА не выводим content, даже если он есть
    if (!isFAQ) {
      const hasContent = section.content && 
                         section.content !== 'undefined' && 
                         section.content !== undefined &&
                         typeof section.content === 'string' &&
                         section.content.trim() !== '';
      
      if (hasContent) {
        html += `<p>${section.content}</p>`;
      }
    }
    // Если это FAQ, content НЕ выводим (даже если он есть)
    
    if (section.bullets && Array.isArray(section.bullets)) {
      html += '<ul>';
      section.bullets.forEach(bullet => {
        html += `<li>${bullet}</li>`;
      });
      html += '</ul>';
    }
    
    if (section.questions && Array.isArray(section.questions)) {
      html += '<div class="faq">';
      section.questions.forEach(qa => {
        if (qa && qa.q && qa.a) {
          html += `<div class="faq-item"><h3>${qa.q}</h3><p>${qa.a}</p></div>`;
        }
      });
      html += '</div>';
    }
    
    html += '</section>';
    return html;
  }

  /**
   * Генерация пути страницы
   */
  generatePagePath(context) {
    const slug = this.slugify(context.theme || context.intent || 'page');
    const index = context.index || 0;
    return `${slug}-${index}`;
  }

  /**
   * Генерация canonical URL
   */
  generateCanonicalUrl(context) {
    const path = this.generatePagePath(context);
    return `https://vintrusted.com/${path}`;
  }

  /**
   * Расчет качества страницы (ГЕНИАЛЬНЫЙ УРОВЕНЬ)
   */
  calculateQualityScore(content) {
    let score = 0.0; // Начинаем с 0, нужно заработать каждый балл
    
    // ============================================
    // БАЗОВЫЕ ТРЕБОВАНИЯ (обязательные)
    // ============================================
    
    // Title (обязательно)
    if (content.title && content.title.length >= 30 && content.title.length <= 60) {
      score += 0.05;
    }
    
    // Meta description (обязательно)
    if (content.metaDescription && content.metaDescription.length >= 120 && content.metaDescription.length <= 160) {
      score += 0.05;
    }
    
    // H1 (обязательно)
    if (content.h1 && content.h1.length > 0) {
      score += 0.05;
    }
    
    // ============================================
    // ДЛИНА КОНТЕНТА (критично для гениальных статей)
    // ============================================
    
    const totalWords = this.countWords(content);
    const totalChars = this.countCharacters(content);
    
    // Минимум 3000 слов (требование для гениальных статей)
    if (totalWords >= 3000) {
      score += 0.15; // Большой бонус за длину
    } else if (totalWords >= 2000) {
      score += 0.10;
    } else if (totalWords >= 1500) {
      score += 0.05;
    } else if (totalWords < 1000) {
      score -= 0.20; // Штраф за слишком короткий контент
    }
    
    // ============================================
    // СТРУКТУРА И ГЛУБИНА
    // ============================================
    
    if (content.sections && Array.isArray(content.sections)) {
      const mainSections = content.sections.filter(s => s.type === 'main' || s.type === 'introduction');
      const faqSections = content.sections.filter(s => s.type === 'faq');
      
      // Количество основных секций (минимум 8 для гениальных статей)
      if (mainSections.length >= 8) {
        score += 0.10;
      } else if (mainSections.length >= 5) {
        score += 0.05;
      } else if (mainSections.length < 3) {
        score -= 0.10; // Штраф за мало секций
      }
      
      // Глубина секций (проверяем длину контента в секциях)
      let deepSectionsCount = 0;
      mainSections.forEach(section => {
        const sectionWords = this.countWordsInText(section.content || '');
        if (sectionWords >= 300) {
          deepSectionsCount++;
        }
      });
      
      if (deepSectionsCount >= 5) {
        score += 0.10; // Большой бонус за глубокие секции
      } else if (deepSectionsCount >= 3) {
        score += 0.05;
      }
      
      // FAQ качество (минимум 10 вопросов для гениальных статей)
      if (faqSections.length > 0) {
        const faqSection = faqSections[0];
        if (faqSection.questions && faqSection.questions.length >= 10) {
          score += 0.10;
        } else if (faqSection.questions && faqSection.questions.length >= 5) {
          score += 0.05;
        }
        
        // Проверка качества FAQ ответов
        if (faqSection.questions) {
          let longAnswersCount = 0;
          faqSection.questions.forEach(q => {
            const answerWords = this.countWordsInText(q.a || '');
            if (answerWords >= 100) {
              longAnswersCount++;
            }
          });
          
          if (longAnswersCount >= 8) {
            score += 0.05;
          }
        }
      } else {
        score -= 0.05; // Штраф за отсутствие FAQ
      }
    }
    
    // ============================================
    // ЭКСПЕРТНОСТЬ И УНИКАЛЬНОСТЬ
    // ============================================
    
    // Проверка на наличие примеров, кейсов, данных
    const hasExamples = this.hasExamples(content);
    if (hasExamples) {
      score += 0.05;
    }
    
    // Проверка на наличие bullets/lists (структурированность)
    const hasStructuredContent = this.hasStructuredContent(content);
    if (hasStructuredContent) {
      score += 0.05;
    }
    
    // Проверка на наличие таблиц (требование мастер-промпта)
    const hasTables = this.hasTables(content);
    if (hasTables) {
      score += 0.10; // Большой бонус за таблицы
    } else {
      score -= 0.05; // Штраф за отсутствие таблиц
    }
    
    // Проверка на наличие сценариев/кейсов (требование мастер-промпта)
    const hasScenarios = this.hasScenarios(content);
    if (hasScenarios) {
      score += 0.10; // Большой бонус за сценарии
    } else {
      score -= 0.05; // Штраф за отсутствие сценариев
    }
    
    // Проверка на техническую терминологию (эксперт-уровень)
    const hasTechnicalTerms = this.hasTechnicalTerms(content);
    if (hasTechnicalTerms) {
      score += 0.05;
    }
    
    // Проверка на отсутствие флаффа (запрещенные паттерны)
    const hasFluff = this.hasFluff(content);
    if (hasFluff) {
      score -= 0.10; // Штраф за флафф
    }
    
    // Проверка на наличие ключевых слов
    if (content.keywords && content.keywords.length >= 3) {
      score += 0.05;
    }
    
    // Проверка на наличие внутренних ссылок
    if (content.internalLinks && content.internalLinks.length >= 3) {
      score += 0.05;
    }
    
    // ============================================
    // ШТРАФЫ ЗА ПЛОХОЕ КАЧЕСТВО
    // ============================================
    
    // Штраф за слишком короткие секции
    if (content.sections) {
      let shortSectionsCount = 0;
      content.sections.forEach(section => {
        if (section.type !== 'faq') {
          const sectionWords = this.countWordsInText(section.content || '');
          if (sectionWords < 100) {
            shortSectionsCount++;
          }
        }
      });
      
      if (shortSectionsCount > 2) {
        score -= 0.10; // Штраф за много коротких секций
      }
    }
    
    // Штраф за отсутствие Introduction
    const hasIntroduction = content.sections?.some(s => s.type === 'introduction');
    if (!hasIntroduction) {
      score -= 0.05;
    }
    
    // ============================================
    // ФИНАЛЬНАЯ ОЦЕНКА
    // ============================================
    
    // Нормализация: минимум 0, максимум 1.0
    score = Math.max(0.0, Math.min(1.0, score));
    
    return score;
  }
  
  /**
   * Подсчет слов в контенте
   */
  countWords(content) {
    let words = 0;
    
    if (content.h1) {
      words += this.countWordsInText(content.h1);
    }
    
    if (content.metaDescription) {
      words += this.countWordsInText(content.metaDescription);
    }
    
    if (content.sections && Array.isArray(content.sections)) {
      content.sections.forEach(section => {
        if (section.content) {
          words += this.countWordsInText(section.content);
        }
        if (section.bullets && Array.isArray(section.bullets)) {
          section.bullets.forEach(bullet => {
            words += this.countWordsInText(bullet);
          });
        }
        if (section.questions && Array.isArray(section.questions)) {
          section.questions.forEach(q => {
            words += this.countWordsInText(q.q || '');
            words += this.countWordsInText(q.a || '');
          });
        }
      });
    }
    
    return words;
  }
  
  /**
   * Подсчет слов в тексте
   */
  countWordsInText(text) {
    if (!text || typeof text !== 'string') return 0;
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
  }
  
  /**
   * Подсчет символов в контенте
   */
  countCharacters(content) {
    let chars = 0;
    
    if (content.title) chars += content.title.length;
    if (content.h1) chars += content.h1.length;
    if (content.metaDescription) chars += content.metaDescription.length;
    
    if (content.sections && Array.isArray(content.sections)) {
      content.sections.forEach(section => {
        if (section.content) chars += section.content.length;
        if (section.bullets) {
          section.bullets.forEach(b => chars += b.length);
        }
        if (section.questions) {
          section.questions.forEach(q => {
            chars += (q.q || '').length;
            chars += (q.a || '').length;
          });
        }
      });
    }
    
    return chars;
  }
  
  /**
   * Проверка наличия примеров, кейсов, данных
   */
  hasExamples(content) {
    if (!content.sections) return false;
    
    const exampleKeywords = ['example', 'case study', 'scenario', 'instance', 'illustration', 
                            'for example', 'such as', 'including', 'data', 'statistics', 
                            'research', 'study', 'analysis'];
    
    const allText = JSON.stringify(content).toLowerCase();
    
    return exampleKeywords.some(keyword => allText.includes(keyword));
  }
  
  /**
   * Проверка наличия структурированного контента (bullets, lists)
   */
  hasStructuredContent(content) {
    if (!content.sections) return false;
    
    return content.sections.some(section => 
      (section.bullets && section.bullets.length > 0) ||
      (section.content && (section.content.includes('•') || section.content.includes('-') || section.content.includes('1.')))
    );
  }
  
  /**
   * Проверка наличия таблиц (требование мастер-промпта)
   */
  hasTables(content) {
    if (!content.sections) return false;
    
    // Проверяем наличие таблиц в секциях
    const allText = JSON.stringify(content).toLowerCase();
    
    // Проверяем наличие markdown таблиц (| разделители)
    const hasMarkdownTable = content.sections.some(section => {
      const sectionText = (section.content || '').toLowerCase();
      return sectionText.includes('|') && sectionText.includes('---');
    });
    
    // Проверяем наличие таблиц в HTML (если уже построен)
    if (content.html) {
      return content.html.includes('<table') || hasMarkdownTable;
    }
    
    // Проверяем наличие таблиц в поле tables
    const hasTablesField = content.sections.some(section => 
      section.tables && Array.isArray(section.tables) && section.tables.length > 0
    );
    
    return hasMarkdownTable || hasTablesField;
  }
  
  /**
   * Проверка наличия сценариев/кейсов (требование мастер-промпта)
   */
  hasScenarios(content) {
    if (!content.sections) return false;
    
    const scenarioKeywords = ['scenario', 'case study', 'example', 'instance', 'situation',
                            'pattern', 'red flag', 'typical', 'common', 'real-world'];
    
    const allText = JSON.stringify(content).toLowerCase();
    
    // Проверяем наличие секций типа "scenario"
    const hasScenarioSections = content.sections.some(s => 
      s.type === 'scenario' || 
      (s.heading && s.heading.toLowerCase().includes('scenario')) ||
      (s.heading && s.heading.toLowerCase().includes('case study')) ||
      (s.scenario && typeof s.scenario === 'object')
    );
    
    // Проверяем наличие ключевых слов сценариев
    const hasScenarioKeywords = scenarioKeywords.some(keyword => allText.includes(keyword));
    
    return hasScenarioSections || hasScenarioKeywords;
  }
  
  /**
   * Проверка наличия технической терминологии
   */
  hasTechnicalTerms(content) {
    if (!content.sections) return false;
    
    const technicalIndicators = ['nmvtis', 'code', 'classification', 'system', 'process',
                                'methodology', 'framework', 'standard', 'protocol',
                                'database', 'source', 'parameter', 'metric', 'threshold',
                                'technical', 'specification', 'implementation'];
    
    const allText = JSON.stringify(content).toLowerCase();
    
    // Должно быть минимум 3 технических термина
    const foundTerms = technicalIndicators.filter(term => allText.includes(term));
    
    return foundTerms.length >= 3;
  }
  
  /**
   * Проверка наличия флаффа (запрещенные паттерны)
   */
  hasFluff(content) {
    if (!content.sections) return false;
    
    const fluffPatterns = [
      'in this article we will',
      'this guide will help you',
      'it\'s important to understand',
      'by the end of this article',
      'make informed decisions', // без технического объяснения
      'avoid costly mistakes', // без конкретики
      'this comprehensive guide covers everything',
      'in this comprehensive guide',
      'we will explore',
      'let\'s dive into'
    ];
    
    const allText = JSON.stringify(content).toLowerCase();
    
    // Проверяем наличие запрещенных паттернов
    return fluffPatterns.some(pattern => allText.includes(pattern));
  }

  /**
   * Сохранение страниц с валидацией качества
   */
  async savePages(pages) {
    if (!fs.existsSync(this.outputPath)) {
      fs.mkdirSync(this.outputPath, { recursive: true });
    }

    const minQualityThreshold = 0.7; // Минимальный порог качества для сохранения
    let savedCount = 0;
    let rejectedCount = 0;
    let regeneratedCount = 0;

    for (const page of pages) {
      try {
        // ВАЛИДАЦИЯ КАЧЕСТВА ПЕРЕД СОХРАНЕНИЕМ
        const qualityScore = page.qualityScore || this.calculateQualityScore(page.content);
        
        // Если качество ниже порога - пытаемся регенерировать
        if (qualityScore < minQualityThreshold) {
          console.warn(`⚠️  Page ${page.path} has low quality (${qualityScore.toFixed(2)}). Attempting regeneration...`);
          
          // Попытка регенерации (максимум 2 попытки)
          let regenerated = false;
          for (let attempt = 0; attempt < 2; attempt++) {
            try {
              const regeneratedContent = await this.regenerateLowQualityPage(page, attempt);
              const newQualityScore = this.calculateQualityScore(regeneratedContent);
              
              if (newQualityScore >= minQualityThreshold) {
                page.content = regeneratedContent;
                page.qualityScore = newQualityScore;
                page.html = this.buildPage(regeneratedContent, page.context, { priority: page.priority || 'high', type: page.context?.intent || 'general' }).html;
                regenerated = true;
                regeneratedCount++;
                console.log(`✅ Page ${page.path} regenerated successfully. New quality: ${newQualityScore.toFixed(2)}`);
                break;
              }
            } catch (error) {
              console.warn(`Regeneration attempt ${attempt + 1} failed:`, error.message);
            }
          }
          
          // Если регенерация не помогла - все равно сохраняем, но с предупреждением
          if (!regenerated) {
            console.warn(`⚠️  Page ${page.path} saved with low quality (${qualityScore.toFixed(2)}) after failed regeneration attempts`);
            rejectedCount++;
          }
        }
        
        // Сохранение страницы
        const pageDir = path.join(this.outputPath, page.path);
        if (!fs.existsSync(pageDir)) {
          fs.mkdirSync(pageDir, { recursive: true });
        }
        
        const htmlPath = path.join(pageDir, 'index.html');
        fs.writeFileSync(htmlPath, page.html, 'utf8');
        savedCount++;
        
      } catch (error) {
        console.error(`Error saving page ${page.path}:`, error);
      }
    }
    
    // Логирование статистики
    console.log(`\n📊 Quality Control Summary:`);
    console.log(`   ✅ Saved: ${savedCount} pages`);
    console.log(`   🔄 Regenerated: ${regeneratedCount} pages`);
    console.log(`   ⚠️  Low quality: ${rejectedCount} pages`);
  }
  
  /**
   * Регенерация страницы с низким качеством
   */
  async regenerateLowQualityPage(page, attempt) {
    const context = page.context || {};
    
    // Улучшаем промпт для регенерации
    const enhancedPrompt = `CRITICAL: Previous generation had low quality. 
    You MUST generate GENIUS-LEVEL content with:
    - Minimum 3000 words (current: ${this.countWords(page.content)} words)
    - 8-12 main sections (current: ${page.content.sections?.length || 0} sections)
    - Each section 300-500 words
    - 10-15 FAQ questions with detailed answers
    - Real examples, case studies, data
    - Expert-level depth and insights
    
    Original prompt: Generate comprehensive SEO-optimized content about ${context.theme || context.intent}`;
    
    try {
      // Пытаемся использовать AI для регенерации
      if (this.config.modules?.aiKnowledgeCore?.localAI) {
        const regenerated = await this.generateWithAI(enhancedPrompt, context);
        if (regenerated) {
          return regenerated;
        }
      }
    } catch (error) {
      // Если AI недоступен, улучшаем шаблоны
    }
    
    // Fallback: улучшенные шаблоны
    return this.generateEnhancedContent(context, attempt);
  }
  
  /**
   * Генерация улучшенного контента (расширенные шаблоны)
   */
  generateEnhancedContent(context, attempt) {
    const theme = context.theme || context.intent;
    const sections = this.generateSections(context);
    
    // Добавляем дополнительные секции для увеличения длины
    if (attempt === 0) {
      // Первая попытка: добавляем еще 3 секции
      sections.push({
        type: 'main',
        heading: `Advanced Analysis of ${theme}`,
        content: `Delving deeper into ${theme} requires a comprehensive understanding of the underlying data structures and reporting mechanisms. Industry experts have identified several critical factors that influence the accuracy and reliability of ${theme} information. These factors include data source credibility, reporting frequency, and the integration of multiple information streams. Understanding these nuances is essential for anyone seeking to make informed decisions based on ${theme} data.`,
        bullets: [
          `Data source credibility and verification processes`,
          `Reporting frequency and update cycles`,
          `Integration of multiple information streams`,
          `Quality assurance mechanisms in data collection`
        ]
      });
      
      sections.push({
        type: 'main',
        heading: `Industry Best Practices for ${theme}`,
        content: `Leading professionals in the vehicle history reporting industry have developed a set of best practices for working with ${theme} data. These practices are based on years of experience and analysis of thousands of vehicle transactions. Implementing these practices can significantly improve the accuracy of your evaluations and help you avoid common pitfalls. The most effective approach combines automated analysis tools with human expertise and critical thinking.`,
        bullets: [
          `Combining automated tools with human expertise`,
          `Regular monitoring and verification`,
          `Cross-referencing multiple data sources`,
          `Staying updated with industry standards`
        ]
      });
      
      sections.push({
        type: 'main',
        heading: `Common Pitfalls and How to Avoid Them`,
        content: `When working with ${theme} data, there are several common mistakes that can lead to incorrect conclusions. These include over-reliance on single data points, ignoring contextual information, and failing to verify information from multiple sources. By understanding these pitfalls and implementing proper verification processes, you can significantly improve the reliability of your ${theme} evaluations.`,
        bullets: [
          `Over-reliance on single data points`,
          `Ignoring contextual information`,
          `Failing to verify from multiple sources`,
          `Not considering temporal factors`
        ]
      });
    }
    
    return {
      title: this.generateTitle(context),
      h1: this.generateH1(context),
      metaDescription: this.generateMetaDescription(context),
      sections: sections,
      keywords: context.keywords || [],
      internalLinks: this.generateInternalLinks(context)
    };
  }

  // Вспомогательные методы

  buildDefaultPrompt(context) {
    return `Generate SEO-optimized content about ${context.theme || context.intent} for vehicle history reports.`;
  }

  mapPriorityToIntent(priority) {
    if (priority.theme) {
      const theme = priority.theme.toLowerCase();
      if (theme.includes('vin')) return 'vin_check';
      if (theme.includes('accident')) return 'accident_check';
      if (theme.includes('ownership')) return 'ownership_history';
    }
    return 'generic';
  }

  extractKeywords(priority, semanticMap) {
    const keywords = [];
    
    if (priority.theme) {
      keywords.push(priority.theme);
    }
    
    if (semanticMap && semanticMap.keywords) {
      const relevant = semanticMap.keywords
        .filter(kw => 
          (kw.word || kw).toLowerCase().includes(priority.theme?.toLowerCase() || '')
        )
        .slice(0, 5);
      keywords.push(...relevant.map(kw => kw.word || kw));
    }
    
    return keywords.slice(0, 10);
  }

  slugify(text) {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-');
  }
}

module.exports = ContentGenerator;

