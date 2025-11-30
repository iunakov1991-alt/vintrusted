const fs = require('fs');
const path = require('path');
const { log, error } = require('../logger');

/**
 * SEO-ДИЗАЙН ABSOLUTE 1000%
 * AI Image Generator для кластеров
 * Генерирует изображения по кластерам (state + make + intent), а не по страницам
 */
class AIImageGenerator {
  constructor(config) {
    this.config = config;
    this.imagesDir = path.join(process.cwd(), 'public', 'seo', 'images', 'clusters');
    this.ensureDir();
  }

  ensureDir() {
    if (!fs.existsSync(this.imagesDir)) {
      fs.mkdirSync(this.imagesDir, { recursive: true });
    }
  }

  /**
   * Получить ID кластера
   */
  getClusterId(stateSlug, make, intent) {
    return `${stateSlug}-${make}-${intent}`;
  }

  /**
   * Проверить существование изображения для кластера
   */
  imageExists(clusterId, type = 'hero') {
    const fileName = `${clusterId}-${type}.webp`;
    const filePath = path.join(this.imagesDir, fileName);
    return fs.existsSync(filePath);
  }

  /**
   * Получить путь к изображению
   */
  getImagePath(clusterId, type = 'hero') {
    if (this.imageExists(clusterId, type)) {
      return `/seo/images/clusters/${clusterId}-${type}.webp`;
    }
    return null;
  }

  /**
   * Генерация изображения через AI (неблокирующая)
   * Использует внешний API или локальную генерацию
   */
  async generateImage(clusterId, type = 'hero', options = {}) {
    const { stateSlug, make, intent } = options;
    
    // Проверяем, не генерируем ли уже
    const lockFile = path.join(this.imagesDir, `${clusterId}-${type}.lock`);
    if (fs.existsSync(lockFile)) {
      log('AI-IMAGE', `Generation already in progress for ${clusterId}-${type}`);
      return null;
    }

    // Создаем lock файл
    fs.writeFileSync(lockFile, JSON.stringify({ 
      timestamp: Date.now(),
      clusterId,
      type
    }), 'utf8');

    try {
      // Генерируем prompt
      const prompt = this.buildPrompt(stateSlug, make, intent, type);
      
      // Вызываем AI API (Groq, DeepSeek или другой)
      const imageData = await this.callAIImageAPI(prompt, type);
      
      if (imageData) {
        // Сохраняем как WebP
        const fileName = `${clusterId}-${type}.webp`;
        const filePath = path.join(this.imagesDir, fileName);
        fs.writeFileSync(filePath, imageData, 'binary');
        
        log('AI-IMAGE', `Generated ${type} image for cluster ${clusterId}`);
        return `/seo/images/clusters/${fileName}`;
      }
    } catch (e) {
      error('AI-IMAGE', `Failed to generate image for ${clusterId}-${type}`, e);
    } finally {
      // Удаляем lock файл
      if (fs.existsSync(lockFile)) {
        fs.unlinkSync(lockFile);
      }
    }

    return null;
  }

  /**
   * Построение prompt для генерации изображения
   */
  buildPrompt(stateSlug, make, intent, type) {
    const stateName = stateSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const makeName = make.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const intentName = intent.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    if (type === 'hero') {
      return `Official DMV-style infographic: Vehicle VIN report for ${makeName} in ${stateName}. Clean, minimal design with geometric shapes. Official document style. No text, only visual elements. Professional, legal document aesthetic.`;
    } else if (type === 'og') {
      return `Social media preview image: VIN report for ${makeName} in ${stateName}. Clean, professional design suitable for sharing. Official document style. 1200x630 pixels.`;
    }

    return `Official vehicle report visualization for ${makeName} in ${stateName}. Clean, minimal, professional.`;
  }

  /**
   * Вызов AI API для генерации изображения
   */
  async callAIImageAPI(prompt, type) {
    // Проверяем доступность API ключей
    const groqKey = process.env.GROQ_API_KEY;
    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    
    if (!groqKey && !deepseekKey) {
      log('AI-IMAGE', 'No AI API keys available, skipping image generation');
      return null;
    }

    // Размеры изображения
    const width = type === 'hero' ? 1200 : 1200;
    const height = type === 'hero' ? 800 : 630;

    // Пробуем Groq (если поддерживает изображения) или другой сервис
    // Для реальной генерации нужен сервис типа DALL-E, Midjourney API, Stable Diffusion и т.д.
    // Здесь заглушка для будущей интеграции
    
    log('AI-IMAGE', `Would generate ${type} image (${width}x${height}) with prompt: ${prompt.substring(0, 100)}...`);
    
    // TODO: Интеграция с реальным AI image API
    // Пример для DALL-E:
    // const response = await fetch('https://api.openai.com/v1/images/generations', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${apiKey}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     model: 'dall-e-3',
    //     prompt: prompt,
    //     size: `${width}x${height}`,
    //     quality: 'standard',
    //     n: 1
    //   })
    // });

    return null;
  }

  /**
   * Batch генерация изображений для всех кластеров
   */
  async generateImagesForClusters(clusters) {
    const tasks = [];
    
    for (const cluster of clusters) {
      const clusterId = this.getClusterId(cluster.stateSlug, cluster.make, cluster.intent);
      
      // Генерируем hero и og изображения
      if (!this.imageExists(clusterId, 'hero')) {
        tasks.push(this.generateImage(clusterId, 'hero', cluster));
      }
      
      if (!this.imageExists(clusterId, 'og')) {
        tasks.push(this.generateImage(clusterId, 'og', cluster));
      }
    }

    // Запускаем параллельно (с ограничением)
    const concurrency = 3;
    for (let i = 0; i < tasks.length; i += concurrency) {
      const batch = tasks.slice(i, i + concurrency);
      await Promise.all(batch);
    }

    log('AI-IMAGE', `Generated images for ${clusters.length} clusters`);
  }

  /**
   * Получить alt-текст для изображения
   */
  getAltText(stateSlug, make, intent) {
    const stateName = stateSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const makeName = make.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const intentName = intent.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    return `VIN Report for ${makeName} in ${stateName} - ${intentName}`;
  }
}

module.exports = { AIImageGenerator };

