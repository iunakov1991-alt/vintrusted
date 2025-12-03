/**
 * FILE PROCESSOR
 * 
 * Обработка различных типов файлов для обучения AI
 */

const fs = require('fs');
const path = require('path');

class FileProcessor {
  constructor() {
    this.supportedTypes = {
      'text/plain': this.processText,
      'text/markdown': this.processText,
      'application/json': this.processJSON,
      'text/csv': this.processCSV,
      'application/pdf': this.processPDF
    };
  }

  /**
   * Обработка файла
   */
  async processFile(file) {
    const ext = path.extname(file.originalname || file.name).toLowerCase();
    const buffer = file.buffer || fs.readFileSync(file.path);
    
    try {
      let content = '';
      
      switch (ext) {
        case '.txt':
        case '.md':
          content = await this.processText(buffer);
          break;
        case '.json':
          content = await this.processJSON(buffer);
          break;
        case '.csv':
          content = await this.processCSV(buffer);
          break;
        case '.pdf':
          content = await this.processPDF(buffer);
          break;
        case '.doc':
        case '.docx':
          content = await this.processDocx(buffer);
          break;
        default:
          throw new Error(`Unsupported file type: ${ext}`);
      }
      
      return {
        filename: file.originalname || file.name,
        type: ext.substring(1),
        content: content.trim(),
        size: buffer.length,
        processed: true
      };
    } catch (error) {
      return {
        filename: file.originalname || file.name,
        type: ext.substring(1),
        content: '',
        size: buffer.length,
        processed: false,
        error: error.message
      };
    }
  }

  /**
   * Обработка текстовых файлов
   */
  async processText(buffer) {
    return buffer.toString('utf8');
  }

  /**
   * Обработка JSON
   */
  async processJSON(buffer) {
    const json = JSON.parse(buffer.toString('utf8'));
    // Преобразуем JSON в читаемый текст
    return JSON.stringify(json, null, 2);
  }

  /**
   * Обработка CSV
   */
  async processCSV(buffer) {
    const text = buffer.toString('utf8');
    // Просто возвращаем CSV как текст
    return text;
  }

  /**
   * Обработка PDF
   */
  async processPDF(buffer) {
    try {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(buffer);
      return data.text;
    } catch (error) {
      throw new Error(`PDF parsing failed: ${error.message}`);
    }
  }

  /**
   * Обработка DOCX (базовая, через текст)
   */
  async processDocx(buffer) {
    // Для DOCX нужна специальная библиотека, пока возвращаем ошибку
    // Можно добавить mammoth или docx-parser позже
    throw new Error('DOCX processing not yet implemented. Please convert to TXT or PDF first.');
  }

  /**
   * Обработка нескольких файлов
   */
  async processFiles(files) {
    const results = [];
    
    for (const file of files) {
      try {
        const result = await this.processFile(file);
        results.push(result);
      } catch (error) {
        results.push({
          filename: file.originalname || file.name,
          processed: false,
          error: error.message
        });
      }
    }
    
    return results;
  }
}

module.exports = FileProcessor;

