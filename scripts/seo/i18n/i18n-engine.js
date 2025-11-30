const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: i18n Engine
 * Расширенная поддержка мультиязычности
 */
class I18nEngine {
  constructor(config) {
    this.config = config;
    this.supportedLanguages = config.languages || ['en'];
    this.defaultLanguage = config.defaultLanguage || 'en';
    this.translations = this.loadTranslations();
  }

  /**
   * Загрузка переводов (базовые шаблоны)
   */
  loadTranslations() {
    return {
      en: {
        'vin_report': 'VIN Report',
        'check_now': 'Check this VIN now',
        'full_report': 'Full Report',
        'key_facts': 'Key Facts',
        'local_insights': 'Local Insights',
        'faq': 'FAQ',
        'related_checks': 'Related VIN Checks'
      },
      es: {
        'vin_report': 'Informe VIN',
        'check_now': 'Verificar este VIN ahora',
        'full_report': 'Informe Completo',
        'key_facts': 'Datos Clave',
        'local_insights': 'Perspectivas Locales',
        'faq': 'Preguntas Frecuentes',
        'related_checks': 'Verificaciones VIN Relacionadas'
      }
    };
  }

  /**
   * Получение перевода
   */
  translate(key, lang) {
    const language = lang || this.defaultLanguage;
    const langTranslations = this.translations[language] || this.translations[this.defaultLanguage];
    return langTranslations[key] || key;
  }

  /**
   * Локализация текста на основе языка
   */
  localizeText(text, lang) {
    if (!text || typeof text !== 'string') return text;

    const language = lang || this.defaultLanguage;

    // Базовая локализация для испанского
    if (language === 'es') {
      // В реальной реализации здесь была бы более сложная логика локализации
      // или интеграция с сервисом перевода
      return text; // Пока возвращаем как есть
    }

    return text;
  }

  /**
   * Локализация метаданных страницы
   */
  localizeMetadata(page, lang) {
    const localized = { ...page };
    const language = lang || page.lang || this.defaultLanguage;

    // Локализация title
    if (localized.title) {
      localized.title = this.localizeText(localized.title, language);
    }

    // Локализация description
    if (localized.description) {
      localized.description = this.localizeText(localized.description, language);
    }

    // Локализация H1
    if (localized.h1) {
      localized.h1 = this.localizeText(localized.h1, language);
    }

    // Локализация intro
    if (localized.intro) {
      localized.intro = this.localizeText(localized.intro, language);
    }

    // Локализация localInsights
    if (localized.localInsights) {
      localized.localInsights = this.localizeText(localized.localInsights, language);
    }

    // Локализация FAQ
    if (localized.faq && Array.isArray(localized.faq)) {
      localized.faq = localized.faq.map(item => ({
        q: this.localizeText(item.q, language),
        a: this.localizeText(item.a, language)
      }));
    }

    localized.lang = language;
    return localized;
  }

  /**
   * Генерация hreflang тегов
   */
  generateHreflangTags(page, availableLanguages) {
    const baseUrl = 'https://vintrusted.com';
    const tags = [];

    for (const lang of availableLanguages) {
      const url = `${baseUrl}${page.url}?lang=${lang}`;
      tags.push({
        rel: 'alternate',
        hreflang: lang,
        href: url
      });
    }

    // Добавляем x-default
    tags.push({
      rel: 'alternate',
      hreflang: 'x-default',
      href: `${baseUrl}${page.url}`
    });

    return tags;
  }

  /**
   * Валидация языка
   */
  validateLanguage(lang) {
    return this.supportedLanguages.includes(lang);
  }

  /**
   * Получение языка по умолчанию для страницы
   */
  getDefaultLanguageForPage(page) {
    return page.lang || this.defaultLanguage;
  }

  /**
   * Определение языка из URL или контекста
   */
  detectLanguage(url, queryParams) {
    // Проверка query параметра
    if (queryParams && queryParams.lang) {
      const lang = queryParams.lang.toLowerCase();
      if (this.validateLanguage(lang)) {
        return lang;
      }
    }

    // Проверка пути URL (например, /es/...)
    const urlMatch = url.match(/^\/([a-z]{2})\//);
    if (urlMatch && this.validateLanguage(urlMatch[1])) {
      return urlMatch[1];
    }

    return this.defaultLanguage;
  }

  /**
   * Форматирование чисел в соответствии с языком
   */
  formatNumber(number, lang) {
    const language = lang || this.defaultLanguage;
    
    if (language === 'es') {
      // Испанский формат: 1.234,56
      return number.toLocaleString('es-ES');
    } else {
      // Английский формат: 1,234.56
      return number.toLocaleString('en-US');
    }
  }

  /**
   * Форматирование даты в соответствии с языком
   */
  formatDate(date, lang) {
    const language = lang || this.defaultLanguage;
    const dateObj = date instanceof Date ? date : new Date(date);

    if (language === 'es') {
      return dateObj.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } else {
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  }

  /**
   * Полная локализация страницы
   */
  localizePage(page) {
    const lang = this.getDefaultLanguageForPage(page);
    const localized = this.localizeMetadata(page, lang);

    // Добавляем hreflang теги
    localized.hreflangTags = this.generateHreflangTags(page, this.supportedLanguages);

    // Добавляем lang атрибут для HTML
    localized.htmlLang = lang;

    log('I18N', `Page localized for language: ${lang}`);

    return localized;
  }
}

module.exports = { I18nEngine };

