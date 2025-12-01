const { VINReportTrainingExtractor } = require('./vin-report-training-extractor');
const { log } = require('../logger');
const path = require('path');
const fs = require('fs');

/**
 * SEO MONSTER 6.0: VIN Report Training Integration
 * Интеграция обучения на основе реального VIN отчета в AI Training Pipeline
 * ТРИЗ: Максимальный эффект от минимального шага
 */
class VINReportTrainingIntegration {
  constructor(config) {
    this.config = config;
    this.extractor = new VINReportTrainingExtractor(config);
    this.trainingDataPath = path.join(process.cwd(), 'data/seo/ai-training');
  }

  /**
   * ТРИЗ: Обучение AI на основе реального отчета
   * Принцип: Самокоррекция через обучение на лучших образцах
   */
  async trainFromReport(pdfPath) {
    log('VIN-REPORT-TRAINING', `Starting training from report: ${pdfPath}`);

    try {
      // Извлекаем данные из PDF
      const extractedData = await this.extractor.extractTrainingData(pdfPath);
      
      // ТРИЗ: Сохраняем для обучения
      const trainingPath = await this.extractor.saveTrainingData(extractedData);
      
      // ТРИЗ: Обогащаем AI Training Pipeline
      await this.enrichAITrainingPipeline(extractedData);
      
      // ТРИЗ: Создаем рекомендации для генерации контента
      const recommendations = this.generateContentRecommendations(extractedData);
      
      log('VIN-REPORT-TRAINING', 'Training completed successfully');
      
      return {
        success: true,
        trainingPath,
        recommendations,
        extractedData: {
          structure: extractedData.structure,
          semanticPatterns: Object.keys(extractedData.semanticPatterns),
          dataTypes: Object.keys(extractedData.dataTypes),
          writingStyle: extractedData.writingStyle,
          sections: extractedData.sections.length,
          metrics: extractedData.metrics
        }
      };
    } catch (e) {
      log('VIN-REPORT-TRAINING', `Training error: ${e.message}`);
      throw e;
    }
  }

  /**
   * ТРИЗ: Обогащение AI Training Pipeline
   * Принцип: Максимальное использование ресурсов
   */
  async enrichAITrainingPipeline(extractedData) {
    const knowledgeBasePath = path.join(this.trainingDataPath, 'knowledge-base.jsonl');
    
    // Добавляем знания о структуре отчета
    const structureKnowledge = {
      phase: 'vin-report-structure',
      type: 'report-structure',
      ingestedAt: new Date().toISOString(),
      knowledge: {
        sections: extractedData.sections.map(s => s.title),
        structure: extractedData.structure,
        visualElements: extractedData.visualElements
      },
      note: 'Real VIN report structure extracted from sample'
    };
    
    // Добавляем знания о семантических паттернах
    const semanticKnowledge = {
      phase: 'vin-report-semantics',
      type: 'semantic-patterns',
      ingestedAt: new Date().toISOString(),
      knowledge: extractedData.semanticPatterns,
      note: 'Semantic patterns from real VIN report'
    };
    
    // Добавляем знания о стиле изложения
    const styleKnowledge = {
      phase: 'vin-report-style',
      type: 'writing-style',
      ingestedAt: new Date().toISOString(),
      knowledge: extractedData.writingStyle,
      note: 'Writing style extracted from real VIN report'
    };
    
    // Сохраняем в knowledge base
    const appendToJSONL = (data) => {
      fs.appendFileSync(knowledgeBasePath, JSON.stringify(data) + '\n', 'utf8');
    };
    
    if (!fs.existsSync(knowledgeBasePath)) {
      fs.mkdirSync(path.dirname(knowledgeBasePath), { recursive: true });
    }
    
    appendToJSONL(structureKnowledge);
    appendToJSONL(semanticKnowledge);
    appendToJSONL(styleKnowledge);
    
    log('VIN-REPORT-TRAINING', 'AI Training Pipeline enriched with report data');
  }

  /**
   * ТРИЗ: Генерация рекомендаций для контента
   * Принцип: Предсказательное обслуживание
   */
  generateContentRecommendations(extractedData) {
    const recommendations = [];
    
    // Рекомендации по структуре
    if (extractedData.sections.length > 0) {
      recommendations.push({
        type: 'structure',
        message: `Use ${extractedData.sections.length} main sections in reports`,
        sections: extractedData.sections.map(s => s.title)
      });
    }
    
    // Рекомендации по стилю
    if (extractedData.writingStyle.tone === 'professional') {
      recommendations.push({
        type: 'style',
        message: 'Maintain professional tone in all reports',
        tone: extractedData.writingStyle.tone,
        formality: extractedData.writingStyle.formality
      });
    }
    
    // Рекомендации по семантике
    const semanticKeys = Object.keys(extractedData.semanticPatterns);
    if (semanticKeys.length > 0) {
      recommendations.push({
        type: 'semantics',
        message: `Cover these semantic areas: ${semanticKeys.join(', ')}`,
        areas: semanticKeys
      });
    }
    
    // Рекомендации по данным
    if (extractedData.dataTypes.dates.length > 0) {
      recommendations.push({
        type: 'data',
        message: 'Include date information in reports',
        dateFormats: extractedData.dataTypes.dates.slice(0, 5)
      });
    }
    
    return recommendations;
  }
}

module.exports = { VINReportTrainingIntegration };


