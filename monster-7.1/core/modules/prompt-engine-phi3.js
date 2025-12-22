/**
 * MONSTER 7.1 — PHI-3 OPTIMIZED PROMPT ENGINE
 * 
 * Промпт-движок оптимизированный под Phi-3:
 * - Короткие промпты (300-500 токенов input)
 * - Фокус на одной задаче
 * - Использование LightKnowledgeCore
 */

const path = require('path');

class PromptEnginePhi3 {
  constructor(config) {
    this.config = config;
    this.phi3Profile = config.phi3Profile || {
      maxInputTokens: 500,
      maxOutputTokens: 1000
    };
    this.knowledgeCore = null;
    this.initKnowledgeCore();
  }

  initKnowledgeCore() {
    try {
      const LightKnowledgeCore = require('../ai-knowledge-core/knowledge-core-light');
      this.knowledgeCore = new LightKnowledgeCore(this.config);
    } catch (error) {
      console.warn('[PROMPT-ENGINE-PHI3] LightKnowledgeCore not available:', error.message);
    }
  }

  async execute(params = {}) {
    try {
      const strategy = params.strategy || {};
      const priorities = strategy.priorities || [];

      // Генерация промптов для каждого приоритета
      const prompts = await Promise.all(
        priorities.map(priority => this.generatePrompt(priority, params))
      );

      return {
        result: prompts,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`PromptEngine failed: ${error.message}`);
    }
  }

  /**
   * Генерация промпта для приоритета (короткий, под Phi-3)
   */
  async generatePrompt(priority, params) {
    const context = {
      theme: priority.theme || priority.type,
      intent: priority.intent || priority.type,
      keywords: priority.keywords || []
    };

    // Базовый промпт (короткий)
    let prompt = this.buildBasePrompt(context);

    // Обогащение знаниями (только релевантными, обрезанными)
    if (this.knowledgeCore) {
      const knowledge = await this.knowledgeCore.buildKnowledgePrompt(
        context,
        Math.floor(this.phi3Profile.maxInputTokens * 0.3) // 30% на знания
      );
      if (knowledge) {
        prompt = `${knowledge}\n\n${prompt}`;
      }
    }

    // Обрезка до maxInputTokens
    const maxChars = this.phi3Profile.maxInputTokens * 4; // ~4 символа на токен
    prompt = prompt.substring(0, maxChars);

    return {
      priority: priority.type || priority.intent,
      prompt,
      context
    };
  }

  /**
   * Базовый промпт (короткий, под Phi-3)
   */
  buildBasePrompt(context) {
    const { theme, intent, keywords } = context;

    return `Write ONE section of an SEO article about "${theme}".

Topic: ${theme}
Intent: ${intent}
Keywords: ${keywords.join(', ') || 'none'}

Requirements:
- Expert-level content
- 300-500 words
- Include examples and data
- Professional tone
- Markdown format

Output JSON:
{
  "heading": "Section Heading",
  "content": "Section content..."
}`;
  }
}

module.exports = PromptEnginePhi3;











