const { log } = require('../logger');

class LocalSEOOptimizer {
  constructor(config) {
    this.config = config;
  }

  optimize(page) {
    if (page.stateSlug) {
      return {
        ...page,
        localSEO: {
          region: page.stateSlug,
          structuredData: this.generateLocalStructuredData(page)
        }
      };
    }
    return page;
  }

  generateLocalStructuredData(page) {
    return {
      '@type': 'LocalBusiness',
      address: {
        addressRegion: page.stateSlug
      }
    };
  }
}

module.exports = { LocalSEOOptimizer };


