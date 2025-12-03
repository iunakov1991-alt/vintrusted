/**
 * Скрипт для обновления существующих SEO страниц новым дизайном
 */

const fs = require('fs');
const path = require('path');

// Импортируем ContentGenerator для использования его методов
const ContentGenerator = require('../core/modules/content-generator');

// Загружаем конфиг
let config;
try {
  config = require('../../config/monster.config.json');
} catch (e) {
  // Fallback конфиг
  config = {
    modules: {
      aiKnowledgeCore: {
        model: 'phi3'
      }
    }
  };
}

class SEOPageUpdater {
  constructor() {
    this.contentGenerator = new ContentGenerator(config);
    this.seoPagesPath = path.join(process.cwd(), 'public/seo-pages');
    this.updatedCount = 0;
    this.errorCount = 0;
  }

  /**
   * Обновление всех SEO страниц
   */
  async updateAllPages() {
    console.log('🔄 Начинаю обновление SEO страниц...\n');

    if (!fs.existsSync(this.seoPagesPath)) {
      console.error('❌ Папка public/seo-pages не найдена');
      return;
    }

    const directories = fs.readdirSync(this.seoPagesPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    console.log(`📁 Найдено ${directories.length} директорий для обновления\n`);

    for (const dir of directories) {
      const pagePath = path.join(this.seoPagesPath, dir, 'index.html');
      
      if (fs.existsSync(pagePath)) {
        try {
          await this.updatePage(pagePath, dir);
          this.updatedCount++;
        } catch (error) {
          console.error(`❌ Ошибка при обновлении ${dir}:`, error.message);
          this.errorCount++;
        }
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ОБНОВЛЕНИЕ ЗАВЕРШЕНО');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Обновлено: ${this.updatedCount} страниц`);
    console.log(`❌ Ошибок: ${this.errorCount} страниц`);
  }

  /**
   * Обновление одной страницы
   */
  async updatePage(pagePath, dirName) {
    const html = fs.readFileSync(pagePath, 'utf8');
    
    // Парсим существующий контент
    const content = this.parseExistingPage(html);
    
    // Создаем контекст из имени директории
    const context = this.parseContextFromDir(dirName);
    
    // Генерируем новый HTML с новым дизайном
    const newHTML = this.contentGenerator.buildPage(content, context, {
      priority: 'high',
      type: context.intent || 'general'
    });

    // Сохраняем обновленную страницу
    fs.writeFileSync(pagePath, newHTML.html, 'utf8');
    
    console.log(`✅ Обновлена: ${dirName}`);
  }

  /**
   * Парсинг существующей страницы для извлечения контента
   */
  parseExistingPage(html) {
    // Извлекаем title
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : '';

    // Извлекаем meta description
    const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);
    const metaDescription = descMatch ? descMatch[1] : '';

    // Извлекаем H1
    const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
    const h1 = h1Match ? h1Match[1].replace(/<[^>]+>/g, '').trim() : '';

    // Извлекаем все секции
    const sections = [];
    
    // Ищем все h2 и их контент
    const h2Matches = [...html.matchAll(/<h2[^>]*>(.*?)<\/h2>/gi)];
    const pMatches = [...html.matchAll(/<p[^>]*>(.*?)<\/p>/gi)];
    const ulMatches = [...html.matchAll(/<ul[^>]*>(.*?)<\/ul>/gis)];
    
    // Парсим FAQ если есть
    const faqMatch = html.match(/<div\s+class=["']faq["']>(.*?)<\/div>/gis);
    if (faqMatch) {
      const faqQuestions = [...html.matchAll(/<div\s+class=["']faq-item["']>(.*?)<\/div>/gis)];
      const questions = faqQuestions.map(q => {
        const qMatch = q[1].match(/<h3[^>]*>(.*?)<\/h3>/i);
        const aMatch = q[1].match(/<p[^>]*>(.*?)<\/p>/i);
        return {
          q: qMatch ? qMatch[1].replace(/<[^>]+>/g, '').trim() : '',
          a: aMatch ? aMatch[1].replace(/<[^>]+>/g, '').trim() : ''
        };
      }).filter(q => q.q && q.a);

      if (questions.length > 0) {
        sections.push({
          type: 'faq',
          heading: 'Frequently Asked Questions',
          content: '',
          questions
        });
      }
    }

    // Добавляем обычные секции
    h2Matches.forEach((match, index) => {
      const heading = match[1].replace(/<[^>]+>/g, '').trim();
      const nextH2 = h2Matches[index + 1];
      const sectionHTML = nextH2 
        ? html.substring(match.index, nextH2.index)
        : html.substring(match.index);
      
      const pMatch = sectionHTML.match(/<p[^>]*>(.*?)<\/p>/i);
      const content = pMatch ? pMatch[1].replace(/<[^>]+>/g, '').trim() : '';
      
      const ulMatch = sectionHTML.match(/<ul[^>]*>(.*?)<\/ul>/gis);
      const bullets = ulMatch ? [...ulMatch[0].matchAll(/<li[^>]*>(.*?)<\/li>/gi)]
        .map(m => m[1].replace(/<[^>]+>/g, '').trim())
        .filter(b => b) : [];

      if (heading && (content || bullets.length > 0)) {
        sections.push({
          type: 'main',
          heading,
          content,
          bullets: bullets.length > 0 ? bullets : undefined
        });
      }
    });

    // Если секций нет, создаем базовую
    if (sections.length === 0) {
      sections.push({
        type: 'introduction',
        heading: 'Introduction',
        content: metaDescription || 'Comprehensive information about vehicle history reports.'
      });
    }

    return {
      title,
      h1: h1 || title,
      metaDescription,
      sections
    };
  }

  /**
   * Парсинг контекста из имени директории
   */
  parseContextFromDir(dirName) {
    // Формат: intent-index (например: vin_check-0)
    const parts = dirName.split('-');
    const intent = parts[0] || 'general';
    const index = parseInt(parts[1]) || 0;

    return {
      intent,
      theme: intent,
      keywords: [intent],
      index
    };
  }
}

// Запуск обновления
if (require.main === module) {
  const updater = new SEOPageUpdater();
  updater.updateAllPages().catch(error => {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  });
}

module.exports = SEOPageUpdater;

