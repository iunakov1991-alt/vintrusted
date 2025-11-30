const fs = require('fs');
const path = require('path');
const { log, error } = require('../logger');
const { callDeepseekChat } = require('../../ai/deepseek-client');

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
    const svgPath = path.join(this.imagesDir, `${clusterId}-${type}.svg`);
    return fs.existsSync(svgPath);
  }

  /**
   * Получить путь к изображению
   */
  getImagePath(clusterId, type = 'hero') {
    const svgPath = path.join(this.imagesDir, `${clusterId}-${type}.svg`);
    
    if (fs.existsSync(svgPath)) {
      return `/seo/images/clusters/${clusterId}-${type}.svg`;
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
      
      // Вызываем AI API или генерируем SVG fallback
      const imageData = await this.callAIImageAPI(prompt, type, { stateSlug, make, intent });
      
      if (imageData && imageData.length > 0) {
        // Все изображения теперь в формате SVG (DeepSeek или программная генерация)
        const fileName = `${clusterId}-${type}.svg`;
        const filePath = path.join(this.imagesDir, fileName);
        
        // Сохраняем SVG файл
        fs.writeFileSync(filePath, imageData, 'utf8');
        
        log('AI-IMAGE', `Generated ${type} SVG image for cluster ${clusterId}`);
        return `/seo/images/clusters/${fileName}`;
      } else {
        log('AI-IMAGE', `Failed to generate image data for ${clusterId}-${type}`);
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
   * Пробует DeepSeek для SVG, иначе программная генерация
   */
  async callAIImageAPI(prompt, type, options = {}) {
    const { stateSlug, make, intent } = options;
    
    // Размеры изображения
    const width = type === 'hero' ? 1200 : 1200;
    const height = type === 'hero' ? 800 : 630;

    // Пробуем DeepSeek для генерации SVG через LLM
    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    if (deepseekKey) {
      try {
        const svgData = await this.generateSVGWithDeepSeek(stateSlug, make, intent, type, width, height, prompt);
        if (svgData) {
          log('AI-IMAGE', `Generated ${type} SVG image via DeepSeek`);
          return svgData;
        }
      } catch (e) {
        log('AI-IMAGE', `DeepSeek SVG generation failed, using programmatic fallback: ${e.message}`);
      }
    } else {
      log('AI-IMAGE', 'DEEPSEEK_API_KEY not found, using programmatic SVG generation');
    }

    // Fallback: генерируем SVG программно
    log('AI-IMAGE', `Generating ${type} SVG image programmatically (${width}x${height}) for ${stateSlug}-${make}-${intent}`);
    return this.generateSVGImage(stateSlug, make, intent, type, width, height);
  }

  /**
   * Генерация SVG через DeepSeek LLM
   * Использует Groq для генерации улучшенного промпта, затем DeepSeek для создания SVG
   */
  async generateSVGWithDeepSeek(stateSlug, make, intent, type, width, height, prompt) {
    try {
      const stateName = stateSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const makeName = make.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      // Шаг 1: Используем Groq для генерации улучшенного промпта
      let enhancedPrompt = prompt;
      const groqKey = process.env.GROQ_API_KEY;
      if (groqKey) {
        try {
          const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${groqKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
              messages: [
                {
                  role: 'system',
                  content: 'You are an expert prompt engineer for AI SVG generation. Create detailed, specific prompts for professional vehicle VIN report graphics. Focus on automotive themes, document aesthetics, and visual elements that represent vehicle history reports.'
                },
                {
                  role: 'user',
                  content: `Create a detailed SVG generation prompt for a VIN report page hero image:
- Type: ${type} (${type === 'hero' ? 'hero section banner' : 'social media preview card'})
- Dimensions: ${width}x${height} pixels
- Vehicle brand: ${makeName}
- State: ${stateName}
- Style: Official DMV/document aesthetic, professional, minimal geometric design
- Theme: Vehicle history report, automotive documentation, official records
- Visual elements to include: Abstract representation of vehicle documents, geometric patterns suggesting data/records, subtle automotive iconography (wheels, dashboard elements, document lines), professional color scheme
- Requirements: No text, only visual elements, professional appearance, suitable for ${makeName} brand identity, ${stateName} state context
- Color palette: Professional, subtle, appropriate for official documents and ${makeName} vehicles

Generate a comprehensive, detailed prompt that will result in a sophisticated, professional SVG graphic. Return ONLY the prompt text, nothing else.`
                }
              ],
              max_tokens: 300,
              temperature: 0.7
            })
          });

          if (groqResponse.ok) {
            const groqData = await groqResponse.json();
            const groqPrompt = groqData.choices?.[0]?.message?.content;
            if (groqPrompt && groqPrompt.trim()) {
              enhancedPrompt = groqPrompt.trim();
              log('AI-IMAGE', 'Groq generated enhanced prompt for DeepSeek');
            }
          }
        } catch (e) {
          log('AI-IMAGE', `Groq prompt generation failed, using default: ${e.message}`);
        }
      }
      
      // Шаг 2: Используем DeepSeek для генерации SVG на основе улучшенного промпта
      const systemPrompt = `You are an expert SVG designer specializing in professional vehicle documentation graphics. 
Generate sophisticated, visually appealing SVG code for vehicle VIN report pages.
The SVG should:
- Use DMV/official document aesthetic with modern, clean design
- Include abstract automotive elements (subtle wheel patterns, dashboard lines, document grids)
- Use professional color gradients and geometric patterns
- Be visually interesting but not overwhelming
- Represent vehicle history, documentation, and official records
- NO text, only visual elements
- Be suitable for ${width}x${height} dimensions

Return ONLY valid, complete SVG XML code with proper structure, nothing else.`;

      const userPrompt = enhancedPrompt || `Create a professional SVG hero image for a VIN report page:
- Type: ${type} (${type === 'hero' ? 'hero section banner' : 'social media preview card'})
- Dimensions: ${width}x${height} pixels
- Vehicle brand: ${makeName}
- State: ${stateName}
- Style: Official DMV/document aesthetic, modern minimal geometric design
- Visual elements: Abstract vehicle documentation theme, geometric patterns suggesting data/records, subtle automotive iconography, professional gradients
- Colors: Professional palette suitable for ${makeName} vehicles and ${stateName} state context
- Theme: Vehicle history report, official records, automotive documentation
- Requirements: No text, visually appealing, professional appearance

Generate the complete, sophisticated SVG code with proper structure, gradients, and geometric elements:`;

      const svgCode = await callDeepseekChat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        maxTokens: 2000,
        temperature: 0.7
      });

      if (!svgCode) {
        return null;
      }

      // Извлекаем SVG из ответа (может быть обернут в markdown или текст)
      let svg = svgCode.trim();
      
      // Удаляем markdown обертки если есть
      if (svg.includes('```svg')) {
        svg = svg.split('```svg')[1].split('```')[0].trim();
      } else if (svg.includes('```')) {
        svg = svg.split('```')[1].split('```')[0].trim();
      }

      // Проверяем, что это валидный SVG
      if (!svg.includes('<svg') || !svg.includes('xmlns')) {
        log('AI-IMAGE', 'DeepSeek returned invalid SVG, using programmatic fallback');
        return null;
      }

      // Убеждаемся, что размеры правильные
      svg = svg.replace(/width="[^"]*"/, `width="${width}"`);
      svg = svg.replace(/height="[^"]*"/, `height="${height}"`);

      return Buffer.from(svg, 'utf8');
    } catch (e) {
      error('AI-IMAGE', 'DeepSeek SVG generation error', e);
      return null;
    }
  }

  /**
   * Генерация SVG изображения программно (fallback)
   * Создает уникальное изображение для каждого кластера с автомобильной тематикой
   */
  generateSVGImage(stateSlug, make, intent, type, width, height) {
    // Генерируем уникальный цвет на основе параметров кластера
    const hash = this.hashString(`${stateSlug}-${make}-${intent}`);
    
    // ЖЕСТКО фиксируем профессиональную сине-серую палитру (НЕ зеленую!)
    // Синие тона: 200-240, серые: низкая насыщенность
    const baseHue = 210; // Синий цвет (не зеленый!)
    const hueVariation = (hash % 30); // Вариация 0-30 градусов (210-240 = синие тона)
    const professionalHue = baseHue + hueVariation;
    const saturation = 20 + (hash % 10); // 20-30% - очень приглушенные (серые тона)
    const lightness = type === 'hero' ? 94 : 90; // Очень светлые тона для документального стиля

    // Профессиональная цветовая палитра (ТОЛЬКО сине-серые тона, НЕ зеленые!)
    const primaryColor = `hsl(${professionalHue}, ${saturation}%, ${lightness}%)`;
    const secondaryColor = `hsl(${professionalHue + 15}, ${Math.max(15, saturation - 3)}%, ${Math.min(96, lightness + 1)}%)`;
    const accentColor = `hsl(${professionalHue + 25}, ${Math.max(25, saturation + 5)}%, ${Math.max(75, lightness - 10)}%)`;
    const darkAccent = `hsl(${professionalHue}, ${Math.min(45, saturation + 15)}%, ${Math.max(65, lightness - 20)}%)`;

    // Геометрические паттерны для уникальности
    const patternSeed = hash % 4;
    const shapes = this.generateShapes(patternSeed, width, height, primaryColor, secondaryColor, accentColor);

    // Добавляем абстрактные элементы документов/автомобилей
    const docLines = this.generateDocumentLines(width, height, darkAccent, hash);
    const automotiveElements = this.generateAutomotiveElements(width, height, accentColor, hash);

    // Формируем SVG с более сложной структурой
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${primaryColor};stop-opacity:1" />
      <stop offset="50%" style="stop-color:${secondaryColor};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${primaryColor};stop-opacity:0.95" />
    </linearGradient>
    <pattern id="gridPattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${darkAccent}" stroke-width="0.5" opacity="0.15"/>
    </pattern>
  </defs>
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#bgGradient)" />
  <rect width="${width}" height="${height}" fill="url(#gridPattern)" opacity="0.3" />
  
  <!-- Abstract shapes -->
  ${shapes}
  
  <!-- Document lines pattern -->
  ${docLines}
  
  <!-- Automotive elements -->
  ${automotiveElements}
  
  <!-- Subtle border -->
  <rect x="0" y="0" width="${width}" height="${height}" fill="none" stroke="${darkAccent}" stroke-width="1" opacity="0.2" />
</svg>`;

    // Конвертируем SVG в Buffer
    return Buffer.from(svg, 'utf8');
  }

  /**
   * Генерация линий документов (абстрактные горизонтальные линии)
   */
  generateDocumentLines(width, height, color, hash) {
    const lines = [];
    const lineCount = 8 + (hash % 5);
    const spacing = height / (lineCount + 1);
    
    for (let i = 1; i <= lineCount; i++) {
      const y = i * spacing + (hash % 10);
      const length = width * (0.6 + (hash % 20) / 100);
      const x = (width - length) / 2;
      const opacity = 0.08 + (hash % 5) * 0.02;
      lines.push(`<line x1="${x}" y1="${y}" x2="${x + length}" y2="${y}" stroke="${color}" stroke-width="1" opacity="${opacity}" />`);
    }
    return lines.join('\n  ');
  }

  /**
   * Генерация абстрактных автомобильных элементов (круги как колеса, линии как дорога)
   */
  generateAutomotiveElements(width, height, color, hash) {
    const elements = [];
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Абстрактные "колеса" - круги
    const wheelSize = Math.min(width, height) * 0.15;
    const wheelY = centerY + (hash % 50) - 25;
    const leftWheelX = centerX - width * 0.25;
    const rightWheelX = centerX + width * 0.25;
    
    elements.push(`<circle cx="${leftWheelX}" cy="${wheelY}" r="${wheelSize}" fill="none" stroke="${color}" stroke-width="2" opacity="0.12" />`);
    elements.push(`<circle cx="${rightWheelX}" cy="${wheelY}" r="${wheelSize}" fill="none" stroke="${color}" stroke-width="2" opacity="0.12" />`);
    elements.push(`<circle cx="${leftWheelX}" cy="${wheelY}" r="${wheelSize * 0.6}" fill="none" stroke="${color}" stroke-width="1" opacity="0.08" />`);
    elements.push(`<circle cx="${rightWheelX}" cy="${wheelY}" r="${wheelSize * 0.6}" fill="none" stroke="${color}" stroke-width="1" opacity="0.08" />`);
    
    // Абстрактная "дорога" - горизонтальная линия
    elements.push(`<line x1="${width * 0.1}" y1="${wheelY}" x2="${width * 0.9}" y2="${wheelY}" stroke="${color}" stroke-width="1.5" opacity="0.1" />`);
    
    // Вертикальные линии как элементы документов
    for (let i = 0; i < 3; i++) {
      const x = width * (0.2 + i * 0.2) + (hash % 20);
      elements.push(`<line x1="${x}" y1="${height * 0.2}" x2="${x}" y2="${height * 0.8}" stroke="${color}" stroke-width="0.5" opacity="0.06" />`);
    }
    
    return elements.join('\n  ');
  }

  /**
   * Генерация геометрических фигур для уникальности
   */
  generateShapes(seed, width, height, primaryColor, secondaryColor, accentColor) {
    const shapes = [];
    const count = 5 + (seed % 3); // 5-7 фигур

    for (let i = 0; i < count; i++) {
      const x = (i * width / count) + (seed * 10) % 50;
      const y = (i * height / count) + (seed * 15) % 50;
      const size = 60 + (seed * 5) % 40;
      const rotation = (seed * 15 + i * 30) % 360;
      const opacity = 0.1 + (seed % 3) * 0.05;

      // Чередуем типы фигур
      if (i % 3 === 0) {
        // Круг
        shapes.push(`<circle cx="${x}" cy="${y}" r="${size/2}" fill="${primaryColor}" opacity="${opacity}" transform="rotate(${rotation} ${x} ${y})" />`);
      } else if (i % 3 === 1) {
        // Прямоугольник
        shapes.push(`<rect x="${x - size/2}" y="${y - size/2}" width="${size}" height="${size}" fill="${secondaryColor}" opacity="${opacity}" transform="rotate(${rotation} ${x} ${y})" />`);
      } else {
        // Треугольник
        const points = `${x},${y - size/2} ${x - size/2},${y + size/2} ${x + size/2},${y + size/2}`;
        shapes.push(`<polygon points="${points}" fill="${accentColor}" opacity="${opacity}" transform="rotate(${rotation} ${x} ${y})" />`);
      }
    }

    return shapes.join('\n  ');
  }

  /**
   * Простая хеш-функция для генерации уникальных значений
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
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

