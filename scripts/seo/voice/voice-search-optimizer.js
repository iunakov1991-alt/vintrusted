const { log } = require('../logger');

class VoiceSearchOptimizer {
  constructor(config) {
    this.config = config;
  }

  optimize(page) {
    const questions = this.extractQuestions(page);
    const conversational = this.makeConversational(page);
    
    return {
      ...page,
      voiceOptimized: true,
      questions,
      conversationalContent: conversational
    };
  }

  extractQuestions(page) {
    const content = page.content || '';
    return content.split('?').filter(q => q.length > 10).slice(0, 5);
  }

  makeConversational(page) {
    return page.content?.replace(/\./g, '?') || '';
  }
}

module.exports = { VoiceSearchOptimizer };


