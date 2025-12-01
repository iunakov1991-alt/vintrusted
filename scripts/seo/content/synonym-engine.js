const crypto = require('crypto');
const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Synonym Engine
 * Применение синонимов к контенту для снижения SEO footprint
 */
class SynonymEngine {
  constructor(config) {
    this.config = config;
    this.synonymPaths = this.initializeSynonymPaths();
  }

  /**
   * Инициализация синонимичных путей
   */
  initializeSynonymPaths() {
    return {
      vinCheck: {
        primary: ['VIN check', 'VIN report', 'VIN history'],
        secondary: ['VIN lookup', 'VIN verification', 'VIN decoder'],
        tertiary: ['vehicle report', 'car history', 'automotive records']
      },
      accident: {
        primary: ['accident', 'collision', 'crash'],
        secondary: ['incident', 'damage', 'impact'],
        tertiary: ['wreck', 'mishap', 'event']
      },
      ownership: {
        primary: ['ownership', 'owner', 'possession'],
        secondary: ['proprietorship', 'holder', 'keeper'],
        tertiary: ['custodian', 'registrant', 'titleholder']
      },
      title: {
        primary: ['title', 'certificate', 'document'],
        secondary: ['registration', 'ownership document', 'papers'],
        tertiary: ['deed', 'proof of ownership', 'legal document']
      },
      mileage: {
        primary: ['mileage', 'odometer', 'miles'],
        secondary: ['distance', 'reading', 'odometer reading'],
        tertiary: ['total miles', 'vehicle mileage', 'odometer value']
      },
      vehicle: {
        primary: ['vehicle', 'car', 'automobile'],
        secondary: ['auto', 'motor vehicle', 'machine'],
        tertiary: ['motorcar', 'wheels', 'ride']
      },
      report: {
        primary: ['report', 'record', 'history'],
        secondary: ['documentation', 'file', 'archive'],
        tertiary: ['dossier', 'chronicle', 'log']
      },
      check: {
        primary: ['check', 'verify', 'validate'],
        secondary: ['examine', 'inspect', 'review'],
        tertiary: ['audit', 'assess', 'evaluate']
      }
    };
  }

  /**
   * Применение синонимов к тексту
   */
  applySynonymsToText(text, pathName, level = 'primary') {
    const path = this.synonymPaths[pathName];
    if (!path || !text) return text;

    const hash = this.hashString(text);
    const useLevel = hash % 3 === 0 ? 'tertiary' : hash % 2 === 0 ? 'secondary' : 'primary';
    const synonyms = path[useLevel];
    
    let result = text;
    
    // Применяем замены из primary на выбранный уровень
    path.primary.forEach((primary, idx) => {
      if (synonyms[idx] && primary !== synonyms[idx]) {
        const regex = new RegExp(`\\b${this.escapeRegex(primary)}\\b`, 'gi');
        result = result.replace(regex, synonyms[idx]);
      }
    });

    return result;
  }

  /**
   * Применение синонимов к странице
   */
  applySynonymsToPage(page) {
    if (!page || !page.url) return page;

    const newPage = { ...page };
    const hash = this.hashString(page.url || '');
    const pathNames = Object.keys(this.synonymPaths);
    const pathIndex = hash % pathNames.length;
    const pathName = pathNames[pathIndex];

    // Применяем синонимы к разным полям
    if (newPage.title) {
      newPage.title = this.applySynonymsToText(newPage.title, pathName);
    }
    
    if (newPage.description) {
      newPage.description = this.applySynonymsToText(newPage.description, pathName);
    }
    
    if (newPage.h1) {
      newPage.h1 = this.applySynonymsToText(newPage.h1, pathName);
    }
    
    if (newPage.intro) {
      newPage.intro = this.applySynonymsToText(newPage.intro, pathName);
    }
    
    if (newPage.aiText) {
      // Для AI текста применяем более консервативно (только 1-2 замены)
      newPage.aiText = this.applySynonymsToText(newPage.aiText, pathName);
    }

    return newPage;
  }

  /**
   * Хеширование строки
   */
  hashString(str) {
    return parseInt(crypto.createHash('md5').update(str).digest('hex').substring(0, 8), 16);
  }

  /**
   * Экранирование для regex
   */
  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

module.exports = { SynonymEngine };


