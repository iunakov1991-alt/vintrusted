const fs = require('fs');
const path = require('path');
const { log, error } = require('../logger');

/**
 * Загрузчик canonical-промптов из файлов
 * Позволяет редактировать промпты без изменения кода
 */
class CanonicalPromptsLoader {
  constructor() {
    this.promptsDir = path.join(process.cwd(), 'data/seo/ai-training/canonical-prompts');
    this.cache = new Map();
    this.loadAllPrompts();
  }

  /**
   * Загрузка всех промптов при инициализации
   */
  loadAllPrompts() {
    if (!fs.existsSync(this.promptsDir)) {
      log('CANONICAL-PROMPTS', `Directory ${this.promptsDir} does not exist, creating...`);
      fs.mkdirSync(this.promptsDir, { recursive: true });
      return;
    }

    const files = fs.readdirSync(this.promptsDir).filter(f => f.endsWith('.txt'));
    log('CANONICAL-PROMPTS', `Loading ${files.length} canonical prompt files...`);

    for (const file of files) {
      const blockType = file.replace('.txt', '');
      const filePath = path.join(this.promptsDir, file);
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        this.cache.set(blockType, content);
        log('CANONICAL-PROMPTS', `Loaded prompt for ${blockType}`);
      } catch (e) {
        error('CANONICAL-PROMPTS', `Error loading ${file}: ${e.message}`);
      }
    }
  }

  /**
   * Получение canonical-промпта для блока
   */
  getPrompt(blockType) {
    return this.cache.get(blockType) || null;
  }

  /**
   * Проверка наличия canonical-промпта
   */
  hasPrompt(blockType) {
    return this.cache.has(blockType);
  }

  /**
   * Подстановка переменных в промпт
   * УНИВЕРСАЛЬНОЕ: Поддерживает динамические данные VIN
   */
  substituteVariables(template, context) {
    if (!template) return null;

    let result = template;
    const variables = {
      MAKE: context.make || '',
      MODEL: context.model || '',
      YEAR: context.year || '',
      STATE: context.stateLabel || '',
      STATE_SLUG: context.stateSlug || '',
      VIN: context.vin || '4T1B11HK3JU123456',
      WORD_COUNT: context.wordCount || 300,
      // УНИВЕРСАЛЬНОЕ: Динамические данные VIN (если предоставлены)
      WMI: context.WMI || '',
      MANUFACTURER_NAME: context.MANUFACTURER_NAME || context.make || '',
      COUNTRY: context.COUNTRY || 'United States',
      VEHICLE_TYPE: context.VEHICLE_TYPE || 'Passenger Car',
      YEAR_CODE: context.YEAR_CODE || 'J',
      POSITION1: context.POSITION1 || '4',
      POSITION2: context.POSITION2 || 'T',
      POSITION3: context.POSITION3 || '1'
    };

    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }

    return result;
  }

  /**
   * Получение промпта с подстановкой переменных
   */
  getPromptWithSubstitution(blockType, context) {
    const template = this.getPrompt(blockType);
    if (!template) return null;
    return this.substituteVariables(template, context);
  }

  /**
   * Создание дефолтного canonical-промпта (если файл отсутствует)
   */
  createDefaultPrompt(blockType) {
    const filePath = path.join(this.promptsDir, `${blockType}.txt`);
    if (fs.existsSync(filePath)) return;

    const defaultTemplate = `# CANONICAL TEMPLATE FOR BLOCK: ${blockType}

# ОПИСАНИЕ:
#   Здесь ты можешь редактировать промпт для блока "${blockType}"
#   без изменения кода.
#
#   Используй переменные:
#     {MAKE}  — марка (например, Toyota)
#     {MODEL} — модель (например, Camry)
#     {YEAR}  — год (например, 2018)
#     {STATE} — штат (например, California)
#     {STATE_SLUG} — slug штата (например, california)
#     {VIN}   — пример VIN (например, 4T1B11HK3JU123456)
#     {WORD_COUNT} — целевое количество слов
#
# ТРЕБОВАНИЯ:
#   - Техно-аналитика, понятная нормальному человеку.
#   - Избегай воды.
#   - Объём: между {WORD_COUNT} словами (с небольшим допуском).
#   - Не используй дословно клише из отдельного списка.
#
# ВАЖНО:
#   В конце блока ОБЯЗАТЕЛЬНО поставить маркер конца:
#       [[END_BLOCK:${blockType}]]
#
# Пример структуры:
#
# H2 заголовок
# 1–2 абзаца вводки с привязкой к {YEAR} {MAKE} {MODEL} в {STATE}.
# Буллеты с ключевыми техническими/правовыми моментами.
# Короткий вывод, который логически завершает мысль.
# В самом конце — маркер [[END_BLOCK:${blockType}]] на последней строке.

Write a ${blockType} block for a VIN check guide for {YEAR} {MAKE} {MODEL} in {STATE}.

Style: DMV-grade, legal, antifraud, engineering-level explanation.
Word count: {WORD_COUNT} words.
Use FACTUAL, TECHNICAL style (no literary flourishes).

CRITICAL REQUIREMENTS - NO EXCEPTIONS:
- Complete ALL sentences fully - NO truncated text ending with "and", "or", "(", "[", "|"
- Finish ALL bullet points completely - NO incomplete bullets
- Complete ALL tables with ALL rows - NO partial tables
- Ensure ALL sections have proper conclusions - NO abrupt endings
- NO text breaks before headings (##) - finish the sentence, then add heading
- NO incomplete thoughts or cut-off phrases
- Every paragraph must have a complete thought
- Every list item must be a complete sentence or phrase

VALIDATION RULES:
- If you start a sentence, you MUST finish it
- If you start a table, you MUST complete all rows
- If you start a list, you MUST complete all items
- If you mention a concept, you MUST explain it fully

You MUST end your response with exactly this marker on a new line:
[[END_BLOCK:${blockType}]]

After the marker, there must be NO additional text, spaces, or content.
`;

    try {
      fs.writeFileSync(filePath, defaultTemplate, 'utf8');
      log('CANONICAL-PROMPTS', `Created default template for ${blockType}`);
      this.cache.set(blockType, defaultTemplate);
    } catch (e) {
      error('CANONICAL-PROMPTS', `Error creating default template for ${blockType}: ${e.message}`);
    }
  }

  /**
   * Создание дефолтных промптов для всех блоков
   */
  createDefaultPromptsForAllBlocks(blockTypes) {
    for (const blockType of blockTypes) {
      this.createDefaultPrompt(blockType);
    }
  }

  /**
   * Перезагрузка промпта из файла (для hot-reload)
   */
  reloadPrompt(blockType) {
    const filePath = path.join(this.promptsDir, `${blockType}.txt`);
    if (!fs.existsSync(filePath)) return false;

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      this.cache.set(blockType, content);
      log('CANONICAL-PROMPTS', `Reloaded prompt for ${blockType}`);
      return true;
    } catch (e) {
      error('CANONICAL-PROMPTS', `Error reloading ${blockType}: ${e.message}`);
      return false;
    }
  }
}

// Singleton instance
let instance = null;

function getCanonicalPromptsLoader() {
  if (!instance) {
    instance = new CanonicalPromptsLoader();
  }
  return instance;
}

module.exports = { CanonicalPromptsLoader, getCanonicalPromptsLoader };

