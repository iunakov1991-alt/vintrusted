/**
 * MONSTER 7.1 — LIGHT KNOWLEDGE CORE
 * 
 * ТРИЗ-принцип "ИСПОЛЬЗОВАНИЕ РЕСУРСОВ" + "ОТДЕЛЕНИЕ":
 * - Несколько маленьких файлов .md/.jsonl (SEO, GA4, GSC, TRIZ)
 * - Подгрузка только нужных кусков по теме
 * - Без попытки "скормить всё" Phi-3 в одном промпте
 * 
 * Профиль Phi-3:
 * - maxInputTokens: 300-500
 * - Загружаем только релевантные знания (обрезаем до maxTokens)
 */

const fs = require('fs');
const path = require('path');

class LightKnowledgeCore {
  constructor(config) {
    this.config = config;
    this.knowledgePath = path.join(process.cwd(), 'data/knowledge');
    this.phi3Profile = config.phi3Profile || {
      maxInputTokens: 500
    };
    
    // Маппинг тем на файлы знаний
    this.knowledgeFiles = {
      'seo': 'seo-guidelines.md',
      'analytics': 'ga4-basics.md',
      'triz': 'triz-principles.md',
      'best-practices': 'seo-best-practices.md',
      'google-search-console': 'gsc-basics.md'
    };
  }

  /**
   * Получение знаний для темы (обрезаем до maxTokens)
   */
  async getKnowledgeForTopic(topic, maxTokens = null) {
    const maxChars = (maxTokens || this.phi3Profile.maxInputTokens) * 4; // ~4 символа на токен
    
    const file = this.knowledgeFiles[topic];
    if (!file) {
      return '';
    }

    const filePath = path.join(this.knowledgePath, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`[LIGHT-KC] Knowledge file not found: ${filePath}`);
      return '';
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      // Обрезаем до maxChars символов
      const truncated = content.substring(0, maxChars);
      
      return truncated;
    } catch (error) {
      console.error(`[LIGHT-KC] Failed to load knowledge for ${topic}:`, error.message);
      return '';
    }
  }

  /**
   * Получение релевантных знаний для контекста
   */
  async getRelevantKnowledge(context, maxTokens = null) {
    const { theme, intent, keywords } = context;
    
    // Определяем релевантные темы
    const relevantTopics = this.determineRelevantTopics(theme, intent, keywords);
    
    // Загружаем знания по каждой теме
    const knowledge = {};
    for (const topic of relevantTopics) {
      knowledge[topic] = await this.getKnowledgeForTopic(topic, maxTokens);
    }

    return knowledge;
  }

  /**
   * Определение релевантных тем по контексту
   */
  determineRelevantTopics(theme, intent, keywords) {
    const topics = ['seo']; // SEO всегда релевантно
    
    // Добавляем дополнительные темы по контексту
    if (intent && intent.includes('analytics')) {
      topics.push('analytics');
    }
    
    if (keywords && keywords.some(k => k.includes('google'))) {
      topics.push('google-search-console');
    }
    
    // TRIZ добавляем только если явно запрошено
    if (theme && theme.toLowerCase().includes('triz')) {
      topics.push('triz');
    }
    
    return topics;
  }

  /**
   * Формирование короткого промпта с знаниями (для Phi-3)
   */
  async buildKnowledgePrompt(context, maxTokens = 300) {
    const knowledge = await this.getRelevantKnowledge(context, maxTokens);
    
    let prompt = '';
    
    if (knowledge.seo) {
      prompt += `SEO Guidelines:\n${knowledge.seo.substring(0, maxTokens * 2)}\n\n`;
    }
    
    if (knowledge.analytics) {
      prompt += `Analytics Basics:\n${knowledge.analytics.substring(0, maxTokens * 1)}\n\n`;
    }
    
    // Обрезаем до maxTokens символов
    const maxChars = maxTokens * 4;
    return prompt.substring(0, maxChars);
  }

  /**
   * Инициализация (создание файлов знаний, если их нет)
   */
  async initialize() {
    // Создаём базовые файлы знаний, если их нет
    for (const [topic, filename] of Object.entries(this.knowledgeFiles)) {
      const filePath = path.join(this.knowledgePath, filename);
      
      if (!fs.existsSync(filePath)) {
        await this.createDefaultKnowledgeFile(topic, filePath);
      }
    }
  }

  /**
   * Создание файла знаний по умолчанию
   */
  async createDefaultKnowledgeFile(topic, filePath) {
    const defaults = {
      'seo': `# SEO Guidelines

## Basic SEO Principles
- Use descriptive, keyword-rich titles
- Write compelling meta descriptions
- Structure content with H1, H2, H3 headings
- Include internal and external links
- Optimize images with alt text
- Ensure mobile-friendly design
`,
      'analytics': `# Google Analytics 4 Basics

## Key Metrics
- Users: Total number of unique visitors
- Sessions: Individual visits to your site
- Pageviews: Total number of pages viewed
- Bounce Rate: Percentage of single-page sessions
`,
      'triz': `# TRIZ Principles

## Basic TRIZ Concepts
- Contradiction: When improving one parameter worsens another
- Ideal Final Result: The best possible solution
- Resources: Use what's already available
- Separation: Divide problems into parts
`,
      'best-practices': `# SEO Best Practices

## Content Best Practices
- Write comprehensive, in-depth content
- Use original, unique content
- Include examples and case studies
- Provide actionable advice
- Update content regularly
`,
      'google-search-console': `# Google Search Console Basics

## Key Features
- Monitor search performance
- Submit sitemaps
- Check indexing status
- Identify crawl errors
- View search queries
`
    };

    const content = defaults[topic] || `# ${topic}\n\nDefault content for ${topic}.`;
    
    // Создаём директорию, если её нет
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[LIGHT-KC] Created default knowledge file: ${filePath}`);
  }
}

module.exports = LightKnowledgeCore;





