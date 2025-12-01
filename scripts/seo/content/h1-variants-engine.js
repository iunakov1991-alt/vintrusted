const crypto = require('crypto');
const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: H1 Variants Engine
 * Генерация 3-5 вариантов H1 для каждой страницы
 */
class H1VariantsEngine {
  constructor(config) {
    this.config = config;
  }

  /**
   * Генерация вариантов H1
   */
  generateH1Variants(page) {
    const { year, make, stateLabel, intent, lang } = page;
    const makeUpper = (make || '').toUpperCase();
    const variants = [];

    // Базовые варианты для разных intents
    if (intent === 'vin_check' || !intent) {
      variants.push(
        `VIN Check for ${year} ${makeUpper} in ${stateLabel} – Full Report`,
        `Complete VIN Report: ${year} ${makeUpper} in ${stateLabel}`,
        `${year} ${makeUpper} VIN History Check in ${stateLabel}`,
        `VIN Report for ${year} ${makeUpper} Registered in ${stateLabel}`,
        `Vehicle History Report: ${year} ${makeUpper} in ${stateLabel}`
      );
    } else if (intent === 'accident_check') {
      variants.push(
        `Accident History for ${year} ${makeUpper} in ${stateLabel}`,
        `${year} ${makeUpper} Accident Report in ${stateLabel}`,
        `Check Accident Records: ${year} ${makeUpper} in ${stateLabel}`,
        `Vehicle Accident History: ${year} ${makeUpper} in ${stateLabel}`
      );
    } else if (intent === 'ownership_history') {
      variants.push(
        `Ownership History for ${year} ${makeUpper} in ${stateLabel}`,
        `${year} ${makeUpper} Owner Records in ${stateLabel}`,
        `Vehicle Ownership Report: ${year} ${makeUpper} in ${stateLabel}`,
        `Previous Owners: ${year} ${makeUpper} in ${stateLabel}`
      );
    } else if (intent === 'title_brand') {
      variants.push(
        `Title Brand Check for ${year} ${makeUpper} in ${stateLabel}`,
        `${year} ${makeUpper} Title Status in ${stateLabel}`,
        `Vehicle Title Report: ${year} ${makeUpper} in ${stateLabel}`,
        `Title Brand History: ${year} ${makeUpper} in ${stateLabel}`
      );
    } else {
      // Generic fallback
      variants.push(
        `${year} ${makeUpper} Vehicle Report in ${stateLabel}`,
        `Complete Report: ${year} ${makeUpper} in ${stateLabel}`,
        `${year} ${makeUpper} History Check in ${stateLabel}`
      );
    }

    // Локализация для ES
    if (lang === 'es') {
      return variants.map(v => this.localizeH1(v, page));
    }

    return variants;
  }

  /**
   * Выбор варианта H1 на основе URL hash
   */
  selectH1Variant(page, variants) {
    if (!variants || variants.length === 0) {
      return page.h1 || 'Vehicle Report';
    }

    const urlHash = this.hashString(page.url || page.vin || '');
    const selectedIndex = urlHash % variants.length;
    return variants[selectedIndex];
  }

  /**
   * Обогащение страницы вариантами H1
   */
  enrichPageWithH1Variants(page) {
    const variants = this.generateH1Variants(page);
    const selectedH1 = this.selectH1Variant(page, variants);
    
    return {
      ...page,
      h1: selectedH1,
      h1Variants: variants // Сохраняем все варианты для будущего использования
    };
  }

  /**
   * Локализация H1 для ES
   */
  localizeH1(h1, page) {
    const { lang } = page;
    if (lang !== 'es') return h1;

    // Простая локализация ключевых слов
    const translations = {
      'VIN Check': 'Verificación de VIN',
      'Full Report': 'Informe Completo',
      'Complete VIN Report': 'Informe Completo de VIN',
      'VIN History Check': 'Verificación de Historial de VIN',
      'VIN Report': 'Informe de VIN',
      'Vehicle History Report': 'Informe de Historial del Vehículo',
      'Accident History': 'Historial de Accidentes',
      'Accident Report': 'Informe de Accidentes',
      'Ownership History': 'Historial de Propietarios',
      'Owner Records': 'Registros de Propietarios',
      'Title Brand Check': 'Verificación de Marca de Título',
      'Title Status': 'Estado del Título',
      'Vehicle Report': 'Informe del Vehículo',
      'History Check': 'Verificación de Historial',
      'in': 'en',
      'for': 'para',
      'Registered in': 'Registrado en'
    };

    let localized = h1;
    Object.entries(translations).forEach(([en, es]) => {
      localized = localized.replace(new RegExp(en, 'gi'), es);
    });

    return localized;
  }

  /**
   * Хеширование строки для детерминированного выбора
   */
  hashString(str) {
    return parseInt(crypto.createHash('md5').update(str).digest('hex').substring(0, 8), 16);
  }
}

module.exports = { H1VariantsEngine };


