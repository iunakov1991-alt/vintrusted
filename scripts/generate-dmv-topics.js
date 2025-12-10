#!/usr/bin/env node
/**
 * Генератор топиков для DMV страниц
 * Создает файлы topic.*.json для всех комбинаций штатов/тем/форматов
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const dataDir = path.join(rootDir, 'data');

// Все 50 штатов США
const ALL_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

// DMV темы
const DMV_TOPICS = [
  'title_types',
  'title_transfer',
  'registration',
  'salvage_to_rebuilt',
  'out_of_state_transfer',
  'duplicate_title',
  'title_correction',
  'lien_release',
  'name_change',
  'address_change',
  'lost_title',
  'title_fees'
];

// Форматы
const FORMATS = [
  'checklist',
  'guide',
  'step_by_step',
  'faq'
];

// Языки
const LANGUAGES = [
  { code: 'en', zone: 'us_general' },
  { code: 'es', zone: 'mx_us' }
];

function generateTopicFile(state, dmvTopic, format, lang) {
  const stateCode = state.toLowerCase();
  const filename = `topic.dmv_${stateCode}_${dmvTopic}_${format}_${lang.code}_${lang.zone}.json`;
  const filepath = path.join(dataDir, filename);
  
  // Пропускаем если файл уже существует
  if (fs.existsSync(filepath)) {
    return null;
  }
  
  const topic = {
    topic_id: `dmv_${stateCode}_${dmvTopic}_${format}`,
    language: lang.code,
    zone: 'dmv_titles',  // Правильная зона для DMV топиков
    audience: lang.zone,  // us_general или mx_us
    dimensions: {
      state: state,
      dmv_topic: dmvTopic,
      format_variant: format
    },
    metadata: {
      generated_at: new Date().toISOString(),
      generator: 'generate-dmv-topics.js'
    }
  };
  
  fs.writeFileSync(filepath, JSON.stringify(topic, null, 2));
  return filename;
}

function main() {
  const args = process.argv.slice(2);
  const count = parseInt(args[0]) || 100; // Сколько топиков создать
  const langFilter = args[1] || 'en'; // Фильтр по языку (en/es/all)
  
  console.log(`[generate-topics] Creating ${count} new topics (lang: ${langFilter})`);
  
  let created = 0;
  let skipped = 0;
  
  // Приоритет: топовые штаты первыми
  const priorityStates = ['CA', 'TX', 'FL', 'NY', 'PA', 'IL', 'OH', 'GA', 'NC', 'MI'];
  const otherStates = ALL_STATES.filter(s => !priorityStates.includes(s));
  const orderedStates = [...priorityStates, ...otherStates];
  
  // Генерируем топики
  outerLoop:
  for (const state of orderedStates) {
    for (const dmvTopic of DMV_TOPICS) {
      for (const format of FORMATS) {
        for (const lang of LANGUAGES) {
          // Фильтр по языку
          if (langFilter !== 'all' && lang.code !== langFilter) {
            continue;
          }
          
          const filename = generateTopicFile(state, dmvTopic, format, lang);
          if (filename) {
            created++;
            if (created <= 10 || created % 50 === 0) {
              console.log(`[${created}] Created: ${filename}`);
            }
            
            if (created >= count) {
              break outerLoop;
            }
          } else {
            skipped++;
          }
        }
      }
    }
  }
  
  console.log(`\n[generate-topics] ========================================`);
  console.log(`[generate-topics] Created: ${created} new topics`);
  console.log(`[generate-topics] Skipped: ${skipped} (already exist)`);
  console.log(`[generate-topics] Total topics now: ${fs.readdirSync(dataDir).filter(f => f.startsWith('topic.') && f.endsWith('.json')).length}`);
  console.log(`[generate-topics] ========================================`);
}

if (require.main === module) {
  main();
}

module.exports = { generateTopicFile };

