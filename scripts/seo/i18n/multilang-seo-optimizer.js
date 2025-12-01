const { log } = require('../logger');

class MultilangSEOOptimizer {
  constructor(config) {
    this.config = config;
  }

  optimize(page) {
    const hreflang = this.generateHreflang(page);
    return {
      ...page,
      hreflang,
      lang: page.lang || 'en'
    };
  }

  generateHreflang(page) {
    return [
      { lang: 'en', url: page.url },
      { lang: 'es', url: page.url.replace('/vin/', '/es/vin/') }
    ];
  }
}

module.exports = { MultilangSEOOptimizer };


