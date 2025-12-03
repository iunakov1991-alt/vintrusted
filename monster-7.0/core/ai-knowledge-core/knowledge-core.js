/**
 * [G] AI KNOWLEDGE CORE & TRIZ TRAINER
 * 
 * Внутренний AI, обученный на документации Google, TRIZ, best practices.
 * Использует локальный AI (Ollama) для M1.
 */

const fs = require('fs');
const path = require('path');

class AIKnowledgeCore {
  constructor(config) {
    this.config = config;
    this.knowledgePath = path.join(process.cwd(), 'data/knowledge');
    this.model = config.modules?.aiKnowledgeCore?.model || 'phi3';
    this.localAI = null;
    this.initLocalAI();
  }

  initLocalAI() {
    // Инициализация локального AI (Ollama)
    if (this.config.modules?.aiKnowledgeCore?.localAI) {
      try {
        // Проверка наличия LocalAIProvider (может быть в scripts/seo/ai/)
        const localAIPath = require.resolve('../../scripts/seo/ai/local-ai-provider.js', { paths: [process.cwd()] });
        const { LocalAIProvider } = require(localAIPath);
        this.localAI = new LocalAIProvider({
          localAIModel: this.model
        });
      } catch (error) {
        // Fallback: LocalAI не доступен, используем только знания
        console.warn('Local AI not available, using knowledge base only');
        this.localAI = null;
      }
    }
  }

  async execute(params = {}) {
    const { task, context } = params;

    // Получение знаний
    const knowledge = await this.getKnowledge(task, context);

    // Обогащение через AI
    const enriched = await this.enrichWithAI(knowledge, context);

    return {
      knowledge,
      enriched,
      model: this.model
    };
  }

  async getKnowledge(task, context) {
    // Загрузка базы знаний
    const knowledgeBase = this.loadKnowledgeBase();

    // Фильтрация по задаче
    const relevant = knowledgeBase.filter(k => 
      k.tags?.some(tag => task?.includes(tag))
    );

    return {
      base: knowledgeBase,
      relevant,
      count: relevant.length
    };
  }

  loadKnowledgeBase() {
    const basePath = path.join(this.knowledgePath, 'knowledge-base.jsonl');
    
    if (!fs.existsSync(basePath)) {
      return [];
    }

    try {
      const lines = fs.readFileSync(basePath, 'utf8')
        .split('\n')
        .filter(Boolean);

      return lines.map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      }).filter(Boolean);
    } catch (error) {
      return [];
    }
  }

  async enrichWithAI(knowledge, context) {
    if (!this.localAI) {
      return knowledge; // Fallback без AI
    }

    try {
      const prompt = this.buildPrompt(knowledge, context);
      const response = await this.localAI.generateText(prompt, {
        maxTokens: 500
      });

      return {
        ...knowledge,
        aiEnriched: true,
        aiResponse: response
      };
    } catch (error) {
      return knowledge; // Fallback при ошибке
    }
  }

  buildPrompt(knowledge, context) {
    return `Based on this knowledge: ${JSON.stringify(knowledge.relevant?.slice(0, 3) || [])}, provide insights for: ${context || 'SEO optimization'}`;
  }

  async learnFromFeedback(feedback) {
    // Сохранение обратной связи для обучения
    const feedbackPath = path.join(process.cwd(), 'data/feedback/feedback.jsonl');
    
    try {
      if (!fs.existsSync(path.dirname(feedbackPath))) {
        fs.mkdirSync(path.dirname(feedbackPath), { recursive: true });
      }

      const entry = {
        timestamp: new Date().toISOString(),
        feedback,
        learned: true
      };

      fs.appendFileSync(feedbackPath, JSON.stringify(entry) + '\n');
    } catch (error) {
      // Игнорируем ошибки
    }
  }

  /**
   * Обучение на пользовательских материалах
   */
  async learnFromMaterials(materials) {
    const materialsPath = path.join(process.cwd(), 'data/knowledge/user-materials.jsonl');
    const knowledgeBasePath = path.join(this.knowledgePath, 'knowledge-base.jsonl');
    
    try {
      // Создаем директории если нужно
      if (!fs.existsSync(path.dirname(materialsPath))) {
        fs.mkdirSync(path.dirname(materialsPath), { recursive: true });
      }
      if (!fs.existsSync(path.dirname(knowledgeBasePath))) {
        fs.mkdirSync(path.dirname(knowledgeBasePath), { recursive: true });
      }

      let savedCount = 0;

      for (const material of materials) {
        // Сохраняем в user-materials для истории
        const userEntry = {
          timestamp: material.timestamp || new Date().toISOString(),
          type: material.type,
          filename: material.filename,
          source: material.source,
          contentLength: material.content?.length || 0
        };
        fs.appendFileSync(materialsPath, JSON.stringify(userEntry) + '\n');

        // Добавляем в knowledge-base для использования AI
        const knowledgeEntry = {
          id: `user-${Date.now()}-${savedCount}`,
          timestamp: material.timestamp || new Date().toISOString(),
          type: material.type,
          source: material.source,
          filename: material.filename,
          content: material.content,
          tags: this.extractTags(material.content),
          category: 'user-material',
          priority: 'high'
        };
        fs.appendFileSync(knowledgeBasePath, JSON.stringify(knowledgeEntry) + '\n');
        savedCount++;
      }

      return savedCount;
    } catch (error) {
      console.error('Error saving materials:', error);
      return 0;
    }
  }

  /**
   * Извлечение тегов из контента
   */
  extractTags(content) {
    if (!content) return [];
    
    const tags = [];
    const lowerContent = content.toLowerCase();
    
    // Ключевые слова для тегов
    const keywords = {
      'seo': ['seo', 'search engine', 'optimization', 'ranking', 'keywords'],
      'triz': ['triz', 'contradiction', 'principle', 'inventive'],
      'google': ['google', 'analytics', 'search console', 'gtm'],
      'content': ['content', 'article', 'blog', 'writing'],
      'technical': ['technical', 'code', 'implementation', 'architecture']
    };
    
    for (const [tag, words] of Object.entries(keywords)) {
      if (words.some(word => lowerContent.includes(word))) {
        tags.push(tag);
      }
    }
    
    return tags;
  }

  /**
   * Получение пользовательских материалов
   */
  getUserMaterials(limit = 50) {
    const materialsPath = path.join(process.cwd(), 'data/knowledge/user-materials.jsonl');
    
    if (!fs.existsSync(materialsPath)) {
      return [];
    }

    try {
      const lines = fs.readFileSync(materialsPath, 'utf8')
        .split('\n')
        .filter(Boolean)
        .slice(-limit); // Последние N записей

      return lines.map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      }).filter(Boolean);
    } catch (error) {
      return [];
    }
  }
}

module.exports = AIKnowledgeCore;

