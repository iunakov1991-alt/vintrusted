const { log } = require('../logger');
const { callDeepseekChat } = require('../../ai/deepseek-client');

/**
 * Seed Generator - AI-модуль для генерации расширенного seed-list
 */
class SeedGenerator {
  constructor(config) {
    this.config = config;
  }

  /**
   * Генерация расширенного seed-list через AI
   */
  async generateExpandedSeeds(analysis) {
    log('SEED-GENERATOR', 'Generating expanded seeds via AI...');

    const { currentSeeds, existingPages, gscData, buildHistory, coverageGaps } = analysis;

    // Формируем контекст для AI
    const aiContext = this.buildAIContext(analysis);

    // AI промпт для генерации расширенного seed-list
    const aiPrompt = this.buildAIPrompt(aiContext);

    try {
      // Вызываем AI с таймаутом (30 секунд)
      const aiResponse = await Promise.race([
        callDeepseekChat({
          messages: [
            {
              role: 'system',
              content: 'You are an expert SEO strategist specializing in VIN check/report websites. Always respond with valid JSON only, no additional text.'
            },
            {
              role: 'user',
              content: aiPrompt
            }
          ],
          temperature: 0.7,
          maxTokens: 2000
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('AI timeout after 30 seconds')), 30000)
        )
      ]);

      // Парсим JSON ответ
      let expandedSeeds;
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          expandedSeeds = JSON.parse(jsonMatch[0]);
        } else {
          expandedSeeds = JSON.parse(aiResponse);
        }
      } catch (e) {
        log('SEED-GENERATOR', `Error parsing AI response: ${e.message}, using fallback`);
        expandedSeeds = this.generateFallbackSeeds(analysis);
      }

      // Валидация и обогащение
      expandedSeeds = this.validateAndEnrich(expandedSeeds, currentSeeds, coverageGaps);

      log('SEED-GENERATOR', `Generated expanded seeds: ${expandedSeeds.expanded_seed_list.states.length} states, ${expandedSeeds.expanded_seed_list.makes.length} makes`);

      return expandedSeeds;

    } catch (e) {
      log('SEED-GENERATOR', `AI generation failed: ${e.message}, using fallback`);
      return this.generateFallbackSeeds(analysis);
    }
  }

  /**
   * Построение контекста для AI
   */
  buildAIContext(analysis) {
    const { currentSeeds, existingPages, gscData, buildHistory, coverageGaps } = analysis;

    return {
      currentSeeds: {
        statesCount: currentSeeds.states?.length || 0,
        makesCount: currentSeeds.makes?.length || 0,
        yearsCount: currentSeeds.years?.length || 0,
        vinExamplesCount: currentSeeds.vinExamples?.length || 0
      },
      existingPages: {
        total: existingPages.totalPages,
        states: existingPages.states.length,
        makes: existingPages.makes.length,
        years: existingPages.years.length,
        vins: existingPages.vins.length,
        intents: existingPages.intents.length,
        languages: existingPages.languages.length
      },
      gscData: gscData ? {
        totalUrls: gscData.totalUrls,
        indexed: gscData.indexed,
        withImpressions: gscData.withImpressions,
        withClicks: gscData.withClicks,
        growing: gscData.growing,
        declining: gscData.declining
      } : null,
      buildHistory: {
        recentBuilds: buildHistory.recentBuilds.length,
        avgPagesGenerated: Math.round(buildHistory.avgPagesGenerated),
        avgQuality: buildHistory.avgQuality.toFixed(3)
      },
      coverageGaps: {
        missingStates: coverageGaps.missingStates.length,
        missingMakes: coverageGaps.missingMakes.length,
        missingYears: coverageGaps.missingYears.length,
        missingIntents: coverageGaps.missingIntents.length,
        missingLanguages: coverageGaps.missingLanguages.length
      }
    };
  }

  /**
   * Построение AI промпта
   */
  buildAIPrompt(context) {
    return `You are an expert SEO strategist for a VIN check/report website. Analyze the current state and generate an expanded seed-list for the next build.

CURRENT STATE:
- Existing pages: ${context.existingPages.total}
- Current seeds: ${context.currentSeeds.statesCount} states, ${context.currentSeeds.makesCount} makes, ${context.currentSeeds.yearsCount} years, ${context.currentSeeds.vinExamplesCount} VIN examples
- Coverage: ${context.existingPages.states} states, ${context.existingPages.makes} makes, ${context.existingPages.years} years covered

COVERAGE GAPS:
- Missing states: ${context.coverageGaps.missingStates}
- Missing makes: ${context.coverageGaps.missingMakes}
- Missing years: ${context.coverageGaps.missingYears}
- Missing intents: ${context.coverageGaps.missingIntents}
- Missing languages: ${context.coverageGaps.missingLanguages}

${context.gscData ? `GSC DATA:
- Total URLs: ${context.gscData.totalUrls}
- Indexed: ${context.gscData.indexed}
- With impressions: ${context.gscData.withImpressions}
- With clicks: ${context.gscData.withClicks}
- Growing pages: ${context.gscData.growing}
- Declining pages: ${context.gscData.declining}` : 'GSC DATA: Not available'}

BUILD HISTORY:
- Recent builds: ${context.buildHistory.recentBuilds}
- Avg pages generated: ${context.buildHistory.avgPagesGenerated}
- Avg quality: ${context.buildHistory.avgQuality}

TASK:
1. Identify missing brands, models, years, states, and VIN patterns
2. Generate expanded seed-list that fills coverage gaps
3. Recommend optimal build volume for next build
4. Focus on high-value combinations (popular brands × states × years)

REQUIREMENTS:
- Add missing states (all 50 US states)
- Add popular car makes (Toyota, Honda, Ford, Chevrolet, Nissan, Hyundai, Kia, Subaru, Mazda, Volkswagen, BMW, Mercedes-Benz, Audi, Lexus, Acura, Infiniti, Jeep, Dodge, Chrysler, RAM, GMC, Cadillac, Buick, Tesla, Volvo, Porsche, Land Rover, Jaguar, Mini, Mitsubishi, Genesis)
- Add years 2010-2025
- Add diverse VIN examples (100+ unique VINs)
- Include error VIN patterns (short VINs, invalid VINs)
- Consider long-tail variations

RESPOND WITH JSON:
{
  "recommended_build_volume": <number>,
  "expanded_seed_list": {
    "states": [{"code": "AL", "slug": "alabama"}, ...],
    "makes": [{"slug": "toyota"}, ...],
    "years": [2010, 2011, ...],
    "vinExamples": ["1HGCM82633A004352", ...]
  },
  "reasoning": "<explanation in Russian>",
  "diff": {
    "added": {
      "states": [...],
      "makes": [...],
      "years": [...],
      "vinExamples": [...]
    },
    "removed": [],
    "modified": []
  }
}`;
  }

  /**
   * Fallback генерация seeds (если AI недоступен)
   */
  generateFallbackSeeds(analysis) {
    log('SEED-GENERATOR', 'Using fallback seed generation');

    const { currentSeeds, coverageGaps } = analysis;

    // Все штаты США
    const allStates = [
      { code: 'AL', slug: 'alabama' }, { code: 'AK', slug: 'alaska' }, { code: 'AZ', slug: 'arizona' },
      { code: 'AR', slug: 'arkansas' }, { code: 'CA', slug: 'california' }, { code: 'CO', slug: 'colorado' },
      { code: 'CT', slug: 'connecticut' }, { code: 'DE', slug: 'delaware' }, { code: 'DC', slug: 'district-of-columbia' },
      { code: 'FL', slug: 'florida' }, { code: 'GA', slug: 'georgia' }, { code: 'HI', slug: 'hawaii' },
      { code: 'ID', slug: 'idaho' }, { code: 'IL', slug: 'illinois' }, { code: 'IN', slug: 'indiana' },
      { code: 'IA', slug: 'iowa' }, { code: 'KS', slug: 'kansas' }, { code: 'KY', slug: 'kentucky' },
      { code: 'LA', slug: 'louisiana' }, { code: 'ME', slug: 'maine' }, { code: 'MD', slug: 'maryland' },
      { code: 'MA', slug: 'massachusetts' }, { code: 'MI', slug: 'michigan' }, { code: 'MN', slug: 'minnesota' },
      { code: 'MS', slug: 'mississippi' }, { code: 'MO', slug: 'missouri' }, { code: 'MT', slug: 'montana' },
      { code: 'NE', slug: 'nebraska' }, { code: 'NV', slug: 'nevada' }, { code: 'NH', slug: 'new-hampshire' },
      { code: 'NJ', slug: 'new-jersey' }, { code: 'NM', slug: 'new-mexico' }, { code: 'NY', slug: 'new-york' },
      { code: 'NC', slug: 'north-carolina' }, { code: 'ND', slug: 'north-dakota' }, { code: 'OH', slug: 'ohio' },
      { code: 'OK', slug: 'oklahoma' }, { code: 'OR', slug: 'oregon' }, { code: 'PA', slug: 'pennsylvania' },
      { code: 'RI', slug: 'rhode-island' }, { code: 'SC', slug: 'south-carolina' }, { code: 'SD', slug: 'south-dakota' },
      { code: 'TN', slug: 'tennessee' }, { code: 'TX', slug: 'texas' }, { code: 'UT', slug: 'utah' },
      { code: 'VT', slug: 'vermont' }, { code: 'VA', slug: 'virginia' }, { code: 'WA', slug: 'washington' },
      { code: 'DC', slug: 'washington-dc' }, { code: 'WV', slug: 'west-virginia' }, { code: 'WI', slug: 'wisconsin' },
      { code: 'WY', slug: 'wyoming' }
    ];

    // Популярные марки
    const popularMakes = [
      { slug: 'toyota' }, { slug: 'honda' }, { slug: 'ford' }, { slug: 'chevrolet' }, { slug: 'nissan' },
      { slug: 'hyundai' }, { slug: 'kia' }, { slug: 'subaru' }, { slug: 'mazda' }, { slug: 'volkswagen' },
      { slug: 'bmw' }, { slug: 'mercedes-benz' }, { slug: 'audi' }, { slug: 'lexus' }, { slug: 'acura' },
      { slug: 'infiniti' }, { slug: 'jeep' }, { slug: 'dodge' }, { slug: 'chrysler' }, { slug: 'ram' },
      { slug: 'gmc' }, { slug: 'cadillac' }, { slug: 'buick' }, { slug: 'tesla' }, { slug: 'volvo' },
      { slug: 'porsche' }, { slug: 'land-rover' }, { slug: 'jaguar' }, { slug: 'mini' }, { slug: 'mitsubishi' },
      { slug: 'genesis' }
    ];

    // Годы
    const years = Array.from({ length: 16 }, (_, i) => 2010 + i);

    // VIN примеры (генерируем больше)
    const vinExamples = this.generateVinExamples(200);

    // Определяем что добавить
    const currentStates = new Set((currentSeeds.states || []).map(s => s.slug));
    const currentMakes = new Set((currentSeeds.makes || []).map(m => m.slug));
    const currentYears = new Set(currentSeeds.years || []);
    const currentVins = new Set(currentSeeds.vinExamples || []);

    const addedStates = allStates.filter(s => !currentStates.has(s.slug));
    const addedMakes = popularMakes.filter(m => !currentMakes.has(m.slug));
    const addedYears = years.filter(y => !currentYears.has(y));
    const addedVins = vinExamples.filter(v => !currentVins.has(v));

    // Рекомендуемый объем билда
    const recommendedVolume = this.calculateRecommendedVolume(analysis, addedStates.length, addedMakes.length, addedYears.length, addedVins.length);

    return {
      recommended_build_volume: recommendedVolume,
      expanded_seed_list: {
        states: allStates,
        makes: popularMakes,
        years: years,
        vinExamples: vinExamples
      },
      reasoning: `Fallback генерация: добавлено ${addedStates.length} штатов, ${addedMakes.length} марок, ${addedYears.length} лет, ${addedVins.length} VIN примеров для заполнения пробелов в покрытии.`,
      diff: {
        added: {
          states: addedStates,
          makes: addedMakes,
          years: addedYears,
          vinExamples: addedVins
        },
        removed: [],
        modified: []
      }
    };
  }

  /**
   * Генерация VIN примеров
   */
  generateVinExamples(count) {
    const vins = [];
    const prefixes = ['1HG', '1FT', '4T1', '3FA', '2G1', 'JN1', '5NP', 'JF1', '3VW', 'WBA', 'WDB', 'WAU', 'JTD', 'JH4', '1FA', '1G1', '1N4', '5YJ', '1HGC', 'WBA3'];
    
    for (let i = 0; i < count; i++) {
      const prefix = prefixes[i % prefixes.length];
      const suffix = String(i).padStart(6, '0');
      const vin = `${prefix}${this.randomChar()}${this.randomChar()}${suffix}`;
      vins.push(vin);
    }

    return vins;
  }

  /**
   * Случайный символ для VIN
   */
  randomChar() {
    const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
    return chars[Math.floor(Math.random() * chars.length)];
  }

  /**
   * Расчет рекомендуемого объема билда
   */
  calculateRecommendedVolume(analysis, addedStates, addedMakes, addedYears, addedVins) {
    const { existingPages, buildHistory } = analysis;

    // Базовый расчет на основе добавленных seeds
    const potentialCombinations = addedStates * addedMakes * addedYears * Math.min(addedVins, 10);
    
    // Учитываем средний объем предыдущих билдов
    const avgPrevious = buildHistory.avgPagesGenerated || 500;
    
    // Рекомендуем объем, который заполнит пробелы, но не превысит разумные пределы
    const recommended = Math.min(
      Math.max(potentialCombinations, 500), // Минимум 500
      Math.max(avgPrevious * 1.5, 10000) // Максимум 1.5x от среднего или 10000
    );

    return Math.round(recommended);
  }

  /**
   * Валидация и обогащение AI ответа
   */
  validateAndEnrich(aiResponse, currentSeeds, coverageGaps) {
    // Убеждаемся что все обязательные поля присутствуют
    if (!aiResponse.expanded_seed_list) {
      aiResponse.expanded_seed_list = {
        states: currentSeeds.states || [],
        makes: currentSeeds.makes || [],
        years: currentSeeds.years || [],
        vinExamples: currentSeeds.vinExamples || []
      };
    }

    // Убеждаемся что recommended_build_volume есть
    if (!aiResponse.recommended_build_volume) {
      aiResponse.recommended_build_volume = 500; // Fallback
    }

    // Убеждаемся что reasoning есть
    if (!aiResponse.reasoning) {
      aiResponse.reasoning = 'AI generated expanded seed-list based on coverage gaps analysis.';
    }

    // Убеждаемся что diff есть
    if (!aiResponse.diff) {
      aiResponse.diff = {
        added: {
          states: [],
          makes: [],
          years: [],
          vinExamples: []
        },
        removed: [],
        modified: []
      };
    }

    return aiResponse;
  }
}

module.exports = { SeedGenerator };

