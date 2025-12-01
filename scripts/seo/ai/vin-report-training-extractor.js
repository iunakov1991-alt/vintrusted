const fs = require('fs');
const path = require('path');
const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: VIN Report Training Extractor
 * Извлекает структуру и данные из реального VIN отчета для обучения AI
 * ТРИЗ: Максимальное использование ресурсов - извлекаем максимум пользы из образца
 */
class VINReportTrainingExtractor {
  constructor(config) {
    this.config = config;
    this.competitorBrands = [
      'clearvin',
      'clear vin',
      'clear-vin',
      'clear_vin',
      'clearvin.com',
      'clear-vin.com'
    ];
    this.trainingDataPath = path.join(process.cwd(), 'data/seo/ai-training');
  }

  /**
   * ТРИЗ: Извлечение максимума пользы из образца
   * Принцип: Минимальный шаг - максимальный эффект
   */
  async extractTrainingData(pdfPath) {
    log('VIN-REPORT-EXTRACTOR', `Extracting training data from: ${pdfPath}`);

    if (!fs.existsSync(pdfPath)) {
      throw new Error(`PDF file not found: ${pdfPath}`);
    }

    // Читаем PDF (используем pdf-parse или аналогичную библиотеку)
    const pdfContent = await this.readPDF(pdfPath);
    
    // ТРИЗ: Удаляем конкурента (конфликт превращен в функцию - очистка данных)
    const cleanedContent = this.removeCompetitorBrands(pdfContent);
    
    // ТРИЗ: Извлекаем структуру (максимальное использование ресурсов)
    const structure = this.extractStructure(cleanedContent);
    
    // ТРИЗ: Извлекаем семантические паттерны (закон идеальности)
    const semanticPatterns = this.extractSemanticPatterns(cleanedContent);
    
    // ТРИЗ: Извлекаем типы данных (использование внутренних ресурсов)
    const dataTypes = this.extractDataTypes(cleanedContent);
    
    // ТРИЗ: Извлекаем стиль изложения (самокоррекция - учимся на лучших образцах)
    const writingStyle = this.extractWritingStyle(cleanedContent);
    
    // ТРИЗ: Извлекаем секции и их структуру (устранение операционной бессмысленности)
    const sections = this.extractSections(cleanedContent);
    
    // ТРИЗ: Извлекаем ключевые метрики и показатели (предсказательное обслуживание)
    const metrics = this.extractMetrics(cleanedContent);
    
    // ТРИЗ: Извлекаем визуальные элементы (использование всех ресурсов)
    const visualElements = this.extractVisualElements(cleanedContent);
    
    return {
      structure,
      semanticPatterns,
      dataTypes,
      writingStyle,
      sections,
      metrics,
      visualElements,
      rawContent: cleanedContent,
      extractedAt: new Date().toISOString()
    };
  }

  /**
   * Чтение PDF файла
   */
  async readPDF(pdfPath) {
    try {
      // Пробуем использовать pdf-parse
      const pdfParse = require('pdf-parse');
      const dataBuffer = fs.readFileSync(pdfPath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } catch (e) {
      // Fallback: пытаемся прочитать как текст (если PDF уже конвертирован)
      log('VIN-REPORT-EXTRACTOR', `PDF parsing error: ${e.message}, trying text fallback`);
      if (fs.existsSync(pdfPath.replace('.pdf', '.txt'))) {
        return fs.readFileSync(pdfPath.replace('.pdf', '.txt'), 'utf8');
      }
      throw new Error(`Cannot read PDF: ${e.message}`);
    }
  }

  /**
   * ТРИЗ: Удаление брендов конкурентов
   * Принцип: Конфликты превращены в функции - очистка данных
   */
  removeCompetitorBrands(content) {
    let cleaned = content;
    
    // Удаляем все упоминания конкурентов (регистронезависимо)
    for (const brand of this.competitorBrands) {
      const regex = new RegExp(brand, 'gi');
      cleaned = cleaned.replace(regex, '[REMOVED_COMPETITOR]');
    }
    
    // Удаляем логотипы и изображения конкурентов (паттерны)
    cleaned = cleaned.replace(/\[REMOVED_COMPETITOR\][\s\S]*?\[REMOVED_COMPETITOR\]/g, '');
    cleaned = cleaned.replace(/\[REMOVED_COMPETITOR\]/g, '');
    
    // Удаляем URL конкурентов
    cleaned = cleaned.replace(/https?:\/\/[^\s]*clearvin[^\s]*/gi, '');
    cleaned = cleaned.replace(/www\.[^\s]*clearvin[^\s]*/gi, '');
    
    // Удаляем email конкурентов
    cleaned = cleaned.replace(/[^\s]+@[^\s]*clearvin[^\s]*/gi, '');
    
    log('VIN-REPORT-EXTRACTOR', 'Competitor brands removed from content');
    return cleaned;
  }

  /**
   * ТРИЗ: Извлечение структуры отчета
   * Принцип: Максимальное использование ресурсов
   */
  extractStructure(content) {
    const structure = {
      title: this.extractTitle(content),
      sections: [],
      headers: [],
      tables: [],
      lists: [],
      keyValuePairs: []
    };

    // Извлекаем заголовки (H1, H2, H3)
    const headerPattern = /^(#{1,3}|[A-Z][A-Z\s]{10,})$/gm;
    const headers = content.match(headerPattern) || [];
    structure.headers = headers.map(h => h.trim());

    // Извлекаем таблицы (паттерны с разделителями)
    const tablePattern = /(\|.+\|[\r\n]+)+/g;
    const tables = content.match(tablePattern) || [];
    structure.tables = tables.map(t => this.parseTable(t));

    // Извлекаем списки
    const listPattern = /^[\s]*[-*•]\s+.+$/gm;
    const lists = content.match(listPattern) || [];
    structure.lists = lists.map(l => l.trim());

    // Извлекаем ключ-значение пары
    const kvPattern = /^([^:]+):\s*(.+)$/gm;
    const kvPairs = [];
    let match;
    while ((match = kvPattern.exec(content)) !== null) {
      kvPairs.push({ key: match[1].trim(), value: match[2].trim() });
    }
    structure.keyValuePairs = kvPairs;

    return structure;
  }

  /**
   * Извлечение заголовка
   */
  extractTitle(content) {
    const lines = content.split('\n').slice(0, 10);
    for (const line of lines) {
      if (line.length > 10 && line.length < 100 && /[A-Z]/.test(line)) {
        return line.trim();
      }
    }
    return 'VIN Report';
  }

  /**
   * Парсинг таблицы
   */
  parseTable(tableText) {
    const rows = tableText.split('\n').filter(r => r.trim());
    return rows.map(row => {
      const cells = row.split('|').filter(c => c.trim());
      return cells.map(c => c.trim());
    });
  }

  /**
   * ТРИЗ: Извлечение семантических паттернов
   * Принцип: Закон идеальности - извлекаем паттерны для обучения
   */
  extractSemanticPatterns(content) {
    const patterns = {
      vehicleInfo: [],
      accidentHistory: [],
      ownershipHistory: [],
      titleBrands: [],
      odometerReadings: [],
      recalls: [],
      specifications: []
    };

    // Паттерны для Vehicle Info
    const vinPattern = /\b[0-9A-HJ-NPR-Z]{17}\b/g;
    patterns.vehicleInfo.push(...(content.match(vinPattern) || []));

    // Паттерны для Accident History
    const accidentKeywords = ['accident', 'collision', 'damage', 'crash', 'total loss'];
    for (const keyword of accidentKeywords) {
      const regex = new RegExp(`\\b${keyword}[^.]{0,200}`, 'gi');
      const matches = content.match(regex) || [];
      patterns.accidentHistory.push(...matches);
    }

    // Паттерны для Ownership
    const ownershipKeywords = ['owner', 'registration', 'purchase', 'sale', 'transfer'];
    for (const keyword of ownershipKeywords) {
      const regex = new RegExp(`\\b${keyword}[^.]{0,200}`, 'gi');
      const matches = content.match(regex) || [];
      patterns.ownershipHistory.push(...matches);
    }

    // Паттерны для Title Brands
    const titleBrandKeywords = ['salvage', 'rebuilt', 'flood', 'theft', 'junk'];
    for (const keyword of titleBrandKeywords) {
      const regex = new RegExp(`\\b${keyword}[^.]{0,200}`, 'gi');
      const matches = content.match(regex) || [];
      patterns.titleBrands.push(...matches);
    }

    // Паттерны для Odometer
    const odometerPattern = /\b\d{1,6}\s*(miles?|mi|km|kilometers?)\b/gi;
    patterns.odometerReadings.push(...(content.match(odometerPattern) || []));

    // Паттерны для Recalls
    const recallPattern = /\brecall[^.]{0,200}/gi;
    patterns.recalls.push(...(content.match(recallPattern) || []));

    return patterns;
  }

  /**
   * ТРИЗ: Извлечение типов данных
   * Принцип: Использование внутренних ресурсов
   */
  extractDataTypes(content) {
    return {
      dates: this.extractDates(content),
      numbers: this.extractNumbers(content),
      locations: this.extractLocations(content),
      vehicles: this.extractVehicleData(content),
      people: this.extractPeopleData(content)
    };
  }

  extractDates(content) {
    const datePatterns = [
      /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,
      /\b\d{4}-\d{2}-\d{2}\b/g,
      /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/gi
    ];
    const dates = [];
    for (const pattern of datePatterns) {
      dates.push(...(content.match(pattern) || []));
    }
    return [...new Set(dates)];
  }

  extractNumbers(content) {
    const numberPattern = /\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b/g;
    return content.match(numberPattern) || [];
  }

  extractLocations(content) {
    const statePattern = /\b[A-Z]{2}\b/g;
    const cityPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2}\b/g;
    const states = content.match(statePattern) || [];
    const cities = content.match(cityPattern) || [];
    return { states: [...new Set(states)], cities: [...new Set(cities)] };
  }

  extractVehicleData(content) {
    const makePattern = /\b(Toyota|Honda|Ford|Chevrolet|BMW|Mercedes|Audi|Lexus|Nissan|Hyundai|Kia|Mazda|Subaru|Volkswagen|Jeep|Ram|GMC|Cadillac|Infiniti|Acura)\b/gi;
    const modelPattern = /\b(Camry|Corolla|RAV4|Highlander|Prius|Civic|Accord|CR-V|Pilot|F-150|Silverado|Tahoe|3 Series|5 Series|C-Class|E-Class|A4|A6|RX|ES|Altima|Sentra|Rogue|Elantra|Sonata|Sorento|CX-5|CX-9|Outback|Forester|Jetta|Passat|Wrangler|Grand Cherokee|1500|2500|Sierra|Yukon|Escalade|Q50|Q60|TLX|RDX)\b/gi;
    return {
      makes: [...new Set((content.match(makePattern) || []).map(m => m.trim()))],
      models: [...new Set((content.match(modelPattern) || []).map(m => m.trim()))]
    };
  }

  extractPeopleData(content) {
    // Простой паттерн для имен (заглавные буквы + пробелы)
    const namePattern = /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g;
    return content.match(namePattern) || [];
  }

  /**
   * ТРИЗ: Извлечение стиля изложения
   * Принцип: Самокоррекция - учимся на лучших образцах
   */
  extractWritingStyle(content) {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    return {
      avgSentenceLength: sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length,
      avgWordsPerSentence: sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length,
      tone: this.analyzeTone(content),
      formality: this.analyzeFormality(content),
      technicalTerms: this.extractTechnicalTerms(content),
      commonPhrases: this.extractCommonPhrases(content)
    };
  }

  analyzeTone(content) {
    const professionalKeywords = ['report', 'analysis', 'verified', 'confirmed', 'official'];
    const casualKeywords = ['hey', 'cool', 'awesome', 'wow'];
    
    const professionalCount = professionalKeywords.reduce((sum, kw) => {
      return sum + (content.toLowerCase().match(new RegExp(kw, 'g')) || []).length;
    }, 0);
    
    const casualCount = casualKeywords.reduce((sum, kw) => {
      return sum + (content.toLowerCase().match(new RegExp(kw, 'g')) || []).length;
    }, 0);
    
    return professionalCount > casualCount ? 'professional' : 'casual';
  }

  analyzeFormality(content) {
    const formalMarkers = ['shall', 'must', 'required', 'mandatory', 'compliance'];
    const informalMarkers = ['gonna', 'wanna', 'yeah', 'okay'];
    
    const formalCount = formalMarkers.reduce((sum, m) => {
      return sum + (content.toLowerCase().match(new RegExp(m, 'g')) || []).length;
    }, 0);
    
    const informalCount = informalMarkers.reduce((sum, m) => {
      return sum + (content.toLowerCase().match(new RegExp(m, 'g')) || []).length;
    }, 0);
    
    if (formalCount > informalCount * 2) return 'formal';
    if (informalCount > formalCount * 2) return 'informal';
    return 'neutral';
  }

  extractTechnicalTerms(content) {
    const technicalTerms = [
      'VIN', 'Odometer', 'Title', 'Salvage', 'Rebuilt', 'Lien',
      'Registration', 'Accident', 'Damage', 'Recall', 'NHTSA',
      'DMV', 'NMVTIS', 'CARFAX', 'AutoCheck'
    ];
    
    const found = [];
    for (const term of technicalTerms) {
      if (content.includes(term)) {
        found.push(term);
      }
    }
    return found;
  }

  extractCommonPhrases(content) {
    const phrases = [
      'vehicle identification number',
      'total loss',
      'accident reported',
      'title brand',
      'odometer reading',
      'registration history',
      'ownership history',
      'recall information'
    ];
    
    const found = [];
    for (const phrase of phrases) {
      if (content.toLowerCase().includes(phrase)) {
        found.push(phrase);
      }
    }
    return found;
  }

  /**
   * ТРИЗ: Извлечение секций
   * Принцип: Устранение операционной бессмысленности
   */
  extractSections(content) {
    const sections = [];
    const lines = content.split('\n');
    let currentSection = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Определяем начало секции (заголовок)
      if (line.length > 5 && line.length < 100 && /^[A-Z]/.test(line) && !line.includes(':')) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          title: line,
          content: '',
          startLine: i
        };
      } else if (currentSection) {
        currentSection.content += line + '\n';
      }
    }
    
    if (currentSection) {
      sections.push(currentSection);
    }
    
    return sections;
  }

  /**
   * ТРИЗ: Извлечение метрик
   * Принцип: Предсказательное обслуживание
   */
  extractMetrics(content) {
    return {
      totalSections: this.extractSections(content).length,
      totalTables: (content.match(/\|.+\|/g) || []).length,
      totalLists: (content.match(/^[\s]*[-*•]/gm) || []).length,
      totalKeyValuePairs: (content.match(/^[^:]+:\s*.+$/gm) || []).length,
      wordCount: content.split(/\s+/).length,
      characterCount: content.length
    };
  }

  /**
   * ТРИЗ: Извлечение визуальных элементов
   * Принцип: Использование всех ресурсов
   */
  extractVisualElements(content) {
    return {
      hasTables: /\|.+\|/.test(content),
      hasLists: /^[\s]*[-*•]/.test(content),
      hasHeaders: /^#{1,3}/.test(content),
      hasBold: /\*\*.*\*\*/.test(content) || /__.*__/.test(content),
      hasItalic: /\*.*\*/.test(content) || /_.*_/.test(content),
      hasNumbers: /\d+/.test(content),
      hasDates: /\d{1,2}\/\d{1,2}\/\d{4}/.test(content)
    };
  }

  /**
   * Сохранение данных для обучения
   */
  async saveTrainingData(extractedData, outputPath = null) {
    if (!outputPath) {
      outputPath = path.join(this.trainingDataPath, 'vin-report-training-data.jsonl');
    }
    
    // Создаем директорию если нужно
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Сохраняем в JSONL формате (для AI Training Pipeline)
    const jsonlLine = JSON.stringify({
      type: 'vin-report-sample',
      source: 'real-report',
      ...extractedData
    }) + '\n';
    
    fs.appendFileSync(outputPath, jsonlLine, 'utf8');
    log('VIN-REPORT-EXTRACTOR', `Training data saved to: ${outputPath}`);
    
    return outputPath;
  }
}

module.exports = { VINReportTrainingExtractor };


