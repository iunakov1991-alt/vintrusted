const { log } = require('../logger');

class EnhancedStructuredData {
  constructor(config) {
    this.config = config;
  }

  generateStructuredData(page) {
    const sd = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: page.title,
      url: page.url,
      description: page.metaDescription
    };

    if (page.vin) {
      sd.mainEntity = {
        '@type': 'Vehicle',
        vehicleIdentificationNumber: page.vin,
        manufacturer: page.make,
        model: page.model,
        productionDate: page.year
      };
    }

    if (page.faq && page.faq.length > 0) {
      sd.mainEntity = {
        '@type': 'FAQPage',
        mainEntity: page.faq.map(q => ({
          '@type': 'Question',
          name: q.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: q.answer
          }
        }))
      };
    }

    return JSON.stringify(sd);
  }

  optimizePage(page) {
    return {
      ...page,
      structuredData: this.generateStructuredData(page),
      hasStructuredData: true
    };
  }
}

module.exports = { EnhancedStructuredData };


