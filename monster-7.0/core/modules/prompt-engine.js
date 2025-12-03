/**
 * [C] PROMPT ENGINE BRAIN
 * 
 * Генерирует "божественные" промты.
 * Использует AI Knowledge Core и TRIZ.
 */

const path = require('path');

class PromptEngine {
  constructor(config) {
    this.config = config;
    this.cache = new Map();
  }

  async execute(params = {}) {
    const { strategy, context, task } = params;

    // Генерация промта
    const prompt = await this.generatePrompt(strategy, context, task);

    return {
      prompt,
      enriched: true,
      trizApplied: true
    };
  }

  async generatePrompt(strategy, context, task) {
    // Базовый промт
    let prompt = this.buildBasePrompt(task, context);

    // Обогащение через AI Knowledge Core
    const knowledge = await this.getKnowledge(context);
    prompt = this.enrichWithKnowledge(prompt, knowledge);

    // TRIZ обогащение
    prompt = this.enrichWithTRIZ(prompt, context);

    // Стратегические инструкции
    prompt = this.addStrategyInstructions(prompt, strategy);

    // E-E-A-T обогащение
    prompt = this.enrichWithEEAT(prompt);

    // SEO best practices
    prompt = this.enrichWithSEO(prompt, context);

    return prompt;
  }

  buildBasePrompt(task, context) {
    const { intent, make, year, state, lang = 'en' } = context || {};
    
    let prompt = `Generate comprehensive, SEO-optimized content for a vehicle history report page.`;

    if (intent) {
      prompt += `\n\nIntent: ${intent}`;
    }
    if (make && year) {
      prompt += `\n\nVehicle: ${year} ${make}`;
    }
    if (state) {
      prompt += `\n\nState: ${state}`;
    }
    prompt += `\n\nLanguage: ${lang}`;

    prompt += `\n\nGENIUS-LEVEL Requirements:
- Create EXCEPTIONAL, DEEP, EXPERT-LEVEL content (3000+ words minimum)
- Demonstrate STRONG E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness)
- Show deep industry knowledge and expertise
- Provide COMPREHENSIVE coverage that goes beyond basic information
- Include unique insights, analysis, and expert perspectives
- Use sophisticated, authoritative language while remaining accessible
- Avoid keyword stuffing - use keywords naturally and contextually
- Include real-world examples, case studies, and practical scenarios
- Add data, statistics, research findings where applicable
- Structure with proper heading hierarchy (H1 → H2 → H3 → H4)
- Make content scannable with bullet points, lists, tables, and short paragraphs
- Include actionable, implementable insights and takeaways
- Optimize for featured snippets, People Also Ask, and other SERP features
- Address common misconceptions and edge cases
- Provide value that competitors don't offer
- Write in engaging, authoritative, trustworthy tone
- Include storytelling elements where appropriate
- Demonstrate thought leadership and deep understanding`;

    return prompt;
  }

  enrichWithEEAT(prompt) {
    return `${prompt}\n\nSTRONG E-E-A-T Requirements (Essential for Genius-Level Content):
- Experience: Demonstrate extensive first-hand experience with vehicle history reports, real-world scenarios, and practical applications
- Expertise: Show DEEP, EXPERT-LEVEL knowledge that goes beyond surface information - include industry insights, technical details, nuanced understanding
- Authoritativeness: Establish clear authority through comprehensive coverage, citing sources, referencing industry standards, demonstrating thought leadership
- Trustworthiness: Build maximum trust with accurate, verifiable, up-to-date information, transparent explanations, and honest assessments

The content must read as if written by a true industry expert with years of experience, not a beginner or AI-generated surface-level content.`;
  }

  enrichWithSEO(prompt, context) {
    const seoGuidelines = `
ADVANCED SEO Optimization Guidelines (For Genius-Level Articles):
- Use compelling, keyword-rich titles that stand out in SERP
- Write irresistible meta descriptions (150-160 characters) with emotional triggers
- Use proper heading hierarchy (H1 → H2 → H3 → H4) for better structure
- Include primary and secondary keywords naturally throughout (keyword density 1-2%)
- Optimize for featured snippets, People Also Ask, and other SERP features
- Use internal linking strategically (3-5 relevant internal links)
- Include structured data (Schema.org Article, FAQPage, HowTo where applicable)
- Ensure mobile-friendliness and fast loading times
- Optimize for Core Web Vitals (LCP, FID, CLS)
- Create highly shareable, linkable content that others want to reference
- Include social proof elements (statistics, expert quotes, case studies)
- Use semantic keywords and related terms naturally
- Create content clusters with related topics
- Optimize for voice search and conversational queries
- Include visual content descriptions (for images/tables)
- Create content that earns backlinks naturally`;

    return `${prompt}\n\n${seoGuidelines}`;
  }

  async getKnowledge(context) {
    // Получение знаний из AI Knowledge Core
    try {
      const fs = require('fs');
      const path = require('path');
      const knowledgePath = path.join(process.cwd(), 'data/knowledge/knowledge-base.jsonl');
      
      if (!fs.existsSync(knowledgePath)) {
        return this.getDefaultKnowledge();
      }

      const lines = fs.readFileSync(knowledgePath, 'utf8')
        .split('\n')
        .filter(Boolean);

      const knowledge = {
        seo: [],
        analytics: [],
        triz: [],
        bestPractices: []
      };

      lines.forEach(line => {
        try {
          const entry = JSON.parse(line);
          if (entry.category === 'seo') {
            knowledge.seo.push(entry.content);
          } else if (entry.category === 'analytics') {
            knowledge.analytics.push(entry.content);
          } else if (entry.category === 'triz') {
            knowledge.triz.push(entry.content);
          } else if (entry.category === 'best-practices') {
            knowledge.bestPractices.push(entry.content);
          }
        } catch (e) {
          // Пропускаем невалидные строки
        }
      });

      return knowledge;
    } catch (error) {
      return this.getDefaultKnowledge();
    }
  }

  getDefaultKnowledge() {
    return {
      seo: ['Create helpful, reliable, people-first content', 'Use descriptive URLs', 'Optimize for mobile'],
      triz: ['Separation in space/time', 'Mediator', 'Preliminary action'],
      bestPractices: ['Create comprehensive content', 'Use internal linking', 'Optimize for Core Web Vitals']
    };
  }

  enrichWithKnowledge(prompt, knowledge) {
    let enriched = prompt;
    
    // SEO принципы
    if (knowledge.seo && knowledge.seo.length > 0) {
      const seoPrinciples = this.extractSEOPrinciples(knowledge.seo);
      enriched += `\n\nSEO Guidelines:\n${seoPrinciples}`;
    }
    
    // TRIZ принципы
    if (knowledge.triz && knowledge.triz.length > 0) {
      const trizPrinciples = this.extractTRIZPrinciples(knowledge.triz);
      enriched += `\n\nTRIZ Principles to Apply:\n${trizPrinciples}`;
    }
    
    // Best practices
    if (knowledge.bestPractices && knowledge.bestPractices.length > 0) {
      const bestPractices = this.extractBestPractices(knowledge.bestPractices);
      enriched += `\n\nBest Practices:\n${bestPractices}`;
    }
    
    return enriched;
  }

  extractSEOPrinciples(seoKnowledge) {
    const principles = [];
    
    seoKnowledge.forEach(entry => {
      if (entry.principles) {
        principles.push(...entry.principles);
      }
      if (entry.eEAT) {
        principles.push(`E-E-A-T: ${JSON.stringify(entry.eEAT)}`);
      }
      if (entry.coreWebVitals) {
        principles.push(`Core Web Vitals: ${JSON.stringify(entry.coreWebVitals)}`);
      }
      if (entry.technical) {
        Object.entries(entry.technical).forEach(([key, value]) => {
          principles.push(`${key}: ${value}`);
        });
      }
    });
    
    return principles.slice(0, 10).map(p => `- ${p}`).join('\n');
  }

  extractTRIZPrinciples(trizKnowledge) {
    const principles = [];
    
    trizKnowledge.forEach(entry => {
      if (entry.principles) {
        entry.principles.slice(0, 5).forEach(principle => {
          principles.push(`${principle.name}: ${principle.description}`);
        });
      }
    });
    
    return principles.slice(0, 5).map(p => `- ${p}`).join('\n');
  }

  extractBestPractices(bestPractices) {
    const practices = [];
    
    bestPractices.forEach(entry => {
      if (entry.contentStrategy) {
        practices.push(...entry.contentStrategy.slice(0, 5));
      }
      if (entry.technical) {
        practices.push(...entry.technical.slice(0, 5));
      }
      if (entry.onPage) {
        practices.push(...entry.onPage.slice(0, 5));
      }
    });
    
    return practices.slice(0, 10).map(p => `- ${p}`).join('\n');
  }

  enrichWithTRIZ(prompt, context) {
    // TRIZ принципы
    const trizPrinciples = [
      'Separation in space/time',
      'Mediator',
      'Preliminary action',
      'Self-service'
    ];

    return `${prompt}\n\nTRIZ principles to apply: ${trizPrinciples.join(', ')}`;
  }

  addStrategyInstructions(prompt, strategy) {
    if (!strategy) return prompt;

    return `${prompt}\n\nStrategy constraints:\n- Memory: ${strategy.constraints?.memory}MB\n- Concurrency: ${strategy.constraints?.concurrency}\n- Batch size: ${strategy.constraints?.batchSize}`;
  }
}

module.exports = PromptEngine;

