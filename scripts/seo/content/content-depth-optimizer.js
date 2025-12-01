const { log } = require('../logger');

class ContentDepthOptimizer {
  constructor(config) {
    this.config = config;
  }

  optimize(page) {
    const optimalLength = this.calculateOptimalLength(page);
    return {
      ...page,
      optimalContentLength: optimalLength,
      needsExpansion: (page.content?.length || 0) < optimalLength
    };
  }

  calculateOptimalLength(page) {
    // Оптимально 2000-5000 символов
    return 3000;
  }
}

module.exports = { ContentDepthOptimizer };


