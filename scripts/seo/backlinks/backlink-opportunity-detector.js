const { log } = require('../logger');

class BacklinkOpportunityDetector {
  constructor(config) {
    this.config = config;
  }

  detectOpportunities(page) {
    return {
      type: 'resource-page',
      opportunities: ['guest-posting', 'resource-links', 'data-citations']
    };
  }
}

module.exports = { BacklinkOpportunityDetector };


